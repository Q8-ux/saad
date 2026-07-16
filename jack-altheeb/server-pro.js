const path = require('path');
const express = require('express');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const { setupAuth, initDatabase, authenticateSocket, recordResult } = require('./auth');

const PORT = process.env.PORT || 3000;
const RELEASE = process.env.APP_RELEASE || 'jack-altheeb-v4-auth';
const MAX_PLAYERS = 4;
const TOKENS_PER_PLAYER = 4;
const TRACK_LENGTH = 40;
const FINISH_PROGRESS = 44;
const SAFE_CELLS = new Set([0,5,10,15,20,25,30,35]);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use((req,res,next)=>{
  res.setHeader('X-Jack-Altheeb-Version', RELEASE);
  if (/\.(?:html|css|js|json|webmanifest|svg)$/.test(req.path) || req.path === '/') res.setHeader('Cache-Control','no-store');
  next();
});
setupAuth(app);
app.get('/version', (_req,res)=>res.json({ app:'jack-altheeb', release:RELEASE, commit:process.env.RENDER_GIT_COMMIT||null }));
app.use(express.static(path.join(__dirname,'public'), { etag:false, lastModified:false, maxAge:0 }));

const server = http.createServer(app);
const io = new Server(server, { cors:{ origin:true, credentials:true } });
io.use(authenticateSocket);
const rooms = new Map();

function roomCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c; do{ c=Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join(''); }while(rooms.has(c)); return c; }
function player(socket, avatarIndex=0, bot=false){
  const u = socket?.data?.user;
  return { id: bot?`BOT:${Date.now()}`:socket.id, userId: bot?null:u.id, name: bot?'الذيب الآلي':u.username, avatarIndex:bot?4:Math.max(0,Math.min(3,Number(avatarIndex)||u.avatarIndex||0)), tokens:Array(TOKENS_PER_PLAYER).fill(-1), connected:true, isBot:bot };
}
function current(r){ return r.players[r.turnIndex]||null; }
function validMoves(p,roll){ return p.tokens.map((v,i)=>({v,i})).filter(({v})=>v!==FINISH_PROGRESS && ((v===-1&&roll===6)||(v>=0&&v+roll<=FINISH_PROGRESS))).map(x=>x.i); }
function cell(pi,progress){ return progress<0||progress>=TRACK_LENGTH?null:(pi*10+progress)%TRACK_LENGTH; }
function publicRoom(r){ return { code:r.code,mode:r.mode,tutorial:r.tutorial,status:r.status,hostId:r.hostId,players:r.players.map(({userId,...p})=>p),turnIndex:r.turnIndex,lastRoll:r.lastRoll,pendingRoll:r.pendingRoll,availableMoves:r.availableMoves,message:r.message,winnerId:r.winnerId,safeCells:[...SAFE_CELLS],trackLength:TRACK_LENGTH,finishProgress:FINISH_PROGRESS }; }
function emit(r){ io.to(r.code).emit('room_state',publicRoom(r)); }
function nextTurn(r){ r.turnIndex=(r.turnIndex+1)%r.players.length; r.lastRoll=null; r.pendingRoll=false; r.availableMoves=[]; }
function reset(r){ r.players.forEach(p=>{p.tokens=Array(TOKENS_PER_PLAYER).fill(-1);p.connected=true;}); r.turnIndex=0;r.lastRoll=null;r.pendingRoll=false;r.availableMoves=[];r.winnerId=null;r.settled=false; }
function bestBotMove(r,moves){ const p=current(r),pi=r.turnIndex; return moves.map(i=>{const old=p.tokens[i],np=old===-1?0:old+r.lastRoll,landing=cell(pi,np);let s=np;if(np===FINISH_PROGRESS)s+=10000;if(old===-1)s+=1200;if(landing!==null&&SAFE_CELLS.has(landing))s+=350;if(landing!==null&&!SAFE_CELLS.has(landing))r.players.forEach((o,oi)=>{if(oi!==pi&&o.tokens.some(v=>cell(oi,v)===landing))s+=5000;});return{i,s};}).sort((a,b)=>b.s-a.s)[0].i; }
async function settle(r,winner){ if(r.settled)return;r.settled=true; await Promise.all(r.players.filter(p=>!p.isBot&&p.userId).map(p=>recordResult(p.userId,p.id===winner.id).catch(console.error))); }
function move(r,index){ const p=current(r),roll=r.lastRoll,m=validMoves(p,roll); if(!m.includes(index))return{ok:false,error:'هذه الحركة غير مسموحة.'}; const old=p.tokens[index],np=old===-1?0:old+roll;p.tokens[index]=np;const pi=r.turnIndex,landing=cell(pi,np);let captured=0;if(landing!==null&&!SAFE_CELLS.has(landing))r.players.forEach((o,oi)=>{if(oi!==pi)o.tokens=o.tokens.map(v=>cell(oi,v)===landing?(captured++,-1):v);});r.pendingRoll=false;r.availableMoves=[];if(p.tokens.every(v=>v===FINISH_PROGRESS)){r.status='finished';r.winnerId=p.id;r.message=`🏆 ${p.name} فاز بلقب جاك الذيب!`;void settle(r,p);return{ok:true,won:true,captured};}if(captured){r.lastRoll=null;r.message=`🐺 ${p.name} صاد ${captured} دبوس وحصل على رمية إضافية!`;}else if(roll===6){r.lastRoll=null;r.message=`🎲 ${p.name} رمى 6 وله رمية إضافية.`;}else{r.message=`${p.name} تحرك ${roll} خانات.`;nextTurn(r);}return{ok:true,won:false,captured}; }
function scheduleBot(r){ clearTimeout(r.botTimer);const b=current(r);if(r.status!=='playing'||!b?.isBot)return;r.message='🐺 الذيب الآلي يفكّر...';emit(r);r.botTimer=setTimeout(()=>{if(!rooms.has(r.code)||current(r)?.id!==b.id)return;const roll=Math.floor(Math.random()*6)+1,m=validMoves(b,roll);r.lastRoll=roll;r.availableMoves=m;if(!m.length){r.message=`الذيب الآلي رمى ${roll} ولا توجد له حركة.`;nextTurn(r);emit(r);return scheduleBot(r);}r.pendingRoll=true;r.message=`الذيب الآلي رمى ${roll} ويختار حركته...`;emit(r);r.botTimer=setTimeout(()=>{move(r,bestBotMove(r,m));emit(r);scheduleBot(r);},600);},800); }

io.on('connection',socket=>{
  socket.emit('auth_user',socket.data.user);
  socket.on('create_room',({avatarIndex,tutorial}={},reply=()=>{})=>{const code=roomCode(),r={code,mode:'online',tutorial:!!tutorial,status:'lobby',hostId:socket.id,players:[player(socket,avatarIndex)],turnIndex:0,lastRoll:null,pendingRoll:false,availableMoves:[],message:'تم إنشاء الغرفة. شارك الرمز مع أصدقائك.',winnerId:null,botTimer:null,settled:false};rooms.set(code,r);socket.join(code);socket.data.roomCode=code;reply({ok:true,code,playerId:socket.id});emit(r);});
  socket.on('create_solo',({avatarIndex,tutorial}={},reply=()=>{})=>{const code=roomCode(),r={code,mode:'solo',tutorial:!!tutorial,status:'playing',hostId:socket.id,players:[player(socket,avatarIndex),player(null,4,true)],turnIndex:0,lastRoll:null,pendingRoll:false,availableMoves:[],message:'بدأ التحدي الفردي. أنت تبدأ أولًا!',winnerId:null,botTimer:null,settled:false};rooms.set(code,r);socket.join(code);socket.data.roomCode=code;reply({ok:true,code,playerId:socket.id});emit(r);});
  socket.on('join_room',({code,avatarIndex}={},reply=()=>{})=>{const c=String(code||'').trim().toUpperCase(),r=rooms.get(c);if(!r)return reply({ok:false,error:'الغرفة غير موجودة.'});if(r.mode!=='online'||r.status!=='lobby')return reply({ok:false,error:'لا يمكن الانضمام لهذه الجولة.'});if(r.players.length>=MAX_PLAYERS)return reply({ok:false,error:'الغرفة مكتملة.'});if(r.players.some(p=>p.userId===socket.data.user.id))return reply({ok:false,error:'أنت داخل الغرفة بالفعل.'});r.players.push(player(socket,avatarIndex));socket.join(c);socket.data.roomCode=c;r.message=`${socket.data.user.username} انضم إلى الغرفة.`;reply({ok:true,code:c,playerId:socket.id});emit(r);});
  socket.on('start_game',({code}={},reply=()=>{})=>{const r=rooms.get(String(code||'').toUpperCase());if(!r)return reply({ok:false,error:'الغرفة غير موجودة.'});if(r.hostId!==socket.id)return reply({ok:false,error:'فقط مدير الغرفة يبدأ اللعبة.'});if(r.players.length<2)return reply({ok:false,error:'تحتاج لاعبين على الأقل.'});reset(r);r.status='playing';r.turnIndex=Math.floor(Math.random()*r.players.length);r.message=`بدأت اللعبة. الدور على ${current(r).name}.`;reply({ok:true});emit(r);});
  socket.on('roll_dice',({code}={},reply=()=>{})=>{const r=rooms.get(String(code||'').toUpperCase()),p=r&&current(r);if(!r||r.status!=='playing')return reply({ok:false,error:'اللعبة غير متاحة.'});if(!p||p.id!==socket.id)return reply({ok:false,error:'ليس دورك.'});if(r.pendingRoll)return reply({ok:false,error:'اختر دبوسًا أولًا.'});const roll=Math.floor(Math.random()*6)+1,m=validMoves(p,roll);r.lastRoll=roll;r.availableMoves=m;if(!m.length){r.message=`${p.name} رمى ${roll} ولا توجد حركة متاحة.`;nextTurn(r);}else{r.pendingRoll=true;r.message=`${p.name} رمى ${roll}. اختر أحد الدبابيس المتاحة.`;}reply({ok:true,roll,validMoves:m});emit(r);scheduleBot(r);});
  socket.on('move_token',({code,tokenIndex}={},reply=()=>{})=>{const r=rooms.get(String(code||'').toUpperCase()),p=r&&current(r);if(!r||r.status!=='playing')return reply({ok:false,error:'اللعبة غير متاحة.'});if(!p||p.id!==socket.id)return reply({ok:false,error:'ليس دورك.'});const result=move(r,Number(tokenIndex));reply(result);emit(r);scheduleBot(r);});
  socket.on('restart_game',({code}={},reply=()=>{})=>{const r=rooms.get(String(code||'').toUpperCase());if(!r)return reply({ok:false,error:'الغرفة غير موجودة.'});if(r.hostId!==socket.id)return reply({ok:false,error:'فقط مدير الغرفة يعيد اللعب.'});reset(r);r.status=r.mode==='solo'?'playing':'lobby';r.message=r.mode==='solo'?'بدأت جولة فردية جديدة. أنت تبدأ أولًا!':'الكل جاهز لجولة جديدة.';reply({ok:true});emit(r);});
  socket.on('disconnect',()=>{const r=rooms.get(socket.data.roomCode);if(!r)return;const i=r.players.findIndex(p=>p.id===socket.id);if(i<0)return;if(r.mode==='solo'){clearTimeout(r.botTimer);rooms.delete(r.code);return;}if(r.status==='playing'){r.players[i].connected=false;}else r.players.splice(i,1);if(!r.players.length)rooms.delete(r.code);else{if(r.hostId===socket.id)r.hostId=r.players[0].id;emit(r);}});
});

initDatabase().then(()=>server.listen(PORT,()=>console.log(`Jack Altheeb ${RELEASE} on ${PORT}`))).catch(err=>{console.error('Database init failed',err);process.exit(1);});

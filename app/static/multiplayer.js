let supabaseClient=null,session=null,socket=null,recoveryMode=false,lastSoundState=null,appUrl=location.origin;
window.multiplayerGame=null;
const authBox=document.getElementById('authBox'),recoveryBox=document.getElementById('recoveryBox'),lobbyBox=document.getElementById('lobbyBox'),accountLabel=document.getElementById('accountLabel'),roomCodeInput=document.getElementById('roomCode'),authMessage=document.getElementById('authMessage');
const emailEl=document.getElementById('authEmail'),passwordEl=document.getElementById('authPassword'),usernameEl=document.getElementById('authUsername');
const redirectBase=()=>appUrl.replace(/\/$/,'')+'/';
const invitedRoom=new URLSearchParams(location.search).get('room');if(invitedRoom)roomCodeInput.value=invitedRoom.toUpperCase().slice(0,6);
function showAuthMessage(text,type='info'){authMessage.textContent=text;authMessage.className='auth-message '+type;authMessage.hidden=false}
function clearAuthMessage(){authMessage.hidden=true;authMessage.textContent=''}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function setBusy(button,busy,label){button.disabled=busy;if(busy){button.dataset.label=button.textContent;button.textContent=label}else if(button.dataset.label){button.textContent=button.dataset.label;delete button.dataset.label}}
function toggleVisibility(input,button){const hidden=input.type==='password';input.type=hidden?'text':'password';button.setAttribute('aria-label',t(hidden?'hidePassword':'showPassword'))}
document.getElementById('togglePassword').onclick=()=>toggleVisibility(passwordEl,document.getElementById('togglePassword'));
document.getElementById('toggleNewPassword').onclick=()=>toggleVisibility(document.getElementById('newPassword'),document.getElementById('toggleNewPassword'));

async function api(path,body){if(!session)throw new Error(t('loginFirst'));const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.detail||t('requestFailed'));return data}
async function initAuth(){
 const config=await fetch('/api/public-config').then(r=>r.json());
 if(!config.supabase_url||!config.supabase_key)throw new Error('Authentication configuration is unavailable');
 if(config.app_url)appUrl=config.app_url;
 supabaseClient=window.supabase.createClient(config.supabase_url,config.supabase_key);
 supabaseClient.auth.onAuthStateChange((event,nextSession)=>{
   session=nextSession;
   if(event==='PASSWORD_RECOVERY'){recoveryMode=true;renderAuth();showAuthMessage(t('setNewPassword'),'success');return}
   setSession(nextSession);
 });
 const {data,error}=await supabaseClient.auth.getSession();if(error)throw error;setSession(data.session);
 const params=new URLSearchParams(location.hash.slice(1));if(params.get('error'))showAuthMessage(t('authLinkError'),'error');
}
function renderAuth(){authBox.hidden=Boolean(session)||recoveryMode;recoveryBox.hidden=!recoveryMode;lobbyBox.hidden=!session}
function setSession(next){session=next;renderAuth();accountLabel.textContent=session?(session.user.user_metadata.username||session.user.email):'';if(session)loadProfile()}
async function loadProfile(){const {data,error}=await supabaseClient.from('chess_profiles').select('username,rating,wins,losses,draws').eq('id',session.user.id).single();if(error||!data)return;accountLabel.textContent=data.username;document.getElementById('eloValue').textContent=data.rating;document.getElementById('recordValue').textContent=t('record',{wins:data.wins,losses:data.losses,draws:data.draws})}

document.getElementById('signUp').onclick=async()=>{
 clearAuthMessage();const email=emailEl.value.trim(),password=passwordEl.value,username=usernameEl.value.trim(),button=document.getElementById('signUp');
 if(!username)return showAuthMessage(t('usernameRequired'),'error');if(!validEmail(email))return showAuthMessage(t('invalidEmail'),'error');if(password.length<8)return showAuthMessage(t('weakPassword'),'error');
 setBusy(button,true,t('creatingAccount'));
 try{const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{username},emailRedirectTo:redirectBase()}});if(error)throw error;if(data.session)setSession(data.session);else showAuthMessage(t('checkEmail')+' '+t('emailDeliveryNote'),'success')}catch(e){showAuthMessage(localizeError(e.message),'error')}finally{setBusy(button,false)}
};
document.getElementById('signIn').onclick=async()=>{
 clearAuthMessage();const email=emailEl.value.trim(),password=passwordEl.value,button=document.getElementById('signIn');
 if(!validEmail(email))return showAuthMessage(t('invalidEmail'),'error');if(!password)return showAuthMessage(t('requiredFields'),'error');
 setBusy(button,true,t('signingIn'));try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;setSession(data.session)}catch(e){showAuthMessage(localizeError(e.message),'error')}finally{setBusy(button,false)}
};
document.getElementById('forgotPassword').onclick=async()=>{
 clearAuthMessage();const email=emailEl.value.trim();if(!validEmail(email))return showAuthMessage(t('invalidEmail'),'error');
 try{const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:redirectBase()});if(error)throw error;showAuthMessage(t('resetSent')+' '+t('emailDeliveryNote'),'success')}catch(e){showAuthMessage(localizeError(e.message),'error')}
};
document.getElementById('resendConfirmation').onclick=async()=>{
 clearAuthMessage();const email=emailEl.value.trim();if(!validEmail(email))return showAuthMessage(t('invalidEmail'),'error');
 try{const {error}=await supabaseClient.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectBase()}});if(error)throw error;showAuthMessage(t('confirmationSent'),'success')}catch(e){showAuthMessage(localizeError(e.message),'error')}
};
document.getElementById('saveNewPassword').onclick=async()=>{
 const value=document.getElementById('newPassword').value,button=document.getElementById('saveNewPassword');if(value.length<8)return showAuthMessage(t('weakPassword'),'error');
 setBusy(button,true,t('savePassword'));try{const {error}=await supabaseClient.auth.updateUser({password:value});if(error)throw error;recoveryMode=false;renderAuth();showAuthMessage(t('passwordUpdated'),'success');history.replaceState({},document.title,location.pathname)}catch(e){showAuthMessage(localizeError(e.message),'error')}finally{setBusy(button,false)}
};
document.getElementById('signOut').onclick=()=>supabaseClient.auth.signOut();

async function lobby(action,extra={}){try{const game=await api('/api/multiplayer/action',{action,...extra});if(game.queued){toast(t('queued'));setTimeout(()=>lobby('enqueue'),2500);return}startOnlineGame(game)}catch(err){toast(err.message)}}
document.getElementById('createRoom').onclick=()=>{chessSound.play('transition');lobby('create_private')};document.getElementById('joinRoom').onclick=()=>{chessSound.play('transition');lobby('join_private',{code:roomCodeInput.value.trim()})};document.getElementById('quickMatch').onclick=()=>{chessSound.play('challenge');lobby('enqueue')};document.getElementById('aiMode').onclick=()=>{closeSocket();window.multiplayerGame=null;resetGame();toast(t('aiMode'))};
function startOnlineGame(game){window.multiplayerGame=game;chessSound.play(game.status==='waiting'?'transition':'challenge');applyOnlineState(game);connectSocket(game.id);document.getElementById('roomBadge').textContent=t('room',{code:game.room_code});document.getElementById('roomBadge').hidden=false;toast(game.status==='waiting'?t('shareCode',{code:game.room_code}):t('onlineStarted'))}
function applyOnlineState(game){
 const previous=lastSoundState;
 const nextMoves=(game.move_history||[]).length;
 if(previous&&nextMoves>previous.moves)chessSound.play('move');
 if(game.status==='active'&&previous?.status==='waiting')chessSound.play('crowd');
 if(game.status==='finished'&&previous?.status!=='finished'){
   const color=session?(game.white_id===session.user.id?'white':game.black_id===session.user.id?'black':null):null;
   chessSound.play(game.result==='draw'?'draw':game.result===color?'win':'loss');
 }
 lastSoundState={id:game.id,status:game.status,moves:nextMoves,result:game.result};
 window.multiplayerGame=game;fen=game.fen;moveHistory=game.move_history||[];movePairs=[];for(let i=0;i<moveHistory.length;i+=2)movePairs.push({white:moveHistory[i]||'',black:moveHistory[i+1]||''});selected=null;legalMoves=[];locked=false;statusEl.textContent=game.status==='waiting'?t('waiting'):game.status==='finished'?t('finished'):window.multiplayerCanMove()?t('yourTurn'):t('opponentTurn');renderMoves();renderBoard()}
function connectSocket(gameId){closeSocket();const protocol=location.protocol==='https:'?'wss':'ws';socket=new WebSocket(`${protocol}://${location.host}/api/multiplayer/ws/${gameId}?token=${encodeURIComponent(session.access_token)}`);socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.type==='game_state')applyOnlineState(message.game)};socket.onclose=()=>{if(window.multiplayerGame?.status==='active'){statusEl.textContent=t('reconnecting');setTimeout(()=>session&&window.multiplayerGame&&connectSocket(window.multiplayerGame.id),2000)}}}
function closeSocket(){if(socket){socket.onclose=null;socket.close();socket=null}}
window.multiplayerCanMove=()=>{const game=window.multiplayerGame;if(!game||!session||game.status!=='active')return false;const color=game.white_id===session.user.id?'white':game.black_id===session.user.id?'black':null;return color===currentTurn()};
window.multiplayerOwnsPiece=piece=>{if(!piece||!window.multiplayerGame||!session)return false;const color=window.multiplayerGame.white_id===session.user.id?'white':'black';return color==='white'?piece===piece.toUpperCase():piece===piece.toLowerCase()};
window.multiplayerMove=async(from,to)=>{locked=true;chessSound.play('transition');statusEl.textContent=t('sendingMove');try{const result=await api('/api/multiplayer/move',{game_id:window.multiplayerGame.id,from_square:from,to_square:to,promotion:'q'});applyOnlineState(result.game)}catch(err){toast(err.message);locked=false}};
initAuth().catch(e=>{showAuthMessage(localizeError(e.message),'error');toast(t('authInitError'))});
window.addEventListener('languagechange',()=>{if(session)loadProfile();if(window.multiplayerGame)applyOnlineState(window.multiplayerGame)});

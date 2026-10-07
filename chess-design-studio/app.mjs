import {START_FEN,FORMATS,parsePosition,manifestFor,zipFiles} from './core.mjs';
const $=id=>document.getElementById(id),canvas=$('preview'),status=$('status');
const symbols={P:'♙',N:'♘',B:'♗',R:'♖',Q:'♕',K:'♔',p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'};
const themes={navy:{accent:'#42d5d1',light:'#b6e1dc',dark:'#245366'},gold:{accent:'#e3be73',light:'#e6d5b3',dark:'#595a59'},silver:{accent:'#c4d5e7',light:'#d5dfe9',dark:'#52667b'}};
let logo=null,layers=[],valid=true,logoURL=null;
$('fen').value=new URLSearchParams(location.search).get('fen')||START_FEN;
function layer(name,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return {name,canvas:c,ctx:c.getContext('2d')};}
function text(ctx,value,y,maxWidth,base,color){ctx.fillStyle=color;ctx.textAlign='center';ctx.direction='rtl';let size=base;do{ctx.font=`700 ${size}px Mohanad, Tahoma, sans-serif`;if(ctx.measureText(value).width<=maxWidth)break;size-=2;}while(size>22);ctx.fillText(value,540,y,maxWidth);}
function render(){
  const [w,h]=FORMATS[$('format').value],theme=themes[$('theme').value];canvas.width=w;canvas.height=h;
  $('dimensions').textContent=w+' × '+h;layers=[];
  let board;
  try{board=parsePosition($('fen').value);valid=true;status.textContent='';}
  catch(error){valid=false;status.textContent=error.message;}
  for(const id of ['png','jpg','layers'])$(id).disabled=!valid;
  const bg=layer('Background',w,h),g=bg.ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#102b3e');g.addColorStop(1,'#06111f');bg.ctx.fillStyle=g;bg.ctx.fillRect(0,0,w,h);
  bg.ctx.strokeStyle=theme.accent+'25';bg.ctx.lineWidth=2;
  for(let i=0;i<=w;i+=90){bg.ctx.beginPath();bg.ctx.moveTo(i,0);bg.ctx.lineTo(i,h);bg.ctx.stroke();}
  bg.ctx.strokeStyle=theme.accent;bg.ctx.lineWidth=5;bg.ctx.strokeRect(38,38,w-76,h-76);layers.push(bg);
  const story=h>1500,headingY=story?290:195,boardSize=story?820:h>1100?760:630,boardY=story?560:h>1100?390:340;
  const typography=layer('Approved text',w,h);
  text(typography.ctx,'AI CHESS KUWAIT',story?125:110,900,30,theme.accent);
  text(typography.ctx,$('title').value.trim()||'تحدّي الشطرنج',headingY,920,76,'#f4f8fb');
  text(typography.ctx,$('subtitle').value,headingY+70,920,38,'#b7c9d8');
  if($('player').value.trim())text(typography.ctx,$('player').value,headingY+132,920,34,theme.accent);
  text(typography.ctx,'العب الآن · وشارك التحدّي',h-100,900,38,theme.accent);
  text(typography.ctx,'q8-ux.github.io/saad/ai-chess-kuwait',h-60,950,23,'#b7c9d8');
  const pieces=layer('Board position',w,h),ctx=pieces.ctx;
  if(board&&$('showBoard').checked){
    const x=(w-boardSize)/2,cell=boardSize/8;
    ctx.fillStyle='#06111f';ctx.fillRect(x-10,boardY-10,boardSize+20,boardSize+20);
    for(let r=0;r<8;r++)for(let f=0;f<8;f++){
      ctx.fillStyle=(r+f)%2?theme.dark:theme.light;ctx.fillRect(x+f*cell,boardY+r*cell,cell,cell);
      const piece=board[r][f];if(piece){ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${cell*.8}px "DejaVu Sans", "Arial Unicode MS", serif`;ctx.lineWidth=1.5;ctx.strokeStyle='#172332';ctx.fillStyle=piece===piece.toUpperCase()?'#fffaf0':'#101a26';ctx.strokeText(symbols[piece],x+(f+.5)*cell,boardY+(r+.52)*cell);ctx.fillText(symbols[piece],x+(f+.5)*cell,boardY+(r+.52)*cell);}
    }
  }
  layers.push(pieces,typography);
  if(logo){const mark=layer('Approved project logo',w,h),scale=Math.min(100/logo.width,70/logo.height);mark.ctx.drawImage(logo,w-180,65,logo.width*scale,logo.height*scale);layers.push(mark);}
  const out=canvas.getContext('2d');for(const l of layers)out.drawImage(l.canvas,0,0);
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function blobFor(c,type='image/png'){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('تعذر التصدير')),type,.95));}
async function exportCard(type){if(!valid)return;try{download(await blobFor(canvas,type),'chess-'+$('format').value+(type==='image/png'?'.png':'.jpg'));status.textContent='تم تجهيز الصورة للتنزيل. يمكنك رفعها إلى كانفا.';}catch(e){status.textContent=e.message;}}
async function exportLayers(){if(!valid)return;$('layers').disabled=true;try{
  const uuid=()=>crypto.randomUUID(),manifest=manifestFor([canvas.width,canvas.height],layers,uuid),files=[];
  files.push({name:'ChessCard.comp/manifest.json',bytes:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
  for(let i=0;i<layers.length;i++)files.push({name:'ChessCard.comp/images/'+manifest.layers[i].imageFile,bytes:new Uint8Array(await (await blobFor(layers[i].canvas)).arrayBuffer())});
  files.push({name:'README.txt',bytes:new TextEncoder().encode('Unzip, then open ChessCard.comp in Compositor on a supported Mac. Text is rasterized. No private projects were used as templates.\n')});
  download(new Blob([zipFiles(files)],{type:'application/zip'}),'chess-'+$('format').value+'-layers.zip');status.textContent='تم تجهيز ملف الطبقات. فك الضغط لفتح ملف Compositor.';
}catch(e){status.textContent=e.message;}finally{$('layers').disabled=!valid;}}
for(const id of ['format','theme','title','subtitle','player','fen','showBoard'])$(id).addEventListener('input',render);
$('png').addEventListener('click',()=>exportCard('image/png'));$('jpg').addEventListener('click',()=>exportCard('image/jpeg'));$('layers').addEventListener('click',exportLayers);
$('logo').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024){status.textContent='اختر صورة لا تتجاوز 10 ميغابايت';return;}if(!['image/png','image/jpeg','image/webp'].includes(file.type)){status.textContent='اختر PNG أو JPG أو WebP';return;}try{const img=new Image(),url=URL.createObjectURL(file);await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});if(logoURL)URL.revokeObjectURL(logoURL);logoURL=url;logo=img;$('removeLogo').hidden=false;render();}catch(_){status.textContent='تعذر قراءة الشعار';}});
$('removeLogo').addEventListener('click',()=>{logo=null;$('logo').value='';$('removeLogo').hidden=true;if(logoURL)URL.revokeObjectURL(logoURL);logoURL=null;render();});
render();document.fonts.ready.then(render);

/* Masar Animation Studio - local-first controller. No secrets or remote execution. */
(()=>{'use strict';
const $=id=>document.getElementById(id), $$=q=>Array.from(document.querySelectorAll(q));
const KEY='masar-animation-studio-v1';
const base=()=>({title:'مشروع رسوم متحركة جديد',type:'short',style:'toon',aspect:'9:16',language:'ar',audience:'',brief:'',script:'',scenes:[{id:1,title:'المشهد الأول',visual:'افتتاحية مع حركة كاميرا بطيئة',narration:'',duration:6,color:'#152758',image:''}],references:[],marketing:{platform:'youtube',url:'',copy:'',views:'',clicks:'',spend:'',revenue:''}});
let state;try{state={...base(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{state=base()}if(!Array.isArray(state.scenes)||!state.scenes.length)state.scenes=base().scenes;if(!Array.isArray(state.references))state.references=[];state.marketing={...base().marketing,...state.marketing};
let selected=0,playing=false,playhead=0,last=0,raf=0,micStream=null,micRecorder=null,micChunks=[],micBlob=null,audioURL=null,canvasRecorder=null,captureStream=null,recorded=[],recording=false;
const toast=msg=>{const e=$('toast');if(!e)return;e.textContent=msg;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),3200)};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));$('save-status').textContent='● محفوظ محليًا'}catch(e){$('save-status').textContent='⚠ مساحة التخزين ممتلئة';toast('احفظ نسخة JSON: مساحة المتصفح غير كافية')}refreshStats()};
const download=(name,contents,type='text/plain;charset=utf-8')=>{let blob=contents instanceof Blob?contents:new Blob([contents],{type});let u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),15000)};
const total=()=>state.scenes.reduce((n,s)=>n+Math.max(1,Number(s.duration)||1),0);
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
const escapeText=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function refreshStats(){if(!$('stat-project'))return;$('stat-project').textContent=state.title||'—';$('stat-scenes').textContent=state.scenes.length;$('stat-time').textContent=fmt(total());const checks=[!!state.title.trim(),!!state.brief.trim(),!!state.script.trim(),state.scenes.length>0,state.scenes.every(s=>s.visual.trim()),state.scenes.some(s=>s.narration.trim()),state.references.length>0];$('stat-ready').textContent=Math.round(checks.filter(Boolean).length/checks.length*100)+'%';$('qa-list').innerHTML=['عنوان المشروع','ملخص القصة','النص أو السيناريو','مشاهد محددة','وصف بصري لكل مشهد','حوار أو تعليق صوتي','مرجع واحد على الأقل'].map((name,i)=>'<div class="qa-row">'+(checks[i]?'✓':'○')+' '+name+'</div>').join('')}
const bindings={'project-title':'title','project-type':'type','project-style':'style','project-aspect':'aspect','project-language':'language','project-audience':'audience','project-brief':'brief','project-script':'script'};
Object.entries(bindings).forEach(([id,key])=>{let el=$(id);if(!el)return;el.value=state[key]||'';el.addEventListener('input',()=>{state[key]=el.value;save();if(key==='aspect')draw()});el.addEventListener('change',save)});
function active(){return state.scenes[selected]||state.scenes[0]}
function sceneList(){$('scene-list').innerHTML=state.scenes.map((s,i)=>'<button type="button" class="scene-item '+(selected===i?'selected':'')+'" data-scene="'+i+'"><strong>'+escapeText(s.title)+'</strong><small>'+Number(s.duration||1)+'ث · '+escapeText(s.visual).slice(0,70)+'</small></button>').join('');$$('[data-scene]').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.scene);sceneList();loadScene();draw()})}
function loadScene(){let s=active();if(!s)return;['title','visual','narration','duration','color'].forEach(k=>{let el=$('scene-'+k);if(el)el.value=s[k]||''});$('image-info').textContent=s.image?'صورة خلفية محفوظة محليًا':'لم تضف خلفية بعد';refreshStats()}
['title','visual','narration','duration','color'].forEach(k=>{const el=$('scene-'+k);el.addEventListener('input',()=>{const s=active();if(!s)return;s[k]=k==='duration'?Math.max(1,Math.min(60,Number(el.value)||1)):el.value;save();sceneList();draw()})});
$('add-scene').onclick=()=>{state.scenes.push({id:Date.now(),title:'مشهد '+(state.scenes.length+1),visual:'وصف المشهد',narration:'',duration:6,color:'#152758',image:''});selected=state.scenes.length-1;save();sceneList();loadScene();draw()};
$('duplicate-scene').onclick=()=>{const s=active();state.scenes.splice(selected+1,0,{...s,id:Date.now()});selected++;save();sceneList();loadScene()};
$('remove-scene').onclick=()=>{if(state.scenes.length===1)return toast('يجب الاحتفاظ بمشهد واحد على الأقل');state.scenes.splice(selected,1);selected=Math.max(0,selected-1);save();sceneList();loadScene();draw()};

$('load-online-family').onclick=async()=>{
 try{
  if(!confirm('تحميل مسرحية «عائلة أونلاين» (12 مشهدًا) سيستبدل المشروع الحالي. احفظ نسخة JSON أولًا إن لزم. متابعة؟'))return;
  const response=await fetch('./projects/online-family.json',{cache:'no-store'});
  if(!response.ok)throw Error('تعذر تحميل ملف المسرحية: HTTP '+response.status);
  const project=await response.json();
  if(!Array.isArray(project.scenes)||project.scenes.length!==12)throw Error('ملف المسرحية غير مكتمل');
  state={...base(),...project,marketing:{...base().marketing,...project.marketing}};
  selected=0;playhead=0;playing=false;last=0;cancelAnimationFrame(raf);
  Object.entries(bindings).forEach(([id,key])=>$(id).value=state[key]||'');
  Object.entries(fields).forEach(([id,key])=>$(id).value=state.marketing[key]||'');
  save();sceneList();loadScene();references();kpis();draw();
  toast('تم تحميل 12 مشهدًا من مسرحية عائلة أونلاين');
  document.getElementById('scenes').scrollIntoView({behavior:'smooth'});
 }catch(e){toast('فشل تحميل المسرحية: '+e.message)}
};

$('outline-scenes').onclick=()=>{const parts=(state.script||state.brief).split(/\n\s*\n|(?=المشهد\s*[0-9٠-٩]+)/).map(x=>x.trim()).filter(Boolean).slice(0,30);if(!parts.length)return toast('اكتب القصة أو السيناريو أولاً');if(state.scenes.length>1&&!confirm('استبدال المشاهد الحالية بمشاهد مستخرجة من النص؟'))return;state.scenes=parts.map((text,i)=>({id:Date.now()+i,title:'المشهد '+(i+1),visual:text.slice(0,900),narration:text.slice(0,800),duration:Math.min(30,Math.max(4,Math.ceil(text.length/25))),color:['#152758','#27345c','#173f51','#37305e'][i%4],image:''}));selected=0;playhead=0;save();sceneList();loadScene();draw();toast('أنشئت '+parts.length+' مشاهد قابلة للتعديل')};
$('new-project').onclick=()=>{if(!confirm('إنشاء مشروع جديد؟ صدّر مشروعك الحالي قبل الاستبدال.'))return;state=base();selected=0;playhead=0;Object.entries(bindings).forEach(([id,k])=>$(id).value=state[k]);save();sceneList();loadScene();draw();toast('تم إنشاء المشروع الجديد')};
const canvas=$('preview'),ctx=canvas.getContext('2d');let imageCache={};
const stageScene=t=>{let acc=0;for(const s of state.scenes){const d=Math.max(1,Number(s.duration)||1);if(t<acc+d)return{s,t:t-acc,d};acc+=d}return{s:state.scenes[state.scenes.length-1],t:0,d:1}};
function dimensions(){let [w,h]=state.aspect.split(':').map(Number);if(!w||!h){w=9;h=16}canvas.width=w>=h?960:540;canvas.height=Math.round(canvas.width*h/w);$('ratio-label').textContent=state.aspect}
function draw(){dimensions();const w=canvas.width,h=canvas.height,{s,t,d}=stageScene(Math.min(playhead,Math.max(0,total()-.001)));ctx.fillStyle=s.color||'#152758';ctx.fillRect(0,0,w,h);const grad=ctx.createRadialGradient(w*.5,h*.36,10,w*.5,h*.5,h*.8);grad.addColorStop(0,'#7b6ee044');grad.addColorStop(1,'#080c1c55');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
if(s.image){if(!imageCache[s.image]){const im=new Image();im.onload=draw;im.src=s.image;imageCache[s.image]=im}let im=imageCache[s.image];if(im.complete&&im.naturalWidth){const ratio=Math.max(w/im.width,h/im.height),iw=im.width*ratio,ih=im.height*ratio;ctx.drawImage(im,(w-iw)/2,(h-ih)/2,iw,ih);ctx.fillStyle='#02071770';ctx.fillRect(0,0,w,h)}}
const p=t/d;ctx.save();ctx.translate(w/2+Math.sin(p*Math.PI*2)*w*.12,h*.49+Math.sin(p*Math.PI*2)*h*.035);ctx.rotate(Math.sin(p*Math.PI*2)*.06);ctx.fillStyle='#60d9ff';ctx.shadowColor='#57c9ff';ctx.shadowBlur=35;ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.13,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#141c3d';ctx.beginPath();ctx.arc(-w*.03,-h*.015,w*.011,0,Math.PI*2);ctx.arc(w*.03,-h*.015,w*.011,0,Math.PI*2);ctx.fill();ctx.restore();
ctx.textAlign='center';ctx.direction='rtl';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=12;const font=Math.max(22,w*.046);ctx.font='bold '+font+'px Cairo, Tahoma, sans-serif';ctx.fillText(s.title.slice(0,35),w/2,h*.78,w*.9);ctx.font=Math.max(15,w*.027)+'px Cairo, Tahoma, sans-serif';const line=(s.narration||s.visual||'').replace(/\s+/g,' ').slice(0,90);ctx.fillText(line,w/2,h*.84,w*.87);ctx.shadowBlur=0;$('play-time').textContent=fmt(playhead)+' / '+fmt(total());$('scrubber').value=Math.round(1000*playhead/Math.max(total(),1))}
function tick(ts){if(!playing)return;if(last)playhead+=Math.min(.1,(ts-last)/1000);last=ts;if(playhead>=total()){playhead=0;playing=false;$('play-toggle').textContent='▶'}draw();if(playing)raf=requestAnimationFrame(tick)}
$('play-toggle').onclick=()=>{playing=!playing;last=0;$('play-toggle').textContent=playing?'Ⅱ':'▶';if(playing)raf=requestAnimationFrame(tick);else cancelAnimationFrame(raf)};
$('restart').onclick=()=>{playhead=0;draw()};
$('scrubber').oninput=e=>{playhead=Number(e.target.value)/1000*total();draw()};
$('snapshot').onclick=()=>canvas.toBlob(b=>b&&download('masar-animation-frame.png',b,'image/png'),'image/png');
$('record-video').onclick=()=>{if(!canvas.captureStream||typeof MediaRecorder==='undefined')return toast('هذا المتصفح لا يدعم تسجيل Canvas');if(recording)return;try{captureStream=canvas.captureStream(30);let audio=$('audio-player');if(audio.src&&audio.captureStream){try{const as=audio.captureStream();as.getAudioTracks().forEach(t=>captureStream.addTrack(t))}catch{}}const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));canvasRecorder=new MediaRecorder(captureStream,mime?{mimeType:mime}:undefined);recorded=[];canvasRecorder.ondataavailable=e=>{if(e.data.size)recorded.push(e.data)};canvasRecorder.onstop=()=>{download('masar-animation.webm',new Blob(recorded,{type:mime||'video/webm'}));captureStream.getTracks().forEach(t=>t.stop());recording=false;$('stop-record').disabled=true;$('record-video').disabled=false;$('record-status').textContent='تم تنزيل التسجيل. راجع تزامن الصوت قبل النشر.'};canvasRecorder.start();recording=true;$('record-video').disabled=true;$('stop-record').disabled=false;playhead=0;playing=true;last=0;cancelAnimationFrame(raf);requestAnimationFrame(tick);$('record-status').textContent='جارٍ تسجيل Canvas الآن ...';setTimeout(()=>{if(recording&&playhead>=total()-.05)canvasRecorder.stop()},Math.ceil(total()*1000)+350)}catch(e){toast('فشل التسجيل: '+e.message)}};
$('stop-record').onclick=()=>{if(recording)canvasRecorder.stop()};
$('audio-file').onchange=e=>{let f=e.target.files[0];if(!f)return;if(!f.type.startsWith('audio/'))return toast('اختر ملفًا صوتيًا');if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(f);$('audio-player').src=audioURL;$('audio-file-name').textContent=f.name;toast('تم تحميل الصوت للمعاينة')};
$('mic-start').onclick=async()=>{try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});let mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));micRecorder=new MediaRecorder(micStream,mime?{mimeType:mime}:undefined);micChunks=[];micRecorder.ondataavailable=e=>{if(e.data.size)micChunks.push(e.data)};micRecorder.onstop=()=>{micBlob=new Blob(micChunks,{type:micRecorder.mimeType});$('mic-download').disabled=false;if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(micBlob);$('audio-player').src=audioURL;$('audio-file-name').textContent='التسجيل الصوتي الأخير';micStream.getTracks().forEach(t=>t.stop())};micRecorder.start();$('mic-start').disabled=true;$('mic-stop').disabled=false;toast('التسجيل بدأ')}catch(e){toast('تعذر فتح الميكروفون: '+e.message)}};
$('mic-stop').onclick=()=>{if(micRecorder&&micRecorder.state!=='inactive')micRecorder.stop();$('mic-start').disabled=false;$('mic-stop').disabled=true};
$('mic-download').onclick=()=>micBlob&&download('masar-voice.'+(micBlob.type.includes('mp4')?'m4a':'webm'),micBlob);
$('speak-text').onclick=()=>{if(!('speechSynthesis' in window))return toast('القراءة غير مدعومة');const t=$('speech-text').value.trim();if(!t)return toast('أدخل النص');speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang=state.language==='en'?'en-US':'ar-KW';u.rate=.94;speechSynthesis.speak(u)};
$('stop-speech').onclick=()=>speechSynthesis?.cancel();
$('scene-to-speech').onclick=()=>{$('speech-text').value=active().narration||''};
$('scene-image').onchange=async e=>{const f=e.target.files[0];if(!f||!f.type.startsWith('image/'))return;if(f.size>20e6)return toast('الحد الأقصى للصورة 20 ميغابايت');const im=new Image(),u=URL.createObjectURL(f);im.onload=()=>{const sc=Math.min(1,1400/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);active().image=c.toDataURL('image/webp',.76);URL.revokeObjectURL(u);imageCache={};save();loadScene();draw()};im.src=u};
$('clear-image').onclick=()=>{active().image='';imageCache={};save();loadScene();draw()};
$('copy-visual-prompt').onclick=()=>navigator.clipboard.writeText([state.style,state.brief,active().visual].join('\n')).then(()=>toast('تم نسخ وصف المشهد')).catch(()=>toast('تعذر النسخ'));
$('download-script').onclick=()=>download('masar-script.txt',state.script);
$('copy-script').onclick=()=>navigator.clipboard.writeText(state.script).then(()=>toast('تم النسخ')).catch(()=>toast('تعذر النسخ'));
['web','youtube','github'].forEach(k=>{$('search-'+k).onclick=()=>{let q=$('research-query').value.trim();if(!q)return toast('أدخل موضوع البحث');const urls={web:'https://www.google.com/search?q=',youtube:'https://www.youtube.com/results?search_query=',github:'https://github.com/search?q='};window.open(urls[k]+encodeURIComponent(q),'_blank','noopener,noreferrer')}});
function references(){$('reference-count').textContent=state.references.length+' مرجع';$('reference-list').innerHTML=state.references.map((r,i)=>'<div class="ref-item"><a target="_blank" rel="noopener noreferrer" href="'+escapeText(r.url)+'">'+escapeText(r.title)+'</a> <button data-ref-remove="'+i+'" aria-label="حذف المرجع">×</button></div>').join('');$$('[data-ref-remove]').forEach(b=>b.onclick=()=>{state.references.splice(Number(b.dataset.refRemove),1);references();save()})}
$('add-reference').onclick=()=>{let title=$('reference-title').value.trim(),url=$('reference-url').value.trim();try{let u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw Error();if(!title)return toast('أدخل عنوان المرجع');state.references.push({title,url:u.href});$('reference-title').value='';$('reference-url').value='';references();save()}catch{toast('أدخل رابط http/https صحيحًا')}};
const fields={'market-platform':'platform','market-url':'url','market-copy':'copy','market-views':'views','market-clicks':'clicks','market-spend':'spend','market-revenue':'revenue'};
Object.entries(fields).forEach(([id,k])=>{const e=$(id);e.value=state.marketing[k]||'';e.oninput=()=>{state.marketing[k]=e.value;save();kpis()}});
function kpis(){let m=state.marketing,v=Number(m.views),c=Number(m.clicks),s=Number(m.spend),r=Number(m.revenue);$('kpi-ctr').textContent=v>0?(c/v*100).toFixed(2)+'%':'—';$('kpi-cpc').textContent=c>0?(s/c).toFixed(3)+' د.ك':'—';$('kpi-roas').textContent=s>0?(r/s).toFixed(2)+'×':'—'}
$('generate-marketing').onclick=()=>{const p={youtube:'يوتيوب شورتس',tiktok:'تيك توك',instagram:'إنستغرام ريلز',x:'إكس'}[state.marketing.platform];let txt=state.title+'\n'+(state.brief||'قصة رسوم متحركة جديدة').slice(0,280)+'\nشاهد العمل على '+p+' وشاركنا رأيك.\n#رسوم_متحركة #Animation';$('market-copy').value=txt;state.marketing.copy=txt;save()};
$('copy-marketing').onclick=()=>navigator.clipboard.writeText($('market-copy').value).then(()=>toast('تم نسخ مسودة التسويق')).catch(()=>toast('تعذر النسخ'));
const integrations=[
['المحرك العمودي Three.js / Remotion','https://github.com/mromidev/claude-animated-shorts','مرجع مصدر · يحتاج بيئة Node'],['Blender 3D','https://github.com/mromidev/claude-blender-skills','مرجع مصدر · يحتاج Blender'],['استوديو الفيديو AI','../ai-video-studio/','فتح مشروع · API مستقل'],['مسار صوتك','../voice-cloning-studio/','فتح مشروع صوت'],['استوديو سعد','../saad-studio/','فتح مشروع تصميم'],['استوديو الإطارات','../frame-studio/','فتح مشروع تصميم'],['استوديو السيناريو','../saad-script-studio/','فتح مشروع كتابة'],['مسار المترجم','../masar-translate-browser/','فتح مشروع ترجمة'],['استوديو YouTube','../youtube-studio-ai/','فتح مشروع تسويق'],['نمو TikTok','../tiktok-growth/','فتح مشروع تسويق'],['راصد المحتوى','../social-request-radar/','فتح مشروع بحث'],['مسار الفيديو LongCat','../longcat-video/','فتح مشروع مرئي']];
$('tools-grid').innerHTML=integrations.map(([name,url,status])=>'<a class="tool-card" target="_blank" rel="noopener noreferrer" href="'+url+'"><strong>'+name+'</strong><small>'+status+'</small><span>↗</span></a>').join('');
$('export-json').onclick=()=>download('masar-animation-project.json',JSON.stringify({...state,exportedAt:new Date().toISOString(),format:'masar-animation-v1'},null,2),'application/json');
$('quick-export').onclick=()=>$('export-json').click();
$('export-storyboard').onclick=()=>{const rows=[['رقم','عنوان','مدة','الوصف','التعليق'],...state.scenes.map((s,i)=>[i+1,s.title,s.duration,s.visual,s.narration])];download('masar-storyboard.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8')};
$('export-prompts').onclick=()=>download('masar-prompts.txt',state.scenes.map((s,i)=>'مشهد '+(i+1)+' — '+s.title+'\nالأسلوب: '+state.style+'\nالمشهد: '+s.visual+'\nالتعليق: '+s.narration+'\nمدة: '+s.duration+' ثانية').join('\n\n---\n\n'));
$('import-json').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>10e6)return toast('ملف المشروع كبير جدًا');try{const obj=JSON.parse(await f.text());if(!Array.isArray(obj.scenes)||!obj.scenes.length||typeof obj.title!=='string')throw Error('صيغة غير صحيحة');if(!confirm('استيراد المشروع سيستبدل البيانات الحالية. هل أكملت النسخ الاحتياطي؟'))return;state={...base(),...obj,marketing:{...base().marketing,...obj.marketing}};selected=0;playhead=0;Object.entries(bindings).forEach(([id,k])=>$(id).value=state[k]);Object.entries(fields).forEach(([id,k])=>$(id).value=state.marketing[k]||'');save();references();sceneList();loadScene();draw();kpis();toast('تم الاستيراد')}catch(e){toast('ملف المشروع غير صالح: '+e.message)}};
$('mobile-menu').onclick=()=>$('sidebar').classList.toggle('open');
$$('.nav-link').forEach(a=>a.addEventListener('click',()=>{$$('.nav-link').forEach(b=>b.classList.remove('active'));a.classList.add('active');$('sidebar').classList.remove('open');$('header-title').textContent=a.textContent.trim()}));

// Remote render is opt-in; do not persist the credential or silently send project data.
let renderJobId=null,renderBase='',renderKey='',renderTimer=null;
const statusRender=text=>{$('renderer-status').textContent=text};
const configRender=()=>{
 const raw=$('renderer-url').value.trim().replace(/\/+$/,'');
 let url;
 try{url=new URL(raw);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error()}catch{throw Error('أدخل عنوان HTTPS صحيحًا للخادم')}
 const key=$('renderer-key').value.trim();
 if(!key)throw Error('أدخل مفتاح التصيير');
 return {base:url.origin+url.pathname.replace(/\/+$/,''),key};
};
async function apiRender(method,path,payload){
 const cfg=configRender();
 const res=await fetch(cfg.base+path,{method,headers:{'X-Render-Key':cfg.key,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 if(!res.ok){let err;try{err=(await res.json()).error}catch{}throw Error(err||'HTTP '+res.status)}
 return res;
}
const friendlyRender=e=>String(e?.message||e||'فشل الاتصال').slice(0,200);
$('renderer-health').onclick=async()=>{
 try{
 const cfg=configRender();statusRender('جارٍ فحص الاتصال...');
 const u=await fetch(cfg.base+'/health');if(!u.ok)throw Error('HTTP '+u.status);
 const x=await u.json();statusRender(x.renderer?'الخادم متصل ويدعم واجهة التصيير. جاهزية Blender تحتاج اختبار مهمة فعلية.':'الخادم لا يعلن دعمه للتصيير الحقيقي');
 }catch(e){statusRender('تعذر الاتصال: '+friendlyRender(e))}
};
$('renderer-submit').onclick=async()=>{
 try{
 const cfg=configRender();
 const payload={title:state.title,style:state.style,aspect:state.aspect,engine:$('renderer-engine').value,scenes:state.scenes.map(s=>({title:s.title,visual:s.visual,narration:s.narration,duration:Number(s.duration),color:s.color}))};
 const dur=payload.scenes.reduce((n,s)=>n+s.duration,0);
 if(dur>300)throw Error('الحد الأقصى للفيديو 300 ثانية');
 if(!confirm('سترسل نصوص المشاهد إلى خادم التصيير المحدد. هل تريد المتابعة؟'))return;
 $('renderer-submit').disabled=true;
 const res=await apiRender('POST','/api/render/jobs',payload),data=await res.json();
 renderJobId=data.job.id;renderBase=cfg.base;renderKey=cfg.key;
 $('renderer-refresh').disabled=false;$('renderer-download').disabled=true;
 statusRender('أُرسلت المهمة '+renderJobId+' · الحالة: '+data.job.status);
 if(renderTimer)clearInterval(renderTimer);
 renderTimer=setInterval(()=>{if(renderJobId)pollRender()},5000);
 pollRender();
 }catch(e){statusRender('تعذّر إرسال التصيير: '+friendlyRender(e))}
 finally{$('renderer-submit').disabled=false}
};
async function pollRender(){
 if(!renderJobId)return;
 try{
 const res=await apiRender('GET','/api/render/jobs/'+renderJobId),data=await res.json(),job=data.job;
 const names={queued:'في الطابور',running:'جارٍ التصيير',completed:'اكتمل التصيير',failed:'فشل التصيير'};
 statusRender('المهمة '+job.id+' · المحرك '+job.engine+' · '+(names[job.status]||job.status)+(job.error?' · '+job.error:''));
 if(['completed','failed'].includes(job.status)){if(renderTimer)clearInterval(renderTimer);renderTimer=null;$('renderer-download').disabled=job.status!=='completed'}
 }catch(e){statusRender('تعذر تحديث الحالة: '+friendlyRender(e));if(renderTimer)clearInterval(renderTimer);renderTimer=null}
}
$('renderer-refresh').onclick=pollRender;
$('renderer-download').onclick=async()=>{
 if(!renderJobId)return;
 try{
 statusRender('جارٍ تنزيل MP4...');
 const response=await apiRender('GET','/api/render/jobs/'+renderJobId+'/download');
 const file=await response.blob();download('masar-animation-'+renderJobId.slice(0,8)+'.mp4',file,'video/mp4');
 statusRender('تم إرسال MP4 إلى التنزيل. تحقق من الملف قبل النشر.');
 }catch(e){statusRender('تعذر تنزيل الملف: '+friendlyRender(e))}
};

references();sceneList();loadScene();refreshStats();kpis();draw();
})();

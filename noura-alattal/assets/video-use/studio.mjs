import {filename, parseSrt, validateRanges, totalDuration, outputCues, srt, proposeClips, recordingFormat, projectData, buildEdl, zipFiles} from './core.mjs';
import {loadVideo, recordProject} from './recorder.mjs';

const $ = id => document.getElementById(id);
const query = new URL(location.href).searchParams;
const profile = query.get('profile') === 'noura' ? 'noura' : 'theatre';
const work = (query.get('work') || (profile === 'noura' ? 'courses' : 'current-work')).replace(/[^a-z0-9_-]/gi, '').slice(0,80) || 'current-work';
let sources = [], ranges = [], selected = '', controller, resultUrl, bundleUrl, restorePending, sourceSequence = 0, previewEnd;
const sourceId = () => 'source-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + (++sourceSequence).toString(36));
const video = $('video');
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function time(value) { const n = Math.max(0, Math.floor(value || 0)); return String(Math.floor(n / 60)).padStart(2,'0') + ':' + String(n % 60).padStart(2,'0'); }
function text(tag, body, className) { const element = document.createElement(tag); element.textContent = body; if(className)element.className=className; return element; }
function action(label, callback, className) { const button = text('button', label, className); button.type='button';button.addEventListener('click',()=>Promise.resolve().then(callback).catch(error=>status(error.message,true)));return button; }
function current() { return sources.find(item => item.id === selected); }
function download(blob, name) { const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000); }
function project() { return projectData({title:$('title').value, profile, work, aspect:$('aspect').value, quality:$('quality').value,sources,ranges}); }
function busy(value) {
  for (const control of document.querySelectorAll('button,input,select')) control.disabled=value;
  $('cancel').disabled=false;$('cancel').hidden=!value;$('progress').hidden=!value;
}
if (profile === 'noura') {
  $('profile-label').textContent='إنتاج محتوى الدورات · د. نورة العتال';
  $('profile-help').textContent='حوّل لحظة تعليمية مكتملة إلى مقطع للدورة أو للتعريف بها. يبقى محتوى الدرس الأصلي محفوظًا.';
  $('title').value='مقطع من الدورة';$('aspect').value='portrait';
  $('back').href='../../admin/index.html';
  document.title='مونتاج الدورات | د. نورة العتال';
} else {
  $('back').href='../../index.html';$('back').target='_top';
}
function invalidate() {
  $('result').hidden=true;$('completed').hidden=true;$('bundle-result').hidden=true;
  $('output-video').pause();$('output-video').removeAttribute('src');$('output-video').load();
  if(resultUrl){URL.revokeObjectURL(resultUrl);resultUrl=undefined;}
  if(bundleUrl){URL.revokeObjectURL(bundleUrl);bundleUrl=undefined;}
}
function refreshCaptions() {
  const source=current(), cue=source?.cues?.find(item=>item.start<=video.currentTime&&item.end>video.currentTime);
  $('caption-preview').textContent=cue?.text||'';
  $('time').textContent=time(video.currentTime)+' / '+time(source?.duration);
  if(previewEnd!==undefined&&video.currentTime>=previewEnd){video.pause();previewEnd=undefined;}
}
video.addEventListener('timeupdate',refreshCaptions);
video.addEventListener('seeked',refreshCaptions);
function renderSources() {
  $('sources').replaceChildren(...sources.map(source=>{
    const button=action('',()=>select(source.id),'source'+(source.id===selected?' active':''));
    button.append(text('span',source.name),text('small',time(source.duration)));
    button.setAttribute('aria-pressed',String(source.id===selected));return button;
  }));
}
function renderRanges() {
  invalidate();
  $('ranges').replaceChildren(...ranges.map((range,index)=>{
    const source=sources.find(item=>item.id===range.source),li=document.createElement('li');li.className='range';
    const info=text('div','');info.append(text('b',source?.name||'أعد اختيار التسجيل'),text('small',time(range.start)+' — '+time(range.end)));
    const remove=action('حذف',()=>{ranges.splice(index,1);renderRanges();},'remove');remove.setAttribute('aria-label','حذف المقطع '+(index+1));
    const up=action('↑',()=>{if(index>0)[ranges[index-1],ranges[index]]=[ranges[index],ranges[index-1]];renderRanges();});
    up.disabled=index===0;up.setAttribute('aria-label','تقديم المقطع '+(index+1));
    const down=action('↓',()=>{if(index<ranges.length-1)[ranges[index+1],ranges[index]]=[ranges[index],ranges[index+1]];renderRanges();});
    down.disabled=index===ranges.length-1;down.setAttribute('aria-label','تأخير المقطع '+(index+1));
    const watch=action('معاينة',async()=>{await select(range.source);await loadVideo(video,current(),range.start);$('start').value=range.start.toFixed(2);$('end').value=range.end.toFixed(2);previewEnd=range.end;await video.play();});
    const actions=document.createElement('div');actions.className='range-actions';actions.append(watch,up,down);
    li.append(text('span',String(index+1).padStart(2,'0'),'index'),info,remove,actions);return li;
  }));
  $('no-ranges').hidden=!!ranges.length;$('total').textContent=time(totalDuration(ranges));
}
async function select(id) {
  if(controller)return;
  selected=id;previewEnd=undefined;const source=current();if(!source)return;
  video.hidden=false;$('empty').hidden=true;video.pause();
  await loadVideo(video,source,0);
  $('source-name').textContent=source.name;$('start').value='0';$('end').value=source.duration.toFixed(2);
  $('start').max=String(source.duration);$('end').max=String(source.duration);
  $('caption-status').textContent=source.cues?.length?'أضيفت '+source.cues.length+' عبارة لهذا التسجيل. راجع توافق النص مع الكلام.':'أضف ملف SRT لهذا التسجيل عند الحاجة.';
  renderSources();refreshCaptions();
}
async function addFiles(files) {
  if(controller)return;
  for(const file of files) {
    filename(file.name);
    if(sources.some(source=>source.name===file.name)){status('التسجيل '+file.name+' موجود بالفعل؛ غيّر اسمه لإضافة تسجيل آخر بالاسم نفسه.',true);continue;}
    const url=URL.createObjectURL(file),probe=document.createElement('video');probe.preload='metadata';probe.src=url;
    try{
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('تعذر قراءة مدة التسجيل.')),15000);probe.onloadedmetadata=()=>{clearTimeout(timer);resolve();};probe.onerror=()=>{clearTimeout(timer);reject(new Error('هذا التسجيل غير قابل للقراءة في المتصفح.'));};});
      if(!Number.isFinite(probe.duration)||probe.duration<0.1||!probe.videoWidth)throw new Error('اختر فيديو صالحًا ومدته معروفة.');
      const source={id:sourceId(),name:file.name,duration:probe.duration,width:probe.videoWidth,height:probe.videoHeight,size:file.size,lastModified:file.lastModified,url,file,cues:[]};
      if(restorePending){
        const old=restorePending.sources.find(item=>item.name===file.name&&item.size===file.size&&item.lastModified===file.lastModified);
        if(old){source.id=old.id;source.cues=old.cues||[];}else{status('التسجيل لا يطابق بيانات المشروع المحفوظ. راجع المصدر قبل إعادة بناء القص.',true);}
      }
      sources.push(source);
    }catch(error){URL.revokeObjectURL(url);throw error;}
    finally{probe.removeAttribute('src');probe.load();}
  }
  if(restorePending&&restorePending.sources.every(old=>sources.some(source=>source.id===old.id))){ranges=validateRanges(restorePending.ranges,sources);restorePending=null;renderRanges();}
  renderSources();if(sources.length)await select(sources.at(-1).id);
  status(restorePending?'أعد اختيار بقية التسجيلات الأصلية لاستعادة جميع المقاطع.':'التسجيل جاهز. حدّد المقطع الذي تريد الاحتفاظ به.');
}
$('files').addEventListener('change',async event=>{try{await addFiles([...event.target.files]);}catch(error){status(error.message,true);}finally{event.target.value='';}});
$('mark-start').addEventListener('click',()=>{$('start').value=video.currentTime.toFixed(2);});
$('mark-end').addEventListener('click',()=>{$('end').value=video.currentTime.toFixed(2);});
$('add').addEventListener('click',()=>{
  try{const checked=validateRanges([{source:selected,start:$('start').value,end:$('end').value}],sources)[0];ranges=validateRanges([...ranges,checked],sources);renderRanges();status('أضيف المقطع. يمكنك معاينته أو تعديل ترتيبه.');}catch(error){status(error.message,true);}
});
$('captions').addEventListener('change',async event=>{
  try{const source=current();if(!source)throw new Error('اختر التسجيل قبل إضافة ترجمته.');
    const file=event.target.files[0];if(!file)return;if(file.size>1_000_000)throw new Error('ملف الترجمة كبير جدًا.');
    const cues=parseSrt(await file.text());if(cues.some(cue=>cue.end>source.duration+1))throw new Error('توقيت الترجمة يتجاوز مدة التسجيل. راجع اختيار الملف.');
    source.cues=cues;invalidate();$('caption-status').textContent='أضيفت '+cues.length+' عبارة للتسجيل المحدد.';refreshCaptions();status('ظهرت الترجمة في المعاينة؛ راجع النص والتوقيت.');
  }catch(error){status(error.message,true);}finally{event.target.value='';}
});
$('suggest').addEventListener('click',()=>{
  try{const source=current();if(!source)throw new Error('اختر التسجيل أولًا.');
    const proposals=proposeClips(source.cues,source.duration).map(range=>({...range,source:source.id}));
    ranges=validateRanges([...ranges,...proposals],sources);renderRanges();status('أضيفت '+proposals.length+' اقتراحات من حدود عبارات الترجمة. راجع اكتمال الفكرة قبل التصدير.');
  }catch(error){status(error.message,true);}
});
$('save').addEventListener('click',()=>{try{download(new Blob([JSON.stringify(project(),null,2)],{type:'application/json'}),'video-use-project.json');status('حُفظ المشروع دون نسخ التسجيلات. احتفظ بالأصول لإعادة فتحه.');}catch(error){status(error.message,true);}});
$('restore').addEventListener('change',async event=>{
  try{
    const file=event.target.files[0];if(!file)return;if(file.size>2_000_000)throw new Error('ملف المشروع كبير جدًا.');
    const data=JSON.parse(await file.text());
    if(data?.type!=='video-use-project'||data.version!==1||!Array.isArray(data.sources)||data.sources.length>20)throw new Error('ملف مشروع غير صالح.');
    const ids=new Set(),names=new Set();
    for(const source of data.sources){
      filename(source.name);
      if(typeof source.id!=='string'||!/^[a-z0-9_-]{1,100}$/i.test(source.id)||ids.has(source.id)||names.has(source.name)||!Number.isFinite(source.duration)||source.duration<=0||!Number.isSafeInteger(source.size)||source.size<=0||!Number.isFinite(source.lastModified)||!Array.isArray(source.cues)||source.cues.length>5000)throw new Error('بيانات التسجيلات المحفوظة غير صالحة.');
      for(const cue of source.cues)if(typeof cue.text!=='string'||cue.text.length>2000||!Number.isFinite(cue.start)||!Number.isFinite(cue.end)||cue.start<0||cue.end<=cue.start||cue.end>source.duration+1)throw new Error('ترجمة غير صالحة في المشروع.');
      ids.add(source.id);names.add(source.name);
    }
    validateRanges(data.ranges,data.sources);
    sources.forEach(source=>URL.revokeObjectURL(source.url));sources=[];ranges=[];selected='';video.pause();video.removeAttribute('src');delete video.dataset.source;video.load();video.hidden=true;$('empty').hidden=false;
    $('source-name').textContent='أعد اختيار التسجيلات الأصلية';$('caption-preview').textContent='';$('time').textContent='00:00 / 00:00';$('start').value='0';$('end').value='0';
    restorePending=data;$('title').value=String(data.title||'مشروع محفوظ').slice(0,120);$('aspect').value=['original','portrait','landscape'].includes(data.aspect)?data.aspect:'original';$('quality').value=data.quality==='1080'?'1080':'720';
    renderSources();renderRanges();status('فُتح المشروع. أعد اختيار التسجيلات الأصلية المطابقة لاستعادة القص والترجمة.');
  }catch(error){status(error.message==='Unexpected end of JSON input'?'ملف المشروع غير مكتمل.':error.message,true);}finally{event.target.value='';}
});
$('download-srt').addEventListener('click',()=>{try{const cues=outputCues(ranges,sources);if(!cues.length)throw new Error('أضف ترجمة للمقاطع المختارة أولًا.');download(new Blob([srt(cues)],{type:'application/x-subrip;charset=utf-8'}),'master.srt');status('جُهّزت الترجمة بتوقيت المونتاج الجديد.');}catch(error){status(error.message,true);}});
$('bundle').addEventListener('click',async()=>{
  try{
    const data=project(),edl=buildEdl(data),cues=outputCues(ranges,sources);if(!cues.length)delete edl.subtitles;
    const files=[{name:'project.json',data:JSON.stringify(data,null,2)},{name:'edl.json',data:JSON.stringify(edl,null,2)},{name:'sources/ضع-التسجيلات-هنا.txt',data:'ضع هنا التسجيلات الأصلية بالأسماء المذكورة في project.json. لا ترفعها إلى GitHub.'}];
    if(cues.length)files.push({name:'master.srt',data:srt(cues)});
    for(const name of ['run_project.py','render.py','grade.py','LICENSE','HOW-TO.txt']){
      const response=await fetch(new URL('./engine/'+name,import.meta.url));if(!response.ok)throw new Error('تعذر تحميل محرك المشروع. أعد المحاولة.');
      files.push({name:name==='run_project.py'||name==='HOW-TO.txt'?name:'engine/'+name,data:await response.text()});
    }
    if(bundleUrl)URL.revokeObjectURL(bundleUrl);bundleUrl=URL.createObjectURL(zipFiles(files));
    $('bundle-result').href=bundleUrl;$('bundle-result').download='video-use-project.zip';$('bundle-result').hidden=false;
    status('جُهّز مشروع التصدير. اضغط تنزيل مشروع التصدير، ثم أضف الأصول واتبع HOW-TO على الكمبيوتر.');
  }catch(error){status(error.message,true);}
});
$('export').addEventListener('click',async()=>{
  let worker;
  try{
    const data=project();if(totalDuration(data.ranges)>600)throw new Error('صدّر المقاطع على دفعات لا تتجاوز 10 دقائق في المتصفح، أو استخدم المحرك المتقدم.');
    if(document.hidden)throw new Error('أبقِ الصفحة ظاهرة أثناء التصدير.');
    if(!recordingFormat())throw new Error('هذا المتصفح لا يدعم التصدير؛ احفظ المشروع واستخدم متصفحًا حديثًا.');
    invalidate();video.pause();controller=new AbortController();busy(true);$('progress').value=0;status('جارٍ إنشاء المعاينة التجريبية… أبقِ الصفحة ظاهرة.');
    await document.fonts.load('700 32px Cairo');await document.fonts.ready;
    if(!document.fonts.check('700 32px Cairo'))throw new Error('لم يُحمّل خط الترجمة. أعد فتح الأداة بعد اكتمال الاتصال.');
    worker=document.createElement('video');worker.playsInline=true;worker.preload='auto';worker.style.cssText='width:100%;height:100%;object-fit:contain';video.hidden=true;$('preview').append(worker);
    $('preview').scrollIntoView({behavior:'instant',block:'center'});
    const canvas=document.createElement('canvas');
    const result=await recordProject({canvas,video:worker,sources,ranges:data.ranges,aspect:data.aspect,quality:data.quality,signal:controller.signal,onProgress:value=>{$('progress').value=value;}});
    if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=URL.createObjectURL(result.blob);
    $('result').href=resultUrl;$('result').download='video-use-preview.'+result.extension;$('result').textContent='تنزيل المعاينة '+result.extension.toUpperCase();$('result').hidden=false;
    $('output-video').src=resultUrl;$('completed').hidden=false;
    status('أُنشئت معاينة '+result.extension.toUpperCase()+'. راجع الإطارات والتزامن؛ استخدم محرك Video Use للنسخة النهائية.');
  }catch(error){status(error.name==='AbortError'?'أُلغي التصدير؛ المقاطع وإعداداتها باقية.':error.message,true);}
  finally{controller=null;if(worker){worker.removeAttribute('src');worker.load();worker.remove();}video.hidden=!current();refreshCaptions();busy(false);}
});
$('cancel').addEventListener('click',()=>controller?.abort());
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='video-use-context')return;
  if(typeof event.data.title==='string'&&!sources.length)$('title').value=event.data.title.slice(0,120);
});
for(const id of ['aspect','quality'])$(id).addEventListener('change',invalidate);
window.addEventListener('pagehide',event=>{controller?.abort();if(event.persisted)return;sources.forEach(source=>URL.revokeObjectURL(source.url));if(resultUrl)URL.revokeObjectURL(resultUrl);if(bundleUrl)URL.revokeObjectURL(bundleUrl);});
renderRanges();

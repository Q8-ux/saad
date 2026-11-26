import {localDB,download, safeName} from './storage.mjs';
import {decodeAudio,encodeWav,formatTime} from './audio.mjs';
import {buildContentPlan,contentWritingBrief,contentLimits,moneyPrinterTask,preparedVideoProject,contentZip} from './content-core.mjs';
import {paintContent,renderContent,contentMime} from './content-renderer.mjs';

const $=id=>document.getElementById(id);
let opened;
function contentDB(){
  if(!opened)opened=new Promise((resolve,reject)=>{
    const request=indexedDB.open('sawtak-content-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opened=null;reject(request.error);};
  });return opened;
}
async function draftStore(mode,value){
  const db=await contentDB();return new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts',mode),store=tx.objectStore('drafts');
    const request=mode==='readonly'?store.get('current'):store.put(value);
    let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}

export function initContentStudio({toast=()=>{}}={}){
  let audio=null,images=[],revision=0,output=null,plan=null,active=null,ready=null,loading=false;
  let packaging=false,pendingMedia=0;
  let saveTimer,saveQueue=Promise.resolve(),audioURL,outputURL,history=[],audioSelection=0,storageIssue=false;
  const fields=['content-title','content-script','content-aspect','content-register'];
  const read=()=>Object.fromEntries(fields.map(id=>[id,$(id).value]));
  function message(value){$('content-status').textContent=value;}
  function controls(){
    const locked=Boolean(active)||loading||packaging||pendingMedia>0;
    for(const id of [...fields,'content-audio-file','content-audio-history','content-images','content-build','content-writing','content-package'])$(id).disabled=locked;
    $('content-render').disabled=locked||!audio||!images.length||!$('content-script').value.trim();
    $('content-cancel').hidden=!active;
    $('content-download').disabled=!output;
    $('content-scenes').querySelectorAll('button').forEach(button=>button.disabled=locked);
  }
  function scheduleSave(){
    if(loading)return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      const value={id:'current',fields:read(),revision,audio:audio?{blob:audio.blob,name:audio.name}:null,images:images.map(x=>({file:x.file})),output};
      saveQueue=saveQueue.catch(()=>{}).then(async()=>{await draftStore('readwrite',value);$('content-save-status').textContent='حُفظ على هذا الجهاز';}).catch(()=>{
        $('content-save-status').textContent='تعذّر الحفظ المحلي';
        if(!storageIssue){storageIssue=true;message('تعذّر الحفظ على هذا الجهاز. نزّل حزمة المشروع للاحتفاظ بملفاتك.');}
      });
    },180);
  }
  function invalidate(){
    revision+=1;plan=null;$('content-writing-result').hidden=true;$('content-canvas').hidden=true;$('content-plan-note').textContent='حدّث المعاينة لتطبيق التعديلات.';
    if(output)$('content-output-note').textContent='هذا آخر تصدير محفوظ. أعد الإخراج لتطبيق التعديلات الحالية.';
    scheduleSave();controls();
  }
  function releaseImages(){for(const image of images)URL.revokeObjectURL(image.url);images=[];}
  async function loadImage(file){
    if(!file||!file.size||!(/image\/(png|jpeg|webp)/i.test(file.type)||/\.(png|jpe?g|webp)$/i.test(file.name)))throw new Error('استخدم صور JPG أو PNG أو WebP للمشاهد.');
    const url=URL.createObjectURL(file),image=new Image();image.src=url;
    try{await image.decode();if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>32000000)throw new Error('استخدم صورة أصغر من 32 ميغابكسل.');return {file,url,image};}
    catch(error){URL.revokeObjectURL(url);throw error;}
  }
  function totalBytes(files,voice=audio?.blob){return files.reduce((sum,file)=>sum+file.size,voice?.size||0);}
  function makePlan(){
    if(!audio)throw new Error('أضف التعليق الصوتي أولًا.');
    plan=buildContentPlan({title:$('content-title').value,script:$('content-script').value,aspect:$('content-aspect').value,duration:audio.buffer.duration,images:images.map(x=>({name:x.file.name}))});
    const canvas=$('content-canvas');canvas.width=plan.width;canvas.height=plan.height;paintContent(canvas,plan,images.map(x=>x.image),0);canvas.hidden=false;
    showScenes();$('content-plan-note').textContent=`${images.length} · ${formatTime(plan.duration)} · ${plan.width} × ${plan.height}`;
    return plan;
  }
  function showScenes(){
    const list=$('content-scenes');list.replaceChildren();
    images.forEach((item,index)=>{
      const li=document.createElement('li');li.className='content-scene';
      const image=document.createElement('img');image.src=item.url;image.alt='';
      const body=document.createElement('div'),name=document.createElement('b'),caption=document.createElement('p'),buttons=document.createElement('div');buttons.className='button-group';
      name.textContent=`${index+1} · ${item.file.name}`;name.setAttribute('translate','no');caption.textContent=plan?.scenes[index]?.text||'';
      for(const [label,move] of [['↑',-1],['↓',1],['إزالة',0]]){
        const button=document.createElement('button');button.type='button';button.className='button ghost small';button.textContent=label;
        button.setAttribute('aria-label',move===-1?'تقديم المشهد':move===1?'تأخير المشهد':'إزالة المشهد');
        button.disabled=Boolean(active)||(move===-1&&index===0)||(move===1&&index===images.length-1);
        button.addEventListener('click',()=>{
          if(move){const next=index+move;if(next<0||next>=images.length)return;[images[index],images[next]]=[images[next],images[index]];}
          else{URL.revokeObjectURL(images[index].url);images.splice(index,1);}
          invalidate();showScenes();if(audio&&images.length&&$('content-script').value.trim())try{makePlan();}catch{}
        });buttons.append(button);
      }
      body.append(name,caption,buttons);li.append(image,body);list.append(li);
    });
  }
  async function setAudio(blob,name,text='',replaceText=false){
    const selection=++audioSelection;
    if(!(blob instanceof Blob)||!blob.size||totalBytes(images.map(x=>x.file),blob)>contentLimits.bytes)throw new Error('اجعل مجموع ملفات الصوت والصور أقل من 50 ميغابايت.');
    const buffer=await decodeAudio(blob);if(selection!==audioSelection)return;
    if(!Number.isFinite(buffer.duration)||buffer.duration<.5||buffer.duration>contentLimits.seconds)throw new Error('اختر تعليقًا صوتيًا من نصف ثانية إلى ثلاث دقائق.');
    audio={blob,buffer,name:name||'تعليق صوتي'};
    if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(blob);$('content-audio-preview').src=audioURL;
    $('content-audio-name').textContent=`${audio.name} · ${formatTime(buffer.duration)}`;
    if(text&&(replaceText||!$('content-script').value.trim()))$('content-script').value=text;
    invalidate();message('التعليق جاهز. أضف صور المشاهد وراجع النص قبل إخراج الفيديو.');
  }
  async function refreshHistory(){
    history=(await localDB.all('assets').catch(()=>[])).filter(x=>x.kind==='generation'&&x.blob instanceof Blob).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const select=$('content-audio-history'),previous=select.value;
    select.replaceChildren(new Option('اختر صوتًا محفوظًا',''));
    for(const item of history){const option=new Option(`${item.profile_name||'تعليق صوتي'} · ${(item.text||'').slice(0,55)}`,item.id);option.translate=false;select.add(option);}
    select.value=previous;
  }
  function showOutput(){
    if(!output)return;if(outputURL)URL.revokeObjectURL(outputURL);outputURL=URL.createObjectURL(output.blob);
    $('content-output-video').src=outputURL;$('content-output').hidden=false;
    $('content-output-note').textContent=output.revision===revision?'اكتمل إخراج الفيديو. راجع الصورة والصوت قبل استخدامه.':'هذا آخر تصدير محفوظ. أعد الإخراج لتطبيق التعديلات الحالية.';
  }
  async function activate(){
    if(!ready)ready=(async()=>{
      loading=true;controls();
      try{
        const draft=await draftStore('readonly');
        if(draft){
          for(const id of fields)if(typeof draft.fields?.[id]==='string')$(id).value=draft.fields[id];
          revision=Number.isSafeInteger(draft.revision)?draft.revision:0;
          if(draft.audio?.blob)await setAudio(draft.audio.blob,draft.audio.name);
          const selected=[];for(const item of (draft.images||[]).slice(0,contentLimits.scenes))selected.push(await loadImage(item.file));
          releaseImages();images=selected;output=draft.output?.blob instanceof Blob?draft.output:null;
          // setAudio increments the revision; the restored inputs themselves are unchanged.
          revision=Number.isSafeInteger(draft.revision)?draft.revision:0;
          showOutput();showScenes();if(audio&&images.length&&$('content-script').value.trim())makePlan();
        }
      }catch{message('المساحة جاهزة. يمكنك رفع الصوت والصور من جهازك.');}
      finally{loading=false;controls();}
    })();
    await ready;await refreshHistory();
  }
  async function useAudio(meta){
    await activate();pendingMedia+=1;controls();try{await setAudio(meta.blob,meta.profile_name||'تعليق صوتي',meta.text||'',true);location.hash='content';}finally{pendingMedia-=1;controls();}
  }
  for(const id of fields)$(id).addEventListener('input',()=>{invalidate();});
  $('content-audio-file').addEventListener('change',async event=>{pendingMedia+=1;controls();try{const file=event.target.files[0];if(file)await setAudio(file,file.name);}catch(error){message(error.message);}finally{event.target.value='';pendingMedia-=1;controls();}});
  $('content-audio-history').addEventListener('change',async event=>{const item=history.find(x=>x.id===event.target.value);if(item){pendingMedia+=1;controls();try{await setAudio(item.blob,item.profile_name,item.text);}catch(error){message(error.message);}finally{pendingMedia-=1;controls();}}});
  $('content-images').addEventListener('change',async event=>{
    const files=Array.from(event.target.files);const added=[];pendingMedia+=1;controls();
    try{
      if(!files.length)return;
      if(images.length+files.length>contentLimits.scenes)throw new Error('أضف من صورة واحدة إلى 12 صورة للمشاهد.');
      if(totalBytes([...images.map(x=>x.file),...files])>contentLimits.bytes)throw new Error('اجعل مجموع ملفات الصوت والصور أقل من 50 ميغابايت.');
      for(const file of files)added.push(await loadImage(file));
      images.push(...added);invalidate();showScenes();if(audio&&$('content-script').value.trim())makePlan();message('أُضيفت صور المشاهد. يمكنك تغيير ترتيبها قبل الإخراج.');
    }catch(error){for(const image of added)if(!images.includes(image))URL.revokeObjectURL(image.url);message(error.message);}
    finally{event.target.value='';pendingMedia-=1;controls();}
  });
  $('content-build').addEventListener('click',()=>{try{makePlan();message('خطة المشاهد جاهزة. توقيت النص موزع على المشاهد وليس تفريغًا كلمة بكلمة.');}catch(error){message(error.message);}});
  $('content-writing').addEventListener('click',()=>{try{$('content-writing-prompt').value=contentWritingBrief($('content-title').value,$('content-register').value);$('content-writing-result').hidden=false;$('content-writing-prompt').focus();$('content-writing-prompt').select();}catch(error){message(error.message);}});
  $('content-render').addEventListener('click',async()=>{
    if(active)return;
    try{
      const selectedPlan=makePlan(),selectedRevision=revision;active=new AbortController();controls();$('content-progress').hidden=false;
      message('جارٍ إخراج الفيديو على جهازك. أبقِ الصفحة ظاهرة حتى يكتمل.');
      const result=await renderContent($('content-canvas'),selectedPlan,images.map(x=>x.image),audio.buffer,{signal:active.signal,onProgress:value=>{$('content-progress').value=Math.round(value*100);}});
      output={...result,revision:selectedRevision};showOutput();scheduleSave();message('اكتمل إخراج الفيديو. راجع الصورة والصوت قبل استخدامه.');
    }catch(error){message(error.name==='AbortError'?'أُوقف الإخراج. بقيت ملفات المشروع محفوظة.':error.message);}
    finally{active=null;$('content-progress').hidden=true;controls();}
  });
  $('content-cancel').addEventListener('click',()=>active?.abort());
  $('content-download').addEventListener('click',()=>{if(output)download(output.blob,safeName($('content-title').value)+'.'+output.extension);});
  $('content-package').addEventListener('click',async()=>{
    if(active||packaging)return;
    packaging=true;controls();
    try{
      const selectedPlan=makePlan(),paths=images.map((x,i)=>`media/scene-${String(i+1).padStart(3,'0')}.${/\.png$/i.test(x.file.name)?'png':/\.webp$/i.test(x.file.name)?'webp':'jpg'}`);
      const voicePath='audio/narration.wav';
      const entries=[{name:'tasks.json',data:JSON.stringify([moneyPrinterTask(selectedPlan,voicePath,paths)],null,2)},{name:'content-plan.json',data:JSON.stringify(selectedPlan,null,2)},{name:voicePath,data:encodeWav(audio.buffer)},...images.map((x,i)=>({name:paths[i],data:x.file}))];
      let note='حزمة قصص و روايات — MoneyPrinterTurbo\n\nتحتوي على النص والصوت الفعلي وصور المشاهد. لا يتم رفع الملفات أو تشغيل مزود أو نشر الفيديو عند تنزيل الحزمة.\n\nبعد تثبيت MoneyPrinterTurbo راجع إعدادات النشر والمزود والخط. انسخ AL-Mohanad.ttf من مجلد fonts إلى resource/fonts في محرك MoneyPrinterTurbo عند استخدامه.\n\nملف tasks.json متوافق مع CLI الدفعات. مسارات الملفات فيه نسبية إلى الحزمة. يتطلب الإخراج الكامل إعداد المحرك وخدماته؛ تجهيز الملف لا يثبت تشغيلها.\n';
      if(output&&output.revision===revision){
        const videoPath='prepared/video.'+output.extension;entries.push({name:videoPath,data:output.blob},{name:'project.json',data:JSON.stringify(preparedVideoProject(selectedPlan,videoPath,voicePath),null,2)});
        note+='\nلإعادة إخراج النسخة المعدة عبر المحرك المحلي بدون مزود أو نشر تلقائي، شغّل الأوامر التالية من داخل نسخة MoneyPrinterTurbo، مع مسار project.json الكامل:\npython -m app.services.video_project --project storage/projects/qisas-content revise /path/to/project.json\npython -m app.services.video_project --project storage/projects/qisas-content render\n';
      }
      const font=await fetch(new URL('./assets/AL-Mohanad.ttf',import.meta.url)).then(r=>{if(!r.ok)throw new Error('تعذّر تضمين الخط في الحزمة.');return r.blob();});entries.push({name:'fonts/AL-Mohanad.ttf',data:font},{name:'README-ar.txt',data:note});
      download(await contentZip(entries),'qisas-moneyprinter-project.zip');message('حزمة MoneyPrinterTurbo جاهزة وتحتوي على ملفات الصوت والصور الفعلية.');
    }catch(error){message(error.message);}
    finally{packaging=false;controls();}
  });
  const onLeave=()=>{active?.abort();$('content-audio-preview').pause();$('content-output-video').pause();};
  window.addEventListener('studio-use-content-audio',event=>{void useAudio(event.detail).catch(error=>{message(error.message);toast(error.message,true);});});
  window.addEventListener('pagehide',()=>{active?.abort();});
  if(!contentMime())$('content-local-note').textContent='التصدير المحلي غير مدعوم في هذا المتصفح. يمكنك تنزيل حزمة MoneyPrinterTurbo على الكمبيوتر.';
  controls();return {activate,useAudio,onLeave};
}

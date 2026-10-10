/* Private, browser-side attachment reading for the teacher assistant. */
(function(){
 const IMAGE_TYPES=new Set(['image/jpeg','image/png','image/webp']);
 const MAX_FILES=6,MAX_IMAGE=12*1024*1024,MAX_PDF=50*1024*1024,MAX_TOTAL=60*1024*1024;
 let ocrScript=null,ocrWorker=null;
 const typeOf=file=>file.type==='application/pdf'||/\.pdf$/i.test(file.name)?'pdf':IMAGE_TYPES.has(file.type)||/\.(jpe?g|png|webp)$/i.test(file.name)?'image':'';
 function validateFile(file){
  const kind=typeOf(file);if(!kind)throw Error('يدعم المساعد صور JPG وPNG وWebP وملفات PDF فقط.');
  if(kind==='image'&&file.size>MAX_IMAGE)throw Error('الصورة '+file.name+' تتجاوز ١٢ ميغابايت.');
  if(kind==='pdf'&&file.size>MAX_PDF)throw Error('ملف '+file.name+' يتجاوز ٥٠ ميغابايت.');return kind;
 }
 function formatBytes(n){return n<1024*1024?Math.max(1,Math.round(n/1024))+' ك.ب':(n/1024/1024).toFixed(1)+' م.ب'}
 async function sha256(file){if(typeof window.MANHAJ_FILE_SHA256==='function')return window.MANHAJ_FILE_SHA256(file);const bytes=await file.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
 function loadScript(src){
  if(ocrScript)return ocrScript;ocrScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.crossOrigin='anonymous';script.onload=resolve;script.onerror=()=>reject(Error('تعذر تحميل محرّك قراءة الصور. تحقق من الاتصال ثم أعد المحاولة.'));document.head.append(script)});return ocrScript;
 }
 async function imageText(file,progress){
  if(typeof window.MANHAJ_IMAGE_OCR==='function')return String(await window.MANHAJ_IMAGE_OCR(file,progress)||'').trim();
  await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
  if(!window.Tesseract)throw Error('تعذر تشغيل محرّك قراءة الصور.');
  if(!ocrWorker)ocrWorker=window.Tesseract.createWorker(['ara','eng'],1,{logger:m=>{if(m.status==='recognizing text')progress('قراءة نص الصورة… '+Math.round((m.progress||0)*100)+'٪');else if(/loading|initializing/i.test(m.status||''))progress('تجهيز قارئ الصور لأول مرة…')}});
  const worker=await ocrWorker,result=await worker.recognize(file,{rotateAuto:true});return String(result.data?.text||'').trim();
 }
 function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('تعذر تجهيز صفحة PDF للقراءة.')),'image/png'))}
 async function pdfPages(file,progress){
  if(typeof window.MANHAJ_PDF_EXTRACTOR==='function')return window.MANHAJ_PDF_EXTRACTOR(file,progress);
  const bytes=new Uint8Array(await file.arrayBuffer()),pdfjs=await import('./vendor/pdfjs/pdf.mjs').catch(()=>{throw Error('تعذر تحميل قارئ PDF. أعد المحاولة بعد تحديث الصفحة.')});
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',location.href).href;
  const loading=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,cMapUrl:new URL('./vendor/pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',location.href).href});let pdf;
  try{
   pdf=await loading.promise;if(pdf.numPages>120)throw Error('ملف PDF يتجاوز ١٢٠ صفحة؛ ارفع الجزء المطلوب فقط.');
   const pages=[],warnings=[];let ocrCount=0,total=0;
   for(let i=1;i<=pdf.numPages;i++){
    progress('قراءة صفحة '+i+' من '+pdf.numPages+'…');const page=await pdf.getPage(i),content=await page.getTextContent();let text=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();
    if(text.length<30&&ocrCount<8){try{ocrCount++;const natural=page.getViewport({scale:1}),scale=Math.min(2.2,1800/Math.max(natural.width,1)),viewport=page.getViewport({scale:Math.max(1.4,scale)}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;text=await imageText(await canvasBlob(canvas),message=>progress('صفحة '+i+': '+message))}catch(e){warnings.push('تعذر OCR للصفحة '+i+': '+e.message)}}
    else if(text.length<30)warnings.push('الصفحة '+i+' مصوّرة ولم تُقرأ؛ حد OCR المحلي ثماني صفحات لكل ملف.');
    total+=text.length;if(total>1000000)throw Error('النص المستخرج كبير جدًا؛ ارفع الجزء المطلوب.');pages.push({number:i,text});page.cleanup();if(i%4===0)await new Promise(r=>setTimeout(r,0));
   }
   return {pages,warnings};
  }finally{await loading.destroy()}
 }
 async function processFile(item,progress){
  item.sha256=await sha256(item.file);if(item.kind==='image'){const text=await imageText(item.file,progress);return {pages:[{number:1,text}],warnings:text?[]:['لم يظهر نص مقروء في الصورة. صوّر الورقة بإضاءة أوضح ومن دون ميلان.']}}
  return pdfPages(item.file,progress);
 }
 const kindRules={lessons:/درس|حصة|نواتج التعلم|هدف تعليمي|تقويم|صف|مادة|نشاط صفي/g,meetings:/اجتماع|محضر|الحضور|المجتمعون|قرار|توصية|جدول الأعمال/g,workplans:/خطة|إجراء|مؤشر|مسؤول|مدة التنفيذ|متابعة/g,projects:/مشروع|مبادرة|مخرجات|ميزانية|فريق العمل/g,tasks:/مهمة|موعد|أولوية|تكليف|إنجاز/g};
 const labels={lessons:'تحضير درس',meetings:'إعداد اجتماع أو محضر',workplans:'إعداد خطة',projects:'إنشاء مشروع',tasks:'إنشاء مهمة'};
 function analyze(items,question=''){
  const ready=items.filter(i=>i.status==='ready'),pages=ready.flatMap(i=>i.pages.map(p=>({...p,source:i.name,sourcePage:p.number}))).map((p,index)=>({...p,number:index+1})),all=pages.map(p=>p.text).join('\n'),lines=all.split(/\n|[.!؟]\s+/).map(v=>v.replace(/\s+/g,' ').trim()).filter(v=>v.length>=18&&v.length<=350),important=/هدف|نواتج|درس|مادة|صف|نشاط|تقويم|اجتماع|حضور|قرار|توصية|خطة|إجراء|مسؤول|مشروع|مهمة|موعد|نتيجة|مؤشر/;
  const keyLines=[...new Set([...lines.filter(v=>important.test(v)),...lines])].slice(0,7),scores=Object.fromEntries(Object.entries(kindRules).map(([kind,re])=>[kind,(all.match(re)||[]).length])),suggestedKind=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  const warnings=items.flatMap(i=>i.status==='error'?[i.name+': '+i.error]:(i.warnings||[]).map(w=>i.name+': '+w)),wordCount=(all.match(/[\p{L}\p{N}]+/gu)||[]).length,usable=all.trim().length>=20;
  let evidence=[];if(usable&&question.trim()&&window.ManhajAnalysis?.retrieveEvidence)evidence=window.ManhajAnalysis.retrieveEvidence(pages,question,4).map(hit=>{const page=pages.find(p=>p.number===hit.page);return {...hit,source:page?.source||'المرفق',page:page?.sourcePage||hit.page}});
  const excerpt=[...keyLines,evidence.map(v=>v.text).join('\n'),all.slice(0,6500)].filter(Boolean).join('\n').slice(0,7500);
  return {items:[...items],ready,pages,all,excerpt,keyLines,evidence,warnings,wordCount,pageCount:pages.length,usable,suggestedKind:suggestedKind&&suggestedKind[1]>0?suggestedKind[0]:'',suggestedLabel:suggestedKind&&suggestedKind[1]>0?labels[suggestedKind[0]]:''};
 }
 function create({list,onStatus=()=>{}}){
  let items=[];
  function render(){
   list.replaceChildren();list.hidden=!items.length;
   for(const item of items){const row=document.createElement('article');row.className='teacher-attachment '+item.status;const visual=document.createElement('span');visual.className='teacher-attachment-preview';if(item.kind==='image'&&item.url){const img=document.createElement('img');img.src=item.url;img.alt='';visual.append(img)}else visual.textContent=item.kind==='pdf'?'PDF':'صورة';const info=document.createElement('span'),name=document.createElement('strong'),meta=document.createElement('small'),remove=document.createElement('button');name.textContent=item.name;meta.textContent=item.label+' • '+formatBytes(item.size);info.append(name,meta);remove.type='button';remove.className='teacher-attachment-remove';remove.textContent='×';remove.setAttribute('aria-label','إزالة '+item.name);remove.onclick=()=>removeItem(item.id);row.append(visual,info,remove);list.append(row)}
  }
  function update(item,label){if(item.removed)return;item.label=label;render();onStatus(label,true)}
  async function run(item){try{const result=await processFile(item,label=>update(item,label));if(item.removed)return;item.pages=Array.isArray(result.pages)?result.pages:result;item.warnings=result.warnings||[];item.status='ready';item.label=item.pages.some(p=>p.text?.trim())?'جاهز للتحليل':'مرفق بلا نص مقروء';render();onStatus(item.name+' جاهز.',false)}catch(e){if(item.removed)return;item.status='error';item.error=e.message||'تعذرت قراءة المرفق';item.label='تعذرت القراءة';render();onStatus(item.error,false)}}
  async function addFiles(files){
   const chosen=Array.from(files||[]);if(!chosen.length)return;if(items.length+chosen.length>MAX_FILES)throw Error('يمكن إرفاق ستة ملفات كحد أقصى في الطلب الواحد.');
   const total=items.reduce((n,i)=>n+i.size,0)+chosen.reduce((n,f)=>n+f.size,0);if(total>MAX_TOTAL)throw Error('إجمالي المرفقات يتجاوز ٦٠ ميغابايت.');
   for(const file of chosen){const kind=validateFile(file),item={id:crypto.randomUUID(),file,kind,name:file.name||'مرفق',size:file.size||0,status:'processing',label:'جارٍ تجهيز المرفق…',pages:[],warnings:[],url:null,removed:false};if(kind==='image'&&URL.createObjectURL)try{item.url=URL.createObjectURL(file)}catch{}items.push(item);render();item.promise=run(item)}
   await Promise.allSettled(items.filter(i=>i.status==='processing').map(i=>i.promise));return snapshot();
  }
  function removeItem(id){const item=items.find(i=>i.id===id);if(!item)return;item.removed=true;if(item.url)URL.revokeObjectURL?.(item.url);items=items.filter(i=>i!==item);render()}
  function clear(){for(const item of items){item.removed=true;if(item.url)URL.revokeObjectURL?.(item.url)}items=[];render()}
  function snapshot(){return [...items]}
  async function wait(){await Promise.allSettled(items.filter(i=>i.promise).map(i=>i.promise));return snapshot()}
  return {addFiles,removeItem,clear,snapshot,wait,analyze:question=>analyze(items,question),count:()=>items.length};
 }
 window.ManhajAssistantAttachments={create,analyze,validateFile,limits:{files:MAX_FILES,image:MAX_IMAGE,pdf:MAX_PDF,total:MAX_TOTAL}};
})();

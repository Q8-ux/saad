import {LIMITS,sampleCodes,demoDecision} from './inspector.mjs';
import {androidFixture,windowsFixture} from './fixtures.mjs';
const $=id=>document.getElementById(id),arabic=new Intl.NumberFormat('ar-KW'),formatter=new Intl.NumberFormat('ar-KW',{maximumFractionDigits:1});
let currentReport=null,activeWorker=null,scanSequence=0,scanTimer,platform='android',localFlag=false;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function sizeText(size){return size>=1048576?`${formatter.format(size/1048576)} ميغابايت`:size>=1024?`${formatter.format(size/1024)} كيلوبايت`:`${arabic.format(size)} بايت`;}
function showStatus(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);$('status').hidden=false;}
function setBusy(busy){$('chooseFile').disabled=busy;$('sampleAndroid').disabled=busy;$('sampleWindows').disabled=busy;$('cancelScan').hidden=!busy;$('dropzone').setAttribute('aria-busy',String(busy));}
function stopWorker(){clearTimeout(scanTimer);if(activeWorker){activeWorker.terminate();activeWorker=null;}setBusy(false);}
function route(){const next=['inspect','demo','analysis'].includes(location.hash.slice(1))?location.hash.slice(1):'inspect';for(const view of document.querySelectorAll('.view'))view.hidden=view.id!==`view-${next}`;for(const link of document.querySelectorAll('[data-view]')){if(link.dataset.view===next)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}}
window.addEventListener('hashchange',route);route();
$('deviceLabel').textContent=/Android/i.test(navigator.userAgent)?'جهاز أندرويد':/Windows/i.test(navigator.userAgent)?'كمبيوتر Windows':/iPhone|iPad/i.test(navigator.userAgent)?'جهاز iOS':'متصفح الكمبيوتر';
$('chooseFile').addEventListener('click',()=>$('fileInput').click());
$('fileInput').addEventListener('change',()=>{const file=$('fileInput').files[0];if(file)startScan(file);$('fileInput').value='';});
for(const event of ['dragover','dragenter'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('dropzone').classList.add('dragging');});
for(const event of ['dragleave','drop'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('dropzone').classList.remove('dragging');});
$('dropzone').addEventListener('drop',e=>{if(e.dataTransfer.files.length!==1){showStatus('اختر ملفًا واحدًا للفحص في كل مرة.',true);return;}startScan(e.dataTransfer.files[0]);});
$('cancelScan').addEventListener('click',()=>{scanSequence++;stopWorker();showStatus('أُلغي الفحص. لم يتغير الملف الأصلي.');});
async function startScan(file,synthetic=false){
  const request=++scanSequence;stopWorker();currentReport=null;$('reportPanel').hidden=true;
  if(file.size>LIMITS.file){showStatus('الحد الأقصى 100 ميغابايت. اختر ملفًا أصغر.',true);return;}
  if(!file.size){showStatus('الملف فارغ. اختر ملف تطبيق صالحًا.',true);return;}
  if(!/\.(apk|exe|dll|msix|appx)$/i.test(file.name)){showStatus('اختر ملف APK أو EXE أو DLL أو MSIX أو APPX.',true);return;}
  if(!globalThis.Worker || !globalThis.crypto?.subtle){showStatus('شغّل الصفحة من رابط HTTPS في متصفح حديث لتفعيل الفحص والبصمة.',true);return;}
  setBusy(true);showStatus('جارٍ قراءة الملف وفحص بنيته داخل جهازك…');
  try{
    const buffer=await file.arrayBuffer();if(request!==scanSequence)return;
    activeWorker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
    activeWorker.onmessage=({data})=>{if(request!==scanSequence)return;stopWorker();if(!data.ok){showStatus(data.error,true);return;}currentReport={...data.report,synthetic};renderReport(currentReport);showStatus('اكتمل الفحص البنيوي. راجع النتيجة وحدودها أدناه.');};
    activeWorker.onerror=()=>{if(request!==scanSequence)return;stopWorker();showStatus('تعذر بدء الفاحص. حدّث الصفحة وافتحها في متصفح حديث، ثم أعد المحاولة.',true);};
    scanTimer=setTimeout(()=>{if(request!==scanSequence)return;scanSequence++;stopWorker();showStatus('استغرق الملف وقتًا أطول من حد الفحص. جرّب ملفًا أصغر أو أداة سطح مكتب.',true);},45000);
    activeWorker.postMessage({buffer,name:file.name},[buffer]);
  }catch(error){if(request!==scanSequence)return;stopWorker();showStatus(error.message||'تعذر قراءة الملف.',true);}
}
$('sampleAndroid').addEventListener('click',async()=>{try{const bytes=await androidFixture(globalThis.JSZip);await startScan(new File([bytes],'synthetic-android-example.apk'),true);}catch{showStatus('تعذر إنشاء نموذج الاختبار. أعد تحميل الصفحة.',true);}});
$('sampleWindows').addEventListener('click',()=>startScan(new File([windowsFixture()],'synthetic-windows-example.exe'),true));
function renderReport(report){
  $('reportPanel').hidden=false;$('reportKind').textContent=report.label;$('fileName').textContent=report.name;$('fileHash').textContent=report.sha256;$('syntheticNotice').hidden=!report.synthetic;
  const facts=[{label:'حجم الملف',value:sizeText(report.size)},...report.checks];
  $('reportFacts').replaceChildren(...facts.map(fact=>{const group=node('div',undefined,'fact');group.append(node('dt',fact.label),node('dd',fact.value));return group;}));
  $('signalList').replaceChildren(...report.signals.map(value=>node('span',value,'signal')));
  if(report.signals.length)$('signalList').append(node('p','المؤشرات ليست إثباتًا لطريقة الترخيص أو لقابلية فتح الميزة.','fine'));
  $('reportNotes').replaceChildren(...report.notes.map(note=>node('li',note)));
  $('nextStep').textContent=report.kind==='android'?'حدد الميزة المطلوبة في مشروعك. راجع الدالة المستهدفة من المصدر أو بأداة DEX، ثم ابنِ النسخة ووقّعها واختبرها على جهاز مخصص.':report.kind==='windows'?'راجع مصدر المشروع. إن كان .NET فابحث عن الدالة المستهدفة في مشروعك؛ وإن كان كودًا أصليًا فاختر أدوات توافق المعمارية. لا يمكن استنتاج تعديل الترخيص من الرأس فقط.':'راجع بيان الحزمة ومصدر المشروع قبل البناء والتوقيع والاختبار.';
  $('entrySearch').value='';renderEntries();$('reportTitle').focus({preventScroll:true});
}
function renderEntries(){
  if(!currentReport)return;
  const search=$('entrySearch').value.trim().toLocaleLowerCase(),all=currentReport.pe?.sections||currentReport.files,items=all.filter(item=>item.name.toLocaleLowerCase().includes(search));
  $('entries').replaceChildren(...items.slice(0,250).map(item=>{const row=node('tr');row.append(node('td',item.name),node('td',sizeText(item.size)));return row;}));
  if(!items.length){const row=node('tr'),cell=node('td','لا توجد نتائج مطابقة.');cell.colSpan=2;row.append(cell);$('entries').append(row);}
  $('entryCount').textContent=`عرض ${arabic.format(Math.min(250,items.length))} من ${arabic.format(items.length)} نتيجة. الجرد الكامل متاح في تقرير JSON.`;
}
$('entrySearch').addEventListener('input',renderEntries);
function download(contents,name,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([contents],{type}));const link=node('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}
function reportMarkdown(report){return `# تقرير فحص التطبيق\n\n${report.synthetic?'**ملف اختبار مصطنع — لا يخص تطبيقًا حقيقيًا.**\n\n':''}- الملف: ${report.name}\n- النوع: ${report.label}\n- الحجم: ${sizeText(report.size)}\n- وقت الفحص: ${report.inspectedAt}\n- نطاق العمل: فحص بنيوي فقط\n- SHA-256: ${report.sha256}\n\n## النتائج\n\n${report.checks.map(item=>`- ${item.label}: ${item.value}`).join('\n')}\n\n## مؤشرات للمراجعة\n\n${report.signals.length?report.signals.map(value=>'- '+value).join('\n'):'لا توجد مؤشرات في الجزء الذي فُحص، أو لا يدعم النوع استخراجها.'}\n\n## حدود الفحص\n\n${report.notes.map(value=>'- '+value).join('\n')}\n\n## الخطوة التالية\n\n${$('nextStep').textContent}\n\nلم يُشغّل الملف ولم يُعدّل. لم يُتحقق من التوقيع أو نجاح التثبيت أو المزايا المدفوعة.\n`;}
$('exportJson').addEventListener('click',()=>{if(currentReport)download(JSON.stringify(currentReport,null,2),'app-inspection.json','application/json');});
$('exportMarkdown').addEventListener('click',()=>{if(currentReport)download(reportMarkdown(currentReport),'app-inspection.md');});
function renderDemo(){
  const decision=demoDecision({localFlag,serverCheck:$('serverCheck').checked});
  $('demoCode').textContent=sampleCodes[platform](localFlag);$('codeLanguage').textContent=platform==='android'?'Smali — دالة منطقية مستقلة للشرح':'C# — مثال مصدر لمشروع .NET';
  $('demoAndroid').setAttribute('aria-pressed',String(platform==='android'));$('demoWindows').setAttribute('aria-pressed',String(platform==='windows'));
  $('featureState').textContent=decision.allowed?'متاحة داخل النموذج':'غير متاحة';$('featureState').classList.toggle('enabled',decision.allowed);$('demoReason').textContent=decision.reason;$('runFeature').disabled=!decision.allowed;
  $('applyDemo').disabled=localFlag;$('applyDemo').textContent=localFlag?'تم تغيير قيمة النموذج':'تغيير القيمة إلى true';$('featureOutput').textContent='';
}
$('demoAndroid').addEventListener('click',()=>{platform='android';renderDemo();});$('demoWindows').addEventListener('click',()=>{platform='windows';renderDemo();});
$('applyDemo').addEventListener('click',()=>{localFlag=true;renderDemo();});$('resetDemo').addEventListener('click',()=>{localFlag=false;$('serverCheck').checked=false;renderDemo();});$('serverCheck').addEventListener('change',renderDemo);
$('downloadDemo').addEventListener('click',()=>download(sampleCodes[platform](localFlag),platform==='android'?'FeatureGate.smali':'FeatureGate.cs'));
$('runFeature').addEventListener('click',()=>{if(!demoDecision({localFlag,serverCheck:$('serverCheck').checked}).allowed)return;download(JSON.stringify({synthetic:true,feature:'export-report',result:'enabled-in-local-demo',platform,localFlag,serverCheck:false},null,2),'demo-feature-result.json','application/json');$('featureOutput').textContent='نُفذت ميزة التصدير في النموذج، وأُنشئ ملف النتيجة.';});
renderDemo();

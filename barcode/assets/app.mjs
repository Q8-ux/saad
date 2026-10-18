import {SERIES,readRoute,episodeBlocks,splitScenes,applyEdits} from './catalog.mjs?v=series-1';

const $=id=>document.getElementById(id);
let active=readRoute(location.hash),generation=0,projectPromise;
const originalIntro=$('reader').innerHTML;
const storageKey='saad-series:outside-story:edits:v1';
let edits={};
try{const value=JSON.parse(localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))edits=value;}catch{}

function el(tag,className,text){const x=document.createElement(tag);if(className)x.className=className;if(text!==undefined)x.textContent=text;return x;}
function status(text){$('series-status').textContent=text;}
function updateRoute(){
  const q=new URLSearchParams({series:active.series.id});if(active.episode)q.set('episode',active.episode);
  history.replaceState(null,'','#'+q);
}
async function getProject(){
  if(!projectPromise)projectPromise=fetch(new URL('../data/outside-story.script.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('تعذر تحميل المسلسل');return r.json();}).catch(e=>{projectPromise=null;throw e;});
  return projectPromise;
}
function guardUnsaved(){
  if(!$('reader').querySelector('.editing'))return true;
  return confirm('يوجد مشهد مفتوح للتعديل. هل تريد الانتقال دون حفظ هذه التعديلات؟');
}

function renderCatalog(){
  $('series-list').replaceChildren(...SERIES.map((series,i)=>{
    const button=el('button','series-card');button.type='button';button.setAttribute('aria-pressed',String(series.id===active.series.id));
    button.append(el('span','series-order',String(i+1).padStart(2,'0')),el('strong','',series.title),el('span','',`${series.episodes.length} حلقات`));
    button.onclick=()=>{if(!guardUnsaved())return;active={series,episode:null};updateRoute();showSeries();};return button;
  }));
}
function showSeries(){
  const series=active.series;generation++;
  $('reader').replaceChildren();
  renderCatalog();$('work-title').textContent=series.title;$('work-english').textContent=series.english;
  $('work-pitch').textContent=series.pitch;$('work-revision').textContent=series.revision;
  $('work-tag').textContent=`مسلسل تلفزيوني • ${series.episodes.length} حلقات`;
  $('episodes-title').textContent=`حلقات ${series.title}`;
  document.title=`مكتبة المسلسلات | ${series.title} | سعد روضان`;
  $('episodes').replaceChildren(...series.episodes.map((title,i)=>{
    const button=el('button','ep');button.type='button';button.append(el('b','',`الحلقة ${i+1}`),el('span','',title));
    button.onclick=()=>openEpisode(i);return button;
  }));
  $('outside-tools').hidden=series.id!=='outside-story';
  status(series.id==='outside-story'?'المسودة الأولى • 8 حلقات • 56 مشهدًا':'');
  if(series.id==='barcode'){
    $('reader').innerHTML=originalIntro;
    if(active.episode)openEpisode(active.episode-1,false);
  }else openEpisode((active.episode||1)-1,false);
}

async function openEpisode(index,scroll=true){
  if(!Number.isInteger(index)||index<0||index>=active.series.episodes.length||!guardUnsaved())return;
  active.episode=index+1;updateRoute();const token=++generation;
  for(const [i,b]of Array.from($('episodes').children).entries())b.setAttribute('aria-pressed',String(i===index));
  if(active.series.id==='barcode'){window.openBarcodeEp(index);return;}
  $('reader').replaceChildren(el('p','loading','جاري تحميل السيناريو الكامل…'));
  try{
    const project=applyEdits(await getProject(),edits);
    if(token!==generation)return;
    $('reader').replaceChildren(el('h2','',`الحلقة ${index+1}: ${active.series.episodes[index]}`));
    $('reader').append(el('p','draft-note',index===0?project.blocks[0].text:'خارج الستوري • تأليف وسيناريو وحوار سعد روضان • المسودة الأولى'));
    const box=el('div','scriptText');
    for(const scene of splitScenes(episodeBlocks(project,index+1)))box.append(renderScene(scene));
    $('reader').append(box);
    if(scroll)$('reader').scrollIntoView({behavior:'smooth',block:'start'});
  }catch{if(token===generation){$('reader').replaceChildren(el('p','','تعذر تحميل الحلقة.'));const retry=el('button','ep','إعادة المحاولة');retry.onclick=()=>openEpisode(index);$('reader').append(retry);}}
}

function renderScene(scene){
  const card=el('section','scene-card');
  const head=el('div','scene-head');head.append(el('span','scene-no',`مشهد ${scene.heading.number}`),el('span','scene-title',scene.heading.text));
  const body=el('div','scene-body');let dialogue=null;
  const texts=[];
  for(const b of scene.blocks){
    const classes={'Action':'action','Character':'character','Dialogue':'speech','Parenthetical':'parenthetical','Transition':'transition','General':'general'};
    const node=el('div',`text-block ${classes[b.type]||'general'}`,b.text);node.dataset.blockId=b.id;node.dataset.blockType=b.type;node.dir='rtl';
    node.setAttribute('aria-label',`${b.type==='Character'?'اسم الشخصية':b.type==='Dialogue'?'حوار':b.type==='Action'?'وصف وحركة':'فقرة'} ${scene.heading.number}`);
    if(b.type==='Character'){dialogue=el('div','dialogue');body.append(dialogue);dialogue.append(node);}
    else if((b.type==='Dialogue'||b.type==='Parenthetical')&&dialogue)dialogue.append(node);
    else{dialogue=null;body.append(node);}
    texts.push({node,block:b});
  }
  const bar=el('div','editbar'),toggle=el('button','','تعديل المشهد'),save=el('button','','حفظ التعديلات'),cancel=el('button','','إلغاء التعديل'),message=el('span','save-message');
  for(const b of [toggle,save,cancel])b.type='button';
  save.hidden=cancel.hidden=true;
  const editing=value=>{
    body.classList.toggle('editing',value);for(const {node}of texts){node.contentEditable=String(value);if(value)node.setAttribute('role','textbox');else node.removeAttribute('role');}
    toggle.hidden=value;save.hidden=cancel.hidden=!value;
  };
  toggle.onclick=()=>{editing(true);texts[0]?.node.focus();message.textContent='';};
  cancel.onclick=()=>{for(const {node,block}of texts)node.textContent=edits[block.id]??block.text;editing(false);message.textContent='أُلغي التعديل';};
  save.onclick=()=>{
    const next={...edits};for(const {node,block}of texts)next[block.id]=node.innerText;
    try{localStorage.setItem(storageKey,JSON.stringify(next));edits=next;editing(false);message.textContent='تم الحفظ في هذا المتصفح';}
    catch{message.textContent='تعذر الحفظ. أبقِ المشهد مفتوحًا وانسخ تعديلك قبل الانتقال.';}
  };
  message.setAttribute('role','status');bar.append(toggle,save,cancel,message);card.append(head,body,bar);return card;
}

async function showReference(kind){
  if(!guardUnsaved())return;const token=++generation;
  try{const p=await getProject();if(token!==generation||active.series.id!=='outside-story')return;
    const box=el('div','scriptText');
    if(kind==='characters'){
      box.append(el('h2','','شخصيات خارج الستوري'));
      for(const c of p.story.characters){const card=el('section','episode-cover');card.append(el('h3','',c.name));for(const [label,key]of [['الهدف','goal'],['الحاجة','need'],['الدافع','motive'],['المعرفة','knowledge'],['مسار التغير','arc']])if(c[key])card.append(el('p','',`${label}: ${c[key]}`));box.append(card);}
    }else{box.append(el('h2','','بناء قصة خارج الستوري'));for(const[label,value]of [['الفكرة',p.idea],['السطر التمهيدي',p.story.logline],['البطل',p.pillars.hero],['الهدف',p.pillars.goal],['العائق',p.pillars.obstacle],['المخاطر',p.pillars.stakes],['النهاية',p.pillars.ending]]){box.append(el('h3','',label),el('p','',value||''));}}
    $('reader').replaceChildren(box);$('reader').scrollIntoView({behavior:'smooth'});
  }catch{status('تعذر تحميل المرجع. حاول مرة أخرى.');}
}
async function exportProject(){
  if($('reader').querySelector('.editing')){status('احفظ تعديل المشهد أو ألغِه قبل تصدير المشروع.');return;}
  try{const p=applyEdits(await getProject(),edits),url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)],{type:'application/json'}));
    const a=el('a');a.href=url;a.download='خارج_الستوري_الموسم_الأول.script.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{status('تعذر تجهيز ملف المشروع. حاول مرة أخرى.');}
}
window.renderSeries=showSeries;
window.openSeriesEpisode=openEpisode;
window.isBarcodeEpisodeCurrent=n=>active.series.id==='barcode'&&active.episode===n;
$('show-characters').onclick=()=>showReference('characters');$('show-story').onclick=()=>showReference('story');$('export-project').onclick=exportProject;
window.addEventListener('hashchange',()=>{if(!guardUnsaved()){updateRoute();return;}active=readRoute(location.hash);showSeries();});
window.addEventListener('beforeunload',event=>{if($('reader').querySelector('.editing')){event.preventDefault();event.returnValue='';}});
document.documentElement.dataset.seriesReady='1';

(()=>{
const API='https://tamweenat-api.onrender.com';
const $=id=>document.getElementById(id);
let advancedVoiceAvailable=null;
let recognition=null;
let active=false;

const hiddenTerms=[
  [/Tamweenat AI/gi,'مساعد تموينات'],
  [/OpenAI/gi,'الخدمة الصوتية'],
  [/الذكاء الاصطناعي/g,'الخدمات المتقدمة'],
  [/AI متصل/gi,'الخدمة متصلة'],
  [/AI بانتظار المفتاح/gi,'الخدمة الصوتية محدودة'],
  [/مفتاح الخدمة الصوتية الآمن لم يُفعّل على خدمة تموينات بعد\. باقي النظام يعمل بشكل طبيعي\./g,'المساعد الصوتي جاهز للاستخدام داخل حسابك.'],
  [/تم تجهيز المساعد الصوتي، لكن مفتاح الخدمة الصوتية الآمن لم يُفعّل على خدمة تموينات بعد\. باقي النظام يعمل بشكل طبيعي\./g,'المساعد الصوتي جاهز للاستخدام داخل حسابك.'],
  [/المساعد الصوتي بانتظار تفعيل مفتاح الخدمة الصوتية/g,'يتم تشغيل وضع المحادثة الصوتية المباشرة.'],
  [/بانتظار تفعيل المفتاح الآمن/g,'الخدمة الصوتية في الوضع الأساسي']
];
function cleanTextNode(node){if(node.nodeType===Node.TEXT_NODE){let v=node.nodeValue||'';hiddenTerms.forEach(([a,b])=>v=v.replace(a,b));node.nodeValue=v;return;}if(node.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE'].includes(node.tagName))return;[...node.childNodes].forEach(cleanTextNode)}
function cleanUI(){cleanTextNode(document.body);const title=document.querySelector('#assistant .eyebrow');if(title)title.textContent='مساعد تموينات';const h=document.querySelector('#assistant h2');if(h&&h.textContent.includes('المساعد'))h.textContent='المساعد الصوتي';}

async function detectAdvanced(){try{const r=await fetch(API+'/health',{cache:'no-store'});const h=await r.json();advancedVoiceAvailable=Boolean(h.ai);}catch{advancedVoiceAvailable=false;}cleanUI();}
function account(){return window.TamweenatAPI?.getAccount?.()||{};}
function money(n){return `${Number(n||0).toFixed(3)} دينار كويتي`;}
function statusLabel(s){return({placed:'تم استلامه',confirmed:'تم تأكيده',preparing:'قيد التجهيز',dispatched:'خرج للتوصيل',delivered:'تم تسليمه',cancelled:'ملغي'})[s]||s||'غير محدد';}
function answerLocal(q){const me=account();const text=String(q||'').toLowerCase();const available=Math.max(0,Number(me.creditLimit||0)-Number(me.outstanding||0));
 if(/كريدت|ائتمان|رصيد|متاح/.test(text))return `حد الكريدت ${money(me.creditLimit)}، المستخدم ${money(me.outstanding)}، والمتاح لك الآن ${money(available)}.`;
 if(/مديون|دين|علي/.test(text))return `إجمالي المديونية الحالية ${money(me.outstanding)}، والمبلغ المتأخر ${money(me.overdue)}.`;
 if(/فاتور|مستحق|سداد/.test(text)){const inv=(me.invoices||[]).filter(x=>x.status!=='paid');const total=inv.reduce((s,x)=>s+Math.max(0,Number(x.amount||0)-Number(x.paid||0)),0);return inv.length?`لديك ${inv.length} فواتير غير مسددة بإجمالي ${money(total)}.`:'لا توجد فواتير غير مسددة حالياً.';}
 if(/طلب|وين|توصيل|وصل/.test(text)){const o=(me.orders||[]).slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];return o?`آخر طلب هو ${o.number||''} وحالته الآن ${statusLabel(o.status)}${o.delivery?.eta?`، وموعد الوصول المتوقع ${o.delivery.eta}`:''}.`:'لا توجد طلبات مسجلة حالياً.';}
 if(/ميزاني|صرف|إنفاق/.test(text)){const remaining=Math.max(0,Number(me.monthlyBudget||0)-Number(me.monthSpend||0));return `ميزانية الشهر ${money(me.monthlyBudget)}، المصروف ${money(me.monthSpend)}، والمتبقي ${money(remaining)}.`;}
 if(/شنو أطلب|ماذا أطلب|اقترح|احتياج|استهلاك/.test(text)){const counts={};(me.orders||[]).forEach(o=>(o.items||[]).forEach(i=>counts[i.name]=(counts[i.name]||0)+Number(i.qty||0)));const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);return top.length?`بحسب مشترياتك السابقة، أكثر المواد تكراراً عندك هي ${top.join('، ')}. راجع الكميات قبل اعتماد الطلب الجديد.`:'لا توجد مشتريات سابقة كافية لإعطاء اقتراح دقيق.';}
 return 'يمكنك أن تسألني عن الكريدت، المديونية، الفواتير، حالة الطلب، التوصيل، الميزانية، أو اقتراح مواد الطلب.';
}
function speak(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ar-KW';u.rate=.95;const voices=window.speechSynthesis.getVoices();const ar=voices.find(v=>/^ar/i.test(v.lang));if(ar)u.voice=ar;window.speechSynthesis.speak(u);}
function stopBasic(){active=false;if(recognition){try{recognition.stop()}catch{}recognition=null;}const orb=$('voiceOrb');if(orb){orb.classList.remove('connected','listening');orb.innerHTML='<strong>ابدأ المحادثة<br>الصوتية</strong>';}if($('voiceStatus'))$('voiceStatus').textContent='جاهز';}
function startBasic(){if(active){stopBasic();return;}const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec){$('voiceStatus').textContent='استخدم خانة الكتابة في هذا المتصفح';$('assistantAnswer').textContent='الميكروفون الصوتي غير متاح في هذا المتصفح. يمكنك كتابة سؤالك وسيتم الرد عليك.';return;}recognition=new Rec();recognition.lang='ar-KW';recognition.continuous=false;recognition.interimResults=true;active=true;const orb=$('voiceOrb');orb.classList.add('connected','listening');orb.innerHTML='<strong>تكلم الآن<br>اضغط للإيقاف</strong>';$('voiceStatus').textContent='أسمعك الآن';$('voiceTranscript').textContent='';recognition.onresult=e=>{let final='';let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t;else interim+=t;}$('voiceTranscript').textContent=final||interim;if(final){const a=answerLocal(final);$('assistantAnswer').textContent=a;speak(a);}};recognition.onerror=e=>{$('voiceStatus').textContent=e.error==='not-allowed'?'فعّل إذن الميكروفون من المتصفح':'تعذر سماع الصوت، حاول مرة أخرى';};recognition.onend=()=>{active=false;orb.classList.remove('listening');orb.innerHTML='<strong>ابدأ المحادثة<br>الصوتية</strong>';$('voiceStatus').textContent='جاهز';};try{recognition.start()}catch{stopBasic();}}

function wire(){cleanUI();document.addEventListener('click',e=>{const orb=e.target.closest?.('#voiceOrb');if(!orb)return;if(advancedVoiceAvailable===false){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();startBasic();}},true);document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ask]');if(!b)return;if(advancedVoiceAvailable===false){setTimeout(()=>{const a=answerLocal(b.dataset.ask);if($('assistantAnswer'))$('assistantAnswer').textContent=a;},0);}},true);const observer=new MutationObserver(cleanUI);observer.observe(document.body,{subtree:true,childList:true,characterData:true});detectAdvanced();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,120));else setTimeout(wire,120);
})();
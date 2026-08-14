(()=>{
const replacements=[
  [/الذكاء الاصطناعي/g,'الخدمات المتقدمة'],
  [/حالة الذكاء/g,'حالة الخدمة'],
  [/AI متصل/gi,'الخدمة متصلة'],
  [/AI بانتظار المفتاح/gi,'الخدمة الصوتية محدودة'],
  [/OpenAI/gi,'الخدمة الصوتية'],
  [/بانتظار تفعيل مفتاح الخدمة الصوتية/g,'الخدمة الصوتية محدودة مؤقتاً'],
  [/عند توقف الخدمات المتقدمة/g,'عند توقف الخدمة الصوتية المتقدمة']
];
function clean(node){if(node.nodeType===Node.TEXT_NODE){let v=node.nodeValue||'';replacements.forEach(([a,b])=>v=v.replace(a,b));node.nodeValue=v;return;}if(node.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE'].includes(node.tagName))return;[...node.childNodes].forEach(clean)}
function apply(){clean(document.body);const nav=document.querySelector('#adminNav [data-page="ai"]');if(nav)nav.textContent='المساعد الصوتي';const ai=$('aiStatus');if(ai&&/AI/i.test(ai.textContent))ai.textContent='الخدمة';const title=document.querySelector('#ai .section-head h2');if(title)title.textContent='المساعد الصوتي والخدمات المتقدمة';}
function $(id){return document.getElementById(id)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
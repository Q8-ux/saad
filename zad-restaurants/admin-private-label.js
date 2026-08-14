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
function replaceValue(value){
  let next=String(value||'');
  for(const [from,to] of replacements) next=next.replace(from,to);
  return next;
}
function cleanTextNode(node){
  const before=node.nodeValue||'';
  const after=replaceValue(before);
  if(after!==before) node.nodeValue=after;
}
function clean(node){
  if(!node)return;
  if(node.nodeType===Node.TEXT_NODE){cleanTextNode(node);return;}
  if(node.nodeType!==Node.ELEMENT_NODE||['SCRIPT','STYLE','NOSCRIPT'].includes(node.tagName))return;
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  let text;
  while((text=walker.nextNode())) cleanTextNode(text);
}
function applyStaticLabels(){
  const nav=document.querySelector('#adminNav [data-page="ai"]');
  if(nav&&nav.textContent!=='المساعد الصوتي') nav.textContent='المساعد الصوتي';
  const ai=document.getElementById('aiStatus');
  if(ai&&/AI/i.test(ai.textContent||'')) ai.textContent=replaceValue(ai.textContent);
  const title=document.querySelector('#ai .section-head h2');
  if(title&&title.textContent!=='المساعد الصوتي والخدمات المتقدمة') title.textContent='المساعد الصوتي والخدمات المتقدمة';
}
function init(){
  clean(document.body);
  applyStaticLabels();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes) clean(node);
    }
    applyStaticLabels();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),12000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

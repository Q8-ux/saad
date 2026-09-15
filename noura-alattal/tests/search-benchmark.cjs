// Curated development scenarios, not competitor measurements or an independent user study.
const {createEngine,normalize}=require('../assets/knowledge-core.js');
const data=require('../assets/knowledge-content.js');
const engine=createEngine(data);
const scenarios=[
 ['كيف أبني شخصية مقنعة','guide:character'],['شلون أكتب لوجلاين لفيلمي','guide:logline'],
 ['ما تحت النص','guide:subtext'],['character arc','guide:arc'],['كيف أكتب مشهد صامت','guide:visual'],
 ['الحدث المحفز','guide:structure'],['تريتمنت','guide:synopsis'],['بايبل','guide:bible'],
 ['كيف أرتب الحبكة','guide:structure'],['فلاش باك','guide:time'],['point of view','guide:pov'],
 ['كيف أراجع المسودة','guide:rewrite'],['بناء مسلسل','guide:series'],['فيلم قصير','guide:short'],
 ['السبب والنتيجة','guide:causality'],['قوس الشخصية','guide:arc'],['بس يا بحر','work:sea'],
 ['LOGLINE','guide:logline'],['الْحِوَار','guide:dialogue'],['رَهَان','guide:stakes'],
 ['Slugline','term:term-11'],['ورقة تحليل عمل','template:watch'],['الملخص والمعالجة','guide:synopsis'],
 ['غرض البحث وتوثيق المصادر','guide:research']
];
function baseline(query){
 const words=normalize(query).split(' ').filter(Boolean);
 return engine.entries.map(e=>({...e,_title:normalize(e.title+' '+(e.original||e.en||'')),_search:normalize([e.title,e.original,e.en,e.summary,e.text,e.body,e.example,e.group,e.region,e.place,e.focus,e.fact,e.analysis,...(e.tags||[]),...(e.steps||[])].filter(Boolean).join(' '))}))
 .filter(e=>words.every(w=>e._search.includes(w))).map(e=>({entry:e,score:words.reduce((n,w)=>n+(e._title.includes(w)?20:1),0)})).sort((a,b)=>b.score-a.score).map(x=>x.entry);
}
const rows=scenarios.map(([query,expected])=>{
 const previous=baseline(query).slice(0,3).map(e=>e.key),current=engine.search(query).slice(0,3).map(e=>e.key);
 return {query,expected,previousTop3:previous.includes(expected),currentTop3:current.includes(expected),current};
});
const summary={scope:'Curated development scenarios on the same local corpus. Not competitor results; not a blind benchmark.',scenarios:rows.length,previousTop3:rows.filter(r=>r.previousTop3).length,currentTop3:rows.filter(r=>r.currentTop3).length,rows};
console.log(JSON.stringify(summary,null,2));

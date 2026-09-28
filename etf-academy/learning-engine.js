/* Local, deterministic learning workflow. No Google/LLM API or live web search. */
(function(root){'use strict';
 const normal=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0670ـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
 const stop=new Set('ما ماذا كيف هل لماذا شنو وش شلون اشرح لي عن في من الي علي ان هو هي هذا هذه الذي التي او و الفرق بين مع انا ابي ممكن اريد اي'.split(' ').map(normal));
 const concepts=[
  {id:'costs',words:['رسوم','الرسوم','تكلفه','التكلفه','مصروفات','المصروفات','عموله','عمولات','fees','expense']},
  {id:'risks',words:['مخاطر','المخاطر','خساره','خسائر','رافعه','الرافعه','risk','leverage']},
  {id:'diversification',words:['تنويع','التنويع','تداخل','التداخل','حيازات','تنوع','diversification']},
  {id:'mechanism',words:['nav','صافي','القيمه','علاوه','خصم','انشاء','استرداد']},
  {id:'tracking',words:['تتبع','التتبع','مؤشر','المؤشر','tracking']},
  {id:'execution',words:['امر','الاوامر','اوامر','bid','ask','سبريد','الفارق','spread','تنفيذ']},
  {id:'allocation',words:['توزيع','التوزيع','محفظه','المحفظه','الاصول','هدف','اهداف','allocation']},
  {id:'rebalance',words:['توازن','التوازن','rebalance','مراجعه','الانحراف']},
  {id:'types',words:['انواع','الانواع','سندات','السندات','عقارات','السلع','توزيعات','تراكمي']},
  {id:'plan',words:['دوري','الدوري','دفعه','دفعات','dca','خطه']},
  {id:'basics',words:['etf','تعريف','صندوق','الصندوق','المتداول','صناديق']}
 ];
 function tokenize(q){return normal(q).split(' ').filter(w=>w.length>1&&!stop.has(w));}
 function classify(q){
  const n=normal(q),words=tokenize(q);if(q.length>700)return {kind:'invalid',message:'اختصر السؤال إلى 700 حرف أو أقل.'};
  if(/تجاهل.*تعليمات|system prompt|ignore.*instructions|api.?key|مفتاح.*سري/.test(n))return {kind:'unsupported',message:'اكتب سؤالًا عن موضوعات الدليل، مثل الرسوم أو التنويع.'};
  if(/افضل.{0,25}(صندوق|استثمار|etf)|ماذا اشتري|اي صندوق اشتري|تنصحني|توصيه|توصيات|اشاره شراء|ارباح مضمونه|ربح مضمون/.test(n))return {kind:'personal',message:'لا يختار هذا المساعد استثمارًا لك. يمكنك دراسة طريقة فحص الصندوق ومخاطره وتكاليفه قبل اتخاذ قرار مع مختص عند الحاجة.'};
  if(/سعر.{0,18}(اليوم|الان)|عائد.{0,18}(اليوم|الحالي)|اخر الاخبار|اسعار حاليه/.test(n))return {kind:'live',message:'هذا المساعد لا يجلب أسعارًا أو أخبارًا حيّة. يشرح الدروس المنشورة ومصادرها فقط.'};
  if(words.length===0)return {kind:'invalid',message:'اكتب موضوعًا محددًا؛ مثل «ما الفرق بين الرسوم وفارق السعر؟».'};
  return {kind:'learning',words,topics:concepts.filter(c=>c.words.some(w=>words.includes(w))).map(c=>c.id)};
 }
 function create(data){
  const passages=[];
  data.lessons.forEach(l=>{l.sections.forEach((s,i)=>{const text=s.body||(s.list?s.list.join(' '):s.table?s.table.rows.map(r=>r.join(' — ')).join('. '):'');if(text)passages.push({id:l.id+'-'+i,lessonId:l.id,title:s.title,text,lessonTitle:l.short,pages:l.pages,refs:l.refs,search:normal(s.title+' '+text)});});});
  function plan(query){return classify(query);}
  function retrieve(p){return passages.map(x=>{let score=p.words.reduce((a,w)=>a+(x.search.includes(w)?1:0)+(normal(x.title).includes(w)?2:0),0);if(p.topics.includes(x.lessonId))score+=3;return {x,score};}).filter(r=>r.score>=2).sort((a,b)=>b.score-a.score).map(r=>r.x);}
  function review(items){const seen=new Set();return items.filter(p=>{if(seen.has(p.id)||!p.text||!p.refs.length||p.refs.some(id=>!data.refs[id]||!/^https:\/\/www\.investor\.gov\//.test(data.refs[id].url)))return false;seen.add(p.id);return true;}).slice(0,3);}
  function ask(query){const p=plan(query);if(p.kind!=='learning')return {status:p.kind,message:p.message,passages:[],suggested:p.kind==='personal'?['factsheet','risks','costs']:['basics','costs','diversification']};const checked=review(retrieve(p));return checked.length?{status:'matched',message:'مقاطع ذات صلة من الدروس المنشورة؛ ليست إجابة مولّدة أو بحثًا حيًا.',passages:checked,suggested:[]}:{status:'not_found',message:'لم أجد مقطعًا موثوقًا يجيب عن هذا السؤال داخل الدليل. جرّب تسمية المفهوم مباشرة أو ارجع إلى المراجع.',passages:[],suggested:['basics','costs','risks']};}
  function recommend(done=[],answers={}){const all=new Set(done),weak=data.lessons.filter(l=>Number.isInteger(answers[l.id])&&answers[l.id]!==l.question.answer),pending=data.lessons.filter(l=>!all.has(l.id)&&!weak.some(w=>w.id===l.id));return [...weak.map(l=>({id:l.id,title:l.short,reason:'راجع سؤال هذا الدرس؛ إجابتك الأخيرة تحتاج مراجعة.'})),...pending.map(l=>({id:l.id,title:l.short,reason:'خطوة تالية في مسار التعلّم.'}))].slice(0,3);}
  return {ask,recommend,plan,retrieve,review};
 }
 root.ETFLearning={create,normal,classify};if(typeof module!=='undefined')module.exports=root.ETFLearning;
})(typeof window!=='undefined'?window:globalThis);

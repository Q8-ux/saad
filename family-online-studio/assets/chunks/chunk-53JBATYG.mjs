import{d as y,e as I}from"./chunk-JGUFELKC.mjs";import{a as f}from"./chunk-QPCCHE25.mjs";var j=["work","character","act","scene","notes"],z={work:"العمل",character:"الشخصيات",act:"الفصول والحلقات",scene:"المشاهد",notes:"ملاحظات الكاتب"},$=f.object({pageId:f.string().max(220),title:f.string().max(600),kind:f.enum(j),path:f.string().max(500),fingerprint:f.string().max(80),excerpt:f.string().max(2e3),sceneId:f.string().max(100).optional(),characterId:f.string().max(100).optional(),blockId:f.string().max(100).optional()});function u(t){return t.normalize("NFKC").replace(/[\u064b-\u065f\u0670\u0640]/gu,"").replace(/[أإآٱ]/gu,"ا").replace(/ى/gu,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim().toLowerCase()}function x(t){let r=2166136261,s=2246822507;for(let c=0;c<t.length;c++)r=Math.imul(r^t.charCodeAt(c),16777619),s=Math.imul(s^t.charCodeAt(c),3266489909);return(r>>>0).toString(16).padStart(8,"0")+(s>>>0).toString(16).padStart(8,"0")+"-"+t.length.toString(36)}var S=new WeakMap,k=t=>encodeURIComponent(t).replaceAll("%","_"),C=t=>t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),O=new Set(["من","ما","ماذا","متى","كيف","هل","في","على","الى","عن","مع","هو","هي","هذا","هذه","الذي","التي","ان","او","و","لي","اكتب","اريد","راجع","مشهد","المشهد","شخصية","الشخصية"]);function v(t){return[...new Set(u(t).split(" ").filter(r=>r.length>1&&!O.has(r)))].slice(0,30)}function w(t,r){let s=u(t);return r.reduce((c,m)=>{let i=s.split(m).length-1;return c+Math.min(i,4)},0)}function W(t,r){return r.blocks.map(s=>(s.type==="dialogue"?(t.characters.find(c=>c.id===s.characterId)?.name||s.label||"")+": ":"")+s.text).join(`

`)}function K(t){let r=x(JSON.stringify(t)),s=S.get(t);if(s?.fingerprint===r)return s;let c=[],m=[],i=e=>{let n={...e,links:[],fingerprint:""};return c.push(n),n};i({id:"work:overview",kind:"work",title:t.title,path:"wiki/overview.md",content:[t.title,t.englishTitle,t.subtitle,"الجمهور: "+t.audience,"هدف الزمن: "+t.targetMinutes+" دقيقة",t.durationNote,`فكرة العمل:
`+t.synopsis].filter(Boolean).join(`

`)});for(let e of t.characters)i({id:"character:"+e.id,kind:"character",characterId:e.id,title:e.name,path:"wiki/characters/"+k(e.id)+".md",content:["الاسم: "+e.name,"الدور: "+e.role,"العمر: "+e.age,e.bio].join(`

`)});t.units.forEach((e,n)=>i({id:"act:"+e.id,kind:"act",title:(t.kind==="series"?"الحلقة "+(n+1):I(n))+": "+e.title,path:"wiki/acts/"+k(e.id)+".md",content:e.summary})),t.scenes.forEach((e,n)=>{i({id:"scene:"+e.id,kind:"scene",sceneId:e.id,title:y(n)+": "+e.title,path:"wiki/scenes/"+k(e.id)+".md",content:["المكان: "+e.location,"الزمان: "+e.time,`ملخص المشهد:
`+e.summary,`النص:
`+W(t,e)].join(`

`)});let p=t.comments.filter(g=>g.sceneId===e.id).map(g=>(g.resolved?"ملاحظة مراجعة منجزة: ":"ملاحظة قيد المراجعة: ")+g.text);(e.notes.trim()||p.length)&&i({id:"notes:"+e.id,kind:"notes",sceneId:e.id,title:"ملاحظات "+y(n),path:"wiki/notes/"+k(e.id)+".md",content:[e.notes,...p].filter(Boolean).join(`

`)}),e.summary.trim()||m.push({id:"summary:"+e.id,pageId:"scene:"+e.id,message:"ملخص «"+e.title+"» فارغ؛ لا يكفي وحده لاسترجاع تحوّل المشهد."}),t.units.length&&!e.unitId&&m.push({id:"unit:"+e.id,pageId:"scene:"+e.id,message:"المشهد «"+e.title+"» غير مرتبط بفصل أو حلقة."})}),t.notes.trim()&&i({id:"notes:work",kind:"notes",title:"مرجع الكاتب",path:"wiki/notes/work.md",content:t.notes});let l=new Map(c.map(e=>[e.id,e]));function o(e,n){let p=l.get(e),g=l.get(n);!p||!g||e===n||(p.links.includes(n)||p.links.push(n),g.links.includes(e)||g.links.push(e))}let a=t.characters.map(e=>({id:e.id,name:u(e.name)})).filter(e=>e.name).sort((e,n)=>n.name.length-e.name.length);function d(e){let n=u(e),p=[];for(let g of a){let M=new RegExp("(^|[^\\p{L}\\p{N}])("+C(g.name).replaceAll(" ","\\s+")+")(?=$|[^\\p{L}\\p{N}])","gu");M.test(n)&&(p.push(g.id),n=n.replace(M,(P,b,N)=>b+" ".repeat(N.length)))}return p}for(let e of t.characters){o("work:overview","character:"+e.id);for(let n of d(e.bio))o("character:"+e.id,"character:"+n);e.bio.trim()||m.push({id:"bio:"+e.id,pageId:"character:"+e.id,message:"بطاقة «"+e.name+"» تحتاج وصفًا يثبت ملامحها."})}for(let e of t.units)o("work:overview","act:"+e.id);for(let e of t.scenes){o("scene:"+e.id,e.unitId?"act:"+e.unitId:"work:overview"),o("scene:"+e.id,"notes:"+e.id);let n=new Set([...e.blocks.map(p=>p.characterId).filter(p=>!!p),...d(e.summary+`
`+e.blocks.map(p=>p.text).join(`
`))]);for(let p of n)o("scene:"+e.id,"character:"+p)}o("work:overview","notes:work");for(let e of t.characters)t.characters.some(n=>n.id!==e.id&&u(n.name)===u(e.name))&&m.push({id:"name:"+e.id,pageId:"character:"+e.id,message:"اسم «"+e.name+"» مستخدم لبطاقتين؛ راجع الفصل بينهما."});for(let e of c)e.fingerprint=x(JSON.stringify([e.content,e.title,e.links.slice().sort()]));let h={fingerprint:r,pages:c,issues:m,links:c.reduce((e,n)=>e+n.links.length,0)/2};return S.set(t,h),h}function A(t,r,s){let c=v(r),m=u(r),i=new Map(t.pages.map(a=>[a.id,(m&&u(a.title).includes(m)?12:0)+w(a.title,c)*6+w(a.content,c)])),l=t.pages.filter(a=>(i.get(a.id)||0)>0).sort((a,d)=>i.get(d.id)-i.get(a.id)).slice(0,6),o=new Map(i);for(let a of l)for(let d of a.links)o.set(d,(o.get(d)||0)+Math.min(3,i.get(a.id)*.12));return t.pages.filter(a=>(!s||a.kind===s)&&(!m||(o.get(a.id)||0)>0)).sort((a,d)=>(o.get(d.id)||0)-(o.get(a.id)||0))}function L(t,r,s="",c=null){let m=r.content,i;if(r.kind==="scene"){let l=t.scenes.find(e=>e.id===r.sceneId),o=v(s),a=l.blocks.find(e=>e.id===c),d=l.blocks.map((e,n)=>({b:e,i:n,score:w(e.text,o)})).sort((e,n)=>n.score-e.score),h=[...new Map([...a?[{b:a,i:l.blocks.indexOf(a),score:100}]:[],...d.slice(0,3)].map(e=>[e.b.id,e])).values()].slice(0,3);i=h[0]?.b.id,m=["المكان: "+l.location,"الزمان: "+l.time,"ملخص: "+l.summary,...h.sort((e,n)=>e.i-n.i).map(e=>e.b.text)].join(`

`)}return{pageId:r.id,title:r.title,kind:r.kind,path:r.path,fingerprint:r.fingerprint,excerpt:m.slice(0,1800),sceneId:r.sceneId,characterId:r.characterId,blockId:i}}function _(t,r=new Date().toISOString()){let s=K(t),c=new Map(s.pages.map(i=>[i.id,i])),m={"raw/sources/manuscript.script.json":JSON.stringify(t,null,2),"purpose.md":"# "+t.title+`

مرجع كتابة من المخطوط الحالي: الشخصيات، تتابع المشاهد، ملاحظات الكاتب، وروابط العودة إلى المصدر.

الجمهور: `+t.audience+`
`,"schema.md":`# قواعد الذاكرة

المخطوط مصدر، والصفحات مشتقة منه. الروابط تدل على ارتباط نصي ولا تثبت حضورًا أو قرابة أو سببية. ملاحظات المراجعة ليست وقائع في القصة. لا تُعتمد مقترحات المساعد إلا بإدراج الكاتب. لا تُدمج أعمال أخرى.
`,"wiki/index.md":`# فهرس المعرفة

`+s.pages.map(i=>"- [["+i.path.replace(/^wiki\//,"").replace(/\.md$/,"")+"|"+i.title+"]]").join(`
`),"log.md":`# سجل النسخة

`+r+" | snapshot | "+s.fingerprint+` | اشتُقت الصفحات من لقطة المصدر المرفقة؛ سجل تعديلات النص محفوظ في نسخ الاستوديو.
`,"manifest.json":JSON.stringify({format:"Work linked memory",schemaVersion:1,title:t.title,createdAt:r,fingerprint:s.fingerprint,pages:s.pages.length,relationships:s.links,source:"raw/sources/manuscript.script.json"},null,2)};for(let i of s.pages){let l={sceneId:i.sceneId,characterId:i.characterId};m[i.path]=`---
title: `+JSON.stringify(i.title)+`
type: `+i.kind+`
sources: ["raw/sources/manuscript.script.json"]
source_refs: `+JSON.stringify(l)+`
version_tag: `+JSON.stringify(i.fingerprint)+`
---

# `+i.title+`

`+i.content+`

## مرتبط

`+i.links.map(o=>c.get(o)).filter(o=>!!o).map(o=>"- [["+o.path.replace(/^wiki\//,"").replace(/\.md$/,"")+"|"+o.title+"]]").join(`
`)+`
`}return m}export{j as a,z as b,$ as c,K as d,A as e,L as f,_ as g};

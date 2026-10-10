/* Local activity planning. All quotas are teacher-selected, not ministry rules. */
(function(root){
 'use strict';
 const stages=[{id:'early',name:'ابتدائي — صفوف أولية',grades:['الأول','الثاني','الثالث']},{id:'upper',name:'ابتدائي — صفوف عليا',grades:['الرابع','الخامس']},{id:'middle',name:'متوسط',grades:['السادس','السابع','الثامن','التاسع']},{id:'secondary',name:'ثانوي',grades:['العاشر','الحادي عشر','الثاني عشر']}];
 const days=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس'];
 const domains=['القيم والهوية','المهارات والمواهب','الشراكة المجتمعية','التعلم والمناهج'];
 const states={planned:'مخطط',active:'قيد التنفيذ',done:'منفذ'};
 const stageIds=stages.map(s=>s.id),str=(v,n=300)=>typeof v==='string'&&v.length<=n,int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const uid=()=>root.crypto?.randomUUID?.()||'act-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const normalize=s=>String(s||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();
 const teacherKey=t=>normalize(t.name)+'|'+normalize(t.subject);
 function empty(){return {version:1,profiles:Object.fromEntries(stageIds.map(id=>[id,{school:'',number:'',students:0,periods:6,minutes:45,percent:10}])),teachers:[],slots:[]}}
 function valid(a){
  if(a===undefined)return true;
  if(!a||a.version!==1||!a.profiles||typeof a.profiles!=='object'||!Array.isArray(a.teachers)||!Array.isArray(a.slots)||a.teachers.length>1000||a.slots.length>240)return false;
  if(!stageIds.every(id=>{const p=a.profiles[id];return p&&str(p.school)&&str(p.number,80)&&int(p.students,0,20000)&&int(p.periods,1,12)&&int(p.minutes,5,120)&&int(p.percent,0,100)}))return false;
  if(!a.teachers.every(t=>t&&str(t.id,100)&&t.id&&str(t.name,120)&&t.name.trim()&&str(t.subject,120)&&Array.isArray(t.stages)&&t.stages.length>0&&t.stages.length<=4&&new Set(t.stages).size===t.stages.length&&t.stages.every(s=>stageIds.includes(s))&&int(t.load,0,60)))return false;
  if(new Set(a.teachers.map(t=>t.id)).size!==a.teachers.length||new Set(a.teachers.map(teacherKey)).size!==a.teachers.length)return false;
  const teachers=new Set(a.teachers.map(t=>t.id));
  if(!a.slots.every(s=>s&&str(s.id,100)&&s.id&&stageIds.includes(s.stage)&&int(s.day,0,4)&&int(s.period,1,a.profiles[s.stage].periods)&&str(s.teacherId,100)&&(!s.teacherId||teachers.has(s.teacherId))&&str(s.grade,80)&&(!s.grade||stages.find(t=>t.id===s.stage).grades.includes(s.grade))&&str(s.group,80)&&str(s.title,180)&&str(s.goal,1500)&&domains.includes(s.domain)&&Object.hasOwn(states,s.state)&&typeof s.receipt==='boolean'&&str(s.due,10)&&(!s.due||isDate(s.due))&&int(s.minutes,5,120)))return false;
  return new Set(a.slots.map(s=>s.id)).size===a.slots.length&&new Set(a.slots.map(cellKey)).size===a.slots.length;
 }
 function isDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s}
 function cellKey(s){return s.stage+'-'+s.day+'-'+s.period}
 function metrics(a,stage){const p=a.profiles[stage],slots=a.slots.filter(s=>s.stage===stage),capacity=p.periods*5,allocated=slots.length,minutes=slots.reduce((n,s)=>n+s.minutes,0);return {capacity,allocated,remaining:Math.max(0,capacity-allocated),minutes,hours:Math.floor(minutes/60),minuteRemainder:minutes%60,targetSessions:Math.ceil(capacity*p.percent/100),targetStudents:Math.ceil(p.students*p.percent/100),done:slots.filter(s=>s.state==='done').length,confirmed:slots.filter(s=>s.receipt).length,missingTeachers:slots.filter(s=>!s.teacherId).length}}
 function countTeacher(a,id){return a.slots.filter(s=>s.teacherId===id).length}
 function conflicts(a,candidate){return candidate.teacherId?a.slots.filter(s=>s.id!==candidate.id&&s.teacherId===candidate.teacherId&&s.day===candidate.day&&s.period===candidate.period):[]}
 function alerts(a,stage){
  const result=[],slots=a.slots.filter(s=>s.stage===stage),m=metrics(a,stage);
  for(const s of slots){const label=days[s.day]+' / الحصة '+s.period;if(!s.teacherId)result.push({type:'missing',text:label+': لم يُحدد المعلم.'});if(!s.grade||!s.group)result.push({type:'class',text:label+': أكمل الصف والشعبة.'});const t=a.teachers.find(t=>t.id===s.teacherId);if(t&&!t.stages.includes(stage))result.push({type:'stage',text:label+': المعلم غير مرتبط بهذه المرحلة.'});if(conflicts(a,s).length)result.push({type:'conflict',text:label+': تعارض للمعلم '+t?.name+' مع مرحلة أخرى.'})}
  for(const t of a.teachers.filter(t=>t.stages.includes(stage))){const n=countTeacher(a,t.id);if(n<t.load)result.push({type:'under',text:t.name+': المتبقي من نصابه المختار '+(t.load-n)+' حصة (عبر جميع المراحل).'});if(n>t.load)result.push({type:'over',text:t.name+': تجاوز النصاب المختار بـ '+(n-t.load)+' حصة.'})}
  if(m.allocated<m.targetSessions)result.push({type:'target',text:'لم يكتمل هدف النسبة المختارة: '+m.allocated+' من '+m.targetSessions+' حصص.'});
  return result;
 }
 function parseCSV(text){
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++}else quote=!quote}else if(!quote&&(c===','||c==='\t'||c===';')){row.push(cell);cell=''}else if(!quote&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}else cell+=c}
  if(quote)throw Error('علامات الاقتباس في ملف CSV غير مكتملة.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
 }
 function previewImport(text,a,stage,defaultLoad=6){
  if(!stageIds.includes(stage)||!int(defaultLoad,0,60))throw Error('تحقق من المرحلة والنصاب.');
  if(String(text).length>250000)throw Error('النص أكبر من الحد المسموح.');
  const parsed=parseCSV(String(text).replace(/^\uFEFF/,''));if(parsed.length>1001)throw Error('الحد الأقصى ١٠٠٠ صف في الاستيراد.');
  const result={rows:[],errors:[],duplicates:0,linked:0};const seen=new Set();
  parsed.forEach((raw,i)=>{let row=raw.map(s=>s.trim());if(i===0&&['الاسم','اسم المعلم','name','teacher'].includes(normalize(row[0])))return;
   if(row.length===1)row=row[0].split(/\s+(?:-|—|–)\s+/).map(s=>s.trim());
   if(row.length>3||!row[0]||row[0].length>120||(row[1]||'').length>120){result.errors.push('السطر '+(i+1)+': استخدم الاسم، المادة، والنصاب الاختياري.');return}
   const load=row[2]?Number(row[2].replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c))):defaultLoad;
   if(!int(load,0,60)){result.errors.push('السطر '+(i+1)+': النصاب عدد صحيح بين ٠ و٦٠.');return}
   const item={id:uid(),name:row[0],subject:row[1]||'',stages:[stage],load},k=teacherKey(item),old=a.teachers.find(t=>teacherKey(t)===k);
   if(seen.has(k)||old?.stages.includes(stage)){result.duplicates++;return}seen.add(k);
   if(old){item.id=old.id;item.stages=[...old.stages,stage];item.load=old.load;result.linked++}result.rows.push(item);
  });
  if(a.teachers.length+result.rows.filter(t=>!a.teachers.some(old=>old.id===t.id)).length>1000)result.errors.push('يتجاوز الاستيراد حد ١٠٠٠ معلم.');
  return result;
 }
 function applyImport(a,preview){if(preview.errors.length)throw Error('صحح أخطاء الاستيراد قبل الاعتماد.');const next=JSON.parse(JSON.stringify(a));for(const t of preview.rows){const i=next.teachers.findIndex(old=>old.id===t.id);if(i<0)next.teachers.push(t);else next.teachers[i]=t}if(!valid(next))throw Error('بيانات الاستيراد غير صالحة.');return next}
 function autoFill(a,stage){
  const p=a.profiles[stage],next=JSON.parse(JSON.stringify(a)),created=[],eligible=next.teachers.filter(t=>t.stages.includes(stage));
  for(let day=0;day<5;day++)for(let period=1;period<=p.periods;period++){
   if(next.slots.some(s=>s.stage===stage&&s.day===day&&s.period===period))continue;
   const candidate={stage,day,period};const t=eligible.filter(t=>countTeacher(next,t.id)<t.load&&!conflicts(next,{...candidate,teacherId:t.id}).length).sort((x,y)=>countTeacher(next,x.id)-countTeacher(next,y.id)||x.name.localeCompare(y.name,'ar'))[0];
   if(!t)continue;
   const s={...candidate,id:uid(),teacherId:t.id,grade:stages.find(s=>s.id===stage).grades[0],group:'أ',title:'نشاط '+(t.subject||'تعليمي'),goal:'',domain:'التعلم والمناهج',state:'planned',receipt:false,due:'',minutes:p.minutes};created.push(s);next.slots.push(s);
  }
  return {next,created,remaining:metrics(next,stage).remaining};
 }
 function tone(s,today){return s.state==='done'||s.receipt?'green':s.due&&s.due<today?'red':s.state==='active'?'amber':'red'}
 function assignment(a,teacherId){const t=a.teachers.find(t=>t.id===teacherId);if(!t)return null;const slots=a.slots.filter(s=>s.teacherId===teacherId).sort((x,y)=>stageIds.indexOf(x.stage)-stageIds.indexOf(y.stage)||x.day-y.day||x.period-y.period),minutes=slots.reduce((n,s)=>n+s.minutes,0);return {teacher:t,slots,minutes,hours:Math.floor(minutes/60),minuteRemainder:minutes%60}}
 function sharePayload(a,stage,domain){const slots=a.slots.filter(s=>s.stage===stage&&s.domain===domain).slice(0,8);return {v:1,domain,cards:slots.map(s=>({title:s.title.slice(0,100),goal:s.goal.slice(0,200),day:s.day,period:s.period,state:s.state}))}}
 function validShare(s){return s&&s.v===1&&domains.includes(s.domain)&&Array.isArray(s.cards)&&s.cards.length>0&&s.cards.length<=8&&s.cards.every(c=>c&&str(c.title,100)&&str(c.goal,200)&&int(c.day,0,4)&&int(c.period,1,12)&&Object.hasOwn(states,c.state))}
 const api={stages,days,domains,states,empty,valid,isDate,uid,normalize,teacherKey,cellKey,metrics,countTeacher,conflicts,alerts,previewImport,applyImport,autoFill,tone,assignment,sharePayload,validShare};
 root.ManhajActivityCore=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:globalThis);

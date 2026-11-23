(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KhawarizmiatEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STORAGE_KEY='khawarizmiat:pilot:v1';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function defaultState(){return{version:1,visits:1,completed:false,position:0,maxPosition:0,choice:null,firstChoice:null,previousChoice:null,corrected:false,reveal:0,puzzleSolved:false,puzzleRevealed:false,likes:[],saves:[],watched:{}};}
  function sanitizeState(raw){
    const d=defaultState();if(!raw||typeof raw!=='object'||Array.isArray(raw))return d;
    d.visits=Number.isFinite(raw.visits)?clamp(Math.floor(raw.visits),1,1000):1;
    for(const k of ['completed','corrected','puzzleSolved','puzzleRevealed'])d[k]=raw[k]===true;
    for(const k of ['position','maxPosition'])d[k]=Number.isFinite(raw[k])?clamp(raw[k],0,300):0;
    d.maxPosition=Math.max(d.position,d.maxPosition);
    for(const k of ['choice','firstChoice','previousChoice'])d[k]=['publish','context'].includes(raw[k])?raw[k]:null;
    if(!Object.prototype.hasOwnProperty.call(raw,'firstChoice'))d.firstChoice=d.choice;
    d.reveal=Number.isFinite(raw.reveal)?clamp(raw.reveal,0,100):0;
    for(const k of ['likes','saves'])d[k]=Array.isArray(raw[k])?[...new Set(raw[k].filter(s=>/^s(?:[1-9]|10)$/.test(s)))]:[];
    if(raw.watched&&typeof raw.watched==='object'&&!Array.isArray(raw.watched))for(const [key,value] of Object.entries(raw.watched))if(/^s(?:[1-9]|10)$/.test(key)&&Number.isFinite(value))d.watched[key]=clamp(value,0,3000);
    return d;
  }
  function loadState(storage){try{return sanitizeState(JSON.parse(storage.getItem(STORAGE_KEY)));}catch{return defaultState();}}
  function saveState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(sanitizeState(state)));return true;}catch{return false;}}
  function sceneAt(scenes,time){return scenes.find(s=>time>=s.start&&time<s.end)||scenes[scenes.length-1];}
  function lineAt(lines,time){return lines.find(l=>time>=l.start&&time<l.end)||null;}
  function formatTime(seconds){const n=Math.floor(clamp(Number(seconds)||0,0,300));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function setChoice(state,value){if(!['publish','context'].includes(value))return state;if(!state.firstChoice)state.firstChoice=value;state.choice=value;return state;}
  function feedOrder(choice){return choice==='publish'?['accusation','context']:['context','accusation'];}
  function checkPuzzle(order){return Array.isArray(order)&&order.length===3&&order.join(',')==='record,edit,publish';}
  function toggleItem(items,id){return items.includes(id)?items.filter(x=>x!==id):[...items,id];}
  const clips=[
    {id:'s3',start:52,title:'من يختار البداية؟',description:'سالم يقول إنه لم يغيّر كلامها. راقب ما يتجنب قوله.',type:'سالم',tags:['editor','context'],stamp:'00:52'},
    {id:'s5',start:109,title:'خمسة عشر دقيقة',description:'وقت النشر يقول شيئًا. ووقت التصوير يقول شيئًا ثانيًا.',type:'التوقيت',tags:['time','context'],stamp:'01:49'},
    {id:'s7',start:171,title:'نفس الجملة، معنى ثاني',description:'ارجع للصوت المتصل، وراقب حافة الباب.',type:'الأصل',tags:['reem','context','knocks'],stamp:'02:51'},
    {id:'s10',start:274,title:'ثلاث دقات',description:'إشارة أمان تتحول إلى سؤال عند باب دانا.',type:'الباب',tags:['knocks','reem'],stamp:'04:34'}
  ];
  function rankClips(state){
    const signals={context:0,editor:0,time:0,reem:0,knocks:0};
    for(const c of clips){const watched=state.watched[c.id]||0;const weight=Math.min(watched/8,3)+(state.likes.includes(c.id)?3:0)+(state.saves.includes(c.id)?5:0);for(const t of c.tags)signals[t]+=weight;}
    if(state.choice==='context')signals.context+=5;if(state.choice==='publish')signals.editor+=5;if(state.visits>1)signals.knocks+=8;
    return clips.map((c,i)=>{let score=0;for(const t of c.tags)score+=signals[t]||0;score+=!state.watched[c.id]?2:0;let reason=state.saves.includes(c.id)?'لأنك حفظت هذا المشهد':state.likes.includes(c.id)?'لأنك أعجبت بهذا المشهد':state.visits>1&&c.tags.includes('knocks')?'في الزيارة الثانية، راقب إشارة الدقات':state.choice==='publish'&&c.tags.includes('editor')?'لأنك اخترت نشر الاتهام؛ راجع من صنعه':state.choice==='context'&&c.tags.includes('context')?'لأنك طلبت السياق قبل الحكم':(state.watched[c.id]||0)>4?'لأنك توقفت عند هذا الدليل':'اقتراح من أحداث الحلقة';return{...c,score,reason,originalIndex:i};}).sort((a,b)=>b.score-a.score||a.originalIndex-b.originalIndex);
  }
  return{STORAGE_KEY,defaultState,sanitizeState,loadState,saveState,sceneAt,lineAt,formatTime,setChoice,feedOrder,checkPuzzle,toggleItem,rankClips,clamp};
});

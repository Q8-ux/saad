/* Waqaya WhatsApp routing */
(() => {
  const SETTINGS_KEY="waqaya.whatsapp.settings";
  const QUEUE_KEY="waqaya.whatsapp.queue";
  const defaultSettings={
    countryCode:"965",
    fallbackTeam:"الفريق 1",
    areaRules:{"كبد":"الفريق 1","الوفرة":"الفريق 3","العبدلي":"الفريق 2","الجهراء":"الفريق 4"},
    animalRules:{},
    teamPhones:{
      "الفريق 1":"",
      "الفريق 2":"",
      "الفريق 3":"",
      "الفريق 4":""
    },
    templates:{
      breederAssigned:"مرحباً {ownerName}، تم إسناد طلب التحصين {reference} إلى {assignedTeam}. الموعد: {preferredDate}. الموقع: {area} {locationNote}.",
      teamAssigned:"مهمة جديدة: {reference} — المربي {ownerName} — {animalType} / {headCount} رأس — {area} {locationNote} — الموعد {preferredDate}.",
      reminder:"تذكير بموعد وقاية للطلب {reference} بتاريخ {preferredDate}.",
      rescheduled:"تم تحديث موعد الطلب {reference} إلى {preferredDate}."
    }
  };

  function readJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||"null");return x??fallback}catch{return fallback}}
  function writeJson(key,v){localStorage.setItem(key,JSON.stringify(v))}
  function getSettings(){return {...defaultSettings,...readJson(SETTINGS_KEY,{})}}
  function saveSettings(patch){
    const s=getSettings();
    const merged={...s,...patch,areaRules:{...s.areaRules,...(patch.areaRules||{})},animalRules:{...s.animalRules,...(patch.animalRules||{})},teamPhones:{...s.teamPhones,...(patch.teamPhones||{})},templates:{...s.templates,...(patch.templates||{})}};
    writeJson(SETTINGS_KEY,merged);return merged;
  }
  function normalizePhone(phone,countryCode){
    let p=String(phone||"").replace(/\D/g,"");
    const cc=String(countryCode||"965").replace(/\D/g,"");
    if(p.startsWith("00")) p=p.slice(2);
    if(p.startsWith(cc)) return p;
    if(p.length===8) return cc+p;
    return p;
  }
  function assignTeam(request,manualOverride){
    const s=getSettings();
    if(manualOverride) return manualOverride;
    if(request?.assignedTeam && request.assignedTeam!=="غير معين") return request.assignedTeam;
    if(request?.animalType && s.animalRules?.[request.animalType]) return s.animalRules[request.animalType];
    if(request?.area && s.areaRules?.[request.area]) return s.areaRules[request.area];
    return s.fallbackTeam;
  }
  function render(template,data){
    return String(template||"").replace(/\{(\w+)\}/g,(_,k)=>data?.[k]??"");
  }
  function waUrl(phone,text){
    const s=getSettings();
    const p=normalizePhone(phone,s.countryCode);
    if(!p) return null;
    return "https://wa.me/"+p+"?text="+encodeURIComponent(text||"");
  }
  function open(phone,text){
    const u=waUrl(phone,text); if(!u) return null;
    window.open(u,"_blank","noopener,noreferrer"); return u;
  }
  function queue(type,request,team){
    const s=getSettings();
    const assignedTeam=team||assignTeam(request);
    const data={...request,assignedTeam};
    const isTeam=type==="team";
    const template=isTeam?s.templates.teamAssigned:s.templates.breederAssigned;
    const phone=isTeam?s.teamPhones?.[assignedTeam]:request?.phone;
    const item={id:"WA-"+Date.now(),createdAt:new Date().toISOString(),type,status:"pending-user-send",team:assignedTeam,phone,message:render(template,data),reference:request?.reference||request?.id||""};
    const list=readJson(QUEUE_KEY,[]); list.unshift(item); writeJson(QUEUE_KEY,list.slice(0,300)); return item;
  }
  function connect(request,manualOverride){
    const team=assignTeam(request,manualOverride);
    const breeder=queue("breeder",request,team);
    const fieldTeam=queue("team",request,team);
    return {team,breeder,fieldTeam};
  }
  function openBreeder(request,team){const x=queue("breeder",request,team);return open(x.phone,x.message)}
  function openTeam(request,team){const x=queue("team",request,team);return open(x.phone,x.message)}
  function openBoth(request,team){
    const x=connect(request,team);
    if(x.breeder.phone) open(x.breeder.phone,x.breeder.message);
    setTimeout(()=>{if(x.fieldTeam.phone) open(x.fieldTeam.phone,x.fieldTeam.message)},600);
    return x;
  }
  function findRequest(term){
    let arr=[];try{arr=JSON.parse(localStorage.getItem("waqaya.requests")||"[]")}catch{}
    if(!Array.isArray(arr)) arr=[];
    term=String(term||"");
    return arr.find(r=>String(r.reference||"").includes(term)||String(r.ownerName||r.owner||"").includes(term));
  }

  window.WaqayaWhatsApp={
    getSettings,saveSettings,assignTeam,render,waUrl,open,queue,connect,openBreeder,openTeam,openBoth,findRequest,
    listQueue(){return readJson(QUEUE_KEY,[])}
  };
})();
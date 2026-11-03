(() => {
const DEMO_APPOINTMENTS=[
{id:"VAC-118",owner:"عبدالله سالم",phone:"45124512",location:"كبد — قطعة 4",area:"كبد",type:"أغنام",heads:420,time:"08:30",team:"الفريق 1",status:"جارٍ التنفيذ",lat:29.10694,lng:47.71542},
{id:"VAC-121",owner:"ناصر حمد",phone:"30843084",location:"الوفرة — مزرعة 18",area:"الوفرة",type:"ماعز",heads:180,time:"10:00",team:"الفريق 3",status:"مؤكد",lat:28.57296,lng:48.00536},
{id:"VAC-125",owner:"يوسف جاسم",phone:"79107910",location:"العبدلي — طريق 6",area:"العبدلي",type:"أبقار",heads:64,time:"11:30",team:"الفريق 2",status:"بانتظار الوصول",lat:29.96688,lng:47.74961},
{id:"VAC-129",owner:"محمد راشد",phone:"22712271",location:"الجهراء — سوق الحلال",area:"الجهراء",type:"إبل",heads:38,time:"13:00",team:"الفريق 4",status:"مؤكد",lat:29.33751,lng:47.65822}
];
const DEMO_HERDS=DEMO_APPOINTMENTS.map((x,i)=>({id:"HRD-"+String(184-i*13).padStart(5,"0"),owner:x.owner,type:x.type,area:x.area,heads:x.heads,coverage:[96,89,100,82][i]}));
const DEMO_TEAMS=[
{name:"الفريق 1",doctor:"د. أحمد فهد",area:"كبد",progress:68,phone:""},
{name:"الفريق 2",doctor:"د. حسن جاسم",area:"العبدلي",progress:100,phone:""},
{name:"الفريق 3",doctor:"د. يوسف علي",area:"الوفرة",progress:47,phone:""},
{name:"الفريق 4",doctor:"د. محمد ناصر",area:"الجهراء",progress:52,phone:""}
];
const DEMO_VAX=[
{id:"VAX-221",owner:"سالم محمد",type:"أغنام",heads:280,vaccine:"التسمم المعوي",dose:"الأولى",batch:"ENT-26-1084",next:"10 سبتمبر"},
{id:"VAX-218",owner:"مبارك حمد",type:"ماعز",heads:190,vaccine:"طاعون المجترات الصغيرة",dose:"سنوية",batch:"PPR-26-446",next:"20 أغسطس 2027"}
];
const KEYS={requests:"waqayaV2.requests",settings:"waqayaV2.settings",design:"waqayaV2.design"};
const DEFAULT_SETTINGS={areaRules:{"كبد":"الفريق 1","الوفرة":"الفريق 3","العبدلي":"الفريق 2","الجهراء":"الفريق 4"},teamPhones:{"الفريق 1":"","الفريق 2":"","الفريق 3":"","الفريق 4":""},countryCode:"965"};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"null")??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const toast=t=>{const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2500)};
const settings=()=>({...DEFAULT_SETTINGS,...read(KEYS.settings,{})});
const reqs=()=>read(KEYS.requests,[]);
function assignTeam(r){const s=settings();return r.assignedTeam||s.areaRules[r.area]||"الفريق 1"}
function statusClass(s){return s.includes("تنفيذ")?"teal":s.includes("انتظار")?"amber":"blue"}
function mapsUrl(r){const q=r.lat&&r.lng?r.lat+","+r.lng:r.location||r.area;return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q)}
function routeUrl(items){const pts=items.filter(x=>x.lat&&x.lng).map(x=>x.lat+","+x.lng);if(!pts.length)return null;const dest=pts.pop();const p=new URLSearchParams({api:"1",destination:dest,travelmode:"driving"});if(pts.length)p.set("waypoints",pts.join("|"));return "https://www.google.com/maps/dir/?"+p.toString()}
function phoneNorm(p){const d=String(p||"").replace(/\D/g,"");return d.startsWith("965")?d:(d.length===8?"965"+d:d)}
function wa(phone,text){const p=phoneNorm(phone);if(!p){toast("أضف رقم الفريق من الإدارة أولاً");return}window.open("https://wa.me/"+p+"?text="+encodeURIComponent(text),"_blank")}
function calendarICS(r){
 const start=new Date(r.preferredDate||Date.now()+3600000),end=new Date(start.getTime()+3600000),f=d=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
 const body=["BEGIN:VCALENDAR","VERSION:2.0","BEGIN:VEVENT","UID:"+(r.reference||Date.now())+"@waqaya","DTSTART:"+f(start),"DTEND:"+f(end),"SUMMARY:وقاية — "+(r.ownerName||r.owner),"LOCATION:"+(r.locationNote||r.location||r.area||""),"DESCRIPTION:طلب تحصين "+(r.reference||""),"BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:تذكير بموعد وقاية","END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([body],{type:"text/calendar"}));a.download=(r.reference||"waqaya")+".ics";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function renderAppointments(filter=""){
 const list=DEMO_APPOINTMENTS.filter(x=>(x.owner+" "+x.location+" "+x.type+" "+x.id).includes(filter));
 $("#appointmentsList").innerHTML=list.map(x=>`<article class="appointment">
 <div class="time-box"><b>${x.time}</b><span>${x.id}</span></div>
 <div class="owner"><strong>${x.owner}</strong><span>•••• ${x.phone.slice(-4)}</span></div>
 <div class="location"><strong>${x.location}</strong><span>${x.type} • ${x.heads} رأساً</span></div>
 <div class="team"><span>${x.team}</span><i class="badge ${statusClass(x.status)}">${x.status}</i></div>
 <div class="row-actions"><button class="mini" data-map="${x.id}">🗺</button><button class="mini" data-wa="${x.id}">واتساب</button></div>
 </article>`).join("");
 $$("[data-map]").forEach(b=>b.onclick=()=>window.open(mapsUrl(DEMO_APPOINTMENTS.find(x=>x.id===b.dataset.map)),"_blank"));
 $$("[data-wa]").forEach(b=>b.onclick=()=>{const r=DEMO_APPOINTMENTS.find(x=>x.id===b.dataset.wa);wa(r.phone,`مرحباً ${r.owner}، هذا تواصل من وقاية بخصوص موعد التحصين ${r.id} الساعة ${r.time}.`)});
}
function renderRequests(){
 const list=reqs();
 $("#requestsList").innerHTML=(list.length?list:[{reference:"REQ-DEMO-01",ownerName:"عبدالعزيز خالد",area:"كبد",animalType:"أغنام",headCount:310,preferredDate:"2026-11-04T09:00",vaccineName:"التسمم المعوي",phone:"50128432",locationNote:"قطعة 6",status:"جديد"}]).map(r=>{const team=assignTeam(r);return `<article class="card-row"><div><b>${r.reference}</b><span>${r.ownerName}</span></div><div><b>${r.area}</b><span>${r.animalType} • ${r.headCount} رأساً</span></div><div><b>${team}</b><span>${(r.preferredDate||"").replace("T"," ")}</span></div><div class="row-actions"><button class="mini" data-cal="${r.reference}">تقويم</button><button class="mini" data-connect="${r.reference}">ربط واتساب</button></div></article>`}).join("");
 $$("[data-cal]").forEach(b=>b.onclick=()=>calendarICS(findRequest(b.dataset.cal)));
 $$("[data-connect]").forEach(b=>b.onclick=()=>connectWhatsApp(findRequest(b.dataset.connect)));
}
function findRequest(ref){return reqs().find(x=>x.reference===ref)||{reference:"REQ-DEMO-01",ownerName:"عبدالعزيز خالد",area:"كبد",animalType:"أغنام",headCount:310,preferredDate:"2026-11-04T09:00",vaccineName:"التسمم المعوي",phone:"50128432",locationNote:"قطعة 6"}}
function connectWhatsApp(r){const s=settings(),team=assignTeam(r),teamPhone=s.teamPhones[team];wa(r.phone,`مرحباً ${r.ownerName}، تم إسناد طلبك ${r.reference} إلى ${team}. الموعد: ${r.preferredDate||""}.`);setTimeout(()=>{if(teamPhone)wa(teamPhone,`مهمة وقاية جديدة: ${r.reference} — ${r.ownerName} — ${r.animalType} / ${r.headCount} — ${r.area} ${r.locationNote||""}.`)},500)}
function renderHerds(){$("#herdsList").innerHTML=DEMO_HERDS.map(h=>`<article class="card-row"><div><b>${h.id}</b><span>${h.owner}</span></div><div><b>${h.type}</b><span>${h.heads} رأساً</span></div><div><b>${h.area}</b><span>تغطية ${h.coverage}%</span></div><div></div></article>`).join("")}
function renderTeams(){$("#teamsList").innerHTML=DEMO_TEAMS.map(t=>`<article class="team-card"><h3>${t.name}</h3><p>${t.doctor} • ${t.area}</p><div class="progress"><i style="width:${t.progress}%"></i></div><p>إنجاز المسار: ${t.progress}%</p><button class="mini" data-teamroute="${t.name}">🗺 فتح المسار</button></article>`).join("");$$("[data-teamroute]").forEach(b=>b.onclick=()=>{const u=routeUrl(DEMO_APPOINTMENTS.filter(x=>x.team===b.dataset.teamroute));if(u)window.open(u,"_blank");else toast("لا توجد نقاط مسار لهذا الفريق")})}
function renderVaccinations(){$("#vaccinationsList").innerHTML=DEMO_VAX.map(v=>`<article class="card-row"><div><b>${v.id}</b><span>${v.owner}</span></div><div><b>${v.vaccine}</b><span>${v.dose}</span></div><div><b>${v.batch}</b><span>التالي: ${v.next}</span></div><div></div></article>`).join("")}
function switchView(v){$$(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".view").forEach(x=>x.classList.remove("active"));$("#"+v+"View").classList.add("active")}
$$(".tabs button").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$("#appointmentSearch").oninput=e=>renderAppointments(e.target.value);
$("#newRequestBtn").onclick=$("#newRequestBtn2").onclick=()=>$("#requestDialog").showModal();
$("#requestForm").addEventListener("submit",e=>{if(e.submitter?.value==="cancel")return;const fd=new FormData(e.currentTarget);const r=Object.fromEntries(fd.entries());r.headCount=Number(r.headCount);r.reference="REQ-"+Date.now().toString().slice(-6);r.status="جديد";const list=reqs();list.unshift(r);write(KEYS.requests,list);renderRequests();toast("تم حفظ الطلب وإسناده مبدئياً إلى "+assignTeam(r));});
$("#todayRouteBtn").onclick=()=>{const u=routeUrl(DEMO_APPOINTMENTS);if(u)window.open(u,"_blank")};
$("#themeBtn").onclick=()=>document.documentElement.classList.toggle("dark");
$("#adminBtn").onclick=()=>{renderAdmin();$("#adminDialog").showModal()};
function renderAdmin(){const s=settings();$("#routingSettings").innerHTML=Object.keys(s.areaRules).map(a=>`<label><span>${a}</span><select data-area="${a}">${DEMO_TEAMS.map(t=>`<option ${s.areaRules[a]===t.name?"selected":""}>${t.name}</option>`).join("")}</select></label>`).join("");$("#teamPhoneSettings").innerHTML=DEMO_TEAMS.map(t=>`<label><span>${t.name}</span><input data-teamphone="${t.name}" value="${s.teamPhones[t.name]||""}" placeholder="رقم واتساب"></label>`).join("")}
$("#saveAdminBtn").onclick=()=>{const s=settings();$$("[data-area]").forEach(x=>s.areaRules[x.dataset.area]=x.value);$$("[data-teamphone]").forEach(x=>s.teamPhones[x.dataset.teamphone]=x.value);write(KEYS.settings,s);toast("تم حفظ إعدادات الإسناد وواتساب")};
const panel=$("#assistantPanel");$("#assistantLauncher").onclick=()=>{panel.classList.add("open");panel.setAttribute("aria-hidden","false")};$("#assistantClose").onclick=()=>{panel.classList.remove("open");panel.setAttribute("aria-hidden","true")};
function addMsg(role,text){const d=document.createElement("div");d.className="msg "+role;d.textContent=text;$("#assistantMessages").appendChild(d);$("#assistantMessages").scrollTop=$("#assistantMessages").scrollHeight}
function say(t){if(!("speechSynthesis"in window))return;const u=new SpeechSynthesisUtterance(t);u.lang="ar-KW";speechSynthesis.cancel();speechSynthesis.speak(u)}
function assistant(q){const t=q.trim();if(!t)return;if(/مواعيد|موعد/.test(t)){switchView("overview");return"فتحت مواعيد اليوم."}if(/طلبات/.test(t)){switchView("requests");return"فتحت طلبات التحصين."}if(/قطعان|مربي/.test(t)){switchView("herds");return"فتحت القطعان والمربين."}if(/الفرق|فريق/.test(t)&&!/مسار/.test(t)&&!/اربط/.test(t)){switchView("teams");return"فتحت الفرق الميدانية."}if(/مسار الفريق/.test(t)){const m=t.match(/الفريق\s*\d/);const team=m?m[0]:"الفريق 1";const u=routeUrl(DEMO_APPOINTMENTS.filter(x=>x.team===team));if(u)window.open(u,"_blank");return"فتحت مسار "+team+" على خرائط Google."}if(/موقع/.test(t)){const a=DEMO_APPOINTMENTS.find(x=>t.includes(x.owner.split(" ")[0]));if(a){window.open(mapsUrl(a),"_blank");return"فتحت موقع "+a.owner+"."}return"اذكر اسم المربي الموجود في النظام."}if(/اربط/.test(t)&&/فريق|واتساب/.test(t)){const a=DEMO_APPOINTMENTS.find(x=>t.includes(x.owner.split(" ")[0]))||DEMO_APPOINTMENTS[0];const r={reference:a.id,ownerName:a.owner,phone:a.phone,area:a.area,animalType:a.type,headCount:a.heads,preferredDate:"اليوم "+a.time,locationNote:a.location};connectWhatsApp(r);return"جهزت ربط "+a.owner+" مع "+assignTeam(r)+" عبر واتساب."}if(/احجز|تقويم|كلندر/.test(t)){const r=reqs()[0]||findRequest("REQ-DEMO-01");calendarICS(r);return"جهزت موعد وقاية للتقويم مع تذكير."}if(/صمم|بوستر|ستوري|كاروسيل/.test(t)){const l=read(KEYS.design,[]);l.unshift({id:"DES-"+Date.now(),brief:t,route:"canva",preProcess:"compositor",status:"queued"});write(KEYS.design,l);return"تم تجهيز طلب التصميم لمسار Canva مع Compositor."}return"أستطيع إدارة المواعيد والطلبات والفرق والخرائط والتقويم وواتساب والتصميم."}
function runAssistant(q){addMsg("user",q);const a=assistant(q);setTimeout(()=>{addMsg("bot",a);say(a)},100)}
$("#assistantSend").onclick=()=>{const q=$("#assistantInput").value;$("#assistantInput").value="";runAssistant(q)};$("#assistantInput").onkeydown=e=>{if(e.key==="Enter")$("#assistantSend").click()};$$(".quick button").forEach(b=>b.onclick=()=>runAssistant(b.dataset.q));
$("#voiceBtn").onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast("التعرف الصوتي غير مدعوم في هذا المتصفح");return}const r=new SR();r.lang="ar-KW";r.onresult=e=>{const q=e.results[0][0].transcript;$("#assistantInput").value=q;runAssistant(q)};r.start()};
renderAppointments();renderRequests();renderHerds();renderTeams();renderVaccinations();
})();
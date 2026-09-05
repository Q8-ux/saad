const projects=[
{id:'legal',name:'AI Legal Office',tier:'A',statusAr:'تنفيذ الآن',statusEn:'Execute now',price:600,clients:20,target:12000,score:96,modelAr:'اشتراك شهري لمكاتب المحاماة',modelEn:'Monthly subscription for law firms',offerAr:'إدارة ملفات + مساعد قانوني + مذكرات + CRM + مواعيد',offerEn:'Matter management + legal AI + memos + CRM + appointments',nextAr:'بناء باقة White-label وعرض تجريبي لأول 5 مكاتب',nextEn:'Build a white-label package and demo it to the first 5 firms',repo:'Q8-ux/sabeq-legal-system',repoUrl:'https://github.com/Q8-ux/sabeq-legal-system'},
{id:'command',name:'AI Business Command Center',tier:'A',statusAr:'تنفيذ الآن',statusEn:'Execute now',price:1000,clients:12,target:12000,score:95,modelAr:'SaaS B2B للشركات',modelEn:'B2B SaaS for companies',offerAr:'مركز قيادة يربط المشاريع والمهام والوثائق والوكلاء',offerEn:'Command center connecting projects, tasks, documents and agents',nextAr:'تحويل هذه اللوحة إلى منتج متعدد الشركات',nextEn:'Turn this command center into a multi-company product',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad/tree/main/project-command-center'},
{id:'websites',name:'AI Website Sales Factory',tier:'A',statusAr:'تنفيذ الآن',statusEn:'Execute now',price:1500,clients:8,target:12000,score:92,modelAr:'خدمة إنتاج مواقع مدعومة بالذكاء الاصطناعي',modelEn:'AI-assisted website production service',offerAr:'بحث + محتوى + تصميم + CRM + نشر',offerEn:'Research + content + design + CRM + deployment',nextAr:'إنشاء 3 قوالب قطاعية وصفحة طلب وتسعير',nextEn:'Create 3 vertical templates plus ordering and pricing',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad'},
{id:'social',name:'AI Social Media OS',tier:'B',statusAr:'التالي',statusEn:'Next',price:600,clients:20,target:12000,score:88,modelAr:'منصة + خدمة مُدارة',modelEn:'Platform + managed service',offerAr:'محتوى + تقويم + موافقات + منافسين + تقارير',offerEn:'Content + calendar + approvals + competitors + reporting',nextAr:'MVP لإدارة 5 عملاء تجريبيين',nextEn:'MVP for 5 pilot clients',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad'},
{id:'restaurant',name:'Restaurant AI OS',tier:'B',statusAr:'التالي',statusEn:'Next',price:300,clients:40,target:12000,score:86,modelAr:'اشتراك للمطاعم',modelEn:'Restaurant subscription',offerAr:'طلبات + مخزون + مشتريات + موردين + مساعد صوتي',offerEn:'Orders + inventory + purchasing + suppliers + voice assistant',nextAr:'دمج التموينات والطلب الصوتي في منتج واحد',nextEn:'Unify supply and voice ordering into one product',repo:'Q8-ux/zad-restaurants',repoUrl:'https://github.com/Q8-ux/zad-restaurants'},
{id:'messaging',name:'WhatsApp & SMS AI',tier:'B',statusAr:'التالي',statusEn:'Next',price:400,clients:30,target:12000,score:84,modelAr:'أتمتة B2B',modelEn:'B2B automation',offerAr:'حملات + Leads + تذكير + ردود AI + تقارير',offerEn:'Campaigns + leads + reminders + AI replies + reporting',nextAr:'بناء محرك Workflows وقوالب قطاعات',nextEn:'Build workflow engine and vertical templates',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad'},
{id:'procurement',name:'AI Procurement Marketplace',tier:'C',statusAr:'توسع',statusEn:'Scale',price:0,clients:0,target:12500,score:80,modelAr:'2.5% عمولة من GMV',modelEn:'2.5% commission on GMV',offerAr:'مقارنة أسعار وموردين وطلبات B2B',offerEn:'B2B supplier, price and order comparison',nextAr:'استهداف GMV شهري 500,000 دولار',nextEn:'Target $500,000 monthly GMV',repo:'Q8-ux/zad-restaurants',repoUrl:'https://github.com/Q8-ux/zad-restaurants'},
{id:'docs',name:'AI Document Intelligence',tier:'C',statusAr:'توسع',statusEn:'Scale',price:2000,clients:6,target:12000,score:83,modelAr:'عقود شركات',modelEn:'Enterprise contracts',offerAr:'استخراج + تصنيف + بحث دلالي + Q&A',offerEn:'Extraction + classification + semantic search + Q&A',nextAr:'إنشاء Demo لعقود وأرشيف شركة',nextEn:'Create a contract and corporate archive demo',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad'},
{id:'education',name:'Kuwait AI Education',tier:'D',statusAr:'لاحقاً',statusEn:'Later',price:0,clients:0,target:12000,score:76,modelAr:'مدارس + طلبة B2B2C',modelEn:'Schools + students B2B2C',offerAr:'دروس + استماع + امتحانات + معلم AI',offerEn:'Lessons + listening + exams + AI tutor',nextAr:'إثبات الاستخدام مع صف واحد قبل التوسع',nextEn:'Validate with one grade before scaling',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad/tree/main/english-kuwait'},
{id:'vas',name:'Arabic AI Telecom VAS',tier:'D',statusAr:'لاحقاً',statusEn:'Later',price:4000,clients:3,target:12000,score:79,modelAr:'B2B / Revenue Share',modelEn:'B2B / Revenue Share',offerAr:'خدمات AI عربية جاهزة لشركات الاتصالات',offerEn:'Arabic AI services for telecom operators',nextAr:'إعداد 3 منتجات VAS قابلة للعرض على المشغلين',nextEn:'Prepare 3 VAS products for operator pitches',repo:'Q8-ux/saad',repoUrl:'https://github.com/Q8-ux/saad'}
];

const connectedRepos=[
{full_name:'Q8-ux/saad',visibility:'public',default_branch:'main',html_url:'https://github.com/Q8-ux/saad'},
{full_name:'Q8-ux/sabeq-legal-system',visibility:'private',default_branch:'main',html_url:'https://github.com/Q8-ux/sabeq-legal-system'},
{full_name:'Q8-ux/kuwait-chalets',visibility:'public',default_branch:'main',html_url:'https://github.com/Q8-ux/kuwait-chalets'},
{full_name:'Q8-ux/zad-restaurants',visibility:'public',default_branch:'main',html_url:'https://github.com/Q8-ux/zad-restaurants'},
{full_name:'Q8-ux/rattil-quran',visibility:'public',default_branch:'main',html_url:'https://github.com/Q8-ux/rattil-quran'},
{full_name:'Q8-ux/ant-alshaer',visibility:'private',default_branch:'main',html_url:'https://github.com/Q8-ux/ant-alshaer'},
{full_name:'Q8-ux/alshaaer',visibility:'public',default_branch:'main',html_url:'https://github.com/Q8-ux/alshaaer'}
];

const $=s=>document.querySelector(s);
const money=n=>'$'+Number(n).toLocaleString('en-US');
const isEn=()=>document.documentElement.lang==='en';
const tr=(ar,en)=>isEn()?en:ar;
let githubLive=new Map();

function injectGithubPanel(){
 if($('#githubPanel')) return;
 const stats=$('.stats');
 const panel=document.createElement('section');
 panel.className='panel'; panel.id='githubPanel'; panel.style.marginBottom='18px';
 panel.innerHTML=`<div class="panel-head"><div><span class="kicker">GITHUB CONNECTION</span><h2 id="githubTitle">اتصال GitHub</h2></div><div style="display:flex;gap:8px;align-items:center"><span id="githubState" class="badge attention">جاري الفحص</span><button id="refreshGithub" class="ghost">تحديث</button></div></div><p id="githubNote" style="color:#667085;line-height:1.8"></p><div id="githubRepos" class="projects-grid"></div>`;
 stats.insertAdjacentElement('afterend',panel);
 $('#refreshGithub').addEventListener('click',syncGithub);
}

function repoState(fullName){
 const live=githubLive.get(fullName.toLowerCase());
 const snap=connectedRepos.find(r=>r.full_name.toLowerCase()===fullName.toLowerCase());
 if(live) return {mode:'live',visibility:'public',branch:live.default_branch||'main',updated:live.updated_at||'',url:live.html_url};
 if(snap?.visibility==='private') return {mode:'private',visibility:'private',branch:snap.default_branch,url:snap.html_url};
 if(snap) return {mode:'snapshot',visibility:snap.visibility,branch:snap.default_branch,url:snap.html_url};
 return {mode:'unknown',visibility:'unknown',branch:'-',url:'https://github.com/'+fullName};
}

function renderGithubRepos(){
 const box=$('#githubRepos'); if(!box) return;
 box.innerHTML=connectedRepos.map(r=>{
   const s=repoState(r.full_name);
   const label=s.mode==='live'?tr('متصل Live','Live connected'):s.mode==='private'?tr('خاص • اتصال محمي','Private • secured'):tr('Snapshot','Snapshot');
   const badge=s.mode==='live'?'active':s.mode==='private'?'ready':'attention';
   const updated=s.updated?new Date(s.updated).toLocaleString(isEn()?'en-US':'ar-KW'):'—';
   return `<article class="project-card"><div class="project-top"><div><small>${tr('مستودع','Repository')}</small><h3>${r.full_name}</h3></div><span class="badge ${badge}">${label}</span></div><div class="project-meta"><div class="meta-box"><small>${tr('الفرع','Branch')}</small><b>${s.branch}</b></div><div class="meta-box"><small>${tr('آخر تحديث Live','Live updated')}</small><b style="font-size:13px">${updated}</b></div></div><div class="project-actions"><a class="primary" href="${r.html_url}" target="_blank" rel="noopener">GitHub</a></div></article>`;
 }).join('');
}

async function syncGithub(){
 injectGithubPanel();
 const state=$('#githubState'),note=$('#githubNote');
 state.className='badge attention'; state.textContent=tr('جاري الاتصال…','Connecting…');
 note.textContent=tr('يتم التحقق من المستودعات العامة عبر GitHub API. المستودعات الخاصة لا يوضع مفتاحها داخل GitHub Pages حفاظاً على الأمان.','Public repositories are checked through the GitHub API. Private repository credentials are never embedded in GitHub Pages for security.');
 try{
   const res=await fetch('https://api.github.com/users/Q8-ux/repos?per_page=100&sort=updated',{headers:{Accept:'application/vnd.github+json'}});
   if(!res.ok) throw new Error('HTTP '+res.status);
   const data=await res.json(); githubLive=new Map(data.map(r=>[r.full_name.toLowerCase(),r]));
   state.className='badge active'; state.textContent=tr('GitHub Live متصل','GitHub Live connected');
   note.textContent=tr(`تمت مزامنة ${data.length} مستودعاً عاماً مباشرة. المستودعات الخاصة ظاهرة كاتصال محمي وتحتاج Backend/GitHub App للوصول الحي.`,`Synced ${data.length} public repositories live. Private repositories are shown as secured connections and require a backend/GitHub App for live access.`);
 }catch(e){
   githubLive=new Map(); state.className='badge attention'; state.textContent=tr('Snapshot Mode','Snapshot Mode');
   note.textContent=tr('تعذر الوصول المباشر إلى GitHub API من المتصفح؛ تم الإبقاء على قائمة المستودعات المتصلة المعروفة دون تعطيل لوحة التحكم.','Browser access to the GitHub API failed; the verified connected-repository snapshot remains available and the control panel stays functional.');
 }
 renderGithubRepos(); renderProjects();
}

function renderProjects(){
 const q=($('#search')?.value||'').trim().toLowerCase();
 const tier=$('#tier')?.value||'all';
 const list=projects.filter(p=>(tier==='all'||p.tier===tier)&&p.name.toLowerCase().includes(q));
 const box=$('#projects'); if(!box) return;
 box.innerHTML=list.map(p=>{
   const rs=repoState(p.repo);
   const gh=rs.mode==='live'?tr('GitHub Live','GitHub Live'):rs.mode==='private'?tr('GitHub خاص','Private GitHub'):tr('GitHub Snapshot','GitHub Snapshot');
   return `<article class="project-card" data-project="${p.id}"><div class="project-top"><div><small>Tier ${p.tier}</small><h3>${p.name}</h3></div><span class="badge ${p.tier==='A'?'active':p.tier==='B'?'ready':'attention'}">${isEn()?p.statusEn:p.statusAr}</span></div><div class="project-meta"><div class="meta-box"><small>${tr('هدف MRR','MRR target')}</small><b>${money(p.target)}</b></div><div class="meta-box"><small>${tr('الأولوية','Priority')}</small><b>${p.score}/100</b></div><div class="meta-box"><small>${tr('السعر','Price')}</small><b>${p.price?money(p.price):tr('عمولة/مختلط','Commission/Mixed')}</b></div><div class="meta-box"><small>GitHub</small><b style="font-size:13px">${gh}</b></div></div><div class="progress"><span style="width:${p.score}%"></span></div><p>${isEn()?p.offerEn:p.offerAr}</p><div class="project-actions"><button type="button" data-action="room" data-id="${p.id}">${tr('غرفة التحكم','Control room')}</button><a class="primary" href="${p.repoUrl}" target="_blank" rel="noopener">GitHub</a></div></article>`;
 }).join('');
}

function openRoom(id){
 const p=projects.find(x=>x.id===id); if(!p) return;
 const rs=repoState(p.repo),room=$('#room'); if(!room) return;
 const githubStatus=rs.mode==='live'?tr('متصل مباشرة بالمستودع العام','Live public repository connection'):rs.mode==='private'?tr('مستودع خاص — ظاهر عبر الاتصال الموثق، والوصول الحي يحتاج Backend آمن','Private repository — verified connection; live access needs a secure backend'):tr('بيانات Snapshot — يمكن فتح المستودع مباشرة','Snapshot data — repository can be opened directly');
 room.innerHTML=`<div class="room-grid"><div class="room-section"><h4>${tr('نموذج الإيراد','Revenue model')}</h4><p>${isEn()?p.modelEn:p.modelAr}</p><b>${money(p.target)} / ${tr('شهر','month')}</b></div><div class="room-section"><h4>${tr('الحسبة','Target math')}</h4><p>${p.price&&p.clients?`${p.clients} × ${money(p.price)}`:tr('نموذج عمولة أو دخل مختلط','Commission or mixed revenue model')}</p></div><div class="room-section"><h4>${tr('الخطوة التالية','Next action')}</h4><p>${isEn()?p.nextEn:p.nextAr}</p></div><div class="room-section"><h4>GitHub</h4><p>${githubStatus}</p><p><b>${p.repo}</b><br>${tr('الفرع','Branch')}: ${rs.branch}</p><a href="${p.repoUrl}" target="_blank" rel="noopener">${tr('فتح GitHub','Open GitHub')}</a></div></div>`;
 room.className=''; room.scrollIntoView({behavior:'smooth',block:'start'});
}

function answer(text){
 const q=(text||'').toLowerCase();
 let ar,en;
 if(q.includes('ابدأ')||q.includes('start')||q.includes('اولو')||q.includes('أولو')){ar='ابدأ بثلاثة مشاريع Tier A: AI Legal Office ثم AI Business Command Center ثم AI Website Sales Factory. الهدف الأول 36,000 دولار MRR.';en='Start with the three Tier A ventures: AI Legal Office, AI Business Command Center, then AI Website Sales Factory. Phase-one target: $36,000 MRR.';}
 else if(q.includes('دخل')||q.includes('12000')||q.includes('revenue')){ar='هدف المحفظة الكامل 120,000+ دولار MRR. لكل مشروع معادلة سعر × عملاء، ويجب قياس Pipeline وCAC وChurn.';en='Full portfolio target is $120,000+ MRR. Each venture needs measurable price × customer economics, pipeline, CAC and churn.';}
 else if(q.includes('خطر')||q.includes('risk')){ar='أكبر خطر هو تشغيل عشرة مسارات تجارية دفعة واحدة. الأولوية: Tier A ثم التوسع بعد إثبات البيع.';en='The main risk is launching ten commercial tracks at once. Prioritize Tier A, then scale after sales validation.';}
 else {ar='التوصية التنفيذية: استخدم حالة GitHub مع مؤشرات الإيراد لتحديد المشروع الذي يحتاج تدخلاً، ولا تعتبر اكتمال الكود دليلاً على نجاح المشروع.';en='Executive recommendation: combine GitHub health with revenue metrics to prioritize intervention; code completion alone is not business success.';}
 const box=$('#aiAnswer'); if(box) box.textContent=isEn()?en:ar;
}

function refreshLanguageDependentUi(){renderProjects();renderGithubRepos();}
window.commandCenterRefreshLanguage=refreshLanguageDependentUi;

document.addEventListener('DOMContentLoaded',()=>{
 injectGithubPanel();
 $('#totalTarget').textContent=money(projects.reduce((s,p)=>s+p.target,0));
 $('#projectCount').textContent=projects.length; $('#tierA').textContent=projects.filter(p=>p.tier==='A').length; $('#firstTarget').textContent='$36,000';
 $('#search')?.addEventListener('input',renderProjects); $('#tier')?.addEventListener('change',renderProjects);
 $('#projects')?.addEventListener('click',e=>{const b=e.target.closest('[data-action="room"]');if(b){e.preventDefault();openRoom(b.dataset.id);}});
 $('#ask')?.addEventListener('click',()=>answer($('#aiInput')?.value)); $('#aiInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')answer(e.target.value)});
 document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{if($('#aiInput'))$('#aiInput').value=b.dataset.prompt;answer(b.dataset.prompt);}));
 renderProjects(); syncGithub();
});
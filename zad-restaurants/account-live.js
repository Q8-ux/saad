(()=>{
const API='https://cfauiqcvhioxpjlbvsgx.supabase.co/functions/v1/tamweenat-api';
const TOKEN_KEY='tamweenatRestaurantToken';
const token=sessionStorage.getItem(TOKEN_KEY);
if(!token)return;
let me=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const KD=n=>`${Number(n||0).toFixed(3)} د.ك`;
async function api(path,opts={}){
 const r=await fetch(API+path,{...opts,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(opts.headers||{})},cache:'no-store'});
 if(r.status===401){sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem('tamweenatRestaurantSession');location.replace('./login.html');throw new Error('انتهت الجلسة')}
 const ct=r.headers.get('content-type')||'';const data=ct.includes('json')?await r.json():await r.text();
 if(!r.ok){const e=new Error(data?.error||data?.message||'تعذر تنفيذ العملية');e.status=r.status;throw e}return data;
}
function removeVoice(){
 document.querySelectorAll('[data-section="assistant"],#assistant,.voice-panel,.voice-console,.voice-orb').forEach(e=>e.remove());
}
function injectBusinessSections(){
 removeVoice();
 const nav=document.querySelector('.sidebar nav');
 if(nav){
  const add=(id,label,icon)=>{if(nav.querySelector(`[data-section="${id}"]`))return;const b=document.createElement('button');b.className='nav-item';b.dataset.section=id;b.innerHTML=`<span>${icon}</span><b>${label}</b>`;nav.appendChild(b)};
  add('tracking','تتبع الطلبات','◎');add('support','التواصل والدعم','✉');
 }
 const main=document.querySelector('.main');if(!main)return;
 if(!$('tracking'))main.insertAdjacentHTML('beforeend',`<section id="tracking" class="page-section"><div class="section-title"><div><p class="eyebrow">متابعة مباشرة</p><h2>تتبع الطلبات</h2></div></div><div id="trackingKpis" class="kpi-grid"></div><div id="trackingList"></div></section>`);
 if(!$('support'))main.insertAdjacentHTML('beforeend',`<section id="support" class="page-section"><div class="section-title"><div><p class="eyebrow">خدمة العملاء</p><h2>التواصل مع إدارة تموينات</h2></div></div><div class="split-grid"><div id="supportList"></div><article class="panel"><h3>استفسار جديد</h3><form id="supportForm"><input id="supportSubject" placeholder="عنوان الاستفسار" required><textarea id="supportBody" placeholder="اكتب استفسارك أو طلبك للإدارة" required></textarea><button class="primary-btn" type="submit">إرسال إلى إدارة تموينات</button><a class="secondary-btn" href="https://wa.me/96550168888" target="_blank" rel="noopener">واتساب مباشر</a></form></article></div></section>`);
}
function wireNav(){document.querySelectorAll('.nav-item').forEach(b=>{if(b.dataset.liveWired)return;b.dataset.liveWired='1';b.addEventListener('click',()=>{document.querySelectorAll('.page-section').forEach(x=>x.classList.remove('active-section'));document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));$(b.dataset.section)?.classList.add('active-section');b.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})})})}
function syncAccount(){
 if(!me)return;
 const inv=(me.invoices||[]).map(i=>({id:i.number,date:String(i.issuedAt||'').slice(0,10),due:String(i.dueAt||'').slice(0,10),amount:Number(i.amount)-Number(i.paid||0),status:i.status==='overdue'?'due':i.status}));
 const purchases=(me.orders||[]).map(o=>({date:String(o.createdAt||'').slice(0,10),order:o.number,category:(o.items||[])[0]?.name||'تموينات',items:(o.items||[]).map(x=>`${x.name} ${x.qty} ${x.unit}`).join('، '),payment:o.paymentMethod,amount:o.total}));
 const apply=()=>{if(window.ZadAccount?.update){window.ZadAccount.update({restaurantName:me.name,creditLimit:me.creditLimit,outstanding:me.outstanding,overdue:me.overdue,monthlyBudget:me.monthlyBudget,monthSpend:me.monthSpend,monthCreditSpend:me.creditSpendMonth,healthScore:me.health,invoices:inv,purchases});return true}return false};
 if(!apply())setTimeout(apply,120);
}
function renderTracking(){
 const host=$('trackingList');if(!host)return;const orders=(me?.orders||[]).slice();const active=orders.filter(o=>!['delivered','cancelled'].includes(o.status));
 if($('trackingKpis'))$('trackingKpis').innerHTML=`<article class="kpi"><span>الطلبات النشطة</span><strong>${active.length}</strong></article><article class="kpi"><span>تم التسليم</span><strong>${orders.filter(o=>o.status==='delivered').length}</strong></article><article class="kpi"><span>آخر طلب</span><strong>${orders[0]?.number||'—'}</strong></article>`;
 const labels={placed:'تم استلام الطلب',confirmed:'تم التأكيد',preparing:'قيد التجهيز',dispatched:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي'};
 host.innerHTML=orders.length?orders.map(o=>`<article class="panel"><div class="panel-head"><div><h3>${esc(o.number)}</h3><small>${new Date(o.createdAt).toLocaleString('ar-KW')} • ${KD(o.total)}</small></div><span class="status-pill ${o.status==='delivered'?'safe':'warning'}">${labels[o.status]||esc(o.status)}</span></div>${o.delivery?.branch?`<p>الفرع: ${esc(o.delivery.branch)} ${o.delivery.eta?`• المتوقع ${esc(o.delivery.eta)}`:''}</p>`:''}</article>`).join(''):'<article class="panel"><p>لا توجد طلبات حتى الآن.</p></article>';
}
function renderSupport(){const host=$('supportList');if(!host)return;const ms=(me?.messages||[]).slice();host.innerHTML=ms.length?ms.map(m=>`<article class="panel"><div class="panel-head"><div><h3>${esc(m.subject)}</h3><small>${new Date(m.createdAt).toLocaleString('ar-KW')}</small></div><span class="status-pill ${m.status==='answered'?'safe':'warning'}">${m.status==='answered'?'تم الرد':'قيد المتابعة'}</span></div><p>${esc(m.body)}</p>${(m.replies||[]).map(r=>`<p><strong>${r.from==='admin'?'إدارة تموينات':'المطعم'}:</strong> ${esc(r.body)}</p>`).join('')}</article>`).join(''):'<article class="panel"><p>لا توجد استفسارات سابقة.</p></article>'}
async function sendSupport(e){e.preventDefault();const subject=$('supportSubject').value.trim(),body=$('supportBody').value.trim();if(!body)return;await api('/api/messages',{method:'POST',body:JSON.stringify({subject,body})});e.currentTarget.reset();await refresh()}
async function refresh(){me=await api('/api/me');syncAccount();renderTracking();renderSupport();const sess=JSON.parse(sessionStorage.getItem('tamweenatRestaurantSession')||'{}');sess.restaurantName=me.name;sessionStorage.setItem('tamweenatRestaurantSession',JSON.stringify(sess))}
async function init(){injectBusinessSections();wireNav();$('supportForm')?.addEventListener('submit',sendSupport);window.TamweenatAPI={api,refresh,getAccount:()=>me};try{await refresh()}catch(e){console.error(e)}removeVoice()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,40),{once:true});else setTimeout(init,40);
})();
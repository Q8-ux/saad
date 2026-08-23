(()=>{
const groups=[
{key:'الكل',label:'كل المنتجات',icon:'▦'},
{key:'خضار',label:'خضار',icon:'🥬'},
{key:'فواكه',label:'فواكه',icon:'🍋'},
{key:'حبوب',label:'حبوب',icon:'🌾'},
{key:'بقوليات',label:'بقوليات',icon:'🫘'},
{key:'توابل',label:'توابل',icon:'✦'},
{key:'زيوت',label:'زيوت',icon:'◉'},
{key:'مواد أساسية',label:'مواد أساسية',icon:'▣'},
{key:'ألبان وبيض',label:'ألبان وبيض',icon:'🥚'},
{key:'دواجن ولحوم',label:'دواجن ولحوم',icon:'🍗'},
{key:'مجمدات',label:'مجمدات',icon:'❄'},
{key:'معلبات',label:'معلبات',icon:'▤'},
{key:'مشروبات',label:'مشروبات',icon:'🥤'},
{key:'تنظيف وتشغيل',label:'تنظيف وتشغيل',icon:'✧'}
];
const supplyFamilies=[
{key:'fresh',code:'01',label:'الطازج اليومي',description:'خضروات وفواكه للتجهيز اليومي',categories:['خضار','فواكه']},
{key:'dry',code:'02',label:'المخزن الجاف',description:'أرز وحبوب وبقوليات ومواد أساسية',categories:['حبوب','بقوليات','مواد أساسية']},
{key:'flavour',code:'03',label:'النكهات والتحضير',description:'توابل وزيوت ومعلبات ومكونات الطهي',categories:['توابل','زيوت','معلبات']},
{key:'cold',code:'04',label:'السلسلة المبردة',description:'ألبان وبيض ودواجن ولحوم ومجمدات',categories:['ألبان وبيض','دواجن ولحوم','مجمدات']},
{key:'drinks',code:'05',label:'المشروبات',description:'مياه وشاي وقهوة وعصائر',categories:['مشروبات']},
{key:'operations',code:'06',label:'التشغيل والنظافة',description:'مواد تنظيف ومستهلكات تشغيل المطعم',categories:['تنظيف وتشغيل']}
];
const products=[
{id:'tomatoes',name:'طماطم',category:'خضار',unit:'كجم',image:'./images/real/tomatoes.jpg'},
{id:'onions',name:'بصل',category:'خضار',unit:'كجم',image:'./images/real/onions.jpg'},
{id:'potatoes',name:'بطاطا',category:'خضار',unit:'كجم',image:'./images/real/potatoes.jpg'},
{id:'garlic',name:'ثوم',category:'خضار',unit:'كجم',image:'./images/real/garlic.jpg'},
{id:'cucumbers',name:'خيار',category:'خضار',unit:'كجم',image:'./images/catalog/cucumbers.webp'},
{id:'lemons',name:'ليمون',category:'فواكه',unit:'كجم',image:'./images/real/lemons.jpg'},
{id:'rice',name:'أرز بسمتي',category:'حبوب',unit:'كجم',image:'./images/real/rice.jpg'},
{id:'chickpeas',name:'حمص',category:'بقوليات',unit:'كجم',image:'./images/catalog/chickpeas.webp'},
{id:'spices',name:'بهارات مشكلة',category:'توابل',unit:'كجم',image:'./images/catalog/spices.webp'},
{id:'cardamom',name:'هيل',category:'توابل',unit:'كجم',image:'./images/catalog/cardamom.webp'},
{id:'oil',name:'زيت قلي',category:'زيوت',unit:'لتر',image:'./images/real/oil.jpg'},
{id:'flour',name:'طحين',category:'مواد أساسية',unit:'كجم',image:'./images/catalog/flour.webp'},
{id:'sugar',name:'سكر',category:'مواد أساسية',unit:'كجم',image:'./images/catalog/sugar.webp'},
{id:'salt',name:'ملح',category:'مواد أساسية',unit:'كجم',image:'./images/catalog/salt.webp'},
{id:'eggs',name:'بيض',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/eggs.webp'},
{id:'dairy',name:'منتجات ألبان',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/dairy.webp'},
{id:'cheese',name:'جبن',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/cheese.webp'},
{id:'chicken',name:'دجاج مبرد',category:'دواجن ولحوم',unit:'كجم',image:'./images/catalog/chicken.webp'},
{id:'frozen',name:'خضروات مجمدة',category:'مجمدات',unit:'كرتون',image:'./images/catalog/frozen-veg.webp'},
{id:'canned',name:'مواد معلبة',category:'معلبات',unit:'كرتون',image:'./images/catalog/canned.webp'},
{id:'water',name:'مياه',category:'مشروبات',unit:'كرتون',image:'./images/catalog/water.webp'},
{id:'juice',name:'عصائر',category:'مشروبات',unit:'كرتون',image:'./images/catalog/juice.webp'},
{id:'tea',name:'شاي',category:'مشروبات',unit:'كرتون',image:'./images/catalog/tea.webp'},
{id:'coffee',name:'قهوة',category:'مشروبات',unit:'كرتون',image:'./images/catalog/coffee.webp'},
{id:'cleaning',name:'مواد تنظيف',category:'تنظيف وتشغيل',unit:'كرتون',image:'./images/catalog/cleaning.webp'}
];
const restaurantTypes={
 burger:{
  label:'احتياجات مطعم البرغر',code:'BRG',description:'قائمة تشغيل متكاملة لخط التحضير والقلي والتغليف والتسليم.',
  productIds:['potatoes','tomatoes','onions','cucumbers','cheese','chicken','eggs','oil','salt','spices','water','juice','cleaning'],
  quoteMessage:'مرحباً، أريد عرض سعر كاملاً لقائمة احتياجات مطعم برغر من تموينات.',
  needGroups:[
   {title:'البروتينات',items:['أقراص لحم بقري','برغر دجاج','بيض']},
   {title:'الخبز والأجبان',items:['خبز بريوش أو سمسم','جبن شيدر شرائح']},
   {title:'الخضار والإضافات',items:['خس آيسبرغ','طماطم','بصل','مخلل خيار','هالبينو']},
   {title:'الصلصات والتتبيل',items:['كاتشب','مايونيز','خردل','صلصة باربكيو','ملح وفلفل أسود']},
   {title:'القلي والجوانب',items:['بطاطا مقلية مجمدة','حلقات بصل','زيت قلي عالي التحمل']},
   {title:'التغليف والتشغيل',items:['ورق وعلب برغر','علب بطاطا وأكياس','أكواب ومصاصات','قفازات ومناديل ومنظفات']}
  ]
 },
 kuwaiti:{
  label:'احتياجات المطاعم الكويتية',code:'KWT',description:'أساسيات المجبوس والمرق والهريس والتشريب من المخزن حتى التغليف.',
  productIds:['rice','chicken','onions','potatoes','tomatoes','garlic','lemons','chickpeas','spices','cardamom','oil','flour','sugar','salt','dairy','eggs','tea','coffee','water','cleaning'],
  quoteMessage:'مرحباً، أريد عرض سعر كاملاً لقائمة احتياجات مطعم كويتي من تموينات.',
  needGroups:[
   {title:'اللحوم والدواجن',items:['دجاج كامل وقطع','لحم غنم','لحم بقري','سمك وروبيان']},
   {title:'الأرز والحبوب',items:['أرز بسمتي ومصري','هريس وجريش','عدس وحمص']},
   {title:'الخضار اليومية',items:['بصل وطماطم','بطاطا وثوم','ليمون وكزبرة وبقدونس']},
   {title:'بهارات المطبخ الكويتي',items:['هيل وزعفران','لومي أسود وقرفة','قرنفل وكمون وكركم','فلفل أسود وبهارات مجبوس']},
   {title:'أساسيات الطبخ',items:['زيت وسمن','معجون طماطم','ملح ودقيق','لبن وزبادي','زبيب ومكسرات وماء ورد']},
   {title:'التغليف والتشغيل',items:['صحون وأوعية للأرز والمرق','فويل ونايلون حفظ','أكياس وقفازات ومناديل','منظفات ومزيل دهون']}
  ]
 }
};
const session=(()=>{try{return JSON.parse(sessionStorage.getItem('tamweenatRestaurantSession')||'{}')}catch{return{}}})();
const cartKey=`tamweenatCart:${session.username||'restaurant'}`;
let cart=(()=>{try{return JSON.parse(localStorage.getItem(cartKey)||'{}')}catch{return{}}})();
let search='',category='الكل',family='',restaurantType='';
const save=()=>localStorage.setItem(cartKey,JSON.stringify(cart));
const itemCount=()=>Object.values(cart).reduce((s,n)=>s+Number(n||0),0);
const selected=()=>products.filter(p=>cart[p.id]>0);
const account=()=>window.ZadAccount?.get?.()||{};
function mount(){
 const root=document.getElementById('supplies');if(!root)return;
 root.innerHTML=`<div class="section-title"><div><p class="eyebrow">التوريد المباشر</p><h2>طلب التموينات</h2></div><span class="status-pill safe">داخل حساب المطعم</span></div>
 <div id="suppliesCreditNote" class="gate-status"></div>
 <div class="classification-heading"><div><p class="eyebrow">تصنيف واضح للمخزون</p><h3>المواد الاستهلاكية في مجموعات تشغيلية</h3><p>كل مجموعة تجمع منتجاتها المرتبطة لتسهيل الطلب والجرد وإعادة التوريد.</p></div><span>6 مجموعات رئيسية</span></div>
 <div class="supply-family-grid">${supplyFamilies.map(f=>{const count=products.filter(p=>f.categories.includes(p.category)).length;return `<button type="button" class="supply-family-card" data-family="${f.key}"><span class="family-code">${f.code}</span><span class="family-copy"><b>${f.label}</b><small>${f.description}</small><em>${f.categories.join(' • ')}</em></span><span class="family-count">${count}<small>منتج</small></span><i>عرض المنتجات ←</i></button>`}).join('')}</div>
 <div class="restaurant-type-heading"><div><p class="eyebrow">قوائم مصممة حسب النشاط</p><h3>ابدأ من احتياج مطعمك، لا من كتالوج طويل</h3></div><small>قوائم مرجعية للمكونات والتغليف والتشغيل</small></div>
 <div class="restaurant-type-grid">${Object.entries(restaurantTypes).map(([key,t])=>`<button type="button" class="restaurant-type-card ${key}" data-restaurant-type="${key}"><span class="restaurant-type-icon">${t.code}</span><span><b>${t.label}</b><small>${t.description}</small></span><em>فتح القائمة ←</em></button>`).join('')}</div>
 <div id="restaurantNeedsBox" class="restaurant-needs-box" hidden></div>
 <div class="catalog-divider"><span>أو تصفح حسب قسم المنتج</span></div>
 <div class="supply-groups" id="supplyGroups">${groups.map(g=>`<button type="button" class="supply-group${g.key==='الكل'?' active':''}" data-category="${g.key}"><span>${g.icon}</span><b>${g.label}</b><small>${g.key==='الكل'?products.length:products.filter(p=>p.category===g.key).length}</small></button>`).join('')}</div>
 <div class="supplies-toolbar"><input id="suppliesSearch" class="supplies-search" type="search" placeholder="ابحث عن منتج أو تصنيف..."><select id="suppliesCategory" class="category-filter">${groups.map(g=>`<option value="${g.key}">${g.label}</option>`).join('')}</select></div>
 <div class="catalog-layout"><div><div class="catalog-section-title"><div><h3 id="currentCategoryTitle">كل المنتجات</h3><small id="productsCount"></small></div><small>اختر الكمية ثم أضف إلى السلة</small></div><div id="suppliesProductGrid" class="product-grid"></div></div>
 <aside class="cart-panel"><div class="cart-head"><h3>سلة الشراء</h3><span id="cartCount" class="cart-count">0</span></div><div id="cartList" class="cart-list"></div><div class="cart-summary"><div class="cart-summary-row"><span>عدد الأصناف</span><strong id="cartKinds">0</strong></div><div class="cart-summary-row"><span>إجمالي الوحدات</span><strong id="cartUnits">0</strong></div></div><button id="reviewCartBtn" class="checkout-btn" type="button">مراجعة طلب التموينات</button><p id="cartPaymentNote" class="payment-note"></p></aside></div><div id="orderReviewBox" class="panel" style="display:none;margin-top:18px"></div>`;
 document.getElementById('suppliesSearch').oninput=e=>{search=e.target.value.trim();renderProducts()};
 document.getElementById('suppliesCategory').onchange=e=>setCategory(e.target.value);
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>setCategory(b.dataset.category));
 document.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>setFamily(b.dataset.family));
 document.querySelectorAll('[data-restaurant-type]').forEach(b=>b.onclick=()=>setRestaurantType(b.dataset.restaurantType));
 document.getElementById('reviewCartBtn').onclick=review;
 renderAll();
}
function setRestaurantType(value){
 restaurantType=value;family='';category='الكل';
 const sel=document.getElementById('suppliesCategory');if(sel)sel.value='الكل';
 document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category==='الكل'));
 document.querySelectorAll('[data-family]').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('[data-restaurant-type]').forEach(b=>b.classList.toggle('active',b.dataset.restaurantType===value));
 renderRestaurantNeeds();renderProducts();
 document.getElementById('restaurantNeedsBox')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function setFamily(value){
 family=value;restaurantType='';category='الكل';
 const sel=document.getElementById('suppliesCategory');if(sel)sel.value='الكل';
 document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category==='الكل'));
 document.querySelectorAll('[data-restaurant-type]').forEach(b=>b.classList.remove('active'));
 document.querySelectorAll('[data-family]').forEach(b=>b.classList.toggle('active',b.dataset.family===value));
 const needs=document.getElementById('restaurantNeedsBox');if(needs)needs.hidden=true;
 renderProducts();
 document.querySelector('.catalog-divider')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function setCategory(value){
 restaurantType='';family='';category=value;
 const sel=document.getElementById('suppliesCategory');if(sel)sel.value=value;
 document.querySelectorAll('[data-restaurant-type],[data-family]').forEach(b=>b.classList.remove('active'));
 const needs=document.getElementById('restaurantNeedsBox');if(needs)needs.hidden=true;
 document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===value));
 renderProducts();
}
function renderRestaurantNeeds(){
 const box=document.getElementById('restaurantNeedsBox');if(!box||!restaurantType)return;
 const t=restaurantTypes[restaurantType];const itemCount=t.needGroups.reduce((sum,g)=>sum+g.items.length,0);
 box.hidden=false;
 box.innerHTML=`<div class="needs-head"><div><p class="eyebrow">${t.code} • قائمة تشغيل جاهزة</p><h3>${t.label}</h3><p>${t.description}</p></div><span>${itemCount} مادة تشغيلية</span></div>
 <div class="needs-note">هذه قائمة مرجعية وليست كميات ثابتة. المنتجات المتوفرة تظهر في الكتالوج أدناه، وبقية الاحتياجات تدخل في عرض السعر حسب المنيو وعدد الطلبات اليومية.</div>
 <div class="needs-category-grid">${t.needGroups.map(g=>`<section><h4>${g.title}</h4><ul>${g.items.map(n=>`<li>✓ ${n}</li>`).join('')}</ul></section>`).join('')}</div>
 <div class="needs-actions"><button id="showProfileProducts" type="button">عرض ${t.productIds.length} منتجاً متوفراً</button><a href="https://wa.me/96550168888?text=${encodeURIComponent(t.quoteMessage)}" target="_blank" rel="noreferrer">طلب عرض سعر كامل عبر واتساب</a></div>`;
 document.getElementById('showProfileProducts').onclick=()=>document.querySelector('.catalog-layout')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderAll(){renderCredit();renderProducts();renderCart()}
function renderCredit(){const s=account(),note=document.getElementById('suppliesCreditNote'),p=document.getElementById('cartPaymentNote');if(!note||!p)return;if(s.locked){note.textContent='الكريدت موقوف حالياً. يمكنك الطلب بالدفع المباشر بدون مغادرة حسابك.';note.style.background='#fdeaea';note.style.color='#bb2c2c';p.textContent='طريقة الدفع المتاحة: دفع مباشر.'}else{note.textContent=`الكريدت متاح حتى ${Number(s.available||0).toFixed(3)} د.ك، ويمكنك أيضاً الدفع المباشر.`;note.style.background='var(--soft)';note.style.color='var(--ink)';p.textContent='طريقة الدفع: كريدت حسب الرصيد أو دفع مباشر.'}}
function renderProducts(){
 const grid=document.getElementById('suppliesProductGrid');if(!grid)return;
 const q=search.toLowerCase(),typeIds=restaurantType?new Set(restaurantTypes[restaurantType].productIds):null;
 const familyData=family?supplyFamilies.find(f=>f.key===family):null;
 const familyCategories=familyData?new Set(familyData.categories):null;
 const list=products.filter(p=>(!typeIds||typeIds.has(p.id))&&(!familyCategories||familyCategories.has(p.category))&&(category==='الكل'||p.category===category)&&(!q||`${p.name} ${p.category}`.toLowerCase().includes(q)));
 const title=restaurantType?restaurantTypes[restaurantType].label:familyData?familyData.label:(groups.find(g=>g.key===category)?.label||category);
 document.getElementById('currentCategoryTitle').textContent=title;
 document.getElementById('productsCount').textContent=`${list.length} منتج متوفر`;
 grid.innerHTML=list.map(p=>`<article class="product-card"><img src="${p.image}" alt="${p.name}" loading="lazy"><div class="product-card-body"><div class="product-meta"><span>${p.category}</span><span>الوحدة: ${p.unit}</span></div><h3>${p.name}</h3><small>حدد الكمية المطلوبة</small><div class="product-actions"><input class="qty-input" id="qty-${p.id}" type="number" min="1" value="1"><button class="add-cart-btn" data-add="${p.id}" type="button">إضافة إلى السلة</button></div></div></article>`).join('')||'<p class="muted">لا توجد منتجات مطابقة في هذه المجموعة.</p>';
 grid.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const id=b.dataset.add,q=Math.max(1,parseInt(document.getElementById(`qty-${id}`)?.value||'1',10)||1);cart[id]=(Number(cart[id])||0)+q;save();renderCart();flash(b,'تمت الإضافة')});
}
function renderCart(){const list=document.getElementById('cartList');if(!list)return;const items=selected();document.getElementById('cartCount').textContent=itemCount();document.getElementById('cartKinds').textContent=items.length;document.getElementById('cartUnits').textContent=itemCount();document.getElementById('reviewCartBtn').disabled=!items.length;list.innerHTML=items.length?items.map(p=>`<div class="cart-item"><div class="cart-item-top"><div><strong>${p.name}</strong><small>${p.category} • ${p.unit}</small></div><b>${cart[p.id]} ${p.unit}</b></div><div class="cart-item-controls"><button class="cart-mini-btn" data-minus="${p.id}">−</button><span>${cart[p.id]}</span><button class="cart-mini-btn" data-plus="${p.id}">+</button><button class="cart-remove" data-remove="${p.id}">حذف</button></div></div>`).join(''):'<div class="empty-cart">السلة فارغة.<br>أضف منتجات من إحدى المجموعات.</div>';list.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>change(b.dataset.minus,-1));list.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>change(b.dataset.plus,1));list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.remove];save();renderCart()})}
function change(id,d){cart[id]=Math.max(0,(Number(cart[id])||0)+d);if(!cart[id])delete cart[id];save();renderCart()}
function review(){const items=selected(),s=account(),box=document.getElementById('orderReviewBox');if(!items.length)return;box.style.display='block';box.innerHTML=`<div class="panel-head"><div><p class="eyebrow">مراجعة الطلب</p><h3>طلب تموينات جديد</h3></div><span class="status-pill ${s.locked?'locked':'safe'}">${s.locked?'دفع مباشر فقط':'الكريدت متاح'}</span></div><div class="table-wrap"><table><thead><tr><th>المنتج</th><th>التصنيف</th><th>الوحدة</th><th>الكمية</th></tr></thead><tbody>${items.map(p=>`<tr><td>${p.name}</td><td>${p.category}</td><td>${p.unit}</td><td>${cart[p.id]}</td></tr>`).join('')}</tbody></table></div><p class="muted">سيتم احتساب السعر المعتمد من خادم تموينات عند اعتماد الطلب.</p><div class="credit-actions">${s.locked?'':`<button id="confirmCreditOrder" class="primary-btn">اعتماد بالكريدت</button>`}<button id="confirmDirectOrder" class="secondary-btn">اعتماد بالدفع المباشر</button><button id="editSupplyCart" class="secondary-btn">تعديل السلة</button></div>`;if(document.getElementById('confirmCreditOrder'))document.getElementById('confirmCreditOrder').onclick=()=>submit('credit');document.getElementById('confirmDirectOrder').onclick=()=>submit('direct');document.getElementById('editSupplyCart').onclick=()=>box.style.display='none';box.scrollIntoView({behavior:'smooth',block:'start'})}
async function submit(paymentMethod){const box=document.getElementById('orderReviewBox'),api=window.TamweenatAPI?.api;if(!api){box.innerHTML='<p>جاري تجهيز الاتصال بالنظام، أعد المحاولة بعد لحظة.</p>';return}const items=selected().map(p=>({productId:p.id,qty:cart[p.id]}));box.innerHTML='<p>جاري اعتماد الطلب وحساب قيمته...</p>';try{const order=await api('/api/orders',{method:'POST',body:JSON.stringify({items,paymentMethod})});box.innerHTML=`<div class="panel-head"><div><p class="eyebrow">تم اعتماد الطلب</p><h3>${order.number}</h3></div><span class="status-pill safe">تم استلام الطلب</span></div><p><strong>القيمة:</strong> ${Number(order.total).toFixed(3)} د.ك</p><p><strong>طريقة الدفع:</strong> ${order.paymentMethod==='credit'?'كريدت':'دفع مباشر'}</p><p class="muted">أصبح الطلب ظاهراً في قسم تتبع الطلبات وفي لوحة إدارة تموينات.</p>`;cart={};save();renderCart();await window.TamweenatAPI.refresh()}catch(e){box.innerHTML=`<p style="color:#bb2c2c">تعذر اعتماد الطلب: ${e.message}</p>`}}
function flash(b,t){const old=b.textContent;b.textContent=t;b.disabled=true;setTimeout(()=>{b.textContent=old;b.disabled=false},800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
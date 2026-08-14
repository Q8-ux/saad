(()=>{
  const products=[
    {id:'chicken',name:'دجاج مبرد',category:'دواجن ولحوم',unit:'كجم',image:'./images/catalog/chicken.webp'},
    {id:'rice',name:'أرز بسمتي',category:'أرز وحبوب',unit:'كجم',image:'./images/real/rice.jpg'},
    {id:'oil',name:'زيت قلي',category:'زيوت',unit:'لتر',image:'./images/real/oil.jpg'},
    {id:'tomatoes',name:'طماطم',category:'خضار وفواكه',unit:'كجم',image:'./images/real/tomatoes.jpg'},
    {id:'onions',name:'بصل',category:'خضار وفواكه',unit:'كجم',image:'./images/real/onions.jpg'},
    {id:'potatoes',name:'بطاطا',category:'خضار وفواكه',unit:'كجم',image:'./images/real/potatoes.jpg'},
    {id:'garlic',name:'ثوم',category:'خضار وفواكه',unit:'كجم',image:'./images/real/garlic.jpg'},
    {id:'lemons',name:'ليمون',category:'خضار وفواكه',unit:'كجم',image:'./images/real/lemons.jpg'},
    {id:'cucumbers',name:'خيار',category:'خضار وفواكه',unit:'كجم',image:'./images/catalog/cucumbers.webp'},
    {id:'carrots',name:'جزر',category:'خضار وفواكه',unit:'كجم',image:'./images/catalog/carrots.webp'},
    {id:'peppers',name:'فلفل',category:'خضار وفواكه',unit:'كجم',image:'./images/catalog/peppers.webp'},
    {id:'flour',name:'طحين',category:'مخبوزات ومطابخ',unit:'كجم',image:'./images/catalog/flour.webp'},
    {id:'sugar',name:'سكر',category:'أساسيات',unit:'كجم',image:'./images/catalog/sugar.webp'},
    {id:'salt',name:'ملح',category:'أساسيات',unit:'كجم',image:'./images/catalog/salt.webp'},
    {id:'spices',name:'بهارات مشكلة',category:'توابل',unit:'كجم',image:'./images/catalog/spices.webp'},
    {id:'cardamom',name:'هيل',category:'توابل',unit:'كجم',image:'./images/catalog/cardamom.webp'},
    {id:'chickpeas',name:'حمص',category:'بقوليات',unit:'كجم',image:'./images/catalog/chickpeas.webp'},
    {id:'beans',name:'فاصوليا وحبوب',category:'بقوليات',unit:'كجم',image:'./images/catalog/beans.webp'},
    {id:'eggs',name:'بيض',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/eggs.webp'},
    {id:'dairy',name:'منتجات ألبان',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/dairy.webp'},
    {id:'cheese',name:'جبن',category:'ألبان وبيض',unit:'كرتون',image:'./images/catalog/cheese.webp'},
    {id:'water',name:'مياه',category:'مشروبات',unit:'كرتون',image:'./images/catalog/water.webp'},
    {id:'juice',name:'عصائر',category:'مشروبات',unit:'كرتون',image:'./images/catalog/juice.webp'},
    {id:'tea',name:'شاي',category:'مشروبات',unit:'كرتون',image:'./images/catalog/tea.webp'},
    {id:'coffee',name:'قهوة',category:'مشروبات',unit:'كرتون',image:'./images/catalog/coffee.webp'},
    {id:'cleaning',name:'مواد تنظيف',category:'تشغيل وتنظيف',unit:'كرتون',image:'./images/catalog/cleaning.webp'},
    {id:'canned',name:'مواد معلبة',category:'معلبات',unit:'كرتون',image:'./images/catalog/canned.webp'},
    {id:'frozen',name:'خضروات مجمدة',category:'مجمدات',unit:'كرتون',image:'./images/catalog/frozen-veg.webp'},
    {id:'fries',name:'بطاطا مجمدة',category:'مجمدات',unit:'كرتون',image:'./images/catalog/fries.webp'},
    {id:'tomato-paste',name:'معجون طماطم',category:'معلبات',unit:'كرتون',image:'./images/real/tomato-paste.jpg'}
  ];

  const session=(()=>{try{return JSON.parse(sessionStorage.getItem('tamweenatRestaurantSession')||'{}')}catch{return{}}})();
  const cartKey=`tamweenatCart:${session.username||'restaurant'}`;
  let cart=(()=>{try{return JSON.parse(localStorage.getItem(cartKey)||'{}')}catch{return{}}})();
  let search='';
  let category='الكل';

  const save=()=>localStorage.setItem(cartKey,JSON.stringify(cart));
  const itemCount=()=>Object.values(cart).reduce((s,n)=>s+Number(n||0),0);
  const selectedProducts=()=>products.filter(p=>cart[p.id]>0);
  const accountState=()=>window.ZadAccount?.get?.()||{};

  function mount(){
    const root=document.getElementById('supplies');
    if(!root)return;
    const categories=['الكل',...new Set(products.map(p=>p.category))];
    root.innerHTML=`
      <div class="section-title">
        <div><p class="eyebrow">التوريد المباشر</p><h2>طلب التموينات</h2></div>
        <div class="status-pill safe">داخل حساب المطعم</div>
      </div>
      <div id="suppliesCreditNote" class="gate-status"></div>
      <div class="supplies-toolbar">
        <input id="suppliesSearch" class="supplies-search" type="search" placeholder="ابحث عن منتج مثل أرز، زيت، طماطم..." />
        <select id="suppliesCategory" class="category-filter">${categories.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="catalog-layout">
        <div>
          <div class="catalog-section-title"><div><h3>قائمة المنتجات</h3><small id="productsCount"></small></div><small>اختر الكمية ثم أضف إلى السلة</small></div>
          <div id="suppliesProductGrid" class="product-grid"></div>
        </div>
        <aside class="cart-panel" aria-label="سلة شراء المطعم">
          <div class="cart-head"><h3>سلة الشراء</h3><span id="cartCount" class="cart-count">0</span></div>
          <div id="cartList" class="cart-list"></div>
          <div class="cart-summary">
            <div class="cart-summary-row"><span>عدد الأصناف</span><strong id="cartKinds">0</strong></div>
            <div class="cart-summary-row"><span>إجمالي الوحدات</span><strong id="cartUnits">0</strong></div>
          </div>
          <button id="reviewCartBtn" class="checkout-btn" type="button">مراجعة طلب التموينات</button>
          <p id="cartPaymentNote" class="payment-note"></p>
        </aside>
      </div>
      <div id="orderReviewBox" class="panel" style="display:none;margin-top:18px"></div>
    `;

    document.getElementById('suppliesSearch').addEventListener('input',e=>{search=e.target.value.trim();renderProducts()});
    document.getElementById('suppliesCategory').addEventListener('change',e=>{category=e.target.value;renderProducts()});
    document.getElementById('reviewCartBtn').addEventListener('click',reviewOrder);
    renderAll();
  }

  function renderAll(){renderCreditNote();renderProducts();renderCart()}

  function renderCreditNote(){
    const s=accountState();
    const note=document.getElementById('suppliesCreditNote');
    const payment=document.getElementById('cartPaymentNote');
    if(!note||!payment)return;
    if(s.locked){
      note.textContent='الكريدت موقوف حالياً. يمكنك الاستمرار في اختيار المنتجات وإرسال الطلب، وسيكون الدفع المباشر هو الطريقة المتاحة.';
      note.style.background='#fdeaea';note.style.color='#bb2c2c';
      payment.textContent='طريقة الدفع الحالية: دفع مباشر فقط.';
    }else{
      note.textContent=`الكريدت متاح. الرصيد المتاح للاستخدام: ${Number(s.available||0).toFixed(3)} د.ك. ويمكنك كذلك اختيار الدفع المباشر.`;
      note.style.background='var(--soft)';note.style.color='var(--ink)';
      payment.textContent='طريقة الدفع: الكريدت متاح حسب الرصيد، أو الدفع المباشر.';
    }
  }

  function renderProducts(){
    const grid=document.getElementById('suppliesProductGrid');
    if(!grid)return;
    const q=search.toLowerCase();
    const filtered=products.filter(p=>(category==='الكل'||p.category===category)&&(!q||`${p.name} ${p.category}`.toLowerCase().includes(q)));
    document.getElementById('productsCount').textContent=`${filtered.length} منتج`;
    grid.innerHTML=filtered.map(p=>`
      <article class="product-card">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        <div class="product-card-body">
          <div class="product-meta"><span>${p.category}</span><span>الوحدة: ${p.unit}</span></div>
          <h3>${p.name}</h3>
          <small>حدد الكمية المطلوبة للمطعم</small>
          <div class="product-actions">
            <input class="qty-input" id="qty-${p.id}" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="كمية ${p.name}" />
            <button class="add-cart-btn" type="button" data-add="${p.id}">إضافة إلى السلة</button>
          </div>
        </div>
      </article>
    `).join('')||'<p class="muted">لا توجد منتجات مطابقة للبحث.</p>';
    grid.querySelectorAll('[data-add]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.add;const input=document.getElementById(`qty-${id}`);const qty=Math.max(1,parseInt(input?.value||'1',10)||1);
      cart[id]=(Number(cart[id])||0)+qty;save();renderCart();flash(btn,'تمت الإضافة');
    }));
  }

  function renderCart(){
    const list=document.getElementById('cartList');
    if(!list)return;
    const selected=selectedProducts();
    document.getElementById('cartCount').textContent=itemCount();
    document.getElementById('cartKinds').textContent=selected.length;
    document.getElementById('cartUnits').textContent=itemCount();
    const review=document.getElementById('reviewCartBtn');
    review.disabled=!selected.length;
    list.innerHTML=selected.length?selected.map(p=>`
      <div class="cart-item">
        <div class="cart-item-top"><div><strong>${p.name}</strong><small> ${p.category} • ${p.unit}</small></div><b>${cart[p.id]} ${p.unit}</b></div>
        <div class="cart-item-controls">
          <button class="cart-mini-btn" data-minus="${p.id}" type="button">−</button>
          <span>${cart[p.id]}</span>
          <button class="cart-mini-btn" data-plus="${p.id}" type="button">+</button>
          <button class="cart-remove" data-remove="${p.id}" type="button">حذف</button>
        </div>
      </div>
    `).join(''):'<div class="empty-cart">السلة فارغة.<br>أضف منتجات من القائمة.</div>';
    list.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>change(b.dataset.minus,-1));
    list.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>change(b.dataset.plus,1));
    list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{delete cart[b.dataset.remove];save();renderCart()});
  }

  function change(id,delta){cart[id]=Math.max(0,(Number(cart[id])||0)+delta);if(!cart[id])delete cart[id];save();renderCart()}

  function reviewOrder(){
    const selected=selectedProducts();
    if(!selected.length)return;
    const s=accountState();
    const box=document.getElementById('orderReviewBox');
    const payMode=s.locked?'الدفع المباشر':'الكريدت أو الدفع المباشر';
    box.style.display='block';
    box.innerHTML=`
      <div class="panel-head"><div><p class="eyebrow">مراجعة الطلب</p><h3>طلب تموينات جديد</h3></div><span class="status-pill ${s.locked?'locked':'safe'}">${payMode}</span></div>
      <div class="table-wrap"><table><thead><tr><th>المنتج</th><th>التصنيف</th><th>الوحدة</th><th>الكمية</th></tr></thead><tbody>${selected.map(p=>`<tr><td>${p.name}</td><td>${p.category}</td><td>${p.unit}</td><td>${cart[p.id]}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted">سيتم تسعير الطلب وفق أسعار التوريد المعتمدة للمطعم عند تحويل السلة إلى طلب فعلي.</p>
      <div class="credit-actions"><button id="confirmSupplyDraft" class="primary-btn" type="button">حفظ كطلب تموينات</button><button id="editSupplyCart" class="secondary-btn" type="button">تعديل السلة</button></div>
    `;
    document.getElementById('confirmSupplyDraft').onclick=()=>{
      const draft={id:`TW-${Date.now().toString().slice(-8)}`,createdAt:new Date().toISOString(),restaurant:session.restaurantName||session.username,items:selected.map(p=>({id:p.id,name:p.name,unit:p.unit,qty:cart[p.id]})),paymentMode:s.locked?'direct':'credit-or-direct',status:'draft'};
      const key=`tamweenatSupplyDrafts:${session.username||'restaurant'}`;let drafts=[];try{drafts=JSON.parse(localStorage.getItem(key)||'[]')}catch{}drafts.unshift(draft);localStorage.setItem(key,JSON.stringify(drafts));
      box.innerHTML=`<div class="panel-head"><div><p class="eyebrow">تم حفظ الطلب</p><h3>${draft.id}</h3></div><span class="status-pill safe">مسودة طلب</span></div><p>تم حفظ سلة التموينات داخل حساب المطعم بنجاح.</p><p class="muted">عدد الأصناف: ${draft.items.length} • إجمالي الوحدات: ${itemCount()}</p>`;
      cart={};save();renderCart();
    };
    document.getElementById('editSupplyCart').onclick=()=>{box.style.display='none';document.querySelector('.supplies-search')?.scrollIntoView({behavior:'smooth',block:'center'})};
    box.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function flash(btn,label){const old=btn.textContent;btn.textContent=label;btn.disabled=true;setTimeout(()=>{btn.textContent=old;btn.disabled=false},850)}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

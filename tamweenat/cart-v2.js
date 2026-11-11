/* Tamweenat basket v2 — persistent, quote-aware, no false order submission. */
(function () {
  'use strict';
  const STORAGE_KEY = 'tamweenat-basket-v2';
  const MAX_QTY = 9999;
  const basket = new Map();
  let products = [];
  let catalogScoped = false; // Non-vegetable items remain saved, but are hidden while scoped.
  const byId = id => document.getElementById(id);
  const drawer = byId('drawer');
  const lang = () => window.TamweenatI18n?.lang || 'ar';
  const tr = (ar, en, ur) => lang() === 'en' ? en : lang() === 'ur' ? ur : ar;
  const money = value => Number(value || 0).toFixed(3);
  const productId = product => String(product?.id || product?.sku || '');
  const nameOf = product => lang() === 'en' ? (product.nameEn || product.name || productId(product)) :
    lang() === 'ur' ? (product.nameUr || product.name || productId(product)) :
    (product.name || product.nameEn || productId(product));
  const priced = product => !!product && product.priceStatus === 'observed_market_price' &&
    Number.isFinite(Number(product.price)) && Number(product.price) > 0;
  const quantity = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(MAX_QTY, Math.trunc(n))) : 1;
  };
  function load() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return;
      for (const item of saved) {
        if (item && typeof item.id === 'string' && item.id.length <= 100 &&
            Number.isInteger(item.qty) && item.qty > 0 && item.qty <= MAX_QTY) {
          basket.set(item.id, item.qty);
        }
      }
    } catch (_) { /* Browsers may disable storage. In-memory basket still works. */ }
  }
  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(
        [...basket].map(([id, qty]) => ({id, qty}))
      ));
    } catch (_) { /* Preserve in-memory basket when storage is unavailable. */ }
  }
  function productFor(id) { return products.find(p => productId(p) === id); }
  function visibleItems() { return [...basket].filter(([id]) => !catalogScoped || !!productFor(id)); }
  function setText(id, value) { const element = byId(id); if (element) element.textContent = value; }
  function status(message) { setText('cartStatus', message); }
  function makeButton(label, aria, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', aria);
    button.addEventListener('click', action);
    return button;
  }
  function update(id, qty) {
    if (!basket.has(id)) return;
    if (Number(qty) <= 0) basket.delete(id);
    else basket.set(id, quantity(qty));
    save();
    render();
  }
  function render() {
    const items = visibleItems().map(([id, qty]) => ({id, qty, product: productFor(id)}));
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const total = items.reduce((sum, item) => sum +
      (priced(item.product) ? Number(item.product.price) * item.qty : 0), 0);
    const quoteCount = items.filter(item => !priced(item.product)).length;
    setText('cartCopy', tr('نسخ قائمة الطلب','Copy draft','فہرست کاپی کریں'));
    setText('cartDownload', tr('تنزيل قائمة الطلب','Download draft','فہرست ڈاؤن لوڈ کریں'));
    setText('cartClear', tr('إفراغ السلة','Clear basket','ٹوکری خالی کریں'));
    setText('cartCount', String(count));
    setText('barCount', String(count));
    setText('barTotal', money(total));
    setText('cartTotal', money(total));
    setText('cartPricingNotice', quoteCount ?
      tr('يوجد ' + quoteCount + ' صنف بدون سعر موثق؛ الإجمالي يشمل الأصناف المسعّرة فقط.',
         quoteCount + ' items need a quotation. Total includes priced items only.',
         quoteCount + ' اشیا کی قیمت درکار ہے۔ کل رقم میں صرف قیمت والی اشیا شامل ہیں۔') :
      tr('الأسعار المعروضة استرشادية حتى اعتماد المورد.',
         'Displayed prices are indicative until supplier confirmation.',
         'سپلائر کی تصدیق تک قیمتیں ابتدائی ہیں۔'));
    const container = byId('cartItems');
    if (!container) return;
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = tr('السلة فارغة. أضف منتجات من الكتالوج.',
        'Your basket is empty. Add items from the catalog.',
        'ٹوکری خالی ہے۔ کیٹلاگ سے اشیا شامل کریں۔');
      container.append(empty);
    }
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'cartrow';
      const info = document.createElement('div');
      info.className = 'cart-product';
      const name = document.createElement('strong');
      name.textContent = item.product ? nameOf(item.product) : item.id;
      const detail = document.createElement('small');
      detail.className = 'muted';
      detail.textContent = priced(item.product) ?
        money(item.product.price) + ' ' + tr('د.ك للوحدة','KWD each','کویتی دینار فی عدد') :
        tr('يحتاج عرض سعر','Quotation required','قیمت درکار ہے');
      info.append(name, detail);
      const actions = document.createElement('div');
      actions.className = 'cart-quantity';
      actions.append(makeButton('−', tr('تقليل الكمية','Decrease quantity','مقدار کم کریں'),
        () => update(item.id, item.qty - 1)));
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.max = String(MAX_QTY);
      input.inputMode = 'numeric';
      input.value = String(item.qty);
      input.setAttribute('aria-label', tr('كمية ' + name.textContent,
        'Quantity of ' + name.textContent, 'مقدار ' + name.textContent));
      input.addEventListener('change', () => update(item.id, quantity(input.value)));
      actions.append(input);
      actions.append(makeButton('+', tr('زيادة الكمية','Increase quantity','مقدار بڑھائیں'),
        () => update(item.id, item.qty + 1)));
      actions.append(makeButton('×', tr('حذف المنتج','Remove item','آئٹم حذف کریں'),
        () => update(item.id, 0)));
      row.append(info, actions);
      container.append(row);
    }
    for (const id of ['cartCopy','cartDownload','cartClear']) {
      const button = byId(id);
      if (button) button.disabled = !items.length;
    }
  }
  function add(product, qty = 1) {
    const id = productId(product);
    if (!id || (catalogScoped && !productFor(id))) return false;
    const amount = quantity(qty);
    basket.set(id, Math.min(MAX_QTY, (basket.get(id) || 0) + amount));
    if (!products.some(p => productId(p) === id)) products.push(product);
    save();
    render();
    return true;
  }
  function openCart() {
    render();
    drawer.hidden = false;
    drawer.classList.add('open');
    drawer.style.setProperty('display', 'flex', 'important');
    document.body.classList.add('cart-is-open');
    byId('closeCart')?.focus();
  }
  function closeCart() {
    drawer.classList.remove('open');
    drawer.style.removeProperty('display');
    drawer.hidden = true;
    document.body.classList.remove('cart-is-open');
  }
  function orderText() {
    const lines = visibleItems().map(([id, qty], index) => {
      const product = productFor(id);
      const name = product ? nameOf(product) : id;
      const price = priced(product) ? money(Number(product.price) * qty) + ' د.ك' :
        tr('يحتاج عرض سعر','Quotation required','قیمت درکار ہے');
      return (index + 1) + '. ' + name + ' × ' + qty + ' — ' + price;
    });
    const total = visibleItems().reduce((sum, [id, qty]) => {
      const product = productFor(id);
      return sum + (priced(product) ? Number(product.price) * qty : 0);
    }, 0);
    return [tr('مسودة طلب توريد — تموينات','Supply request draft — Tamweenat',
      'سامان کی درخواست — تموینات'), ...lines,
      tr('الإجمالي الجزئي للأصناف المسعّرة: ','Subtotal for priced items: ',
        'قیمت والی اشیا کا مجموعہ: ') + money(total) + ' د.ك',
      tr('هذه مسودة غير مرسلة. الأسعار والتوافر يحتاجان تأكيد المورد.',
        'This draft has not been submitted. Supplier must confirm prices and availability.',
        'یہ درخواست ارسال نہیں ہوئی۔ سپلائر قیمت اور دستیابی کی تصدیق کرے۔')
    ].join('\n');
  }
  async function copyOrder() {
    try {
      if (!navigator.clipboard?.writeText) throw Error('clipboard unavailable');
      await navigator.clipboard.writeText(orderText());
      status(tr('تم نسخ قائمة الطلب. لم يتم إرسال طلب للمورد.',
        'Draft copied. No order has been submitted.',
        'فہرست کاپی ہوگئی۔ آرڈر نہیں بھیجا گیا۔'));
    } catch (_) {
      status(tr('تعذر النسخ. استخدم زر تنزيل قائمة الطلب.',
        'Copy failed. Use Download draft instead.',
        'کاپی ناکام۔ ڈاؤن لوڈ کا بٹن استعمال کریں۔'));
    }
  }
  function downloadOrder() {
    const file = new Blob([orderText()], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tamweenat-order-draft.txt';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status(tr('تم تنزيل مسودة الطلب. لم يتم إرسالها للمورد.',
      'Draft downloaded. No order has been submitted.',
      'مسودہ ڈاؤن لوڈ ہوگیا۔ آرڈر نہیں بھیجا گیا۔'));
  }
  load();
  byId('cartTop')?.addEventListener('click', openCart);
  byId('openCart')?.addEventListener('click', openCart);
  byId('closeCart')?.addEventListener('click', closeCart);
  byId('cartCopy')?.addEventListener('click', copyOrder);
  byId('cartDownload')?.addEventListener('click', downloadOrder);
  byId('cartClear')?.addEventListener('click', () => {
    if (catalogScoped) { for (const [id] of visibleItems()) basket.delete(id); }
    else basket.clear();
    save();
    render();
    status(tr('تم إفراغ السلة.','Basket cleared.','ٹوکری خالی کردی گئی۔'));
  });
  drawer?.addEventListener('click', event => { if (event.target === drawer) closeCart(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !drawer.hidden) closeCart();
  });
  window.addEventListener('tamweenat:open-cart', openCart);
  window.addEventListener('tamweenat-language-change', render);
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) { basket.clear(); load(); render(); }
  });
  window.TamweenatStore = {
    get products() { return products; },
    setProducts(list, options = {}) { products = Array.isArray(list) ? list : []; catalogScoped = options.visibleOnly === true; render(); },
    add, openCart, closeCart, getOrderText: orderText,
    getCart() { return visibleItems().map(([id, qty]) => ({id, qty})); },
    clear() { if (catalogScoped) { for (const [id] of visibleItems()) basket.delete(id); } else basket.clear(); save(); render(); }
  };
  render();
})();

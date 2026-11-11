const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../cart-v2.js'), 'utf8');
const storefront = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const inlineCatalog = storefront.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inlineCatalog, 'Storefront catalog script must exist');
new vm.Script(inlineCatalog[1]); // Fail on broken inline JavaScript.
assert.ok(storefront.includes('window.TamweenatStore.add(p,1)'));
assert.ok(storefront.includes('window.TamweenatStore.openCart()'));
assert.ok(storefront.indexOf('src="./cart-v2.js') < storefront.indexOf('<script>(()=>{'));

function makeHarness(storage = new Map()) {
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.events = {};
      this.attrs = {};
      this.hidden = tag === 'drawer';
      this.value = '';
      this.textContent = '';
      this.className = '';
      this.style = {setProperty: () => {}, removeProperty: () => {}};
      const classes = new Set();
      this.classList = {add: value => classes.add(value), remove: value => classes.delete(value),
        contains: value => classes.has(value)};
    }
    addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
    dispatch(name, event = {}) { for (const fn of this.events[name] || []) fn({target: this, ...event}); }
    click() { this.dispatch('click'); }
    setAttribute(name, value) { this.attrs[name] = value; }
    append(...elements) { this.children.push(...elements); }
    replaceChildren(...elements) { this.children = elements; }
    focus() {}
    remove() {}
  }
  const ids = new Map();
  for (const id of ['drawer','cartTop','openCart','closeCart','cartCount','barCount','barTotal',
    'cartTotal','cartItems','cartPricingNotice','cartStatus','cartCopy','cartDownload','cartClear']) {
    ids.set(id, new Element(id));
  }
  ids.get('drawer').hidden = true;
  const body = new Element('body');
  const document = {
    body, getElementById: id => ids.get(id) || null,
    createElement: tag => new Element(tag),
    events: {}, addEventListener(name, callback) { (this.events[name] ||= []).push(callback); },
    dispatch(name, event) { for (const fn of this.events[name] || []) fn(event); }
  };
  const window = {
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value)
    },
    events: {}, addEventListener(name, callback) { (this.events[name] ||= []).push(callback); },
    dispatch(name, event) { for (const fn of this.events[name] || []) fn(event); }
  };
  vm.runInNewContext(source, {window, document, navigator: {}, Blob, URL, console}, {timeout: 1000});
  return {window, document, ids, storage};
}
const h = makeHarness();
const store = h.window.TamweenatStore;
assert.ok(store && typeof store.add === 'function');
h.ids.get('cartTop').click();
assert.equal(h.ids.get('drawer').hidden, false);
assert.ok(h.ids.get('drawer').classList.contains('open'));
h.ids.get('closeCart').click();
assert.equal(h.ids.get('drawer').hidden, true);
const priced = {id: 'SKU-1', name: 'برجر', nameEn: 'Burger', price: 1.25,
  priceStatus: 'observed_market_price'};
const quote = {id: 'SKU-2', name: 'علب تغليف', nameEn: 'Boxes', price: null,
  priceStatus: 'quote_required'};
store.setProducts([priced, quote]);
assert.equal(store.add(priced, 2), true);
assert.equal(store.add(quote, 3), true);
assert.equal(h.ids.get('cartCount').textContent, '5');
assert.equal(h.ids.get('barTotal').textContent, '2.500');
assert.match(h.ids.get('cartPricingNotice').textContent, /بدون سعر/);
assert.match(store.getOrderText(), /مسودة طلب توريد/);
assert.match(store.getOrderText(), /غير مرسلة/);
const rows = h.ids.get('cartItems').children;
assert.equal(rows.length, 2);
rows[0].children[1].children[2].click(); // Plus
assert.equal(h.ids.get('cartCount').textContent, '6');
rows[1].children[1].children[3].click(); // Remove unpriced item
assert.equal(h.ids.get('cartCount').textContent, '3');
const h2 = makeHarness(h.storage);
h2.window.TamweenatStore.setProducts([priced, quote]);
assert.equal(h2.ids.get('cartCount').textContent, '3');
assert.equal(h2.ids.get('barTotal').textContent, '3.750');
h2.ids.get('openCart').click();
assert.equal(h2.ids.get('drawer').hidden, false);
h2.document.dispatch('keydown', {key: 'Escape'});
assert.equal(h2.ids.get('drawer').hidden, true);
h2.window.TamweenatStore.clear();
assert.equal(h2.ids.get('cartCount').textContent, '0');
console.log('Tamweenat cart v2: open, close, add, quote, quantity, remove, persistence and clear PASS');

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../../sabeq-legal/commerce-client.js'), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function flush() { for (let i = 0; i < 4; i++) await tick(); }
function page(t, respond) {
  const dom = new JSDOM('<!doctype html><html lang="ar"><head></head><body><div class="header-actions"></div></body></html>', { url:'https://www.sabeq.legal/', runScripts:'outside-only' });
  const w = dom.window;
  const observers = []; const NativeObserver = w.MutationObserver;
  w.MutationObserver = class extends NativeObserver { constructor(callback) { super(callback); observers.push(this); } };
  Object.assign(w, { Headers, Request, Response, AbortSignal, TextEncoder });
  Object.defineProperty(w, 'crypto', { value:crypto.webcrypto });
  // jsdom does not implement the browser's native modal top layer.
  w.HTMLDialogElement.prototype.showModal = function() { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function() { this.removeAttribute('open'); this.dispatchEvent(new w.Event('close')); };
  w.fetch = async (input, init = {}) => {
    const result = await respond(new URL(String(input)).pathname, init);
    return new Response(JSON.stringify(result.body), { status:result.status || 200, headers:{'Content-Type':'application/json'} });
  };
  w.eval(source);
  t.after(() => { observers.forEach(observer => observer.disconnect()); w.close(); });
  return w;
}

test('verification UI sends the chosen contact and accepts a server-issued session', async t => {
  const calls = [];
  const w = page(t, async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : {};
    calls.push({url,body});
    if (url.endsWith('/config')) return {body:{channels:['email']}};
    if (url.endsWith('/request-code')) return {body:{challengeId:crypto.randomUUID(),retryAfter:60,maskedContact:'qa***@example.test'}};
    if (url.endsWith('/verify-code')) return {body:{token:'synthetic-unit-test-session',user:{id:'unit-user',emailVerified:true}}};
    throw new Error('unexpected request: ' + url);
  });
  const login = w.SabeqCommerce.login();await flush();
  w.document.querySelector('[name=name]').value='عميل الاختبار';
  w.document.querySelector('[name=email]').value='qa@example.test';
  w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
  assert.ok(w.document.body.textContent.includes('qa***@example.test'));
  assert.equal(calls[1].body.channel,'email');
  w.document.querySelector('[name=code]').value='123456';
  w.document.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal((await login).user.id,'unit-user');
  assert.equal(w.sessionStorage.getItem('sabeq-session-token'),'synthetic-unit-test-session');
  assert.equal(w.document.querySelector('dialog'),null);
});

test('memo UI requires an order, presents the server price, and returns the stored result', async t => {
  const id=crypto.randomUUID();let completed=false;const calls=[];
  const draft={court:'<img src=x onerror=alert(1)>',clientName:'اختبار',caseType:'مدني'};
  const order=()=>({id,amountFils:1500,paymentStatus:completed?'paid':'unpaid',generationStatus:completed?'completed':'waiting',draft,...(completed?{result:{memo:'نتيجة محفوظة',sources:[]}}:{})});
  const w=page(t,async(url,init)=>{
    calls.push(url);
    if(url.endsWith('/session'))return{body:{user:{id:'unit-user'}}};
    if(url.endsWith('/config'))return{body:{channels:['email'],paymentReady:true}};
    if(url==='/api/orders')return{status:201,body:{order:order()}};
    if(url==='/api/orders/'+id)return{body:{order:order(),files:[]}};
    throw new Error('unexpected request: '+url);
  });
  w.sessionStorage.setItem('sabeq-session-token','synthetic-unit-test-session');
  const pending=w.fetch('https://sabeq-legal-research-api.onrender.com/api/legal/memo',{method:'POST',body:JSON.stringify(draft)});
  await flush();await flush();
  assert.ok(w.document.body.textContent.includes('1.500 د.ك'));
  assert.ok(w.document.body.textContent.includes(draft.court));
  assert.equal(w.document.querySelector('img'),null);
  assert.match(w.document.querySelector('dialog .sc-primary').textContent,/دفع/);
  w.document.querySelector('dialog').close();
  assert.equal((await pending).status,400);
  assert.ok(!calls.includes('/api/legal/memo'));
  completed=true;
  assert.equal((await w.SabeqCommerce.showOrder(id)).memo,'نتيجة محفوظة');
  assert.equal(calls.filter(x=>x==='/api/orders').length,1);
});

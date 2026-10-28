import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(path,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,require:name=>name in deps?deps[name]:require(name),URL,Intl});return exports;}
const client=load('../lib/sadad-client.ts');
const Dialog=load('../app/memo-payment-dialog.tsx',{'@/lib/sadad-client':client}).default;
const payment={id:'synthetic-checkout',checkoutUrl:'https://sadadpay.net/pay/synthetic-key',status:'pending',priceFils:50000,currency:'KWD',environment:'live'};
const render=(change={},language='ar')=>renderToStaticMarkup(React.createElement(Dialog,{payment:{...payment,...change},paymentToken:'synthetic-token',language,request:()=>assert.fail('render must not request payment'),onPayment:()=>assert.fail('render must not confirm payment'),onClose(){}}));
test('pending checkout shows the server fee, hosted payment and return/check controls without card fields',()=>{
 const html=render();assert.match(html,/إتمام الدفع/);assert.match(html,/sadadpay.net\/pay\/synthetic-key/);assert.match(html,/50\.000/);assert.match(html,/العودة إلى مراجعة الطلب/);assert.match(html,/التحقق من حالة الدفع/);assert.doesNotMatch(html,/<input|cardnumber|credit-card|إتمام الدفع التجريبي/);
});
test('verified checkout removes the payment link and offers return to generate explicitly',()=>{
 const html=render({status:'paid'});assert.doesNotMatch(html,/href=/);assert.match(html,/تأكد الدفع/);assert.match(html,/لمتابعة توليد المذكرة/);
});
test('checkout rejects untrusted URLs and preserves sandbox and language directions',()=>{
 assert.doesNotMatch(render({checkoutUrl:'https://attacker.example/pay/key'}),/href=/);
 assert.match(render({environment:'sandbox',checkoutUrl:'https://sandbox.sadadpay.net/pay/test'}),/بيئة اختبار/);
 assert.match(render({},'en'),/dir="ltr"/);assert.match(render({},'ur'),/dir="rtl"/);
});
test('internal mock checkout shows fifty dinars and all three simulations without a card or gateway link',()=>{
 const html=render({provider:'mock',environment:'mock',checkoutUrl:'https://sadadpay.net/pay/should-not-open'});
 assert.match(html,/وضع تجريبي — لن يتم خصم أي مبلغ/);assert.match(html,/50\.000/);
 for(const label of ['محاكاة نجاح الدفع','محاكاة فشل الدفع','محاكاة إلغاء العملية'])assert.ok(html.includes(label));
 assert.doesNotMatch(html,/href=|<input|should-not-open/);
 for(const language of ['en','ur'])assert.doesNotMatch(render({provider:'mock',environment:'mock'},language),/href=|<input/);
});

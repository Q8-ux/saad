import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, dependencies={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>dependencies[name],URL,Response,Error});
 return exports;
}
const procedure=load('../lib/procedural-position.ts');
const {recogniseMemoProcedure}=load('../lib/memo-journey.ts',{'./procedural-position':procedure});
const {safeSadadCheckoutUrl,readExistingSadadCheckout}=load('../lib/sadad-client.ts');
const facts='أنا المدعى عليه في دعوى مطالبة. استأنف المدعي الحكم.';
test('story supplies the current procedural fields without discarding the draft',()=>{
 const result=recogniseMemoProcedure({facts,requests:'رفض الاستئناف',conversationTranscript:'synthetic retained conversation',clientName:'طرف اصطناعي'});
 assert.equal(result.fields.partyRole,'مستأنف ضده');assert.equal(result.fields.court,'محكمة الاستئناف');assert.equal(result.fields.conversationTranscript,'synthetic retained conversation');
});
test('later facts replace only earlier automatic values and clear the old court circuit',()=>{
 const previous={partyRole:'مستأنف ضده',court:'محكمة الاستئناف'};
 const result=recogniseMemoProcedure({...previous,courtCircuit:'دائرة سابقة',facts:'أنا المدعى عليه. طعن الخصم بالتمييز على الحكم.'},previous);
 assert.equal(result.fields.partyRole,'مطعون ضده');assert.equal(result.fields.court,'محكمة التمييز');assert.equal(result.fields.courtCircuit,'');
});
test('manual corrections survive recognition and do not become automatic values',()=>{
 const result=recogniseMemoProcedure({facts,partyRole:'صفة راجعها المستخدم',court:'محكمة راجعها المستخدم'},{partyRole:'مدعٍ',court:'المحكمة الكلية'});
 assert.equal(result.fields.partyRole,'صفة راجعها المستخدم');assert.equal(result.fields.court,'محكمة راجعها المستخدم');assert.equal(Object.keys(result.automatic).length,0);
});
test('removing the actor clears stale automatic roles rather than guessing',()=>{
 const old={partyRole:'مستأنف ضده',court:'محكمة الاستئناف'};
 const result=recogniseMemoProcedure({...old,facts:'القضية منظورة أمام محكمة الاستئناف.'},old);
 assert.equal(result.fields.partyRole,'');assert.equal(result.fields.court,'');assert.equal(result.position.needsActor,true);
});
test('checkout accepts only the matching hosted SADAD environment',()=>{
 const payment={environment:'live',checkoutUrl:'https://sadadpay.net/pay/synthetic-key'};
 assert.equal(safeSadadCheckoutUrl(payment),payment.checkoutUrl);
 assert.equal(safeSadadCheckoutUrl({...payment,checkoutUrl:'https://sadadpay.net/pay/opaque%2Bkey%3D'}),'https://sadadpay.net/pay/opaque%2Bkey%3D');
 assert.equal(safeSadadCheckoutUrl({...payment,environment:'sandbox'}),null);
 assert.equal(safeSadadCheckoutUrl({...payment,environment:'sandbox',checkoutUrl:'https://sandbox.sadadpay.net/pay/test_key'}),'https://sandbox.sadadpay.net/pay/test_key');
 for(const checkoutUrl of ['javascript:alert(1)','http://sadadpay.net/pay/x','https://sadadpay.net.attacker.example/pay/x','https://attacker.example/pay/x','https://user@ sadadpay.net/pay/x','https://sadadpay.net:444/pay/x','https://sadadpay.net/pay/x?redirect=https://attacker.example']) assert.equal(safeSadadCheckoutUrl({...payment,checkoutUrl}),null,checkoutUrl);
});

test('rechecking a checkout always reads the same attempt and never creates an invoice',async()=>{
 const calls=[];const attempt={attemptId:'synthetic-attempt',paymentToken:'synthetic-token'};
 const request=async(...args)=>{calls.push(args);return Response.json({id:attempt.attemptId,status:'pending',priceFils:5000,currency:'KWD',environment:'sandbox'});};
 await readExistingSadadCheckout(request,attempt);await readExistingSadadCheckout(request,attempt);
 assert.equal(calls.length,2);for(const [url,token,init] of calls){assert.equal(url,'/api/payments/sadad?id=synthetic-attempt');assert.equal(token,attempt.paymentToken);assert.equal(init.method,'GET');assert.equal(init.body,undefined);}
 await assert.rejects(readExistingSadadCheckout(async()=>Response.json({id:'other-attempt',status:'paid'}),attempt),/PAYMENT_STATUS_UNAVAILABLE/);
 await assert.rejects(readExistingSadadCheckout(async()=>Response.json({error:'unavailable'},{status:503}),attempt),/PAYMENT_STATUS_UNAVAILABLE/);
});

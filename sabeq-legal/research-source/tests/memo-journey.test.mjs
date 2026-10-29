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
const {importMemoFacts,importMemoDraft}=load('../lib/memo-handoff.ts');
const {recogniseMemoProcedure}=load('../lib/memo-journey.ts',{'./procedural-position':procedure});
const {safeSadadCheckoutUrl,readExistingSadadCheckout}=load('../lib/sadad-client.ts');
const facts='أنا المدعى عليه في دعوى مطالبة. استأنف المدعي الحكم.';
test('opening a memo imports structured case facts before the raw conversation',()=>{
 const messages=[{role:'user',content:'وقائع أولية اصطناعية'},{role:'assistant',content:'سؤال من المساعد لا يمثل واقعة'}];
 assert.equal(importMemoFacts('',{memoPrefill:{facts:'  وقائع منظمة راجعها المستخدم  '},facts:['قائمة أقدم']},messages),'وقائع منظمة راجعها المستخدم');
 assert.equal(importMemoFacts('',{memoPrefill:{facts:'  '},facts:[' واقعة أولى اصطناعية ','','واقعة ثانية اصطناعية']},messages),'واقعة أولى اصطناعية\nواقعة ثانية اصطناعية');
});
test('fallback facts come only from submitted visitor messages',()=>{
 const messages=[{role:'assistant',content:'تفسير قانوني افتراضي لا يُستورد'},{role:'user',content:'  واقعة اصطناعية أولى  '},{role:'assistant',content:'استنتاج افتراضي لا يُستورد'},{role:'user',content:'تصحيح اصطناعي للواقعة'}];
 assert.equal(importMemoFacts('',null,messages),'واقعة اصطناعية أولى\n\nتصحيح اصطناعي للواقعة');
 assert.equal(importMemoFacts('',null,[messages[0]]),'');
 assert.equal(importMemoFacts('',null,[]),'');
});
test('manual and document facts survive repeated openings and later assistant answers',()=>{
 const edited='  نص عدّله المستخدم أو استخرجه من مستند اصطناعي.\nمع تصحيح يدوي.  ';
 assert.equal(importMemoFacts(edited,{memoPrefill:{facts:'اقتراح أحدث مختلف'}},[{role:'user',content:'رسالة أخرى'}]),edited);
 const imported=importMemoFacts('',{facts:['وقائع اصطناعية من المحادثة']});
 assert.equal(importMemoFacts(imported,{facts:['وقائع لاحقة']}),imported);
});
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


test('assistant handoff has one editable review and no second Next screen',()=>{
 const journey=load('../lib/memo-journey.ts',{'./procedural-position':procedure});
 assert.equal(journey.initialMemoStep(true),1);
 assert.equal(journey.nextMemoStep(1,true),null);
 assert.equal(journey.nextMemoStep(0,true),1,'optional documents return to the same review');
 assert.equal(journey.initialMemoStep(false),0);
 assert.equal(journey.nextMemoStep(0,false),2);
 assert.equal(journey.nextMemoStep(1,false),2);
 assert.equal(journey.nextMemoStep(2,false),null);
});
test('short assistant review retains field validation, explicit approval and server payment checks',()=>{
 const ui=readFileSync(new URL('../app/sabeq-site.tsx',import.meta.url),'utf8');
 const wizard=ui.slice(ui.indexOf('function MemoWizard'));
 const submit=wizard.slice(wizard.indexOf('async function submit(event: FormEvent<HTMLFormElement>)'),wizard.indexOf('if (memo) return'));
 assert.match(submit,/nextMemoStep\(step, fromAssistant\)/);
 assert.match(submit,/if \(missing\)/);assert.match(submit,/setStep\(fromAssistant \? 1 : missing\[1\]\)/);
 assert.ok(submit.indexOf('if (missing)')<submit.indexOf('const policyResponse'));
 assert.match(wizard,/أوافق وأولّد المذكرة/);assert.match(wizard,/أوافق وأتابع للدفع والتوليد/);
 assert.match(wizard,/step === 0 \|\| assistantReview/);
 assert.match(submit,/currentPolicy.required \|\| paymentAttempt.current/);
 assert.match(submit,/if \(!\["paid", "consumed"\].includes\(payment.status\)\)/);
 assert.ok(submit.indexOf('payment.status')<submit.indexOf('runMemoGeneration'));
 assert.match(submit,/if \(!memoApproved && !assistantReview\)/);
 assert.match(wizard,/!assistantReview && <label className="memo-generation-approval"/);
 assert.match(wizard,/step > 0 && !assistantReview/);
});


test('all memo entry points import existing requests, names and case details, not just facts',()=>{
 const state={memoPrefill:{facts:'وقائع اصطناعية سبق ذكرها',requests:'رد المبلغ الاصطناعي',clientName:'اسم اصطناعي أول',otherParty:'اسم اصطناعي ثان',partyRole:'مدعٍ',caseNumber:'SYN-123'},memoFields:{caseNumber:'',clientAddress:'عنوان اصطناعي'},caseType:'مدني',court:'المحكمة الكلية',courtCircuit:'الدائرة الاصطناعية',caseSummary:'ملخص اصطناعي',parties:[{name:'اسم اصطناعي أول',role:'مدعٍ'}]};
 const messages=[{role:'user',content:'معلومات اصطناعية سبق ذكرها'},{role:'assistant',content:'لا تتحول إجابة المساعد إلى واقعة'}];
 const draft=importMemoDraft({},state,messages);
 for(const [key,value] of Object.entries({...state.memoPrefill,clientAddress:state.memoFields.clientAddress,caseType:state.caseType,court:state.court,courtCircuit:state.courtCircuit}))assert.equal(draft[key],value,key);
 assert.match(draft.conversationTranscript,/معلومات اصطناعية سبق ذكرها/);
 assert.equal(draft.conversationSummary,state.caseSummary);
 assert.equal(draft.allParties,'اسم اصطناعي أول — مدعٍ');
});
test('reviewed form values survive assistant imports and repeated payment entry',()=>{
 const current={facts:'وقائع صححها المستخدم',requests:'طلب راجعه المستخدم',clientName:'اسم معدل اصطناعي',caseNumber:'SYN-CORRECTED',caseStory:'نص احتفظ به المستخدم'};
 const state={memoPrefill:{facts:'وقائع أخرى',requests:'طلب آخر',clientName:'اسم آخر',court:'المحكمة الكلية'},memoFields:{caseNumber:'SYN-OLD'}};
 const draft=importMemoDraft(current,state);
 for(const [key,value] of Object.entries(current))assert.equal(draft[key],value,key);
 assert.equal(draft.court,'المحكمة الكلية');
 assert.deepEqual(importMemoDraft(draft,state),draft);
});
test('unstructured conversation retains visitor text and leaves unknown fields missing',()=>{
 const draft=importMemoDraft({},null,[{role:'user',content:'واقعة اصطناعية دون أسماء أو طلب محدد'},{role:'assistant',content:'استنتاج ليس واقعة'}]);
 assert.equal(draft.facts,'واقعة اصطناعية دون أسماء أو طلب محدد');
 assert.equal(draft.requests,undefined);assert.equal(draft.clientName,undefined);assert.equal(draft.court,undefined);
 assert.equal(importMemoDraft({},null,[{role:'assistant',content:'رد فقط'}]).conversationTranscript,undefined);
});

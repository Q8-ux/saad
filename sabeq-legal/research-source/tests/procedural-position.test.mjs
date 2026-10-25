import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/procedural-position.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {inferProceduralPosition:infer,applyProceduralPosition:apply}=exports;
const cases=[
 ['أنا المدعى عليه في دعوى مطالبة. صدر حكم من المحكمة الكلية واستأنف المدعي الحكم. أريد مذكرة بدفاع للرد على استئناف المدعي.','مستأنف ضده','محكمة الاستئناف'],
 ['أنا المدعي واستأنف المدعى عليه الحكم.','مستأنف ضده','محكمة الاستئناف'],
 ['أنا المدعى عليه وقد استأنفت الحكم.','مستأنف','محكمة الاستئناف'],
 ['أنا المدعي. قدمت استئنافاً على الحكم.','مستأنف','محكمة الاستئناف'],
 ['أنا المدعى عليه. طعن المدعي بالتمييز على الحكم.','مطعون ضده','محكمة التمييز'],
 ['أنا المدعي. قدمت طعناً بالتمييز على الحكم.','طاعن','محكمة التمييز'],
 ['أنا المدعية في القضية المنظورة أمام المحكمة الكلية.','مدعية','المحكمة الكلية'],
 ['موكلي المدعى عليه في القضية المنظورة أمام المحكمة الكلية.','مدعى عليه','المحكمة الكلية'],
 ['أنا المستأنف ضده في القضية.','مستأنف ضده','محكمة الاستئناف'],
 ['أنا المدعى عليه واستأنفت الحكم ثم طعن الخصم بالتمييز.','مطعون ضده','محكمة التمييز'],
 ['أنا لست المدعي. أنا المدعى عليه في القضية.','مدعى عليه',''],
 ['أنا المدعى عليه. لم أستأنف الحكم.','مدعى عليه',''],
 ['أنا المدعى عليه. إذا استأنف المدعي سأرد عليه.','مدعى عليه',''],
 ['أنا المدعى عليه وأستند إلى حكم تمييز في مذكرتي.','مدعى عليه',''],
 ['صدر حكم من المحكمة الكلية. أريد فهم الحكم.','',''],
 ['قال المدعي إن المدعى عليه مدين.','',''],
 ['I am the defendant.','',''],
];
// English role extraction is canonical Arabic, just like the existing model contract.
cases[cases.length-1][1]='مدعى عليه';
for(const [facts,role,court] of cases)test('procedure: '+facts,()=>{const value=infer(facts);assert.equal(value.partyRole,role);assert.equal(value.court,court);assert.equal(value.conflict,false);});
test('named appeal actors are tied to the identified client instead of the first name',()=>{const value=infer('استأنف أحمد الحكم الصادر من المحكمة الكلية.','محمد','أحمد');assert.equal(value.partyRole,'مستأنف ضده');assert.equal(value.court,'محكمة الاستئناف');assert.ok(value.evidence.length);});
test('pending appeal with no identified actor requires a factual clarification',()=>{const value=infer('أنا المدعى عليه والدعوى منظورة أمام محكمة الاستئناف.');assert.equal(value.partyRole,'');assert.equal(value.needsActor,true);assert.equal(value.court,'محكمة الاستئناف');});
test('contradictory roles and cross appeals do not choose a side silently',()=>{for(const facts of ['أنا المدعي. أنا المدعى عليه.','أنا المدعي. استأنفت الحكم واستأنف الخصم الحكم.']){const value=infer(facts);assert.equal(value.conflict,true);assert.equal(value.partyRole,'');}});
test('server enrichment corrects the client role and keeps other parties and source readiness intact',()=>{
 const state={court:'المحكمة الكلية',courtCircuit:'دائرة سابقة',readyForMemo:false,phase:'review',parties:[{name:'الخصم الاصطناعي',role:'مدعٍ'},{name:'الموكل الاصطناعي',role:'مدعٍ'}],memoPrefill:{clientName:'الموكل الاصطناعي',otherParty:'الخصم الاصطناعي',partyRole:'مدعٍ',court:'المحكمة الكلية'}};
 const value=apply(state,'أنا المدعى عليه واستأنف المدعي الحكم.');assert.equal(value.memoPrefill.partyRole,'مستأنف ضده');assert.equal(value.parties[0].role,'مدعٍ');assert.equal(value.parties[1].role,'مستأنف ضده');assert.equal(value.readyForMemo,false);assert.equal(value.courtCircuit,'');
});

test('female procedural roles follow the represented party and do not cause a false conflict', () => {
 const result = infer('أنا المدعية. استأنفت الحكم.');
 assert.equal(result.partyRole,'مستأنفة');assert.equal(result.conflict,false);
 const reply = infer('أنا المدعى عليها. طعن الخصم بالتمييز على الحكم.');
 assert.equal(reply.partyRole,'مطعون ضدها');assert.equal(reply.court,'محكمة التمييز');
});
test('an appeal in another case cannot replace the stated current forum', () => {
 const result = infer('أنا المدعي. سبق أن طعن الخصم بالتمييز في قضية أخرى. الدعوى الحالية منظورة أمام المحكمة الكلية.');
 assert.equal(result.partyRole,'مدعٍ');assert.equal(result.court,'المحكمة الكلية');
});

test('filing against an opponent and being sued are separate factual roles',()=>{
 for(const text of ['رفعت دعوى على خصمي للمطالبة بالمبلغ.','أقمت دعوى ضد الخصم.']) { const result=infer(text);assert.equal(result.partyRole,'مدعٍ',text);assert.equal(result.conflict,false);assert.equal(result.court,''); }
 for(const text of ['رفع خصمي علي دعوى مطالبة.','أقام المدعي دعوى ضدي.','رُفعت علي دعوى.']) { const result=infer(text);assert.equal(result.partyRole,'مدعى عليه',text);assert.equal(result.conflict,false); }
});

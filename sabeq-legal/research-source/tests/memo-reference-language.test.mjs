import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const {arabicMemoInput}=load('../lib/memo-language.ts');
const base={clientName:'طرف اختبار ألف',otherParty:'طرف اختبار باء',facts:'قضية اصطناعية رقم QA-DEFENSE-20261107 بشأن مبلغ 1000 دينار.',requests:'رفض المطالبة بالمبلغ الذي يثبت سداده.'};
test('a Latin case reference does not trigger translation of an otherwise Arabic case',async()=>{
 let calls=0;const result=await arabicMemoInput(base,async()=>{calls++;throw Error('unnecessary translation');});
 assert.equal(calls,0);assert.equal(result.facts,base.facts);
});
test('real English prose is translated while case identifiers remain literal',async()=>{
 const input={...base,caseNumber:'A12',facts:'The disputed case A12 references CV-001/2026 and an amount of 1000 dinars.'};
 let calls=0;
 const result=await arabicMemoInput(input,async()=>{calls++;return JSON.stringify({facts:'تتعلق القضية A12 بالمرجع CV-001/2026 ومبلغ 1000 دينار.'});});
 assert.equal(calls,1);assert.match(result.facts,/A12/);assert.match(result.facts,/CV-001\/2026/);
});
test('translation cannot change identifiers or use identifier shielding to leave a foreign sentence untranslated',async()=>{
 const input={...base,caseNumber:'A12',facts:'The case A12 references CV-001/2026 and 1000 dinars.'};
 for(const facts of ['القضية A13 بالمرجع CV-001/2026 ومبلغ 1000 دينار.','The case A12 references CV-001/2026 and 1000 dinars.'])await assert.rejects(arabicMemoInput(input,async()=>JSON.stringify({facts})),/Arabic memo translation/);
});

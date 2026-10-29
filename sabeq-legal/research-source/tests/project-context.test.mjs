import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const filename=new URL('../lib/project-context.ts',import.meta.url);
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});
const {prepareCaseContext,projectContextInstructions}=module.exports;

test('visitor statements, assistant analysis and explicit corrections have distinct provenance',()=>{
 const messages=[{role:'user',content:'اسم الخصم في المثال الاصطناعي تامر.'},{role:'assistant',content:'الاسم تامر والمبلغ ثابت.'},{role:'user',content:'تصحيح: اسم الخصم ثامر، والمبلغ لم يثبت.'}];
 const before=JSON.stringify(messages),result=prepareCaseContext(messages,{missingInformation:['أصل العقد'],contradictions:['اختلاف المبلغ']});
 assert.equal(JSON.stringify(messages),before);
 assert.equal(JSON.stringify(result.projectContext.visitorSourceIds),JSON.stringify(['turn-1','turn-3']));
 assert.equal(result.projectContext.latestCorrectionSourceId,'turn-3');
 assert.equal(result.conversation[1].sourceKind,'prior-analysis');
 assert.equal(result.projectContext.priorAnalysisIsEvidence,false);
 assert.equal(result.projectContext.suppliedStatementsAreProvenFacts,false);
 assert.equal(result.projectContext.legalAuthoritySource,'verifiedLegalSources-only');
 assert.equal(result.projectContext.missingInformation[0],'أصل العقد');
 assert.equal(result.projectContext.contradictions[0],'اختلاف المبلغ');
 assert.match(projectContextInstructions,/التصحيح الصريح الأحدث/);
 assert.match(projectContextInstructions,/خارج نص المذكرة/);
});

test('the newest correction wins its source priority while ordinary disagreement is not silently resolved',()=>{
 const context=prepareCaseContext([{role:'user',content:'تصحيح: المبلغ 30 ديناراً.'},{role:'user',content:'قال الخصم إن المبلغ 40 ديناراً.'},{role:'user',content:'للتصحيح: طلبي تقديم أصل العقد، لا إعادة الخبير.'}]);
 assert.equal(context.projectContext.latestCorrectionSourceId,'turn-3');
 assert.equal(context.projectContext.explicitCorrectionSourceIds.length,2);
 assert.equal(context.conversation[1].content,'قال الخصم إن المبلغ 40 ديناراً.');
 assert.match(projectContextInstructions,/دون تصحيح صريح/);
});

test('accepted long messages are retained exactly and fingerprints follow source and missing-data changes',()=>{
 const content='بيانات اصطناعية '.repeat(1000),messages=[{role:'user',content}];
 const first=prepareCaseContext(messages,{missingInformation:[]});
 assert.equal(first.conversation[0].content,content);
 assert.equal(first.projectContext.sourceFingerprint,prepareCaseContext(messages,{missingInformation:[]}).projectContext.sourceFingerprint);
 assert.notEqual(first.projectContext.sourceFingerprint,prepareCaseContext([{role:'user',content:content+' تصحيح'}],{missingInformation:[]}).projectContext.sourceFingerprint);
 assert.notEqual(first.projectContext.sourceFingerprint,prepareCaseContext(messages,{missingInformation:['مصدر ناقص']}).projectContext.sourceFingerprint);
});

test('separate case calls share no facts, sources or missing information',()=>{
 const a=prepareCaseContext([{role:'user',content:'قضية المثال ألف: عقد إيجار.'}],{missingInformation:['مرفق خاص بألف']});
 const b=prepareCaseContext([{role:'user',content:'قضية المثال باء: طلب مستحقات.'}]);
 assert.ok(!JSON.stringify(b).includes('إيجار'));
 assert.ok(!JSON.stringify(b).includes('بألف'));
 assert.equal(b.projectContext.missingInformation.length,0);
 assert.equal(b.projectContext.persistentCrossCaseMemory,false);
 assert.notEqual(a.projectContext.sourceFingerprint,b.projectContext.sourceFingerprint);
});

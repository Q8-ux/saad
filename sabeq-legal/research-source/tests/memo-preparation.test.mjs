import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/'+path+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>load(name.replace(/^\.\//,''))});return exports;}
const {prepareMemoDraft}=load('memo-preparation');
test('available case facts continue with explicit review blanks and no invented identities',()=>{
 const result=prepareMemoDraft({facts:'وقائع اصطناعية: يطالب الخصم بمبلغ غير ثابت في المستندات المقدمة.'});
 assert.equal(result.input.draftMode,'available_evidence');
 assert.match(result.input.clientName,/غير مذكور/);assert.match(result.input.requests,/غير مذكور/);
 assert.ok(result.notes.length);assert.equal(result.input.facts,'وقائع اصطناعية: يطالب الخصم بمبلغ غير ثابت في المستندات المقدمة.');
});
test('extracted identities need literal support and reviewed corrections are preserved',()=>{
 const result=prepareMemoDraft({facts:'أنا طرف تجريبي في مواجهة خصم تجريبي في دعوى اصطناعية.',clientName:'اسم راجعه المستخدم',requests:'رفض المطالبة'}, {clientName:'طرف تجريبي',otherParty:'خصم تجريبي',caseNumber:'9999',judgmentDate:'2026-01-01'});
 assert.equal(result.input.clientName,'اسم راجعه المستخدم');assert.equal(result.input.otherParty,'خصم تجريبي');assert.equal(result.input.caseNumber,undefined);assert.equal(result.input.judgmentDate,undefined);assert.equal(result.input.requests,'رفض المطالبة');
});
test('review blanks are stable across payment retries and remain flagged for office review',()=>{
 const first=prepareMemoDraft({facts:'وصف اصطناعي كاف للقضية مع طلب مراجعة المستندات المتاحة.'});
 const second=prepareMemoDraft(first.input);
 assert.equal(JSON.stringify(second.input),JSON.stringify(first.input));assert.equal(JSON.stringify(second.missingFields),JSON.stringify(first.missingFields));
});
test('an assistant-only identity cannot become a missing party name',()=>{
 const result=prepareMemoDraft({facts:'وصف اصطناعي للقضية دون ذكر اسم الخصم أو رقم القضية.',conversationTranscript:'المساعد القانوني: اسم مستنتج'}, {otherParty:'اسم مستنتج'});
 assert.match(result.input.otherParty,/غير مذكور/);
});

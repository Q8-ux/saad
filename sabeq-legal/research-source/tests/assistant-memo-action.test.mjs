import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
 const exports = {};
 const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 vm.runInNewContext(js, { exports, require: name => dependencies[name] || require(name) });
 return exports;
}
const handoff = load('../lib/memo-handoff.ts');
const { AssistantMemoAction } = load('../app/assistant-memo-action.tsx', { '@/lib/memo-handoff': handoff });
const messages = [{ role: 'user', content: 'محادثة اصطناعية لاختبار نقل بيانات القضية.' }];
const complete = { readyForMemo: true, caseStage: 'قبل التقاضي', orientation: { track: 'initial', judgment: 'none' }, caseSummary: 'ملخص اصطناعي', court: 'المحكمة الكلية', facts: ['وقائع اصطناعية كافية تصف المطالبة ومصدر النزاع بين الطرفين.'], requests: ['رد المبلغ'], importantDates: [{label:'الواقعة',date:'2026-01-01'}], memoFields: {clientAddress:'عنوان اصطناعي',otherAddress:'عنوان افتراضي'}, memoPrefill: {clientName:'طرف اصطناعي',otherParty:'خصم افتراضي',partyRole:'مدعٍ',caseType:'مدني',court:'المحكمة الكلية',facts:'وقائع اصطناعية كافية تصف المطالبة ومصدر النزاع بين الطرفين.',requests:'رد المبلغ',allParties:'أطراف اصطناعية',legalIssues:''} };
function control(overrides = {}) { return AssistantMemoAction({language:'ar',intake:null,messages:[],busy:false,onContinue:()=>{},...overrides}); }
function button(element) { return element.props.children.find(child=>child?.type==='button'); }
test('initial action remains visible and explains how to start in all languages', () => {
 for (const [language,label] of [['ar','توليد المذكرة'],['en','Generate memorandum'],['ur','یادداشت تیار کریں']]) {
  const element=control({language}); const html=renderToStaticMarkup(element);
  assert.ok(html.includes(label)); assert.equal(button(element).props.disabled,true); assert.match(html,/assistant-memo-status/);
 }
});
test('missing factual data stays blocked with the exact next question', () => {
 const intake={...complete,facts:[],memoPrefill:{...complete.memoPrefill,facts:''}};
 let calls=0;const element=control({intake,messages,onContinue:()=>calls++});
 assert.equal(button(element).props.disabled,true);button(element).props.onClick();assert.equal(calls,0);
 assert.ok(renderToStaticMarkup(element).includes(handoff.memoConversationGaps(intake)[0].question));
});
test('completed action preserves fields and transcript and opens reviewed handoff once', () => {
 const results=[];const element=control({intake:complete,messages,onContinue:data=>results.push(data)});
 assert.equal(button(element).props.disabled,false);button(element).props.onClick();assert.equal(results.length,1);
 assert.equal(results[0].conversationTranscript,handoff.conversationTranscript(messages));assert.equal(results[0].clientName,complete.memoPrefill.clientName);
 assert.equal(handoff.isCompleteMemoHandoff(results[0]),true);
});
test('busy, conflicting and oversized states cannot invoke the handoff', () => {
 for (const overrides of [{busy:true},{intake:{...complete,contradictions:['تعارض اصطناعي']}},{messages:[{role:'user',content:'س'.repeat(30001)}]}]) {
  let calls=0;const element=control({intake:complete,messages,onContinue:()=>calls++,...overrides});
  assert.equal(button(element).props.disabled,true);button(element).props.onClick();assert.equal(calls,0);
 }
});
test('the assistant mounts the action before tools and outside the intake dashboard', () => {
 const source=readFileSync(new URL('../app/sabeq-site.tsx',import.meta.url),'utf8');
 assert.ok(source.indexOf('<AssistantMemoAction ')<source.indexOf('<LegalToolsPanel key={toolSession}'));
 assert.ok(source.indexOf('<AssistantMemoAction ')<source.indexOf('{intake && <div className="intake-dashboard">'));
});

test('missing administrative fields allow preparation but never skip final form review', () => {
 const intake={...complete,readyForMemo:false,memoFields:{},importantDates:[],memoPrefill:{...complete.memoPrefill,clientName:'',otherParty:''}};
 const results=[];const element=control({intake,messages,onContinue:data=>results.push(data)});
 assert.equal(button(element).props.disabled,false);button(element).props.onClick();
 assert.equal(results.length,1);assert.equal(results[0].clientName,'');
 assert.equal(results[0].handoffReady,'');assert.equal(handoff.isCompleteMemoHandoff(results[0]),false);
});

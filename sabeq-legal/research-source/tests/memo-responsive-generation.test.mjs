import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load} from './template-harness.mjs';
const runner=load('../lib/memo-generation.ts');
test('hung transport is bounded and aborted without a retry',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(runner.runMemoGeneration(()=>{calls++;return new Promise(()=>{});},controller,15),error=>error.reason==='timeout');
 assert.equal(calls,1);assert.equal(controller.signal.aborted,true);
});
test('cancel completes promptly even if transport ignores signal',async()=>{
 const controller=new AbortController();const pending=runner.runMemoGeneration(()=>new Promise(()=>{}),controller,1000);controller.abort();
 await assert.rejects(pending,error=>error.reason==='cancelled');
});
test('closing before start does not invoke transport',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(runner.runMemoGeneration(()=>{calls++;return Promise.resolve('bad');},controller),error=>error.reason==='cancelled');assert.equal(calls,0);
});
test('success returns once and clears its timeout',async()=>{
 const controller=new AbortController();assert.equal(await runner.runMemoGeneration(async()=> 'synthetic draft',controller,15),'synthetic draft');
 await new Promise(resolve=>setTimeout(resolve,25));assert.equal(controller.signal.aborted,false);
});
test('native confirmation removed, cancel/unmount wired, memo POST excluded from retries',()=>{
 const ui=readFileSync(new URL('../app/sabeq-site.tsx',import.meta.url),'utf8');
 const submit=ui.slice(ui.indexOf('async function submit(event: FormEvent<HTMLFormElement>)',ui.indexOf('function MemoWizard')),ui.indexOf('if (memo) return'));
 assert.doesNotMatch(ui,/window.confirm\(memoApprovalNotice/);assert.doesNotMatch(submit,/window.confirm/);assert.match(submit,/generationRequest.current/);assert.match(submit,/runMemoGeneration/);assert.match(submit,/method: "POST", signal/);
 assert.match(ui,/generationRequest.current\?\.abort\(\)/);assert.match(ui,/memo-generation-approval/);assert.match(ui,/generationMounted.current = false/);
 assert.match(ui,/retryableResponse = path === "\/api\/legal\/analyze-documents"/);
 const route=readFileSync(new URL('../app/api/legal/memo/route.ts',import.meta.url),'utf8');
 assert.ok(route.indexOf('signal.throwIfAborted();',route.indexOf('const finalMemo'))<route.indexOf('recordServiceActivity({'));
});

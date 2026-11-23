import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';
const {MemoSubmissionSession,MemoSubmissionError,readMemoServiceJson,memoSubmissionCopy}=load('../lib/memo-submission.ts');

test('review and submission reuse exactly the prepared case without another provider request',async()=>{
  const session=new MemoSubmissionSession();let calls=0;
  const input={facts:'وقائع اصطناعية',requests:'طلبات اصطناعية'};
  const send=async()=>{calls++;return {input:{...input,draftMode:'available_evidence'}};};
  const reviewed=await session.prepare(input,send);
  const submitted=await session.prepare({...reviewed},send);
  assert.deepEqual(submitted,reviewed);assert.equal(calls,1);
  await session.prepare({...reviewed,requests:'طلبات صححها المستخدم'},async()=>{calls++;return {input:{...reviewed,requests:'طلبات صححها المستخدم'}};});
  assert.equal(calls,2,'A real case edit invalidates the prepared snapshot');
});

test('field ordering does not trigger extraction and failed preparation is never cached',async()=>{
  const session=new MemoSubmissionSession();let calls=0;
  await assert.rejects(session.prepare({facts:'synthetic'},async()=>{calls++;throw Error('synthetic outage');}));
  const prepared=await session.prepare({facts:'synthetic'},async()=>{calls++;return{input:{facts:'synthetic',requests:'synthetic relief'}};});
  await session.prepare({requests:prepared.requests,facts:prepared.facts},async()=>{throw Error('must not reprepare');});
  assert.equal(calls,2);
});

test('blank optional fields removed between review steps do not reprepare the same case',async()=>{
  const session=new MemoSubmissionSession();let calls=0;
  await session.prepare({facts:'synthetic'},async()=>{calls++;return{input:{facts:'synthetic',courtCircuit:'',caseNumber:'  '}};});
  await session.prepare({facts:'synthetic'},async()=>{calls++;throw Error('must not reprepare');});
  assert.equal(calls,1);
});

test('final review form defaults and deliberate field corrections do not trigger a second preparation',async()=>{
  const session=new MemoSubmissionSession();let calls=0;
  const prepared=await session.prepare({facts:'synthetic facts'},async()=>{calls++;return{input:{facts:'synthetic facts',requests:'synthetic relief',caseType:'دعوى مدنية'}};});
  const reviewed={...prepared,caseType:'مدني',documentKind:'auto',court:'محكمة راجعها المستخدم'};
  const submitted=await session.prepare(reviewed,async()=>{throw Error('must not extract after approval');},true);
  assert.deepEqual(submitted,reviewed);assert.equal(calls,1);
});

test('a final screen without an earlier prepared case still performs the required preparation',async()=>{
  const session=new MemoSubmissionSession();let calls=0;
  await session.prepare({facts:'synthetic facts'},async()=>{calls++;return{input:{facts:'synthetic facts'}};},true);
  assert.equal(calls,1);
});

test('a synchronous guard blocks duplicate clicks before React renders and can be released on every exit',()=>{
  const session=new MemoSubmissionSession();assert.equal(session.begin(),true);assert.equal(session.begin(),false);
  session.end();assert.equal(session.begin(),true);session.end();
});

test('saved source review retains its original message, stage and record ID',async()=>{
  await assert.rejects(readMemoServiceJson(Response.json({error:'أسانيد اصطناعية تحتاج مراجعة',stage:'source_review',requestId:'synthetic-request-123'},{status:422}),'generation'),error=>{
    assert.equal(error.requestId,'synthetic-request-123');assert.equal(error.stage,'source_review');assert.equal(error.status,422);assert.equal(error.savedForReview,true);assert.equal(error.message,'أسانيد اصطناعية تحتاج مراجعة');return true;
  });
});

test('an unknown or non-JSON response never becomes a successful or saved memorandum',async()=>{
  for(const body of ['<html>502 upstream sensitive details</html>','null','[]'])await assert.rejects(readMemoServiceJson(new Response(body,{status:502}),'preparation'),error=>error instanceof MemoSubmissionError&&!error.savedForReview&&!error.message.includes('sensitive'));
  await assert.rejects(new MemoSubmissionSession().prepare({facts:'synthetic'},async()=>({input:{facts:{bad:'shape'}}})),error=>error.stage==='preparation');
});

test('untrusted stage or identifier is not presented as a valid saved reference',async()=>{
  await assert.rejects(readMemoServiceJson(Response.json({error:'تعذر الطلب',stage:'<script>',requestId:'https://sensitive.example/token'},{status:503}),'generation'),error=>error.stage==='generation'&&error.requestId===''&&!error.savedForReview);
});

test('successful transport preserves the exact Arabic memo bytes and localized notices have no provider diagnostics',async()=>{
  const memo='نص اصطناعي\n  0012/2026  ';
  assert.equal((await readMemoServiceJson(Response.json({memo}),'generation')).memo,memo);
  for(const language of ['ar','en','ur']){const ui=memoSubmissionCopy(language,'source_review');assert.ok(ui.reference&&ui.review&&ui.failure);if(language==='en')assert.doesNotMatch(JSON.stringify(ui),/[\u0600-\u06ff]/);}
});

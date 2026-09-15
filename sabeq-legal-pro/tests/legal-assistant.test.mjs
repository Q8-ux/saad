import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantQuestion, requestLegalAssistant, sourceLink, ASSISTANT_ENDPOINT } from '../source/lib/legal-assistant-api.ts';

test('assistant sends only explicit text and bounded conversation to its fixed endpoint without credentials', async () => {
  const history = Array.from({length:20}, (_,i) => ({role:i%2?'assistant':'user',content:'x'.repeat(6000)}));
  const question = 'س'.repeat(6000);
  assert.ok(assistantQuestion(question,history).length < 12000);
  assert.ok(assistantQuestion(question,history).includes(question));
  assert.throws(() => assistantQuestion(' ',[]));
  assert.throws(() => assistantQuestion('x'.repeat(6001),[]));
  for (const language of ['ar','en','ur']) {
    const reply = await requestLegalAssistant('مراجعة عقد', [], language, new AbortController().signal, async (url, options) => {
      assert.equal(url, ASSISTANT_ENDPOINT);
      assert.equal(options.credentials, 'omit');
      assert.equal(options.redirect, 'error');
      assert.deepEqual(options.headers, {'Content-Type':'application/json'});
      const body = JSON.parse(options.body);
      assert.deepEqual(Object.keys(body), ['question','language']);
      assert.equal(body.language, language);
      return Response.json({answer:'إجابة من الخدمة',sources:[]});
    });
    assert.equal(reply.answer, 'إجابة من الخدمة');
  }
});

test('unavailable services and invalid payloads cannot masquerade as assistant answers', async () => {
  for (const response of [new Response('offline',{status:503}), new Response('limit',{status:429}), new Response('<html>error</html>'), Response.json({answer:''}), Response.json(null)]) {
    await assert.rejects(requestLegalAssistant('سؤال',[],'ar',new AbortController().signal,async()=>response));
  }
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(requestLegalAssistant('سؤال',[],'ar',abort.signal,async (_url,options) => { options.signal.throwIfAborted(); }));
});

test('source links cannot introduce executable or disguised URLs', async () => {
  for (const url of ['javascript:alert(1)','data:text/html,test','https://moj.gov.kw.evil.example/file','https://user@moj.gov.kw/file','http://moj.gov.kw/file','https://moj.gov.kw:9999/file']) assert.equal(sourceLink(url), null, url);
  assert.equal(sourceLink('https://www.moj.gov.kw/file.pdf'),'https://www.moj.gov.kw/file.pdf');
  const reply = await requestLegalAssistant('سؤال',[],'ar',new AbortController().signal,async()=>Response.json({answer:'نص',sources:[{title:'مصدر',sourceUrl:'https://www.moj.gov.kw/file.pdf'},{title:'مصدر',sourceUrl:'https://www.moj.gov.kw/file.pdf'},{title:'آخر',sourceUrl:'javascript:alert(1)'},null]}));
  assert.equal(reply.sources.length,2);
  assert.equal(reply.sources[1].url,null);
});

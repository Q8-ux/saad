import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import OpenAI from 'openai';
import {setRuntimeBindings} from '../lib/runtime-bindings.ts';

const compiled=new URL('../.sites-runtime/content-safety-test.mjs',import.meta.url);
await mkdir(new URL('../.sites-runtime/',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('../lib/content-safety.ts',import.meta.url).pathname],outfile:compiled.pathname,bundle:true,packages:'external',platform:'node',format:'esm',logLevel:'silent'});
const {assertSafePoetryContent,ContentSafetyUnavailableError,ContentSafetyError,contentSafetyErrorResponse}=await import(compiled.href);

test('quota failures have a distinct actionable response while the full long source is screened',async()=>{
  setRuntimeBindings({});let captured;const text='أ'.repeat(15000)+' آخر النص محفوظ للفحص';
  await assertSafePoetryContent({responses:{parse:async input=>{captured=input;return{output_parsed:{decision:'allow',category:'allowed',reason:'نص عادي'}};}}},[text],'input');
  assert.ok(captured.input[1].content.includes('آخر النص محفوظ للفحص'));
  const response=contentSafetyErrorResponse(new ContentSafetyUnavailableError('quota'));assert.equal(response.status,429);assert.equal((await response.json()).code,'AI_QUOTA_EXCEEDED');
});

test('an unavailable safety provider stays closed and logs only safe diagnostics',async()=>{
  setRuntimeBindings({});
  const seen=[],original=console.error;
  console.error=(...args)=>seen.push(args);
  try{
    const failure=new OpenAI.APIError(401,{code:'invalid_api_key',message:'synthetic-private-key-and-message'},'synthetic-private-key-and-message',new Headers());
    const client={responses:{parse:async()=>{throw failure;}}};
    await assert.rejects(assertSafePoetryContent(client,['نص اختبار خاص لا يجب أن يظهر في السجلات'],'input'),ContentSafetyUnavailableError);
    assert.equal(seen.length,1);assert.equal(seen[0][1].status,401);assert.equal(seen[0][1].code,'invalid_api_key');
    assert.ok(!JSON.stringify(seen).includes('synthetic-private'));assert.ok(!JSON.stringify(seen).includes('نص اختبار خاص'));
  }finally{console.error=original;}
});

test('valid allowance is required and direct abuse is blocked before calling the provider',async()=>{
  setRuntimeBindings({});let calls=0;
  const client={responses:{parse:async()=>{calls++;return{output_parsed:{decision:'allow',category:'allowed',reason:'قصة ترحيب'}};}}};
  await assertSafePoetryContent(client,['عاد صديق من سفر ففرح أصحابه بعودته'],'input');assert.equal(calls,1);
  await assert.rejects(assertSafePoetryContent(client,['أريد إهانة شخص وكتابة سب له'],'input'),ContentSafetyError);assert.equal(calls,1);
});

test("blocks abusive or defamatory poetry before storage and checks generated output", async () => {
  const [safety, poetryRoute, transcription, studio] = await Promise.all(
    [
      "../lib/content-safety.ts",
      "../app/api/poetry/route.ts",
      "../lib/media-transcription.ts",
      "../components/PoetryStudio.tsx",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

  assert.match(safety, /person_abuse_or_defamation/);
  assert.match(safety, /divine_abuse/);
  assert.match(safety, /ruler_or_government_abuse/);
  assert.match(safety, /unclear_risk/);
  assert.match(safety, /CONTENT_NOT_ALLOWED/);
  assert.match(safety, /لم تُحفظ القصة ولم تُنشأ قصيدة/);
  assert.match(safety, /النقد العام المهذب/);

  const inputCheck = poetryRoute.indexOf("await assertSafePoetryContent(");
  const firstStorage = poetryRoute.indexOf("activeSubmissionId = await startStorySubmission(");
  assert.ok(inputCheck >= 0 && inputCheck < firstStorage, "input safety must run before story storage");

  const completedPoem = poetryRoute.indexOf("const completed = finalizePoem");
  const outputCheck = poetryRoute.indexOf('await assertSafePoetryContent(client, [completed], "output")', completedPoem);
  const poemStorage = poetryRoute.indexOf("await savePoem({", completedPoem);
  assert.ok(outputCheck > completedPoem && outputCheck < poemStorage, "output safety must run before poem storage");
  assert.match(poetryRoute, /POETRY_SAFETY_POLICY_AR/);

  const transcriptSafety = transcription.indexOf('await assertSafePoetryContent(client, [text], "transcript")');
  const transcriptReturn = transcription.indexOf("return text;", transcriptSafety);
  assert.ok(transcriptSafety >= 0 && transcriptSafety < transcriptReturn);
  assert.match(studio, /المحتوى خاص، ويُرفض السب والقذف والإساءة/);
});

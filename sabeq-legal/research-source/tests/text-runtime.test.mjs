import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const {resolveTextEnvironment}=load('../lib/text-runtime.ts');
const base={LEGAL_AI_PROVIDER:'openai',OPENAI_API_KEY:'synthetic-primary',OPENAI_MODEL:'synthetic-primary-model',LEGAL_AI_FALLBACK_PROVIDER:'gemini',GEMINI_API_KEY:'synthetic-alternate'};
const saved={enabled:true,apiKey:'synthetic-meta-secret',model:'meta-llama/llama-3.3-70b-instruct:free',testedAt:'2026-11-23T00:00:00.000Z',revision:'synthetic-revision'};
test('managed Meta opt-in and absent/disabled setting preserve the original provider object',async()=>{
 assert.equal(await resolveTextEnvironment(base,async()=>assert.fail('vault read without opt-in')),base);
 const runtime={...base,LEGAL_AI_MANAGED_SETTINGS:'enabled'};
 assert.equal(await resolveTextEnvironment(runtime,async()=>null),runtime);
 assert.equal(await resolveTextEnvironment(runtime,async()=>({...saved,enabled:false})),runtime);
});
test('verified Meta config changes both shared text consumers and preserves the alternate without mutating environment',async()=>{
 const runtime={...base,LEGAL_AI_MANAGED_SETTINGS:'enabled'};
 const resolved=await resolveTextEnvironment(runtime,async()=>saved);
 assert.equal(resolved.LEGAL_AI_PROVIDER,'openrouter');assert.equal(resolved.OPENROUTER_API_KEY,saved.apiKey);
 assert.equal(resolved.OPENROUTER_MODEL,saved.model);assert.equal(resolved.LEGAL_AI_FALLBACK_PROVIDER,'gemini');
 assert.equal(runtime.LEGAL_AI_PROVIDER,'openai');assert.equal(runtime.OPENROUTER_API_KEY,undefined);
 for(const change of [{testedAt:''},{apiKey:''},{model:'meta-llama/llama-paid'},{model:'other/model:free'}])await assert.rejects(resolveTextEnvironment(runtime,async()=>({...saved,...change})),error=>error.kind==='configuration');
 await assert.rejects(resolveTextEnvironment(runtime,async()=>{throw Error('vault unavailable');}),/vault unavailable/);
});

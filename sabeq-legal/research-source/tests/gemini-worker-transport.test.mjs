import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
const root=fileURLToPath(new URL('..',import.meta.url));
const bundle=await build({stdin:{resolveDir:root,loader:'ts',contents:`
import {geminiTextResponse} from './lib/gemini.ts';
import {POST as bridge} from './app/api/integrations/bolt-memos/route.ts';
export default {async fetch(request){try{
if(new URL(request.url).pathname==='/bridge')return bridge(request);
return await geminiTextResponse({body:JSON.stringify({instructions:'Synthetic test only',input:'synthetic',max_output_tokens:100})},{apiKey:'synthetic-worker-key',model:'gemini-3.5-flash'});
}catch(error){return Response.json({kind:error.kind||error.name},{status:502});}}};`},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',plugins:[{name:'synthetic-storage',setup(b){b.onResolve({filter:/^@\/lib\/management-data$/},()=>({path:'storage',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export async function managerMemos(){return {memos:[{id:'synthetic-memo-record',has_output:1,status:'needs_review'}]}}`,loader:'js'}));}}]});
for(const mode of ['gemini','bridge'])for(const redirected of [false,true]){
 test(`workerd ${mode} ${redirected?'rejects redirects without forwarding credentials':'reaches its verified upstream'}`,async()=>{
  const calls=[];
  const worker=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',outboundService:async r=>{
   calls.push({url:r.url,key:r.headers.get('x-goog-api-key')});
   if(redirected)return new Response(null,{status:302,headers:{Location:'https://untrusted.example.test/capture'}});
   return Response.json(mode==='gemini'?{candidates:[{finishReason:'STOP',content:{parts:[{text:'synthetic reply'}]}}]}:{valid:true,role:'admin'});
  }});
  try{
   const response=await worker.dispatchFetch('https://fixture.example.test/'+mode,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic-admin-session-000001'},body:JSON.stringify({action:'list',offset:0})});
   assert.equal(response.status,redirected?(mode==='bridge'?401:502):200);
   assert.equal(calls.length,1);
   assert.match(calls[0].url,mode==='gemini'?/^https:\/\/generativelanguage.googleapis.com\//:/^https:\/\/tuhxdirrffnxtosqaoiq.supabase.co\/functions\/v1\/admin-verify$/);
   const text=await response.text();assert.doesNotMatch(text,/synthetic-worker-key/);
   if(!redirected)assert.match(text,mode==='gemini'?/synthetic reply/:/synthetic-memo-record/);
  }finally{await worker.dispose();}
 });
}

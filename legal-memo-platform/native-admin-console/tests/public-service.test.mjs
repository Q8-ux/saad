import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash, createHmac, webcrypto } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
const secret="synthetic-admin-contract-".repeat(3);
const json=(body,status=200)=>Response.json(body,{status});
function load(relative,dependencies,extra={}) {
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(!(name in dependencies))throw Error(name);return dependencies[name];},Response,Request,URL,TextEncoder,crypto:webcrypto,Date,AbortSignal,...extra});return exports;
}
function sender(origin="https://public.sabeq.example") {
 const calls=[];
 const api=load("../lib/public-service.ts",{"cloudflare:workers":{env:{PUBLIC_SERVICE_ORIGIN:origin,ADMIN_SERVICE_TOKEN:secret}},"@/lib/admin-auth":{adminResponse:json}},{fetch:async(url,init)=>{calls.push({url:String(url),init});return json({ok:true});}});
 return {...api,calls};
}
test("sender signs the exact method, path, query and body used by the public verifier",async()=>{
 const h=sender();const body=JSON.stringify({action:"test"});
 const response=await h.callPublicService("/api/admin/sadad?mode=auth",{method:"POST",body});assert.equal(response.status,200);
 const {url,init}=h.calls[0],headers=new Headers(init.headers);
 const payload=[headers.get("X-Sabeq-Timestamp"),headers.get("X-Sabeq-Nonce"),"POST","/api/admin/sadad?mode=auth",createHash("sha256").update(body).digest("hex")].join("\n");
 assert.equal(headers.get("X-Sabeq-Signature"),createHmac("sha256",secret).update(payload).digest("hex"));
 assert.equal(url,"https://public.sabeq.example/api/admin/sadad?mode=auth");assert.equal(init.redirect,"manual");assert.equal(init.body,body);
 assert.equal(headers.get("Authorization"),null);assert.ok(!JSON.stringify(init.headers).includes(secret));
});
test("sender rejects unsafe origins and requests outside the admin contract",async()=>{
 for(const origin of ["http://public.sabeq.example","https://user:password@public.sabeq.example","invalid"]) {const h=sender(origin);assert.equal((await h.callPublicService("/api/admin/sadad")).status,503);assert.equal(h.calls.length,0);}
 for(const path of ["https://external.example/api/admin/sadad","/api/payments/sadad","//external.example/api/admin/sadad"]) {const h=sender();assert.equal((await h.callPublicService(path)).status,503);assert.equal(h.calls.length,0);}
});
test("non-JSON upstream responses never reach the admin UI as success",async()=>{
 const h=sender();assert.equal((await h.forwardPublicResponse(new Response("<html>gateway error</html>",{status:200}))).status,502);
 const response=await h.forwardPublicResponse(json({ready:false},503));assert.equal(response.status,503);assert.equal((await response.json()).ready,false);
});
test("payment and engineering routes authorize before any signed upstream call",async()=>{
 for(const relative of ["../app/api/payment-gateway/route.ts","../app/api/engineering-paths/route.ts"]) {
  let calls=0;const route=load(relative,{"@/lib/admin-auth":{requireAdminPermission:async()=>({response:json({error:"forbidden"},403)}),writeAudit:async()=>{}},"@/lib/admin-security":{assertAdminOrigin:()=>{},readAdminJson:async()=>({})},"@/lib/public-service":{callPublicService:async()=>{calls++;return json({});},forwardPublicResponse:async response=>response}});
  assert.equal((await route.GET(new Request("https://admin.sabeq.example/api/engineering-paths"))).status,403);
  if(route.POST)assert.equal((await route.POST(new Request("https://admin.sabeq.example/api/payment-gateway",{method:"POST"}))).status,403);assert.equal(calls,0);
 }
});
test("payment administration uses the real SADAD route and auth-only test action",async()=>{
 const calls=[];const route=load("../app/api/payment-gateway/route.ts",{"@/lib/admin-auth":{requireAdminPermission:async()=>({session:{staff:{email:"synthetic@example.invalid"}}}),writeAudit:async()=>{}},"@/lib/admin-security":{assertAdminOrigin:()=>{},readAdminJson:async()=>({action:"test"})},"@/lib/public-service":{callPublicService:async(path,init)=>{calls.push({path,init});return json({ok:true});},forwardPublicResponse:async response=>response}});
 assert.equal((await route.POST(new Request("https://admin.sabeq.example/api/payment-gateway",{method:"POST"}))).status,200);
 assert.equal(calls[0].path,"/api/admin/sadad");assert.equal(calls[0].init.body,'{"action":"test"}');
});

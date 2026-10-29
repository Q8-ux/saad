import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(relative,dependencies){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>dependencies[name],Response,Request,console:{warn:()=>{}},Object,String});return exports;}
const procedure=load("../lib/procedural-position.ts",{});
const preparation=load("../lib/memo-preparation.ts",{"./procedural-position":procedure});
class RequestError extends Error {constructor(message,status){super(message);this.status=status;}}
function endpoint(extract){return load("../app/api/legal/prepare-memo/route.ts",{"@/lib/openai":{analyzeMemoDictation:extract},"@/lib/memo-dictation":{dictationFields:data=>data},"@/lib/memo-preparation":preparation,"@/lib/public-auth":{requireMemoUserOrGuest:async()=>({})},"@/lib/service-settings":{requireServiceEnabled:async()=>{}},"@/lib/request-security":{assertSameOrigin:()=>{},cleanLanguage:value=>value||"ar",corsPreflight:()=>{},enforceRateLimit:async()=>{},errorResponse:error=>Response.json({error:error.message},{status:error.status||500}),privateJson:data=>Response.json(data),readJsonObject:request=>request.json(),RequestError}}).POST;}
function request(body){return new Request("https://sabeq.example/api/legal/prepare-memo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});}
test("provider extraction failure still returns available facts and reviewable formal gaps",async()=>{
 const facts="وصف اصطناعي كاف للقضية والمستندات المتاحة من دون أسماء محددة.";
 const response=await endpoint(async()=>{throw Error("synthetic outage");})(request({facts}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.input.facts,facts);assert.equal(result.input.draftMode,"available_evidence");assert.match(result.input.clientName,/غير مذكور/);assert.ok(result.notes.length);
});
test("attachments supplement missing names and requests while reviewed facts survive",async()=>{
 const facts="وقائع اصطناعية سبق أن راجعها المستخدم دون تغيير.";
 const response=await endpoint(async()=>({facts:"إعادة صياغة غير مطلوبة",clientName:"طرف تجريبي",otherParty:"اسم مخترع",requests:"رفض المطالبة الاصطناعية"}))(request({facts,documentContext:"مستند اصطناعي مقدم من طرف تجريبي"}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.input.facts,facts);assert.equal(result.input.clientName,"طرف تجريبي");assert.match(result.input.otherParty,/غير مذكور/);assert.equal(result.input.requests,"رفض المطالبة الاصطناعية");
});

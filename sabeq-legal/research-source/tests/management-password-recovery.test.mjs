import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";
import ts from "typescript";

const source=readFileSync(new URL("../lib/management-password-recovery.ts",import.meta.url),"utf8");
const login=readFileSync(new URL("../../../sabeq-admin-preview/admin.js",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/management/[...path]/route.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../drizzle/0010_management_password_recovery.sql",import.meta.url),"utf8");
const exports={};
let recoveryDb=null;
const resetCalls=[];
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports,crypto:webcrypto,TextEncoder,require:(id)=>{
 if(id==="cloudflare:workers")return {env:{}};
 if(id==="@/db")return {getD1:()=>{if(recoveryDb)return recoveryDb;throw Error("No DB calls for invalid username")}};
 if(id==="@/lib/email")return {sendManagementRecoveryEmail:()=>{throw Error("Unexpected email")}};
 if(id==="@/lib/management-password")return {normalizeManagementUsername:(x)=>typeof x==="string"?x.trim().toLowerCase():"",managementRecoveryAccount:()=>null,resetManagementPasswordWithProof:async(id,password)=>{resetCalls.push({id,password})}};
 if(id==="@/lib/request-security")return {RequestError:class RequestError extends Error{}};
 throw Error("Unexpected import: "+id);
}});
test("recovery email is mapped only from a pre-approved server-side account identity",()=>{
 const map=JSON.stringify({"administrator:saad":"owner@example.com","operator:ahmad":"team@example.com"});
 assert.equal(exports.mappedRecoveryEmail("administrator:saad",map),"owner@example.com");
 assert.equal(exports.mappedRecoveryEmail("operator:ahmad",map),"team@example.com");
 assert.equal(exports.mappedRecoveryEmail("administrator:other",map),"");
 assert.equal(exports.mappedRecoveryEmail("administrator:saad",JSON.stringify({"administrator:saad":"not-an-email"})),"");
 assert.equal(exports.mappedRecoveryEmail("administrator:saad","{}"),"");
 assert.equal(exports.mappedRecoveryEmail("administrator:saad","bad json"),"");
});
test("unknown or malformed account request returns the same generic public response",async()=>{
 const invalid=await exports.requestManagementRecovery({username:"!"});
 const unknown=await exports.requestManagementRecovery({username:"unknown"});
 assert.deepEqual({...invalid},{...unknown});
 assert.equal(invalid.ok,true);
});
test("reset tokens are one-time server-hashed, expire, and cannot be exchanged anonymously for a session",()=>{
 assert.match(migration,/token_hash.*PRIMARY KEY/);
 assert.match(migration,/expires_at/);
 assert.match(source,/SHA-256/);
 assert.match(source,/DELETE FROM management_password_resets WHERE token_hash = \? AND expires_at > \? RETURNING account_id/);
 assert.match(source,/now\+600/);
 assert.match(route,/enforceRateLimit\(request, "management-recovery-request"/);
 assert.match(route,/enforceRateLimit\(request, "management-recovery-confirm"/);
 assert.doesNotMatch(source,/return\s+\{\s*token\s*[,}]/);
});


test("approved-account entry supports chosen passwords and the PKCE account alternative",()=>{
 const start=login.indexOf('function loginScreen('),end=login.indexOf('async function signIn(',start);
 assert.ok(start>=0&&end>start);
 const entry=login.slice(start,end);assert.match(entry,/data-action="sign-in"/);assert.match(entry,/data-action="switch-account"/);
 assert.match(entry,/data-form="password-login"/);assert.match(entry,/type="password"/);assert.doesNotMatch(entry,/minlength=/);
 assert.match(login,/sabeq-admin-proof/);assert.match(login,/sabeq-admin-state/);assert.match(login,/SHA-256/);assert.match(login,/new URLSearchParams\(\{challenge,state,console:consoleName\}\)/);
 assert.match(login,/api\('exchange',\{code,verifier\}\)/);
});

test("password recovery accepts a chosen one-character password only with a valid one-time proof",async()=>{
 const token="a".repeat(43);let available=true;let proofReads=0;
 recoveryDb={prepare:(sql)=>{assert.match(sql,/DELETE FROM management_password_resets/);return {bind:()=>({first:async()=>{proofReads++;if(!available)return null;available=false;return {account_id:"memo_supervisor:ahmad"};}})}}};
 try {
  await assert.rejects(exports.finishManagementRecovery({token,newPassword:"",confirmPassword:""}));
  assert.equal(proofReads,0);
  await assert.rejects(exports.finishManagementRecovery({token:"bad",newPassword:"x",confirmPassword:"x"}));
  assert.equal(proofReads,0);
  const result=await exports.finishManagementRecovery({token,newPassword:"x",confirmPassword:"x"});
  assert.equal(result.ok,true);assert.deepEqual(resetCalls,[{id:"memo_supervisor:ahmad",password:"x"}]);
  await assert.rejects(exports.finishManagementRecovery({token,newPassword:"x",confirmPassword:"x"}));
  assert.equal(resetCalls.length,1);
 } finally {recoveryDb=null;}
});

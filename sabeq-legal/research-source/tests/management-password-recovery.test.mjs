import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync(new URL("../lib/management-password-recovery.ts",import.meta.url),"utf8");
const login=readFileSync(new URL("../../../sabeq-admin-preview/admin.js",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/management/[...path]/route.ts",import.meta.url),"utf8");
const migration=readFileSync(new URL("../drizzle/0010_management_password_recovery.sql",import.meta.url),"utf8");
const exports={};
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports,require:(id)=>{
 if(id==="cloudflare:workers")return {env:{}};
 if(id==="@/db")return {getD1:()=>{throw Error("No DB calls for invalid username")}};
 if(id==="@/lib/email")return {sendManagementRecoveryEmail:()=>{throw Error("Unexpected email")}};
 if(id==="@/lib/management-password")return {normalizeManagementUsername:(x)=>typeof x==="string"?x.trim().toLowerCase():"",managementRecoveryAccount:()=>null,resetManagementPasswordWithProof:()=>{throw Error("No reset")}};
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


test("approved-account entry uses PKCE without restoring the removed password form",()=>{
 const start=login.indexOf('function loginScreen('),end=login.indexOf('async function signIn(',start);
 assert.ok(start>=0&&end>start);
 const entry=login.slice(start,end);assert.match(entry,/data-action="sign-in"/);assert.match(entry,/data-action="switch-account"/);
 assert.doesNotMatch(entry,/data-form="password-login"|name="password"|نسيت كلمة المرور/);
 assert.match(login,/sabeq-admin-proof/);assert.match(login,/sabeq-admin-state/);assert.match(login,/SHA-256/);assert.match(login,/new URLSearchParams\(\{challenge,state\}\)/);
 assert.match(login,/api\('exchange',\{code,verifier\}\)/);
});

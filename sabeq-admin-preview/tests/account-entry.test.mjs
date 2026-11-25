import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=readFileSync(new URL('../admin.js',import.meta.url),'utf8');
async function client(href,{stored={},storageFailure=false}={}){
 const entries=new Map(Object.entries(stored)),nodes=new Map(),navigations=[],requests=[],listeners={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:true,open:false,addEventListener(){},replaceChildren(){},classList:{toggle(){}}});return nodes.get(id);};
 const url=new URL(href),location={href:url.href,origin:url.origin,pathname:url.pathname,assign(value){navigations.push(value);}};
 const document={getElementById:node,hidden:false,activeElement:null,addEventListener(type,fn){listeners[type]=fn;},querySelectorAll(){return[];}};
 const sessionStorage={getItem:key=>entries.get(key)||null,setItem(key,value){if(storageFailure)throw Error('storage unavailable');entries.set(key,value);},removeItem:key=>entries.delete(key)};
 const context={document,location,history:{replaceState(_state,_title,path){location.href=new URL(path,location.href).href;}},sessionStorage,crypto:webcrypto,Uint8Array,TextEncoder,URL,URLSearchParams,btoa:value=>Buffer.from(value,'binary').toString('base64'),atob:value=>Buffer.from(value,'base64').toString('binary'),setInterval(){},setTimeout(){},clearTimeout(){},console,AbortSignal,window:{addEventListener(){}},fetch:async(...args)=>{requests.push(args);return {ok:false,status:401,json:async()=>({error:'اختبار جلسة منتهية'})};}};
 vm.runInNewContext(source.replace('void boot();','globalThis.testBoot=boot();'),context);await context.testBoot;
 return {entries,nodes,navigations,requests,location,listeners};
}
const home='https://q8-ux.github.io/saad/sabeq-admin-preview/';
test('normal login visibly offers the existing account flow and retains password and recovery',async()=>{
 const c=await client(home);const html=c.nodes.get('app').innerHTML;assert.match(html,/data-action="sign-in"/);assert.match(html,/بدون كلمة مرور اللوحة/);assert.match(html,/data-form="password-login"/);assert.match(html,/data-action="forgot-password"/);assert.equal(c.navigations.length,0);assert.equal(c.requests.length,0);
});
test('account link creates a fresh PKCE request once and remembers the requested section',async()=>{
 const c=await client(home+'?signin=account#paths');assert.equal(c.navigations.length,1);const target=new URL(c.navigations[0]);assert.equal(target.pathname,'/api/management/login');assert.equal(target.searchParams.get('console'),'github');assert.match(target.searchParams.get('challenge'),/^[A-Za-z0-9_-]{43}$/);assert.match(target.searchParams.get('state'),/^[A-Za-z0-9_-]{43}$/);assert.equal(c.entries.get('sabeq-admin-section'),'paths');assert.equal(new URL(c.location.href).searchParams.has('signin'),false);const proof=c.entries.get('sabeq-admin-proof');assert.equal(Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(proof))).toString('base64url'),target.searchParams.get('challenge'));assert.equal(c.requests.length,0);assert.equal(target.searchParams.has('token'),false);
});
test('reopening the same public link generates new state rather than a shared credential',async()=>{
 const a=await client(home+'?signin=account');const b=await client(home+'?signin=account');assert.notEqual(a.entries.get('sabeq-admin-proof'),b.entries.get('sabeq-admin-proof'));assert.notEqual(a.entries.get('sabeq-admin-state'),b.entries.get('sabeq-admin-state'));
});
test('identity error does not loop into sign-in',async()=>{
 const c=await client(home+'?signin=account&login_error=identity_unavailable');assert.equal(c.navigations.length,0);assert.match(c.nodes.get('app').innerHTML,/تعذر إكمال هوية الدخول/);
});
test('existing session still goes through the server session check',async()=>{
 const match=source.match(/const SESSION\s*=\s*'([^']+)'/);assert.ok(match);const c=await client(home+'?signin=account',{stored:{[match[1]]:'synthetic-existing-session'}});assert.equal(c.navigations.length,0);assert.equal(c.requests.length,1);assert.match(c.requests[0][0],/\/api\/management\/session$/);
});
test('storage failure stays on login without navigating or fabricating a token',async()=>{
 const c=await client(home+'?signin=account',{storageFailure:true});assert.equal(c.navigations.length,0);assert.equal(c.requests.length,0);assert.match(c.nodes.get('app').innerHTML,/storage unavailable/);
});

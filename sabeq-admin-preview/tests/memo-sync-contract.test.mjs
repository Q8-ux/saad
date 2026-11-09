import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../admin.js',import.meta.url),'utf8');
test('admin memo section reads protected shared database rather than Bolt',()=>{
  assert.match(js,/const API = SERVICE \+ '\/api\/management\/';/);
  assert.match(js,/api\('memos\?'\+memoParams\(\)\)/);
  assert.doesNotMatch(js,/q8-ux-sabeq-admin-co-u4ma\.bolt\.host/);
});
test('memo records expose source and manual sync without inventing records',()=>{
  assert.match(js,/مصدر الطلبات الحالي: قاعدة بيانات الموقع الرسمية المشتركة/);
  assert.match(js,/مزامنة الطلبات الآن/);
  assert.match(js,/memoArchiveError=data\.officialError;renderMemos\(data\.officialAvailable,data\.officialError\)/);
  assert.match(js,/await api\('memos\?id='\+encodeURIComponent\(id\)\)/);
});

import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';

const entrySources=[
 ['GitHub admin',js],
 ['management mirror',readFileSync(new URL('../../sabeq-legal/research-source/public/management/admin.js',import.meta.url),'utf8')]
];
function entryFixture(source,href='https://q8-ux.github.io/saad/sabeq-admin-preview/'){
 const nodes=new Map(),events=new Map(),storage=new Map(),calls=[],redirects=[];
 let redirected;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',open:false,addEventListener(){},classList:{toggle(){},remove(){}},replaceChildren(){}});return nodes.get(id);};
 vm.runInNewContext(source,{
  document:{getElementById:node,addEventListener:(name,fn)=>events.set(name,fn),querySelectorAll:()=>[],hidden:false},
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  location:{href,hash:new URL(href).hash,pathname:'/saad/sabeq-admin-preview/',assign(url){redirects.push(url);redirected?.(url);}},
  history:{replaceState(){}},URL,URLSearchParams,AbortSignal,TextEncoder,Uint8Array,crypto:webcrypto,btoa,atob,Intl,Date,
  setTimeout(){},clearTimeout(){},setInterval(){},
  fetch:async(url,init)=>{calls.push({url,init});throw Error('Unexpected protected API request before authentication');}
 });
 return{node,storage,calls,redirects,async click(action){
  const button={dataset:{action},disabled:false};
  const target=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Sign-in did not redirect')),2000);
   redirected=url=>{clearTimeout(timer);resolve(url);};
  });
  events.get('click')({target:{closest:()=>button}});
  return{url:await target,button};
 }};
}
function verifyEntryProof(f,url){
 const verifier=f.storage.get('sabeq-admin-proof');
 assert.match(verifier,/^[A-Za-z0-9_-]{43}$/);
 assert.match(f.storage.get('sabeq-admin-state'),/^[A-Za-z0-9_-]{43}$/);
 assert.equal(url.searchParams.get('state'),f.storage.get('sabeq-admin-state'));
 assert.equal(url.searchParams.get('challenge'),createHash('sha256').update(verifier).digest('base64url'));
 assert.equal(url.searchParams.has('verifier'),false);
}
for(const [label,source] of entrySources){
 test(label+': signed-out entry offers account sign-in without a password form or data reads',()=>{
  const f=entryFixture(source);
  assert.match(f.node('app').innerHTML,/data-action="sign-in"/);
  assert.match(f.node('app').innerHTML,/data-action="switch-account"/);
  assert.doesNotMatch(f.node('app').innerHTML,/<form|<input|password-login/);
  assert.equal(f.calls.length,0);
 });
 test(label+': sign-in uses the deployed login endpoint with a valid PKCE challenge and requested section',async()=>{
  const f=entryFixture(source,'https://q8-ux.github.io/saad/sabeq-admin-preview/#mail');
  const {url,button}=await f.click('sign-in'),target=new URL(url);
  assert.equal(target.origin,'https://sabeq-legal-public.centrino.chatgpt.site');
  assert.equal(target.pathname,'/api/management/login');
  verifyEntryProof(f,target);
  assert.equal(f.storage.get('sabeq-admin-section'),'mail');
  assert.equal(button.disabled,true);
  assert.equal(f.calls.length,0);
 });
 test(label+': switching accounts retains the same protected return path and PKCE proof',async()=>{
  const f=entryFixture(source),{url}=await f.click('switch-account'),target=new URL(url);
  assert.equal(target.origin,'https://sabeq-legal-public.centrino.chatgpt.site');
  assert.equal(target.pathname,'/signout-with-chatgpt');
  const returnPath=target.searchParams.get('return_to');
  assert.ok(returnPath.startsWith('/api/management/login?'));
  const login=new URL(returnPath,target.origin);
  assert.equal(login.origin,target.origin);
  verifyEntryProof(f,login);
  assert.equal(f.calls.length,0);
 });
 test(label+': a memo reference survives sign-in without requesting the saved memo before authentication',async()=>{
  const f=entryFixture(source,'https://q8-ux.github.io/saad/sabeq-admin-preview/#memos?record=synthetic-memo');
  await f.click('sign-in');
  assert.equal(f.storage.get('sabeq-admin-section'),'memos');
  assert.equal(f.storage.get('sabeq-admin-record'),'synthetic-memo');
  assert.equal(f.node('detail').open,false);
  assert.equal(f.calls.length,0);
 });
 test(label+': a mismatched callback state cannot exchange a code or read protected data',async()=>{
  const f=entryFixture(source,'https://q8-ux.github.io/saad/sabeq-admin-preview/?code=synthetic-code&state=unexpected');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.calls.length,0);
  assert.match(f.node('app').innerHTML,/طلب الدخول لا يطابق هذه الجلسة/);
  assert.match(f.node('app').innerHTML,/data-action="sign-in"/);
 });
 test(label+': a denied account can switch accounts without password instructions',()=>{
  const f=entryFixture(source,'https://q8-ux.github.io/saad/sabeq-admin-preview/?login_error=not_authorized');
  assert.match(f.node('app').innerHTML,/غير مصرح له بإدارة سابق/);
  assert.match(f.node('app').innerHTML,/data-action="switch-account"/);
  assert.doesNotMatch(f.node('app').innerHTML,/<form|<input|اسم مستخدم وكلمة مرور/);
  assert.equal(f.calls.length,0);
 });
 test(label+': every new sign-in gets fresh state and proof values',async()=>{
  const f=entryFixture(source);
  await f.click('sign-in');
  const first={state:f.storage.get('sabeq-admin-state'),proof:f.storage.get('sabeq-admin-proof')};
  await f.click('sign-in');
  assert.notEqual(f.storage.get('sabeq-admin-state'),first.state);
  assert.notEqual(f.storage.get('sabeq-admin-proof'),first.proof);
 });
}

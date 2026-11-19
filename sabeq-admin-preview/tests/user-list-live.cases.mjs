import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../control.js',import.meta.url),'utf8');
async function fixture(){
 const timers=[],events=new Map(),calls=[],note={textContent:''},root={innerHTML:'',contains:()=>false,querySelector:()=>note,querySelectorAll:()=>[]};let users=[],respond=null;
 const context={document:{hidden:false,activeElement:null,addEventListener:(key,fn)=>events.set(key,fn)},setInterval:(fn,ms)=>timers.push({fn,ms}),URLSearchParams,FormData,console};
 vm.runInNewContext(source,context);const api=async path=>{calls.push(path);return respond?respond(path):path.startsWith('users')?{users,hasMore:false}:{accounts:[]};};
 await context.SabeqControl.mount(root,'users',api,()=>{});
 const click=async action=>{root.onclick({target:{closest:()=>({dataset:{control:action}})},preventDefault(){},stopPropagation(){}});await new Promise(resolve=>setImmediate(resolve));};
 return{context,root,timers,events,calls,note,click,setUsers:value=>users=value,setRespond:fn=>respond=fn};
}
test('the users list picks up a new account after five seconds',async()=>{const f=await fixture();assert.equal(f.timers[0].ms,5000);f.setUsers([{id:'synthetic',name:'حساب اصطناعي وصل الآن',email:'new@example.test',status:'active'}]);await f.timers[0].fn();assert.match(f.root.innerHTML,/حساب اصطناعي وصل الآن/);});
test('polling leaves user and login forms intact and pauses on a hidden page',async()=>{const f=await fixture();await f.click('new-user');const html=f.root.innerHTML,n=f.calls.length;await f.timers[0].fn();assert.equal(f.calls.length,n);assert.equal(f.root.innerHTML,html);await f.click('close-user');f.context.document.hidden=true;const count=f.calls.length;await f.timers[0].fn();assert.equal(f.calls.length,count);});
test('concurrent polls and responses after leaving cannot overwrite another section',async()=>{const f=await fixture();let resolve;f.setRespond(()=>new Promise(done=>resolve=done));const pending=f.timers[0].fn(),n=f.calls.length;await f.timers[0].fn();assert.equal(f.calls.length,n);f.context.SabeqControl.leave();f.root.innerHTML='قسم آخر';resolve({users:[{id:'old',name:'رد قديم'}]});await pending;assert.equal(f.root.innerHTML,'قسم آخر');});
test('a failed refresh retains the list and reports the connection failure',async()=>{const f=await fixture();const html=f.root.innerHTML;f.setRespond(async()=>{throw Error('synthetic offline');});await f.timers[0].fn();assert.equal(f.root.innerHTML,html);assert.match(f.note.textContent,/تعذر تحديث المستخدمين/);});

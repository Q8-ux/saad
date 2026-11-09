import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/management/admin.js',import.meta.url),'utf8');

async function fixture(options={}){
 const nodes=new Map(),events=new Map(),calls=[],timers=[],storage=new Map(Object.entries(options.storage||{}));
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',open:false,classList:{toggle(){},remove(){}},addEventListener(){},focus(){},setAttribute(){},removeAttribute(){},showModal(){this.open=true;}});return nodes.get(id);};
 const document={getElementById:node,addEventListener:(key,fn)=>events.set(key,fn),querySelectorAll:()=>[],hidden:false};
 const href=options.href||'https://preview.invalid/#memos';
 vm.runInNewContext(source,{document,sessionStorage:{getItem:key=>storage.has(key)?storage.get(key):key==='sabeq-management-session'&&options.signedIn!==false?'synthetic-test-session':null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{href,hash:new URL(href).hash,pathname:'/'},history:{replaceState(){}},URL,URLSearchParams,AbortSignal,Intl,Date,console,setTimeout(){},clearTimeout(){},setInterval:fn=>timers.push(fn),FormData:class{constructor(form){this.values=form.values;}get(key){return this.values[key]||'';}[Symbol.iterator](){return Object.entries(this.values)[Symbol.iterator]();}},fetch:async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('/session')?{manager:options.manager||{role:'administrator'}}:url.endsWith('/exchange')?{token:'synthetic-test-session'}:new URL(url).searchParams.has('id')?{memo:{id:'synthetic-memo',client_name:'اسم اختبار',status:'needs_review',input_json:'{}',output_text:'نص مذكرة اصطناعية محفوظة.'}}:{memos:[{id:'synthetic-memo',client_name:'اسم اختبار',status:'needs_review',has_output:1,visitor_type:'guest'}],hasMore:false,officialAvailable:false});}});
 await new Promise(resolve=>setImmediate(resolve));
 return{calls,timers,document,node,storage,submit:async values=>{await events.get('submit')({preventDefault(){},target:{dataset:{form:'search'},matches:()=>true,values,querySelector:()=>({disabled:false})}});await new Promise(resolve=>setImmediate(resolve));}};
}
test('Memos keeps all request states on the same backend and offers the generated filter',async()=>{
 const f=await fixture(),request=f.calls.find(c=>c.url.includes('/memos?'));
 assert.equal(new URL(request.url).origin,'https://sabeq-legal-public.centrino.chatgpt.site');
 assert.equal(new URL(request.url).searchParams.get('view'),'all');
 assert.match(f.node('workspace').innerHTML,/المذكرات المولدة|المذكرات المولّدة/);
 assert.match(f.node('workspace').innerHTML,/كل طلبات التوليد/);
 assert.match(f.node('workspace').innerHTML,/data-memo="synthetic-memo"/);
 assert.equal(request.init.headers.Authorization,'Bearer synthetic-test-session');
});
test('memo supervisor deep links fall back to the permitted memo section and hide all system configuration',async()=>{
 const f=await fixture({href:'https://preview.invalid/#payments',manager:{role:'memo_supervisor',username:'ahmad',sections:['memos','bookings','inbox']}});
 assert.ok(f.calls.some(c=>c.url.includes('/memos?')));assert.ok(!f.calls.some(c=>/\/(payments|snapshot|users|gmail|control-accounts)(?:\?|$)/.test(c.url)));
 assert.match(f.node('app').innerHTML,/data-section="memos"/);assert.match(f.node('app').innerHTML,/data-section="bookings"/);assert.match(f.node('app').innerHTML,/data-section="inbox"/);assert.doesNotMatch(f.node('app').innerHTML,/data-section="(?:payments|users|programmer|mail|site)"/);
});
test('switching to all requests retains search and status on the server',async()=>{
 const f=await fixture();await f.submit({view:'all',q:'اسم اختبار',status:'failed'});
 const url=new URL(f.calls.at(-1).url);assert.equal(url.searchParams.get('view'),'all');assert.equal(url.searchParams.get('q'),'اسم اختبار');assert.equal(url.searchParams.get('status'),'failed');
});
test('the visible memo list refreshes without discarding an open memo or polling a hidden page',async()=>{
 const f=await fixture();let n=f.calls.length;await f.timers[0]();assert.equal(f.calls.length,n+1);
 f.node('detail').open=true;n=f.calls.length;await f.timers[0]();assert.equal(f.calls.length,n);
 f.node('detail').open=false;f.document.activeElement={matches:()=>true};await f.timers[0]();assert.equal(f.calls.length,n);f.document.activeElement=null;f.document.hidden=true;await f.timers[0]();assert.equal(f.calls.length,n);
});

test('an authenticated record link opens that saved memo through the existing protected endpoint',async()=>{
 const f=await fixture({href:'https://preview.invalid/#memos?record=synthetic-memo'});
 assert.ok(f.calls.some(c=>new URL(c.url).searchParams.get('id')==='synthetic-memo'));
 assert.equal(f.node('detail').open,true);assert.match(f.node('detail-content').innerHTML,/نص مذكرة اصطناعية محفوظة/);
});
test('an unauthenticated record link retains only the reference and never requests its contents',async()=>{
 const f=await fixture({signedIn:false,href:'https://preview.invalid/#memos?record=synthetic-memo'});
 assert.equal(f.calls.length,0);assert.equal(f.storage.get('sabeq-admin-record'),'synthetic-memo');assert.equal(f.node('detail').open,false);
});
test('the record reference survives the existing PKCE exchange before protected retrieval',async()=>{
 const f=await fixture({signedIn:false,href:'https://preview.invalid/?code=synthetic-code&state=synthetic-state',storage:{'sabeq-admin-section':'memos','sabeq-admin-record':'synthetic-memo','sabeq-admin-proof':'synthetic-proof','sabeq-admin-state':'synthetic-state'}});
 const detail=f.calls.find(c=>new URL(c.url).searchParams.get('id')==='synthetic-memo');assert.ok(detail);assert.equal(detail.init.headers.Authorization,'Bearer synthetic-test-session');assert.equal(f.node('detail').open,true);assert.equal(f.storage.has('sabeq-admin-record'),false);
});

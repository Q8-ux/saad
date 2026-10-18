import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=ts.transpileModule(read('lib/visitor-analytics.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const consent='sabeq-analytics-consent',visitor='sabeq-analytics-visitor',session='sabeq-analytics-session';
function storage(initial={}) {
 const data=new Map(Object.entries(initial));
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function browser(initial={},nav={}) {
 const localStorage=storage(initial),sessionStorage=storage(),window=new EventTarget(),document=new EventTarget();
 Object.assign(document,{visibilityState:'visible',referrer:''});
 Object.assign(window,{localStorage,sessionStorage});
 const location={hostname:'example.test',hash:''};window.location=location;
 const calls=[],timers=new Map();let uuids=0,time=0;
 const exports={};
 vm.runInNewContext(source,{exports,require:name=>name.includes('analytics-contract')?{sections:['home','assistant','memo']}:{apiUrl:path=>path},navigator:{userAgent:'synthetic',doNotTrack:'0',...nav},window,document,localStorage,sessionStorage,location,crypto:{randomUUID:()=>{uuids++;return crypto.randomUUID();}},Date,performance:{now:()=>time},URL,Event,AbortController,AbortSignal,setInterval:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id),fetch:(url,init)=>{calls.push({url,...init,body:JSON.parse(init.body)});return Promise.resolve({ok:true});}});
 return {api:exports,localStorage,sessionStorage,window,document,calls,timers,get uuids(){return uuids;},tick(){time+=15000;for(const fn of [...timers.values()])fn();},section(id){const event=new Event('sabeq-analytics-section');event.detail=id;window.dispatchEvent(event);},storageEvent(key,newValue){const event=new Event('storage');Object.assign(event,{key,newValue});window.dispatchEvent(event);}};
}

for(const [name,initial] of [['new visitor',{}],['legacy implicit allow',{'sabeq-analytics-opt-out':'0',[visitor]:'old'}],['invalid consent',{[consent]:'true'}],['explicit refusal',{[consent]:'denied'}]]) {
 test(`${name}: no identifiers, timers or events before explicit consent`,()=>{
  const b=browser(initial);b.sessionStorage.setItem(session,'old');const close=b.api.startVisitorAnalytics();
  b.section('memo');b.tick();close();
  assert.equal(b.uuids,0);assert.equal(b.calls.length,0);assert.equal(b.timers.size,0);
  assert.equal(b.localStorage.getItem(visitor),null);assert.equal(b.sessionStorage.getItem(session),null);
 });
}
test('accept starts once immediately, measures only post-consent activity and survives a reload',()=>{
 const b=browser();const close=b.api.startVisitorAnalytics();b.section('memo');
 assert.equal(b.api.setAnalyticsConsent('granted'),true);assert.equal(b.calls.length,1);
 assert.equal(b.calls[0].body.event,'page_view');assert.equal(b.calls[0].body.page,'home');
 b.api.setAnalyticsConsent('granted');assert.equal(b.calls.length,1);assert.equal(b.timers.size,1);
 b.section('assistant');assert.equal(b.calls.at(-1).body.page,'assistant');
 b.tick();assert.equal(b.calls.at(-1).body.event,'heartbeat');
 const id=b.localStorage.getItem(visitor);close();assert.equal(b.timers.size,0);
 const reload=b.api.startVisitorAnalytics();assert.equal(b.localStorage.getItem(visitor),id);reload();
});
test('withdraw aborts in-flight requests, removes only analytics IDs and never flushes on cleanup',()=>{
 const b=browser({[consent]:'granted','sabeq-session-token':'synthetic-auth','sabeq-theme':'dark'});
 const close=b.api.startVisitorAnalytics(),oldVisitor=b.localStorage.getItem(visitor),sent=b.calls.length;
 b.api.setAnalyticsConsent('denied');b.section('memo');b.tick();close();
 assert.equal(b.calls.length,sent);assert.equal(b.timers.size,0);assert.ok(b.calls.every(call=>call.signal.aborted));
 assert.equal(b.localStorage.getItem(visitor),null);assert.equal(b.sessionStorage.getItem(session),null);
 assert.equal(b.localStorage.getItem('sabeq-session-token'),'synthetic-auth');assert.equal(b.localStorage.getItem('sabeq-theme'),'dark');
 const reload=b.api.startVisitorAnalytics();assert.equal(b.calls.length,sent);
 b.api.setAnalyticsConsent('granted');assert.equal(b.calls.length,sent+1);assert.notEqual(b.localStorage.getItem(visitor),oldVisitor);reload();
});
test('same-origin tabs react to policy acceptance, refusal, preference removal and clear()',()=>{
 const b=browser();const close=b.api.startVisitorAnalytics();
 b.localStorage.setItem(consent,'granted');b.storageEvent(consent,'granted');assert.equal(b.calls.length,1);
 b.localStorage.setItem(consent,'denied');b.storageEvent(consent,'denied');assert.equal(b.timers.size,0);
 b.localStorage.setItem(consent,'granted');b.storageEvent(consent,'granted');assert.equal(b.calls.length,2);
 b.localStorage.removeItem(consent);b.storageEvent(consent,null);assert.equal(b.timers.size,0);
 b.localStorage.setItem(consent,'granted');b.storageEvent(consent,'granted');b.localStorage.removeItem(consent);b.storageEvent(null,null);
 b.tick();assert.equal(b.calls.length,3);assert.equal(b.localStorage.getItem(visitor),null);close();
});
test('delayed cross-tab refusal discards the old session even after a quick reacceptance',()=>{
 const b=browser({[consent]:'granted'}),close=b.api.startVisitorAnalytics(),old=b.localStorage.getItem(visitor);
 b.localStorage.setItem(consent,'denied');b.localStorage.setItem(consent,'granted');
 b.storageEvent(consent,'denied');assert.equal(b.timers.size,0);assert.equal(b.calls.length,1);assert.equal(b.localStorage.getItem(visitor),null);
 b.storageEvent(consent,'granted');assert.equal(b.calls.length,2);assert.notEqual(b.localStorage.getItem(visitor),old);close();
});
for(const nav of [{doNotTrack:'1'},{globalPrivacyControl:true},{webdriver:true}]) test(`privacy restriction ${JSON.stringify(nav)} overrides consent`,()=>{
 const b=browser({[consent]:'granted',[visitor]:'old'},nav);const close=b.api.startVisitorAnalytics();b.api.setAnalyticsConsent('granted');
 assert.equal(b.calls.length,0);assert.equal(b.uuids,0);assert.equal(b.localStorage.getItem(visitor),null);close();
});
test('internal exclusion prevents collection even with consent',()=>{
 const b=browser({[consent]:'granted','sabeq-analytics-internal':'1'});const close=b.api.startVisitorAnalytics();assert.equal(b.calls.length,0);assert.equal(b.uuids,0);close();
});
test('blocked preference reads/writes fail closed without breaking services',()=>{
 const b=browser({[consent]:'granted','sabeq-session-token':'keep'});
 b.localStorage.getItem=()=>{throw Error('blocked');};b.localStorage.setItem=()=>{throw Error('blocked');};
 const close=b.api.startVisitorAnalytics();assert.equal(b.api.setAnalyticsConsent('granted'),false);b.tick();
 assert.equal(b.calls.length,0);assert.equal(b.uuids,0);assert.equal(b.api.getAnalyticsConsent(),'unavailable');close();
});
test('failed withdrawal persistence still stops this page immediately',()=>{
 const b=browser({[consent]:'granted'});const close=b.api.startVisitorAnalytics();
 b.localStorage.setItem=()=>{throw Error('blocked');};assert.equal(b.api.setAnalyticsConsent('denied'),false);
 b.section('memo');b.tick();assert.equal(b.calls.length,1);assert.equal(b.timers.size,0);assert.equal(b.localStorage.getItem(visitor),null);close();
});
test('a withdrawn preference is checked before sending even without a storage event',()=>{
 const b=browser({[consent]:'granted'});const close=b.api.startVisitorAnalytics();b.localStorage.setItem(consent,'denied');b.tick();b.section('memo');close();
 assert.equal(b.calls.length,1);assert.equal(b.timers.size,0);assert.equal(b.sessionStorage.getItem(session),null);
});

// Execute real component event handlers/effects with deterministic DOM geometry.
function mount(path,deps,globals={},attach=()=>{}) {
 const slots=[];let cursor=0,pending=[],dirty=false,tree;
 const react={...React,
  useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(next!==slots[i].value){slots[i].value=next;dirty=true;}}];},
  useRef(initial){const i=cursor++;return slots[i]??=( {current:initial} );},
  useEffect(effect,dependencies){const i=cursor++,before=slots[i];if(!before||!dependencies||dependencies.some((value,at)=>!Object.is(value,before.dependencies[at])))pending.push(()=>{before?.cleanup?.();slots[i]={dependencies,cleanup:effect()};});},
 };
 const exports={},js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>name==='react'?react:deps[name]??require(name),Intl,Date,...globals});
 const walk=node=>{if(!node||typeof node!=='object')return [];return [node,...React.Children.toArray(node.props?.children).flatMap(walk)];};
 return {render(props){for(let pass=0;pass<10;pass++){cursor=0;pending=[];dirty=false;tree=exports.default(props);for(const node of walk(tree))attach(node);for(const effect of pending)effect();if(!dirty)return tree;}throw Error('component did not settle');},nodes:()=>walk(tree),close(){for(const slot of slots)slot?.cleanup?.();}};
}
for(const [language,accept,refuse,withdraw] of [['ar','أوافق على التحليلات','أرفض التحليلات','سحب الموافقة'],['en','Accept analytics','Reject analytics','Withdraw consent'],['ur','پیمائش قبول کریں','پیمائش مسترد کریں','رضامندی واپس لیں']]) {
 test(`${language} real consent controls reject, accept and withdraw without blocking the legal service`,()=>{
  const b=browser({'sabeq-session-token':'synthetic-auth'}),close=b.api.startVisitorAnalytics();
  const ui=mount('app/analytics-consent.tsx',{'../lib/visitor-analytics':b.api,'./privacy-notice':{PrivacyLink:()=>React.createElement('a',{href:'./privacy.html'},'Policy')}},{window:b.window});
  const render=()=>ui.render({language}),click=label=>{const button=ui.nodes().find(node=>node.type==='button'&&node.props.children===label);assert.ok(button,label);button.props.onClick();render();};
  let html=renderToStaticMarkup(render());assert.match(html,new RegExp(`dir="${language==='en'?'ltr':'rtl'}"`));assert.ok(html.includes(accept)&&html.includes(refuse));
  if(language==='en')assert.doesNotMatch(html,/[\u0600-\u06ff]/);
  click(refuse);assert.equal(b.calls.length,0);assert.equal(b.localStorage.getItem(consent),'denied');
  ui.nodes().find(node=>node.type==='button').props.onClick();render();click(accept);assert.equal(b.calls.length,1);assert.equal(b.localStorage.getItem(consent),'granted');
  click(withdraw);b.tick();assert.equal(b.calls.length,1);assert.equal(b.localStorage.getItem(consent),'denied');assert.equal(b.localStorage.getItem('sabeq-session-token'),'synthetic-auth');
  close();ui.close();
 });
}
test('policy page controls use the same explicit contract and stop an open main-site tab',()=>{
 const b=browser(),close=b.api.startVisitorAnalytics(),handlers={};
 const status={textContent:'',dataset:{unset:'pending',disabled:'denied',enabled:'granted',restricted:'restricted',unavailable:'unavailable'}};
 const buttons=['disable','enable'].map(choice=>({dataset:{analyticsChoice:choice},addEventListener:(_,fn)=>handlers[choice]=fn}));
 const policyWindow=new EventTarget();
 vm.runInNewContext(read('public/privacy.js'),{document:{getElementById:()=>status,querySelectorAll:()=>buttons},navigator:{},window:policyWindow,localStorage:b.localStorage,sessionStorage:b.sessionStorage});
 assert.equal(status.textContent,'pending');assert.equal(b.calls.length,0);
 handlers.enable();b.storageEvent(consent,'granted');assert.equal(status.textContent,'granted');assert.equal(b.calls.length,1);
 handlers.disable();b.storageEvent(consent,'denied');b.tick();assert.equal(status.textContent,'denied');assert.equal(b.calls.length,1);assert.equal(b.timers.size,0);
 assert.equal(b.localStorage.getItem(visitor),null);close();
});

for(const language of ['ar','en','ur']) test(`${language} manual news strip follows swipes and keyboard navigation without autoplay controls`,()=>{
 const rtl=language!=='en',direction=rtl?-1:1,window=new EventTarget(),timers=new Map();
 window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 window.setInterval=fn=>{timers.set(1,fn);return 1;};window.clearInterval=id=>timers.delete(id);
 const scrolls=[],element={scrollLeft:0,scrollWidth:966,clientWidth:390,getBoundingClientRect:()=>({left:0,right:390}),scrollTo({left}){this.scrollLeft=rtl?Math.max(-576,Math.min(0,left)):Math.min(576,Math.max(0,left));scrolls.push(this.scrollLeft);}};
 element.children=[0,1,2].map(i=>({getBoundingClientRect(){const leading=(rtl?390:0)+direction*i*322-element.scrollLeft;return rtl?{right:leading,left:leading-300}:{left:leading,right:leading+300};}}));
 const posts=[0,1,2].map(i=>({id:String(i),title:{ar:'خبر',en:'News',ur:'خبر'},source:'https://example.test/post',artwork:{src:'/synthetic.jpg',width:480,height:640}}));
 const ui=mount('app/group-posts-strip.tsx',{'./group-posts':{groupPosts:posts},'../lib/runtime-urls':{assetUrl:path=>path}},{window,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){}}},node=>{if(node.props?.ref&&node.props.className?.startsWith('group-posts-viewport'))node.props.ref.current=element;});
 const render=()=>ui.render({language,posts}),press=key=>{let prevented=false;ui.nodes().find(node=>node.props?.className?.startsWith('group-posts-viewport')).props.onKeyDown({key,preventDefault(){prevented=true;}});render();assert.equal(prevented,true);};
 const next=rtl?'ArrowLeft':'ArrowRight',previous=rtl?'ArrowRight':'ArrowLeft';
 render();assert.equal(timers.size,0);assert.equal(ui.nodes().some(node=>node.props?.className==='group-posts-controls'),false);
 assert.equal(ui.nodes().find(node=>node.props?.className?.startsWith('group-posts-viewport')).props.tabIndex,0);
 element.scrollLeft=direction*322;press(next);assert.equal(element.scrollLeft,direction*576);
 press(next);assert.equal(element.scrollLeft,0);
 element.scrollLeft=direction*322;press(previous);assert.equal(element.scrollLeft,0);
 press(next);assert.equal(element.scrollLeft,direction*322);
 press(next);assert.equal(element.scrollLeft,direction*576);
 press('ArrowRight');assert.equal(element.scrollLeft,rtl?direction*322:0);
 ui.close();assert.equal(timers.size,0);assert.ok(scrolls.length>=4);
});

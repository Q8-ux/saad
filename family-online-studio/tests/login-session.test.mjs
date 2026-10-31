import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createStudioLogin} from '../assets/login.mjs';

const apiBase='https://gateway.invalid';
const key='fo-studio-login-session-v1:'+apiBase;
const originals=Object.fromEntries(['window','sessionStorage','localStorage','fetch'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
afterEach(()=>{for(const [k,d] of Object.entries(originals)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),values};}
function browser(saved=storage()){
 const events=new EventTarget();
 globalThis.window={addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 globalThis.sessionStorage=storage();globalThis.localStorage=saved;return saved;
}
function harness(config={apiBase}){
 let cursor=0;const hooks=[],effects=[],pending=[];
 function Studio(){}
 const React={
  createElement:(type,props,...children)=>({type,props:props||{},children}),
  useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v;}];},
  useRef(initial){const i=cursor++;if(!(i in hooks))hooks[i]={current:initial};return hooks[i];},
  useEffect(callback){const i=cursor++;if(!(i in hooks)){hooks[i]=true;pending.push(()=>{effects[i]=callback();});}}
 };
 const Component=createStudioLogin({React,Studio,config});
 let tree;
 function render(){cursor=0;tree=Component();for(const run of pending.splice(0))run();return tree;}
 function nodes(node=tree){return [node,...(node?.children||[]).filter(x=>x&&typeof x==='object').flatMap(x=>nodes(x))];}
 render();
 return {render,nodes,Studio,get tree(){return tree;},unmount(){for(const fn of effects)fn?.();}};
}
async function login(h,expiresIn=7200){
 globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({token:'synthetic-test-session',expiresIn})});
 h.nodes().find(n=>n.type==='input'&&n.props.name==='username').props.onChange({target:{value:'synthetic-user'}});
 h.nodes().find(n=>n.type==='input'&&n.props.name==='password').props.onChange({target:{value:'synthetic-password-for-test'}});
 h.render();await h.nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});h.render();
}

test('a new tab requires the existing login form',()=>{browser();const h=harness();assert.equal(h.tree.type,'main');assert.equal(window.__STUDIO_SESSION__,'');});
test('successful authentication stores the short-lived bearer, never username or password',async()=>{
 const saved=browser(),h=harness();await login(h);assert.equal(h.tree.type,h.Studio);
 const entry=JSON.parse(saved.getItem(key));assert.equal(entry.token,'synthetic-test-session');assert.equal(entry.apiBase,apiBase);assert.ok(entry.expiresAt>Date.now());assert.ok(entry.expiresAt<=Date.now()+7200000);
 assert.deepEqual(Object.keys(entry).sort(),['apiBase','expiresAt','token']);assert.ok(!saved.getItem(key).includes('synthetic-password-for-test'));assert.ok(!saved.getItem(key).includes('synthetic-user'));
});
test('reload or opening another work in a new tab restores the session before rendering Studio',async()=>{
 const saved=browser(),first=harness();await login(first);first.unmount();browser(saved);
 globalThis.fetch=()=>{throw Error('restoration must not resubmit credentials');};
 const restored=harness();assert.equal(restored.tree.type,restored.Studio);assert.equal(window.__STUDIO_SESSION__,'synthetic-test-session');
});
test('expired sessions are discarded and show login',()=>{
 const saved=storage();saved.setItem(key,JSON.stringify({apiBase,token:'expired-test-session',expiresAt:Date.now()-1}));browser(saved);const h=harness();assert.equal(h.tree.type,'main');assert.equal(saved.getItem(key),null);assert.equal(window.__STUDIO_SESSION__,'');
});
test('explicit sign-out removes the persisted session',async()=>{
 const saved=browser(),h=harness();await login(h);h.tree.props.onSignOut();h.render();assert.equal(h.tree.type,'main');assert.equal(saved.getItem(key),null);assert.equal(window.__STUDIO_SESSION__,'');
});
test('the existing expiry event clears storage and locks the editor',async()=>{
 const saved=browser(),h=harness();await login(h);window.dispatchEvent(new Event('studio-session-expired'));h.render();assert.equal(h.tree.type,'main');assert.equal(saved.getItem(key),null);assert.equal(window.__STUDIO_SESSION__,'');
});
test('a session cannot be reused for a different API',async()=>{
 const saved=browser(),first=harness();await login(first);first.unmount();browser(saved);const other=harness({apiBase:'https://other.invalid'});assert.equal(other.tree.type,'main');assert.equal(window.__STUDIO_SESSION__,'');
});
test('unavailable browser storage does not block ordinary authentication',async()=>{
 browser({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}});const h=harness();await login(h);assert.equal(h.tree.type,h.Studio);assert.equal(window.__STUDIO_SESSION__,'synthetic-test-session');
});
test('a failed login never creates a remembered session',async()=>{
 const saved=browser(),h=harness();globalThis.fetch=async()=>({ok:false,status:401,json:async()=>({error:'invalid'})});await h.nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});h.render();assert.equal(h.tree.type,'main');assert.equal(saved.getItem(key),null);
});
test('the remembered lifetime never exceeds the gateway session ceiling',async()=>{
 const saved=browser(),h=harness();await login(h,86400);assert.ok(JSON.parse(saved.getItem(key)).expiresAt<=Date.now()+7200000);
});
test('logout in another tab locks this editor as well',async()=>{
 const saved=browser(),h=harness();await login(h);saved.removeItem(key);const event=new Event('storage');Object.defineProperties(event,{key:{value:key},newValue:{value:null}});window.dispatchEvent(event);h.render();assert.equal(h.tree.type,'main');assert.equal(window.__STUDIO_SESSION__,'');
});
test('a valid tab-scoped session migrates without extending its expiry',()=>{
 const saved=browser(),expiresAt=Date.now()+300000;sessionStorage.setItem(key,JSON.stringify({apiBase,token:'legacy-tab-session',expiresAt}));const h=harness();assert.equal(h.tree.type,h.Studio);assert.equal(JSON.parse(saved.getItem(key)).expiresAt,expiresAt);assert.equal(sessionStorage.getItem(key),null);
});
test('an expired tab-scoped session is never migrated',()=>{
 const saved=browser();sessionStorage.setItem(key,JSON.stringify({apiBase,token:'expired-tab-session',expiresAt:Date.now()-1}));const h=harness();assert.equal(h.tree.type,'main');assert.equal(saved.getItem(key),null);assert.equal(sessionStorage.getItem(key),null);
});

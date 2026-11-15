import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createStudioLogin} from '../assets/login.mjs';

const apiBase='https://gateway.invalid';
const key='fo-studio-account-session-v2:'+apiBase;
const oldKey='fo-studio-login-session-v1:'+apiBase;
const originals=Object.fromEntries(['window','sessionStorage','localStorage','fetch'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
afterEach(()=>{for(const [k,d] of Object.entries(originals)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}});
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),values};}
function browser(saved=storage(),tab=storage()){
 const events=new EventTarget();
 globalThis.window={addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 globalThis.sessionStorage=tab;globalThis.localStorage=saved;return tab;
}
function harness(config={apiBase}){
 let cursor=0;const hooks=[],effects=[],pending=[];
 function Studio(){}
 const React={
  createElement:(type,props,...children)=>({type,props:props||{},children}),
  Suspense:Symbol('Suspense'),lazy:loader=>({loader}),
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

const profile={id:'writer-one',username:'synthetic-user'};
async function fillAndSubmit(h){
 h.nodes().find(n=>n.type==='input'&&n.props.name==='username').props.onChange({target:{value:'synthetic-user'}});
 h.nodes().find(n=>n.type==='input'&&n.props.name==='password').props.onChange({target:{value:'synthetic-password-for-test'}});
 h.render();await h.nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});h.render();
}
async function directLogin(h,expiresIn=7200){
 globalThis.fetch=async()=>Response.json({token:'synthetic-test-session',account:profile,expiresIn});
 await fillAndSubmit(h);
}
const workspace=h=>h.tree.children[0];

test('legacy unscoped browser sessions cannot open the editor',()=>{
 const local=storage(),tab=browser(local);
 local.setItem(oldKey,JSON.stringify({apiBase,token:'shared-session',expiresAt:Date.now()+300000}));
 const h=harness();
 assert.equal(h.tree.type,'main');
 assert.equal(window.__STUDIO_SESSION__,'');
 assert.equal(local.getItem(oldKey),null);
 assert.equal(tab.getItem(key),null);
});
test('persists only scoped session data in the current tab',async()=>{
 const tab=browser(),h=harness();await directLogin(h,86400);
 assert.equal(workspace(h).props.account.id,'writer-one');
 const entry=JSON.parse(tab.getItem(key));
 assert.equal(entry.token,'synthetic-test-session');
 assert.equal(entry.accountId,'writer-one');
 assert.ok(entry.expiresAt>Date.now()&&entry.expiresAt<=Date.now()+7200000);
 assert.equal(localStorage.getItem(key),null);
 assert.ok(!tab.getItem(key).includes('synthetic-password-for-test'));
 assert.ok(!tab.getItem(key).includes('synthetic-user'));
});
test('reload reuses the scoped session in this tab and another tab starts at login',async()=>{
 const tab=browser(),first=harness();await directLogin(first);first.unmount();
 browser(storage(),tab);
 const restored=harness();
 assert.equal(workspace(restored).props.account.id,profile.id);
 browser(localStorage);
 assert.equal(harness().tree.type,'main');
});
test('expired sessions are discarded',()=>{
 const tab=browser();
 tab.setItem(key,JSON.stringify({apiBase,token:'expired-test-session',accountId:profile.id,expiresAt:Date.now()-1}));
 const h=harness();assert.equal(h.tree.type,'main');assert.equal(tab.getItem(key),null);
});
test('the legacy transport must verify the account before rendering or storing a session',async()=>{
 const tab=browser(),h=harness();let proof;
 globalThis.fetch=async(url,options)=>{
  if(url.pathname==='/api/auth'){
   const input=JSON.parse(options.body);
   const raw=Buffer.from(input.code.split(':')[1],'base64url');
   proof=JSON.parse(raw.toString())[2];
   return Response.json({token:'transport-session'});
  }
  assert.equal(url.search,'?studioRelay=account');
  assert.equal(options.body.get('session'),proof);
  assert.equal(options.body.get('path'),'/api/projects');
  assert.equal(options.headers.Authorization,'Bearer transport-session');
  return Response.json({error:'missing-account'},{status:401});
 };
 await fillAndSubmit(h);
 assert.equal(h.tree.type,'main');assert.equal(tab.getItem(key),null);
});
test('sign-out revokes the account session and clears the current tab',async()=>{
 const tab=browser(),h=harness();let proof,last;
 globalThis.fetch=async(url,options)=>{
  if(url.pathname==='/api/auth'){
   proof=JSON.parse(Buffer.from(JSON.parse(options.body).code.split(':')[1],'base64url').toString())[2];
   return Response.json({token:'transport-session'});
  }
  assert.equal(options.body.get('session'),proof);
  last=options.body.get('path');return Response.json({account:profile,projects:[]});
 };
 await fillAndSubmit(h);
 assert.equal(workspace(h).props.account.id,profile.id);
 assert.equal(last,'/api/projects');
 workspace(h).props.onSignOut();h.render();
 assert.equal(last,'/api/auth/logout');
 assert.equal(h.tree.type,'main');
 assert.equal(tab.getItem(key),null);
 assert.equal(window.__STUDIO_SESSION__,'');
});
test('session-expired clears the scoped session and the transport',async()=>{
 const tab=browser(),h=harness();await directLogin(h);
 window.dispatchEvent(new Event('studio-session-expired'));h.render();
 assert.equal(h.tree.type,'main');assert.equal(tab.getItem(key),null);assert.equal(window.__STUDIO_REQUEST__,undefined);
});

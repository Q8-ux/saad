import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const scope='https://example.test/saad/dhikr/';
const workerSource=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

function workerHarness(){
  const stores=new Map(),handlers={},opened=[],precache=[],network=[];
  let offline=false;
  const key=request=>typeof request==='string'?new URL(request,scope).href:request.url;
  const caches={
    keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),
    open:async name=>{
      opened.push(name);if(!stores.has(name))stores.set(name,new Map());const records=stores.get(name);
      return {
        match:async request=>records.get(key(request))?.clone(),
        put:async(request,response)=>{records.set(key(request),response.clone());},
        addAll:async requests=>{for(const request of requests){precache.push(request);records.set(key(request),new Response('fresh precache'));}}
      };
    }
  };
  const context={URL,Request,Response,caches,self:{registration:{scope},location:{origin:new URL(scope).origin},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>{handlers[name]=handler;}},fetch:async(request,options)=>{network.push({request,options});if(offline)throw new Error('offline');return new Response('<svg class="book-symbol"></svg>');}};
  vm.runInNewContext(workerSource,context);
  async function emit(type,request){const pending=[];let result;handlers[type]({request,waitUntil:p=>pending.push(p),respondWith:p=>{result=p;}});const response=await result;await Promise.all(pending);return response;}
  return {stores,caches,opened,precache,network,emit,offline:()=>{offline=true;}};
}

test('online refresh replaces a cached old interface instead of reusing it',async()=>{
  const h=workerHarness();await h.emit('install');
  const cache=await h.caches.open(h.opened[0]);
  await cache.put(scope+'styles.css?v=20261109-book-3',new Response('old interface'));
  const response=await h.emit('fetch',{url:scope+'styles.css?v=20261109-book-3',method:'GET',mode:'cors'});
  assert.match(await response.text(),/book-symbol/);
  assert.equal(h.network.at(-1).options.cache,'no-store');
  const page=await h.emit('fetch',{url:scope,method:'GET',mode:'navigate'});
  assert.match(await page.text(),/book-symbol/);
});

test('installation bypasses the HTTP cache and activation preserves other projects',async()=>{
  const h=workerHarness();await h.caches.open('dhikr-older');await h.caches.open('another-project');
  await h.emit('install');assert.ok(h.precache.length>15);
  for(const request of h.precache)assert.equal(request.cache,'reload');
  await h.emit('activate');assert.equal(h.stores.has('dhikr-older'),false);assert.equal(h.stores.has('another-project'),true);
});

test('offline reading falls back to saved text and interface while recovery never serves an old shell',async()=>{
  const h=workerHarness();await h.emit('install');h.offline();
  const text=await h.emit('fetch',{url:scope+'data/quran.json',method:'GET',mode:'cors'});
  assert.equal(await text.text(),'fresh precache');
  const page=await h.emit('fetch',{url:scope+'?v=latest',method:'GET',mode:'navigate'});
  assert.equal(await page.text(),'fresh precache');
  await assert.rejects(()=>h.emit('fetch',{url:scope+'refresh.html',method:'GET',mode:'navigate'}),/offline/);
});

test('recovery clears only this project cache and keeps reading progress and other registrations',async()=>{
  const source=readFileSync(new URL('../refresh.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const saved=JSON.stringify({counts:{fatiha:4},selected:'baqara-full',lang:'ar'});
  const unregistered=[],deleted=[],nodes=new Map();let destination;
  const cacheNames=['dhikr-older','dhikr-newer','another-project'];
  const context={URL,Promise,setTimeout:()=>0,window:{caches:{}},location:{href:scope+'refresh.html',hash:'#fatiha',replace:url=>{destination=url;}},localStorage:{getItem:()=>saved},document:{documentElement:{},getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}},navigator:{serviceWorker:{getRegistrations:async()=>[{scope,unregister:async()=>unregistered.push(scope)},{scope:'https://example.test/saad/',unregister:async()=>unregistered.push('other')}]}},caches:{keys:async()=>cacheNames,delete:async name=>deleted.push(name)}};
  await vm.runInNewContext(source,context);
  assert.deepEqual(unregistered,[scope]);assert.deepEqual(deleted,['dhikr-older','dhikr-newer']);
  assert.equal(context.localStorage.getItem('dhikr-v1'),saved);
  assert.equal(new URL(destination).pathname,'/saad/dhikr/');assert.equal(new URL(destination).hash,'#fatiha');assert.ok(new URL(destination).searchParams.has('v'));
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const origin = 'https://q8-ux.github.io';
const app = `${origin}/saad/unknown-killer-robots/`;
const handlers = {}, cacheData = new Map(), deleted = [];
let networkOffline = false, networkCalls = 0;
const context = vm.createContext({
  URL, Set, Promise,
  self: {
    location: new URL(`${app}sw.js`),
    addEventListener: (type, handler) => { handlers[type] = handler; },
    skipWaiting: async () => {}, clients: {claim: async () => {}},
  },
  caches: {
    async open(name) {
      if (!cacheData.has(name)) cacheData.set(name, new Map());
      const data = cacheData.get(name);
      return {
        async addAll(urls) { for (const url of urls) data.set(new URL(url, app).href, {cached:true}); },
        async match(request) { return data.get(typeof request === 'string' ? request : request.url); },
        async put(url, response) { data.set(url, response); },
      };
    },
    async keys() { return ['unrelated-app-cache', 'ukr-shell-old', ...cacheData.keys()]; },
    async delete(name) { deleted.push(name); return true; },
  },
  async fetch() {
    networkCalls++;
    if (networkOffline) throw new Error('Offline fixture');
    return {ok:true,network:true,clone() { return {cached:true,fresh:true}; }};
  },
});
vm.runInContext(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'), context);
async function lifecycle(type) {
  const waits=[];
  handlers[type]({waitUntil: promise => waits.push(promise)});
  await Promise.all(waits);
}
await lifecycle('install');
await lifecycle('activate');
assert.deepEqual(deleted,['ukr-shell-old'],'Other applications must retain their caches');
function request(url, options={}) {
  let response;
  const waits=[];
  handlers.fetch({request:{url,method:'GET',mode:'cors',destination:'',headers:new Headers(),...options},respondWith:promise=>{response=promise;},waitUntil:promise=>waits.push(promise)});
  return {response,waits};
}
for (const [url, options] of [
  [`${origin}/saad/other-app/`,{mode:'navigate'}],
  ['https://example.com/external.mp4',{}],
  [`${app}film.mp4`,{}],
  [`${app}stream`,{destination:'video'}],
  [`${app}asset`,{headers:new Headers({Range:'bytes=0-1023'})}],
  [`${app}post`,{method:'POST'}],
]) assert.equal(request(url,options).response,undefined,'Private media, other apps and writes must bypass the worker');

const live = request(`${app}?v=verification`,{mode:'navigate'});
assert.equal((await live.response).network,true,'Navigation should use the latest online page');
await Promise.all(live.waits);
networkOffline=true;
const offline = await request(`${app}?app=1`,{mode:'navigate'}).response;
assert.equal(offline.fresh,true,'Offline navigation should use the last valid app shell');
const callsBeforeAsset=networkCalls;
assert.equal((await request(`${app}assets/mohanad-regular.woff`).response).cached,true);
assert.equal(networkCalls,callsBeforeAsset,'A cached public font should work offline');
console.log('PASS: scoped offline shell, network-first navigation, font cache, unrelated-cache preservation and video/range bypass');

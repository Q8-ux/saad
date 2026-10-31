import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
const rl=createInterface({input:process.stdin,terminal:false});
console.log('Ready for isolated tour QA configuration');
const cfg=JSON.parse(await new Promise(r=>rl.once('line',r)));rl.close();
assert.equal(cfg.base,'https://br-empty-brook-b95xjoae-office.compute.c-7.eu-central-1.aws.neon.tech');
assert.match(cfg.propertyId,/^qa-tour-/);
const reports=[];
async function call(path,method='GET',data,token){
 const r=await fetch(cfg.base+path,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(45000)});
 return {status:r.status,...await r.json()};
}
async function check(name,fn){await fn();reports.push(name);console.log('PASS '+name);}
const url='/admin/properties/'+cfg.propertyId+'/tour';
const scene={kind:'scene',url:'https://superspl.at/scene/3ae6a716',title:'فحص تقني — ليس عقاراً معروضاً'};
let stamp;
await check('deployed QA function advertises virtual tours',async()=>assert.equal((await call('/health')).capabilities.virtualTours,true));
await check('anonymous and owner sessions cannot publish a tour',async()=>{
 assert.equal((await call(url,'PUT',{virtualTour:scene})).status,401);
 assert.equal((await call(url,'PUT',{virtualTour:scene},cfg.ownerToken)).status,403);
});
await check('editor and arbitrary iframe URLs are rejected by the real server',async()=>{
 for(const target of ['https://superspl.at/editor','https://example.com/scene/3ae6a716'])assert.equal((await call(url,'PUT',{virtualTour:{...scene,url:target}},cfg.adminToken)).status,400);
});
await check('an administrator can save and publicly retrieve a normalized tour',async()=>{
 const p=(await call('/properties/'+cfg.propertyId)).property;
 const saved=await call(url,'PUT',{virtualTour:scene,expectedUpdatedAt:p.updatedAt},cfg.adminToken);
 assert.equal(saved.status,200);stamp=saved.updatedAt;
 const out=(await call('/properties/'+cfg.propertyId)).property;
 assert.equal(out.virtualTour.url,'https://superspl.at/s?id=3ae6a716');
 assert.equal(out.title,p.title);assert.deepEqual(out.images,p.images);assert.ok(!('contact' in out));
});
await check('a stale timestamp cannot overwrite a later edit',async()=>assert.equal((await call(url,'PUT',{virtualTour:null,expectedUpdatedAt:'2020-01-01T00:00:00.000Z'},cfg.adminToken)).status,409));
await check('raw model and authored settings survive storage',async()=>{
 const tour={kind:'model',url:'https://example.com/property.sog',settingsUrl:'https://example.com/settings.json',title:'نموذج فحص'};
 const saved=await call(url,'PUT',{virtualTour:tour,expectedUpdatedAt:stamp},cfg.adminToken);
 assert.equal(saved.status,200);stamp=saved.updatedAt;
 const p=(await call('/properties/'+cfg.propertyId)).property;
 assert.equal(p.virtualTour.settingsUrl,tour.settingsUrl);
});
await check('removing a tour preserves the listing and its photos',async()=>{
 const saved=await call(url,'PUT',{virtualTour:null,expectedUpdatedAt:stamp},cfg.adminToken);
 assert.equal(saved.status,200);stamp=saved.updatedAt;
 const p=(await call('/properties/'+cfg.propertyId)).property;
 assert.ok(!('virtualTour' in p));assert.ok(p.title);assert.ok(Array.isArray(p.images));
});
await check('save a clearly labeled official sample for isolated browser QA',async()=>{
 const saved=await call(url,'PUT',{virtualTour:scene,expectedUpdatedAt:stamp},cfg.adminToken);
 assert.equal(saved.status,200);
});
console.log(JSON.stringify({scope:'isolated QA branch only',passed:reports.length,tests:reports}));

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeVirtualTour,propertyTour,tourFrameURL} from '../public/virtual-tour-data.mjs';
import {savePropertyTour} from '../server/property-tours.mjs';
import {tourHTML} from '../public/property-tour.mjs';
import {TOUR_COPY,tourText} from '../public/tour-copy.mjs';

const scene={kind:'scene',url:'https://superspl.at/scene/3ae6a716?utm_source=ignored',title:'الصالة'};
const model={kind:'model',url:'https://example.com/room.compressed.ply?download=1',settingsUrl:'https://example.com/settings.json'};
test('published scene links normalize to the official embedded viewer without tracking or markup',()=>{
  assert.deepEqual(normalizeVirtualTour({...scene,extra:'not persisted'}),{version:1,kind:'scene',url:'https://superspl.at/s?id=3ae6a716',title:'الصالة'});
  assert.equal(normalizeVirtualTour({kind:'scene',url:'https://superspl.at/s?id=3ae6a716&noui=1'}).url,'https://superspl.at/s?id=3ae6a716');
});
test('scene sources cannot embed an editor, another host, credentialed URL or executable scheme',()=>{
  for(const url of ['https://superspl.at/editor','https://superspl.at/scene/3ae6a716/studio','https://superspl.at.evil.example/scene/3ae6a716','https://evil.example/s?id=3ae6a716','https://user:pass@superspl.at/s?id=3ae6a716','javascript:alert(1)','data:text/html,bad','http://superspl.at/s?id=3ae6a716'])assert.throws(()=>normalizeVirtualTour({...scene,url}),url);
});
test('raw model sources require supported Gaussian formats and public HTTPS locations',()=>{
  assert.equal(normalizeVirtualTour(model).url,model.url);
  for(const url of ['https://example.com/scan.html','https://example.com/model.glb','https://example.com/scan.spz','https://127.0.0.1/scan.ply','https://[::1]/scan.ply','https://localhost/scan.ply','https://device.local/scan.ply','https://example.com:8443/scan.ply'])assert.throws(()=>normalizeVirtualTour({...model,url}),url);
  assert.throws(()=>normalizeVirtualTour({...model,settingsUrl:'https://example.com/settings.js'}));
});
test('model URLs stay safely encoded under the existing Pages subdirectory',()=>{
  const url=new URL(tourFrameURL(model,'https://q8-ux.github.io/saad/aqari-x/property-tour.mjs?v=1.5.0'));
  assert.equal(url.pathname,'/saad/aqari-x/tour-viewer/');
  assert.equal(url.searchParams.get('content'),model.url);
  assert.equal(url.searchParams.get('settings'),model.settingsUrl);
  assert.equal(tourFrameURL(scene),normalizeVirtualTour(scene).url);
});
test('missing or corrupted tours create no visitor action; valid tours do not preload a frame',()=>{
  assert.equal(propertyTour({}),null);
  assert.equal(tourHTML({}), '');
  assert.equal(tourHTML({virtualTour:{kind:'scene',url:'https://example.com'}}),'');
  const html=tourHTML({virtualTour:{...scene,title:'<img src=x onerror=alert(1)>'}});
  assert.match(html,/data-tour-start/);
  assert.doesNotMatch(html,/<iframe|src="https:\/\/superspl|<img/);
  assert.match(html,/&lt;img/);
});
test('only an administrator can change a tour; validation completes before any data write',async()=>{
  let touched=false;
  const query=async()=>{touched=true;throw new Error('unexpected DB access');};
  await assert.rejects(savePropertyTour({query,actor:{role:'buyer'},id:'example',input:scene}),{status:403});
  await assert.rejects(savePropertyTour({query,actor:{role:'admin'},id:'example',input:{kind:'model',url:'javascript:bad'}}),{status:400});
  assert.equal(touched,false);
});
test('unknown, archived or completed properties cannot receive a tour',async()=>{
  for(const status of [null,'archived','completed']){
    let calls=0;
    const query=async()=>{calls++;return {rows:status?[{id:'example',status}]:[]};};
    await assert.rejects(savePropertyTour({query,actor:{role:'admin'},id:'example',input:scene}),{status:status?409:404});
    assert.equal(calls,1);
  }
});
test('save and removal touch the tour key only and carry an optimistic concurrency check',async()=>{
  for(const input of [scene,null]){
    const calls=[];
    const timestamp='2026-10-31T12:00:00.000Z';
    const query=async(sql,args)=>{calls.push({sql,args});return {rows:calls.length===1?[{id:'example',status:'active'}]:[{id:'example',updated_at:new Date(timestamp)}]};};
    const result=await savePropertyTour({query,actor:{role:'admin'},id:'example',input,expectedUpdatedAt:timestamp});
    assert.equal(calls[1].args[2],timestamp);
    assert.match(calls[1].sql,/date_trunc\('milliseconds',updated_at\)=\$3::timestamptz/);
    assert.doesNotMatch(calls[1].sql,/images|videos|fingerprint/);
    assert.equal(result.updatedAt,timestamp);
    assert.deepEqual(result.virtualTour,normalizeVirtualTour(input));
    assert.equal(calls[1].args[1],input?JSON.stringify(normalizeVirtualTour(input)):null);
  }
});
test('a concurrent property change is reported instead of overwriting a newer tour',async()=>{
  let n=0;
  const query=async()=>({rows:++n===1?[{status:'active'}]:[]});
  await assert.rejects(savePropertyTour({query,actor:{role:'admin'},id:'example',input:scene}),{status:409});
});
test('new customer controls have Arabic, English and Urdu text',()=>{
  for(const key of Object.keys(TOUR_COPY))for(const locale of ['ar','en','ur'])assert.ok(tourText(key,locale)!==key);
  assert.equal(tourText('start','en'),'Start tour');
});
test('published pages explicitly allow the same-site viewer and SuperSplat only for frames',async()=>{
  for(const file of ['index.html','admin/index.html']){
    const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
    assert.match(html,/frame-src 'self' (?:https:\/\/www.openstreetmap.org )?https:\/\/superspl.at/);
    assert.doesNotMatch(html,/frame-src[^;\"]*\*/);
  }
});

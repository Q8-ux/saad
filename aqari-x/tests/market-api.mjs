import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.API_BASE;if(!base)throw new Error('Set API_BASE');
const origin=process.env.API_ORIGIN||'http://terminal.local:4173';
const results=[];
async function request(path,data){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{origin,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(45000)});return {status:r.status,body:await r.json()};}
function check(label,fn){fn();results.push({label,passed:true});console.log('PASS',label);}
const health=await request('/health');check('Backend release 1.3.0',()=>{assert.equal(health.status,200);assert.equal(health.body.version,'1.3.0');});
const all=await request('/properties'),market=all.body.properties.filter(p=>p.sourceKind==='market-research');
check('29 research records visible as references',()=>{assert.equal(market.length,29);assert.ok(market.every(p=>p.status==='reference'&&!p.availabilityVerified&&!p.marketingAuthorized));});
check('Source provenance present, private contacts and permission references omitted',()=>{for(const p of market){assert.ok(p.sourceUrl.startsWith('https://'));for(const key of ['contact','brokerPhone','brokerEmail','permissionRef'])assert.equal(p[key],undefined);}});
const a=await request('/properties?source=4Sale'),b=await request('/properties?source='+encodeURIComponent('سكن'));
check('Source filters return 24 4Sale and 5 Sakan results',()=>{assert.equal(a.body.total,24);assert.equal(b.body.total,5);});
const report=await request('/market-research');check('Research coverage is explicitly limited',()=>{assert.equal(report.body.count,29);assert.equal(report.body.exhaustive,false);});
const denied=await request('/admin/import-batch',{rows:[]}),upload=await request('/files',{content:'invalid'});
check('Batch import and uploads require authentication',()=>{assert.equal(denied.status,401);assert.equal(upload.status,401);});
const detail=await request('/properties/market-sakan-163655');check('Researched Jabriya details keep exact amount and provenance',()=>{assert.equal(detail.body.property.priceFils,460000);assert.equal(detail.body.property.area,120);assert.equal(detail.body.property.bedrooms,3);});
const assistant=await request('/assistant',{message:'شقة في الجابرية بحدود 500',locale:'ar'});
check('Assistant search includes researched inventory',()=>{assert.ok(assistant.body.properties.some(p=>p.id==='market-sakan-163655'));assert.ok(!JSON.stringify(assistant.body).includes('96551758056'));});
if(process.env.TEST_CLOUD==='1'){
 const session=await request('/assistant/session',{});assert.equal(session.body.chatReady,true);
 const reply=await request('/assistant',{token:session.body.token,message:'I need a three bedroom apartment in Jabriya below five hundred dinars',locale:'en'});
 check('Cloud assistant grounds typed English search in expanded inventory',()=>{assert.equal(reply.body.method,'openai');assert.ok(reply.body.properties.some(p=>p.id==='market-sakan-163655'));});
}
await writeFile(process.env.RESULT_PATH||'tests/market-api-results.json',JSON.stringify({checkedAt:new Date().toISOString(),base,results},null,2)+'\n');
console.log('Passed',results.length,'API checks');

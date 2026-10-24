import test from 'node:test';
import assert from 'node:assert/strict';
import {marketFindings,marketResearch} from '../server/market-findings.mjs';
import {normalizeImportRow,safeSourceURL,redactContacts,isVideo,byteRange} from '../server/catalog-import.mjs';
import {parseImportFile} from '../public/import-file.mjs';
import {searchProperties} from '../public/core.mjs';
import {translations} from '../public/locales-dictionary.mjs';

const row={title:'شقة في الجابرية',category:'للإيجار',type:'شقة',location:'الجابرية',governorate:'حولي',price:'٤٦٠',bedrooms:3};
test('research catalog has unique sources, six governorates and explicitly unverified provenance',()=>{
  assert.equal(marketFindings.length,29);assert.equal(marketResearch.exhaustive,false);
  assert.equal(new Set(marketFindings.map(p=>p.id)).size,29);
  assert.equal(new Set(marketFindings.map(p=>p.governorate)).size,6);
  for(const p of marketFindings){assert.ok(translations[p.title]?.en);assert.ok(translations[p.title]?.ur);assert.ok(!/[\u0600-\u06ff]/u.test(translations[p.title].en));assert.equal(p.status,'reference');assert.equal(p.availabilityVerified,false);assert.equal(p.marketingAuthorized,false);assert.equal(p.images.length,0);assert.equal(p.videos.length,0);assert.equal(safeSourceURL(p.sourceUrl),p.sourceUrl);assert.ok(Date.parse(p.observedAt)<=Date.now());assert.ok(!('contact' in p));}
  assert.ok(!marketFindings.some(p=>p.sourceId==='161090'));
  assert.equal(marketFindings.find(p=>p.sourceId==='163667').bathrooms,null);
  assert.equal(marketFindings.find(p=>p.sourceId==='21224337').priceFils,null);
});
test('source filters combine with price and origin without hiding office data in default search',()=>{
  assert.equal(searchProperties(marketFindings,{source:'4Sale'}).properties.length,24);
  assert.equal(searchProperties(marketFindings,{source:'سكن',maxPrice:500}).properties.length,3);
  assert.equal(searchProperties(marketFindings,{origin:'office'}).properties.length,0);
  assert.equal(marketFindings[0].id,'market-4sale-21217150');
});
test('batch normalization strips imported contacts, keeps exact KWD and never marks availability verified',()=>{
  const {property:p}=normalizeImportRow({...row,phone:'55555555',contact:'55555555',description:'شقة 3 غرف، هاتف ٩٦٥٥٥٥٥٥٥٥٥ https://wa.me/96555555555',images:['arbitrary'],videos:['arbitrary'],status:'active'},'ملف المكتب','owner-consent-01');
  assert.equal(p.priceFils,460000);assert.equal(p.contact,'');assert.equal(p.description,'شقة 3 غرف، هاتف');assert.equal(p.availabilityVerified,false);assert.equal(p.marketingAuthorized,true);assert.deepEqual(p.images,[]);assert.deepEqual(p.videos,[]);assert.equal(p.status,undefined);
  assert.throws(()=>normalizeImportRow({...row,price:'-1'},'office','ref'));
  assert.throws(()=>normalizeImportRow({...row,governorate:'unknown'},'office','ref'));
  assert.throws(()=>normalizeImportRow({...row,area:'1e200'},'office','ref'));
});
test('source URLs cannot introduce scripts, credentials, alternate ports or private hosts',()=>{
  for(const value of ['javascript:alert(1)','http://www.q84sale.com/a','https://user:pass@sakan.co/a','https://sakan.co:444/a','https://127.0.0.1/a','https://sakan.co.evil.example/a'])assert.equal(safeSourceURL(value),'');
  assert.equal(safeSourceURL('https://www.q84sale.com/ar/listing/land-123?phone=55555555#secret'),'https://www.q84sale.com/ar/listing/land-123');
  assert.equal(redactContacts('3 غرف +965 5555 5555'),'3 غرف');
});
test('CSV preserves quoted commas and newlines and supports Arabic headings',()=>{
  const rows=parseImportFile('العنوان,الوصف,السعر\r\n"شقة، جديدة","وصف, مع فاصلة\nوسطر ثان",460\r\n','list.csv');
  assert.equal(rows[0].title,'شقة، جديدة');assert.equal(rows[0].description,'وصف, مع فاصلة\nوسطر ثان');
  assert.throws(()=>parseImportFile('title,title\na,b','bad.csv'));
  assert.throws(()=>parseImportFile('title\n"unterminated','bad.csv'));
  assert.throws(()=>parseImportFile('title,__proto__\na,b','bad.csv'));
  assert.throws(()=>parseImportFile(JSON.stringify(Array.from({length:101},()=>row))));
  assert.deepEqual(parseImportFile('[{"title":"A","phone":"55555555","status":"active"}]'),[{title:'A'}]);
});
test('only supported video signatures are admitted',()=>{
  assert.ok(isVideo(Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109]),'video/mp4'));
  assert.ok(isVideo(Buffer.from([0x1a,0x45,0xdf,0xa3,0]),'video/webm'));
  assert.equal(isVideo(Buffer.from('<script>alert(1)</script>'),'video/mp4'),false);
  assert.equal(isVideo(Buffer.from([0x1a,0x45,0xdf,0xa3]),'text/html'),false);
});
test('video ranges support start/end and suffix while rejecting unsafe or unsatisfiable values',()=>{
  assert.equal(byteRange(null,100),null);
  assert.deepEqual(byteRange('bytes=10-19',100),{start:10,end:19});
  assert.deepEqual(byteRange('bytes=90-',100),{start:90,end:99});
  assert.deepEqual(byteRange('bytes=-10',100),{start:90,end:99});
  assert.deepEqual(byteRange('bytes=1-200',100),{start:1,end:99});
  for(const range of ['bytes=100-','bytes=10-9','bytes=-0','bytes=1-2,4-5','bytes=-','bytes=9007199254740999-'])assert.throws(()=>byteRange(range,100));
});

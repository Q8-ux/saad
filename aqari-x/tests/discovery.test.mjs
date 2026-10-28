import test from 'node:test';
import assert from 'node:assert/strict';
import {searchProperties} from '../public/core.mjs';
import {pageSlice,areaName,salePricePerMetre,similarProperties,filterEntries} from '../public/discovery.mjs';
import {AREA_CENTRES} from '../public/kuwait-area-centres.mjs';
import {seedProperties} from '../server/seed.mjs';
import {marketFindings} from '../server/market-findings.mjs';
const properties=[...seedProperties,...marketFindings];
test('new filters combine and generated media never counts as advertiser photos',()=>{
  assert.equal(searchProperties(properties,{media:'photos'}).properties.length,0);
  assert.equal(searchProperties(properties,{media:'video'}).properties.length,0);
  assert.equal(searchProperties(properties,{verified:'yes'}).properties.length,0);
  const r=searchProperties(properties,{category:'للإيجار',bathrooms:'٣',priceBasis:'monthly'}).properties;
  assert.ok(r.length>0);assert.ok(r.every(p=>p.bathrooms>=3&&p.priceBasis==='monthly'));
  assert.equal(searchProperties(properties,{bathrooms:'invalid'}).properties.length,0);
  assert.equal(searchProperties([{...properties[0],images:['real'],videos:['video'],availabilityVerified:true}],{media:'photos',verified:'yes'}).properties.length,1);
});
test('listing IDs are searchable, with no private contact field in text search',()=>{
  assert.equal(searchProperties(properties,{q:'21223102'}).properties[0]?.id,'market-4sale-21223102');
  assert.equal(searchProperties([{...properties[0],contact:'99887766'}],{q:'99887766'}).properties.length,0);
});
test('pagination handles empty, exact pages, overflow and invalid URL values',()=>{
  assert.deepEqual(pageSlice([],4),{items:[],current:1,pages:1,start:0,end:0,total:0});
  const list=Array.from({length:25},(_,i)=>i);
  assert.equal(pageSlice(list,3).items.length,1);
  assert.equal(pageSlice(list,999).current,3);
  assert.equal(pageSlice(list,-10).current,1);
  assert.equal(pageSlice(list.slice(0,24),2).end,24);
});
test('area grouping prefers specific areas and leaves vague or different developments unmapped',()=>{
  assert.equal(areaName('جنوب صباح الأحمد N3'),'جنوب صباح الأحمد');
  assert.equal(areaName('الجابرية — قطعة 3'),'الجابرية');
  assert.equal(areaName('محافظة مبارك الكبير — المنطقة غير محددة'),null);
  assert.equal(areaName('صباح الأحمد البحرية — المرحلة الثالثة'),null);
  assert.equal(areaName('الخيران السكنية — قطعة 2'),null);
  assert.equal(areaName('خيطان الجنوبي'),null);
  assert.ok(Object.values(AREA_CENTRES).every(c=>c.lat>28&&c.lat<31&&c.lng>46&&c.lng<49&&Number.isInteger(c.geonamesId)));
});
test('unit price is sale-total only, never exchange difference, rent or guessed area',()=>{
  const p={category:'للبيع',priceBasis:'total',priceFils:300000000,area:300};
  assert.equal(salePricePerMetre(p),1000000);
  for(const override of [{category:'للبدل'},{priceBasis:'exchange_difference'},{priceBasis:'monthly'},{area:null},{area:0},{priceFils:null}])assert.equal(salePricePerMetre({...p,...override}),null);
});
test('similar listings exclude private/closed records and rank area before price distance',()=>{
  const p={id:'a',category:'للإيجار',type:'شقة',location:'الجابرية',governorate:'حولي',priceBasis:'monthly',priceFils:500000,status:'active'};
  const r=similarProperties([p,{...p,id:'private',status:'pending'},{...p,id:'closed',status:'completed'},{...p,id:'other',location:'السالمية',priceFils:500000},{...p,id:'same',priceFils:550000}],p);
  assert.deepEqual(r.map(p=>p.id),['same','other']);
});
test('filter labels preserve selected price basis, ignore view state and empty fields',()=>{
  assert.deepEqual(filterEntries({priceBasis:'unit_monthly',layout:'map',page:2,minPrice:'',lang:'en'}),[{key:'priceBasis',label:'أساس السعر',value:'للوحدة / شهرياً'}]);
});

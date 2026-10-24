import assert from 'node:assert/strict';
const base=process.argv[2];
if(!base||!/^https:\/\/.+\.neon\.tech$/.test(base))throw new Error('Pass the explicitly selected office API base URL');
const call=async data=>{
 const response=await fetch(base+'/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200);return response.json();
};
let count=0;
for(const [locale,message] of [['ar','شقة للإيجار بالجابرية 3 غرف بحدود 500'],['en','3 bedroom apartment for rent in Jabriya under 500'],['ur','مجھے جابریہ میں تین کمروں کا فلیٹ کرایے پر ۵۰۰ تک چاہیے']]){
 const out=await call({locale,message});assert.equal(out.locale,locale);assert.equal(out.method,'office-data');assert.deepEqual(out.properties.map(p=>p.id),['initial-08']);assert.ok(!JSON.stringify(out).includes('51758056'));count++;
 console.log('PASS '+locale+' search, response locale and hidden phone');
}
const unit=await call({locale:'en',message:'what is the price?',propertyIds:['initial-07']});assert.match(unit.message,/per unit per month, not for the whole building/);count++;
const budget=await call({locale:'en',message:'under 400',filters:{type:'شقة',category:'للإيجار'}});assert.deepEqual(budget.properties.map(p=>p.id),['initial-09']);count++;
const unknown=await call({locale:'en',message:'details',propertyIds:['initial-06']});assert.match(unknown.message,/price is unspecified/);count++;
console.log(`Completed ${count} assistant HTTP checks without creating accounts, requests, appointments or transactions.`);

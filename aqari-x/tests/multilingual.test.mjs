import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIntent,searchProperties,AREAS} from '../public/core.mjs';
import {translate} from '../public/i18n.mjs';
import {translations} from '../public/locales-dictionary.mjs';
import {officeAssistant} from '../server/assistant.mjs';
import {seedProperties} from '../server/seed.mjs';

test('Arabic, English and Urdu requests match the same real listing and numeric budget',()=>{
  for(const q of ['شقة للايجار بالجابرية ثلاث غرف بحدود ٥٠٠','3 bedroom apartment for rent in Jabriya under 500','مجھے جابریہ میں تین کمروں کا فلیٹ کرایے پر ۵۰۰ تک چاہیے']){
    assert.deepEqual(searchProperties(seedProperties,{q}).properties.map(p=>p.id),['initial-08']);
    assert.equal(parseIntent(q).filters.maxPrice,500);
  }
});
test('all supported areas and seed title/description/location facts have both translations',()=>{
  for(const source of [...AREAS.map(x=>x.area),...seedProperties.flatMap(p=>[p.title,p.description,p.location])]){
    assert.ok(translations[source]?.en,source);assert.ok(translations[source]?.ur,source);
  }
  assert.match(translate('600 د.ك','en'),/600 KWD/);
  assert.match(translate('3 غرف','en'),/3 bedrooms/);
  assert.equal(translate(translate('المفضلة','ur'),'en'),translate('المفضلة','en'));
});
test('assistant follows budget changes and excludes listings whose price is unknown',()=>{
  const first=officeAssistant({message:'apartment for rent',locale:'en'},seedProperties);
  assert.ok(first.properties.length>1);
  const next=officeAssistant({message:'under 400',locale:'en',filters:first.filters,propertyIds:first.properties.map(x=>x.id)},seedProperties);
  assert.deepEqual(next.properties.map(x=>x.id),['initial-09']);
  assert.equal(next.filters.type,'شقة');assert.equal(next.filters.category,'للإيجار');
  assert.ok(officeAssistant({message:'house for rent under 1000',locale:'en'},seedProperties).properties.every(p=>p.priceFils!==null));
});
test('assistant explains unit rents and swap differences without inventing totals',()=>{
  const unit=officeAssistant({locale:'en',message:'what is the price?',propertyIds:['initial-07']},seedProperties);
  assert.match(unit.message,/600 KWD per unit per month, not for the whole building/);
  const swap=officeAssistant({locale:'ur',message:'قیمت',propertyIds:['initial-01']},seedProperties);
  assert.match(swap.message,/تبادلے کی اضافی رقم/);
  const unknown=officeAssistant({locale:'en',message:'details',propertyIds:['initial-06']},seedProperties);
  assert.match(unknown.message,/price is unspecified/);
});
test('assistant contact and booking answers never expose office number or claim a reservation',()=>{
  for(const locale of ['ar','en','ur']){
    const contact=officeAssistant({locale,message:'WhatsApp'},seedProperties,{phone:'96551758056'});
    assert.ok(!contact.message.includes('51758056'));
    assert.deepEqual(contact.actions,['whatsapp']);
    const booking=officeAssistant({locale,message:'appointment'},seedProperties,{scheduleEnabled:false});
    assert.ok(booking.message);assert.equal(booking.method,'office-data');
  }
});
test('assistant context IDs and filters cannot reveal private or withdrawn properties',()=>{
  const privateListing={...seedProperties[0],id:'private-123',status:'pending',title:'Private listing'};
  const reply=officeAssistant({locale:'en',message:'details',propertyIds:['private-123'],filters:{status:'pending',type:'injected'}},[...seedProperties,privateListing]);
  assert.ok(!JSON.stringify(reply).includes('Private listing'));
  assert.ok(!('status' in reply.filters));assert.ok(!('type' in reply.filters));
});

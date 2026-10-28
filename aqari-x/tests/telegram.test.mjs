import test from 'node:test';
import assert from 'node:assert/strict';
import {redactContacts,safeSourceURL} from '../server/catalog-import.mjs';
import {telegramCandidate,parseTelegramExport,TELEGRAM_SOURCE} from '../public/telegram-import.mjs';
import {parseTelegramPreview,fetchTelegramPreview,normalizeTelegramRow} from '../server/telegram-source.mjs';
const text='للإيجار شقة في الجابرية 3 غرف 2 حمام\nالإيجار 500 د.ك شهرياً\nالمساحة 120 متر\nهاتف +965 5555 5555 واتساب wa.me/96555555555 @example_agent agent@example.com';
const message={type:'message',id:123,date:'2026-10-28T05:00:00Z',text};
test('Telegram candidates preserve only property facts and source identity, never advertiser contacts',()=>{
  const p=telegramCandidate(message);assert.equal(p.source,TELEGRAM_SOURCE);assert.equal(p.sourceId,'123');assert.equal(p.sourceUrl,'https://t.me/soogQ8/123');assert.equal(p.price,500);assert.equal(p.priceBasis,'monthly');assert.equal(p.bathrooms,2);assert.equal(p.area,120);
  assert.ok(!JSON.stringify(p).includes('5555'));assert.ok(!JSON.stringify(p).includes('agent'));assert.ok(!JSON.stringify(p).includes('wa.me'));
  assert.equal(telegramCandidate({id:1,text:'للبيع سيارة جديدة سعرها 500'}),null);
  assert.equal(telegramCandidate({id:2,text:'مطلوب شقة للايجار في الجابرية'}),null);
  assert.equal(telegramCandidate({id:3,type:'service',text}),null);
  assert.equal(telegramCandidate({...message,id:'https://example.com'}),null);
});
test('Telegram rich text hidden links, media paths, account metadata and raw text are not retained',()=>{
  const value={type:'public_channel',name:'Example',id:1234,messages:[{...message,text:['للإيجار شقة في الجابرية ',{type:'text_link',text:'للتواصل',href:'https://wa.me/96555555555'}],from:'private-name',phone:'55555555',photo:'photo/private.jpg'}]};
  const out=parseTelegramExport(JSON.stringify(value));assert.equal(out.rows.length,1);assert.ok(!JSON.stringify(out).includes('private'));assert.ok(!JSON.stringify(out).includes('55555'));assert.equal(out.rows[0].price,'');assert.equal(out.rows[0].priceBasis,'');
  assert.throws(()=>parseTelegramExport(JSON.stringify({chats:{list:[]}})));
  assert.throws(()=>parseTelegramExport(JSON.stringify({...value,type:'private_group'})));
});
test('Telegram batches deduplicate, bound review size and page by real message IDs',()=>{
  const messages=Array.from({length:30},(_,i)=>({...message,id:i+1}));
  const out=parseTelegramExport(JSON.stringify({messages:[...messages,messages.at(-1)]}));assert.equal(out.rows.length,20);assert.equal(out.rows[0].sourceId,'30');assert.equal(out.nextBeforeId,'11');
  const next=parseTelegramExport(JSON.stringify({messages}),{beforeId:'11'});assert.equal(next.rows.length,10);assert.equal(next.rows[0].sourceId,'10');
});
test('public HTML preview is channel-bound, entity-decoded and never treats an unavailable page as an empty successful import',()=>{
  const html=`<div data-post="soogQ8/123"><div class="tgme_widget_message_text js-message_text">للإيجار شقة في الجابرية 3 غرف<br>الإيجار 500 شهرياً<br><a href="tel:55555555">55555555</a>&amp;</div><time datetime="2026-10-28T05:00:00Z"></time></div><div data-post="other/999"><div class="tgme_widget_message_text">${text}</div></div>`;
  const out=parseTelegramPreview(html);assert.equal(out.rows.length,1);assert.equal(out.rows[0].sourceId,'123');assert.ok(!JSON.stringify(out).includes('55555555'));
  assert.throws(()=>parseTelegramPreview('<h1>Site Unavailable</h1>'));
});
test('Telegram fetch uses only the fixed HTTPS channel and fails explicitly for upstream errors',async()=>{
  let target;await assert.rejects(fetchTelegramPreview('',async url=>{target=String(url);return new Response('<h1>Unavailable</h1>');}));assert.equal(target,'https://t.me/s/soogQ8');
  await assert.rejects(fetchTelegramPreview('https://example.com',()=>{throw Error('must not fetch');}));
  await assert.rejects(fetchTelegramPreview('',async()=>new Response('',{status:403})));
});
test('server revalidates edited fields, discards extra contacts and keeps Telegram import unverified and media-free',()=>{
  const candidate=telegramCandidate(message),{property:p}=normalizeTelegramRow({...candidate,contact:'55555555',phone:'55555555',description:text,sourceUrl:'https://example.com',marketingAuthorized:true,availabilityVerified:true,images:['private']});
  assert.equal(p.contact,'');assert.equal(p.marketingAuthorized,false);assert.equal(p.availabilityVerified,false);assert.equal(p.sourceKind,'market-research');assert.deepEqual(p.images,[]);assert.deepEqual(p.videos,[]);assert.equal(p.sourceUrl,'https://t.me/soogQ8/123');assert.ok(!JSON.stringify(p).includes('55555555'));assert.ok(!('permissionRef'in p));
  assert.throws(()=>normalizeTelegramRow({...candidate,priceBasis:''}));assert.throws(()=>normalizeTelegramRow({...candidate,sourcePublishedAt:'invalid'}));
});
test('contact redaction handles mixed digits, zero-width obfuscation, emails, handles and bare contact links',()=>{
  const out=redactContacts('3 غرف 500 د.ك ٥٥٥٥\u200b٥٥٥٥ ۵۵۵۵-۵۵۵۵ +965 5555 5555 wa.me/96555555555 t.me/example @example_agent a@example.com');
  assert.equal(out.trim(),'3 غرف 500 د.ك');
  assert.equal(safeSourceURL('https://t.me/soogQ8/123?phone=55555555#x'),'https://t.me/soogQ8/123');
  for(const bad of ['https://t.me/other/1','https://t.me/soogQ8/+55555555','https://t.me/+invite','https://t.me/soogQ8/123/extra'])assert.equal(safeSourceURL(bad),'');
});
test('Telegram trial illustrations are explicit, never used for approved listings or in place of real photos',async()=>{
  const {generatedPropertyImage}=await import('../public/generated-property-images.mjs');
  const p={id:'channel-fixture',type:'شقة',status:'reference',source:TELEGRAM_SOURCE,sourceKind:'market-research',trialIllustration:true,images:[]};
  assert.equal(generatedPropertyImage(p)?.generated,true);
  assert.equal(generatedPropertyImage({...p,status:'active'}),null);assert.equal(generatedPropertyImage({...p,trialIllustration:false}),null);assert.equal(generatedPropertyImage({...p,images:['real']}),null);
});
test('Telegram export uses epoch timestamps and does not invent a time zone for bare local date strings',()=>{
  const p=telegramCandidate({...message,date:'2026-10-28T08:00:00',date_unixtime:'1793163600'});
  assert.equal(Date.parse(p.sourcePublishedAt),1793163600000);
  assert.equal(telegramCandidate({...message,date:'2026-10-28T08:00:00'}).sourcePublishedAt,null);
});

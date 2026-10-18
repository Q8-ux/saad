import test from 'node:test';
import assert from 'node:assert/strict';
import {norm,locate,prepareSpec,analyze,normalizeRecord,importRecords,growthInsights,growthMetrics,safeCsv,validateSourceUrl,matchesPhrase,audienceSignals,category} from '../lib/radar-core.mjs';
import {gather} from '../lib/providers.mjs';
const source='https://www.instagram.com/p/ABC123/';
const row=(id,text,extra={})=>normalizeRecord({id,text,author:'sample_user',created_at:'2026-10-18T08:00:00Z',...extra},'instagram',source);
const spec=(extra={})=>prepareSpec({query:'استشارة قانونية',terms:'محامي، استشارة',country:'KW',platforms:['instagram'],...extra});
test('Arabic matching preserves the original quotation',()=>{const r=row('1','أَبِي اِسْتِشَارَة بالكويت');const out=analyze([r],spec());assert.equal(out.results.length,1);assert.equal(out.results[0].text,r.text);assert.equal(norm('إِستشـارة'),'استشارة');});
test('country is evidence, not inherited from the source or dialect',()=>{const r=row('1','ابي محامي شاطر');assert.equal(locate(r,'KW').status,'unknown');assert.equal(analyze([r],spec()).results.length,0);assert.equal(analyze([r],spec({includeUnknown:true})).results[0].geo.status,'unknown');});
test('Amman is not automatically Oman',()=>{assert.equal(locate({text:'أحتاج محامي في عمان'},'OM').status,'unknown');assert.equal(locate({text:'أحتاج محامي في سلطنة عمان'},'OM').status,'mentioned');});
test('advertising and unrelated content are excluded',()=>{const out=analyze([row('a','للتواصل مع محامي الكويت احجز الان'),row('b','ابي مدرس في الكويت'),row('c','احتاج محامي في الكويت')],spec());assert.equal(out.results.length,1);assert.equal(out.results[0].nativeId,'c');});
test('deduplication, date boundaries and unknown dates',()=>{const r=row('a','احتاج محامي في الكويت');const out=analyze([r,r,row('b','ابي محامي في الكويت',{created_at:'2020-01-01Z'}),row('c','ابي محامي في الكويت',{created_at:null})],spec({since:'2026-01-01',until:'2026-10-18'}));assert.equal(out.results.length,1);assert.equal(out.excluded.duplicate,1);assert.equal(out.excluded.date,1);assert.equal(out.excluded.dateUnknown,1);});
test('malicious or mismatched source URLs are rejected',()=>{for(const url of ['javascript:alert(1)','https://instagram.com.evil.test/p/x','https://user:pass@instagram.com/p/x'])assert.throws(()=>validateSourceUrl(url,'instagram'));assert.throws(()=>spec({urls:'https://x.com/user/status/1'}));});
test('nested imports preserve reply parents and source dates',()=>{const records=importRecords([{id:'p',text:'ابي محامي في الكويت',answers:[{id:'r',text:'وأنا احتاج استشارة في الكويت'}]}],'instagram',source);assert.equal(records.length,2);assert.equal(records[1].parentId,'p');assert.equal(records[1].kind,'reply');assert.equal(records[0].createdAt,null);});
test('derived IDs are marked and deterministic',()=>{const a=row(undefined,'ابي محامي في الكويت'),b=row(undefined,'ابي محامي في الكويت');assert.equal(a.id,b.id);assert.match(a.id,/derived/);assert.equal(a.nativeId,'');});
test('growth insights cite actual supporting samples',()=>{const records=analyze([row('1','احتاج استشارة في الكويت'),row('2','ابي محامي في الكويت')],spec()).results;const insights=growthInsights(records);assert.equal(insights.reduce((s,x)=>s+x.count,0),2);assert.equal(insights[0].source,source);assert.deepEqual(growthInsights([]),[]);});
test('growth metrics handle zero denominators and net loss',()=>{const a=growthMetrics({impressions:1000,visits:100,follows:10,unfollows:15});assert.equal(a.net,-5);assert.equal(a.followRate,10);assert.equal(a.profileRate,10);assert.equal(growthMetrics({impressions:0,visits:0,follows:0,unfollows:0}).followRate,null);assert.throws(()=>growthMetrics({impressions:1,visits:-1,follows:0,unfollows:0}));});
test('CSV export neutralizes formulas without changing the source record',()=>{const r={text:'=HYPERLINK("bad")',author:'@someone',platform:'instagram'};const csv=safeCsv([r]);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'@someone"));assert.equal(r.text,'=HYPERLINK("bad")');});
test('unconfigured source never performs a network request',async()=>{let called=false;for(const key of ['',' '])await assert.rejects(()=>gather(spec(),key,async()=>{called=true;}),{code:'SETUP_REQUIRED'});assert.equal(called,false);});
test('bounded Instagram collection reports unfinished cursors',async()=>{let calls=0;const mock=async(url,opts)=>{calls++;assert.equal(opts.headers['x-api-key'],'mock-key');const path=url.pathname;const body=path.includes('/reels/search')?{success:true,reels:[{url:source}],credits_charged:1}:{success:true,comments:[{id:'a',text:'ابي محامي في الكويت',user:{username:'sample'}}],cursor:'next-page',credits_charged:1};return Response.json(body);};const out=await gather(spec({maxRequests:2,maxCredits:2}),'mock-key',mock);assert.equal(calls,2);assert.equal(out.records.length,1);assert.equal(out.report.sources[0].remainingCursors.length,1);assert.equal(out.report.creditsUsed,2);});
test('a provider HTTP error is a blocked source, not an empty success',async()=>{let n=0;const out=await gather(spec(),'mock-key',async()=>{n++;return new Response('{}',{status:429});});assert.equal(n,1);assert.equal(out.report.sources[0].status,'blocked');assert.equal(out.report.sources[0].error.code,'HTTP_429');});
test('request cap prevents the second network request and preserves scope',async()=>{let n=0;const out=await gather(spec({maxRequests:1}),'mock-key',async()=>{n++;return Response.json({success:true,reels:[{url:source}],credits_charged:1});});assert.equal(n,1);assert.equal(out.report.sources[0].error.code,'BUDGET_LIMIT');});
test('HTTP 200 with provider failure is not treated as data',async()=>{const out=await gather(spec(),'mock-key',async()=>Response.json({success:false,comments:[]}));assert.equal(out.report.sources[0].error.code,'PROVIDER_FAILED');});
test('canonical and derived identities survive repeated JSON imports without inventing collection dates',()=>{
  const sourceTime='2026-10-12T11:00:00.000Z';
  const initial=importRecords([{id:'original',text:'كم تكلفة استشارة بالكويت؟',collectedAt:sourceTime},{text:'شلون احصل محامي بالكويت؟'}],'instagram',source);
  const again=importRecords(JSON.parse(JSON.stringify(initial)),'instagram',source);
  const third=importRecords(again,'instagram',source);
  assert.deepEqual(third.map(r=>r.id),initial.map(r=>r.id));assert.equal(third[0].nativeId,'original');
  assert.equal(third[0].collectedAt,sourceTime);assert.equal(third[1].collectedAt,null);assert.equal(third[0].importedAt,initial[0].importedAt);
  assert.equal(analyze([...initial,...third],spec()).excluded.duplicate,2);
});
test('nativeId exported in CSV is accepted without adding a second platform prefix',()=>{
  const record=normalizeRecord({nativeId:'abc',id:'youtube:abc',text:'كيف اطلب استشارة بالكويت؟',createdAt:'1792310400',collectedAt:'2026-10-18T09:00:00Z'},'youtube','https://www.youtube.com/watch?v=abcdef12345');
  assert.equal(record.id,'youtube:abc');assert.equal(record.nativeId,'abc');assert.equal(record.createdAt,'2026-10-18T08:00:00.000Z');
  const csv=safeCsv([record]);const lines=csv.trim().split('\r\n');const headers=lines[0].replace(/^\uFEFF/,'').split(',');
  const cells=[...lines[1].matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(match=>match[1].replace(/""/g,'"'));
  const restored=importRecords([Object.fromEntries(headers.map((name,i)=>[name,cells[i]]))],'youtube','')[0];
  assert.equal(restored.id,record.id);assert.equal(restored.nativeId,'abc');assert.equal(restored.collectedAt,record.collectedAt);
});
test('instagrapi aliases preserve creation, parent and like count',()=>{
  const record=importRecords([{pk:123,text:'تنصحون بمحامي بالكويت؟',created_at_utc:'2026-10-17T12:30:00Z',replied_to_comment_id:'99',like_count:7}],'instagram',source)[0];
  assert.equal(record.nativeId,'123');assert.equal(record.createdAt,'2026-10-17T12:30:00.000Z');assert.equal(record.parentId,'99');assert.equal(record.likes,7);assert.equal(record.collectedAt,null);
});
test('Arabic questions and recommendations carry inspectable lexical evidence',()=>{
  const texts=['كم تكلفة استشارة في الكويت؟','بكم استشارة في الكويت','كيف احجز استشارة في الكويت','شلون احصل محامي في الكويت','تنصحون بمحامي في الكويت'];
  const records=texts.map((text,i)=>row(String(i),text));const out=analyze(records,spec());assert.equal(out.results.length,5);
  for(const item of out.results){assert.equal(item.intent.request,true);assert.ok(item.intent.evidence.length);assert.ok(item.text.includes(item.intent.question));}
  assert.equal(audienceSignals(texts[4]).kind,'recommendation');assert.equal(audienceSignals('لا احتاج استشارة في الكويت').request,false);
  assert.equal(audienceSignals('بكم استشارة؟ احجز الان مع خدماتنا').kind,'advertisement');
});
test('literal matching respects word boundaries and declared Arabic prefixes',()=>{
  assert.equal(matchesPhrase('ابي تثبيت جهاز في الكويت','بيت'),false);assert.equal(matchesPhrase('parent service','rent'),false);
  assert.equal(matchesPhrase('تنصحون بالمحامي في الكويت','محامي'),true);assert.equal(matchesPhrase('أحتاج إستشارة قانونية','استشارة قانونية'),true);
  assert.equal(matchesPhrase('ابي محامين','محامي'),false);assert.notEqual(category('ابي استشارة عن القهوة'),'إجراءات قانونية');
});
test('growth cards deduplicate records and retain several original questions with sources',()=>{
  const records=[row('a','كم تكلفة استشارة في الكويت؟'),row('b','بكم استشارة بالكويت؟'),row('c','كم تكلفة استشارة في الكويت؟'),row('d','خصم على تكلفة الاستشارة احجز الان')];
  const groups=growthInsights([...records,records[0]]);assert.equal(groups.length,1);assert.equal(groups[0].count,3);assert.equal(groups[0].evidence.length,2);
  assert.equal(groups[0].evidence[0].quote,records[0].text);assert.equal(groups[0].evidence[1].sourceUrl,source);assert.ok(groups[0].angle);assert.ok(groups[0].test.includes('رصدية'));
});
test('a collected provider record is stamped separately from an import',async()=>{
  const out=await gather(spec({urls:source}),'fixture-key',async()=>Response.json({success:true,comments:[{id:'a',text:'كم تكلفة استشارة في الكويت؟'}]}));
  assert.ok(out.records[0].collectedAt);assert.equal(out.records[0].importedAt,null);assert.equal(out.records[0].collectionMethod,'ScrapeCreators');
});

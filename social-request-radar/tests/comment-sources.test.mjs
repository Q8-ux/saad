import test from 'node:test';
import assert from 'node:assert/strict';
import {commentSource,sourceSnapshot} from '../lib/comment-sources.mjs';
import {normalizeRecord,importRecords,growthInsights,safeCsv} from '../lib/radar-core.mjs';
import {evidenceFromRows,campaignMarkdown} from '../lib/content-core.mjs';
import {createLocalApi} from '../github-pages/source/workspace.mjs';
import {makeTransfer,readTransfer} from '../github-pages/source/device-transfer.mjs';
const text='كم تكلفة استشارة؟ نص صناعي للاختبار';
const ig='https://www.instagram.com/p/TEST_ONLY/';
const parent='18051843701642870',reply='18051843701642871';
const yt='https://www.youtube.com/watch?v=abcdefghijk';
const ytId='UgwVfRopfS2F-WB3aF14AaABAg';
const row=(platform,id,url,extra={})=>normalizeRecord({id,text,...extra},platform,url,extra.kind||'comment');

test('six platforms target the native comment rather than the parent post',()=>{
  const cases=[
    ['instagram',parent,ig,ig+'c/'+parent+'/'],
    ['youtube',ytId,yt,yt+'&lc='+ytId],
    ['tiktok','7463276288959824682','https://www.tiktok.com/@fixture/video/7463250363559218474','https://m.tiktok.com/v/7463250363559218474.html?share_item_id=7463250363559218474&share_comment_id=7463276288959824682'],
    ['facebook','1206903601483960_779234281146935','https://www.facebook.com/fixture/posts/1206903601483960','https://www.facebook.com/fixture/posts/1206903601483960?comment_id=779234281146935'],
    ['reddit','t1_abc123','https://www.reddit.com/r/fixture/comments/post12/test_only/','https://www.reddit.com/r/fixture/comments/post12/test_only/abc123/'],
    ['x','184000000000000001','https://x.com/fixture/status/184000000000000000','https://x.com/i/status/184000000000000001']
  ];
  for(const [platform,id,url,expected]of cases){const r=row(platform,id,url);assert.equal(r.commentUrl,expected,platform);assert.equal(r.sourceUrl,expected);assert.equal(r.postUrl,url);assert.equal(r.sourceStatus,'constructed');}
});
test('Instagram nested replies retain their own destination and survive repeated imports',()=>{
  const records=importRecords([{id:parent,text,replies:[{id:reply,text}]}],'instagram',ig);
  assert.equal(records[1].sourceUrl,ig+'c/'+parent+'/r/'+reply+'/');assert.equal(records[1].postUrl,ig);assert.equal(records[1].parentId,parent);
  const again=importRecords(JSON.parse(JSON.stringify(records)),'instagram',ig);
  assert.deepEqual(again.map(r=>[r.id,r.sourceUrl,r.sourceStatus]),records.map(r=>[r.id,r.sourceUrl,r.sourceStatus]));
});
test('native Facebook Graph comment IDs decode only for the destination, preserving identity',()=>{
  const native=btoa('comment:1206903601483960_779234281146935');
  const r=row('facebook',native,'https://www.facebook.com/fixture/posts/1206903601483960');
  assert.equal(new URL(r.sourceUrl).searchParams.get('comment_id'),'779234281146935');assert.equal(r.nativeId,native);assert.equal(r.id,'facebook:'+native);
  const child=row('facebook','1206903601483960_779234281146936',r.postUrl,{kind:'reply',parentId:native});
  assert.equal(new URL(child.sourceUrl).searchParams.get('comment_id'),'779234281146935');assert.equal(new URL(child.sourceUrl).searchParams.get('reply_comment_id'),'779234281146936');
});
test('provider-supplied TikTok sharing URL is retained exactly',()=>{
  const share='https://m.tiktok.com/v/7463250363559218474.html?share_comment_id=7463276288959824682&share_item_id=7463250363559218474&source=h5_m';
  const r=row('tiktok','7463276288959824682','https://www.tiktok.com/@fixture/video/7463250363559218474',{share_info:{url:share}});
  assert.equal(r.sourceUrl,share);assert.equal(r.sourceStatus,'provided');
});
test('provided Reddit permalink and YouTube reply IDs point to the individual comment',()=>{
  const reddit=row('reddit','t1_abc123','',{permalink:'/r/fixture/comments/post12/test_only/abc123/'});
  assert.equal(reddit.sourceUrl,'https://www.reddit.com/r/fixture/comments/post12/test_only/abc123/');assert.equal(reddit.sourceStatus,'provided');
  const replyId=ytId+'.9abcDEF_1234';const r=row('youtube',replyId,'https://youtu.be/abcdefghijk',{kind:'reply',parentId:ytId});
  assert.equal(new URL(r.sourceUrl).searchParams.get('lc'),replyId);
});
test('missing IDs and incomplete reply ancestry have an explicit post-only fallback',()=>{
  for(const r of [row('instagram',undefined,ig),row('instagram',reply,ig,{kind:'reply'}),row('facebook','opaque-not-a-native-id','https://www.facebook.com/fixture/posts/1234567890')]){assert.equal(r.sourceKind,'post');assert.equal(r.sourceStatus,'post_only');assert.equal(r.commentUrl,'');}
  const derived=row('instagram',undefined,ig);assert.equal(commentSource({...derived,id:'instagram:derived:18051843701642870'}).commentUrl,'');
  const unsafe=row('instagram',Number('180518437016428701'),ig);assert.match(unsafe.id,/:derived:/);assert.equal(unsafe.nativeId,'');assert.equal(commentSource(unsafe).commentUrl,'');
});
test('unrelated and hostile targets cannot masquerade as the original comment',()=>{
  assert.throws(()=>row('instagram',parent,ig,{commentUrl:'javascript:alert(1)'}));
  assert.throws(()=>row('instagram',parent,ig,{commentUrl:'https://instagram.com.evil.test/p/TEST_ONLY/c/'+parent+'/'}));
  const wrong=row('instagram',reply,ig,{commentUrl:ig+'c/'+parent+'/'});assert.equal(wrong.sourceUrl,ig+'c/'+reply+'/');
  const profile=row('youtube',ytId,yt,{url:'https://www.youtube.com/@fixture?lc='+ytId});assert.equal(profile.sourceUrl,yt+'&lc='+ytId);assert.equal(profile.sourceStatus,'constructed');
});
test('X posts keep their own post URL and are never mislabeled as comments',()=>{
  const post=row('x','184000000000000001','https://x.com/fixture/status/184000000000000001',{kind:'post'});assert.equal(post.sourceKind,'post');assert.equal(post.commentUrl,'');assert.equal(post.sourceStatus,'provided');
});
test('growth, campaign, CSV and device exports preserve direct sources and native identities',()=>{
  const r=row('instagram',parent,ig),evidence=growthInsights([r])[0].evidence[0];
  assert.equal(evidence.sourceUrl,r.commentUrl);assert.equal(evidence.postUrl,ig);
  assert.equal(evidenceFromRows([{id:'article',text,sourceUrl:'https://example.org/article'}])[0].sourceUrl,'https://example.org/article');
  const sources=evidenceFromRows([r]);assert.equal(sources[0].nativeId,parent);assert.equal(sources[0].sourceUrl,r.sourceUrl);assert.ok(campaignMarkdown({title:'test',state:'draft',scenes:[],sources}).includes(r.sourceUrl));
  const csv=safeCsv([r]);assert.ok(csv.includes('commentUrl,postUrl,sourceKind,sourceStatus'));assert.ok(csv.includes(r.sourceUrl));
  const packet=makeTransfer([{key:'saved:'+r.id,kind:'saved',payload:r,updatedAt:new Date().toISOString()}],'https://fixture.test');
  const restored=readTransfer(JSON.parse(JSON.stringify(packet)),'https://fixture.test').documents[0].payload;assert.equal(restored.id,r.id);assert.equal(restored.commentUrl,r.commentUrl);assert.equal(restored.sourceStatus,'constructed');
  const tampered=structuredClone(packet);tampered.documents[0].payload.commentUrl='javascript:alert(1)';assert.throws(()=>readTransfer(tampered,'https://fixture.test'));
});
test('legacy browser histories, saved opportunities, campaigns and reports upgrade without recollection or editing text',async()=>{
  const legacy={id:'instagram:'+parent,nativeId:parent,platform:'instagram',kind:'comment',text,sourceUrl:ig,score:80,createdAt:null,collectedAt:'2026-10-18T10:00:00.000Z'};
  const stamp='2026-10-18T12:00:00.000Z';const docs=[
    {key:'saved:'+legacy.id,kind:'saved',payload:legacy,updatedAt:stamp},
    {key:'search:test',kind:'search',payload:{id:'test',state:'completed',results:[legacy],report:{calls:0}},updatedAt:stamp},
    {key:'campaign:test',kind:'campaign',payload:{id:'test',sources:[{id:legacy.id,text,sourceUrl:ig,platform:'instagram'}]},updatedAt:stamp},
    {key:'toolReport:test',kind:'toolReport',payload:{id:'test',sourceRecords:[{id:legacy.id,text,sourceUrl:ig}]},updatedAt:stamp}
  ];
  const store={all:async()=>structuredClone(docs),put:async()=>assert.fail('read should not overwrite history')};const api=createLocalApi(store);
  const workspace=await api('workspace');
  for(const r of [workspace.saved[0],workspace.searches[0].results[0],workspace.campaigns[0].sources[0],workspace.toolsReports[0].sourceRecords[0]]){assert.equal(r.sourceUrl,ig+'c/'+parent+'/');assert.equal(r.text,text);}
  assert.equal(workspace.saved[0].collectedAt,legacy.collectedAt);assert.equal(workspace.saved[0].score,80);assert.equal(docs[0].payload.sourceUrl,ig);
  assert.equal(sourceSnapshot(workspace.toolsReports[0].sourceRecords[0]).platform,'instagram');
});

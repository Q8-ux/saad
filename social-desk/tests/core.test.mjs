import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,newCampaign,normalizeOutput,approveEdit,scheduleKuwait,validateState,exportState,safeUrl,gatewayUrl,designSvg,kuwaitInput,metrics} from '../core.mjs';

const brief={topic:'حملة عربية',brand:'مشروعي',platform:'إنستغرام',goal:'زيادة التفاعل',tone:'عربية واضحة',facts:'معلومة راجعها صاحب المشروع'};
const make=()=>({...newCampaign(brief,'campaign-1','2026-11-24T09:00:00.000Z'),output:{hook:brief.topic,body:brief.facts,cta:'شاركنا رأيك',hashtags:'#عربي'}});

test('A campaign must be approved before a local publishing time can be saved',()=>{
  const c=make();assert.throws(()=>scheduleKuwait(c,'2026-11-25T12:00',Date.parse('2026-11-24T09:00Z')),/اعتمده/);
  const approved=approveEdit(c,c.output,true,'2026-11-24T09:01:00Z');
  const scheduled=scheduleKuwait(approved,'2026-11-25T12:00',Date.parse('2026-11-24T09:00Z'));
  assert.equal(scheduled.scheduledAt,'2026-11-25T09:00:00.000Z');
  assert.equal(scheduled.status,'scheduled');assert.equal(kuwaitInput(new Date(scheduled.scheduledAt)),'2026-11-25T12:00');
});
test('Invalid, normalized and past calendar dates are rejected',()=>{
  const c=approveEdit(make(),make().output,true);
  for(const date of ['2026-02-30T12:00','2026-13-01T12:00','2026-11-23T12:00','garbage'])assert.throws(()=>scheduleKuwait(c,date,Date.parse('2026-11-24T09:00Z')));
});
test('Editing an approved scheduled post invalidates the old time and approval unless reviewed again',()=>{
  const c=approveEdit(make(),make().output,true);c.scheduledAt='2026-11-25T09:00:00Z';c.status='scheduled';
  const edited=approveEdit(c,{...c.output,body:'نص تغير'},false);
  assert.equal(edited.approvedAt,null);assert.equal(edited.scheduledAt,null);assert.equal(edited.status,'draft');
});
test('Backup import cannot bypass approval or invent published analytics',()=>{
  const c=make();c.status='scheduled';c.scheduledAt='2026-11-25T09:00:00Z';c.published=true;c.views=999999;
  const value=validateState({...freshState(),campaigns:[c]});
  assert.equal(value.campaigns[0].status,'draft');assert.equal(value.campaigns[0].scheduledAt,null);assert.equal(value.campaigns[0].views,undefined);assert.deepEqual(metrics(value.campaigns),{total:1,drafts:1,approved:0,scheduled:0});
});
test('Backups preserve campaigns but omit gateway configuration and credentials',()=>{
  const state={...freshState(),campaigns:[make()],settings:{mode:'gateway',gateway:'https://example.com/private-webhook'}};
  const data=exportState(state);assert.equal(data.campaigns.length,1);assert.deepEqual(data.settings,{mode:'live',gateway:''});
});
test('Malformed and duplicate imported campaign IDs are rejected',()=>{
  const state=freshState();assert.throws(()=>validateState({...state,version:300}));
  assert.throws(()=>validateState({...state,campaigns:[make(),make()]}));
  assert.throws(()=>validateState({...state,campaigns:[{...make(),topic:''}]}));
});
test('Source links and gateway links do not accept script URLs, embedded credentials or unencrypted gateways',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,x','https://user:secret@example.com']){assert.equal(safeUrl(url),'');assert.equal(gatewayUrl(url),'');}
  assert.equal(gatewayUrl('http://example.com'),'');assert.equal(gatewayUrl('https://example.com/generate'),'https://example.com/generate');
});
test('Server failure cannot be mistaken for successful content generation',()=>{
  for(const response of [{},{message:'success'},{hook:'x',body:''},null])assert.throws(()=>normalizeOutput(response));
  assert.equal(normalizeOutput({hook:'عنوان',body:'نص',hashtags:['#عربي','#مشروع']}).hashtags,'#عربي #مشروع');
});
test('Exported Arabic SVG keeps user content as text and escapes markup',()=>{
  const c=make();c.output.hook='<script>alert(1)</script> عنوان عربي';
  const svg=designSvg(c);assert.ok(svg.includes('direction="rtl"'));assert.ok(svg.includes('عنوان عربي'));assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));
});

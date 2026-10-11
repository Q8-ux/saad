import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,validateProject,validatePlan,snapshot,block,moveScene,promptForPlan,promptForScene} from '../assets/core.mjs';
import {METHOD,newStory,storyChecks,storyFingerprint,isApproved,planIssues,mergeFoundation,validateFoundation,promptForFoundation,dramaForScene,sceneReview,storyText,printStoryBody,directionFor} from '../assets/story.mjs';
import {completeProject} from './story-fixture.mjs';

test('version-one projects migrate without inventing story evidence or changing screenplay text',()=>{
  const old={version:1,id:'old-project',title:'مسودتي',idea:'فكرة قديمة',pillars:{hero:'جابر',goal:'البحث عن أخيه',obstacle:'عاصفة',stakes:'يضل الطريق',ending:''},blocks:[block('Scene Heading','خارجي - شارع - ليل'),block('Action','يحمل جابر ملف Project 12.')]};
  const updated=validateProject(old);assert.equal(updated.version,2);assert.deepEqual(updated.blocks.map(b=>b.text),old.blocks.map(b=>b.text));assert.deepEqual(updated.pillars,old.pillars);assert.equal(updated.story.characters.length,0);assert.equal(updated.story.problem,'');assert.ok(!storyChecks(updated).ready);
});
test('approved basis, beat IDs, scene IDs, metadata and full snapshots survive file roundtrip',()=>{
  const p=completeProject();const scene=p.plan.scenes[0];p.blocks=[block('Scene Heading',scene.heading,{drama:dramaForScene(scene)}),block('Action','ينظر إلى الإشعار.')];snapshot(p,'أساس القصة المعتمد');
  const restored=validateProject(JSON.parse(JSON.stringify(p)));
  assert.ok(isApproved(restored));assert.equal(storyFingerprint(restored),storyFingerprint(p));assert.equal(restored.plan.scenes[0].id,scene.id);assert.equal(restored.story.beats[0].id,p.story.beats[0].id);assert.equal(restored.blocks[0].drama.planSceneId,scene.id);assert.deepEqual(restored.snapshots[0].basis.story,p.story);
  p.story.characters[0].knowledge='تغيير';assert.notEqual(p.snapshots[0].basis.story.characters[0].knowledge,p.story.characters[0].knowledge);
});
test('changes in motive, knowledge, stakes and order invalidate approval and stale plans',()=>{
  for(const mutate of [p=>p.story.characters[0].motive+=' جديد',p=>p.story.characters[0].knowledge+=' جديد',p=>p.pillars.stakes+=' جديد',p=>p.story.beats.reverse()]){const p=completeProject();assert.ok(isApproved(p));mutate(p);assert.ok(!isApproved(p));assert.ok(planIssues(p).some(n=>n.message.includes('تغيّر أساس القصة')));}
});
test('gates require causal information, allow closures and reflection, and detect orphaned references',()=>{
  const p=completeProject();assert.ok(storyChecks(p).ready);assert.deepEqual(planIssues(p),[]);
  p.story.beats[0].decision='';assert.ok(storyChecks(p).missing.some(n=>n.id===p.story.beats[0].id&&n.message.includes('القرار')));
  p.story.beats[0].type='bridge';p.story.beats[0].goal='';p.story.beats[0].obstacle='';p.story.beats[0].attempt='';assert.ok(storyChecks(p).ready);
  p.story.beats[0].character='غير موجود';assert.ok(storyChecks(p).missing.some(n=>n.message.includes('الشخصية المحرّكة')));
  const plan=completeProject();plan.plan.scenes[1].beatId='not-a-beat';assert.ok(planIssues(plan).some(n=>n.message.includes('غير ممثل')));
});
test('AI foundation fills blanks and preserves author choices and existing profiles',()=>{
  const proposed=completeProject(),p=newProject();p.idea=proposed.idea;p.sceneCount=2;p.pillars.goal='هدف حدده المؤلف ولا يجوز استبداله';p.story.urgency='مهلة المؤلف';p.story.direction='both';p.story.characters=[{...proposed.story.characters[0],motive:'دافع المؤلف',knowledge:''}];
  const foundation=validateFoundation({pillars:proposed.pillars,story:proposed.story},p);mergeFoundation(p,foundation);
  assert.equal(p.pillars.goal,'هدف حدده المؤلف ولا يجوز استبداله');assert.equal(p.story.urgency,'مهلة المؤلف');assert.equal(p.story.direction,'both');assert.equal(p.story.characters[0].motive,'دافع المؤلف');assert.ok(p.story.characters[0].knowledge);assert.equal(p.story.approval,null);
  assert.throws(()=>validateFoundation({pillars:proposed.pillars,story:{...proposed.story,beats:[]}},p));
});
test('scene reorder keeps dramatic metadata and raises a causal continuity review',()=>{
  const p=completeProject();p.plan.scenes.forEach(s=>s.written=true);p.blocks=p.plan.scenes.flatMap(s=>[block('Scene Heading',s.heading,{drama:dramaForScene(s)}),block('Action',s.summary)]);
  assert.equal(sceneReview(p).length,0);const id=p.blocks[0].id;moveScene(p,id,1);assert.equal(p.blocks[2].drama.planSceneId,p.plan.scenes[0].id);assert.ok(sceneReview(p).some(n=>n.message.includes('ترتيب المشاهد')));
});
test('writing prompts carry actual approved causality and knowledge; report escapes markup',()=>{
  const p=completeProject();for(const prompt of [promptForFoundation(p),promptForPlan(p),promptForScene(p,0)]){assert.ok(prompt.includes(p.story.characters[0].motive));assert.ok(prompt.includes(p.story.beats[0].result));assert.ok(prompt.includes(p.pillars.stakes));}
  const text=storyText(p);assert.ok(text.includes('القرار الجديد'));assert.ok(text.includes('غير مكتملتين'));
  p.story.logline='<script>alert(1)</script> جابر وخالد ١٢ / 12';const html=printStoryBody(p);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('جابر وخالد ١٢ / 12'));assert.ok(html.includes('dir="rtl"'));
});
test('film and television directions can be overridden, and data size/version limits are enforced',()=>{
  const p=newProject();assert.equal(directionFor(p),'outside');p.format='tv';assert.equal(directionFor(p),'inside');p.story.direction='both';assert.equal(directionFor(p),'both');
  assert.throws(()=>validateProject({...p,version:99}));assert.throws(()=>validateProject({...p,story:{...newStory(),beats:Array(25).fill({})}}));
});
test('series relationships retain knowledge limits and invalidate approval when edited',()=>{
  const p=completeProject();p.format='tv';p.story.stageGoal='الوصول إلى الوثيقة قبل الموعد';
  assert.ok(storyChecks(p).missing.some(n=>n.field==='relationshipCards'));
  p.story.relationships=[{id:'r1',from:'جابر',to:'خالد',bond:'عمل مشترك',tension:'يتحفظ خالد على التفاصيل',change:'تُختبر ثقتهما',limit:'جابر لا يعرف ما في الملف'}];
  assert.ok(storyChecks(p).ready);p.story.approval={fingerprint:storyFingerprint(p),date:'2026-10-11'};
  const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored.story.relationships,p.story.relationships);assert.ok(isApproved(restored));
  restored.story.relationships[0].limit='معرفة مختلفة';assert.ok(!isApproved(restored));
  restored.story.relationships[0].to='شخصية محذوفة';assert.ok(storyChecks(restored).missing.some(n=>n.id==='r1'));
  assert.ok(storyText(p).includes('جابر لا يعرف ما في الملف'));
  assert.ok(promptForFoundation(p).includes('relationships'));
  assert.equal(validateProject({...p,sceneCount:100,printStyle:'classic'}).sceneCount,60);
  assert.equal(validateProject({...p,printStyle:'classic'}).printStyle,'classic');
});

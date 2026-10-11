import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,block,scenes,validateProject,snapshot,toFdx} from '../assets/core.mjs';
import {proposeTreatment,treatmentIssues,sceneFingerprint,promptForShot,printCinemaBody} from '../assets/cinematic.mjs';
function project(){const p=newProject('نافذة');p.blocks=[block('Scene Heading','داخلي - غرفة - نهار',{summary:'يتغير قرار ليلى بعد قراءة الرسالة.',drama:{character:'ليلى',goal:'فهم الرسالة',result:'ترى الموعد',decision:'تتصل بصديقتها'}}),block('Action','ليلى تضع رسالة على الطاولة.'),block('Character','ليلى'),block('Dialogue','سأتصل بها الآن.'),block('Action','تغلق الرسالة وتلتقط هاتفها.')];p.cinematic.bible='ليلى بالملابس نفسها في هذه الغرفة.';return validateProject(p);}
test('a treatment survives JSON import and snapshots without modifying the screenplay or FDX',()=>{
 const p=project(),before=structuredClone(p.blocks),fdx=toFdx(p),s=scenes(p)[0];p.cinematic.plans=[proposeTreatment(s,p.cinematic)];p.cinematic.plans[0].shots[0].visual='<script>secret</script> مرجع الاختبار';snapshot(p,'تجربة');
 const restored=validateProject(JSON.parse(JSON.stringify(p)));assert.equal(restored.cinematic.plans[0].shots[0].visual,p.cinematic.plans[0].shots[0].visual);assert.deepEqual(restored.blocks,before);assert.equal(toFdx(restored),fdx);assert.deepEqual(restored.snapshots[0].basis.cinematic,restored.cinematic);
 assert.ok(printCinemaBody(restored,scenes(restored)).includes('&lt;script&gt;'));assert.ok(!printCinemaBody(restored,scenes(restored)).includes('<script>secret'));
});
test('source edits, changed continuity and removed references require review',()=>{
 const p=project(),s=scenes(p)[0],plan=proposeTreatment(s,p.cinematic);assert.equal(treatmentIssues(s,plan,p.cinematic).length,0);const fingerprint=sceneFingerprint(s);s.blocks[3].text='لن أتصل اليوم.';assert.notEqual(sceneFingerprint(s),fingerprint);assert.ok(treatmentIssues(s,plan,p.cinematic).some(i=>i.level==='stale'));s.blocks=s.blocks.filter(b=>b.id!==plan.shots[0].sourceId);assert.ok(treatmentIssues(s,plan,p.cinematic).some(i=>i.message.includes('حُذفت')));p.cinematic.bible='ملابس جديدة';assert.ok(treatmentIssues(s,plan,p.cinematic).some(i=>i.message.includes('مرجع الاستمرارية')));
 const prompt=promptForShot(s,plan,plan.shots[0],p.cinematic,'video');assert.ok(prompt.includes('Camera movement'));assert.ok(prompt.includes('do not invent'));assert.ok(!promptForShot(s,plan,plan.shots[0],p.cinematic,'image').includes('Sound direction'));
 const blank=newProject();assert.equal(proposeTreatment(scenes(blank)[0],blank.cinematic).shots.length,0);
});

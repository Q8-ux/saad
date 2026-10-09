const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('manhaj/analysis/core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('manhaj/assistant.js','utf8').split('(function(){')[0],ctx);
const a=ctx.window.ManhajAnalysis;
assert.equal(a.normalizeArabic('أَهْدَافُ الـدرس'),'اهداف الدرس');
assert.equal(a.runAnalysis({document:{pages:[{number:1,text:''}]}}).blocked,true);
const pages=[{number:7,text:'الهدف أن يحدد المعلم نواتج التعلم ويقارن بين طرق التقويم. '.repeat(10)}];
assert.equal(a.retrieveEvidence(pages,'التقويم')[0].page,7);
assert.equal(a.retrieveEvidence(pages,'جغرافيا البراكين').length,0);
assert.equal(a.extractObjectives(pages)[0].page,7);
assert.ok(a.reviewTeacherRecord('lessons',{date:'',goal:'',grade:'',steps:'',assessment:'',materials:''}).issues.length>=6);
for(const [q,k] of [['تحضير درس','lessons'],['اجتماع القسم','meetings'],['مشروع جديد','projects'],['إعداد خطة','workplans'],['تحليل المناهج','analysis'],['تصميم فوتوشوب','studio']])assert.equal(ctx.teacherIntent(q),k);
assert.equal(ctx.teacherIntent('مرحبا'),'');
const catalog=JSON.parse(fs.readFileSync('manhaj/data/curricula.json','utf8'));
assert.ok(catalog.records.length>20);assert.equal(new Set(catalog.records.map(r=>r.id)).size,catalog.records.length);
for(const r of catalog.records){const u=new URL(r.sourceUrl);assert.equal(u.protocol,'https:');assert.ok(u.hostname.endsWith('.moe.edu.kw'))}
console.log('Analysis evidence, missing fields, teacher routes and official catalogue: PASS');

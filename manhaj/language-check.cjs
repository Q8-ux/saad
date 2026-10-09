const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('manhaj/language.js','utf8').split('(function(){')[0],ctx);const edit=ctx.editTeacherText;
assert.equal(edit('بناءا على  نتائج التقويم').text,'بناءً على نتائج التقويم');
const protectedText='«بناءا على  المصدر» https://example.com/a?q=123 a.b@example.com ١٢٣ 45.67';assert.equal(edit(protectedText).text,protectedText);
assert.equal(edit('نبي نناقش النتائج','formal').text,'نود مناقشة النتائج');assert.equal(edit('في الوقت الحالي نراجع الخطة','concise').text,'حاليًا نراجع الخطة');
assert.equal(edit('يراجع سعد روضان نتائج الصف 6 / 4').text,'يراجع سعد روضان نتائج الصف 6 / 4');
assert.equal(edit('يراجع المعلم الخطة.').changes.length,0);
console.log('Local editing: contextual corrections, formal/concise modes, quoted evidence, URLs, names and numbers: PASS');

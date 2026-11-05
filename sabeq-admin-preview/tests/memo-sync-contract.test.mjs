import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../admin.js',import.meta.url),'utf8');
test('admin memo section reads protected shared database rather than Bolt',()=>{
  assert.match(js,/const API = SERVICE \+ '\/api\/management\/';/);
  assert.match(js,/api\('memos\?'\+memoParams\(\)\)/);
  assert.doesNotMatch(js,/q8-ux-sabeq-admin-co-u4ma\.bolt\.host/);
});
test('memo records expose source and manual sync without inventing records',()=>{
  assert.match(js,/مصدر الطلبات الحالي: قاعدة بيانات الموقع الرسمية المشتركة/);
  assert.match(js,/مزامنة الطلبات الآن/);
  assert.match(js,/memoArchiveError=data\.officialError;renderMemos\(data\.officialAvailable,data\.officialError\)/);
  assert.match(js,/await api\('memos\?id='\+encodeURIComponent\(id\)\)/);
});

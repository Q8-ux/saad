const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Production entry stays in course preparation, without restoring a public video library',()=>{
  const admin=readFileSync(path.join(root,'admin/index.html'),'utf8');
  assert.ok(admin.includes('../assets/video-use/index.html?profile=noura'));
  const publicPage=readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(!publicPage.includes('video-use'));
  assert.ok(!publicPage.includes('id="videos"'));
});
test('Noura and writing studio ship identical media-editing engines',()=>{
  const family=path.resolve(root,'../family-online-studio/assets/video-use');
  for(const file of ['core.mjs','recorder.mjs','studio.mjs','studio.css','index.html','engine/run_project.py','engine/render.py','engine/grade.py']){
    assert.deepEqual(readFileSync(path.join(root,'assets/video-use',file)),readFileSync(path.join(family,file)));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mergeCatalog,orderProjects} from '../assets/project-catalog.mjs';
import {validateProject} from '../assets/core.mjs';
const seeds=['barcode','outside-story'].map(name=>validateProject(JSON.parse(fs.readFileSync(new URL(`../assets/projects/${name}.script.json`,import.meta.url),'utf8'))));
test('catalog adds both works in the original editor and keeps Barcode first',()=>{
  const {projects}=mergeCatalog([],seeds);
  assert.deepEqual(projects.map(p=>p.title),['باركود','خارج الستوري — الموسم الأول']);
  assert.equal(projects[1].blocks.length,1374);
  assert.equal(projects[1].blocks.filter(b=>b.type==='Scene Heading').length,56);
});
test('existing work and edits are preserved and the catalog is idempotent',()=>{
  const existing=structuredClone(seeds[0]);existing.id='writers-existing-project';existing.blocks[0].text='مسودتي الحالية';
  const draft={id:'other',title:'مشروع آخر',blocks:[{text:'مسودة'}]};
  const original=JSON.stringify([draft,existing]);
  const first=mergeCatalog([draft,existing],seeds);
  assert.equal(JSON.stringify([draft,existing]),original);
  assert.equal(first.projects[0],existing);
  const second=mergeCatalog(first.projects,seeds,first.seen);
  assert.equal(second.added.length,0);assert.equal(second.projects.length,3);
  assert.deepEqual(second.projects,orderProjects(first.projects));
});
test('deleted catalog items stay deleted and capacity is respected',()=>{
  assert.equal(mergeCatalog([],seeds,['barcode','outside-story']).projects.length,0);
  const full=Array.from({length:40},(_,n)=>({id:String(n),title:'عمل '+n}));
  assert.equal(mergeCatalog(full,seeds).projects.length,40);
});

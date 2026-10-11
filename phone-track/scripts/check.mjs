import fs from 'node:fs';
import assert from 'node:assert/strict';
const page=fs.readFileSync('public/index.html','utf8');
assert.match(page,/<html lang="ar" dir="rtl">/);
assert.match(page,/script-src 'self'/);
const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'unique element IDs');
const app=fs.readFileSync('src/app.mjs','utf8');
for(const [,id] of app.matchAll(/(?:\$|setText)\('([^']+)'/g)) assert.ok(ids.includes(id),`Missing UI element ${id}`);
for(const [,asset] of page.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)) assert.ok(fs.existsSync('public/'+asset),`Missing asset ${asset}`);
assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(app),'no number persistence');
assert.ok(!/chatgpt\.com/.test(page),'GitHub project links');
assert.ok(!/https?:\/\//.test(app),'no third-party number lookup');
const manifest=JSON.parse(fs.readFileSync('public/data/manifest.json'));
for(const code of manifest.countryCallingCodes) {
  const data=JSON.parse(fs.readFileSync(`public/data/${code}.json`));
  for(const kind of ['geo','carrier','timezone']) for(const index of Object.values(data[kind].prefixes)) assert.ok(index>=0&&index<data[kind].labels.length);
}
console.log(`Verified Arabic UI, assets, local-only analysis and ${manifest.countryCallingCodes.length} metadata chunks.`);

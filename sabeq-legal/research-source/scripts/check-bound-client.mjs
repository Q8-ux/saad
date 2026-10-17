import {readdirSync,readFileSync}from'node:fs';
import assert from'node:assert/strict';
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
for(const root of ['github-pages-dist','dist/client'])for(const p of walk(root).filter(p=>/\.(js|json|html)$/.test(p))){const s=readFileSync(p,'utf8');for(const marker of ['813c53104485810605aade8f88f6f1ef6a2f4abc7b8c25e403d86c5a2b7d34db','8ffeac9838d7-d0003','H4sIAAAAAAAC'])assert.ok(!s.includes(marker),'Private corpus leaked into '+p);}
console.log('PASS: private corpus and its base64 payload absent from both browser bundles');
const judicial=JSON.parse(readFileSync('server-data/reviewed-judgments.json','utf8'));
for(const root of ['github-pages-dist','dist/client'])for(const p of walk(root).filter(p=>/\.(js|json|html)$/.test(p))){const text=readFileSync(p,'utf8');for(const r of judicial.records)for(const marker of [r.judgment.recordId,r.judgment.sourceSha256,r.judgment.quote.slice(0,55)])assert.ok(!text.includes(marker),'Private judicial source leaked into '+p);}
console.log('PASS: reviewed judicial corpus absent from both browser bundles');

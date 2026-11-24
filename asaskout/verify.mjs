import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { copy } from './content.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dist=path.join(root,'dist');
assert.deepEqual(Object.keys(copy.ar).sort(),Object.keys(copy.en).sort(),'Arabic and English content keys must match');
for(const [relative,lang,dir] of [['index.html','ar','rtl'],['en/index.html','en','ltr']]){
  const file=path.join(dist,relative),html=await readFile(file,'utf8');
  assert(html.includes(`lang="${lang}" dir="${dir}"`),'Incorrect language or direction');
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,'Each page must have one main heading');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'Duplicate element IDs');
  for(const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const value=match[1];
    if(value.startsWith('#'))assert(ids.includes(value.slice(1)),`Broken anchor ${value}`);
    else if(!/^[a-z]+:/i.test(value)){
      const target=path.resolve(path.dirname(file),value.split('#')[0]);
      assert(target.startsWith(dist+'/')||target===dist,'Asset escapes output');
      await access(target);
    }
  }
  for(const match of html.matchAll(/srcset="([^"]+)"/g))for(const entry of match[1].split(','))await access(path.resolve(path.dirname(file),entry.trim().split(' ')[0]));
  for(const phone of ['96592222210','96599807796','96596929022'])assert(html.includes(`https://wa.me/${phone}`),`Missing company WhatsApp ${phone}`);
  assert(html.includes('mailto:asaskout@gmail.com'),'Missing company email');
  assert(html.includes('hreflang="ar-KW"')&&html.includes('hreflang="en-KW"'),'Missing alternate language URLs');
  const schema=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  assert(schema,'Missing structured data');
  assert.equal(JSON.parse(schema)['@type'],'GeneralContractor');
  assert(html.includes(`sha256-${createHash('sha256').update(schema).digest('base64')}`),'Structured-data CSP hash is incorrect');
  assert(!/<(?:img|script)[^>]+src="https?:/i.test(html),'Image and script assets must be self hosted');
  assert(!/<link\b(?=[^>]*rel="(?:stylesheet|preload)")[^>]*href="https?:/i.test(html),'Style and font assets must be self hosted');
  assert(!/reallygreatsite|123 Anywhere|1000\+|Santa Solana|Hendles Builders|1902/.test(html),'Template placeholder leaked into company site');
  for(const id of ['name','phone','service','location','area','details'])assert(html.includes(`for="${id}"`),'Missing form label');
}
for(const asset of ['villa','structure','detail']){
  for(const suffix of ['.jpg','-small.jpg']){
    const file=await readFile(path.join(dist,'assets',asset+suffix));
    assert(file.length>1000&&file[0]===255&&file[1]===216,`Invalid JPEG ${asset+suffix}`);
  }
}
await access(path.join(dist,'assets/fonts/OFL.txt'));
console.log('PASS: both languages, local assets, internal links, company contacts, responsive image variants, CSP, structured data, form labels and template-content checks.');

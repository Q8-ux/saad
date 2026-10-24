import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {seedProperties} from '../server/seed.mjs';
import {marketFindings} from '../server/market-findings.mjs';
import {generatedPropertyImage,GENERATED_IMAGE_LABEL,GENERATED_IMAGE_ALT,GENERATED_IMAGE_NOTICE} from '../public/generated-property-images.mjs';
import {translations} from '../public/locales-dictionary.mjs';

test('all 38 trial properties have an illustrative image with a valid local WebP asset',async()=>{
  const records=[...seedProperties,...marketFindings],assets=new Set();
  assert.equal(records.length,38);
  for(const p of records){const media=generatedPropertyImage(p);assert.ok(media,p.id);assert.equal(media.generated,true);assets.add(media.src);}
  assert.equal(assets.size,10);
  for(const src of assets){const data=await readFile(new URL(src));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data.length>1000&&data.length<250000);}
});
test('generated illustrations never replace uploaded photos or attach to live or unknown properties',()=>{
  const p=marketFindings[0];
  assert.equal(generatedPropertyImage({...p,images:['real-image-id']}),null);
  for(const status of ['active','pending','paused','completed','archived'])assert.equal(generatedPropertyImage({...p,status}),null);
  assert.equal(generatedPropertyImage({...p,id:'new-user-property'}),null);
  assert.equal(generatedPropertyImage({...p,id:'market-4sale-99999999'}),null);
  for(const label of [GENERATED_IMAGE_LABEL,GENERATED_IMAGE_ALT,GENERATED_IMAGE_NOTICE]){assert.ok(translations[label]?.en);assert.ok(translations[label]?.ur);}
});

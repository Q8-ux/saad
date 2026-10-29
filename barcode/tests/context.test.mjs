import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {barcodeContext,compileBarcodeContext,readEpisode} from '../tools/context.mjs';
const catalog={revision:'نسخة اصطناعية',episodes:['ألف','باء']};
const source=(n,text='نص اصطناعي')=>'window.BARCODE_EPISODE_'+n+'='+JSON.stringify({number:n,title:'الحلقة '+n,text})+';';
test('source snapshots keep episode identity and change when the actual text changes',()=>{
 const a=compileBarcodeContext([source(1),source(2)],catalog),b=compileBarcodeContext([source(1,'تعديل اصطناعي'),source(2)],catalog);
 assert.notEqual(a.sourceFingerprint,b.sourceFingerprint);assert.notEqual(a.episodes[0].sha256,b.episodes[0].sha256);assert.equal(a.episodes[1].sha256,b.episodes[1].sha256);
 assert.equal(a.latestAuthorVersionVerified,false);assert.equal(a.humanReviewRequired,true);assert.equal(a.rules.crossWorkMemory,false);assert.equal(a.rules.aiSuggestionsAreCanon,false);
 assert.ok(!JSON.stringify(a).includes('نص اصطناعي'),'Manuscript text was embedded in the context metadata');
});
test('wrong, missing, empty and executable episode sources are rejected without evaluating code',()=>{
 assert.throws(()=>compileBarcodeContext([source(1)],catalog));
 assert.throws(()=>readEpisode(source(2),1));
 assert.throws(()=>readEpisode('window.BARCODE_EPISODE_1='+JSON.stringify({number:1,title:'ألف',text:''}),1));
 assert.throws(()=>readEpisode('window.BARCODE_EPISODE_1=process.exit(0)',1));
});
test('tracked context matches all current source files and makes no latest-author-version claim',async()=>{
 const stored=JSON.parse(await readFile(new URL('../context/manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(await barcodeContext(),stored);assert.equal(stored.workId,'barcode');assert.ok(stored.unresolved.length);
});

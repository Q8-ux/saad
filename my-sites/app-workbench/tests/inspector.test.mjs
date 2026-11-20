import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {zipInventory,dexSummary,peSummary,inspect,demoDecision,sampleCodes,LIMITS} from '../inspector.mjs';
import {androidFixture,windowsFixture,syntheticDex} from '../fixtures.mjs';
const require=createRequire(import.meta.url),JSZip=require('../vendor/jszip.min.js');
test('recognizes Android structural fixture and bounded DEX indicators',async()=>{
  const buffer=await androidFixture(JSZip),zip=await JSZip.loadAsync(buffer);
  const report=await inspect(buffer,'synthetic.apk',name=>zip.file(name).async('uint8array'));
  assert.equal(report.kind,'android');assert.equal(report.dex.length,1);assert.equal(report.dex[0].stringCount,3);
  assert.ok(report.signals.includes('Google Play Billing'));assert.ok(report.signals.includes('فحص ميزة محلية محتمل'));
  assert.equal(report.files.length,4);assert.ok(report.notes.some(note=>note.includes('لا تثبت')));
});
test('recognizes Windows PE architecture without executing it',async()=>{
  const buffer=windowsFixture(),copy=buffer.slice(0),report=await inspect(buffer,'example.exe');
  assert.equal(report.pe.architecture,'x64');assert.equal(report.pe.dotNet,false);assert.equal(report.pe.sectionCount,1);
  assert.deepEqual(new Uint8Array(buffer),new Uint8Array(copy));
});
test('distinguishes .NET metadata directory indicator',()=>{
  const buffer=windowsFixture(),v=new DataView(buffer);v.setUint32(152+112+14*8,4096,true);v.setUint32(152+112+14*8+4,72,true);
  assert.equal(peSummary(buffer).dotNet,true);
});
test('rejects traversal paths before decompression',async()=>{
  const zip=new JSZip();zip.file('../escape.txt','data');
  const awaitable=await zip.generateAsync({type:'arraybuffer'});
  assert.throws(()=>zipInventory(awaitable),/مسار غير آمن/);
});
test('rejects misleading extension and APK missing manifest',async()=>{
  await assert.rejects(inspect(windowsFixture(),'fake.apk'),/فهرس ZIP/);
  const zip=new JSZip();zip.file('file.txt','value');
  await assert.rejects(inspect(await zip.generateAsync({type:'arraybuffer'}),'fake.apk'),/بيان Android/);
});
test('rejects truncated central directory and invalid PE offset',async()=>{
  const buffer=await androidFixture(JSZip);
  assert.throws(()=>zipInventory(buffer.slice(0,-3)),/فهرس ZIP/);
  const pe=windowsFixture();new DataView(pe).setUint32(60,0xfffffff0,true);assert.throws(()=>peSummary(pe),/ناقص/);
});
test('rejects forged ZIP sizes and unsupported methods',async()=>{
  const buffer=await androidFixture(JSZip),inventory=zipInventory(buffer);
  const forged=buffer.slice(0),v=new DataView(forged);v.setUint32(inventory.directoryOffset+24,LIMITS.expanded+1,true);
  assert.throws(()=>zipInventory(forged),/أحجام الملف|حد|حجم/);
  const unsupported=buffer.slice(0),x=new DataView(unsupported);x.setUint16(inventory.directoryOffset+10,99,true);assert.throws(()=>zipInventory(unsupported),/طريقة ضغط/);
});
test('rejects invalid DEX table offsets and unsupported container version',()=>{
  const bad=syntheticDex();new DataView(bad.buffer).setUint32(60,0xfffffff0,true);assert.throws(()=>dexSummary(bad),/ناقص/);
  const newer=syntheticDex();newer.set(new TextEncoder().encode('041'),4);assert.throws(()=>dexSummary(newer),/إصدار DEX/);
});
test('accepts a Windows package inventory but makes no install claim',async()=>{
  const zip=new JSZip();zip.file('AppxManifest.xml','<Package/>');const report=await inspect(await zip.generateAsync({type:'arraybuffer'}),'sample.msix');
  assert.equal(report.kind,'windows-package');assert.ok(report.notes.some(value=>value.includes('جرد')));
});
test('local toggle cannot override the simulated server decision',()=>{
  assert.equal(demoDecision({localFlag:false,serverCheck:false}).allowed,false);
  assert.equal(demoDecision({localFlag:true,serverCheck:false}).allowed,true);
  assert.equal(demoDecision({localFlag:true,serverCheck:true}).allowed,false);
  assert.equal(demoDecision({localFlag:false,serverCheck:true}).allowed,false);
});
test('generated source is visibly synthetic and accurately reflects the local value',()=>{
  assert.match(sampleCodes.android(true),/const\/4 v0, 0x1/);assert.match(sampleCodes.android(false),/const\/4 v0, 0x0/);
  assert.match(sampleCodes.windows(true),/return true;/);assert.match(sampleCodes.windows(false),/return false;/);
});

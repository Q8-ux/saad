import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SECTIONS, ALL_SECTIONS, BAQARA_FULL, tracksFor, advanceCursor, repeatTarget, safeSaved} from '../library.mjs';
import {LANGUAGES, MESSAGES, SECTION_NAMES, DUA_MEANINGS} from '../i18n.mjs';

const quran=JSON.parse(readFileSync(new URL('../data/quran.json',import.meta.url)));
test('image passages cover exactly 74 verified verses, including Baqara 16–30',()=>{
  assert.equal(SECTIONS.length,20);
  assert.equal(SECTIONS.filter(s=>s.type==='quran').length,13);
  assert.equal(SECTIONS.find(s=>s.id==='baqara-16').from,16);
  const keys=[];
  for(const s of SECTIONS.filter(s=>s.type==='quran'))for(let a=s.from;a<=s.to;a++){
    const key=`${s.surah}:${a}`;keys.push(key);assert.equal(quran.verses[key]?.surah,s.surah);assert.equal(quran.verses[key]?.ayah,a);assert.ok(quran.verses[key]?.text.length>0);
  }
  assert.equal(new Set(keys).size,74);
  for(const key of keys)assert.ok(quran.verses[key]);
  assert.equal(Object.keys(quran.verses).length,337);
});
test('full session repeats whole passages exactly, terminates, and keeps Maher sources',()=>{
  let cursor={section:0,track:0,round:0};const finished=Array(20).fill(0);let steps=0;
  while(cursor){const s=SECTIONS[cursor.section],tracks=tracksFor(s);assert.ok(cursor.track<tracks.length);for(const url of tracks[cursor.track].sources)if(s.type==='quran')assert.match(url,/MaherAlMuaiqly128kbps\/\d{6}\.mp3$/);if(cursor.track===tracks.length-1)finished[cursor.section]++;cursor=advanceCursor(cursor,SECTIONS,{},true);assert.ok(++steps<1000);}
  assert.deepEqual(finished,SECTIONS.map(s=>s.repeat));
});
test('single-passage playback does not advance to another section',()=>{
  let cursor={section:4,track:0,round:0},rounds=0;
  while(cursor){assert.equal(cursor.section,4);rounds++;cursor=advanceCursor(cursor);}
  assert.equal(rounds,5);
});
test('basmala is an unnumbered prelude only at the start of non-Fatiha passages',()=>{
  assert.equal(tracksFor(SECTIONS[0])[0].key,'1:1');
  assert.equal(tracksFor(SECTIONS[1])[0].key,'basmala');
  assert.ok(tracksFor(SECTIONS[1])[0].sources[0].endsWith('002000.mp3'));
  assert.equal(tracksFor(SECTIONS[2])[0].key,'2:16');
  assert.equal(tracksFor(SECTIONS[4])[0].key,'2:255');
});
test('invalid persisted values cannot invent a section, repetitions, or unlimited progress',()=>{
  const clean=safeSaved({selected:'missing',font:1000,counts:{fatiha:1000,kursi:-2},overrides:{fatiha:3,kursi:999}});
  assert.equal(clean.selected,'fatiha');assert.equal(clean.font,46);assert.equal(clean.counts.fatiha,3);assert.equal(clean.counts.kursi,undefined);assert.equal(repeatTarget(SECTIONS[4],clean.overrides),5);
  assert.deepEqual(safeSaved([]),{});
});
test('supplications have distinct local audio and do not inherit the Quran reciter',()=>{
  const duas=SECTIONS.filter(s=>s.type==='dua');assert.equal(duas.length,7);
  for(const d of duas){assert.ok(d.text);assert.match(tracksFor(d)[0].sources[0],/^assets\/dua-\d\.mp3$/);assert.ok(readFileSync(new URL('../'+d.audio,import.meta.url)).length>1000);}
});
test('full Baqara contains all 286 verses and stays outside continuous wird playback',()=>{
  assert.equal(BAQARA_FULL.to,286);
  for(let ayah=1;ayah<=286;ayah++)assert.ok(quran.verses[`2:${ayah}`]?.text);
  assert.equal(tracksFor(BAQARA_FULL).length,287);
  assert.equal(advanceCursor({section:19,track:0,round:0},ALL_SECTIONS,{},true),null);
  assert.equal(advanceCursor({section:20,track:286,round:0},ALL_SECTIONS,{},true),null);
});
test('all three interfaces have complete dictionaries and translation coverage',()=>{
  const expected=Object.keys(MESSAGES.ar).sort();
  for(const lang of Object.keys(LANGUAGES)){assert.deepEqual(Object.keys(MESSAGES[lang]).sort(),expected);for(const value of Object.values(MESSAGES[lang]))assert.ok(value.trim());}
  const meanings=JSON.parse(readFileSync(new URL('../data/translations.json',import.meta.url)));
  for(const lang of ['en','ur']){assert.equal(SECTION_NAMES[lang].length,20);assert.equal(DUA_MEANINGS[lang].length,7);assert.deepEqual(Object.keys(meanings[lang]).sort(),Object.keys(quran.verses).sort());}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePosition,START_FEN,crc32,zipFiles,manifestFor,FORMATS} from '../core.mjs';
import {writeFileSync} from 'node:fs';
test('FEN preserves exact board positions and rejects broken rows',()=>{
  const board=parsePosition(START_FEN);assert.equal(board[0][0],'r');assert.equal(board[7][4],'K');
  assert.equal(board.flat().filter(Boolean).length,32);
  assert.throws(()=>parsePosition('8/8/8/8/8/8/8/9'));
  assert.throws(()=>parsePosition('8/8/8/8/8/8/8/x'));
});
test('Compositor manifest uses full-canvas uppercase UUID layers in order',()=>{
  let n=0;const uuid=()=>`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`;
  const m=manifestFor(FORMATS.story,[{name:'Background'},{name:'Board'}],uuid);
  assert.equal(m.height,1920);assert.equal(m.layers[1].name,'Board');
  assert.equal(m.layers[0].imageFile,m.layers[0].id+'.png');
  assert.equal(m.activeLayerID,m.layers[1].id);
});
test('ZIP standard CRC and safe paths',()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  assert.throws(()=>zipFiles([{name:'../bad',bytes:new Uint8Array()}]));
  const zip=zipFiles([{name:'ChessCard.comp/manifest.json',bytes:new TextEncoder().encode('{"format":"com.compositor.project"}')}]);
  assert.equal(new DataView(zip.buffer).getUint32(0,true),0x04034b50);
  writeFileSync('/tmp/chess-studio-zip-check.zip',zip);
});

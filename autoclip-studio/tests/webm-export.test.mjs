import test from 'node:test';
import assert from 'node:assert/strict';
import {packRecordedWebm} from '../dist/webm-export.mjs';

// The vendored browser helper reads blobs through FileReader.
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend();
  }
};

const ebml = Buffer.from('1a45dfa380', 'hex');
const liveSegment = Buffer.from('1853806701ffffffffffffff', 'hex');
const info = Buffer.from('1549a966872ad7b1830f4240', 'hex');
const liveClusters = Buffer.from('1f43b67501ffffffffffffffe781001f43b67501ffffffffffffffe78120', 'hex');

test('adds WebM duration without changing the recorded clusters', async () => {
  const blob = new Blob([ebml, liveSegment, info, liveClusters], {type: 'video/webm'});
  const result = await packRecordedWebm(blob, 1234);
  const bytes = Buffer.from(await result.arrayBuffer());
  const duration = bytes.indexOf(Buffer.from('448988', 'hex'));
  assert.ok(duration > 0);
  assert.equal(bytes.readDoubleBE(duration + 3), 1234);
  assert.deepEqual(bytes.subarray(-liveClusters.length), liveClusters);
  assert.equal(result.type, blob.type);
});

test('keeps finalized or unfamiliar metadata verbatim', async () => {
  const finiteSegment = Buffer.from([0x18, 0x53, 0x80, 0x67, 0x80 | (info.length + liveClusters.length)]);
  const nonDefaultScale = Buffer.from('1549a966872ad7b18307a120', 'hex');
  const seekHead = Buffer.from('114d9b7480', 'hex');
  const cases = [
    [finiteSegment, info, liveClusters],
    [liveSegment, nonDefaultScale, liveClusters],
    [liveSegment, seekHead, info, liveClusters],
    [liveSegment, info]
  ];
  for (const elements of cases) {
    const blob = new Blob([ebml, ...elements], {type: 'video/webm'});
    assert.equal(await packRecordedWebm(blob, 1234), blob);
  }
});

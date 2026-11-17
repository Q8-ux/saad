import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  acquireStudioMicrophone,
  microphoneRecordingMime,
  microphoneFailureMessage,
} from '../assets/chunks/studio-mic-support.mjs';

test('Android microphone errors distinguish permission, busy device and unsupported capture', () => {
  assert.match(microphoneFailureMessage({name:'NotAllowedError'}), /أذونات هذا الموقع/u);
  assert.match(microphoneFailureMessage({name:'NotReadableError'}), /مشغول/u);
  assert.match(microphoneFailureMessage({name:'NotFoundError'}), /لم يجد المتصفح/u);
  assert.match(microphoneFailureMessage({name:'NotSupportedError'}), /Chrome/u);
  assert.match(microphoneFailureMessage(new Error('opaque')), /رفع تسجيل/u);
});

test('capture requests the microphone only with supported constraints', async () => {
  const track = {stop() {}};
  const stream = {getTracks: () => [track]};
  const calls = [];
  const result = await acquireStudioMicrophone({
    async getUserMedia(constraints) { calls.push(constraints); return stream; },
  });
  assert.equal(result, stream);
  assert.deepEqual(calls, [{audio: {echoCancellation: true, noiseSuppression: true}}]);
});

test('unsupported audio constraints fall back once to default microphone, never on permission denial', async () => {
  let attempts = 0;
  const recovered = await acquireStudioMicrophone({
    async getUserMedia(constraints) {
      attempts++;
      if (attempts === 1) throw {name:'OverconstrainedError'};
      assert.deepEqual(constraints, {audio:true});
      return {id:'fallback-stream'};
    },
  });
  assert.equal(recovered.id, 'fallback-stream');
  assert.equal(attempts, 2);

  attempts = 0;
  await assert.rejects(
    () => acquireStudioMicrophone({
      async getUserMedia() {attempts++; throw {name:'NotAllowedError'};}
    }),
    {name:'NotAllowedError'},
  );
  assert.equal(attempts, 1);
});

test('codec selection works on modern Android and without MediaRecorder.isTypeSupported', () => {
  assert.equal(microphoneRecordingMime({isTypeSupported: x => x === 'audio/webm;codecs=opus'}), 'audio/webm;codecs=opus');
  assert.equal(microphoneRecordingMime({isTypeSupported: x => x === 'audio/mp4'}), 'audio/mp4');
  assert.equal(microphoneRecordingMime({isTypeSupported: () => false}), '');
  assert.equal(microphoneRecordingMime({}), '');
});

test('voice dialog uses safe cleanup, language-aware guidance and upload fallback', async () => {
  const chunk = await readFile(new URL('../assets/chunks/chunk-LPQTZJNU.mjs', import.meta.url), 'utf8');
  assert.match(chunk, /acquireStudioMicrophone as mg/u);
  assert.match(chunk, /await mg\(navigator\.mediaDevices\)/u);
  assert.match(chunk, /d\(mk\(f\)\)/u);
  assert.match(chunk, /t\?\.getTracks\(\)\.forEach/u);
  assert.match(chunk, /i\.onstop=null/u);
  assert.match(chunk, /رفع تسجيل من الهاتف/u);
  assert.match(chunk, /الإملاء من ميكروفون لوحة مفاتيح الهاتف/u);
  assert.doesNotMatch(chunk, /تعذر فتح الميكروفون؛ تحقق من توصيله/u);
});

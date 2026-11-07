import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Exercise the shipped component's recording handler with its browser boundaries replaced.
const source = readFileSync(new URL('../components/PoetryStudio.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  const transcribe = async (');
const end = source.indexOf('\n  const transcribeVerseNote =', start);
assert.ok(start >= 0 && end > start);
const javascript = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function recordingHandler(response, events) {
  return new Function('deps', `const { MAX_UPLOAD_AUDIO_BYTES, setBusy, setError, setStory, setSubmissionId, setAnalysis, setAnswers, setPoem, setInputMode, setNotice, analyzeStoryContent, appFetch, recordingFilename, requestErrorMessage, window } = deps; ${javascript}; return transcribe;`)({
    MAX_UPLOAD_AUDIO_BYTES: 800 * 1024,
    ...Object.fromEntries(['Busy', 'Error', 'Story', 'SubmissionId', 'Analysis', 'Answers', 'Poem', 'InputMode', 'Notice'].map(name => ['set' + name, value => events.push([name, value])])),
    analyzeStoryContent: async (text, id) => events.push(['analyze', text, id]),
    appFetch: async (url, init) => { assert.equal(url.pathname, '/api/transcribe'); assert.ok(init.body instanceof FormData); return response; },
    recordingFilename: () => 'recording.webm', requestErrorMessage: error => error.message,
    window: { location: { origin: 'https://synthetic.example.test' } },
  });
}

test('stopping a recording sends its transcript straight to analysis exactly once', async () => {
  const events = [];
  const text = 'هذه حكاية اختبار اصطناعية عن لقاء صديق بعد غياب طويل.';
  const handle = recordingHandler(Response.json({ text, submission_id: 'synthetic-submission' }), events);
  await handle(new Blob(['synthetic audio'], { type: 'audio/webm' }), 8);
  assert.deepEqual(events.filter(event => event[0] === 'analyze'), [['analyze', text, 'synthetic-submission']]);
  assert.ok(events.findIndex(event => event[0] === 'Story') < events.findIndex(event => event[0] === 'analyze'));
  assert.ok(events.some(event => event[0] === 'Analysis' && event[1] === null));
});

test('a failed or empty transcription keeps the previous story and never starts analysis', async () => {
  for (const response of [Response.json({ error: 'تعذر استخراج الكلام' }, { status: 422 }), Response.json({ text: '' })]) {
    const events = [];
    await recordingHandler(response, events)(new Blob(['synthetic']), 8);
    assert.equal(events.filter(event => ['Story', 'analyze'].includes(event[0])).length, 0);
    assert.ok(events.some(event => event[0] === 'Error' && event[1]));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const nativeRequire = createRequire(import.meta.url);
const modules = new Map();
function load(path) {
  let filename = resolve(root, path);
  if (!existsSync(filename)) filename += '.ts';
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const javascript = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const requireLocal = name => name.startsWith('@/') ? load(name.slice(2))
    : name.startsWith('.') ? load(resolve(dirname(filename), name)) : nativeRequire(name);
  vm.runInNewContext(javascript, { exports: module.exports, module, require: requireLocal,
    console, URL, Request, Response, Headers, TextEncoder, TextDecoder, AbortSignal,
    AbortController, ReadableStream, setTimeout, clearTimeout }, { filename });
  return module.exports;
}

const handoff = load('lib/memo-handoff.ts');
const readiness = () => load('lib/intake-readiness.ts');
const memory = () => ({ asked: [], resolved: [], unavailable: [] });
const clone = value => JSON.parse(JSON.stringify(value));
const messages = [{ role: 'user', content: 'وقائع وأسماء اصطناعية لاختبار اكتمال بيانات المذكرة فقط.' }];

function initialMatter() {
  return {
    phase: 'ready', readyForMemo: true, progress: 100, assistantMessage: 'اكتملت المعلومات التي قدمتها للمراجعة.',
    caseType: 'مدني', caseStage: 'قبل رفع الدعوى', court: 'المحكمة الكلية', courtCircuit: '',
    orientation: { track: 'initial', judgment: 'none', judgmentQuote: '', categoryReason: 'مطالبة اصطناعية برد مبلغ.', nextAction: 'مراجعة البيانات.' },
    caseSummary: 'مطالبة مدنية اصطناعية باقية بين الطرفين ولم ترفع بعد.',
    parties: [{ name: 'الموكل الاصطناعي', role: 'مدعٍ' }, { name: 'الخصم الافتراضي', role: 'مدعى عليه' }],
    facts: ['سلّم الموكل الاصطناعي مبلغًا للخصم الافتراضي ولم يُعد إليه رغم المطالبة.'],
    requests: ['إلزام الخصم الافتراضي برد المبلغ المذكور في العقد.'],
    importantDates: [{ label: 'تسليم المبلغ للاختبار', date: '2026-01-01' }],
    missingInformation: [], jurisdictionMissing: [], contradictions: [], documentsNeeded: [],
    nextQuestions: [], questionKey: '', resolvedTopics: [], unavailableTopics: [], questionMemory: memory(),
    memoFields: { clientAddress: 'عنوان الموكل الاصطناعي للاختبار', otherAddress: 'عنوان الخصم الافتراضي للاختبار' },
    memoPrefill: {
      caseType: 'مدني', court: 'المحكمة الكلية', clientName: 'الموكل الاصطناعي', partyRole: 'مدعٍ',
      otherParty: 'الخصم الافتراضي', allParties: 'الموكل الاصطناعي: مدعٍ\nالخصم الافتراضي: مدعى عليه',
      facts: 'سلّم الموكل الاصطناعي مبلغًا للخصم الافتراضي ولم يُعد إليه رغم المطالبة.',
      requests: 'إلزام الخصم الافتراضي برد المبلغ المذكور في العقد.', legalIssues: 'إثبات المديونية الاصطناعية.',
    },
    legalBasis: [], precedentMatches: [], research: { sources: [] },
  };
}

function pendingDefence() {
  const state = initialMatter();
  state.caseStage = 'قضية منظورة أمام أول درجة';
  state.courtCircuit = 'الدائرة المدنية الاصطناعية';
  state.orientation.track = 'pending';
  state.memoPrefill.partyRole = 'مدعى عليه';
  state.parties[0].role = 'مدعى عليه';
  state.memoFields = { caseNumber: '0001/2026-اختبار' };
  return state;
}

function appealMatter() {
  const state = initialMatter();
  state.caseType = state.memoPrefill.caseType = 'إداري';
  state.caseStage = 'طعن على حكم ابتدائي';
  state.court = state.memoPrefill.court = 'محكمة الاستئناف';
  state.courtCircuit = 'الدائرة الإدارية الاصطناعية';
  state.memoPrefill.partyRole = state.parties[0].role = 'مستأنف';
  state.orientation = { ...state.orientation, track: 'challenge', judgment: 'first_instance', judgmentQuote: 'صدر حكم ابتدائي اصطناعي ضدي.' };
  Object.assign(state.memoFields, {
    caseNumber: '0002/2026-اختبار', judgmentNumber: '0001/2026-اختبار', judgmentDate: '2026-02-01',
    judgmentCourt: 'المحكمة الكلية', judgmentCircuit: 'الدائرة الإدارية الاصطناعية',
    judgmentOperative: 'رفض الطلب الاصطناعي كما ورد في ورقة الحكم التجريبية.',
    notificationDate: '2026-02-10', appealGrounds: 'أغفل الحكم مستندًا اصطناعيًا مرفقًا.',
    originalRequests: 'إلغاء القرار الاصطناعي الوارد في أوراق الاختبار.',
    originalGrounds: 'الوقائع والمستند الاصطناعي المذكور في صحيفة الاختبار.',
    originalPlaintiff: 'الموكل الاصطناعي', originalDefendant: 'الجهة الافتراضية',
  });
  return state;
}

test('an initial claim needs relevant addresses and dates, without inventing a case number', () => {
  const state = initialMatter();
  assert.equal(handoff.memoIntakeGaps(state).length, 0);
  assert.equal(handoff.canOfferMemoHandoff(state, messages), true);
  const packet = handoff.buildMemoHandoff(state, messages);
  assert.equal(packet.caseNumber, undefined);
  assert.equal(packet.clientAddress, state.memoFields.clientAddress);
  assert.equal(packet.otherAddress, state.memoFields.otherAddress);
  assert.equal(handoff.isCompleteMemoHandoff(packet), true);
  for (const field of ['clientAddress', 'otherAddress']) {
    const incomplete = clone(state); delete incomplete.memoFields[field];
    assert.equal(handoff.canOfferMemoHandoff(incomplete, messages), false, field);
  }
});

test('a pending defendant needs case number and chamber without irrelevant claim addresses', () => {
  const state = pendingDefence();
  assert.equal(handoff.memoIntakeGaps(state).length, 0);
  assert.equal(handoff.canOfferMemoHandoff(state, messages), true);
  delete state.memoFields.caseNumber;
  assert.equal(handoff.canOfferMemoHandoff(state, messages), false);
  assert.ok(handoff.memoIntakeGaps(state).some(gap => gap.key === 'procedure.case_number'));
});

test('court classification, names, practical requests and chronology cannot be skipped', () => {
  const scenarios = [
    state => { state.memoPrefill.clientName = ''; },
    state => { state.memoPrefill.otherParty = ''; },
    state => { state.memoPrefill.partyRole = ''; },
    state => { state.court = state.memoPrefill.court = ''; },
    state => { state.caseType = state.memoPrefill.caseType = ''; },
    state => { state.facts = []; state.memoPrefill.facts = ''; },
    state => { state.requests = []; state.memoPrefill.requests = ''; },
    state => { state.importantDates = []; },
    state => { state.orientation.track = 'unknown'; },
    state => { state.orientation.judgment = 'unknown'; },
  ];
  for (const change of scenarios) {
    const state = initialMatter(); change(state);
    assert.ok(handoff.memoIntakeGaps(state).length > 0);
    assert.equal(handoff.canOfferMemoHandoff(state, messages), false);
    assert.equal(handoff.isCompleteMemoHandoff(handoff.buildMemoHandoff(state, messages)), false);
  }
});

test('known missing data, contradictions and required documents block even a model-ready response', () => {
  for (const field of ['missingInformation', 'jurisdictionMissing', 'contradictions', 'documentsNeeded']) {
    const state = initialMatter(); state[field] = ['نقص اصطناعي مؤثر في هذه القضية'];
    assert.equal(handoff.canOfferMemoHandoff(state, messages), false, field);
    const packet = handoff.buildMemoHandoff(state, messages);
    assert.equal(packet.handoffReady, '', field);
    assert.equal(handoff.isCompleteMemoHandoff(packet), false, field);
  }
  const state = initialMatter(); state.readyForMemo = false;
  assert.equal(handoff.canOfferMemoHandoff(state, messages), false);
  assert.equal(handoff.buildMemoHandoff(state, messages).handoffReady, '');
});

test('administrative subject matter remains separate from first instance and appeal stages', () => {
  const initial = initialMatter();
  initial.caseType = initial.memoPrefill.caseType = 'إداري';
  initial.courtCircuit = 'الدائرة الإدارية الاصطناعية';
  const first = handoff.buildMemoHandoff(initial, messages);
  const appeal = handoff.buildMemoHandoff(appealMatter(), messages);
  assert.equal(first.caseType, 'إداري'); assert.equal(appeal.caseType, 'إداري');
  assert.equal(first.caseTrack, 'initial'); assert.equal(appeal.caseTrack, 'challenge');
  assert.equal(first.court, 'المحكمة الكلية'); assert.equal(appeal.court, 'محكمة الاستئناف');
  assert.equal(handoff.isCompleteMemoHandoff(first), true);
  assert.equal(handoff.isCompleteMemoHandoff(appeal), true);
});

test('each material judgment field remains required for a party bringing an appeal', () => {
  const complete = appealMatter();
  assert.equal(handoff.memoIntakeGaps(complete).length, 0);
  const required = ['judgmentNumber', 'judgmentDate', 'judgmentCourt', 'judgmentOperative',
    'notificationDate', 'appealGrounds', 'originalRequests', 'originalGrounds',
    'originalPlaintiff', 'originalDefendant', 'judgmentCircuit'];
  for (const field of required) {
    const state = clone(complete); delete state.memoFields[field];
    assert.ok(handoff.memoIntakeGaps(state).some(gap => gap.key === `memo.${field}`), field);
    assert.equal(handoff.canOfferMemoHandoff(state, messages), false, field);
    assert.equal(handoff.isCompleteMemoHandoff(handoff.buildMemoHandoff(state, messages)), false, field);
  }
  const state = clone(complete); state.courtCircuit = '';
  assert.equal(handoff.canOfferMemoHandoff(state, messages), false, 'the current chamber is distinct from the issuing chamber');
});

test('memo packets preserve supplied legal-form fields and reject corrupt or oversized handoffs', () => {
  const state = appealMatter();
  const packet = handoff.buildMemoHandoff(state, messages);
  for (const field of handoff.intakeMemoFieldNames) {
    if (field in state.memoFields) assert.equal(packet[field], state.memoFields[field], field);
  }
  assert.equal(handoff.isCompleteMemoHandoff({ ...packet, importantDates: '{broken' }), false);
  assert.equal(handoff.isCompleteMemoHandoff({ ...packet, handoffIssues: '["memo.judgmentDate"]' }), false);
  assert.equal(handoff.isCompleteMemoHandoff({ ...packet, clientName: 'غير معروف' }), false);
  const longMessages = [{ role: 'user', content: 'س'.repeat(30001) }];
  assert.equal(handoff.canOfferMemoHandoff(state, longMessages), false);
  assert.equal(handoff.isCompleteMemoHandoff(handoff.buildMemoHandoff(state, longMessages)), false);
});

test('the final readiness guard asks one factual question and never promotes false readiness', () => {
  const state = initialMatter();
  state.readyForMemo = false;
  state.memoPrefill.clientName = ''; state.memoPrefill.otherParty = '';
  const result = readiness().applyIntakeReadiness(state, memory(), 'ar');
  assert.equal(result.readyForMemo, false);
  assert.equal(result.nextQuestions.length, 1);
  assert.match(result.nextQuestions[0], /[؟?]/);
  assert.doesNotMatch(result.nextQuestions[0], /هل أنت.*مدع|اختر.*محكمة|نوع القضية/);
});

test('an unavailable answer remains a gap while intake moves to a different missing fact', () => {
  const state = initialMatter();
  state.memoPrefill.clientName = ''; state.memoPrefill.otherParty = '';
  const first = handoff.memoIntakeGaps(state)[0];
  const previous = { asked: [{ key: first.key, text: first.question }], resolved: [], unavailable: [first.key] };
  state.questionMemory = clone(previous);
  state.unavailableTopics = [first.key];
  const result = readiness().applyIntakeReadiness(state, previous, 'ar');
  assert.equal(result.readyForMemo, false);
  assert.equal(result.nextQuestions.length, 1);
  assert.notEqual(result.nextQuestions[0], first.question);
  assert.ok(handoff.memoIntakeGaps(result).some(gap => gap.key === first.key));
  assert.equal(handoff.canOfferMemoHandoff(result, messages), false);
});

test('already asked unresolved facts are not repeated or silently treated as complete', () => {
  const state = initialMatter(); state.memoPrefill.clientName = '';
  const gap = handoff.memoIntakeGaps(state)[0];
  const previous = { asked: [{ key: gap.key, text: gap.question }], resolved: [], unavailable: [gap.key] };
  state.questionMemory = clone(previous);
  const result = readiness().applyIntakeReadiness(state, previous, 'ar');
  assert.equal(result.readyForMemo, false);
  assert.equal(result.nextQuestions.length, 0);
  assert.equal(handoff.isCompleteMemoHandoff(handoff.buildMemoHandoff(result, messages)), false);
});

test('unavailable address is not repeated through a differently worded missing-information entry', () => {
  const state = initialMatter();
  delete state.memoFields.clientAddress;
  state.missingInformation = ['عنوان الموكل غير معروف'];
  const old = handoff.memoIntakeGaps(state).find(gap => gap.key === 'parties.client_address');
  const result = readiness().applyIntakeReadiness(state, { asked: [{key: old.key, text: old.question}], resolved: [], unavailable: [old.key] }, 'ar');
  assert.ok(result.nextQuestions.every(question => !/عنوان الموكل|الطرف الذي نمثله/.test(question)));
  assert.equal(result.readyForMemo, false);
});
test('unknown phrases cannot complete names or dates, while notice not served is an explicit answer', () => {
  for (const unknown of ['لا أعرف اسمه', 'غير معروف حالياً', 'لا أتذكر']) {
    const state = initialMatter(); state.memoPrefill.clientName = unknown;
    assert.equal(handoff.canOfferMemoHandoff(state), false, unknown);
    const dated = initialMatter(); dated.importantDates = [{label:'الواقعة',date:unknown}];
    assert.equal(handoff.canOfferMemoHandoff(dated), false, unknown);
  }
  const appeal = appealMatter(); appeal.memoFields.notificationDate = 'لم يتم إعلاني بعد';
  assert.equal(handoff.canOfferMemoHandoff(appeal), true);
});

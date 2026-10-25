import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { spawnSync } from 'node:child_process';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: name => {if(name.endsWith("/procedural-position"))return load("../lib/procedural-position.ts");if(name.endsWith("/judgment-evidence"))return load("../lib/judgment-evidence.ts"); if(name.endsWith("/matter-facts")||name==="./matter-facts")return load("../lib/matter-facts.ts");if(name.endsWith("/bound-draft")||name==="./bound-draft")return load("../lib/bound-draft.ts");if(name.endsWith("/case-reasoning")) return load("../lib/case-reasoning.ts"); if(name.endsWith('/legal-voice')) return load('../lib/legal-voice.ts'); if(name === '@/data/legal-sources/reviewed.json') return JSON.parse(readFileSync(new URL('../data/legal-sources/reviewed.json',import.meta.url),'utf8')); if(name.endsWith('/official-legislation')||name === './official-legislation') return load('../lib/official-legislation.ts'); if(name.endsWith('/legal-citation-review')||name === './legal-citation-review') return load('../lib/legal-citation-review.ts'); if (name.endsWith('/memo-language')) return load('../lib/memo-language.ts'); if (name.endsWith('/interface-language')) return load('../lib/interface-language.ts'); if (name === './pleading-document' || name === '@/lib/pleading-document') return load('../lib/pleading-document.ts'); if (name === './legal-language' || name === '@/lib/legal-language') return load('../lib/legal-language.ts'); if (!(name in dependencies)) throw new Error('Missing test dependency: ' + name); return dependencies[name]; }, console, URL, TextDecoder, AbortSignal, setTimeout, ...globals });
  return exports;
}
const context = load('../lib/intake-context.ts');
const streamHelpers = load('../lib/intake-stream.ts');
const search = load('../lib/legal-search.ts', { '@/db': {} });
const review = load('../lib/intake-analysis.ts', { './legal-search': search });
const baseState = (changes = {}) => ({ questionKey: 'amount', phase: 'gathering', assistantMessage: 'فهمت طلبك.', progress: 50, caseType: 'عمالي', caseStage: 'قبل التقاضي', court: 'جهة مبدئية', courtCircuit: '', jurisdictionConfidence: 'high', jurisdictionReason: 'يحتاج مراجعة الاختصاص', jurisdictionMissing: [], caseSummary: 'وقائع اصطناعية للاختبار.', legalBasis: [], analysisWarnings: [], resolvedTopics: [], unavailableTopics: [], parties: [], facts: [], requests: [], legalIssues: [], importantDates: [], documentsNeeded: [], missingInformation: ['قيمة الطلب'], contradictions: [], nextQuestions: ['ما قيمة الطلب؟'], readyForMemo: false, memoPrefill: {}, ...changes });

test('visitor is not asked to choose legal category/court, but may read an existing judgment', () => {
  for (const q of ['ما نوع القضية؟', 'هل الدعوى مدنية أم جزائية؟', 'أي محكمة تريد رفع الدعوى أمامها؟', 'Which court do you choose?']) assert.equal(context.validIntakeQuestion(q), false, q);
  for (const q of ['ما اسم المحكمة المكتوب على الحكم؟', 'متى صدر الحكم؟', 'ما الذي فعله الطرف الآخر؟']) assert.equal(context.validIntakeQuestion(q), true, q);
});

test('a wish for cassation never supplies the missing prior judgment', () => {
  const state = baseState({ court: 'محكمة التمييز', readyForMemo: true, orientation: { track: 'challenge', judgment: 'none', judgmentQuote: 'أريد أن أرفع تمييز', categoryReason: '', nextAction: 'التمييز' } });
  const result = review.reviewIntakeAnalysis(state, [], false, 'ar');
  assert.equal(result.court, ''); assert.equal(result.memoPrefill.court, ''); assert.equal(result.readyForMemo, false); assert.match(result.orientation.nextAction, /الحكم السابق/);
});

test('an actual first-instance judgment supports review of appeal but not an automatic cassation jump', () => {
  const orientation = { track: 'challenge', judgment: 'first_instance', judgmentQuote: 'صدر حكم ابتدائي ضدي', categoryReason: '', nextAction: '' };
  const appeal = review.reviewIntakeAnalysis(baseState({ court: 'محكمة الاستئناف', orientation: { ...orientation } }), [], false, 'ar');
  assert.equal(appeal.court, 'محكمة الاستئناف'); assert.equal(appeal.jurisdictionConfidence, 'low');
  const jump = review.reviewIntakeAnalysis(baseState({ court: 'محكمة التمييز', orientation: { ...orientation } }), [], false, 'ar');
  assert.equal(jump.court, '');
});

test('precedent comparison accepts only retrieved Cassation passages and preserves differences', () => {
  const sources = [{ documentId: 91, chunkId: 901, title: 'مبادئ محكمة التمييز في العمل', documentType: 'مبادئ قضائية', text: 'مقطع اصطناعي لا يمثل حكماً حقيقياً ويستخدم لاختبار وصل المرجع فقط.', sourceUrl: 'https://example.org/synthetic', officialSource: 'اختبار' }];
  sources[0].judgment={scope:'uploaded_judgments_only',recordId:'synthetic-test-only',sourceKind:'judicial_digest',sourceBook:'مصدر اصطناعي للاختبار',sourceSha256:'a'.repeat(64),pdfPage:1,printedPage:1,appealNumber:1,appealYear:2000,decisionDate:'2001-01-01',chamber:'اختبار',court:'محكمة التمييز',quote:sources[0].text,quoteSha256:'b'.repeat(64),reviewStatus:'source_page_matched',reviewedAt:'2026-10-17',currentAuthorityVerified:false};
  const match = { passageId: 'م1:1', similarity: 'المسألة العمالية', differences: 'الوقائع غير مكتملة', relevance: 'analogous' };
  const result = review.reviewIntakeAnalysis(baseState({ precedentMatches: [match, { ...match, passageId: 'م99:1' }] }), sources, false, 'ar');
  assert.equal(result.precedentMatches.length, 1); assert.equal(result.precedentMatches[0].chunkId, 901); assert.equal(result.precedentMatches[0].quote, sources[0].text); assert.equal(result.precedentMatches[0].differences, match.differences);
  const law = review.reviewIntakeAnalysis(baseState({ precedentMatches: [match] }), [{ ...sources[0], title: 'قانون العمل', documentType: 'قانون' }], false, 'ar');
  assert.equal(law.precedentMatches.length, 0);
});

test('memo handoff carries reviewed sources and opens review only with all essential case fields', () => {
  const handoff = load('../lib/memo-handoff.ts');
  const state = baseState({ readyForMemo: true, memoPrefill: { caseType: 'مدني', court: 'المحكمة الكلية', clientName: 'شخص افتراضي', partyRole: 'مدعٍ', otherParty: 'خصم افتراضي', allParties: '', facts: 'وقائع اصطناعية مكتملة الأطراف لأغراض الاختبار فقط', requests: 'رد المبلغ المطالب به', legalIssues: 'مديونية' }, legalBasis: [{ sourceId: 'م1' }], research: { sources: [{ id: 'م1', chunkId: 45 }, { id: 'م2', chunkId: 999 }] }, importantDates: [{ label: 'واقعة', date: '2026-01-01' }] });
  const packet = handoff.buildMemoHandoff(state, [{ role: 'user', content: 'حالة اصطناعية' }]);
  assert.equal(packet.assistantSourceIds, '[45]'); assert.match(packet.assistantResearch, /2026-01-01/); assert.equal(handoff.isCompleteMemoHandoff(packet), true);
  assert.equal(handoff.isCompleteMemoHandoff({ ...packet, clientName: '' }), false);
});

test('checked archive table fields stay research context and cannot become legal basis or memo handoff',()=>{
 const source={chunkId:4_000_001_508,documentId:3100001,title:'جدول اصطناعي للاختبار فقط',documentType:'جدول أرشيفي',text:'عبارة اصطناعية طويلة لاختبار عدم تحويل الجدول إلى سند للمحكمة.',sourceUrl:'https://example.org/test',officialSource:'اختبار',corpus:{scope:'reviewed_archive_image',draftingEligible:false}};
 const result=review.reviewIntakeAnalysis(baseState({legalBasis:[{passageId:'م1:1',sourceId:'م1',use:'merits',application:'شرح سياق الجدول فقط'}]}),[source],false,'ar');
 assert.equal(result.legalBasis.length,0);assert.equal(result.research.legislationCount,0);assert.equal(result.research.archivalTableCount,1);assert.equal(result.research.sources[0].kind,'archival_table');
 const handoff=load('../lib/memo-handoff.ts');const packet=handoff.buildMemoHandoff({...result,legalBasis:[{sourceId:'م1'}]},[]);assert.equal(packet.assistantSourceIds,'[]');
});

test('a blocked classification question is replaced with a factual candidate in one model call', async () => {
  const mock = client([baseState({ nextQuestions: ['أي محكمة تختار؟', 'متى حدث الاعتداء؟'] })]);
  const result = await mock.run({ messages: [{ role: 'user', content: 'اعتدى علي شخص' }] });
  assert.equal(result.nextQuestions[0], 'متى حدث الاعتداء؟'); assert.equal(mock.calls.length, 1);
});
function client(states) {
  const calls = [], shown = [];
  const openai = load('../lib/openai.ts', { './intake-context': context, './intake-stream': streamHelpers, 'cloudflare:workers': { env: { OPENAI_API_KEY: 'synthetic-test-key' } } }, {
    fetch: async (_url, init) => {
      const payload = JSON.parse(init.body); calls.push(payload);
      const state = states[Math.min(calls.length - 1, states.length - 1)];
      const output = JSON.stringify(state);
      return { ok: true, json: async () => ({ output_text: output }), body: new ReadableStream({ start(c) { for (const event of [...output.match(/.{1,15}/gs).map(delta => ({type: 'response.output_text.delta', delta})), { type: 'response.completed', response: { status: 'completed', output_text: output } }]) c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(event) + '\n\n')); c.close(); } }) };
    },
  });
  return { calls, shown, run: input => openai.conductLegalIntake({ language: 'ar', messages: [], evidence: '', onText: text => shown.push(text), ...input }) };
}

test('question ledger outlives the 16-message window and blocks paraphrased/unavailable topics', () => {
  const memory = { asked: Array.from({ length: 30 }, (_, i) => ({ key: i === 0 ? 'amount' : 'detail.' + i, text: 'سؤال ' + i })), resolved: ['client.role'], unavailable: ['dates.notice'] };
  const restored = context.cleanIntakeContext({ questionMemory: memory });
  assert.equal(context.hasAsked(restored.questionMemory, 'amount', 'كم المبلغ المطلوب؟'), true);
  assert.equal(context.hasAsked(restored.questionMemory, 'dates.notice'), true);
  assert.equal(context.hasAsked(restored.questionMemory, 'client.role'), true);
  assert.equal(context.hasAsked(restored.questionMemory, 'documents.contract'), false);
});

test('same question under a different key is recognized despite punctuation and Arabic variants', () => {
  const memory = { asked: [{ key: 'amount', text: 'ما قيمة المطالبة الإجمالية؟' }], resolved: [], unavailable: [] };
  assert.equal(context.hasAsked(memory, 'different', 'ما قيمة المطالبة الاجمالية'), true);
});

test('duplicate question is skipped for another candidate in one generation with preserved facts', async () => {
  const mock = client([baseState({ facts: ['انتهت العلاقة بتاريخ معلوم'], nextQuestions: ['ما قيمة الطلب؟', 'هل لديك نسخة العقد؟'] })]);
  const state = await mock.run({ currentState: { questionMemory: { asked: [{ key: 'amount', text: 'ما قيمة المطالبة؟' }], resolved: [], unavailable: [] } } });
  assert.equal(mock.calls.length, 1); assert.ok(mock.shown.every(text => !text.includes('قيمة الطلب')));
  assert.equal(state.questionKey, 'documents.contract'); assert.match(state.assistantMessage, /نسخة العقد/);
  assert.equal(state.facts[0], 'انتهت العلاقة بتاريخ معلوم');
});

test('unavailable answer cannot become a repeat loop or premature memo readiness', async () => {
  const mock = client([baseState({ questionKey: 'dates.notice', nextQuestions: ['متى أُعلنت؟'], readyForMemo: true, missingInformation: [] })]);
  const result = await mock.run({ currentState: { questionMemory: { asked: [], resolved: [], unavailable: ['dates.notice'] } } });
  assert.equal(mock.calls.length, 1); assert.equal(result.nextQuestions.length, 0); assert.equal(result.readyForMemo, false); assert.ok(mock.shown.every(text => !text.includes('أُعلنت')));
});

test('an unknown answer records its actual topic and moves to a different question', async () => {
  const mock = client([baseState({ nextQuestions: ['هل لديك نسخة من إشعار إنهاء الخدمة؟', 'أين مقر العمل؟'] })]);
  const result = await mock.run({ messages: [{ role: 'user', content: 'لا أعرف ولا أتذكر ذلك.' }], currentState: { questionMemory: { asked: [{ key: '', text: 'هل لديك وثيقة أو إخطار رسمي بإنهاء العمل؟' }], resolved: [], unavailable: [] } } });
  assert.equal(mock.calls.length, 1); assert.equal(result.questionKey, 'location'); assert.ok(result.questionMemory.unavailable.includes('documents.termination_notice'));
});

test('first volunteered answer is not asked again in the same turn', async () => {
  const mock = client([baseState({ nextQuestions: ['ما قيمة الطلب؟', 'أين مقر العمل؟'] })]);
  const result = await mock.run({ onText: undefined, messages: [{ role: 'user', content: 'قيمة المطالبة 1500 دينار.' }] });
  assert.equal(mock.calls.length, 1); assert.equal(result.questionKey, 'location');
});

test('negative complaint answer is settled, not unknown, and technical question keys never reach the visitor', async () => {
  const known = context.knownTopicsFromMessages([{ role: 'user', content: 'لم أقدم شكوى ولم أرفع قضية. لدي عقد وكشوف.' }]);
  assert.ok(known.includes('prior.complaint')); assert.ok(known.includes('procedure.stage')); assert.ok(known.includes('documents.contract'));
  const mock = client([baseState({ questionKey: 'procedure.stage', nextQuestions: ['procedure.stage'] })]);
  const result = await mock.run({ messages: [{ role: 'user', content: 'لم أقدم شكوى ولم أرفع قضية.' }] });
  assert.equal(result.nextQuestions.length, 0); assert.doesNotMatch(result.assistantMessage, /procedure.stage/); assert.ok(mock.shown.every(text => !text.includes('procedure.stage')));
});

test('court names outside the supported Kuwaiti court catalog are withheld', () => {
  const result = review.reviewIntakeAnalysis(baseState({ court: 'محكمة البداية العمالية', readyForMemo: true }), evidence, false, 'ar');
  assert.equal(result.court, ''); assert.equal(result.readyForMemo, false); assert.equal(result.jurisdictionConfidence, 'low');
});

test('short follow-up retrieves the existing dispute, not just yes/no or a date', () => {
  const queries = context.intakeSearchQueries('لا أعرف', { caseType: 'عمالي', facts: ['موظف في القطاع الأهلي يطالب بأجور'], requests: ['دفع الراتب'] });
  assert.ok(queries.some(query => query.includes('العمل'))); assert.ok(queries.some(query => query.includes('اختصاص')));
  assert.ok(context.intakeSearchQueries('My landlord seeks eviction', null).some(query => query.includes('إيجار')));
});

const evidence = [{ documentId: 1, chunkId: 2, title: 'مستند اصطناعي للاختبار', text: 'هذا نص اصطناعي طويل لا يقرر قاعدة قانونية ويستخدم لاختبار مطابقة الاقتباس فقط.', reference: 'اختبار', sourceUrl: 'https://example.org/synthetic', officialSource: 'مصدر اصطناعي', documentType: 'قانون', qualityScore: 90 }];
test('selected passage quotes are copied from the database, never from generated text', () => {
  const state = baseState({ legalBasis: [{ passageId: 'م1:1', quote: 'نص مختلق يتجاهله الخادم', application: 'صلة افتراضية للاختبار', use: 'substance' }, { passageId: 'م99:1', application: 'غير موجود', use: 'jurisdiction' }] });
  const result = review.reviewIntakeAnalysis(state, evidence, false, 'ar');
  assert.equal(result.legalBasis.length, 1); assert.equal(result.legalBasis[0].quote, evidence[0].text); assert.equal(result.legalBasis[0].sourceId, 'م1');
});
test('amending provisions of a statute is not classified as a judgment', () => {
  assert.equal(search.isJudgmentEvidence({ title: 'قانون بشأن تعديل بعض أحكام قانون المرافعات', documentType: 'قانون' }), false);
  assert.equal(search.isJudgmentEvidence({ title: 'احكام التمييز في القانون الاداري', documentType: 'قانون' }), true);
  assert.equal(search.isJudgmentEvidence({ title: 'اهم المبادئ القانونية لمحكمة التمييز', documentType: 'مبادئ قضائية' }), true);
});
test('only matching server evidence survives; forged citations, quotes and unsafe links are rejected', () => {
  const result = review.reviewIntakeAnalysis(baseState({ legalBasis: [{ sourceId: 'م99', quote: evidence[0].text, application: 'مختلق', use: 'jurisdiction' }, { sourceId: 'م1', quote: 'اقتباس مختلف تماماً لا وجود له في المصدر', application: 'مختلق', use: 'substance' }] }), evidence, false, 'ar');
  assert.equal(result.legalBasis.length, 0); assert.equal(result.jurisdictionConfidence, 'low'); assert.match(result.analysisWarnings.join(' '), /استُبعد/);
  const valid = review.reviewIntakeAnalysis(baseState({ legalBasis: [{ sourceId: 'م1', quote: evidence[0].text, application: 'اختبار ربط المصدر', use: 'substance' }] }), [{ ...evidence[0], sourceUrl: 'javascript:alert(1)' }], false, 'ar');
  assert.equal(valid.legalBasis.length, 1); assert.equal(valid.research.sources[0].sourceUrl, '');
});

test('missing source and library outage stay explicit and strip fabricated numeric authority', () => {
  for (const failed of [false, true]) {
    const result = review.reviewIntakeAnalysis(baseState({ assistantMessage: 'المادة 999 تمنحك الحق', jurisdictionReason: 'الطعن 1234 يحدد المحكمة', jurisdictionMissing: ['المكان'], readyForMemo: true }), [], failed, 'ar');
    assert.equal(result.research.status, failed ? 'unavailable' : 'empty'); assert.equal(result.readyForMemo, false);
    assert.doesNotMatch(result.assistantMessage + result.jurisdictionReason, /999|1234/); assert.equal(result.jurisdictionConfidence, 'low');
  }
});

test('legislation and reviewed-judgment adapters never call the legacy/private case database', async()=>{
 let calls=0,judgmentCalls=0;
 const bound={searchBoundEvidence:async(_q,_n,kind)=>{calls++;return kind==='judgment'?[]:[{chunkId:1000000001,documentId:1000001,title:'قسم من ملف المستخدم',documentType:'تشريع',text:'نص اصطناعي لاختبار العقد',reference:'صفحة PDF 4'}];},readBoundEvidence:async ids=>ids.filter(id=>id===1000000001).map(chunkId=>({chunkId,text:'نص أعاد الخادم قراءته'}))};
 const actual=load('../lib/legal-search.ts',{'@/db':{getD1:()=>{throw Error('must not access legacy or private cases');}},'./bound-legislation':bound,'./legislation-workbench':{searchArchiveForAssistant:async()=>[]},'./reviewed-judgments':{searchReviewedJudgments:async()=>{judgmentCalls++;return [];},readReviewedJudgments:async()=>[]}});
 const found=await actual.searchIntakeLibrary(['موضوع اصطناعي']);assert.equal(found.length,1);assert.equal(found[0].chunkId,1000000001);assert.ok(calls>=1);assert.ok(judgmentCalls>=1);
 assert.equal((await actual.searchCassationEvidenceAcross(['موضوع اصطناعي'])).length,0);
 const transferred=await actual.readHandoffEvidence('[1000000001,3,4,"1 OR 1=1",-2]');assert.equal(transferred.length,1);assert.equal(transferred[0].chunkId,1000000001);
});

test('explicit judgments, negative answers and known relationships remain factual', () => {
  const actual = context.proceduralFacts('صدر حكم ابتدائي من المحكمة الكلية وأريد الاعتراض على الحكم');
  assert.equal(actual.judgment, 'first_instance'); assert.equal(actual.challenge, true);
  const negative = context.proceduralFacts('لم يصدر حكم وأريد الطعن');
  assert.equal(negative.judgment, 'none'); assert.equal(negative.challenge, false); assert.equal(negative.judgmentQuote, '');
  const topics = context.knownTopicsFromMessages([{role:'user',content:'صديقي اقترض 500 دينار ولم يصدر حكم'}]);
  assert.ok(topics.includes('relationship')); assert.ok(topics.includes('amount')); assert.ok(topics.includes('procedure.stage'));
});

test('long chunks expose a verbatim relevant window instead of an unrelated opening', () => {
  const text = 'مقدمة عامة '.repeat(400) + 'قرض مديونية وفاء إثبات '.repeat(50);
  const excerpt = search.relevantExcerpt(text, 'قرض مديونية وفاء إثبات');
  assert.ok(excerpt.includes('مديونية')); assert.ok(text.includes(excerpt)); assert.ok(excerpt.length <= 1800);
});


test('the issuing court cannot become the next forum solely from its name in the facts', () => {
 const state = baseState({ court: 'المحكمة الكلية', orientation: { track: 'challenge', judgment: 'first_instance', judgmentQuote: 'صدر حكم ابتدائي من المحكمة الكلية', nextAction: '', categoryReason: '' } });
 const result = review.reviewIntakeAnalysis(state, [], false, 'ar');
 assert.equal(result.court, ''); assert.equal(result.readyForMemo, false);
});

test('understood case can transfer before research finishes without inventing missing names or court', () => {
  const h = load('../lib/memo-handoff.ts');
  assert.equal(h.canOfferMemoHandoff({facts:[],caseSummary:''}), false);
  const state = baseState({ readyForMemo:false, court:'', facts:['وقائع اصطناعية واضحة عن مطالبة مالية.'], caseSummary:'مطالبة مالية قيد المراجعة', courtCircuit:'', importantDates:[{label:'الواقعة',date:'2026-09-01'}], memoPrefill:{caseType:'مدني',court:'',clientName:'سالم الاختباري',partyRole:'مدعٍ',otherParty:'ناصر الافتراضي',allParties:'سالم: مدعٍ\nناصر: مدعى عليه',facts:'وقائع اصطناعية واضحة عن مطالبة مالية.',requests:'رد المبلغ المطالب به',legalIssues:'إثبات الدين'} });
  assert.equal(h.canOfferMemoHandoff(state), true);
  const data=h.buildMemoHandoff(state,[{role:'user',content:'بيانات اصطناعية للاختبار'}]);
  for(const key of Object.keys(state.memoPrefill)) assert.equal(data[key],state.memoPrefill[key]);
  assert.equal(data.court,''); assert.equal(h.isCompleteMemoHandoff(data),false);
  assert.equal(JSON.parse(data.importantDates)[0].date,'2026-09-01');
  assert.match(h.memoApprovalNotice.ar,/مصادقة مجموعة سابق القانونية/);
});


test('dictation keeps identifiers as strings, ignores blank values and rejects unapproved fields', () => {
 const h=load('../lib/memo-dictation.ts');
 const r=h.dictationFields({clientName:' اسم اصطناعي ',caseNumber:'0012/2026',court:'',facts:'',phone:'99999999',approved:true,parties:[{name:'خصم اصطناعي',role:'مدعى عليه'}]});
 assert.equal(r.clientName,'اسم اصطناعي');assert.equal(r.caseNumber,'0012/2026');assert.equal(r.phone,undefined);assert.equal(r.approved,undefined);assert.equal(r.court,undefined);assert.equal(r.facts,undefined);assert.match(r.allParties,/مدعى عليه/);
});

const languagePolicy = load('../lib/legal-language.ts');
test('legal research never becomes a visitor question or a missing attachment, in all interface languages', () => {
  const research = ['هل يمكنك إرفاق النص القانوني؟', 'ما رقم المادة القانونية؟', 'زوّدنا بأحكام التمييز المشابهة؟', 'هل لديك حكم تمييز مماثل؟', 'السوابق القضائية المطلوبة', 'Provide the relevant statute text?', 'Can you attach cassation precedents?', 'قانونی دفعات فراہم کریں؟'];
  for (const text of research) {
    assert.equal(languagePolicy.isLegalResearchRequirement(text), true, text);
    assert.equal(context.validIntakeQuestion(text), false, text);
  }
  for (const text of ['ما منطوق الحكم الصادر في قضيتك؟', 'هل لديك حكم التمييز الصادر ضدك؟', 'هل توجد نسخة من عقدك؟', 'When was the judgment in your case issued?']) assert.equal(context.validIntakeQuestion(text), true, text);
  assert.equal(languagePolicy.factualRequirements(['النص القانوني', 'أحكام التمييز', 'تاريخ استلام الحكم']).join('|'), 'تاريخ استلام الحكم');
});
test('spelling changes prose only and preserves names, identifiers, dates, amounts and negation', () => {
  const text = 'المحكمه: القضيه 0012/2026. سالم الخدمه لم يستلم 00500.250 دينار في 01/02/2026 ويطلب التعويظ ومكافاه نهايه الخدمه.';
  const corrected = languagePolicy.correctLegalProse(text, ['سالم الخدمه']);
  assert.match(corrected, /المحكمة: القضية 0012\/2026/);
  assert.match(corrected, /سالم الخدمه لم يستلم 00500.250 دينار في 01\/02\/2026/);
  assert.match(corrected, /التعويض ومكافأة/);
});
test('one intake call corrects memo facts, removes source burdens and never streams the forbidden request', async () => {
  const mock = client([baseState({ assistantMessage: 'يرجى إرفاق النص القانوني.', parties: [{ name: 'سالم الخدمه', role: 'مدعٍ' }], clientPartyIndex: 0, facts: ['القضيه 0012/2026 لسالم الخدمه عن مبلغ 500 دينار.'], requests: ['أطلب التعويظ.'], nextQuestions: ['هل يمكنك تزويدي بأحكام التمييز؟', 'متى استلمت المبلغ؟'], documentsNeeded: ['حكم تمييز مشابه', 'العقد المبرم مع الخصم'], missingInformation: ['رقم المادة', 'تاريخ الواقعة'], jurisdictionMissing: ['النص القانوني'] })]);
  const result = await mock.run({ messages: [{ role: 'user', content: 'حالة اصطناعية' }] });
  assert.equal(mock.calls.length, 1);
  assert.ok(mock.shown.every(t => !t.includes('إرفاق النص')));
  assert.equal(result.nextQuestions[0], 'متى استلمت المبلغ؟');
  assert.equal(result.documentsNeeded.join('|'), 'العقد المبرم مع الخصم');
  assert.equal(result.missingInformation.join('|'), 'تاريخ الواقعة');
  assert.equal(result.jurisdictionMissing.length, 0);
  assert.match(result.memoPrefill.facts, /القضية 0012\/2026 لسالم الخدمه/);
  assert.equal(result.memoPrefill.requests, 'أطلب التعويض.');
  assert.match(mock.calls[0].instructions, /مسؤوليتك أنت/);
});
test('unavailable sources remain assistant-owned and never manufacture an authority', () => {
  const result = review.reviewIntakeAnalysis(baseState({ documentsNeeded: ['النص القانوني'], missingInformation: ['أحكام التمييز'], analysisWarnings: ['يرجى توفير النص القانوني.'], nextQuestions: ['هل تستطيع إرفاق حكم تمييز؟'] }), [], true, 'ar');
  assert.equal(result.research.owner, 'assistant'); assert.equal(result.research.status, 'unavailable');
  assert.equal(result.legalBasis.length, 0); assert.equal(result.documentsNeeded.length, 0); assert.equal(result.missingInformation.length, 0); assert.equal(result.nextQuestions.length, 0);
  assert.ok(result.analysisWarnings.every(s => !s.includes('يرجى توفير')));
});
test('memo source requests are replaced by research ownership; actual case documents are retained', () => {
  const output = languagePolicy.removeDelegatedResearch('الوقائع: لم يدفع الخصم.\nبيانات ناقصة: يرجى إرفاق النص القانوني وحكم تمييز مشابه.\nيرجى بيان تاريخ الحكم الصادر في قضيتك.');
  assert.ok(!output.includes('يرجى إرفاق')); assert.match(output, /يتولى المساعد البحث/); assert.match(output, /تاريخ الحكم الصادر في قضيتك/);
});


test('a volunteered friendship blocks a repeated relationship question and missing legal relationship label', async () => {
 const mock=client([baseState({nextQuestions:['ما هي علاقتك بصديقك ناصر؟','أين يقيم الطرف الآخر؟'],missingInformation:['نوع العلاقة القانونية بين الطرفين.','مكان إقامة الخصم']})]);
 const result=await mock.run({messages:[{role:'user',content:'أقرضت صديقي ناصر 500 دينار'}]});
 assert.equal(result.nextQuestions[0],'أين يقيم الطرف الآخر؟');assert.equal(result.missingInformation.join('|'),'مكان إقامة الخصم');
});

test('dictation corrects a model role from the stated appeal actor without inventing legal authority', async () => {
 const openai = load('../lib/openai.ts', { './intake-context': context, './intake-stream': streamHelpers, 'cloudflare:workers': { env: { OPENAI_API_KEY: 'synthetic-test-key' } } }, {
  fetch: async () => Response.json({output_text:JSON.stringify({clientName:'اسم اصطناعي',otherParty:'خصم اصطناعي',partyRole:'مدعٍ',court:'المحكمة الكلية',parties:[{name:'اسم اصطناعي',role:'مدعٍ'},{name:'خصم اصطناعي',role:'مستأنف'}],facts:'وقائع اصطناعية',requests:'رفض الاستئناف',warnings:[]})}),
 });
 const result=await openai.analyzeMemoDictation('أنا المدعى عليه في القضية. استأنف المدعي الحكم.');
 assert.equal(result.partyRole,'مستأنف ضده');assert.equal(result.court,'محكمة الاستئناف');assert.equal(result.parties[0].role,'مستأنف ضده');assert.equal(result.parties[1].role,'مستأنف');
 const ambiguous=await openai.analyzeMemoDictation('القضية منظورة أمام محكمة الاستئناف.');
 assert.equal(ambiguous.partyRole,'');assert.match(ambiguous.warnings.join(' '),/مَن قدّم الطعن/);
});

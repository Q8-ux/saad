import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './template-harness.mjs';

// The production route and its validators run unchanged against a synthetic
// case, template, source records and controlled provider responses.
const caseData = {
 caseType:'مدني', court:'المحكمة الكلية', courtCircuit:'الدائرة المدنية', documentKind:'memorandum',
 clientName:'طرف اصطناعي ألف', otherParty:'طرف اصطناعي باء', partyRole:'مدعى عليه',
 facts:'نازع المدعى عليه في بقاء مبلغ لم يتم سداده وفق ما يذكره المدعي.',
 requests:'رفض المطالبة بالمبلغ غير المثبت.',
};
const reasoning = {
 factQuote:'مبلغ لم يتم سداده',
 applicationQuote:'ينصب الخلاف على مبلغ لم يتم سداده بحسب ادعاء الخصم، ولذلك تقابل المطالبة بأصل التعامل لتحديد الرصيد المتنازع عليه.',
 opposingQuote:'قد يتمسك الخصم بأن كشف حسابه يكفي لإثبات ما بقي في ذمة الطرف الآخر.',
 responseQuote:'والرد أن مطابقة الكشف بأصل التعامل تبين مكونات الرصيد ومدى اتفاقها مع المطالبة المعروضة.',
};
const controlSource = {
 documentId:98765, title:'قانون اختباري غير حقيقي', reference:'المادة 12', text:'نص اصطناعي لتجربة بوابة المذكرة.', documentType:'قانون',
 corpus:{scope:'bound_file_only', sourceId:'user-legislation-source',
  sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',
  articleIdentityUnique:true, articleNumber:'12', lawIdentity:{number:98765, year:2000}},
};
const template = {
 info:{id:'synthetic-template', kind:'claim', title:'قالب اصطناعي', sourceFilename:'synthetic-fixture'},
 definition:{title:'قالب اصطناعي', paper:'A4', border:false, labels:{}, clauses:{}},
};
const security = load('../lib/request-security.ts', {'@/db':{}});
const officialLegislation = {officialVerificationSummary:() => ({scope:'synthetic-test'})};
const search = load('../lib/legal-search.ts', {'@/db':{}, './official-legislation':officialLegislation});

async function generateSyntheticMemo({initiallyAnchored = false, repair = true} = {}) {
 const secondFact = 'وُصفت عملية التحويل في الإيصال بأنها تسوية مستقلة.';
 const facts = `${caseData.facts}\n${secondFact}`;
 const secondSource = {...controlSource, documentId:98766, reference:'المادة 13', text:'مقتطف اصطناعي آخر لفحص رابط السند والواقعة.', corpus:{...controlSource.corpus, articleNumber:'13'}};
 const objections = [
  reasoning.opposingQuote,
  'قد يدفع الخصم بأن اختلاف الوصف وحده لا يستبعد احتساب المبلغ ضمن التعامل محل المطالبة؛',
 ];
 const replies = [
  reasoning.responseQuote,
  'والرد أن مقارنة بيان الغرض في الإيصال ببيانات أصل التعامل تسبق إدراج التحويل في الرصيد محل المطالبة.',
 ];
 const issues = [reasoning.factQuote, secondFact].map((factQuote, i) => ({
  issue:i ? 'تخصيص التحويل' : 'أصل الرصيد', factQuote, document:'الوصف الوارد في الوقائع', sourceMarkers:[`م${i + 1}`],
  application:i ? 'مطابقة وصف التحويل مع التعامل' : 'فحص أصل الرصيد', counterargument:objections[i], response:replies[i],
  proposedRelief:caseData.requests, missing:'',
 }));
 const grounds = corrected => [
  '١) أصل الرصيد',
  corrected ? 'ينصب الخلاف على {{FACT_1}} بحسب المدخلات، ولذلك يلزم تحديد ما تثبته مستندات أصل التعامل بشأن الرصيد.' : reasoning.applicationQuote,
  objections[0], replies[0], '【م1】',
  '٢) تخصيص التحويل',
  `يتعين تقييم ما ورد عن ${corrected ? '{{FACT_2}}' : 'قيد مالي منفصل'} بربط مبلغ العملية بالمعاملة محل الطلب؛ ${objections[1]} ${replies[1]}`,
  '【م2】',
 ].join('\n');
 const auditInputs = [], saved = [], archives = [], drafts = [];
 const {POST} = load('../app/api/legal/memo/route.ts', {
  '@/lib/request-security':{...security, enforceRateLimit:async () => {}},
  '@/lib/approved-templates':{loadApprovedTemplate:async () => template},
  '@/lib/public-auth':{requireMemoUserOrGuest:async () => ({id:'synthetic-multi-defense'})},
  '@/lib/service-settings':{requireServiceEnabled:async () => {}},
  '@/lib/service-records':{enforceUserServiceLimit:async () => {}, recordServiceActivity:async row => archives.push(row)},
  '@/lib/sabeq-agent-bridge':{agentPipelineEnabled:() => false},
  '@/lib/official-legislation':officialLegislation,
  '@/lib/memo-requests':{startMemoRequest:async () => 'synthetic-multi-defense-request', finishMemoRequest:async (...row) => saved.push(row)},
  '@/lib/legal-search':{...search, searchLegalEvidenceAcross:async () => [controlSource, secondSource], searchCassationEvidenceAcross:async () => [], readHandoffEvidence:async () => []},
  '@/lib/openai':{openAIErrorResponse:error => {throw error;}, deriveLegalResearchPlan:async () => ({searchQueries:[], legalIssues:[]}), generateText:async options => {
   if (options.schema?.properties?.clientRole) return JSON.stringify({
    clientRole:caseData.partyRole, opponentRole:'مدعٍ', characterization:'مطالبة', issues, missingFacts:[], researchGaps:[],
   });
   if (options.schema?.properties?.checks) {
    const dictionary = JSON.parse(options.input);
    auditInputs.push(dictionary);
    const checks = issues.map((_, i) => {
     const option = dictionary.checkOptions.find(o => o.issueIndex === i && o.status === 'addressed');
     const quoteKey = text => dictionary.quoteOptions.find(q => q.quote.includes(text))?.quoteKey;
     return {checkKey:option?.checkKey ?? `issue_${i}_omitted`, reason:'تقييم دفوع القضية الاصطناعية', substance:{
      opposingQuoteKey:option ? quoteKey(objections[i]) : 'none', responseQuoteKey:option ? quoteKey(replies[i]) : 'none',
      sourceMarkers:option ? [`م${i + 1}`] : [],
     }};
    });
    return JSON.stringify({checks, roleConsistent:true, factsPreserved:true, reliefConsistent:true, unsupportedAssertions:[]});
   }
   assert.ok(options.schema?.properties?.facts, 'verified source markers should not require a citation repair');
   drafts.push(options);
   return JSON.stringify({facts, grounds:grounds(initiallyAnchored || (repair && drafts.length === 2)), requests:caseData.requests, fields:{}, factualNotes:[], legalResearchNotes:''});
  }},
 });
 const request = new Request('https://sabeq.example/api/legal/memo', {
  method:'POST', headers:{Origin:'https://sabeq.example', 'Content-Type':'application/json'}, body:JSON.stringify({...caseData, facts}),
 });
 const response = await POST(request);
 return {status:response.status, value:await response.json(), drafts, auditInputs, archives, saved, secondFact};
}

test('the actual memo route repairs a synthetic unanchored second issue before independent approval and archiving', async () => {
 const {status, value, drafts, auditInputs, archives, saved, secondFact} = await generateSyntheticMemo();
 assert.equal(status, 200, JSON.stringify(value));
 assert.equal(drafts.length, 2);
 assert.equal(auditInputs.length, 2);
 assert.ok(auditInputs[0].checkOptions.some(o => o.issueIndex === 0 && o.status === 'addressed'));
 assert.ok(!auditInputs[0].checkOptions.some(o => o.issueIndex === 1 && o.status === 'addressed'));
 const repair = JSON.parse(drafts[1].input);
 assert.deepEqual(repair.audit.excerptOptionCounts.map(n => n > 0), [true, false]);
 assert.deepEqual(repair.issuesWithoutApplication, [1]);
 for (const draft of drafts) assert.match(draft.instructions, /factReferences/);
 assert.deepEqual(value.caseQuality.audit.checks.map(c => c.status), ['addressed', 'addressed']);
 assert.ok(value.caseQuality.audit.excerptOptionCounts.every(n => n > 0));
 assert.ok(value.memo.includes(`«${secondFact}»`));
 assert.doesNotMatch(value.memo, /\{\{FACT_|【م\d+】/);
 assert.equal(archives.length, 1);
 assert.equal(archives[0].outputText, value.memo);
 assert.deepEqual(saved.map(row => row[3]), ['draft_generated']);
});

test('a synthetic draft with both factual references passes the actual memo route on the first audit', async () => {
 const {status, value, drafts, auditInputs, archives} = await generateSyntheticMemo({initiallyAnchored:true});
 assert.equal(status, 200, JSON.stringify(value));
 assert.equal(drafts.length, 1);
 assert.equal(auditInputs.length, 1);
 assert.equal(value.caseQuality.status, 'review_required');
 assert.ok(value.caseQuality.audit.excerptOptionCounts.every(n => n > 0));
 assert.ok(value.memo.includes(controlSource.text));
 assert.equal(archives.length, 1);
});

test('an issue that still lacks a literal application after one repair stays pending with numeric diagnostics', async () => {
 const {status, value, drafts, auditInputs, archives, saved, secondFact} = await generateSyntheticMemo({repair:false});
 assert.equal(status, 422, JSON.stringify(value));
 assert.equal(value.stage, 'defense_review');
 assert.equal(drafts.length, 2);
 assert.equal(auditInputs.length, 2);
 assert.deepEqual(value.review.omittedIssueIndexes, [1]);
 assert.deepEqual(value.review.applicationCandidateCounts.map(n => n > 0), [true, false]);
 assert.deepEqual(value.review.excerptOptionCounts.map(n => n > 0), [true, false]);
 assert.equal(value.review.selectedApplications[1].candidateIndex, null);
 assert.ok(!JSON.stringify(value.review).includes(secondFact));
 assert.equal(value.memo, undefined);
 assert.deepEqual(archives, []);
 assert.deepEqual(saved, [['synthetic-multi-defense-request', 'needs_review', '', 'defense_review']]);
});

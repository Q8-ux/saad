import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from './template-harness.mjs';

const bound = load('../lib/bound-draft.ts');
const citations = load('../lib/legal-citation-review.ts');
const reasoning = load('../lib/case-reasoning.ts');
const pleading = load('../lib/pleading-document.ts');
const docx = load('../lib/pleading-docx.ts');
const statutory = load('../lib/statutory-text.ts');
const language = load('../lib/legal-language.ts');

const BOUND_SHA = '8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd';

function extractZipEntryText(zipBytes, entryName) {
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset + 30 <= zipBytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const name = decoder.decode(zipBytes.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    if (name === entryName) {
      return decoder.decode(zipBytes.subarray(dataStart, dataStart + compressedSize));
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`ZIP entry not found: ${entryName}`);
}

const syntheticTemplateInfo = {
  id: 'tpl-claim-1',
  version: 1,
  kind: 'claim',
  title: 'صحيفة دعوى',
  sourceFilename: 'claim.docx',
  sourceSha256: 'a'.repeat(64),
  approvedAt: '2026-10-01T00:00:00Z',
};

const syntheticTemplateDef = {
  kind: 'claim',
  title: 'صحيفة دعوى',
  paper: 'A4',
  border: true,
  emblemData: '',
  labels: {
    subject: 'الموضوع',
    applicant: 'مقدم الطلب:',
    address: 'الموطن:',
    opponent: 'ضد:',
    otherAddress: 'موطن الخصم:',
    grounds: 'الأسانيد القانونية',
    therefore: 'لذلك',
    basedOn: 'بناءً عليه',
  },
  clauses: {
    date: 'إنه في يوم الموافق {{announcementDate}}',
    processServer: 'بناءً على طلب الطالب انتقلت أنا مندوب الإعلان',
    moved: 'وأعلنت المعلن إليه بالآتي:',
    addressedTo: 'مخاطباً مع:',
    whereas: 'حيث تتحصل الوقائع في الآتي:',
    relief: 'يلتمس مقدم المذكرة الحكم بالآتي:',
    summons: 'تكليف الخصم بالحضور أمام المحكمة في جلسة {{hearingDate}}',
    reservation: 'مع حفظ كافة الحقوق الأخرى.',
    responsibility: 'مسؤولية البيانات على الطالب.',
  },
};

const verbatimArticleText = 'إذا أخل أحد المتعاقدين بالتزامه في العقود الملزمة للجانبين جاز للمتعاقد الآخر بعد إعذاره أن يطلب التنفيذ أو الفسخ مع التعويض إن كان له مقتض.';
const statutorySource = {
  documentId: 101,
  title: 'القانون المدني الكويتي (نسخة اختبارية موثقة)',
  category: 'مدني',
  lawNumber: 67,
  lawYear: 1980,
  reference: 'موضع المادة 209؛ صفحة PDF 44',
  text: verbatimArticleText,
  sourceUrl: 'https://q8-ux.github.io/saad/sabeq-legal/source.html?page=44',
  officialSource: 'مكتبة سابق المربوطة',
  sourceType: 'user_document',
  documentType: 'تشريع',
  qualityScore: 95,
  corpus: {
    scope: 'bound_file_with_reviewed_errata',
    sourceId: 'user-legislation-source',
    sourceSha256: BOUND_SHA,
    databaseSha256: 'b'.repeat(64),
    recordId: 'civil-art-209',
    textSha256: createHash('sha256').update(verbatimArticleText).digest('hex'),
    page: 44,
    printedPage: '44',
    documentId: 'civil-law-67-1980',
    documentTitle: 'القانون المدني الكويتي (نسخة اختبارية موثقة)',
    articleNumber: '209',
    detectedArticleNumber: '209',
    articleIdentityUnique: true,
    completeArticleVerified: true,
    currentLawVerified: true,
    reviewStatus: 'primary_publication_reconciled',
    editionClaim: '2026',
    lawIdentity: { number: 67, year: 1980, header: 'القانون المدني رقم 67 لسنة 1980', reviewStatus: 'visually_reviewed_section_identity' },
    effectiveFrom: '1981-02-25',
    effectiveTo: null,
    repealed: false,
    applicabilityStatus: 'verified',
    context: { previousPage: 43, nextPage: 45 },
    previousText: '',
    nextText: '',
    ocr: null,
  },
};

const cassationPrinciple = 'يشترط للقضاء بفسخ العقد الملزم للجانبين ثبوت إخلال المدين بالتزام جوهري وتوجيه إعذار رسمي إليه قبل رفع الدعوى.';
const cassationSource = {
  documentId: 202,
  title: 'مجموعة المبادئ القانونية — الدائرة التجارية',
  category: 'أحكام تمييز',
  lawNumber: null,
  lawYear: null,
  reference: 'صفحة PDF 88',
  text: cassationPrinciple,
  sourceUrl: '',
  officialSource: 'مجموعة أحكام التمييز المراجعة',
  sourceType: 'reviewed_judgment',
  documentType: 'حكم تمييز',
  qualityScore: 98,
  judgment: {
    scope: 'uploaded_judgments_only',
    recordId: 'cass-comm-412-2019',
    sourceKind: 'judicial_digest',
    sourceBook: 'مجموعة المبادئ التجارية',
    sourceSha256: 'c'.repeat(64),
    pdfPage: 88,
    printedPage: 85,
    appealNumber: 412,
    appealYear: 2019,
    decisionDate: '2020-05-11',
    chamber: 'التجارية الثانية',
    court: 'محكمة التمييز',
    quote: cassationPrinciple,
    quoteSha256: createHash('sha256').update(cassationPrinciple).digest('hex'),
    reviewStatus: 'source_page_matched',
    reviewedAt: '2026-10-15',
    currentAuthorityVerified: false,
  },
};

test('1 & 4: builds case-grounded defense with application, strongest counterargument, reply, and analogous Cassation ruling', () => {
  const caseInput = {
    caseType: 'تجاري — عقد توريد',
    court: 'المحكمة الكلية',
    courtCircuit: 'الدائرة التجارية الرابعة',
    caseNumber: '1450/2026',
    clientName: 'شركة الخليج للتجهيزات المحدودة',
    partyRole: 'مدعى عليها',
    otherParty: 'مؤسسة الساحل للمقاولات',
    facts: 'أبرمت المدعية عقد توريد معدات بتاريخ 2026-01-10 وامتنعت عن سداد الدفعة المقدمة الثابتة بمحضر المطابقة المؤرخ 2026-02-01 ولم توجه أي إعذار رسمي قبل إقامة الدعوى.',
    requests: 'رفض الدعوى لعدم الإعذار ولعدم تنفيذ المدعية التزامها المقابل دون إضافة طلبات أخرى.',
  };

  const planRaw = JSON.stringify({
    clientRole: 'مدعى عليها',
    opponentRole: 'مدعية',
    characterization: 'منازعة في طلب فسخ وتعويض عن عقد توريد ملزم للجانبين',
    issues: [{
      issue: 'الدفع بعدم قبول طلب الفسخ لعدم توجيه إعذار رسمي وثبوت إخلال المدعية بسداد الدفعة المقدمة',
      factQuote: 'وامتنعت عن سداد الدفعة المقدمة الثابتة بمحضر المطابقة المؤرخ 2026-02-01 ولم توجه أي إعذار رسمي قبل إقامة الدعوى.',
      document: 'محضر المطابقة المؤرخ 2026-02-01 وعقد التوريد المؤرخ 2026-01-10',
      sourceMarkers: ['م1', 'م2'],
      application: 'لما كانت المدعية وامتنعت عن سداد الدفعة المقدمة الثابتة بمحضر المطابقة المؤرخ 2026-02-01 ولم توجه أي إعذار رسمي قبل إقامة الدعوى فإن شرط الفسخ القانوني يتخلف في حقها.',
      counterargument: 'قد تعترض المدعية بأن إقامة صحيفة الدعوى تقوم مقام الإعذار الرسمي في المطالبة بالفسخ.',
      response: 'يرد على هذا الاعتراض بأن خلو الأوراق من إعذار سابق مع ثبوت امتناع المدعية نفسها عن سداد الدفعة المقدمة يمنع ترتيب أثر الفسخ أو التعويض قبل ثبوت التقصير.',
      proposedRelief: 'رفض الدعوى لعدم الإعذار ولعدم تنفيذ المدعية التزامها المقابل.',
      missing: '',
    }],
    precedentMatches: [{
      sourceMarker: 'م2',
      issueIndex: 0,
      treatment: 'analogous',
      factQuote: 'وامتنعت عن سداد الدفعة المقدمة الثابتة بمحضر المطابقة المؤرخ 2026-02-01 ولم توجه أي إعذار رسمي قبل إقامة الدعوى.',
      reason: 'يتحد الحكم المراجع مع النزاع الماثل في اشتراط الإعذار الرسمي وثبوت إخلال طالب الفسخ بالتزامه المقابل في عقد التوريد.',
      differences: 'اختلاف نوع البضاعة الموردة لا يغير شرط الإعذار ولا أثر الامتناع عن الدفعة المقدمة.',
    }],
    missingFacts: [],
    researchGaps: [],
  });

  const plan = reasoning.parseCasePlan(planRaw, caseInput, [statutorySource, cassationSource]);
  const enrichedEvidence = reasoning.applyCheckedJudgmentMatches([statutorySource, cassationSource], plan);
  assert.ok(enrichedEvidence[1].judgment.analogy);

  const rawContent = {
    facts: caseInput.facts,
    grounds: [
      '1- الدفع بعدم قبول طلب الفسخ لتخلف الإعذار وثبوت إخلال المدعية بالتزامها المقابل:',
      'تتمسك المدعى عليها بالقاعدة التشريعية المقررة في العقود الملزمة للجانبين 【م1】، وبما استقر عليه قضاء محكمة التمييز في العقود التجارية المماثلة حيث يشترط للقضاء بفسخ العقد الملزم للجانبين ثبوت إخلال المدين وتوجيه إعذار رسمي، وهو ما يتحد مع واقعة عقد التوريد الماثل 【م2】.',
      'وبتطبيق ذلك على الوقائع الثابتة بالأوراق يتبين أن المدعية وامتنعت عن سداد الدفعة المقدمة الثابتة بمحضر المطابقة المؤرخ 2026-02-01 ولم توجه أي إعذار رسمي قبل إقامة الدعوى، فلا يصح لها المطالبة بالفسخ.',
      'الرد على حجج الخصم',
      'قد تعترض المدعية بأن إقامة صحيفة الدعوى تقوم مقام الإعذار الرسمي في المطالبة بالفسخ.',
      'غير أن هذا الاعتراض مردود بأن الامتناع الثابت بمحضر المطابقة المؤرخ 2026-02-01 يسقط ادعاء التقصير وينفي شروط الفسخ والتعويض.',
    ].join('\n'),
    requests: caseInput.requests,
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  };

  const cleanedGrounds = statutory.preserveLegalQuotes(rawContent.grounds, prose => language.correctLegalProse(prose, [caseInput.clientName, caseInput.otherParty]));
  const prepared = bound.prepareBoundDraft({ ...rawContent, grounds: cleanedGrounds }, caseInput, enrichedEvidence);

  // Verify law name, law number, year, article number, and verbatim quote:
  assert.ok(prepared.grounds.includes('المادة 209 من القانون المدني الكويتي (نسخة اختبارية موثقة)، القانون رقم 67 لسنة 1980'));
  assert.ok(prepared.grounds.includes(`نص المادة: «${verbatimArticleText}»`));
  // Verify Cassation appeal number, year, chamber, and session date:
  assert.ok(prepared.grounds.includes('(محكمة التمييز، الدائرة التجارية الثانية؛ الطعن رقم 412 لسنة 2019؛ جلسة 11/05/2020)'));

  const gate = citations.reviewLegalCitations(`${prepared.grounds}\n${prepared.requests}`, enrichedEvidence, {
    courtDocument: true,
    requireArticleText: true,
    requireJudgmentAnalogy: true,
    eventDate: '2026-01-10',
    procedureDate: '2026-03-01',
  });
  assert.equal(gate.ok, true, `Expected zero citation issues, got: ${JSON.stringify(gate.issues)}`);

  // Verify Word (.docx) and PDF/HTML exports preserve exact statutory and Cassation texts:
  const doc = pleading.buildPleadingDocument(syntheticTemplateInfo, syntheticTemplateDef, 'memorandum', caseInput, prepared);
  const plainText = pleading.pleadingText(doc);
  const pdfHtml = pleading.renderPleadingHtml(doc);
  const legacyPdfHtml = pleading.renderArabicMemoHtml(plainText);
  const docxBytes = docx.exportPleadingDocx(doc);
  const wordXml = extractZipEntryText(docxBytes, 'word/document.xml');

  for (const [formatName, output] of [['text', plainText], ['pdfHtml', pdfHtml], ['legacyPdfHtml', legacyPdfHtml], ['wordXml', wordXml]]) {
    assert.ok(output.includes(verbatimArticleText), `${formatName} must preserve verbatim statutory article text`);
    assert.ok(output.includes('القانون رقم 67 لسنة 1980'), `${formatName} must preserve law number and year`);
    assert.ok(output.includes('المادة 209'), `${formatName} must preserve article number`);
    assert.ok(output.includes('الطعن رقم 412 لسنة 2019'), `${formatName} must preserve Cassation appeal number and year`);
    assert.ok(output.includes('جلسة 11/05/2020'), `${formatName} must preserve Cassation session date`);
    assert.doesNotMatch(output, /【م\d+】|\[م\d+\]|صفحة PDF/, `${formatName} must strip internal source markers`);
  }
});

test('2 & 3: system rejects wrong article numbers, distorted/paraphrased quotes, wrong law numbers, unverified law numbers, repealed provisions, and inapplicable editions', () => {
  const baseOptions = {
    courtDocument: true,
    requireArticleText: true,
    requireJudgmentAnalogy: true,
    eventDate: '2026-01-10',
    procedureDate: '2026-03-01',
  };

  // (a) Wrong article number (e.g., citing Article 210 instead of 209):
  const wrongArticleDraft = bound.prepareBoundDraft({
    facts: 'واقعة',
    requests: 'رفض الدعوى',
    grounds: 'تتمسك المدعى عليها بنص المادة 210 من القانون المدني الكويتي (نسخة اختبارية موثقة)، القانون رقم 67 لسنة 1980 【م1】',
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, { facts: 'واقعة', requests: 'رفض الدعوى' }, [statutorySource]);
  const wrongArticleRes = citations.reviewLegalCitations(wrongArticleDraft.grounds, [statutorySource], baseOptions);
  assert.equal(wrongArticleRes.ok, false);
  assert.ok(wrongArticleRes.issues.some(i => i.code === 'unverified_article'));

  // (b) Distorted / paraphrased statutory quote inside quotation marks:
  const paraphrasedQuote = 'إذا أخل المتعاقد بالتزامه في العقود جاز للطرف الآخر فسخ العقد فوراً مع التعويض.'; // Paraphrased!
  const distortedDraft = bound.prepareBoundDraft({
    facts: 'واقعة',
    requests: 'رفض الدعوى',
    grounds: `تنص المادة 209 على «${paraphrasedQuote}» 【م1】`,
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, { facts: 'واقعة', requests: 'رفض الدعوى' }, [statutorySource]);
  const distortedRes = citations.reviewLegalCitations(distortedDraft.grounds, [statutorySource], baseOptions);
  assert.equal(distortedRes.ok, false);
  assert.ok(distortedRes.issues.some(i => i.code === 'unverified_quote'));

  // (c) Direct tampering of inserted statutory quote after prepareBoundDraft:
  const validDraft = bound.prepareBoundDraft({
    facts: 'واقعة',
    requests: 'رفض الدعوى',
    grounds: 'تطبيق القاعدة التشريعية 【م1】',
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, { facts: 'واقعة', requests: 'رفض الدعوى' }, [statutorySource]);
  const tamperedQuoteGrounds = validDraft.grounds.replace('بعد إعذاره', 'دون حاجة إلى إعذاره');
  const tamperedRes = citations.reviewLegalCitations(tamperedQuoteGrounds, [statutorySource], baseOptions);
  assert.equal(tamperedRes.ok, false);
  assert.ok(tamperedRes.issues.some(i => i.code === 'missing_article_text' || i.code === 'unverified_quote'));

  // (d) Unverified law number/year in corpus (lawIdentity = null):
  const unverifiedLawSource = {
    ...statutorySource,
    lawNumber: null,
    lawYear: null,
    corpus: { ...statutorySource.corpus, lawIdentity: null },
  };
  const unverifiedLawDraft = bound.prepareBoundDraft({
    facts: 'واقعة',
    requests: 'رفض الدعوى',
    grounds: 'تطبيق القاعدة 【م1】',
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, { facts: 'واقعة', requests: 'رفض الدعوى' }, [unverifiedLawSource]);
  const unverifiedLawRes = citations.reviewLegalCitations(unverifiedLawDraft.grounds, [unverifiedLawSource], baseOptions);
  assert.equal(unverifiedLawRes.ok, false);
  assert.ok(unverifiedLawRes.issues.some(i => i.code === 'unverified_law'));

  // (e) Temporal applicability / effective-date mismatch (statute effective 2025-06-01 cited for 2023-04-15 event, or repealed):
  const futureAmendmentSource = {
    ...statutorySource,
    corpus: { ...statutorySource.corpus, effectiveFrom: '2025-06-01', effectiveTo: null },
  };
  const futureDraft = bound.prepareBoundDraft({
    facts: 'واقعة',
    requests: 'رفض الدعوى',
    grounds: 'تطبيق القاعدة 【م1】',
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, { facts: 'واقعة', requests: 'رفض الدعوى' }, [futureAmendmentSource]);
  const inapplicableRes = citations.reviewLegalCitations(futureDraft.grounds, [futureAmendmentSource], {
    ...baseOptions,
    eventDate: '2023-04-15',
    procedureDate: '2023-05-01',
  });
  assert.equal(inapplicableRes.ok, false);
  assert.ok(inapplicableRes.issues.some(i => i.code === 'inapplicable_edition'));

  const repealedSource = {
    ...statutorySource,
    corpus: { ...statutorySource.corpus, repealed: true, applicabilityStatus: 'repealed' },
  };
  const repealedRes = citations.reviewLegalCitations(validDraft.grounds, [repealedSource], baseOptions);
  assert.equal(repealedRes.ok, false);
  assert.ok(repealedRes.issues.some(i => i.code === 'repealed_article'));
});

test('5: missing statutory text or unverified applicability logs the gap and keeps the memo in review without fabricating authorities', () => {
  const planWithGap = {
    clientRole: 'مدعى عليه',
    opponentRole: 'مدعٍ',
    characterization: 'منازعة مدنية في مسألة لم يتوفر لها نص موثق السريان في المكتبة المربوطة',
    issues: [{
      issue: 'المنازعة الواقعية في عدم ثبوت استلام البضاعة محل الفاتورة',
      factQuote: 'خلت الفاتورة المؤرخة 2026-01-15 من أي توقيع بالاستلام من المدعى عليه.',
      document: 'صورة الفاتورة المؤرخة 2026-01-15',
      sourceMarkers: [],
      application: 'لما كانت الفاتورة المؤرخة 2026-01-15 قد خلت من توقيع المدعى عليه بالاستلام فلا تنهض دليلاً كافياً على التسليم.',
      counterargument: 'قد يحتج الخصم بكشوف حسابه الداخلية لإثبات التسليم.',
      response: 'يرد على ذلك بأن الدليل الصادر من الخصم لنفسه لا يقوم مقام سند الاستلام الموقع.',
      proposedRelief: 'رفض المطالبة لعدم ثبوت التسليم.',
      missing: 'تعذر توثيق نص تشريعي سارٍ خاص بهذا الفرع؛ أُبقيت المذكرة للمراجعة القانونية دون اختلاق مادة أو حكم.',
    }],
    precedentMatches: [],
    missingFacts: [],
    researchGaps: ['يلزم مراجعة السند التشريعي وسريانه من المحامي المختص قبل الاعتماد.'],
  };

  const contentWithoutFabrication = {
    facts: 'خلت الفاتورة المؤرخة 2026-01-15 من أي توقيع بالاستلام من المدعى عليه.',
    grounds: 'يتمسك المدعى عليه بعدم حجية الفاتورة المؤرخة 2026-01-15 لخلوها من أي توقيع بالاستلام. وقد يحتج الخصم بكشوفه الداخلية، غير أن اصطناع الدليل للنفس لا يثبت التسليم المتنازع عليه.',
    requests: 'رفض الدعوى لعدم الثبوت.',
    factualNotes: [],
    legalResearchNotes: 'لم يُدرج نص تشريعي أو حكم تمييز لعدم توثيق السريان؛ تحفظ المسودة للمراجعة.',
    fields: {},
  };

  const quality = reasoning.caseQualitySummary(planWithGap, null, contentWithoutFabrication, 0);
  assert.equal(quality.status, 'incomplete');
  assert.equal(quality.humanReviewRequired, true);
  assert.ok(quality.notices.some(n => n.includes('تعذر توثيق نص تشريعي سارٍ')));
  assert.ok(quality.notices.some(n => n.includes('يلزم مراجعة السند التشريعي')));
  assert.doesNotMatch(contentWithoutFabrication.grounds, /المادة\s+\d+|الطعن\s+رقم/);
});

test('6: strict per-memo isolation separates facts, attachments, conversation, defenses, and outputs across concurrent cases', () => {
  const caseAInput = {
    caseType: 'تجاري — مقاولة',
    court: 'المحكمة الكلية',
    courtCircuit: 'التجارية الأولى',
    caseNumber: '1111/2026',
    clientName: 'شركة الأبراج للمقاولات',
    partyRole: 'مدعية',
    otherParty: 'شركة المدار للتطوير',
    facts: 'أنجزت شركة الأبراج أعمال المرحلة الأولى بموجب شهادة الإنجاز رقم A-77 المؤرخة 2026-01-05 وامتنعت شركة المدار عن صرف المستخلص البالغ 48,000 د.ك.',
    requests: 'إلزام المدعى عليها بأداء مبلغ 48,000 د.ك قيمة المستخلص رقم A-77.',
  };

  const caseBInput = {
    caseType: 'إيجارات — إخلاء وأجرة',
    court: 'المحكمة الكلية',
    courtCircuit: 'إيجارات ثالثة',
    caseNumber: '2222/2026',
    clientName: 'خالد سعد المطيري',
    partyRole: 'مدعى عليه',
    otherParty: 'ورثة عبدالله الفهد',
    facts: 'سدد المستأجر خالد المطيري أجرة شهري يناير وفبراير 2026 بموجب إيصالي الإيداع رقم B-99 المؤرخين 2026-02-02 عن العين الكائنة في السالمية.',
    requests: 'رفض دعوى الإخلاء لبراءة الذمة بموجب إيصالي الإيداع رقم B-99.',
  };

  const contentA = bound.prepareBoundDraft({
    facts: caseAInput.facts,
    grounds: 'الدفع باستحقاق المستخلص رقم A-77 البالغ 48,000 د.ك بعد ثبوت الإنجاز 【م1】\nحافظة المستندات\n1- شهادة الإنجاز رقم A-77 المؤرخة 2026-01-05.',
    requests: caseAInput.requests,
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  }, caseAInput, [statutorySource]);

  const contentB = {
    facts: caseBInput.facts,
    grounds: 'الدفع ببراءة الذمة من الأجرة المطالب بها بموجب إيصالي الإيداع رقم B-99 عن عين السالمية.\nحافظة المستندات\n1- إيصالا الإيداع رقم B-99 المؤرخان 2026-02-02.',
    requests: caseBInput.requests,
    factualNotes: [],
    legalResearchNotes: '',
    fields: {},
  };

  const docA = pleading.buildPleadingDocument(syntheticTemplateInfo, syntheticTemplateDef, 'claim', caseAInput, contentA);
  const docB = pleading.buildPleadingDocument(syntheticTemplateInfo, syntheticTemplateDef, 'memorandum', caseBInput, contentB);

  const outA = pleading.pleadingText(docA);
  const outB = pleading.pleadingText(docB);

  assert.ok(outA.includes('شركة الأبراج للمقاولات') && outA.includes('A-77') && outA.includes('48,000'));
  assert.ok(!outA.includes('خالد سعد المطيري') && !outA.includes('B-99') && !outA.includes('السالمية'));

  assert.ok(outB.includes('خالد سعد المطيري') && outB.includes('B-99') && outB.includes('السالمية'));
  assert.ok(!outB.includes('شركة الأبراج للمقاولات') && !outB.includes('A-77') && !outB.includes('48,000'));
});

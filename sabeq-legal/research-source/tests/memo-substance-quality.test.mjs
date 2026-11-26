import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const quality=load('../lib/memo-substance-quality.ts');

const longFacts=Array.from({length:18},(_,i)=>`واقعة اختبارية رقم ${i+1}: ورد حدث مستقل في الملف الاصطناعي، ويحتاج أثره في المطالبة إلى تحليل منفصل يحفظ التسلسل ولا ينشئ إقراراً.`).join('\n');
const requests='رفض الجزء غير المثبت من المطالبة، واحتياطياً قصر أي أثر على المقدار الذي تثبته المستندات المقروءة.';
const input={facts:longFacts,requests};

test('a non-empty but very short response cannot pass as a formal memorandum for a long intake',()=>{
 const weak={facts:'ملخص قصير للوقائع.',grounds:'الدفع الأول: ننازع في المطالبة ونطلب رفضها.',requests};
 const result=quality.reviewMemoSubstance(input,weak,{issueCount:3,requireStatutoryText:true});
 assert.equal(result.ok,false);
 assert.ok(result.issues.some(i=>i.code==='facts_overcompressed'));
 assert.ok(result.issues.some(i=>i.code==='insufficient_defense_depth'));
 assert.ok(result.issues.some(i=>i.code==='insufficient_defense_structure'));
 assert.ok(result.issues.some(i=>i.code==='missing_verified_statutory_text'));
});

test('requests cannot outweigh the actual legal reasoning',()=>{
 const result=quality.reviewMemoSubstance({facts:'واقعة اختبارية محددة.',requests:'طلب اختباري مفصل '.repeat(40)},{facts:'واقعة اختبارية محددة.',grounds:'أولاً: دفع اختباري. تحليل موجز.',requests:'طلب اختباري مفصل '.repeat(40)},{issueCount:1});
 assert.equal(result.ok,false);assert.ok(result.issues.some(i=>i.code==='relief_outweighs_reasoning'));
});

test('structured issue-by-issue reasoning with a verified statutory block satisfies the quality floor without relying on page count',()=>{
 const sections=Array.from({length:3},(_,i)=>`${i+1}- الدفع الاختباري ${i+1}\nتطبيق الواقعة الاختبارية رقم ${i+1} على نطاق المطالبة يقتضي فصل الجزء الثابت عن الجزء المختلف عليه، وبيان أثر كل مستند مقروء في النتيجة دون افتراض واقعة جديدة.\nوقد يثار اعتراض اختباري بأن هذا الحدث لا يؤثر في الرصيد، وهو اعتراض يحتاج إلى مقابلة زمنه ومقداره بالطلب المعروض لا إلى تجاهله.\nوالرد أن المقارنة المنظمة بين الواقعة والطلب والمستند هي التي تحدد الأثر، مع إبقاء عبء الإثبات والنتيجة النهائية للمراجعة القضائية.`).join('\n');
 const grounds=sections+'\nنص المادة: «هذا نص تشريعي اصطناعي لا يمثل قانوناً حقيقياً، ويستخدم فقط لاختبار بوابة الجودة البرمجية.» 【م1】\n'+('تحليل قانوني وواقعي إضافي يربط كل واقعة بموضعها من الطلب ويحفظ الفروق بين أصل الحق ومقداره. '.repeat(30));
 const result=quality.reviewMemoSubstance(input,{facts:longFacts,grounds,requests},{issueCount:3,requireStatutoryText:true});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.metrics.expectedIssues,3);
});

test('five defense headings with one-page aggregate analysis cannot pass against five-page facts',()=>{
 const fivePageFacts=Array.from({length:70},(_,i)=>`واقعة اصطناعية مطولة رقم ${i+1}: يرد في سجل الاختبار حدث مستقل وتاريخ ومراسلة افتراضية، ويجب بحث أثره في المسألة المقابلة من دون إنشاء أي حقيقة أو سند قانوني.`).join('\n');
 const thinSections=Array.from({length:5},(_,i)=>`${i+1}- الدفع الاصطناعي ${i+1}\n${'تحليل مختصر يكرر النتيجة ولا يفصل الصلة بين الواقعة والاعتراض والرد. '.repeat(9)}`).join('\n');
 const grounds=thinSections+'\nنص المادة: «نص تشريعي اصطناعي لا يمثل قانوناً حقيقياً.» 【م1】';
 const result=quality.reviewMemoSubstance({facts:fivePageFacts,requests},{facts:fivePageFacts,grounds,requests},{issueCount:5,requireStatutoryText:true});
 assert.equal(result.ok,false,JSON.stringify(result));
 assert.ok(result.issues.some(i=>i.code==='insufficient_defense_depth'));
 assert.ok(result.issues.some(i=>i.code==='thin_individual_defenses'));
 assert.equal(result.metrics.thinDefenseSections,5);
});

test('long facts pass only when every expected defense contains distinct substantive analysis',()=>{
 const longInput=Array.from({length:48},(_,i)=>`واقعة اصطناعية رقم ${i+1}: تمثل حدثاً مستقلاً في ملف اختباري وتحتاج إلى وزن أثرها في الطلب والاعتراض والرد مع عدم اختلاق أي واقعة.`).join('\n');
 const robustSections=Array.from({length:5},(_,i)=>`${i+1}- الدفع الاصطناعي المستقل ${i+1}\n${`يرتبط هذا الدفع بالواقعة الاصطناعية رقم ${i+1} ويحلل أثرها في نطاق الطلب، ويفصل بين ما يثبته السجل الاختباري وما يبقى محل منازعة. وقد يثار اعتراض اصطناعي بأن الواقعة لا تغير النتيجة، إلا أن الرد يقتضي مقابلة التوقيت والمستند والطلب وبيان أثر كل عنصر على حدة، مع إبقاء عبء الإثبات والنتيجة للمراجعة القضائية. `.repeat(4)}`).join('\n');
 const grounds=robustSections+'\nنص المادة: «نص تشريعي اصطناعي لا يمثل قانوناً حقيقياً.» 【م1】';
 const result=quality.reviewMemoSubstance({facts:longInput,requests},{facts:longInput,grounds,requests},{issueCount:5,requireStatutoryText:true});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.metrics.thinDefenseSections,0);
 assert.equal(result.metrics.defenseSectionLengths.length,5);
});

test('long intakes require more than one duplicated issue and fact anchor in the checked plan',()=>{
 const reasoning=load('../lib/case-reasoning.ts');
 const base={facts:longFacts,requests,clientName:'طرف اصطناعي',otherParty:'خصم اصطناعي',partyRole:'مدعى عليه',caseType:'مدني',court:'محكمة اختبارية'};
 const issue={issue:'مسألة واحدة مكررة',factQuote:reasoning.caseFactQuotes(base)[0],document:'',sourceMarkers:[],application:'تطبيق تفصيلي على الواقعة الاختبارية دون افتراض.',counterargument:'قد يثار اعتراض اختباري على الصلة.',response:'يفحص الاعتراض في ضوء الواقعة والطلب دون اختلاق.',proposedRelief:requests,missing:''};
 const plan={clientRole:base.partyRole,opponentRole:'مدعٍ',characterization:'مطالبة اختبارية',issues:[issue],missingFacts:[],researchGaps:[],precedentMatches:[]};
 assert.throws(()=>reasoning.parseCasePlan(JSON.stringify(plan),base,[]),/insufficient issue coverage/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './template-harness.mjs';
const reviews=load('../lib/bound-article-reviews.ts'),reasoning=load('../lib/case-reasoning.ts');
test('a single payment dispute does not assert a multiple-debt research premise',()=>{
 const q=reasoning.caseResearchQueries({facts:'عينة اصطناعية: قرض واحد سدد بتحويلين.',requests:'رفض الدعوى',partyRole:'مدعى عليه',caseType:'مدني'}).join('\n');
 assert.doesNotMatch(q,/تعيين الدين عند الوفاء تعدد الديون/);
 const many=reasoning.caseResearchQueries({facts:'عينة اصطناعية: ديون متعددة لدائن واحد.',requests:'بحث تخصيص الوفاء',partyRole:'مدعى عليه',caseType:'مدني'}).join('\n');
 assert.match(many,/تعيين الدين عند الوفاء تعدد الديون/);
});
test('contract nonperformance and execution have their own substantive queries',()=>{
 const q=reasoning.caseResearchQueries({facts:'عينة اصطناعية: عقد لم ينفذ وأطلب فسخه ورد المدفوع.',requests:'الفسخ والتعويض',partyRole:'مدع',caseType:'تجاري'}).join('\n');
 assert.match(q,/العقود الملزمة للجانبين/);assert.match(q,/الضرر.*الخسارة/);
 const e=reasoning.caseResearchQueries({facts:'عينة اصطناعية: إعلان سند تنفيذي لشريك في شركة تضامن.',requests:'منازعة التنفيذ',partyRole:'منفذ ضده',caseType:'تنفيذ'}).join('\n');assert.match(e,/السند التنفيذي/);assert.match(e,/أموال الشريك الخاصة/);
});
test('reviewed excerpts are explicitly distinct from whole articles and retain image page traces',()=>{
 const raw={chunkId:99,lawNumber:88,lawYear:2001,text:'نص مشوه اصطناعي',corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',recordId:'synthetic',documentId:'synth',page:12,detectedArticleNumber:'7',textSha256:'a'.repeat(64)}};
 const r={...raw.corpus,chunkId:99,articleNumber:'7',lawNumber:88,lawYear:2001,title:'تشريع اصطناعي',originalTextSha256:'a'.repeat(64),textSha256:'b'.repeat(64),imageSha256:'c'.repeat(64),text:'مقتطف اصطناعي للبرمجيات فقط.',completeArticleVerified:false,excerptVerified:true,sourcePages:[{page:12,imageSha256:'c'.repeat(64),pageTextSha256:'d'.repeat(64)}]};
 const out=reviews.attachBoundArticleReview(raw,[r]);assert.equal(out.text,r.text);assert.equal(out.corpus.completeArticleVerified,false);assert.equal(out.corpus.reviewStatus,'visually_reviewed_excerpt');assert.deepEqual(out.corpus.sourcePages,r.sourcePages);
});

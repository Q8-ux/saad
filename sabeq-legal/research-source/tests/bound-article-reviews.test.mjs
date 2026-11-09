import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {load} from './template-harness.mjs';
const api=load('../lib/bound-article-reviews.ts'),draft=load('../lib/bound-draft.ts'),citations=load('../lib/legal-citation-review.ts');
const hash=s=>createHash('sha256').update(s).digest('hex');
const raw='املادة مخسة عىل نص اصطناعي مشوه للاختبار فقط.';
const text='نص اصطناعي كامل لا يمثل قانوناً حقيقياً؛ يستعمل للتحقق من تطابق الاقتباس وحده.';
const source={chunkId:777,documentId:77,title:'قانون اصطناعي',lawNumber:98765,lawYear:2000,text:raw,sourceUrl:'',corpus:{scope:'bound_file_only',sourceId:'user-legislation-source',sourceSha256:'8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd',recordId:'synthetic-article',documentId:'synthetic-section',page:7,articleNumber:'5',detectedArticleNumber:'5',textSha256:hash(raw),articleIdentityUnique:false,completeArticleVerified:false,lawIdentity:{number:98765,year:2000},currentLawVerified:false}};
const review={sourceSha256:source.corpus.sourceSha256,sourceId:source.corpus.sourceId,recordId:'synthetic-article',documentId:'synthetic-section',chunkId:777,page:7,articleNumber:'5',lawNumber:98765,lawYear:2000,title:'قانون اصطناعي',originalTextSha256:hash(raw),textSha256:hash(text),imageSha256:'a'.repeat(64),text,completeArticleVerified:true};
test('a reviewed occurrence replaces only its damaged extraction and server inserts its full literal text',async()=>{
 await api.checkBoundArticleReviewIntegrity([review]);
 const result=api.attachBoundArticleReview(source,[review]);assert.equal(source.text,raw);assert.equal(result.text,text);assert.equal(result.corpus.originalTextSha256,hash(raw));assert.equal(result.corpus.completeArticleVerified,true);assert.equal(result.corpus.currentLawVerified,false);
 const content=draft.prepareBoundDraft({facts:'واقعة اصطناعية',grounds:'يطبق النص على واقعة الاختبار 【م1】',requests:'طلب اصطناعي',fields:{},factualNotes:[],legalResearchNotes:''},{facts:'واقعة اصطناعية',requests:'طلب اصطناعي'},[result]);
 assert.ok(content.grounds.includes('نص المادة: «'+text+'»'));assert.equal(citations.reviewLegalCitations(content.grounds,[result],{courtDocument:true,requireArticleText:true}).ok,true);
});
test('changed source, occurrence, page, law, article or original hash cannot inherit text approval',()=>{
 for(const change of [{sourceSha256:'b'.repeat(64)},{sourceId:'other'},{recordId:'other'},{documentId:'other'},{chunkId:778},{page:8},{articleNumber:'6'},{lawNumber:98766},{lawYear:2001},{originalTextSha256:'c'.repeat(64)},{completeArticleVerified:false},{imageSha256:''}])assert.equal(api.attachBoundArticleReview(source,[{...review,...change}]),source);
});
test('altered transcription bytes fail integrity; text reviews never imply corpus or legal currency approval',async()=>{
 await assert.rejects(api.checkBoundArticleReviewIntegrity([{...review,text:text+' تغيير'}]),/integrity/);
 const s=api.boundArticleTextReviewSummary();assert.equal(s.reviewedArticleCount,24);assert.equal(s.wholeCorpusReviewed,false);assert.equal(s.currentLawVerified,false);assert.equal(s.humanLegalApproval,false);
});

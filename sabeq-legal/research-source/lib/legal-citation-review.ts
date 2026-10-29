import type { LegalEvidence } from "./legal-search";
import {hasReviewedJudgment,matchesReviewedAppeal,matchesReviewedSession} from './judgment-evidence';
const digits=(s:string)=>s.normalize("NFKC").replace(/[٠-٩۰-۹]/g,c=>String("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹".indexOf(c)%10));
const boundArticle=(s:LegalEvidence,number:string)=>s.corpus?.scope==="bound_file_only"&&s.corpus?.sourceId==="user-legislation-source"&&s.corpus?.sourceSha256==="8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd"&&s.corpus.articleIdentityUnique&&articleKey(s.corpus.articleNumber||"")===number;
const boundLaw=(s:LegalEvidence,n:number,y:number)=>s.corpus?.scope==="bound_file_only"&&s.corpus.sourceSha256==="8ffeac9838d7101a6776ca689b06ad08401d69850c27969b3b9959a1c40660bd"&&s.corpus.lawIdentity?.number===n&&s.corpus.lawIdentity?.year===y;
const titleKey=(s:string)=>s.replace(/اال/g,"الا").replace(/امل/g,"الم");
const sectionMatches=(claim:string,s:LegalEvidence)=>{if(!/(?:القانون|قانون)/u.test(claim)||/(?:القانون|قانون)\s*(?:رقم|[\d٠-٩])/u.test(claim))return true;const terms=titleKey(normal(s.title)).split(" ").filter(t=>t.length>2&&!["قانون","القانون","القطاع"].includes(t));return terms.length>0&&terms.every(t=>titleKey(normal(claim)).includes(t));};
const normal=(s:string)=>digits(s).replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/[\u064b-\u065f\u0670]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const articleKey=(s:string)=>normal(s).replace(/^\d+/,n=>String(Number(n))).replace(/مكرر(?:ة|ا)?(?=\s|$)/gu,"مكرر");
const law=/(?:القانون|قانون|المرسوم\s+بقانون)\s*(?:(?:[\p{L}]+\s+){0,7}رقم\s*)?[（(]?([\d٠-٩۰-۹]+)[）)]?\s*(?:لسنة|لسنه|لعام|\/|of)\s*([\d٠-٩۰-۹]{4})/gu;
const articleNumber=String.raw`[（(]?\s*[\d٠-٩۰-۹]+\s*[）)]?(?:\s*مكرر(?:ة|ا)?(?:\s*[（(]?\s*[أإآابتثجحخدذرزسشصضطظعغفقكلمنهوي][）)]?(?![\p{L}]))?)?`;
const article=new RegExp(String.raw`(?:المادة|الماده|مادة|ماده|المادتين|المادتان|المواد|article|section|دفعہ)\s*(?:رقم\s*)?(${articleNumber}(?:\s*[,،و]\s*${articleNumber})*)`,"giu");
const ordinal=/(?:المادة|مادة)\s+(الأولى|الاولى|أولى|اولى|الثانية|ثانية)(?![\p{L}])/gu;
const statutoryQuote=/(?:تنص|نصت)\s+(?:المادة|الماده)\s+[^«“"\n]{0,350}?(?:على|بأن|بأنه|بانه)\s*[:：]?\s*[«“"]([^»”"\n]+)[»”"]/gu;
const judgment=/(?:الطعن|طعن|حكم|judgment|appeal)\s*(?:رقم|no\.?|number)?\s*[（(]?([\d٠-٩۰-۹]+)(?:\s*(?:[/،]|لسنة|لسنه)\s*([\d٠-٩۰-۹]+))?/giu;
export const memoControlRevision="memo-generation-control-1";
export type CitationIssue={code:"unknown_source"|"missing_source"|"unverified_article"|"wrong_law"|"unverified_quote"|"unverified_judgment"|"judgment_not_analogous"|"wrong_judgment_date"|"repealed_article"|"research_reference_in_pleading";marker?:string};
/** Each claim is paired with its own adjacent source markers. No cross-law
 * matching of numbers, trust in case text, or reliance on OCR quality. */
export function reviewLegalCitations(text:string,evidence:LegalEvidence[],options:{requireJudgmentAnalogy?:boolean;courtDocument?:boolean}={}) {
 const issues:CitationIssue[]=[];const sources=new Map(evidence.map((s,i)=>[`م${i+1}`,s]));
 for(const paragraph of text.split(/\n+/).filter(Boolean)) {
  if(options.courtDocument&&(/^\s*(?:[-#*]+\s*)?(?:المرجع|المصدر|الحاشية|الهامش|المراجع(?: القانونية)?|المصادر(?: القانونية)?)\s*[:：]/u.test(paragraph)||/^\s*(?:قائمة\s+)?(?:المراجع|المصادر)(?:\s+القانونية)?\s*$/u.test(paragraph)||/(?:المصدر|المرجع)\s*[:：]\s*(?:منشورات\s+)?(?:وزارة\s+العدل|موقع\s+وزارة|بوابة\s+وزارة|https?:\/\/)|(?:راجع|انظر)\s+(?:موقع|بوابة|منشورات)\s+وزارة\s+العدل|صفح(?:ة|ات)\s+PDF\s*[\d٠-٩۰-۹]/iu.test(paragraph)))issues.push({code:'research_reference_in_pleading'});
  const pieces=paragraph.split(/((?:[【\[]\s*م\d+\s*[】\]]\s*)+)/g);
  for(let i=0;i<pieces.length;i+=2) {
   const claim=pieces[i],ids=[...(pieces[i+1]||"").matchAll(/م\d+/g)].map(m=>m[0]);
   for(const id of ids)if(!sources.has(id))issues.push({code:"unknown_source",marker:id});
   const selected=ids.flatMap(id=>sources.has(id)?[sources.get(id)!]:[]);
   if(options.courtDocument&&selected.some(s=>s.corpus?.draftingEligible===false))issues.push({code:'unverified_article'});
   const laws=[...claim.matchAll(law)],articles=[...claim.matchAll(article)].flatMap(m=>[...m[1].matchAll(new RegExp(articleNumber,"gu"))].map(n=>({number:articleKey(n[0]),start:m.index!,end:m.index!+m[0].length})));
   articles.push(...[...claim.matchAll(ordinal)].map(m=>({number:/ولى/.test(m[1])?"1":"2",start:m.index!,end:m.index!+m[0].length})));
   articles.sort((a,b)=>a.start-b.start);
   const judgments=[...claim.matchAll(judgment)];
   if(options.requireJudgmentAnalogy&&selected.some(s=>hasReviewedJudgment(s)&&!s.judgment?.analogy))issues.push({code:'judgment_not_analogous'});
   const attributedCassation=/(?:استقر|قضت|قضى|قضاء|قررت|أرست|ارست|حكم|مبادئ|مبادي|أحكام|احكام)[^\n]{0,45}(?:التمييز|التمييز)|التمييز[^\n]{0,25}(?:قضت|قررت|قضى)/u.test(claim);
   if(!laws.length&&!articles.length&&!judgments.length&&!attributedCassation)continue;
   if(!selected.length){issues.push({code:"missing_source"});continue;}
   // A literal statutory quotation may refer to other provisions (e.g. a
   // repeal). This exception applies only to the exact reviewed text, never a
   // generated explanation that merely contains the same numbers.
   if(selected.some(s=>(s.verification?.status==="source_verified"||s.corpus?.scope==="bound_file_only")&&normal(claim)===normal(s.text)))continue;
   for(const m of laws) {
    const n=Number(digits(m[1])),y=Number(digits(m[2]));
    if(!selected.some(s=>(boundLaw(s,n,y)&&sectionMatches(claim,s))||(s.verification?.status==="source_verified"&&((s.lawNumber===n&&s.lawYear===y)||(s.verification.sourceLawNumber===n&&s.verification.sourceLawYear===y)))))issues.push({code:"wrong_law"});
   }
   const checkedArticles=articles.map(ref=>{
    const {number}=ref;
    const owned=selected.filter(s=>(s.verification?.status==="source_verified"&&articleKey(s.verification.articleNumber)===number)||(boundArticle(s,number)&&sectionMatches(claim,s)));
    if(!owned.length)issues.push({code:"unverified_article"});
    const next=articles.find(a=>a.start>ref.start)?.start??claim.length;
    const before=laws.filter(m=>m.index!<ref.start).at(-1);
    const after=laws.find(m=>m.index!>=ref.end&&m.index!<next);
    // "من القانون" binds forward; a later independent law must not steal a
    // law-before-article citation's ownership.
    const linked=after&&(!before||/(?:^|[^\p{L}])(?:من|في|بموجب)(?:[^\p{L}]|$)/u.test(claim.slice(ref.end,after.index)))?after:before;
    const matching=linked?owned.filter(s=>(s.lawNumber===Number(digits(linked[1]))&&s.lawYear===Number(digits(linked[2])))||boundLaw(s,Number(digits(linked[1])),Number(digits(linked[2])))):owned;
    if(linked&&!matching.length)issues.push({code:"wrong_law"});
    if(selected.some(s=>!s.corpus&&s.lawNumber===16&&s.lawYear===1960)&&["153","159","182"].includes(number))issues.push({code:"repealed_article"});
    return {...ref,sources:matching};
   });
   for(const quote of claim.matchAll(statutoryQuote)){
    const ref=checkedArticles.find(a=>a.start>=quote.index!&&a.start<quote.index!+quote[0].indexOf(quote[1]));
    if(!ref?.sources.some(s=>normal(s.text).includes(normal(quote[1]))))issues.push({code:"unverified_quote"});
   }
   if(attributedCassation&&!selected.some(hasReviewedJudgment))issues.push({code:"unverified_judgment"});
   for(let k=0;k<judgments.length;k++){const m=judgments[k],matching=selected.filter(s=>matchesReviewedAppeal(s,m[1],m[2]));if(!matching.length)issues.push({code:"unverified_judgment"});if(options.requireJudgmentAnalogy&&matching.length&&!matching.some(s=>s.judgment?.analogy))issues.push({code:'judgment_not_analogous'});for(const date of claim.slice(m.index,judgments[k+1]?.index??claim.length).matchAll(/جلسة\s*(?:بتاريخ\s*)?([\d٠-٩۰-۹]{1,4}[/-][\d٠-٩۰-۹]{1,2}[/-][\d٠-٩۰-۹]{1,4})/gu))if(!matching.some(s=>matchesReviewedSession(s,date[1])))issues.push({code:'wrong_judgment_date'});}
   if((attributedCassation||judgments.length)&&options.requireJudgmentAnalogy&&!selected.some(s=>hasReviewedJudgment(s)&&Boolean(s.judgment?.analogy)))issues.push({code:'judgment_not_analogous'});
   if(attributedCassation||judgments.length)for(const m of claim.matchAll(/جلسة\s*(?:بتاريخ\s*)?([\d٠-٩۰-۹]{1,4}[/-][\d٠-٩۰-۹]{1,2}[/-][\d٠-٩۰-۹]{1,4})/gu))if(!selected.some(s=>matchesReviewedSession(s,m[1])))issues.push({code:'wrong_judgment_date'});
  }
 }
 return {ok:issues.length===0,issues};
}
export const citationFailureMessage="لم تجتز الصياغة التحقق من أرقام القوانين والمواد ومصادرها. احتُفظ ببياناتك؛ البحث والمراجعة القانونية من مسؤولية المجموعة، ويمكن إعادة المحاولة دون إضافة نصوص قانونية منك.";

import type {LegalEvidence} from './legal-search';
export type JudgmentReference={scope:'uploaded_judgments_only';recordId:string;sourceKind:'judicial_digest';sourceBook:string;sourceSha256:string;pdfPage:number;printedPage:number;appealNumber:number;appealYear:number;decisionDate:string;chamber:string;court:'محكمة التمييز';quote:string;quoteSha256:string;reviewStatus:'source_page_matched';reviewedAt:string;currentAuthorityVerified:false;analogy?:{issue:string;factQuote:string;reason:string;differences:string}};
const digits=(s:string)=>s.normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(c)%10));
export function hasReviewedJudgment(source:Pick<LegalEvidence,'text'|'judgment'>):boolean{
 const j=source.judgment;
 if(!j||j.scope!=='uploaded_judgments_only'||j.sourceKind!=='judicial_digest'||j.reviewStatus!=='source_page_matched'||j.court!=='محكمة التمييز'||j.currentAuthorityVerified!==false)return false;
 if(!Number.isSafeInteger(j.appealNumber)||j.appealNumber<1||!Number.isInteger(j.appealYear)||j.appealYear<1900||!Number.isInteger(j.pdfPage)||j.pdfPage<1||!j.chamber||!j.recordId||!j.sourceBook)return false;
 const date=new Date(j.decisionDate+'T00:00:00Z');
 return /^[a-f0-9]{64}$/.test(j.sourceSha256)&&/^[a-f0-9]{64}$/.test(j.quoteSha256)&&/^\d{4}-\d{2}-\d{2}$/.test(j.decisionDate)&&Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===j.decisionDate&&date.getUTCFullYear()>=j.appealYear&&j.decisionDate<=j.reviewedAt&&source.text===j.quote&&j.quote.trim().length>=40;
}
export function matchesReviewedAppeal(source:LegalEvidence,number:string,year?:string){return hasReviewedJudgment(source)&&year!==undefined&&source.judgment!.appealNumber===Number(digits(number))&&source.judgment!.appealYear===Number(digits(year));}
export function matchesReviewedSession(source:LegalEvidence,value:string){
 if(!hasReviewedJudgment(source))return false;
 const parts=digits(value).split(/[/-]/).map(Number);if(parts.length!==3)return false;
 const [year,month,day]=parts[0]>=1900?parts:[parts[2],parts[1],parts[0]];
 return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`===source.judgment!.decisionDate;
}
export function judgmentContext(source:LegalEvidence){
 if(!hasReviewedJudgment(source))return '';
 const j=source.judgment!;
 return `مبدأ من تجميع قضائي مرفوع، وليس الحكم الكامل. الطعن رقم ${j.appealNumber} لسنة ${j.appealYear}؛ جلسة ${j.decisionDate}؛ الدائرة ${j.chamber}؛ صفحة PDF ${j.pdfPage}، المطبوعة ${j.printedPage}. مطابقة بصرية للصفحة: ${j.reviewedAt}. سريان المبدأ والأحكام اللاحقة لم يتحققا خارجياً. مجرد تشابه الألفاظ لا يثبت الانطباق.\n${j.analogy?`وجه الصلة الذي راجعته خطة القضية: ${j.analogy.reason}. الفروق: ${j.analogy.differences}.\n`:''}`;
}

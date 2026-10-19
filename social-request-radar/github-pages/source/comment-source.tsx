import {ArrowUpRight} from 'lucide-react';
import {commentSource,sourcePlatform} from '../../lib/comment-sources.mjs';

export default function CommentSource({record}:{record:any}){
  let source;try{source=commentSource(record);}catch{
    if(!sourcePlatform(record))try{const u=new URL(record.sourceUrl);if(u.protocol==='https:'&&!u.username&&!u.password)return <span className="comment-source"><a className="source-link" href={u.href} target="_blank" rel="noopener noreferrer">المصدر الأصلي<ArrowUpRight size={16} aria-hidden="true"/></a></span>;}catch{}
    return <small className="comment-source-missing">رابط المصدر غير متاح</small>;
  }
  const direct=source.sourceKind==='comment',post=record.kind==='post';
  const label=direct?(record.kind==='reply'?'المصدر · الرد الأصلي':'المصدر · التعليق الأصلي'):post?'المصدر · المنشور الأصلي':'المصدر · المنشور فقط';
  const description=source.sourceStatus==='constructed'?'رابط مبني من معرّف التعليق؛ قد تطلب المنصة تسجيل الدخول.':direct?'يفتح رابط التعليق الذي وفره المصدر.':post?'يفتح المنشور الأصلي.':'لم يتوفر رابط مباشر لهذا التعليق.';
  return <span className="comment-source"><a className="source-link" href={source.sourceUrl} target="_blank" rel="noopener noreferrer" title={description} aria-label={label+' — '+description}>{label}<ArrowUpRight size={16} aria-hidden="true"/></a>{!direct&&!post&&<small>{description}</small>}</span>;
}

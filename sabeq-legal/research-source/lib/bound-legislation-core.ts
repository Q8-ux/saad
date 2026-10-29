/** File-only retrieval. No network, database of private cases, or model calls. */
export type BoundCorpus = {
 metadata:{revision:string;scope:string;sourceId:string;sourceSha256:string;databaseSha256:string;editionClaim:string;importedAt:string;currentLawVerified:boolean;completeArticlesVerified:boolean;judgmentRecords:number};
 documents:Array<{id:string;title:string;start:number;end:number;kind:string;reportedNumber:string|null;reportedYear:string|null}>;
 pages:Array<{page:number;printed:string|null;document:string|null;text:string;sha:string;role?:string}>;
 fragments:Array<{id:number;record:string;document:string;number:string;page:number;offset:number;length:number;sha:string;text?:string}>;
 ocr:Array<{page:number;text:string;status:string;confidence:number}>;
};
export const boundNormalize=(s:string)=>s.normalize('NFKC').replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(c)%10)).replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u0610-\u061a\u064b-\u065f\u0670ـ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const stop=new Set('في من علي الي عن ما هو هي انا ان اريد لدي عندي هل لم لا بعد قبل الكويت بالكويت قضيه دعوي قانون الماده ماده رقم لسنه the and for with'.split(' '));
const aliases:Record<string,string[]>={عمالي:['العمل','العامل'],عماليه:['العمل','العامل'],عمال:['العمل','العامل'],labor:['العمل','العامل'],employment:['العمل','العامل'],rent:['ايجار'],lease:['ايجار'],ايجارات:['ايجار'],مدني:['المدني'],civil:['المدني'],جزائي:['الجزاء'],criminal:['الجزاء'],family:['الاحوال','الشخصيه'],تجاري:['التجاره'],company:['الشركات'],commercial:['التجاره'],procedure:['المرافعات'],evidence:['الاثبات'],appeal:['استئناف'],cassation:['تمييز'],مكافاه:['مكافاه','مكافاة','مكافأة']};
export function boundTokens(q:string){return [...new Set(boundNormalize(q).split(' ').filter(t=>t.length>=2&&!stop.has(t)).flatMap(t=>[t,...(aliases[t]||[])]).map(boundNormalize))].slice(0,18);}
function glyphVariants(token:string){const swaps:Record<string,string>={"لا":"ال","لم":"مل","لى":"ىل","لي":"يل","في":"يف","ني":"ين","ري":"ير","شر":"رش","نه":"هن","لخ":"خل"};return token.length<4?[token]:[...new Set([token,...Object.entries(swaps).filter(([a])=>token.includes(a)).map(([a,b])=>token.replaceAll(a,b))])];}
export function makeBoundIndex(data:BoundCorpus){
 const documents=new Map(data.documents.map((d,i)=>[d.id,{...d,index:i+1,titleKey:boundNormalize(d.title)}]));
 const pages=new Map(data.pages.map(p=>[p.page,p]));
 const fragments=new Map(data.fragments.map(f=>[f.id,f]));
 const byPage=new Map<number,typeof data.fragments>();const counts=new Map<string,number>();
 for(const f of data.fragments){const key=f.document+':'+boundNormalize(f.number);counts.set(key,(counts.get(key)||0)+1);byPage.set(f.page,[...(byPage.get(f.page)||[]),f]);}
 const ocr=new Map(data.ocr.map(o=>[o.page,o]));
 const normalized=data.pages.map(p=>boundNormalize(p.text+' '+(ocr.get(p.page)?.text||'')));
 const fragmentText=(f:typeof data.fragments[number])=>f.text??pages.get(f.page)!.text.slice(f.offset,f.offset+f.length);
 function resolve(f:typeof data.fragments[number]|undefined,p:typeof data.pages[number],query=''){
  const d=documents.get(f?.document||p.document||'');if(!d)return null;
  const raw=f?fragmentText(f):p.text;let text=raw;let continuationPage:number|null=null;
  if(f&&f===(byPage.get(p.page)||[]).at(-1)&&p.page<d.end){
    const next=pages.get(p.page+1),first=(byPage.get(p.page+1)||[])[0];
    if(next&&next.document===p.document&&first&&first.offset>0){
      const prefix=next.text.slice(0,first.offset),lines=prefix.split('\n');const nonempty=lines.map((line,i)=>line.trim()?i:-1).filter(i=>i>=0);
      const start=boundNormalize(lines[nonempty[0]]||'')===boundNormalize(d.title)&&nonempty.length>1?nonempty[1]+1:0;
      const continuation=lines.slice(start).join('\n').trim();
      if(continuation.length>100){continuationPage=next.page;text=raw+`\n[استمرار موضع المادة؛ صفحة PDF ${next.page}؛ الحدود تحتاج مراجعة]\n`+continuation;}
    }
  }
  if(text.length>2400){const ts=boundTokens(query);const words=text.split(/\n/);let best=0,score=-1,pos=0;for(const line of words){const n=boundNormalize(line);const v=ts.reduce((a,t)=>a+Number(n.includes(t)),0);if(v>score){best=pos;score=v;}pos+=line.length+1;}text=text.slice(Math.max(0,best-160),Math.max(0,best-160)+2400);}
  const unique=Boolean(f&&counts.get(f.document+':'+boundNormalize(f.number))===1);
  const headerLines=p.text.split('\n').filter(line=>line.trim()).slice(0,2),header=headerLines.join('\n'),identity=boundNormalize(header).match(/(?:القانون|قانون)\s*(?:رقم\s*)?(\d{1,4})\s*لسنه\s*(\d{4})/u);
  const identityMatched=Boolean(boundNormalize(headerLines[0]||'')===boundNormalize(d.title)&&identity&&Number(identity[1])===Number(d.reportedNumber)&&Number(identity[2])===Number(d.reportedYear));
  const lawIdentity=identityMatched?{number:Number(identity![1]),year:Number(identity![2]),header,reviewStatus:'extracted_header_matches_section_metadata'}:null;
  return {chunkId:f?.id??2000000000+p.page,documentId:1000000+d.index,title:d.title,category:'مسار التشريعات — ملف المستخدم',lawNumber:lawIdentity?.number??null,lawYear:lawIdentity?.year??null,reference:`${f?'موضع المادة '+f.number+'؛ ':''}صفحة PDF ${p.page}${continuationPage?"–"+continuationPage:""}${p.printed?'؛ المطبوعة '+p.printed:''}`,text,sourceUrl:`https://q8-ux.github.io/saad/sabeq-legal/source.html?page=${p.page}`,officialSource:'ملف التشريعات المرفوع من المستخدم؛ غير متحقق من سريانه خارجياً',sourceType:'user_document',documentType:'تشريع مستخرج من ملف',qualityScore:0,libraryUpdatedAt:data.metadata.importedAt,
   corpus:{scope:'bound_file_only',sourceId:data.metadata.sourceId,sourceSha256:data.metadata.sourceSha256,databaseSha256:data.metadata.databaseSha256,recordId:f?.record||`page-${p.page}`,continuationPage,hashScope:'first_page_fragment',textBoundary:continuationPage?'fragment_with_candidate_continuation':'page_fragment',textSha256:f?.sha||p.sha,page:p.page,printedPage:p.printed,documentId:d.id,documentTitle:d.title,articleNumber:f&&unique?boundNormalize(f.number):null,detectedArticleNumber:f?.number||null,articleIdentityUnique:unique,completeArticleVerified:false,currentLawVerified:false,reviewStatus:'needs_review',editionClaim:data.metadata.editionClaim,lawIdentity,context:{previousPage:p.page>d.start?p.page-1:null,nextPage:p.page<d.end?p.page+1:null},previousText:p.page>d.start?pages.get(p.page-1)?.text.slice(-850)||'':'',nextText:p.page<d.end?pages.get(p.page+1)?.text.slice(0,850)||'':'',ocr:ocr.get(p.page)?{text:ocr.get(p.page)!.text.slice(0,1800),status:'needs_review'}:null}};
 }
 function search(query:string,limit=8,filters:{documentId?:string;articleNumber?:string}={}){
  const ts=boundTokens(query),variants=new Map(ts.map(t=>[t,glyphVariants(t)])),matches=(text:string,t:string)=>(variants.get(t)||[t]).some(v=>text.includes(v)),article=filters.articleNumber||query.match(/(?:المادة|املادة|مادة|ماده|article)\s*[（(]?([\d٠-٩۰-۹]+(?:\s*مكرر)?)/iu)?.[1];
  const docFilter=filters.documentId;const titleTokens=ts.filter(t=>!/^[\d]+$/.test(t));
  const rankedDocs=data.documents.map(d=>({id:d.id,score:titleTokens.reduce((a,t)=>a+Number(boundNormalize(d.title).includes(t)),0)})).sort((a,b)=>b.score-a.score);
  const bestDoc=rankedDocs[0];const exactDoc=docFilter||(article&&bestDoc?.score>=Math.min(2,titleTokens.length)&&bestDoc.score>0&&rankedDocs[1]?.score<bestDoc.score?bestDoc.id:undefined);
  if(article){return data.fragments.filter(f=>(!exactDoc||f.document===exactDoc)&&boundNormalize(f.number)===boundNormalize(article)).slice(0,Math.max(1,Math.min(limit,12))).map(f=>resolve(f,pages.get(f.page)!,query)).filter(Boolean);}
  if(!ts.length)return [];
  const frequency=(text:string,t:string)=>Math.max(...(variants.get(t)||[t]).map(v=>Math.min(4,text.split(v).length-1)));
  const weights=new Map(ts.map(t=>[t,Math.log(1+data.pages.length/(1+normalized.filter(n=>matches(n,t)).length))]));
  const scoreText=(text:string)=>ts.reduce((n,t)=>n+(weights.get(t)||1)*Math.log(1+frequency(text,t)),0);
  const scored=data.pages.map((p,i)=>{const d=documents.get(p.document||'');const hits=ts.reduce((n,t)=>n+Number(matches(normalized[i],t)),0);const title=ts.reduce((n,t)=>n+Number(Boolean(d?.titleKey.includes(t))),0);return {p,score:scoreText(normalized[i])+title*1.5,hits};}).filter(x=>x.hits>0&&['body','annex'].includes(x.p.role||'body')&&(!docFilter||x.p.document===docFilter)).sort((a,b)=>b.score-a.score||a.p.page-b.p.page);

  const results=[];const perDoc=new Map<string,number>();
  for(const {p}of scored){if((perDoc.get(p.document||'')||0)>=2)continue;const fs=byPage.get(p.page)||[];const ranked=fs.map(f=>({f,score:scoreText(boundNormalize(fragmentText(f)))})).sort((a,b)=>b.score-a.score);const chosen=ranked[0]?.score?ranked[0].f:undefined;const item=resolve(chosen,p,query);if(item){Object.assign(item.corpus,{searchMatchMode:"normalized_with_pdf_glyph_variants",searchVariants:Object.fromEntries(variants)});results.push(item);perDoc.set(p.document||'',(perDoc.get(p.document||'')||0)+1);
    // A page may open with a continuation of the last article on the previous
    // page. Return its own source record too; context cannot lend it the next
    // article's number. This is a continuation candidate, never full approval.
    const previous=byPage.get(p.page-1)?.at(-1);
    if(chosen&&chosen===fs[0]&&previous?.document===p.document&&p.text.slice(0,chosen.offset).split('\n').slice(3).join('\n').trim().length>100&&results.length<limit&&(perDoc.get(p.document||'')||0)<2){const prior=resolve(previous,pages.get(previous.page)!,query);if(prior){results.push(prior);perDoc.set(p.document||'',2);}}
}if(results.length>=Math.max(1,Math.min(limit,12)))break;}
  return results;
 }
 function read(ids:number[]){return [...new Set(ids)].slice(0,6).flatMap(id=>{const f=fragments.get(id),p=pages.get(f?.page??id-2000000000);const item=p&&(f||id===2000000000+p.page)?resolve(f,p):null;return item?[item]:[];});}
 function page(number:number){const p=pages.get(number);if(!p)return null;const d=documents.get(p.document||'');return {...p,title:d?.title||'صفحة من الملف',scope:'bound_file_only',sourceSha256:data.metadata.sourceSha256,currentLawVerified:false,completeArticleVerified:false,reviewStatus:'needs_review',ocr:ocr.get(number)||null,previousPage:d&&number>d.start?number-1:null,nextPage:d&&number<d.end?number+1:null,articleLocations:(byPage.get(number)||[]).map(f=>({number:f.number,recordId:f.record,unique:counts.get(f.document+':'+boundNormalize(f.number))===1}))};}
 return {search,read,page,documents:data.documents,metadata:{...data.metadata,pages:data.pages.length,sections:data.documents.length,articleFragments:data.fragments.length,ocrPages:data.ocr.length,notice:'البحث داخل الملف فقط. أرقام المواد مواضع مستخرجة تحتاج مراجعة؛ لا يثبت الاستخراج سريان النص أو اكتماله. لا توجد سجلات أحكام تمييز مستقلة مستخرجة؛ ذكر المحكمة داخل قانون ليس حكماً.'}};
}

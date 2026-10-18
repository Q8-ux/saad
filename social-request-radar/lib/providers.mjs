import {countryName,normalizeRecord,validateSourceUrl} from './radar-core.mjs';
const ROOT='https://api.scrapecreators.com';
export class ProviderError extends Error {constructor(code,message){super(message);this.code=code;}}
function array(value,label){if(!Array.isArray(value))throw new ProviderError('SCHEMA_CHANGED','تغيّرت صيغة '+label+' لدى مزود البيانات.');return value;}
export async function gather(spec,key,fetcher=fetch) {
  key=String(key||'').trim();
  if(!key)throw new ProviderError('SETUP_REQUIRED','اربط مزود البيانات للبحث المباشر. الاستيراد والبحث داخل الملفات متاحان.');
  let calls=0,credits=0,remaining=null;const records=[],sources=[];
  async function get(path,params={},estimated=1){
    if(calls>=spec.maxRequests||credits+estimated>spec.maxCredits)throw new ProviderError('BUDGET_LIMIT','وصلت الجولة إلى الحد المحدد للطلبات أو الكريدتس.');
    calls++;credits+=estimated;const url=new URL(path,ROOT);for(const[k,v]of Object.entries(params))if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,String(v));
    let response;try{response=await fetcher(url,{headers:{'x-api-key':key,'accept':'application/json'},signal:AbortSignal.timeout(25000)});}catch{throw new ProviderError('NETWORK_ERROR','تعذر الاتصال بالمصدر ضمن المهلة.');}
    if(!response.ok)throw new ProviderError('HTTP_'+response.status,response.status===429?'المصدر طلب تقليل وتيرة البحث.':'تعذر الوصول إلى المصدر ('+response.status+').');
    let body;try{body=await response.json();}catch{throw new ProviderError('SCHEMA_CHANGED','المصدر أعاد استجابة غير قابلة للقراءة.');}
    if(body.success!==true)throw new ProviderError('PROVIDER_FAILED','مزود البيانات لم يؤكد نجاح الطلب.');
    if(Number.isFinite(Number(body.credits_charged)))credits+=Number(body.credits_charged)-estimated;
    if(Number.isFinite(Number(body.credits_remaining)))remaining=Number(body.credits_remaining);
    return body;
  }
  function add(items,p,url,kind='comment',parent=null){for(const item of items){const row=normalizeRecord(item,p,url,kind,parent);if(row)records.push(row);if(Array.isArray(item.replies)&&row)add(item.replies,p,url,'reply',row.nativeId||row.id);}}
  // Sequential sources keep a strict shared request/credit reservation. No retries or hidden background polling.
  const country=spec.country==='ALL'?'':countryName(spec.country);
  for(const platform of spec.platforms){
    const report={platform,status:'completed',records:0,pages:0,posts:0,remainingCursors:[],replies:spec.includeReplies?'requested':'not_requested',coverage:'bounded',error:null};const before=records.length;
    try{
      const query=[spec.query,country].filter(Boolean).join(' ');
      const direct=spec.urls.filter(u=>{try{validateSourceUrl(u,platform);return true;}catch{return false;}}).slice(0,2);
      if(platform==='x'){
        const body=await get('/v1/twitter/search/posts',{query});report.pages++;
        add(array(body.posts,'منشورات X'),'x','','post');if(body.cursor)report.remainingCursors.push({stream:'search',cursor:body.cursor});
        report.coverage='google_indexed_public_posts';report.replies='not_collected';
      }else if(platform==='reddit'){
        const body=await get('/v1/reddit/search',{query,filter:'comments',sort:'new'});report.pages++;
        add(array(body.comments,'تعليقات Reddit'),'reddit','','comment');if(body.after)report.remainingCursors.push({stream:'search',cursor:body.after});
        report.coverage='provider_comment_search';report.replies='search_matches_only';
      }else if(platform==='facebook'){
        if(!direct.length)throw new ProviderError('SOURCE_URLS_REQUIRED','أضف روابط منشورات Facebook المراد فحصها، أو استورد تعليقاتها.');
        for(const url of direct){const body=await get('/v1/facebook/post/comments',{url});report.pages++;report.posts++;add(array(body.comments,'تعليقات Facebook'),platform,url);if(body.cursor)report.remainingCursors.push({post:url,cursor:body.cursor});}
        report.replies='not_collected';
      }else{
        let urls=direct;
        if(!urls.length){
          if(platform==='instagram'){const b=await get('/v2/instagram/reels/search',{query,page:1});report.pages++;urls=array(b.reels,'بحث إنستجرام').map(x=>x.url||(x.shortcode?'https://www.instagram.com/reel/'+x.shortcode+'/':'')).filter(Boolean).slice(0,2);report.coverage='comments_on_indexed_reels';}
          if(platform==='tiktok'){const b=await get('/v1/tiktok/search/keyword',{query});report.pages++;urls=array(b.search_item_list,'بحث TikTok').map(x=>x.aweme_info).filter(x=>x?.aweme_id&&x.author?.unique_id).map(x=>'https://www.tiktok.com/@'+encodeURIComponent(x.author.unique_id)+'/video/'+x.aweme_id).slice(0,2);if(b.cursor)report.remainingCursors.push({stream:'discovery',cursor:b.cursor});}
          if(platform==='youtube'){const b=await get('/v1/youtube/search',{query,type:'videos'});report.pages++;urls=array(b.videos,'بحث YouTube').map(x=>x.url).filter(Boolean).slice(0,2);if(b.continuationToken)report.remainingCursors.push({stream:'discovery',cursor:b.continuationToken});}
        }
        for(const url of urls){validateSourceUrl(url,platform);report.posts++;
          const path=platform==='instagram'?'/v2/instagram/post/comments':platform==='tiktok'?'/v1/tiktok/video/comments':'/v1/youtube/video/comments';
          const params={url};if(platform==='instagram')params.include_replies=spec.includeReplies;
          if(platform==='youtube')params.order='newest';
          const body=await get(path,params,platform==='instagram'&&spec.includeReplies?16:1);report.pages++;
          add(array(body.comments,'التعليقات'),platform,url);
          const cursor=body.cursor??body.continuationToken;if(cursor)report.remainingCursors.push({post:url,cursor});
          if(body.comments.some(x=>x.has_more_replies||x.repliesContinuationToken||x.reply_comment_total>0)&&platform!=='instagram')report.replies='incomplete';
          if(platform==='instagram'&&body.comments.some(x=>x.has_more_replies))report.replies='incomplete';
        }
      }
    }catch(e){report.status=records.length>before?'partial':'blocked';report.error={code:e.code||'SOURCE_ERROR',message:e.code?e.message:'تعذر قراءة صيغة النتيجة؛ لم تُستبدل ببيانات تجريبية.'};}
    report.records=records.length-before;sources.push(report);
  }
  return {records,report:{provider:'ScrapeCreators',calls,creditsUsed:credits,creditsRemaining:remaining,sources,coverage:'الجولة محدودة بالمصادر والصفحات المتاحة، ولا تمثل كل محتوى المنصات.',collectedAt:new Date().toISOString()}};
}

import http from 'node:http';
import { URL } from 'node:url';

const PORT=process.env.PORT||10000;
const UA='OpportunityIntelligenceAgent/3.0 (+https://github.com/Q8-ux/saad)';
const INTENT_PHRASES=['looking for','need help','recommend','recommendation','seeking','need someone','hire','hiring','agency','consultant','vendor','provider','tool for','solution for','can anyone','struggling','not working','switching','automate','automation','أبحث عن','احتاج','نحتاج','مطلوب','ترشيح','مزود','شركة','استشاري','حل','أتمتة','探しています','おすすめ','困っています','助けて','募集','自動化','業務改善','相談したい','추천','도움이 필요','찾고 있습니다','고민','자동화','업무 개선','필요합니다','寻找','需要帮助','求推荐','推荐','自动化','经营困难','需要解决','想找','尋找','需要協助','求推薦','推薦','自動化','困擾','需要解決'];
const AUTHORITY_PHRASES=['ceo','founder','co-founder','owner','cfo','cto','director','vp','partner','business owner','entrepreneur','رئيس تنفيذي','مؤسس','مالك','مدير','رائد أعمال','経営者','起業家','代表','창업자','创始人','创业者','企业家','創始人','創業者','女老板','女老闆','女性経営者','여성 ceo','여성 창업자','女性创业者','女性創業'];
const MONEY_PHRASES=['budget','paid','contract','quote','proposal','pricing','revenue','funded','funding','million','ميزانية','عقد','عرض سعر','سعر','تمويل','إيرادات','予算','契約','売上','매출','예산','계약','预算','合同','营收','預算','合約','營收'];
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store')}
function json(res,status,data){cors(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))}
function strip(s=''){return String(s).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")}
function matches(text,list){const t=text.toLowerCase();return list.filter(x=>t.includes(x.toLowerCase()))}
function qualify(text=''){const intent=matches(text,INTENT_PHRASES),authority=matches(text,AUTHORITY_PHRASES),money=matches(text,MONEY_PHRASES);let score=35+Math.min(36,intent.length*9)+Math.min(18,authority.length*9)+Math.min(12,money.length*6);if(/\?|？/.test(text))score+=3;score=Math.min(98,score);return{qualified:intent.length>0&&(authority.length>0||intent.length>=2),score,evidence:{intent:intent.slice(0,4),authority:authority.slice(0,3),commercial:money.slice(0,3)}}}
function solution(text=''){const t=text.toLowerCase();if(/support|客服|고객|カスタマー|دعم/.test(t))return'AI Customer Support Automation';if(/marketing|growth|营销|行銷|마케팅|マーケ|تسويق/.test(t))return'AI Growth & Marketing Automation';if(/workflow|automate|automation|自动化|自動化|자동화|業務改善|업무 개선|أتمتة/.test(t))return'Workflow Automation Platform';if(/sales|crm|销售|営業|영업|مبيعات/.test(t))return'AI Sales / CRM Intelligence';return'AI Operations & Decision Intelligence'}
function regionFromSource(s=''){for(const [re,r] of [[/Kuwait|Gulf|Saudi|UAE|Qatar|Bahrain|Oman/,'Gulf'],[/Middle East|MENA/,'Middle East'],[/Japan/,'Japan'],[/Korea/,'South Korea'],[/China/,'China'],[/Taiwan/,'Taiwan'],[/Hong Kong/,'Hong Kong'],[/India/,'India'],[/Singapore|Malaysia|Indonesia|Philippines|Thailand|Vietnam|Southeast Asia/,'Southeast Asia'],[/Europe|UK|Germany|France|Netherlands|Spain|Italy/,'Europe'],[/USA|Canada|North America/,'North America'],[/Africa|South Africa|Nigeria|Kenya/,'Africa'],[/Australia|New Zealand|Oceania/,'Oceania']])if(re.test(s))return r;return'Global'}
async function fjson(url,headers={}){const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json',...headers},signal:AbortSignal.timeout(11000)});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json()}
async function ftext(url){const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/rss+xml,text/xml,text/html'},signal:AbortSignal.timeout(11000)});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}
async function reddit(q,label='Reddit'){const d=await fjson('https://www.reddit.com/search.json?sort=new&limit=25&q='+encodeURIComponent(q));return(d?.data?.children||[]).map(x=>x.data).filter(Boolean).map(x=>({source:label,title:x.title||'',text:strip(x.selftext||''),url:'https://www.reddit.com'+x.permalink,author:x.author||'',created:x.created_utc?new Date(x.created_utc*1000).toISOString():null,via:'direct public endpoint'}))}
async function hackerNews(q){const d=await fjson('https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=25&query='+encodeURIComponent(q));return(d.hits||[]).map(x=>({source:'Hacker News',title:x.title||'',text:strip(x.story_text||''),url:x.url||`https://news.ycombinator.com/item?id=${x.objectID}`,author:x.author||'',created:x.created_at||null,via:'direct public endpoint'}))}
async function github(q){const d=await fjson('https://api.github.com/search/issues?sort=created&order=desc&per_page=25&q='+encodeURIComponent(`${q} is:issue is:open`),{'Accept':'application/vnd.github+json'});return(d.items||[]).map(x=>({source:'GitHub',title:x.title||'',text:strip(x.body||''),url:x.html_url,author:x.user?.login||'',created:x.created_at||null,via:'direct public API'}))}
async function googleNewsSite(q,site,label,locale='en-US'){const lm={'ja-JP':['ja','JP','JP:ja'],'ko-KR':['ko','KR','KR:ko'],'zh-CN':['zh-CN','CN','CN:zh-Hans'],'zh-TW':['zh-TW','TW','TW:zh-Hant'],'zh-HK':['zh-HK','HK','HK:zh-Hant'],'ar-KW':['ar','KW','KW:ar'],'ar-SA':['ar','SA','SA:ar'],'ar-AE':['ar','AE','AE:ar'],'en-IN':['en','IN','IN:en'],'en-GB':['en','GB','GB:en'],'en-CA':['en','CA','CA:en'],'en-AU':['en','AU','AU:en'],'en-SG':['en','SG','SG:en'],'en-ZA':['en','ZA','ZA:en'],'en-US':['en','US','US:en']};const[hl,gl,ceid]=lm[locale]||lm['en-US'];const query=(site?`site:${site} `:'')+`(${q})`;const xml=await ftext('https://news.google.com/rss/search?q='+encodeURIComponent(query)+`&hl=${encodeURIComponent(hl)}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`);return[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,18).map(m=>m[1]).map(s=>{const get=t=>decodeXml((s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`))||[])[1]||'');return{source:label,title:strip(get('title')),text:strip(get('description')),url:get('link'),created:get('pubDate')||null,author:'',via:'public web index'}})}
const adapters={
 reddit:()=>reddit('(\"looking for\" OR \"need help\" OR recommendation OR \"need someone\") (founder OR owner OR CEO)'),
 hacker_news:()=>hackerNews('looking for recommendation founder help automation'),
 github:()=>github('need help automation business'),
 linkedin:()=>googleNewsSite('\"looking for\" OR \"need help\" OR \"seeking recommendations\"','linkedin.com','LinkedIn • indexed'),
 x:()=>googleNewsSite('\"looking for\" OR \"need help\" OR recommendation founder','x.com','X • indexed'),
 product_hunt:()=>googleNewsSite('founder \"need help\" OR \"looking for\"','producthunt.com','Product Hunt • indexed'),
 indie_hackers:()=>googleNewsSite('founder \"need help\" OR \"looking for\"','indiehackers.com','Indie Hackers • indexed'),
 gulf_linkedin:()=>googleNewsSite('أبحث عن OR نحتاج OR مطلوب OR مزود OR استشاري OR أتمتة','linkedin.com','Gulf • LinkedIn','ar-KW'),
 gulf_x:()=>googleNewsSite('أبحث عن OR نحتاج OR مطلوب OR شركة OR حل OR أتمتة','x.com','Gulf • X','ar-KW'),
 gulf_web:()=>googleNewsSite('شركة تبحث عن OR نحتاج مزود OR مطلوب استشاري OR أتمتة','','Gulf • Web','ar-KW'),
 saudi_web:()=>googleNewsSite('رائد أعمال OR مؤسس نحتاج OR أبحث عن OR مزود OR أتمتة','','Saudi Arabia • Web','ar-SA'),
 uae_web:()=>googleNewsSite('founder OR business owner \"looking for\" OR \"need help\" OR automation','','UAE • Web','ar-AE'),
 middleeast_web:()=>googleNewsSite('مؤسس OR شركة OR رائد أعمال أبحث عن OR نحتاج OR مطلوب','','Middle East • Web','ar-AE'),
 japan_note:()=>googleNewsSite('女性経営者 OR 起業家 困っています OR おすすめ OR 相談したい OR 自動化','note.com','Japan • note.com','ja-JP'),
 japan_wantedly:()=>googleNewsSite('女性経営者 OR 起業家 募集 OR 支援 OR 業務改善','wantedly.com','Japan • Wantedly','ja-JP'),
 japan_web:()=>googleNewsSite('女性経営者 OR 起業家 困っています OR おすすめ OR 支援','','Japan • Web','ja-JP'),
 korea_naver:()=>googleNewsSite('여성 CEO OR 여성 창업자 도움이 필요 OR 추천 OR 고민','blog.naver.com','South Korea • Naver','ko-KR'),
 korea_brunch:()=>googleNewsSite('여성 창업자 OR 대표 고민 OR 추천 OR 도움이 필요','brunch.co.kr','South Korea • Brunch','ko-KR'),
 korea_web:()=>googleNewsSite('여성 CEO OR 여성 창업자 도움이 필요 OR 추천','','South Korea • Web','ko-KR'),
 china_zhihu:()=>googleNewsSite('女性创业者 OR 女企业家 需要帮助 OR 求推荐 OR 经营困难','zhihu.com','China • Zhihu','zh-CN'),
 china_weibo:()=>googleNewsSite('女性创业 OR 女老板 需要帮助 OR 求推荐 OR 经营困难','weibo.com','China • Weibo','zh-CN'),
 china_xiaohongshu:()=>googleNewsSite('女性创业 OR 女老板 求推荐 OR 需要帮助','xiaohongshu.com','China • Xiaohongshu','zh-CN'),
 taiwan_dcard:()=>googleNewsSite('女性創業 OR 女老闆 需要協助 OR 求推薦 OR 困擾','dcard.tw','Taiwan • Dcard','zh-TW'),
 taiwan_ptt:()=>googleNewsSite('女老闆 OR 創業 需要協助 OR 推薦','ptt.cc','Taiwan • PTT','zh-TW'),
 hongkong_lihkg:()=>googleNewsSite('女老闆 OR 女性創業 需要協助 OR 推薦 OR 困難','lihkg.com','Hong Kong • LIHKG','zh-HK'),
 india_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR vendor OR automation','linkedin.com','India • LinkedIn','en-IN'),
 india_web:()=>googleNewsSite('startup founder \"looking for\" OR \"need help\" OR vendor OR automation','','India • Web','en-IN'),
 southeastasia_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR vendor OR automation','linkedin.com','Southeast Asia • LinkedIn','en-SG'),
 southeastasia_web:()=>googleNewsSite('startup founder \"looking for\" OR recommendation OR automation','','Southeast Asia • Web','en-SG'),
 europe_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR agency OR automation','linkedin.com','Europe • LinkedIn','en-GB'),
 europe_web:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR vendor OR automation','','Europe • Web','en-GB'),
 northamerica_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR agency OR automation','linkedin.com','North America • LinkedIn','en-CA'),
 northamerica_reddit:()=>reddit('(founder OR owner) (\"looking for\" OR \"need help\" OR vendor OR agency)','North America • Reddit'),
 africa_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR vendor OR automation','linkedin.com','Africa • LinkedIn','en-ZA'),
 africa_web:()=>googleNewsSite('startup founder \"looking for\" OR \"need help\" OR automation','','Africa • Web','en-ZA'),
 oceania_linkedin:()=>googleNewsSite('founder \"looking for\" OR \"need help\" OR vendor OR automation','linkedin.com','Oceania • LinkedIn','en-AU'),
 oceania_web:()=>googleNewsSite('business owner \"looking for\" OR \"need help\" OR automation','','Oceania • Web','en-AU')
};
const groups={
 'east-asia':/^(japan_|korea_|china_|taiwan_|hongkong_)/,
 gulf:/^(gulf_|saudi_|uae_)/,
 'middle-east':/^(gulf_|saudi_|uae_|middleeast_)/,
 india:/^india_/,
 'southeast-asia':/^southeastasia_/,
 europe:/^europe_/,
 'north-america':/^northamerica_/,
 africa:/^africa_/,
 oceania:/^oceania_/
};
async function radar(region='all'){const entries=Object.entries(adapters).filter(([id])=>region==='all'||(groups[region]?.test(id))||id.startsWith(region+'_'));const settled=await Promise.allSettled(entries.map(([,fn])=>fn()));const sourceStatus=[],raw=[];settled.forEach((r,i)=>{const id=entries[i][0];if(r.status==='fulfilled'){sourceStatus.push({id,status:'connected',count:r.value.length});raw.push(...r.value)}else sourceStatus.push({id,status:'degraded',count:0,error:String(r.reason?.message||r.reason)})});const seen=new Set(),leads=[];for(const x of raw){if(!x.url||!x.title||seen.has(x.url))continue;seen.add(x.url);const text=`${x.title} ${x.text}`,q=qualify(text);if(!q.qualified||q.score<62)continue;leads.push({...x,region:regionFromSource(x.source),score:q.score,evidence:q.evidence,solution:solution(text),verified:true})}leads.sort((a,b)=>b.score-a.score);return{generatedAt:new Date().toISOString(),region,mode:'live-only',sources:sourceStatus,rawCount:raw.length,qualifiedCount:leads.length,leads:leads.slice(0,100)}}
const regions=['all','gulf','middle-east','east-asia','japan','korea','china','taiwan','hongkong','india','southeast-asia','europe','north-america','africa','oceania'];
const server=http.createServer(async(req,res)=>{if(req.method==='OPTIONS'){cors(res);res.writeHead(204);return res.end()}const u=new URL(req.url,`http://${req.headers.host}`);try{if(u.pathname==='/api/health')return json(res,200,{ok:true,service:'opportunity-intelligence-backend',version:'3.0-global',time:new Date().toISOString()});if(u.pathname==='/api/sources')return json(res,200,{sources:Object.keys(adapters),regions,mode:'live-only'});if(u.pathname==='/api/radar')return json(res,200,await radar(u.searchParams.get('region')||'all'));return json(res,404,{error:'not_found'})}catch(e){return json(res,500,{error:'server_error',message:String(e.message||e)})}});
server.listen(PORT,'0.0.0.0',()=>console.log(`Opportunity backend v3 listening on ${PORT}`));
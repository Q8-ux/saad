import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 10000;
const UA = 'OpportunityIntelligenceAgent/1.1 (+https://github.com/Q8-ux/saad)';

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
}
function json(res,status,data){cors(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function strip(s=''){return s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function decodeXml(s=''){return s.replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function score(text=''){
  const t=text.toLowerCase();
  let s=42;
  const strong=['looking for','need help','recommend','recommendation','seeking','hire','hiring','agency','consultant','vendor','tool for','solution for','can anyone','struggling','doesn\'t work','not working','switching','automate','automation','scale','growth','crm','support','探しています','募集','おすすめ','困っています','自動化','支援','추천','도움','찾고 있습니다','자동화','고민','寻找','需要帮助','推荐','自动化','扩张','需要解决','尋找','需要協助','推薦','自動化'];
  for(const k of strong) if(t.includes(k)) s+=4;
  if(/\b(ceo|founder|co-founder|owner|cfo|cto|director|vp|partner)\b/.test(t)) s+=8;
  if(/\b(budget|paid|contract|quote|proposal|pricing|million|revenue|funded|funding)\b/.test(t)) s+=8;
  if(/[一-龯ぁ-んァ-ン가-힣]/.test(text)) s+=3;
  return Math.max(35,Math.min(98,s));
}
function solution(text=''){
  const t=text.toLowerCase();
  if(t.includes('support')||t.includes('客服')||t.includes('고객')||t.includes('カスタマー')) return 'AI Customer Support Automation';
  if(t.includes('marketing')||t.includes('growth')||t.includes('营销')||t.includes('마케팅')||t.includes('マーケ')) return 'AI Growth & Marketing Automation';
  if(t.includes('workflow')||t.includes('automate')||t.includes('automation')||t.includes('自动化')||t.includes('자동화')||t.includes('自動化')) return 'Workflow Automation Platform';
  if(t.includes('sales')||t.includes('crm')||t.includes('销售')||t.includes('営業')) return 'AI Sales / CRM Intelligence';
  if(t.includes('exit')||t.includes('acquisition')||t.includes('m&a')) return 'Founder Exit & M&A Intelligence';
  if(t.includes('wealth')||t.includes('financial')||t.includes('finance')) return 'Financial Intelligence Dashboard';
  return 'AI Operations & Decision Intelligence';
}
function regionFromSource(source=''){
  if(/Japan|Note|Wantedly|Qiita/.test(source)) return 'Japan';
  if(/Korea|Naver|Brunch|RocketPunch/.test(source)) return 'South Korea';
  if(/China|Zhihu|Weibo|Xiaohongshu/.test(source)) return 'China';
  if(/Taiwan|Dcard|PTT/.test(source)) return 'Taiwan';
  if(/Hong Kong|LIHKG/.test(source)) return 'Hong Kong';
  return 'Global';
}
async function fjson(url,headers={}){
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json',...headers},signal:AbortSignal.timeout(9000)});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
async function ftext(url){
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/rss+xml,text/xml,text/html'},signal:AbortSignal.timeout(9000)});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.text();
}
async function reddit(q){
  const u='https://www.reddit.com/search.json?sort=new&limit=12&q='+encodeURIComponent(q);
  const d=await fjson(u);
  return (d?.data?.children||[]).map(x=>x.data).filter(Boolean).map(x=>({source:'Reddit',title:x.title||'',text:strip(x.selftext||''),url:'https://www.reddit.com'+x.permalink,author:x.author||'',created:x.created_utc?new Date(x.created_utc*1000).toISOString():null}));
}
async function hackerNews(q){
  const u='https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=12&query='+encodeURIComponent(q);
  const d=await fjson(u);
  return (d.hits||[]).map(x=>({source:'Hacker News',title:x.title||'',text:strip(x.story_text||''),url:x.url||`https://news.ycombinator.com/item?id=${x.objectID}`,author:x.author||'',created:x.created_at||null}));
}
async function github(q){
  const query=`${q} is:issue is:open`;
  const u='https://api.github.com/search/issues?sort=created&order=desc&per_page=12&q='+encodeURIComponent(query);
  const d=await fjson(u,{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'});
  return (d.items||[]).map(x=>({source:'GitHub',title:x.title||'',text:strip(x.body||''),url:x.html_url,author:x.user?.login||'',created:x.created_at||null}));
}
async function googleNewsSite(q,site,label,locale='en-US'){
  const localeMap={
    'ja-JP':{hl:'ja',gl:'JP',ceid:'JP:ja'},'ko-KR':{hl:'ko',gl:'KR',ceid:'KR:ko'},'zh-CN':{hl:'zh-CN',gl:'CN',ceid:'CN:zh-Hans'},'zh-TW':{hl:'zh-TW',gl:'TW',ceid:'TW:zh-Hant'},'zh-HK':{hl:'zh-HK',gl:'HK',ceid:'HK:zh-Hant'},'en-US':{hl:'en',gl:'US',ceid:'US:en'}
  };
  const loc=localeMap[locale]||localeMap['en-US'];
  const query=(site?`site:${site} `:'')+`(${q})`;
  const u='https://news.google.com/rss/search?q='+encodeURIComponent(query)+`&hl=${encodeURIComponent(loc.hl)}&gl=${loc.gl}&ceid=${encodeURIComponent(loc.ceid)}`;
  const xml=await ftext(u);
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,10).map(m=>m[1]);
  return items.map(s=>{
    const get=(tag)=>decodeXml((s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))||[])[1]||'');
    return {source:label,title:strip(get('title')),text:strip(get('description')),url:get('link'),author:'',created:get('pubDate')||null,via:'Public web index'};
  });
}
async function generalWeb(q,locale='en-US',label='Web'){return googleNewsSite(q,'',label,locale);}

const adapters={
  reddit:()=>reddit('("looking for" OR "need help" OR recommendation OR automate OR scaling) founder business'),
  hacker_news:()=>hackerNews('looking for recommendation founder automation'),
  github:()=>github('looking for help automation business'),
  linkedin:()=>googleNewsSite('"looking for" OR "need help" OR recommendation OR automation','linkedin.com','LinkedIn (indexed)'),
  x:()=>googleNewsSite('"looking for" OR "need help" OR recommendation OR automation','x.com','X (indexed)'),
  product_hunt:()=>googleNewsSite('founder problem growth automation','producthunt.com','Product Hunt (indexed)'),
  wellfound:()=>googleNewsSite('founder hiring automation growth','wellfound.com','Wellfound (indexed)'),
  indie_hackers:()=>googleNewsSite('founder looking for help growth automation','indiehackers.com','Indie Hackers (indexed)'),
  web:()=>generalWeb('founder "looking for recommendations" automation business'),

  japan_note:()=>googleNewsSite('起業家 OR 経営者 OR 女性経営者 OR 自動化 OR 業務改善 OR 集客 OR 課題','note.com','Japan • note.com','ja-JP'),
  japan_wantedly:()=>googleNewsSite('経営者 OR founder OR 採用 OR 営業 OR 自動化 OR DX','wantedly.com','Japan • Wantedly','ja-JP'),
  japan_qiita:()=>googleNewsSite('業務改善 OR 自動化 OR SaaS OR AI OR 課題','qiita.com','Japan • Qiita','ja-JP'),
  japan_web:()=>generalWeb('女性経営者 OR 起業家 OR 困っています OR 支援 OR 自動化 OR DX','ja-JP','Japan • Web'),

  korea_naver:()=>googleNewsSite('여성 CEO OR 여성 창업자 OR 대표 OR 자동화 OR 고민 OR 추천 OR 업무 개선','blog.naver.com','South Korea • Naver Blog','ko-KR'),
  korea_brunch:()=>googleNewsSite('창업자 OR 대표 OR 마케팅 OR 자동화 OR 고민 OR 성장','brunch.co.kr','South Korea • Brunch','ko-KR'),
  korea_rocketpunch:()=>googleNewsSite('대표 OR 창업 OR 채용 OR 성장 OR 자동화','rocketpunch.com','South Korea • RocketPunch','ko-KR'),
  korea_web:()=>generalWeb('여성 창업자 OR 여성 CEO OR 도움이 필요 OR 추천 OR 자동화','ko-KR','South Korea • Web'),

  china_zhihu:()=>googleNewsSite('女性创业者 OR 女企业家 OR 创始人 OR 自动化 OR 营销 OR 求推荐 OR 困难','zhihu.com','China • Zhihu','zh-CN'),
  china_weibo:()=>googleNewsSite('女性创业 OR 创始人 OR 企业家 OR 求推荐 OR 自动化 OR 经营困难','weibo.com','China • Weibo','zh-CN'),
  china_xiaohongshu:()=>googleNewsSite('女性创业 OR 女老板 OR 创始人 OR 经营 OR 自动化 OR 营销','xiaohongshu.com','China • Xiaohongshu','zh-CN'),
  china_web:()=>generalWeb('女性创业者 OR 女企业家 OR 需要帮助 OR 推荐 OR 自动化 OR 数字化','zh-CN','China • Web'),

  taiwan_dcard:()=>googleNewsSite('創業 OR 女老闆 OR 女性創業 OR 自動化 OR 行銷 OR 推薦 OR 困擾','dcard.tw','Taiwan • Dcard','zh-TW'),
  taiwan_ptt:()=>googleNewsSite('創業 OR 老闆 OR 自動化 OR 行銷 OR 推薦','ptt.cc','Taiwan • PTT','zh-TW'),
  taiwan_web:()=>generalWeb('女性創業 OR 女企業家 OR 需要協助 OR 推薦 OR 自動化','zh-TW','Taiwan • Web'),

  hongkong_lihkg:()=>googleNewsSite('創業 OR 女老闆 OR 生意 OR 自動化 OR 推薦 OR 困難','lihkg.com','Hong Kong • LIHKG','zh-HK'),
  hongkong_web:()=>generalWeb('女性創業 OR 女企業家 OR 需要協助 OR 推薦 OR 自動化','zh-HK','Hong Kong • Web')
};

async function radar(region='all'){
  const entries=Object.entries(adapters).filter(([id])=>{
    if(region==='all') return true;
    if(region==='east-asia') return /^(japan_|korea_|china_|taiwan_|hongkong_)/.test(id);
    return id.startsWith(region+'_');
  });
  const settled=await Promise.allSettled(entries.map(([,fn])=>fn()));
  const sourceStatus=[]; const all=[];
  settled.forEach((r,i)=>{const id=entries[i][0]; if(r.status==='fulfilled'){sourceStatus.push({id,status:'connected',count:r.value.length}); all.push(...r.value);} else sourceStatus.push({id,status:'degraded',count:0,error:String(r.reason?.message||r.reason)});});
  const seen=new Set();
  const leads=all.filter(x=>x.url&&x.title).filter(x=>{const k=x.url; if(seen.has(k))return false;seen.add(k);return true;}).map(x=>{const text=`${x.title} ${x.text}`;return {...x,region:regionFromSource(x.source),score:score(text),solution:solution(text)};}).sort((a,b)=>b.score-a.score).slice(0,80);
  return {generatedAt:new Date().toISOString(),region,sources:sourceStatus,leads};
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){cors(res);res.writeHead(204);return res.end();}
  const u=new URL(req.url,`http://${req.headers.host}`);
  try{
    if(u.pathname==='/api/health') return json(res,200,{ok:true,service:'opportunity-intelligence-backend',version:'1.1-east-asia',time:new Date().toISOString()});
    if(u.pathname==='/api/sources') return json(res,200,{sources:Object.keys(adapters),regions:['all','east-asia','japan','korea','china','taiwan','hongkong'],note:'Some East Asia platforms are discovered through public web indexes because their direct APIs or crawling access are restricted. Official credentials can replace these fallbacks later.'});
    if(u.pathname==='/api/radar') return json(res,200,await radar(u.searchParams.get('region')||'all'));
    return json(res,404,{error:'not_found'});
  }catch(e){return json(res,500,{error:'server_error',message:String(e.message||e)});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Opportunity backend listening on ${PORT}`));

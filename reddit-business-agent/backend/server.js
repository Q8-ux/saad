import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 10000;
const UA = 'OpportunityIntelligenceAgent/1.0 (+https://github.com/Q8-ux/saad)';

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
  const strong=['looking for','need help','recommend','recommendation','seeking','hire','hiring','agency','consultant','vendor','tool for','solution for','can anyone','struggling','doesn\'t work','not working','switching','automate','automation','scale','growth','crm','support'];
  for(const k of strong) if(t.includes(k)) s+=4;
  if(/\b(ceo|founder|co-founder|owner|cfo|cto|director|vp|partner)\b/.test(t)) s+=8;
  if(/\b(budget|paid|contract|quote|proposal|pricing|million|revenue|funded|funding)\b/.test(t)) s+=8;
  return Math.max(35,Math.min(98,s));
}
function solution(text=''){
  const t=text.toLowerCase();
  if(t.includes('support')) return 'AI Customer Support Automation';
  if(t.includes('marketing')||t.includes('growth')) return 'AI Growth & Marketing Automation';
  if(t.includes('workflow')||t.includes('automate')||t.includes('automation')) return 'Workflow Automation Platform';
  if(t.includes('sales')||t.includes('crm')) return 'AI Sales / CRM Intelligence';
  if(t.includes('exit')||t.includes('acquisition')||t.includes('m&a')) return 'Founder Exit & M&A Intelligence';
  if(t.includes('wealth')||t.includes('financial')) return 'Financial Intelligence Dashboard';
  return 'AI Operations & Decision Intelligence';
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
  return (d?.data?.children||[]).map(x=>x.data).filter(Boolean).map(x=>({
    source:'Reddit',title:x.title||'',text:strip(x.selftext||''),url:'https://www.reddit.com'+x.permalink,author:x.author||'',created:x.created_utc?new Date(x.created_utc*1000).toISOString():null
  }));
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
async function googleNewsSite(q,site,label){
  const query=`site:${site} (${q})`;
  const u='https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=en&gl=US&ceid=US:en';
  const xml=await ftext(u);
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,8).map(m=>m[1]);
  return items.map(s=>{
    const get=(tag)=>decodeXml((s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))||[])[1]||'');
    return {source:label,title:strip(get('title')),text:strip(get('description')),url:get('link'),author:'',created:get('pubDate')||null,via:'Web index'};
  });
}
async function generalWeb(q){return googleNewsSite(q,'','Web');}

const adapters={
  reddit:()=>reddit('("looking for" OR "need help" OR recommendation OR automate OR scaling) founder business'),
  hacker_news:()=>hackerNews('looking for recommendation founder automation'),
  github:()=>github('looking for help automation business'),
  linkedin:()=>googleNewsSite('"looking for" OR "need help" OR recommendation OR automation','linkedin.com','LinkedIn (indexed)'),
  x:()=>googleNewsSite('"looking for" OR "need help" OR recommendation OR automation','x.com','X (indexed)'),
  product_hunt:()=>googleNewsSite('founder problem growth automation','producthunt.com','Product Hunt (indexed)'),
  wellfound:()=>googleNewsSite('founder hiring automation growth','wellfound.com','Wellfound (indexed)'),
  indie_hackers:()=>googleNewsSite('founder looking for help growth automation','indiehackers.com','Indie Hackers (indexed)'),
  web:()=>generalWeb('founder "looking for recommendations" automation business')
};

async function radar(){
  const entries=Object.entries(adapters);
  const settled=await Promise.allSettled(entries.map(([,fn])=>fn()));
  const sourceStatus=[]; const all=[];
  settled.forEach((r,i)=>{const id=entries[i][0]; if(r.status==='fulfilled'){sourceStatus.push({id,status:'connected',count:r.value.length}); all.push(...r.value);} else sourceStatus.push({id,status:'degraded',count:0,error:String(r.reason?.message||r.reason)});});
  const seen=new Set();
  const leads=all.filter(x=>x.url&&x.title).filter(x=>{const k=x.url; if(seen.has(k))return false;seen.add(k);return true;}).map(x=>{const text=`${x.title} ${x.text}`;return {...x,score:score(text),solution:solution(text)};}).sort((a,b)=>b.score-a.score).slice(0,40);
  return {generatedAt:new Date().toISOString(),sources:sourceStatus,leads};
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){cors(res);res.writeHead(204);return res.end();}
  const u=new URL(req.url,`http://${req.headers.host}`);
  try{
    if(u.pathname==='/api/health') return json(res,200,{ok:true,service:'opportunity-intelligence-backend',time:new Date().toISOString()});
    if(u.pathname==='/api/sources') return json(res,200,{sources:Object.keys(adapters),note:'LinkedIn/X/Product Hunt/Wellfound/Indie Hackers use public web-index fallback unless official credentials are later configured.'});
    if(u.pathname==='/api/radar') return json(res,200,await radar());
    return json(res,404,{error:'not_found'});
  }catch(e){return json(res,500,{error:'server_error',message:String(e.message||e)});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Opportunity backend listening on ${PORT}`));

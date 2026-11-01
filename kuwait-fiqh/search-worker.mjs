import {normalize,queryTokens,indexKey,shard,intersect,excerpt} from './engine.mjs';
const cache=new Map();let active=0;
async function json(path){if(!cache.has(path))cache.set(path,fetch(path).then(r=>{if(!r.ok)throw new Error('تعذّر تحميل فهرس البحث. تحقق من اتصالك ثم أعد البحث.');return r.json();}).catch(e=>{cache.delete(path);throw e;}));return cache.get(path);}
function headingAt(headings,p){let lo=0,hi=headings.length-1,best=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(headings[mid].id<=p){best=mid;lo=mid+1;}else hi=mid-1;}return best<0?'':headings[best].t;}
self.addEventListener('message',async ({data})=>{
  const {id,query,volume,exact,offset=0}=data;active=id;
  try{
    const tokens=queryTokens(query),keys=tokens.map(indexKey),phrase=normalize(query).trim().replace(/\s+/g,' ');
    if(!tokens.length){postMessage({id,error:'اكتب مصطلحًا فقهيًا واضحًا، مثل الصلاة أو زكاة الفطر.'});return;}
    const names=[...new Set(keys.map(shard))];
    postMessage({id,progress:'جارٍ البحث في فهارس الموسوعة…'});
    const [catalog,...indices]=await Promise.all([json('./data/catalog.json'),...names.map(n=>json(`./data/index/${String(n).padStart(2,'0')}.json`))]);
    if(active!==id)return;
    const lookup=new Map(names.map((n,i)=>[n,indices[i]]));
    let ids=intersect(keys.map(t=>lookup.get(shard(t))[t]||[]));
    if(volume!=='all')ids=ids.filter(id=>Math.floor(id/100000)===Number(volume));
    if(exact&&ids.length){
      const volumes=[...new Set(ids.map(id=>Math.floor(id/100000)))],matching=new Set();let cursor=0,done=0;
      if(!self.DecompressionStream)throw new Error('البحث بالعبارة الكاملة يحتاج متصفحًا حديثًا. ألغِ خيار العبارة كما هي أو حدّث المتصفح.');
      await Promise.all(Array.from({length:Math.min(4,volumes.length)},async()=>{
        while(cursor<volumes.length){const v=volumes[cursor++],response=await fetch(`./data/search/${String(v).padStart(2,'0')}.json.gz`);if(!response.ok)throw new Error('تعذّر تحميل نص التحقق من العبارة. تحقق من الاتصال وأعد المحاولة.');const paragraphs=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();if(active!==id)return;for(const code of ids){if(Math.floor(code/100000)===v&&paragraphs[code%100000].replace(/\s+/g,' ').includes(phrase))matching.add(code);}done++;postMessage({id,progress:`التحقق من العبارة: ${done} من ${volumes.length} مجلدًا…`});}
      }));
      ids=ids.filter(code=>matching.has(code));
    }
    if(active!==id)return;
    const ranked=ids.map(code=>{const v=Math.floor(code/100000),p=code%100000,h=normalize(headingAt(catalog.volumes[v-1].headings,p));return {code,score:(h===phrase?60:0)+keys.reduce((n,t)=>n+(h.includes(t)?10:0),0)};}).sort((a,b)=>b.score-a.score||a.code-b.code);
    const selected=ranked.slice(offset,offset+20),rows=[];
    await Promise.all(selected.map(async ({code,score})=>{const v=Math.floor(code/100000),p=code%100000,chunk=await json(`./data/volumes/${String(v).padStart(2,'0')}/${String(Math.floor(p/128)).padStart(3,'0')}.json`),entry=chunk.paragraphs[p%128];rows.push({code,volume:v,location:p,title:entry.h,text:excerpt(entry.t,tokens),flagged:!!entry.q,score});}));
    if(active!==id)return;rows.sort((a,b)=>b.score-a.score||a.code-b.code);
    postMessage({id,total:ids.length,rows,tokens,offset});
  }catch(error){if(active===id)postMessage({id,error:error.message});}
});

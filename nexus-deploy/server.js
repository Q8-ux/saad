import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {levels,VERSION} from './public/engine.js';
import {scalpSignal} from './public/scalp-signals.js';
import {startMarketFlow} from './lib/market-flow.js';
import {createExecutionService} from './lib/execution-service.js';
import {WATCH_SYMBOLS,normalizeTicker,observationState,normalizeCandles} from './public/market-data.js';

const PUBLIC=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const PORT=Number(process.env.PORT||3000),cache=new Map(),pending=new Map();
const getJSON=async(url,ttl=5000)=>{
  const old=cache.get(url);if(old&&Date.now()-old.at<ttl)return old.data;
  if(pending.has(url))return pending.get(url);
  const p=(async()=>{const response=await fetch(url,{signal:AbortSignal.timeout(8500),headers:{accept:'application/json'}});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();cache.set(url,{at:Date.now(),data});if(cache.size>400)cache.delete(cache.keys().next().value);return data;})();
  pending.set(url,p);try{return await p;}finally{pending.delete(url);}
};
const quoteURLs={
  Binance:`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(WATCH_SYMBOLS))}`,
  OKX:'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
  Bybit:'https://api.bybit.com/v5/market/tickers?category=spot'
};
const providerLinks={Binance:'https://www.binance.com/en/trade/BTC_USDT?type=spot',OKX:'https://www.okx.com/trade-spot/btc-usdt',Bybit:'https://www.bybit.com/en/trade/spot/BTC/USDT'};
async function tickerProvider(source){
  const requestedAt=Date.now(),url=quoteURLs[source];
  try{
    const data=await getJSON(url,3000),receivedAt=cache.get(url).at;
    let raw;
    if(source==='Binance')raw=data;
    else if(source==='OKX'){if(data.code!=='0')throw Error('upstream');raw=data.data;}
    else {if(data.retCode!==0)throw Error('upstream');raw=data.result.list;}
    if(!Array.isArray(raw))throw Error('invalidTicker');
    const rows=[],rejected=[];
    for(const r of raw.filter(r=>WATCH_SYMBOLS.includes(r.symbol||r.instId?.replace('-','')))){try{rows.push(normalizeTicker(source,r,{receivedAt,sourceAsOf:source==='Bybit'?Number(data.time):undefined}));}catch{rejected.push(r.symbol||r.instId||'unknown');}}
    const expected=WATCH_SYMBOLS;
    for(const symbol of expected)if(!rows.some(r=>r.symbol===symbol))rows.push({source,symbol,base:symbol.replace('USDT',''),quote:'USDT',ok:false,error:'invalidTicker',receivedAt:null,sourceAsOf:null});
    return {source,ok:rows.some(r=>r.ok),receivedAt,requestMs:Date.now()-requestedAt,url:providerLinks[source],error:rejected.length?'partialData':null,rows};
  }catch{return {source,ok:false,receivedAt:null,requestMs:Date.now()-requestedAt,url:providerLinks[source],error:'sourceUnavailable',rows:WATCH_SYMBOLS.map(symbol=>({source,symbol,base:symbol.replace('USDT',''),quote:'USDT',ok:false,error:'sourceUnavailable',receivedAt:null,sourceAsOf:null}))};}
}
let boardPending=null,boardCache=null;
async function marketBoard(){
  if(boardCache&&Date.now()-boardCache.generatedAt<3000)return boardCache;
  if(boardPending)return boardPending;
  boardPending=(async()=>{const providers=await Promise.all(Object.keys(quoteURLs).map(tickerProvider));const now=Date.now();return boardCache={version:VERSION,generatedAt:now,pollSeconds:5,quoteCurrency:'USDT',priceType:'last-trade',providers,observations:providers.flatMap(p=>p.rows).map(row=>({...row,state:observationState(row,now)}))};})();
  try{return await boardPending;}finally{boardPending=null;}
}
async function exchange(id) {
  const t=Date.now();try{
    let d,bids,asks,asOf;
    if(id==='Binance'){d=await getJSON('https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=20');bids=d.bids;asks=d.asks;asOf=cache.get('https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=20').at;}
    else if(id==='OKX'){d=await getJSON('https://www.okx.com/api/v5/market/books?instId=BTC-USDT&sz=20');if(d.code!=='0')throw Error('upstream');bids=d.data[0].bids;asks=d.data[0].asks;asOf=Number(d.data[0].ts);}
    else {d=await getJSON('https://api.bybit.com/v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=25');if(d.retCode!==0)throw Error('upstream');bids=d.result.b;asks=d.result.a;asOf=Number(d.result.ts);}
    bids=levels(bids,'sell');asks=levels(asks);if(!bids.length||!asks.length||!(asOf>0)||asks[0].price<bids[0].price)throw Error('invalid book');
    return {id,ok:true,bids,asks,asOf,quote:'USDT',price:(bids[0].price+asks[0].price)/2,latency:Date.now()-t,timestampType:id==='Binance'?'received':'exchange'};
  }catch{return {id,ok:false,quote:'USDT',error:'sourceUnavailable',asOf:null};}
}
function hourlySlug(ts){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'long',day:'numeric',hour:'numeric',hour12:true}).formatToParts(new Date(ts));const v=k=>p.find(x=>x.type===k)?.value.toLowerCase();return `bitcoin-up-or-down-${v('month')}-${v('day')}-${v('hour')}${v('dayPeriod')}-et`;}
async function market(slug,frame){
  try{
    const list=await getJSON(`https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`,15000);const m=list[0];if(!m||m.closed)return null;
    const ids=typeof m.clobTokenIds==='string'?JSON.parse(m.clobTokenIds):m.clobTokenIds, outcomes=typeof m.outcomes==='string'?JSON.parse(m.outcomes):m.outcomes;
    if(ids?.length!==2||outcomes?.length!==2)return null;
    const ix=outcomes.findIndex(x=>x.toLowerCase()==='up'),iy=outcomes.findIndex(x=>x.toLowerCase()==='down');if(ix<0||iy<0)return null;
    const books=await Promise.all(ids.map(async token=>{try{const b=await getJSON(`https://clob.polymarket.com/book?token_id=${token}`);return {tokenId:String(b.asset_id),conditionId:b.market,asks:levels(b.asks),bids:levels(b.bids,'sell'),asOf:Number(b.timestamp)};}catch{return {tokenId:token,conditionId:m.conditionId,asks:[],bids:[],asOf:null};}}));
    return {id:m.id,slug,title:m.question,conditionId:m.conditionId,frame,endDate:m.endDate,active:m.active===true,closed:m.closed===true,acceptingOrders:m.acceptingOrders===true,negRisk:!!m.negRisk,feesEnabled:m.feesEnabled,feeSchedule:m.feeSchedule?{rate:Number(m.feeSchedule.rate),exponent:Number(m.feeSchedule.exponent)}:null,minSize:Number(m.orderMinSize)||5,up:books[ix],down:books[iy]};
  }catch{return null;}
}
async function polyMarkets(){
  const now=Date.now(),jobs=[];
  for(const frame of [5,15])for(const delta of [0,1]){const epoch=Math.floor(now/1000/(frame*60))*frame*60+delta*frame*60;jobs.push(market(`btc-updown-${frame}m-${epoch}`,`${frame}m`));}
  jobs.push(market(hourlySlug(Math.floor(now/3600000)*3600000),'1h'));
  return (await Promise.all(jobs)).filter(Boolean).sort((a,b)=>Date.parse(a.endDate)-Date.parse(b.endDate));
}
let snapshotPending=null,lastSnapshot=null;
async function snapshot(){
  if(lastSnapshot&&Date.now()-lastSnapshot.generatedAt<4500)return lastSnapshot;
  if(snapshotPending)return snapshotPending;
  snapshotPending=(async()=>{const [exchanges,markets]=await Promise.all([Promise.all(['Binance','OKX','Bybit'].map(exchange)),polyMarkets()]);return lastSnapshot={version:VERSION,generatedAt:Date.now(),exchanges,markets,pollSeconds:10,liveTrading:false};})();
  try{return await snapshotPending;}finally{snapshotPending=null;}
}
let signalSource='Binance';
async function sourceCandles(interval,source){
  if(!['1m','5m','15m','1h'].includes(interval))throw Error('invalid interval');
  let raw;
  if(source==='Binance')raw=await getJSON(`https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=500`,30000);
  else if(source==='OKX'){
    const url=`https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=${interval==='1h'?'1H':interval}`;
    const recent=await getJSON(url+'&limit=300',5000);if(recent.code!=='0'||!recent.data?.length)throw Error('historyUnavailable');
    const older=await getJSON(url+`&limit=200&after=${recent.data.at(-1)[0]}`,30000);if(older.code!=='0')throw Error('historyUnavailable');raw=[...recent.data,...older.data];
  }else{
    const minutes=({'1m':'1','5m':'5','15m':'15','1h':'60'})[interval];
    const data=await getJSON(`https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDT&interval=${minutes}&limit=500`,30000);if(data.retCode!==0)throw Error('historyUnavailable');raw=data.result.list;
  }
  const data=normalizeCandles(source,raw,interval);if(data.length<100)throw Error('historyUnavailable');
  return {source,symbol:'BTC/USDT',interval,closedOnly:true,data,asOf:data.at(-1).time};
}
const sourceOrder=()=>[signalSource,...['Binance','OKX','Bybit'].filter(x=>x!==signalSource)];
async function candles(interval){for(const source of sourceOrder()){try{return await sourceCandles(interval,source);}catch{}}throw Error('historyUnavailable');}
const execution=createExecutionService({getBook:()=>exchange('OKX')});
const marketFlow=startMarketFlow();
const flowTelemetry=setInterval(()=>{const f=marketFlow.snapshot();console.log(JSON.stringify({event:'public-flow',source:f.source,connected:f.connected,ready:f.ready,reason:f.reason,lastTradeAt:f.lastTradeAt,coverageStart:f.coverageStart,gaps:f.gaps,records:f.recording.records}));},60000);flowTelemetry.unref();
let signalsPending=null,signalsCache=null;
async function signalBoard(){
  if(signalsCache&&Date.now()-signalsCache.generatedAt<1000)return signalsCache;if(signalsPending)return signalsPending;
  signalsPending=(async()=>{
    // Flow, candles and execution book must belong to the same venue. The wider
    // market monitor retains its independent multi-venue fallback.
    const result=await Promise.allSettled(['1m','5m','15m'].map(tf=>sourceCandles(tf,'OKX'))),frames=Object.fromEntries(result.filter(x=>x.status==='fulfilled').map(x=>[x.value.interval,x.value.data]));
    const flow=marketFlow.snapshot(),liveBook=marketFlow.book(),book=liveBook&&Date.now()-liveBook.asOf<=5000?liveBook:await exchange('OKX');
    return signalsCache={generatedAt:Date.now(),source:'OKX',symbol:'BTC-USDT',history:frames,book,flow,signal:scalpSignal(frames,book,flow)};
  })();try{return await signalsPending;}finally{signalsPending=null;}
}
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try{
    const u=new URL(req.url,'http://localhost'),p=u.pathname;
    if(await execution.handle(req,res,u,json))return;
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'readOnlyAPI',message:'Real-money orders are not enabled.'});
    if(p==='/api/health'){const f=marketFlow.snapshot();return json(res,200,{ok:true,name:'Fainance Bot',version:VERSION,mode:'paper',execution:execution.summary(),flow:{source:f.source,connected:f.connected,ready:f.ready,reason:f.reason,coverageStart:f.coverageStart,lastTradeAt:f.lastTradeAt,gaps:f.gaps,recording:f.recording},time:Date.now()});}
    if(p==='/api/flow')return json(res,200,{flow:marketFlow.snapshot(),book:marketFlow.book()});
    if(p==='/api/flow/export'){res.setHeader('Content-Disposition','attachment; filename="fainance-okx-flow.json"');return json(res,200,marketFlow.export());}
    if(p==='/api/signals')return json(res,200,await signalBoard());
    if(p==='/api/market-board')return json(res,200,{...await marketBoard(),serverNow:Date.now()});
    if(p==='/api/snapshot')return json(res,200,await snapshot());
    if(p==='/api/candles') {try{return json(res,200,await candles(u.searchParams.get('interval')||'5m'));}catch{return json(res,503,{error:'historyUnavailable'});}}
    if(p.startsWith('/api/'))return json(res,404,{error:'notFound'});
    const relative=decodeURIComponent(p==='/'?'/index.html':p);const file=path.resolve(PUBLIC,'.'+relative);
    if(!file.startsWith(PUBLIC+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return json(res,404,{error:'notFound'});
    res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch{return json(res,500,{error:'serviceUnavailable'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Fainance Bot ${VERSION} on ${PORT}; public data + device-local paper trading`));
process.on('SIGTERM',()=>{clearInterval(flowTelemetry);marketFlow.stop();execution.close();server.close(()=>process.exit(0));});

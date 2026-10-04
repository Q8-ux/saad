// All volumes below are base BTC. No candle direction is used to infer trade side.
export const FLOW_VERSION='flow-1.0';
export const FLOW_FRESH_MS=5000;
export function normalizeTrade(r,receivedAt=Date.now()){
  const x={id:String(r.tradeId??''),time:Number(r.ts),price:Number(r.px),size:Number(r.sz),side:r.side,count:Number(r.count||1),receivedAt};
  if(r.instId!=='BTC-USDT'||!/^\d+$/.test(x.id)||!['buy','sell'].includes(x.side)||![x.time,x.price,x.size,x.count,receivedAt].every(Number.isFinite)||x.price<=0||x.size<=0||x.time<=0||x.count<1||x.time>receivedAt+3000)throw Error('invalidTrade');
  // OKX trades messages can aggregate fills: sz already contains their total.
  return x;
}
export function normalizeFlowBook(r,receivedAt=Date.now()){
  const side=(a,reverse)=>{
    if(!Array.isArray(a)||!a.length||a.length>5)throw Error('invalidBook');
    const v=a.map(x=>({price:Number(x[0]),size:Number(x[1])}));
    if(v.some((x,i)=>!Number.isFinite(x.price)||!Number.isFinite(x.size)||x.price<=0||x.size<=0||(i&&(reverse?x.price>=v[i-1].price:x.price<=v[i-1].price))))throw Error('invalidBook');return v;
  };
  const bids=side(r.bids,true),asks=side(r.asks,false),asOf=Number(r.ts);
  if(asks[0].price<bids[0].price||!Number.isFinite(asOf)||asOf<=0||asOf>receivedAt+3000)throw Error('invalidBook');
  return {id:'OKX',symbol:'BTC-USDT',ok:true,bids,asks,asOf,receivedAt,price:(bids[0].price+asks[0].price)/2,quote:'USDT',channel:'books5',timestampType:'exchange'};
}
export function deltaWindow(trades,start,end){
  const rows=trades.filter(t=>t.time>=start&&t.time<end).sort((a,b)=>a.time-b.time||a.receivedAt-b.receivedAt);
  let buy=0,sell=0;for(const t of rows){if(t.side==='buy')buy+=t.size;else sell+=t.size;}
  return {start,end,buy,sell,delta:buy-sell,volume:buy+sell,ratio:buy+sell?(buy-sell)/(buy+sell):0,events:rows.length,priceChangeBps:rows.length>1?(rows.at(-1).price/rows[0].price-1)*10000:0};
}
// Fixed UTC quarter-hour and fixed $25 bins; neither is selected after seeing a result.
export function volumeProfile(trades,{start,end,coverageStart,observedUntil,binSize=25,valueArea=.7}){
  if(!(binSize>0&&valueArea>0&&valueArea<=1))throw Error('profileConfig');
  const complete=coverageStart!==null&&coverageStart<=start&&observedUntil>=end;
  if(!complete)return {ready:false,start,end,binSize,valueArea,reason:'coverage'};
  const bins=new Map();let total=0;
  for(const t of trades){if(t.time<start||t.time>=end)continue;const k=Math.floor(t.price/binSize);bins.set(k,(bins.get(k)||0)+t.size);total+=t.size;}
  if(!total)return {ready:false,start,end,binSize,valueArea,reason:'noTrades'};
  const keys=[...bins.keys()].sort((a,b)=>a-b);let poc=keys[0];for(const k of keys)if(bins.get(k)>bins.get(poc))poc=k;
  let lo=poc,hi=poc,volume=bins.get(poc);const min=keys[0],max=keys.at(-1);
  // Include contiguous price bins around the POC, choosing the larger adjacent volume.
  if(max-min>20000)return {ready:false,start,end,binSize,valueArea,reason:'range'};
  while(volume<total*valueArea&&(lo>min||hi<max)){
    const left=lo>min?(bins.get(lo-1)||0):-1,right=hi<max?(bins.get(hi+1)||0):-1;
    if(right>left){hi++;volume+=Math.max(0,right);}else{lo--;volume+=Math.max(0,left);}
  }
  return {ready:true,start,end,binSize,valueArea,total,poc:(poc+.5)*binSize,val:lo*binSize,vah:(hi+1)*binSize,bins:keys.map(k=>({low:k*binSize,volume:bins.get(k)}))};
}
// Quote turnover / base volume yields the exact aggregate trade VWAP for closed bars.
// We require coverage from the declared anchor; there is no HLC3 fallback.
export function anchoredVWAP(candles,start,end,step=300000){
  const rows=(candles||[]).filter(c=>c.time>=start&&c.time<end);
  if(end<=start||!rows.length||rows[0].time!==start||rows.at(-1).time+step!==end||rows.some((c,i)=>!Number.isFinite(c.quoteVolume)||c.quoteVolume<0||!Number.isFinite(c.volume)||c.volume<0||(i&&c.time-rows[i-1].time!==step)))return {ready:false,start,end,value:null};
  const base=rows.reduce((s,c)=>s+c.volume,0),quote=rows.reduce((s,c)=>s+c.quoteVolume,0);
  return {ready:base>0,start,end,value:base>0?quote/base:null,volume:base,method:'quote-turnover/base-volume; closed bars'};
}
function sweep(rows,qty){let left=qty,gross=0;for(const r of rows||[]){if(!(r.price>0&&r.size>0))return null;const fill=Math.min(left,r.size);gross+=fill*r.price;left-=fill;if(left<=1e-12)return gross/qty;}return null;}
// Current-book round trip at an unchanged market, then two explicitly assumed
// adverse price allowances. The bid/ask sweeps already include the spread once.
export function executionCost(book,{notional=100,feeBps=10,allowanceBps=2}={}){
  if(!book?.ok||!book.asks?.length||!book.bids?.length||![notional,feeBps,allowanceBps].every(Number.isFinite)||notional<=0||feeBps<0||feeBps>=10000||allowanceBps<0||allowanceBps>=10000)return {ready:false,reason:'depth'};
  const ask=book.asks[0].price,bid=book.bids[0].price,mid=(ask+bid)/2,qty=notional/ask;
  if(!(bid>0&&ask>=bid))return {ready:false,reason:'depth'};
  const buy=sweep(book.asks,qty),sell=sweep(book.bids,qty);
  if(buy===null||sell===null)return {ready:false,reason:'depth',qty};
  const fee=feeBps/10000,allowance=allowanceBps/10000,entry=buy*(1+allowance),exit=sell*(1-allowance),cost=entry*(1+fee),proceeds=exit*(1-fee);
  return {ready:true,qty,notional,feeBps,allowanceBps,buyVWAP:buy,sellVWAP:sell,entry,exit,spreadBps:(ask-bid)/mid*10000,depthBps:Math.max(0,((buy-ask)+(bid-sell))/mid*10000),roundTripBps:(1-proceeds/cost)*10000,breakEvenMoveBps:(cost/proceeds-1)*10000,entryImpactBps:(buy/ask*(1+allowance)-1)*10000,exitImpactBps:(1-sell/bid*(1-allowance))*10000,method:'bid-ask-depth-plus-fees-plus-allowance; spread-included'};
}

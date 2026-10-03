// Deterministic, original indicators. Scores are rule confluence, not probabilities.
import {ema} from './engine.js';
export const SIGNAL_VERSION='confluence-1.0';
const last=a=>a.at(-1),mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
function rma(a,p){let v=mean(a.slice(0,p));for(let i=p;i<a.length;i++)v=(v*(p-1)+a[i])/p;return v;}
export function indicators(c){
  if(!Array.isArray(c)||c.length<100)return null;
  if(c.some((x,i)=>!['time','open','high','low','close','volume'].every(k=>Number.isFinite(x[k]))||x.low<=0||x.volume<0||x.high<Math.max(x.open,x.close)||x.low>Math.min(x.open,x.close)||(i&&x.time<=c[i-1].time)))return null;
  const closes=c.map(x=>x.close),price=last(closes),e20=last(ema(closes,20)),e50=last(ema(closes,50));
  const tr=[],gains=[],losses=[],plus=[],minus=[];
  for(let i=1;i<c.length;i++){const a=c[i],b=c[i-1],up=a.high-b.high,down=b.low-a.low,d=a.close-b.close;tr.push(Math.max(a.high-a.low,Math.abs(a.high-b.close),Math.abs(a.low-b.close)));gains.push(Math.max(d,0));losses.push(Math.max(-d,0));plus.push(up>down&&up>0?up:0);minus.push(down>up&&down>0?down:0);}
  const atr=rma(tr,14),gain=rma(gains,14),loss=rma(losses,14),rsi=gain+loss===0?50:loss===0?100:100-100/(1+gain/loss);
  let smTr=mean(tr.slice(0,14)),smPlus=mean(plus.slice(0,14)),smMinus=mean(minus.slice(0,14));const dx=[];
  for(let i=13;i<tr.length;i++){if(i>13){smTr=(smTr*13+tr[i])/14;smPlus=(smPlus*13+plus[i])/14;smMinus=(smMinus*13+minus[i])/14;}const p=smTr?100*smPlus/smTr:0,m=smTr?100*smMinus/smTr:0;dx.push(p+m?100*Math.abs(p-m)/(p+m):0);}
  const adx=rma(dx,14),fast=ema(closes,12),slow=ema(closes,26),macd=fast.map((v,i)=>v-slow[i]),macdSignal=ema(macd,9);
  const window=c.slice(-96),volume=window.reduce((s,x)=>s+x.volume,0),vwap=volume?window.reduce((s,x)=>s+(x.high+x.low+x.close)/3*x.volume,0)/volume:null;
  const mid=mean(closes.slice(-20)),sd=Math.sqrt(mean(closes.slice(-20).map(v=>(v-mid)**2))),avgVolume=mean(c.slice(-21,-1).map(x=>x.volume));
  const obvDelta=c.slice(-20).reduce((s,x,i,a)=>i?s+Math.sign(x.close-a[i-1].close)*x.volume:s,0);
  return {price,ema20:e20,ema50:e50,rsi,atr,atrPct:atr/price*100,adx,macd:last(macd),macdSignal:last(macdSignal),macdHist:last(macd)-last(macdSignal),vwap,bollMid:mid,bollUpper:mid+2*sd,bollLower:mid-2*sd,relativeVolume:avgVolume?last(c).volume/avgVolume:0,obvDelta,time:last(c).time};
}
export function bookMetrics(book){
  if(!book?.ok||!book.bids?.length||!book.asks?.length)return null;
  const bid=book.bids[0].price,ask=book.asks[0].price;
  if(!(ask>=bid&&bid>0))return null;
  const bv=book.bids.slice(0,10).reduce((s,x)=>s+x.price*x.size,0),av=book.asks.slice(0,10).reduce((s,x)=>s+x.price*x.size,0);
  return {bid,ask,mid:(bid+ask)/2,spreadBps:(ask-bid)/((ask+bid)/2)*10000,imbalance:bv+av?(bv-av)/(bv+av):0,bidDepth:bv,askDepth:av,asOf:book.asOf};
}
export function confluence(history,book,{now=Date.now(),feeBps=10,slippageBps=10}={}){
  const frames={};for(const [k,c] of Object.entries(history||{}))frames[k]=indicators(c);
  const a=frames['5m'],b=bookMetrics(book),blocks=[];
  if(!a)return {version:SIGNAL_VERSION,action:'wait',score:0,blocks:['history'],frames,book:b,checks:[],at:now};
  for(const [tf,ms] of [['5m',300000],['15m',900000],['1h',3600000]]){
    const c=history[tf],end=c?.at(-1)?.time+ms;
    if(!frames[tf]||!Number.isFinite(end)||end>now||now-end>ms+30000||c.slice(-100).some((x,i,z)=>i&&x.time-z[i-1].time!==ms))blocks.push('history');
  }
  if(!b||!Number.isFinite(b.asOf)||now-b.asOf>15000||b.asOf>now+3000)blocks.push('stale');
  if(b?.spreadBps>12)blocks.push('spread');
  if(a.adx<18)blocks.push('weakTrend');
  if(a.relativeVolume<0.8)blocks.push('lowVolume');
  if(a.atrPct>3)blocks.push('volatility');
  const bullish=a.ema20>a.ema50,side=bullish?'buy':'sell';
  const checks=[
    {key:'trend',weight:25,pass:bullish?a.price>a.ema20:a.price<a.ema20},
    {key:'vwap',weight:15,pass:a.vwap!==null&&(bullish?a.price>a.vwap:a.price<a.vwap)},
    {key:'momentum',weight:20,pass:bullish?a.macdHist>0&&a.rsi>=50&&a.rsi<=70:a.macdHist<0&&a.rsi<=50&&a.rsi>=30},
    {key:'volume',weight:15,pass:a.relativeVolume>=1&&(bullish?a.obvDelta>0:a.obvDelta<0)},
    {key:'alignment',weight:20,pass:['15m','1h'].every(k=>frames[k]&&(bullish?frames[k].ema20>frames[k].ema50:frames[k].ema20<frames[k].ema50))},
    {key:'depth',weight:5,pass:!!b&&b.spreadBps<=12&&(bullish?b.imbalance>-.2:b.imbalance<.2)}
  ];
  const score=checks.reduce((s,x)=>s+(x.pass?x.weight:0),0),entry=b?(side==='buy'?b.ask:b.bid):a.price,stopDistance=Math.max(a.atr*1.5,entry*.002);
  const costPct=(2*(feeBps+slippageBps)+(b?.spreadBps||0))/100,targetDistance=stopDistance*2.2,netTargetPct=targetDistance/entry*100-costPct;
  if(score<70)blocks.push('score');if(bullish&&!(netTargetPct>0))blocks.push('cost');
  return {version:SIGNAL_VERSION,at:now,action:blocks.length?'wait':side,direction:side,score,checks,blocks:[...new Set(blocks)],frames,book:b,entry,stop:bullish?entry-stopDistance:null,target:bullish?entry+targetDistance:null,stopDistance,targetDistance,costPct,netTargetPct:bullish?netTargetPct:null,feeBps,slippageBps,scoreMeaning:'rule-confluence-not-probability',sellMeaning:'reduce-owned-spot-only'};
}
// Chronological holdout of a simpler single-timeframe trend rule. No depth/MTF
// performance claim: historical order books are not present in candle data.
export function validateStrategy(c,{feeBps=10,slippageBps=10,capital=10000}={}){
  if(c.length<300||![feeBps,slippageBps,capital].every(Number.isFinite)||feeBps<0||slippageBps<0||capital<=0)throw Error('history');
  const start=Math.max(100,Math.floor(c.length*.7));let cash=capital,qty=0,cost=0,stop=0,target=0,peak=capital,drawdown=0;const trades=[];
  const close=(p,time,why)=>{const proceeds=qty*p*(1-slippageBps/10000)*(1-feeBps/10000);trades.push({time,pnl:proceeds-cost,reason:why});cash+=proceeds;qty=0;};
  for(let i=start;i<c.length;i++){
    const a=indicators(c.slice(0,i)),bar=c[i];
    if(qty){if(bar.open<=stop)close(bar.open,bar.time,'gap-stop');else if(bar.low<=stop)close(stop,bar.time,'stop');else if(bar.high>=target)close(target,bar.time,'target');else if(a.ema20<a.ema50)close(bar.open,bar.time,'trend');}
    else if(a.ema20>a.ema50&&a.price>a.vwap&&a.adx>=18&&a.rsi>=50&&a.rsi<=70&&a.relativeVolume>=.8){const entry=bar.open*(1+slippageBps/10000);cost=cash*.1;qty=cost/(entry*(1+feeBps/10000));cash-=cost;const distance=Math.max(a.atr*1.5,entry*.002);stop=entry-distance;target=entry+distance*2.2;if(bar.low<=stop)close(Math.min(bar.open,stop),bar.time,'stop');else if(bar.high>=target)close(target,bar.time,'target');}
    const equity=cash+qty*bar.close*(1-feeBps/10000);peak=Math.max(peak,equity);drawdown=Math.max(drawdown,(peak-equity)/peak*100);
  }
  if(qty)close(last(c).close,last(c).time,'end');
  drawdown=Math.max(drawdown,(peak-cash)/peak*100);
  const benchmark=capital/(c[start].open*(1+slippageBps/10000)*(1+feeBps/10000))*last(c).close*(1-slippageBps/10000)*(1-feeBps/10000);
  return {version:SIGNAL_VERSION,from:c[start].time,to:last(c).time,bars:c.length-start,warmup:start,capital,equity:cash,returnPct:(cash/capital-1)*100,benchmarkPct:(benchmark/capital-1)*100,drawdown,tradeCount:trades.length,winRate:trades.length?trades.filter(t=>t.pnl>0).length/trades.length*100:null,trades,feeBps,slippageBps,scope:'5m-trend-only-no-orderbook-no-mtf',passed:null};
}

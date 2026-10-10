// Saad Trading Path (STP) — read-only opportunity scanner.
// Input: completed chronological OHLCV bars. No order placement.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
export function scanOpportunity(symbol,bars,{benchmarkReturn=null}={}){
 if(!Array.isArray(bars)||bars.length<221)return {symbol,status:'INSUFFICIENT_DATA',reasons:['Need 221 completed bars']};
 const b=bars.map(x=>({open:Number(x.open),high:Number(x.high),low:Number(x.low),close:Number(x.close),volume:Number(x.volume),time:x.time}));
 if(b.some(x=>![x.open,x.high,x.low,x.close,x.volume].every(finite)||x.close<=0||x.volume<0||x.high<Math.max(x.open,x.close,x.low)||x.low>Math.min(x.open,x.close,x.high)))return {symbol,status:'INVALID_DATA',reasons:['Invalid OHLCV']};
 if(b.some((x,i)=>i>0&&String(x.time)<=String(b[i-1].time)))return {symbol,status:'INVALID_DATA',reasons:['Unsorted or duplicate timestamps']};
 const closes=b.map(x=>x.close), volumes=b.map(x=>x.volume);
 const ema=(period)=>{let v=mean(closes.slice(0,period));for(let i=period;i<closes.length;i++)v=(closes[i]*2/(period+1))+(v*(period-1)/(period+1));return v};
 const e20=ema(20),e50=ema(50),e200=ema(200),last=b.at(-1),prev=b.at(-2);
 const prevVol=mean(volumes.slice(-21,-1));const rvol=prevVol>0?last.volume/prevVol:null;
 const hi20=Math.max(...b.slice(-21,-1).map(x=>x.high));
 const hi52=Math.max(...b.slice(-221,-1).map(x=>x.high));
 const gains=[],losses=[];for(let i=b.length-14;i<b.length;i++){const d=closes[i]-closes[i-1];gains.push(Math.max(d,0));losses.push(Math.max(-d,0));}
 const ag=mean(gains),al=mean(losses),rsi=al===0?(ag===0?50:100):100-100/(1+ag/al);
 const trend=last.close>e20&&e20>e50&&e50>e200;
 const momentum=rsi>=55&&last.close<=e20*1.05&&last.close>=hi52*.9;
 const breakout=last.close>hi20&&rvol!==null&&rvol>=2;
 const relative=benchmarkReturn===null?null:(last.close/closes.at(-21)-1)>benchmarkReturn;
 const eligible=trend&&momentum&&(relative===null||relative);
 const status=eligible&&breakout?'BREAKOUT':eligible?'WATCH':'FILTERED';
 const tr=b.slice(-14).map((x,i,a)=>i===0?x.high-x.low:Math.max(x.high-x.low,Math.abs(x.high-a[i-1].close),Math.abs(x.low-a[i-1].close)));
 const atr=mean(tr);
 const entry=last.close,stop=entry-1.5*atr,risk=entry-stop;
 return {symbol,status,asOf:last.time,source:'COMPLETED_BARS',metrics:{ema20:e20,ema50:e50,ema200:e200,rsi14:rsi,rvol20:rvol,high20Previous:hi20,atr14:atr,relativeStrengthPass:relative},levels:status==='BREAKOUT'&&risk>0?{entry,stopLoss:stop,tp1:entry+risk,tp2:entry+2*risk,tp3:entry+3*risk}:null,reasons:[trend?'Trend aligned':'Trend not aligned',momentum?'Momentum passed':'Momentum not passed',breakout?'Breakout with volume':'No confirmed breakout',relative===null?'Benchmark not supplied':relative?'Relative strength passed':'Relative strength failed'],disclaimer:'Research candidate only; not an execution instruction'};
}

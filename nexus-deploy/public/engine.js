// Original implementation. Shared, deterministic financial calculations.
export const VERSION = '2.0.0';
export const DEFAULT_RISK = { maxTrade: 250, maxExposure: 2000, dailyLoss: 200, minEdge: 0.5, slippageBps: 10, spotFeeBps: 10, stopLossPct: 2, takeProfitPct: 4, maxPositions: 8 };
export const valid = x => Number.isFinite(Number(x));
export const round = (x, n = 8) => Number(x.toFixed(n));
export function levels(rows, side = 'buy') {
  return (Array.isArray(rows) ? rows : []).map(r => ({ price: Number(r.price ?? r[0]), size: Number(r.size ?? r[1]) })).filter(r => r.price > 0 && r.size > 0 && valid(r.price) && valid(r.size)).sort((a,b) => side === 'buy' ? a.price-b.price : b.price-a.price);
}
export function fillBook(rows, qty, side = 'buy', slippageBps = 0, feeBps = 0, schedule = null) {
  if (!(qty > 0) || !valid(qty) || !(slippageBps >= 0) || !(feeBps >= 0)) return null;
  let remaining = qty, gross = 0, fees = 0, worst = 0;
  for (const row of levels(rows,side)) {
    const take = Math.min(row.size, remaining), price = row.price * (1 + (side === 'buy' ? 1 : -1) * slippageBps / 10000);
    if (!(price > 0) || (schedule && price >= 1)) return null;
    gross += take * price;
    fees += schedule ? take * schedule.rate * Math.pow(price * (1-price),schedule.exponent) : take * price * feeBps / 10000;
    remaining -= take; worst = price;
    if (remaining < 1e-9) break;
  }
  if (remaining > Math.max(1e-9,qty*1e-10)) return null;
  fees = Math.ceil(fees * 1e5 - 1e-9) / 1e5;
  return {qty, gross, fees, vwap:gross/qty, worst, total: gross + (side === 'buy' ? fees : -fees)};
}
export function pairQuote(m, qty = 100, slippageBps = 10, now = Date.now()) {
  const fail = reason => ({ ok:false, reason, qty });
  if (!m?.conditionId || !m.up || !m.down || m.up.tokenId === m.down.tokenId || m.up.conditionId !== m.conditionId || m.down.conditionId !== m.conditionId || m.negRisk) return fail('invalidPair');
  if (!m.active || m.closed || !m.acceptingOrders || !Number.isFinite(Date.parse(m.endDate)) || Date.parse(m.endDate) <= now + 15000) return fail('expired');
  if (!m.up.asOf || !m.down.asOf || now-m.up.asOf>20000 || now-m.down.asOf>20000 || m.up.asOf>now+5000 || m.down.asOf>now+5000) return fail('stale');
  const schedule = m.feesEnabled === false ? {rate:0,exponent:1} : m.feeSchedule;
  if (!schedule || !Number.isFinite(schedule.rate) || schedule.rate<0 || !Number.isFinite(schedule.exponent) || schedule.exponent!==1) return fail('feeUnknown');
  if (!(qty>0) || qty < (m.minSize || 1)) return fail('minSize');
  const up = fillBook(m.up.asks,qty,'buy',slippageBps,0,schedule), down = fillBook(m.down.asks,qty,'buy',slippageBps,0,schedule);
  if (!up || !down) return fail('depth');
  const total=up.total+down.total, net=qty-total;
  return {ok:true,qty,up,down,total,fees:up.fees+down.fees,payout:qty,net,edgePct:net/total*100,coverage:100};
}
export function crossQuotes(exchanges, qty, feeBps, slippageBps, now=Date.now()) {
  const active=exchanges.filter(e=>e.ok&&now-e.asOf<20000&&e.quote==='USDT');const out=[];
  for(const buy of active) for(const sell of active) if(buy.id!==sell.id) {
    const a=fillBook(buy.asks,qty,'buy',slippageBps,feeBps),b=fillBook(sell.bids,qty,'sell',slippageBps,feeBps);
    if(a&&b)out.push({buy:buy.id,sell:sell.id,qty,cost:a.total,proceeds:b.total,net:b.total-a.total,edgePct:(b.total/a.total-1)*100,fees:a.fees+b.fees});
  }
  return out.sort((a,b)=>b.net-a.net);
}
export function ema(values, period) {const k=2/(period+1);let e=values[0]||0;return values.map(v=>(e=v*k+e*(1-k)));}
export function rsi(values, period=14) {
  if(values.length<=period)return 50;
  let g=0,l=0;for(let i=values.length-period;i<values.length;i++){const d=values[i]-values[i-1];g+=Math.max(0,d);l+=Math.max(0,-d);}
  return g+l===0?50:l===0?100:100-100/(1+g/l);
}
function features(c,i) {const p=c[i].close;return [1, Math.tanh((p/c[i-1].close-1)*100),Math.tanh((p/c[i-5].close-1)*50),Math.tanh((p/c[i-20].close-1)*20),(rsi(c.slice(i-14,i+1).map(x=>x.close))-50)/50];}
const sigmoid=x=>1/(1+Math.exp(-Math.max(-20,Math.min(20,x))));
export function trainModel(candles) {
  if(candles.length<150)return null;
  const split=Math.floor(candles.length*0.65),w=[0,0,0,0,0];
  for(let epoch=0;epoch<100;epoch++)for(let i=20;i<split-1;i++){
    const x=features(candles,i),y=Number(candles[i+1].close>candles[i].close),pred=sigmoid(w.reduce((s,v,j)=>s+v*x[j],0));
    for(let j=0;j<w.length;j++)w[j]-=0.018*((pred-y)*x[j]+0.006*w[j]);
  }
  const predict=i=>sigmoid(w.reduce((s,v,j)=>s+v*features(candles,i)[j],0));
  let correct=0,ups=0,total=0;for(let i=split;i<candles.length-1;i++){const y=candles[i+1].close>candles[i].close;correct+=Number((predict(i)>.5)===y);ups+=Number(y);total++;}
  return {weights:w,split,trainCount:split-21,testCount:total,accuracy:correct/total,baseline:Math.max(ups,total-ups)/total,probability:predict(candles.length-1),predict};
}
export function analyze(c) {
  if(c.length<30)return null;const close=c.map(x=>x.close),fast=ema(close,9).at(-1),slow=ema(close,21).at(-1),strength=rsi(close),last=close.at(-1);
  return {fast,slow,rsi:strength,trend:fast>slow?'up':'down',signal:fast>slow&&strength<70?'buy':fast<slow?'sell':'wait',last,model:trainModel(c)};
}
export function backtest(c,options={}) {
  const {capital=10000,feeBps=10,slippageBps=10,strategy='trend'}=options;
  if(c.length<60||!valid(capital)||capital<=0||feeBps<0||feeBps>200||slippageBps<0||slippageBps>500) throw Error('insufficientHistory');
  const fast=ema(c.map(x=>x.close),9),slow=ema(c.map(x=>x.close),21),model=strategy==='ml'?trainModel(c):null;
  if(strategy==='ml'&&!model)throw Error('insufficientHistory');
  const start=model?model.split:30;let cash=capital,qty=0,entry=0,peak=capital,drawdown=0;const trades=[],curve=[];
  const closePosition=(price,time)=>{const proceeds=qty*price*(1-feeBps/10000);trades.push({time,entry,exit:price,pnl:proceeds-entryCost,qty});cash+=proceeds;qty=0;};let entryCost=0;
  for(let i=start;i<c.length;i++) {
    const j=i-1; // decision uses previous CLOSED candle, execution uses next candle open
    const score=model?model.predict(j):null,strength=rsi(c.slice(0,i).map(x=>x.close));
    const buy=strategy==='mean'?strength<30:strategy==='ml'?score>.56:fast[j]>slow[j];
    const sell=strategy==='mean'?strength>60:strategy==='ml'?score<.48:fast[j]<slow[j];
    if(qty&&sell)closePosition(c[i].open*(1-slippageBps/10000),c[i].time);
    else if(!qty&&buy){entry=c[i].open*(1+slippageBps/10000);entryCost=cash*.2;qty=entryCost/(entry*(1+feeBps/10000));cash-=entryCost;}
    const equity=cash+qty*c[i].close*(1-feeBps/10000);peak=Math.max(peak,equity);drawdown=Math.max(drawdown,(peak-equity)/peak*100);curve.push({time:c[i].time,value:equity});
  }
  if(qty)closePosition(c.at(-1).close*(1-slippageBps/10000),c.at(-1).time);
  curve[curve.length-1].value=cash;peak=Math.max(peak,cash);drawdown=Math.max(drawdown,(peak-cash)/peak*100);
  return {assumptions:{feeBps,slippageBps,strategy,allocationPct:20},capital,equity:cash,pnl:cash-capital,returnPct:(cash/capital-1)*100,drawdown,winRate:trades.length?trades.filter(t=>t.pnl>0).length/trades.length*100:null,trades,curve,start:c[start].time,end:c.at(-1).time,model:model?{accuracy:model.accuracy,baseline:model.baseline,trainCount:model.trainCount,testCount:model.testCount}:null};
}
export function newWallet(){return {version:2,initial:10000,cash:10000,positions:[],trades:[],events:[],risk:{...DEFAULT_RISK},halted:false,auto:false,createdAt:Date.now()};}
export function exposure(w){return w.positions.reduce((s,p)=>s+p.cost,0);}
export function riskCheck(w,cost,now=Date.now()) {
  if(w.halted)return 'halted';if(!valid(cost)||cost<=0)return 'invalidAmount';
  if(cost>w.risk.maxTrade+1e-8)return 'tradeLimit';if(cost>w.cash+1e-8)return 'balance';
  if(exposure(w)+cost>w.risk.maxExposure+1e-8)return 'exposureLimit';if(w.positions.length>=w.risk.maxPositions)return 'positionLimit';
  const start=new Date(now).setUTCHours(0,0,0,0),pnl=w.trades.filter(t=>t.closedAt>=start).reduce((s,t)=>s+t.pnl,0);
  if(pnl<=-w.risk.dailyLoss)return 'dailyLoss';return null;
}
export function openPaper(w,position,now=Date.now()) {
  const error=riskCheck(w,position.cost,now);if(error)throw Error(error);
  if(!(position.qty>0)||!valid(position.qty))throw Error('invalidAmount');
  w.cash=round(w.cash-position.cost);w.positions.push({...position,id:crypto.randomUUID(),openedAt:now});return w.positions.at(-1);
}
export function closePaper(w,id,proceeds,now=Date.now(),reason='manual') {
  const p=w.positions.find(x=>x.id===id);if(!p||!valid(proceeds)||proceeds<0)throw Error('invalidAmount');
  w.cash=round(w.cash+proceeds);w.positions=w.positions.filter(x=>x.id!==id);const t={...p,closedAt:now,proceeds,pnl:round(proceeds-p.cost),reason};w.trades.unshift(t);return t;
}
export function makerQuote(mid,spreadBps,inventoryPct,tick=0.01) {
  if(!(mid>0)||!(spreadBps>0)||!(tick>0)||!valid(inventoryPct))return null;
  const skew=Math.max(-1,Math.min(1,inventoryPct/100))*spreadBps/20000,center=mid*(1-skew),half=mid*spreadBps/20000;
  const bid=Math.floor((center-half)/tick)*tick,ask=Math.ceil((center+half)/tick)*tick;
  return {bid,ask,spread:ask-bid,center};
}

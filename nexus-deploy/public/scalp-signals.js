import {ema} from './engine.js';
import {indicators,bookMetrics} from './signals.js';
import {anchoredVWAP,executionCost,FLOW_FRESH_MS} from './order-flow.js';
export const SCALP_VERSION='orderflow-1.0';
const intervals={'1m':60000,'5m':300000,'15m':900000};
const last=a=>a?.at(-1);
function frame(c){const a=indicators(c);if(!a)return null;return {...a,ema9:last(ema(c.map(x=>x.close),9)),ema21:last(ema(c.map(x=>x.close),21))};}
function historyValid(c,step,now){return !!c?.length&&last(c).time+step<=now&&now-(last(c).time+step)<=step+5000&&!c.slice(-100).some((x,i,z)=>i&&x.time-z[i-1].time!==step);}
// The level uses only the 20 bars BEFORE the breakout bar. A subsequent closed
// 1m retest is required. Never allow the breakout's own minute candles as a retest.
export function findSetup(five,one,atr){
  if(!five?.length||!one?.length||!(atr>0))return null;
  for(let i=five.length-1;i>=Math.max(20,five.length-3);i--){
    const bar=five[i],before=five.slice(i-20,i),high=Math.max(...before.map(x=>x.high)),low=Math.min(...before.map(x=>x.low));
    const side=bar.close>high?'buy':bar.close<low?'sell':null;if(!side)continue;
    const level=side==='buy'?high:low,closedAt=bar.time+300000,entryBar=last(one),tolerance=atr*.2;
    const retest=entryBar.time>=closedAt&&entryBar.time+60000<=closedAt+900000&&entryBar.low<=level+tolerance&&entryBar.high>=level-tolerance&&(side==='buy'?entryBar.close>level&&entryBar.close<=level+atr*.6:entryBar.close<level&&entryBar.close>=level-atr*.6);
    const average=before.reduce((s,x)=>s+x.volume,0)/20;
    return {id:`${SCALP_VERSION}:${bar.time}:${side}`,side,level,levelFrom:before[0].time,breakoutAt:bar.time,closedAt,retest,retestAt:retest?entryBar.time:null,relativeVolume:average>0?bar.volume/average:0};
  }return null;
}
export function scalpSignal(history,book,flow,{now=Date.now(),feeBps=10,allowanceBps=2,notional=100,maxSlippageBps=15,maxSpreadBps=12}={}){
  const frames=Object.fromEntries(Object.entries(intervals).map(([tf])=>[tf,frame(history?.[tf])])),a=frames['5m'],b=bookMetrics(book),blocks=[];
  for(const [tf,step] of Object.entries(intervals))if(!frames[tf]||!historyValid(history?.[tf],step,now))blocks.push('history');
  if(book?.id!=='OKX'||flow?.source!=='OKX'||flow?.symbol!=='BTC-USDT')blocks.push('source');
  if(!b||!Number.isFinite(b.asOf)||now-b.asOf>FLOW_FRESH_MS||b.asOf>now+3000)blocks.push('stale');
  if(!flow?.connected||!flow.ready||!flow.delta1m?.ready||!Number.isFinite(flow.lastTradeAt)||now-flow.lastTradeAt>FLOW_FRESH_MS||flow.lastTradeAt>now+3000||now-flow.asOf>FLOW_FRESH_MS)blocks.push('flowCoverage');
  const end=Math.floor(now/300000)*300000,day=Math.floor(now/86400000)*86400000,anchor=Math.floor(now/14400000)*14400000;
  const dailyVWAP=anchoredVWAP(history?.['5m'],day,end),anchorVWAP=anchoredVWAP(history?.['5m'],anchor,end);
  const setup=a?findSetup(history?.['5m'],history?.['1m'],a.atr):null,side=setup?.side||'buy',sign=side==='buy'?1:-1;
  const price=b?.mid??a?.price,delta=flow?.delta1m;
  const absorption=!!delta?.ready&&sign*delta.ratio>=.2&&sign*delta.priceChangeBps<=0;
  const cost=executionCost(book,{feeBps,allowanceBps,notional});
  const distance=a&&price?Math.max(a.atr*1.5,price*.002):null,targetDistance=distance?distance*2.2:null;
  // A conditional parallel shift in the current book, not a return forecast.
  const grossTargetPct=targetDistance&&price?targetDistance/price*100:null;
  const netTargetPct=cost.ready&&grossTargetPct!==null?((1+grossTargetPct/100)*(1-cost.roundTripBps/10000)-1)*100:null;
  const checks=[
    {key:'flow',weight:30,pass:!!delta?.ready&&sign*delta.ratio>=.08&&!absorption},
    {key:'liquidity',weight:20,pass:cost.ready&&!!b&&b.spreadBps<=maxSpreadBps&&cost.entryImpactBps<=maxSlippageBps&&cost.exitImpactBps<=maxSlippageBps},
    {key:'vwap',weight:15,pass:dailyVWAP.ready&&anchorVWAP.ready&&sign*(price-dailyVWAP.value)>0&&sign*(price-anchorVWAP.value)>0},
    {key:'volume',weight:15,pass:!!setup&&setup.relativeVolume>=1.2},
    {key:'retest',weight:15,pass:!!setup?.retest},
    {key:'ema',weight:5,pass:!!a&&sign*(a.ema9-a.ema21)>0}
  ];
  const blockFor={flow:absorption?'absorption':'flowDirection',liquidity:cost.ready?'liquidity':'depth',vwap:dailyVWAP.ready&&anchorVWAP.ready?'vwapPosition':'vwapCoverage',volume:'lowVolume',retest:setup?'retest':'setup',ema:'trendFilter'};
  for(const c of checks)if(!c.pass)blocks.push(blockFor[c.key]);
  if(a?.atrPct>3)blocks.push('volatility');
  if(!(netTargetPct>0))blocks.push('cost');
  const previousDay=(history?.['15m']||[]).filter(c=>c.time>=day-86400000&&c.time<day);
  const context={previousDayHigh:previousDay.length===96&&previousDay.every((c,i)=>c.time===day-86400000+i*900000)?Math.max(...previousDay.map(x=>x.high)):null,previousDayLow:previousDay.length===96&&previousDay.every((c,i)=>c.time===day-86400000+i*900000)?Math.min(...previousDay.map(x=>x.low)):null,price15m:frames['15m']?.price||null};
  const entry=cost.ready?(side==='buy'?cost.entry:cost.exit):null;
  return {version:SCALP_VERSION,at:now,action:blocks.length?'wait':side,direction:side,score:checks.reduce((s,c)=>s+(c.pass?c.weight:0),0),checks,blocks:[...new Set(blocks)],frames,book:b,setup,context,dailyVWAP,anchorVWAP,cost,flow,absorption,entry,stop:entry&&distance&&side==='buy'?entry-distance:null,target:entry&&distance&&side==='buy'?entry+targetDistance:null,stopDistance:distance,targetDistance,costPct:cost.ready?cost.roundTripBps/100:null,netTargetPct:side==='buy'?netTargetPct:null,feeBps,allowanceBps,scoreMeaning:'rule-completion-not-probability',sellMeaning:'reduce-owned-spot-only'};
}

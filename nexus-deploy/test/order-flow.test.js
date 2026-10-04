import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTrade,normalizeFlowBook,deltaWindow,volumeProfile,anchoredVWAP,executionCost} from '../public/order-flow.js';
import {FlowBuffer} from '../lib/market-flow.js';
import {scalpSignal,findSetup} from '../public/scalp-signals.js';
import {normalizeCandles} from '../public/market-data.js';
import {newExecution,createOrder,simulateIOC} from '../public/execution-core.js';
const base=Date.UTC(2026,9,4,12),raw=(id,time,side='buy',size=1)=>({instId:'BTC-USDT',tradeId:String(id),ts:String(time),px:'100',sz:String(size),side,count:'3'});

test('actual aggressor volume is counted once, including aggregated fills and duplicate messages',()=>{
  let now=base;const f=new FlowBuffer({clock:()=>now});f.connect();f.addTrades([raw(1,now)]);f.addTrades([raw(1,now)]);now+=1000;f.addTrades([raw(2,now,'sell',.25)]);now++;
  const q=f.snapshot();assert.equal(q.cvd,.75);assert.equal(q.delta1m.delta,.75);assert.equal(q.retainedTrades,2);assert.equal(q.ready,false);
  assert.equal(normalizeTrade(raw(1,now),now).size,1);assert.throws(()=>normalizeTrade({...raw(3,now),side:'unknown'},now));
});
test('one-minute coverage warms, then reconnect, long silence and stale trades fail closed',()=>{
  let now=base;const f=new FlowBuffer({clock:()=>now});f.connect();for(let i=0;i<=12;i++){now=base+i*5000;f.addTrades([raw(i+1,now)]);}now++;
  assert.equal(f.snapshot().ready,true);now+=6000;assert.equal(f.snapshot().ready,false);
  f.disconnect();assert.equal(f.snapshot().connected,false);f.connect();assert.equal(f.snapshot().cvd,0);assert.equal(f.snapshot().ready,false);assert.equal(f.snapshot().gaps,1);
  f.addTrades([raw(99,now)]);now+=16000;f.addTrades([raw(100,now)]);assert.equal(f.snapshot().ready,false);assert.equal(f.snapshot().gaps,2);assert.equal(f.snapshot().cvd,1);
  now+=1000;f.addTrades([raw(101,now-6000)]);assert.equal(f.snapshot().reason,'lateTrade');assert.equal(f.snapshot().cvd,0);
});
test('bounded recording reports eviction and never extends retained coverage into missing trades',()=>{
  let now=base;const f=new FlowBuffer({clock:()=>now,maxTrades:2,maxRecords:3});f.connect();for(let i=0;i<5;i++){now+=1000;f.addTrades([raw(i+1,now)]);}
  assert.equal(f.snapshot().cvd,5);assert.equal(f.snapshot().retainedTrades,2);assert.ok(f.snapshot().coverageStart>base+3000);assert.equal(f.export().records.length,3);assert.equal(f.export().dropped,3);
});
test('books5 full snapshots reject crossed, malformed and unordered levels',()=>{
  const b={ts:String(base),bids:[['99','2']],asks:[['100','3']]};assert.equal(normalizeFlowBook(b,base).price,99.5);
  assert.throws(()=>normalizeFlowBook({...b,bids:[['101','2']]},base));assert.throws(()=>normalizeFlowBook({...b,asks:[['100','3'],['99','1']]},base));
});
test('fixed-period volume profile requires full observed coverage and excludes other periods',()=>{
  const rows=[{time:base,price:100,size:6},{time:base+1,price:125,size:3},{time:base+2,price:150,size:1},{time:base+900000,price:500,size:999}];
  const options={start:base,end:base+900000,coverageStart:base,observedUntil:base+900000};
  assert.equal(volumeProfile(rows,{...options,coverageStart:base+1}).ready,false);
  const p=volumeProfile(rows,options);assert.equal(p.total,10);assert.equal(p.poc,112.5);assert.equal(p.val,100);assert.equal(p.vah,150);
});
test('UTC anchor VWAP uses actual quote turnover, requires no gaps and never substitutes HLC3',()=>{
  const c=[{time:base,volume:2,quoteVolume:202},{time:base+300000,volume:3,quoteVolume:306}];
  assert.equal(anchoredVWAP(c,base,base+600000).value,101.6);
  assert.equal(anchoredVWAP(c.slice(1),base,base+600000).ready,false);
  assert.equal(anchoredVWAP([{...c[0],quoteVolume:null},c[1]],base,base+600000).ready,false);
  assert.equal(anchoredVWAP(c,base,base+900000).ready,false);
  const r=['0','100','110','90','105','2','2','202','1'];assert.equal(normalizeCandles('OKX',[r],'5m',600000)[0].quoteVolume,202);
});
test('round-trip sweep counts spread once; depth and assumed allowance are separate',()=>{
  const book={ok:true,bids:[{price:99,size:10}],asks:[{price:101,size:10}]};
  const c=executionCost(book,{notional:101,feeBps:0,allowanceBps:0});assert.ok(Math.abs(c.roundTripBps-(1-99/101)*10000)<1e-9);assert.equal(c.spreadBps,200);assert.equal(c.depthBps,0);
  const deep=executionCost({...book,asks:[{price:101,size:.5},{price:103,size:.5}]},{notional:101,feeBps:10,allowanceBps:2});assert.equal(deep.buyVWAP,102);assert.equal(deep.depthBps,100);assert.ok(deep.roundTripBps>c.roundTripBps);
  assert.equal(executionCost({...book,asks:[{price:101,size:.1}]},{notional:101}).ready,false);
});
test('paper fills and cost model use the same allowance without spending the whole limit budget',()=>{
  const book={id:'OKX',ok:true,asOf:base,bids:[{price:99.99,size:10}],asks:[{price:100,size:10}]};const state=newExecution(base);
  const intent={id:'a'.repeat(32),symbol:'BTC-USDT',side:'buy',qty:.5,limit:100.15,stop:98,target:105};createOrder(state,intent,book,base);simulateIOC(state,intent.id,book,base);
  const cost=executionCost(book,{notional:50,feeBps:10,allowanceBps:2});assert.equal(state.orders[0].gross/.5,cost.entry);assert.ok(cost.entry<100.15);
});
function scenario(){
  const now=base+7*60000+1000,history={};for(const [tf,step] of [['1m',60000],['5m',300000],['15m',900000]]){const end=Math.floor(now/step)*step;history[tf]=Array.from({length:500},(_,i)=>({time:end-(500-i)*step,open:100,high:100.5,low:99.5,close:100,volume:10,quoteVolume:1000}));}
  Object.assign(history['5m'].at(-1),{close:101.2,high:101.3,volume:30,quoteVolume:3012});Object.assign(history['1m'].at(-1),{open:100.5,high:100.8,low:100.48,close:100.6,quoteVolume:1006});
  const book={id:'OKX',symbol:'BTC-USDT',ok:true,asOf:now,bids:[{price:100.59,size:10}],asks:[{price:100.6,size:10}]};
  const flow={source:'OKX',symbol:'BTC-USDT',connected:true,asOf:now,lastTradeAt:now,ready:true,delta1m:{ready:true,ratio:.5,priceChangeBps:4}};
  return {now,history,book,flow};
}
test('entry requires a later 1m retest of a level defined before the 5m breakout',()=>{
  const {history}=scenario(),setup=findSetup(history['5m'],history['1m'],1);assert.equal(setup.level,100.5);assert.equal(setup.retest,true);
  const oldMinute=[{...history['1m'].at(-1),time:setup.closedAt-60000}];assert.equal(findSetup(history['5m'],oldMinute,1).retest,false);
  history['5m'].at(-1).close=100;assert.equal(findSetup(history['5m'],history['1m'],1),null);
});
test('flow-first candidate fails on estimated/missing flow, mixed venue, stale source, absorption or missing VWAP',()=>{
  const {now,history,book,flow}=scenario();const good=scalpSignal(history,book,flow,{now});assert.equal(good.action,'buy',JSON.stringify(good.blocks));assert.equal(good.score,100);
  for(const patch of [{connected:false},{ready:false},{source:'Binance'},{asOf:now-6000},{lastTradeAt:now-6000}])assert.equal(scalpSignal(history,book,{...flow,...patch},{now}).action,'wait');
  const absorbed=scalpSignal(history,book,{...flow,delta1m:{...flow.delta1m,priceChangeBps:-1}},{now});assert.ok(absorbed.blocks.includes('absorption'));
  assert.ok(scalpSignal(history,{...book,id:'Bybit'},flow,{now}).blocks.includes('source'));
  const missing=structuredClone(history);for(const c of missing['5m'])c.quoteVolume=null;assert.ok(scalpSignal(missing,book,flow,{now}).blocks.includes('vwapCoverage'));
});
test('minute freshness and missing OHLC intervals block an otherwise valid candidate',()=>{
  const {now,history,book,flow}=scenario();history['1m'].splice(-10,1);assert.ok(scalpSignal(history,book,flow,{now}).blocks.includes('history'));
  assert.equal(deltaWindow([{time:1,price:100,size:1,side:'buy'},{time:2,price:99,size:2,side:'sell'}],1,2).delta,1);
});

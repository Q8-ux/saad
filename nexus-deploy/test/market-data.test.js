import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTicker,observationState} from '../public/market-data.js';
const now=Date.now();
const binance={symbol:'BTCUSDT',lastPrice:'100',bidPrice:'99',askPrice:'101',openPrice:'80',highPrice:'105',lowPrice:'78',volume:'10',quoteVolume:'900',priceChangePercent:'25',closeTime:now};
test('normalization preserves upstream last price, currency and timestamps',()=>{const q=normalizeTicker('Binance',binance,{receivedAt:now+30});assert.equal(q.last,100);assert.equal(q.changePct,25);assert.equal(q.volumeQuote,900);assert.equal(q.sourceAsOf,now);assert.equal(q.receivedAt,now+30);assert.equal(q.quote,'USDT');assert.equal(q.timestampKind,'statistics-window-end');assert.equal(q.spread,2);});
test('refreshing a response cannot make an old source timestamp fresh',()=>{const q=normalizeTicker('Binance',{...binance,closeTime:now-60000},{receivedAt:now});assert.equal(observationState(q,now),'stale');q.sourceAsOf=now;assert.equal(observationState(q,now),'fresh');assert.equal(observationState(q,now+16000),'stale');});
test('missing and implausibly future timestamps are not represented as live',()=>{const q=normalizeTicker('Binance',{...binance,closeTime:null},{receivedAt:now});assert.equal(observationState(q,now),'unverified');q.sourceAsOf=now+10000;assert.equal(observationState(q,now),'unverified');assert.equal(observationState({ok:false},now),'unavailable');});
test('missing, malformed or crossed quote values fail rather than inventing zero prices',()=>{for(const patch of [{lastPrice:null},{bidPrice:''},{askPrice:'bad'},{volume:null},{highPrice:'70'},{bidPrice:'102'},{symbol:'BTCUSD'}])assert.throws(()=>normalizeTicker('Binance',{...binance,...patch},{receivedAt:now}));});
test('Bybit fractional change and OKX opening price are normalized correctly',()=>{const b=normalizeTicker('Bybit',{symbol:'BTCUSDT',lastPrice:'100',bid1Price:'99',ask1Price:'101',prevPrice24h:'80',highPrice24h:'105',lowPrice24h:'78',volume24h:'10',turnover24h:'900',price24hPcnt:'.25'},{sourceAsOf:now,receivedAt:now});assert.equal(b.changePct,25);const o=normalizeTicker('OKX',{instId:'BTC-USDT',last:'100',bidPx:'99',askPx:'101',open24h:'80',high24h:'105',low24h:'78',vol24h:'10',volCcy24h:'900',ts:String(now)},{receivedAt:now});assert.equal(o.changePct,25);assert.equal(o.volumeQuote,900);});
import {selectObservation,normalizeCandles} from '../public/market-data.js';

test('a provider outage selects an actually fresh alternate without relabeling it',()=>{
  const now=Date.now(),rows=[{source:'Binance',symbol:'BTCUSDT',ok:false},{source:'OKX',symbol:'BTCUSDT',ok:true,receivedAt:now,sourceAsOf:now,last:123}];
  assert.equal(selectObservation(rows,'BTCUSDT',now).source,'OKX');
  rows.unshift({source:'Bybit',symbol:'BTCUSDT',ok:true,receivedAt:now,sourceAsOf:now-60000,last:999});
  assert.equal(selectObservation(rows,'BTCUSDT',now).last,123);
});
test('OKX candles are sorted, deduplicated and restricted to confirmed closed bars',()=>{
  const now=900000;
  const a=['300000','100','102','99','101','10','1000','1000','1'];
  const b=['600000','101','102','99','100','10','1000','1000','0'];
  const c=normalizeCandles('OKX',[b,a,a],'5m',now);
  assert.equal(c.length,1);assert.equal(c[0].time,300000);assert.equal(c[0].close,101);
});

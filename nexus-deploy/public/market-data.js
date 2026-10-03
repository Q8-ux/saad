// Public market observations only. No generated prices or execution promises.
export const WATCH_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','DOGEUSDT'];
export const FRESH_MS = 15000;
const numeric=x=>x===null||x===undefined||x===''||!Number.isFinite(Number(x))?null:Number(x);
export function observationState(row,now=Date.now()) {
  if(!row?.ok)return 'unavailable';
  if(!Number.isFinite(row.receivedAt)||!Number.isFinite(row.sourceAsOf)||row.sourceAsOf>now+5000||row.receivedAt>now+5000)return 'unverified';
  return now-row.receivedAt>FRESH_MS||now-row.sourceAsOf>FRESH_MS?'stale':'fresh';
}
export function normalizeTicker(source,raw,{receivedAt,sourceAsOf}={}) {
  let symbol,last,bid,ask,open,high,low,volumeBase,volumeQuote,changePct;
  if(source==='Binance'){
    ({symbol}=raw);last=raw.lastPrice;bid=raw.bidPrice;ask=raw.askPrice;open=raw.openPrice;high=raw.highPrice;low=raw.lowPrice;volumeBase=raw.volume;volumeQuote=raw.quoteVolume;changePct=raw.priceChangePercent;sourceAsOf=raw.closeTime;
  }else if(source==='OKX'){
    symbol=raw.instId?.replace('-','');last=raw.last;bid=raw.bidPx;ask=raw.askPx;open=raw.open24h;high=raw.high24h;low=raw.low24h;volumeBase=raw.vol24h;volumeQuote=raw.volCcy24h;sourceAsOf=raw.ts;
  }else if(source==='Bybit'){
    ({symbol}=raw);last=raw.lastPrice;bid=raw.bid1Price;ask=raw.ask1Price;open=raw.prevPrice24h;high=raw.highPrice24h;low=raw.lowPrice24h;volumeBase=raw.volume24h;volumeQuote=raw.turnover24h;changePct=numeric(raw.price24hPcnt)===null?null:Number(raw.price24hPcnt)*100;
  }else throw Error('unknownSource');
  const row={source,symbol,base:symbol?.replace(/USDT$/,''),quote:'USDT',last:numeric(last),bid:numeric(bid),ask:numeric(ask),open24h:numeric(open),high24h:numeric(high),low24h:numeric(low),volumeBase:numeric(volumeBase),volumeQuote:numeric(volumeQuote),changePct:numeric(changePct),receivedAt:numeric(receivedAt),sourceAsOf:numeric(sourceAsOf),timestampKind:source==='Binance'?'statistics-window-end':'exchange-snapshot'};
  if(!WATCH_SYMBOLS.includes(symbol)||!(row.last>0)||!(row.bid>0)||!(row.ask>0)||row.bid>row.ask||!(row.high24h>0)||!(row.low24h>0)||row.low24h>row.high24h||!(row.volumeBase>=0)||row.volumeBase===null||!(row.volumeQuote>=0)||row.volumeQuote===null)throw Error('invalidTicker');
  if(row.changePct===null&&row.open24h>0)row.changePct=(row.last/row.open24h-1)*100;
  row.spread=row.ask-row.bid;row.spreadBps=row.spread/((row.ask+row.bid)/2)*10000;row.ok=true;
  return row;
}

export function selectObservation(rows,symbol,now=Date.now()){
  const candidates=['Binance','OKX','Bybit'].map(source=>rows.find(r=>r.source===source&&r.symbol===symbol)).filter(Boolean);
  return candidates.find(r=>observationState(r,now)==='fresh')||candidates.find(r=>r.ok)||candidates[0];
}
export function normalizeCandles(source,raw,interval,now=Date.now()){
  const ms=({'1m':60000,'5m':300000,'15m':900000,'1h':3600000})[interval];
  if(!ms||!Array.isArray(raw))throw Error('invalidHistory');
  const rows=raw.filter(r=>Number(r[0])+ms<=now&&(source!=='OKX'||r[8]==='1')&&(source!=='Binance'||Number(r[6])<now)).map(r=>({time:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[5])})).filter(r=>Object.values(r).every(Number.isFinite)&&r.low>0&&r.volume>=0&&r.high>=Math.max(r.open,r.close)&&r.low<=Math.min(r.open,r.close));
  return [...new Map(rows.map(r=>[r.time,r])).values()].sort((a,b)=>a.time-b.time).slice(-500);
}

import {normalizeTrade,normalizeFlowBook,deltaWindow,volumeProfile,FLOW_FRESH_MS} from '../public/order-flow.js';

export class FlowBuffer{
  constructor({clock=Date.now,maxTrades=60000,maxRecords=30000}={}){this.clock=clock;this.maxTrades=maxTrades;this.maxRecords=maxRecords;this.trades=[];this.ids=new Set();this.records=[];this.recordHead=0;this.recordDrops=0;this.gaps=0;this.generation=0;this.connected=false;this.since=null;this.coverageStart=null;this.lastReceivedAt=0;this.lastTradeAt=0;this.cvd=0;this.book=null;this.reason='connecting';}
  record(type,data,at=this.clock()){this.records.push({type,receivedAt:at,generation:this.generation,data});while(this.records.length-this.recordHead>this.maxRecords){this.recordHead++;this.recordDrops++;}if(this.recordHead>5000){this.records=this.records.slice(this.recordHead);this.recordHead=0;}}
  reset(reason,at=this.clock()){if(this.generation)this.gaps++;this.generation++;this.since=at;this.coverageStart=at;this.trades=[];this.ids.clear();this.lastReceivedAt=0;this.lastTradeAt=0;this.cvd=0;this.reason=reason;this.record('reset',{reason},at);}
  connect(){this.connected=true;this.book=null;this.reset('warming');}
  disconnect(reason='disconnected'){if(!this.connected&&this.reason===reason)return;this.connected=false;this.book=null;this.reason=reason;this.record('gap',{reason});}
  addTrades(rows,at=this.clock()){
    if(!this.connected)return;
    let normalized;try{normalized=rows.map(r=>normalizeTrade(r,at)).sort((a,b)=>a.time-b.time);}catch{this.reset('invalidTrade',at);return;}
    if(this.lastReceivedAt&&at-this.lastReceivedAt>15000)this.reset('tradeSilence',at);
    for(const t of normalized){
      if(this.ids.has(t.id))continue;
      if(at-t.time>FLOW_FRESH_MS||(this.lastTradeAt&&t.time<this.lastTradeAt-2000)){this.reset('lateTrade',at);continue;}
      // Pre-subscription events cannot extend the coverage boundary backwards.
      if(t.time<this.since)continue;
      this.ids.add(t.id);this.trades.push(t);this.cvd+=(t.side==='buy'?1:-1)*t.size;this.lastTradeAt=Math.max(this.lastTradeAt,t.time);this.lastReceivedAt=at;this.reason='collecting';this.record('trade',t,at);
    }
    let dropped=false;while(this.trades.length>this.maxTrades||this.trades[0]?.time<at-45*60000){this.ids.delete(this.trades[0].id);this.trades.shift();dropped=true;}
    if(dropped)this.coverageStart=Math.max(this.coverageStart,this.trades[0]?.time+1||at);
  }
  addBook(row,at=this.clock()){
    if(!this.connected)return;
    try{const book=normalizeFlowBook(row,at);if(at-book.asOf>FLOW_FRESH_MS){this.book=null;return;}if(this.book&&book.asOf<this.book.asOf)return;this.book=book;this.record('book',book,at);}catch{this.book=null;this.record('invalidBook',{},at);}
  }
  snapshot(now=this.clock()){
    const fresh=this.connected&&this.lastTradeAt>0&&now-this.lastTradeAt<=FLOW_FRESH_MS&&now-this.lastReceivedAt<=FLOW_FRESH_MS;
    const one=deltaWindow(this.trades,now-60000,now),five=deltaWindow(this.trades,now-300000,now),quarter=Math.floor(now/900000)*900000;
    one.ready=!!fresh&&this.coverageStart<=one.start;five.ready=!!fresh&&this.coverageStart<=five.start;
    const profile=volumeProfile(this.trades,{start:quarter-900000,end:quarter,coverageStart:this.connected?this.coverageStart:null,observedUntil:this.lastTradeAt});
    const series=[];let v=0;for(const t of this.trades.slice().sort((a,b)=>a.time-b.time)){v+=(t.side==='buy'?1:-1)*t.size;const bucket=Math.floor(t.time/60000)*60000;if(series.at(-1)?.time===bucket)series.at(-1).value=v;else series.push({time:bucket,value:v});}
    const storedDelta=this.trades.reduce((s,t)=>s+(t.side==='buy'?t.size:-t.size),0),offset=this.cvd-storedDelta;
    return {source:'OKX',symbol:'BTC-USDT',channel:'trades',aggregation:'exchange aggregated fills; sz counted once',asOf:now,connected:this.connected,fresh,ready:one.ready,generation:this.generation,gaps:this.gaps,reason:fresh?(one.ready?'ready':'warming'):this.reason==='collecting'?'stale':this.reason,sessionStart:this.since,coverageStart:this.coverageStart,lastTradeAt:this.lastTradeAt||null,lastReceivedAt:this.lastReceivedAt||null,cvd:this.generation?this.cvd:null,cvdUnit:'BTC',delta1m:one,delta5m:five,profile,series:series.slice(-45).map(p=>({...p,value:p.value+offset})),recent:this.trades.slice(-12).reverse(),retainedTrades:this.trades.length,recording:{records:this.records.length-this.recordHead,dropped:this.recordDrops,from:this.records[this.recordHead]?.receivedAt||null,durable:false,depthLevels:5}};
  }
  export(){return {schema:'fainance-flow-recording-1',source:'OKX',symbol:'BTC-USDT',exportedAt:this.clock(),durable:false,dropped:this.recordDrops,depth:'books5 full snapshots; top 5 only',limitations:['bounded memory; resets on restart','no queue position or fill guarantee','not a full-depth performance backtest'],records:this.records.slice(this.recordHead)};}
}

export function startMarketFlow({WebSocketImpl=globalThis.WebSocket,clock=Date.now}={}){
  const buffer=new FlowBuffer({clock});let socket=null,retry=null,tick=null,stopped=false,lastMessage=0,pingAt=0;
  const retryConnect=()=>{if(!stopped&&!retry)retry=setTimeout(()=>{retry=null;connect();},5000);retry?.unref?.();};
  const fail=reason=>{buffer.disconnect(reason);clearInterval(tick);tick=null;const old=socket;socket=null;try{old?.close();}catch{}retryConnect();};
  function connect(){
    if(stopped)return;
    if(!WebSocketImpl){buffer.disconnect('unsupportedRuntime');return;}
    try{
      const ws=new WebSocketImpl('wss://ws.okx.com:8443/ws/v5/public');socket=ws;lastMessage=clock();pingAt=0;
      ws.addEventListener('open',()=>{if(ws!==socket)return;buffer.connect();lastMessage=clock();ws.send(JSON.stringify({op:'subscribe',args:[{channel:'trades',instId:'BTC-USDT'},{channel:'books5',instId:'BTC-USDT'}]}));});
      ws.addEventListener('message',e=>{if(ws!==socket)return;lastMessage=clock();pingAt=0;if(e.data==='pong')return;let m;try{m=JSON.parse(e.data);}catch{return fail('invalidMessage');}if(m.event==='error')return fail('subscriptionRejected');if(m.arg?.instId!=='BTC-USDT'||!Array.isArray(m.data))return;if(m.arg.channel==='trades')buffer.addTrades(m.data);if(m.arg.channel==='books5')for(const r of m.data)buffer.addBook(r);});
      ws.addEventListener('error',()=>{if(ws===socket)fail('connectionError');});
      ws.addEventListener('close',()=>{if(ws===socket)fail('disconnected');});
      tick=setInterval(()=>{if(ws!==socket)return;if(clock()-lastMessage>25000)return fail('heartbeatTimeout');if(ws.readyState===1&&clock()-lastMessage>15000&&!pingAt){pingAt=clock();ws.send('ping');}},1000);tick.unref?.();
    }catch{fail('connectionError');}
  }
  connect();return {buffer,stop(){stopped=true;clearTimeout(retry);clearInterval(tick);socket?.close();buffer.disconnect('stopped');},snapshot:()=>buffer.snapshot(),book:()=>buffer.book,export:()=>buffer.export()};
}

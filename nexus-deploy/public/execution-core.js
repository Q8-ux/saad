// Shared execution state machine. The broker is outside this module.
export const EXEC_VERSION='execution-1.0';
export const EXEC_LIMITS=Object.freeze({capital:1000,maxOrder:100,maxExposure:300,dailyLoss:30,maxDrawdownPct:5,maxPending:1,maxSpreadBps:12,maxSlippageBps:15,maxAgeMs:15000,feeBps:10,riskPerTradePct:.5});
export const terminal=o=>['filled','canceled','rejected'].includes(o.state);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const day=now=>new Date(now+3*3600000).toISOString().slice(0,10); // Kuwait risk day
const near=(a,b)=>Math.abs(a-b)<1e-8;
export function newExecution(now=Date.now()){return {version:3,cash:10000,base:0,cost:0,realized:0,halted:false,orders:[],events:[],day:day(now),dayEquity:10000,peak:10000,limits:{...EXEC_LIMITS},lastBookAt:0};}
export function event(s,type,detail,now=Date.now()){s.events.unshift({at:now,type,detail,version:EXEC_VERSION});s.events=s.events.slice(0,2000);}
export function markExecution(s,book,now=Date.now()){
  const bid=book?.bids?.[0]?.price;if(!(bid>0))return null;
  const equity=s.cash+s.base*bid*(1-s.limits.feeBps/10000);
  if(day(now)!==s.day){s.day=day(now);s.dayEquity=equity;}
  s.peak=Math.max(s.peak,equity);return {equity,exposure:s.base*bid,dayPnl:equity-s.dayEquity,drawdown:s.peak?(s.peak-equity)/s.peak*100:0,unrealized:s.base*bid*(1-s.limits.feeBps/10000)-s.cost};
}
export function validLimits(l){return Object.keys(EXEC_LIMITS).every(k=>finite(l[k])&&l[k]>0)&&l.feeBps<=200&&l.maxOrder<=l.maxExposure&&l.maxExposure<=l.capital&&l.capital<=1000000&&l.dailyLoss<=l.capital&&l.maxPending<=5&&Number.isInteger(l.maxPending)&&l.maxSlippageBps<=100&&l.maxSpreadBps<=100&&l.maxAgeMs<=20000&&l.maxDrawdownPct<=20&&l.riskPerTradePct<=2;}
export function checkOrder(s,intent,book,now=Date.now()){
  const blocks=[],l=s.limits,side=intent.side,qty=intent.qty,limit=intent.limit;
  if(!validLimits(l)||!['buy','sell'].includes(side)||intent.symbol!=='BTC-USDT'||![qty,limit].every(x=>finite(x)&&x>0))return {ok:false,blocks:['invalid']};
  if(!book?.ok||!book.asks?.length||!book.bids?.length||!finite(book.asOf)||now-book.asOf>l.maxAgeMs||book.asOf>now+3000)return {ok:false,blocks:['stale']};
  const bid=book.bids[0].price,ask=book.asks[0].price,mid=(bid+ask)/2;if(!(bid>0&&ask>=bid))return {ok:false,blocks:['invalid']};
  const exposure=markExecution(s,book,now),active=s.orders.filter(o=>!terminal(o));
  if(s.halted)blocks.push('halted');
  if(active.some(o=>['unknown','submitting','canceling'].includes(o.state)))blocks.push('unresolved');
  if(active.length>=l.maxPending)blocks.push('pending');
  if((ask-bid)/mid*10000>l.maxSpreadBps)blocks.push('spread');
  if(qty*limit>l.maxOrder+1e-8)blocks.push('orderLimit');
  const reserve=active.filter(o=>o.side==='buy').reduce((a,o)=>a+(o.qty-o.filled)*o.limit*(1+l.feeBps/10000),0);
  const reserveBase=active.filter(o=>o.side==='sell').reduce((a,o)=>a+o.qty-o.filled,0);
  if(side==='buy'){
    if(limit>ask*(1+l.maxSlippageBps/10000)+1e-8||limit<ask)blocks.push('slippage');
    const gross=qty*limit*(1+l.feeBps/10000);
    if(gross+reserve>s.cash+1e-8)blocks.push('balance');
    if(exposure.exposure+reserve+gross>Math.min(l.maxExposure,l.capital)+1e-8)blocks.push('exposure');
    if(exposure.dayPnl<=-l.dailyLoss)blocks.push('dailyLoss');
    if(exposure.drawdown>=l.maxDrawdownPct)blocks.push('drawdown');
    if(!finite(intent.stop)||!finite(intent.target)||intent.stop<=0||intent.stop>=ask||intent.target<=ask)blocks.push('protection');
    else if(qty*(limit-intent.stop+limit*2*l.feeBps/10000)>l.capital*l.riskPerTradePct/100)blocks.push('tradeRisk');
  } else {
    if(limit<bid*(1-l.maxSlippageBps/10000)-1e-8||limit>bid)blocks.push('slippage');
    if(qty+reserveBase>s.base+1e-9)blocks.push('noInventory');
  }
  let available=0;for(const r of side==='buy'?book.asks:book.bids){if(side==='buy'?r.price<=limit:r.price>=limit)available+=r.size;}
  if(available<qty)blocks.push('depth');
  return {ok:blocks.length===0,blocks,exposure,notional:qty*limit,reserved:reserve,depth:available,checkedAt:now};
}
export function createOrder(s,intent,book,now=Date.now()){
  if(!/^[a-zA-Z0-9]{16,32}$/.test(intent.id||''))throw Error('invalid');
  const existing=s.orders.find(o=>o.id===intent.id);if(existing){if(existing.side!==intent.side||!near(existing.qty,intent.qty)||!near(existing.limit,intent.limit))throw Error('idConflict');return existing;}
  const risk=checkOrder(s,intent,book,now);if(!risk.ok){event(s,'blocked',risk.blocks.join(','),now);throw Error(risk.blocks[0]);}
  if(s.orders.length>=5000)throw Error('archiveRequired');
  const o={id:intent.id,symbol:'BTC-USDT',source:book.id||'simulation',side:intent.side,qty:intent.qty,limit:intent.limit,stop:intent.stop||null,target:intent.target||null,reason:intent.reason||'manual',modelVersion:intent.modelVersion||'manual',state:'prepared',filled:0,gross:0,feeQuote:0,feeBase:0,createdAt:now,updatedAt:now,bookAt:book.asOf,risk};s.orders.unshift(o);event(s,'prepared',o.id,now);return o;
}
export function applyReport(s,id,r,now=Date.now()){
  const o=s.orders.find(o=>o.id===id);if(!o)throw Error('unknownOrder');
  if(!['live','partially_filled','filled','canceled','rejected','unknown'].includes(r.state)||!['filled','gross','feeQuote','feeBase'].every(k=>finite(r[k])))throw Error('invalidReport');
  if(r.filled<o.filled-1e-10)return o; // late report must never undo a fill
  if(r.filled<0||r.filled>o.qty+1e-8||r.gross<0||(r.filled>0&&r.gross<=0)||(r.state==='filled'&&Math.abs(r.filled-o.qty)>1e-8))throw Error('invalidReport');
  if(o.state==='filled')return o;
  if(terminal(o)&&r.filled===o.filled&&!terminal({state:r.state}))return o;
  const dq=r.filled-o.filled,dg=r.gross-o.gross,dfq=r.feeQuote-o.feeQuote,dfb=r.feeBase-o.feeBase;
  const netBase=o.side==='buy'?dq+dfb:-dq+dfb,netCash=o.side==='buy'?-dg+dfq:dg+dfq;
  if(s.cash+netCash<-.01||s.base+netBase< -1e-8)throw Error('reconciliation');
  if(o.side==='buy')s.cost-=netCash;
  else if(dq>0){const released=s.base>0?s.cost*Math.min(1,(-netBase)/s.base):0;s.cost-=released;s.realized+=netCash-released;}
  s.cash=Math.max(0,s.cash+netCash);s.base=Math.max(0,s.base+netBase);
  Object.assign(o,{filled:r.filled,gross:r.gross,feeQuote:r.feeQuote,feeBase:r.feeBase,state:r.state,updatedAt:now});
  if(dq>0)event(s,'fill',`${o.id}:${dq}`,now);return o;
}
// IOC only. Fills against visible depth; no queue priority assumption.
export function simulateIOC(s,id,book,now=Date.now()){
  const o=s.orders.find(o=>o.id===id);if(!o||terminal(o))return o;
  if(o.state!=='prepared')return o;
  if(!book?.ok||now-book.asOf>s.limits.maxAgeMs||book.asOf>now+3000){o.state='rejected';event(s,'blocked','stale',now);return o;}
  let filled=0,gross=0;const slippage=s.limits.maxSlippageBps/10000;
  for(const r of o.side==='buy'?book.asks:book.bids){const p=r.price*(1+(o.side==='buy'?1:-1)*slippage);if(o.side==='buy'?p>o.limit+1e-7:p<o.limit-1e-7)break;const q=Math.min(o.qty-filled,r.size);filled+=q;gross+=q*p;if(filled>=o.qty-1e-10)break;}
  return applyReport(s,id,{state:filled>=o.qty-1e-10?'filled':'canceled',filled,gross,feeQuote:-gross*s.limits.feeBps/10000,feeBase:0},now);
}
export function haltExecution(s,now=Date.now()){s.halted=true;for(const o of s.orders)if(o.state==='prepared')o.state='canceled';event(s,'halt','new-orders-blocked; existing positions unchanged',now);}

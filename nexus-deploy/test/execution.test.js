import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHmac} from 'node:crypto';
import {Readable} from 'node:stream';
import {newExecution,checkOrder,createOrder,applyReport,simulateIOC,haltExecution,markExecution} from '../public/execution-core.js';
import {OKXDemo} from '../lib/okx-demo.js';
import {Journal,createExecutionService} from '../lib/execution-service.js';
const now=Date.UTC(2026,9,3,0),book={ok:true,asOf:now,asks:[{price:100,size:10}],bids:[{price:99.99,size:10}]};
const order=(extra={})=>({id:'1234567890abcdef1234567890abcdef',symbol:'BTC-USDT',side:'buy',qty:.5,limit:100.15,stop:98,target:105,...extra});
test('double submit has one ID, one cumulative fill and conserved cash',()=>{const s=newExecution(now),i=order();createOrder(s,i,book,now);createOrder(s,i,book,now);simulateIOC(s,i.id,book,now);const cash=s.cash;simulateIOC(s,i.id,book,now);assert.equal(s.orders.length,1);assert.equal(s.cash,cash);assert.equal(s.base,.5);assert.ok(Math.abs(s.cash+50.01+0.05001-10000)<1e-8);assert.throws(()=>createOrder(s,order({qty:.6}),book,now),/idConflict/);});
test('partial IOC cancels remainder and cumulative replay does not double fill',()=>{const s=newExecution(now),i=order();createOrder(s,i,book,now);simulateIOC(s,i.id,{...book,asks:[{price:100,size:.2}]},now);assert.equal(s.orders[0].state,'canceled');assert.equal(s.base,.2);const r={state:'canceled',filled:.2,gross:20.004,feeQuote:-.020004,feeBase:0};const cash=s.cash;applyReport(s,i.id,r,now);assert.ok(Math.abs(s.cash-cash)<1e-8);});
test('unknown submission blocks new entries; halt keeps holdings intact',()=>{const s=newExecution(now);createOrder(s,order(),book,now).state='unknown';assert.ok(checkOrder(s,order({id:'b'.repeat(32)}),book,now).blocks.includes('unresolved'));s.base=.1;haltExecution(s,now);assert.equal(s.base,.1);assert.ok(checkOrder(s,order(),book,now).blocks.includes('halted'));});
test('daily loss includes unrealized losses and stale/future prices fail closed',()=>{const s=newExecution(now);s.cash=9970;s.base=.1;s.cost=40;assert.ok(checkOrder(s,order(),book,now).ok);s.cash=9950;assert.ok(checkOrder(s,order(),book,now).blocks.includes('dailyLoss'));assert.deepEqual(checkOrder(s,order(),{...book,asOf:now-20000},now).blocks,['stale']);assert.deepEqual(checkOrder(s,order(),{...book,asOf:now+5000},now).blocks,['stale']);});
test('reserved orders count toward exposure and short sales are impossible',()=>{const s=newExecution(now);s.limits.maxPending=2;s.limits.maxExposure=100;createOrder(s,order(),book,now);assert.ok(checkOrder(s,order({id:'b'.repeat(32)}),book,now).blocks.includes('exposure'));assert.ok(checkOrder(s,order({side:'sell',limit:99.9}),book,now).blocks.includes('noInventory'));});
test('base-denominated broker fees reconcile exactly and late reports cannot roll back fills',()=>{const s=newExecution(now),i=order();createOrder(s,i,book,now);applyReport(s,i.id,{state:'partially_filled',filled:.2,gross:20,feeQuote:0,feeBase:-.0002},now);assert.ok(Math.abs(s.base-.1998)<1e-10);applyReport(s,i.id,{state:'filled',filled:.5,gross:50,feeQuote:0,feeBase:-.0005},now);applyReport(s,i.id,{state:'live',filled:0,gross:0,feeQuote:0,feeBase:0},now);assert.equal(s.cash,9950);assert.ok(Math.abs(s.base-.4995)<1e-10);assert.equal(s.orders[0].state,'filled');});
test('risk day rolls at Kuwait midnight, not browser locale',()=>{const s=newExecution(Date.UTC(2026,9,2,20,59));s.cash=9990;assert.equal(markExecution(s,book,Date.UTC(2026,9,2,20,59)).dayPnl,-10);assert.equal(markExecution(s,book,Date.UTC(2026,9,2,21,0)).dayPnl,0);});
test('durable journal persists before transport and rejects second writer',()=>{const dir=mkdtempSync(join(tmpdir(),'fainance-journal-'));const j=new Journal(dir);try{const s=newExecution(now);createOrder(s,order(),book,now).state='submitting';j.save(s);assert.equal(JSON.parse(readFileSync(join(dir,'execution.json'),'utf8')).orders[0].state,'submitting');assert.throws(()=>new Journal(dir));assert.equal(j.load().orders[0].id,order().id);}finally{j.close();rmSync(dir,{recursive:true,force:true});}});
test('OKX adapter signs exact payload, always forces demo and never retries a lost response',async()=>{let calls=0;const adapter=new OKXDemo({key:'test-key',secret:'test-secret',passphrase:'test-pass',fetcher:async(url,init)=>{calls++;assert.equal(init.headers['x-simulated-trading'],'1');assert.equal(url,'https://www.okx.com/api/v5/trade/order');assert.equal(init.headers['OK-ACCESS-SIGN'],createHmac('sha256','test-secret').update(init.headers['OK-ACCESS-TIMESTAMP']+'POST/api/v5/trade/order'+init.body).digest('base64'));assert.equal(JSON.parse(init.body).tdMode,'cash');throw Error('timeout');}});await assert.rejects(adapter.submit(order()));assert.equal(calls,1);});
test('production service cannot enable real trading and is locked without owner/storage',()=>{const service=createExecutionService({getBook:async()=>book,env:{FAINANCE_EXECUTION:'live'}});assert.equal(service.summary().enabled,false);assert.equal(service.summary().liveEnabled,false);service.close();});
test('private service authenticates, journals lost submission, reconciles once and never resubmits',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'fainance-service-'));let submitted=0,resolve=false,cookie='',lastOrder;
  const broker={account:async()=>({cash:resolve?9949.95:10000,base:resolve?.5:0}),rules:async()=>({lot:.0001,min:.0001,tick:.01,feeBps:10}),openOrders:async()=>[],submit:async o=>{submitted++;lastOrder=o;throw Error('timeout');},report:async()=>{if(!resolve)throw Error('not yet visible');return {state:'filled',filled:.5,gross:50,feeQuote:-.05,feeBase:0};},cancel:async()=>{}};
  const service=createExecutionService({getBook:async()=>({...book,asOf:Date.now()}),startTimer:false,brokerFactory:()=>broker,env:{FAINANCE_EXECUTION:'okx-demo',OKX_DEMO_API_KEY:'test',OKX_DEMO_SECRET:'test',OKX_DEMO_PASSPHRASE:'test',FAINANCE_OWNER_TOKEN:'x'.repeat(32),FAINANCE_DURABLE_STORAGE:'confirmed',FAINANCE_STATE_DIR:dir,FAINANCE_DEDICATED_ACCOUNT:'confirmed',FAINANCE_RISK_JSON:'{}'}});
  async function call(action,data,origin='http://localhost'){const req=Readable.from(data?[JSON.stringify(data)]:[]);req.method=data?'POST':'GET';req.headers={host:'localhost',origin,cookie};const res={setHeader:(k,v)=>{if(k==='Set-Cookie')cookie=v.split(';')[0];}};let response;await service.handle(req,res,new URL('http://localhost/api/execution/'+action),(_,code,body)=>{response={code,body};});return response;}
  try{
    assert.equal((await call('account')).code,401);assert.equal((await call('session',{token:'x'.repeat(32)},'https://evil.example')).code,403);
    assert.equal((await call('session',{token:'x'.repeat(32)})).code,200);assert.equal((await call('sync',{})).code,200);assert.equal((await call('resume',{})).code,200);
    const p=await call('preview',{side:'buy',qty:.5,stop:98,target:105});assert.equal(p.code,200);
    const c=await call('confirm',{token:p.body.token});assert.equal(c.body.order.state,'unknown');assert.equal(submitted,1);
    const stored=JSON.parse(readFileSync(join(dir,'execution.json'),'utf8'));assert.equal(stored.orders[0].id,lastOrder.id);assert.equal(stored.orders[0].state,'unknown');
    await call('confirm',{token:p.body.token});assert.equal(submitted,1);
    resolve=true;const sync=await call('sync',{});assert.equal(sync.code,200);assert.equal(sync.body.state.base,.5);assert.equal(sync.body.state.cash,9949.95);assert.equal(sync.body.state.halted,true);
    await call('sync',{});assert.equal((await call('account')).body.state.base,.5);assert.equal(submitted,1);
  }finally{service.close();rmSync(dir,{recursive:true,force:true});}
});


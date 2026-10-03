import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {OKXDemo} from './okx-demo.js';
import {EXEC_LIMITS,newExecution,checkOrder,createOrder,applyReport,haltExecution,terminal,event,markExecution,validLimits} from '../public/execution-core.js';

export class Journal {
  constructor(dir){if(!path.isAbsolute(dir))throw Error('storageRequired');fs.mkdirSync(dir,{recursive:true,mode:0o700});this.file=path.join(dir,'execution.json');this.lock=path.join(dir,'execution.lock');this.fd=fs.openSync(this.lock,'wx',0o600);fs.writeSync(this.fd,String(process.pid));}
  load(){return fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):null;}
  save(s){const temp=this.file+'.next',fd=fs.openSync(temp,'w',0o600);try{fs.writeFileSync(fd,JSON.stringify(s));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,this.file);const d=fs.openSync(path.dirname(this.file),'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}}
  close(){fs.closeSync(this.fd);fs.unlinkSync(this.lock);}
}

export function createExecutionService({getBook,env=process.env,brokerFactory=config=>new OKXDemo(config),startTimer=true}){
  const readiness={mode:'okx-demo',liveEnabled:false,credentials:!!(env.OKX_DEMO_API_KEY&&env.OKX_DEMO_SECRET&&env.OKX_DEMO_PASSPHRASE),owner:!!(env.FAINANCE_OWNER_TOKEN?.length>=32),storage:env.FAINANCE_DURABLE_STORAGE==='confirmed'&&!!env.FAINANCE_STATE_DIR,limits:!!env.FAINANCE_RISK_JSON,dedicated:env.FAINANCE_DEDICATED_ACCOUNT==='confirmed'};
  let enabled=false,error=null,journal,s,broker,tail=Promise.resolve(),syncError=null;
  const sessions=new Map(),previews=new Map();let loginAttempts=0,loginWindow=Date.now();
  const serialize=fn=>{const p=tail.then(fn);tail=p.catch(()=>{});return p;};
  const persist=()=>{try{journal.save(s);}catch{enabled=false;s.halted=true;error='journalFailure';throw Error(error);}};
  if(env.FAINANCE_EXECUTION==='okx-demo'&&Object.entries(readiness).filter(([k])=>!['mode','liveEnabled'].includes(k)).every(([,v])=>v)){
    try{
      const limits={...EXEC_LIMITS,...JSON.parse(env.FAINANCE_RISK_JSON)};if(!validLimits(limits))throw Error('invalidLimits');
      const dir=path.resolve(env.FAINANCE_STATE_DIR),publicDir=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../public');if(dir===publicDir||dir.startsWith(publicDir+path.sep))throw Error('storageRequired');
      journal=new Journal(dir);s=journal.load()||newExecution();if(s.version!==3||!Array.isArray(s.orders))throw Error('invalidJournal');
      s.limits=limits;s.halted=true;for(const o of s.orders)if(!terminal(o))o.state='unknown';event(s,'startup','paused; reconciliation required');
      broker=brokerFactory({key:env.OKX_DEMO_API_KEY,secret:env.OKX_DEMO_SECRET,passphrase:env.OKX_DEMO_PASSPHRASE});enabled=true;persist();
    }catch{error='configurationOrJournal';enabled=false;}
  }
  const summary=()=>({...readiness,enabled,error,autonomous:false,realMoney:false});
  async function reconcile(){
    try{
      for(const o of s.orders.filter(o=>!terminal(o))){try{applyReport(s,o.id,await broker.report(o));}catch{o.state='unknown';}}
      const [a,open,rules]=await Promise.all([broker.account(),broker.openOrders(),broker.rules()]);
      if(open.some(o=>!s.orders.some(x=>x.id===o.clOrdId)))throw Error('externalOrders');
      if(!s.initialized){if(a.base>1e-9||open.length)throw Error('emptyBTCRequired');s.cash=a.cash;s.base=0;s.cost=0;s.peak=a.cash;s.dayEquity=a.cash;s.initialized=true;}
      if(Math.abs(a.cash-s.cash)>.02||Math.abs(a.base-s.base)>Math.max(rules.lot*1.01,1e-8))throw Error('reconciliation');
      if(s.orders.some(o=>!terminal(o)&&o.state==='unknown'))throw Error('unresolved');
      if(rules.feeBps>s.limits.feeBps)throw Error('feeLimit');
      s.reconciledAt=Date.now();s.rules=rules;syncError=null;persist();return a;
    }catch(e){syncError=e.message;s.halted=true;event(s,'reconciliationBlocked',e.message);persist();throw e;}
  }
  async function cancelOutstanding(){
    for(const o of s.orders.filter(o=>!terminal(o))){o.state='canceling';persist();try{await broker.cancel(o);}catch{}try{applyReport(s,o.id,await broker.report(o));}catch{o.state='unknown';}persist();}
  }
  const timer=enabled&&startTimer?setInterval(()=>serialize(async()=>{try{await reconcile();if(s.halted)await cancelOutstanding();}catch{}}),5000):null;timer?.unref();
  const output=()=>({status:summary(),state:s?{...s,orders:s.orders.slice(0,100),events:s.events.slice(0,100)}:null,syncError});
  const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
  const authenticated=req=>{const exp=sessions.get(cookies(req).fainance_owner);return exp&&exp>Date.now();};
  async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('tooLarge');}return JSON.parse(raw||'{}');}
  return {summary,close:()=>{if(timer)clearInterval(timer);journal?.close();},async handle(req,res,url,json){
    if(!url.pathname.startsWith('/api/execution/'))return false;
    const action=url.pathname.slice('/api/execution/'.length),method=req.method;
    if(action==='status'&&method==='GET'){json(res,200,summary());return true;}
    if(!enabled){json(res,503,{error:'executionNotConfigured',status:summary()});return true;}
    if(!['GET','POST'].includes(method)){json(res,405,{error:'method'});return true;}
    if(method==='POST'){
      const local=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||''),origin=`${local?'http':'https'}://${req.headers.host}`;
      if(req.headers.origin!==origin){json(res,403,{error:'origin'});return true;}
    }
    try{
      if(action==='session'&&method==='POST'){
        if(Date.now()-loginWindow>60000){loginWindow=Date.now();loginAttempts=0;}if(++loginAttempts>10){json(res,429,{error:'rateLimit'});return true;}
        const data=await body(req),a=Buffer.from(String(data.token||'')),b=Buffer.from(env.FAINANCE_OWNER_TOKEN);if(a.length!==b.length||!timingSafeEqual(a,b)){json(res,401,{error:'unauthorized'});return true;}
        const token=randomBytes(32).toString('hex');for(const [k,v] of sessions)if(v<Date.now())sessions.delete(k);if(sessions.size>=10)sessions.delete(sessions.keys().next().value);sessions.set(token,Date.now()+3600000);
        res.setHeader('Set-Cookie',`fainance_owner=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/execution; Max-Age=3600`);json(res,200,{ok:true});return true;
      }
      if(!authenticated(req)){json(res,401,{error:'unauthorized'});return true;}
      if(action==='account'&&method==='GET'){json(res,200,output());return true;}
      if(method!=='POST'){json(res,404,{error:'notFound'});return true;}
      const data=await body(req);
      await serialize(async()=>{
        if(action==='sync'){await reconcile();json(res,200,output());return;}
        if(action==='stop'){haltExecution(s);persist();await cancelOutstanding();json(res,200,output());return;}
        if(action==='resume'){await reconcile();s.halted=false;event(s,'resume','owner');persist();json(res,200,output());return;}
        if(action==='preview'){
          await reconcile();const book=await getBook(),rules=s.rules;
          const qty=Math.floor(Number(data.qty)/rules.lot)*rules.lot,side=data.side;
          if(!['buy','sell'].includes(side)||!Number.isFinite(qty)||qty<rules.min)throw Error('minSize');
          const base=side==='buy'?book?.asks?.[0]?.price:book?.bids?.[0]?.price;
          const raw=base*(1+(side==='buy'?1:-1)*s.limits.maxSlippageBps/10000),limit=(side==='buy'?Math.floor(raw/rules.tick):Math.ceil(raw/rules.tick))*rules.tick;
          const intent={id:randomBytes(16).toString('hex'),symbol:'BTC-USDT',qty:Number(qty.toFixed(12)),side,limit:Number(limit.toFixed(12)),stop:Number(data.stop),target:Number(data.target),reason:'owner-confirmed',modelVersion:'manual'};
          const risk=checkOrder(s,intent,book);if(!risk.ok){json(res,422,{error:risk.blocks[0],risk});return;}
          const token=randomBytes(24).toString('hex');for(const [k,v] of previews)if(v.expires<Date.now())previews.delete(k);if(previews.size>=20)throw Error('rateLimit');
          previews.set(token,{intent,expires:Date.now()+20000});json(res,200,{token,intent,risk,expiresInSeconds:20,mode:'okx-demo'});return;
        }
        if(action==='confirm'){
          const p=previews.get(data.token);if(!p||p.expires<Date.now())throw Error('previewExpired');
          const existing=s.orders.find(o=>o.id===p.intent.id);if(existing){json(res,200,{order:existing});return;}
          await reconcile();const book=await getBook(),o=createOrder(s,p.intent,book);o.state='submitting';persist();
          try{await broker.submit(o);o.state='live';persist();try{applyReport(s,o.id,await broker.report(o));}catch{o.state='unknown';}}
          catch{o.state='unknown';s.halted=true;event(s,'unknown',o.id);}persist();json(res,200,{order:o});return;
        }
        if(action==='logout'){sessions.delete(cookies(req).fainance_owner);res.setHeader('Set-Cookie','fainance_owner=; HttpOnly; Secure; SameSite=Strict; Path=/api/execution; Max-Age=0');json(res,200,{ok:true});return;}
        json(res,404,{error:'notFound'});
      });
    }catch(e){const allowed=['brokerUnavailable','brokerRejected','submissionUnconfirmed','orderUnresolved','invalidReport','unsupportedFeeCurrency','dedicatedAccountRequired','spotOnly','invalidAccount','rulesUnavailable','externalOrders','emptyBTCRequired','reconciliation','unresolved','feeLimit','minSize','rateLimit','previewExpired','halted','stale','orderLimit','exposure','dailyLoss','drawdown','protection','tradeRisk','depth','slippage','balance','pending'];json(res,422,{error:allowed.includes(e.message)?e.message:'executionBlocked'});}
    return true;
  }};
}

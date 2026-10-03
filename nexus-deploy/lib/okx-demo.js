import {createHmac} from 'node:crypto';
// Intentionally demo-only. There is no route that can omit the simulation header.
export class OKXDemo {
  constructor({key,secret,passphrase,fetcher=fetch}){this.key=key;this.secret=secret;this.passphrase=passphrase;this.fetcher=fetcher;}
  async request(method,path,body){
    const timestamp=new Date().toISOString(),payload=body?JSON.stringify(body):'';
    const sign=createHmac('sha256',this.secret).update(timestamp+method+path+payload).digest('base64');
    const r=await this.fetcher('https://www.okx.com'+path,{method,headers:{'content-type':'application/json','OK-ACCESS-KEY':this.key,'OK-ACCESS-SIGN':sign,'OK-ACCESS-TIMESTAMP':timestamp,'OK-ACCESS-PASSPHRASE':this.passphrase,'x-simulated-trading':'1'},...(payload?{body:payload}:{}),signal:AbortSignal.timeout(8500)});
    if(!r.ok)throw Error('brokerUnavailable');const data=await r.json();if(data.code!=='0')throw Error('brokerRejected');return data.data;
  }
  async account(){
    const data=await this.request('GET','/api/v5/account/balance');
    const rows=data?.[0]?.details;if(!Array.isArray(rows))throw Error('invalidAccount');
    if(rows.some(r=>!['BTC','USDT'].includes(r.ccy)&&Math.abs(Number(r.cashBal))>0.00000001))throw Error('dedicatedAccountRequired');
    if(rows.some(r=>Number(r.liability)>0||Number(r.liabilities)>0))throw Error('spotOnly');
    const get=ccy=>{const row=rows.find(r=>r.ccy===ccy);if(!row)return 0;const n=Number(row.cashBal);if(!Number.isFinite(n)||n<0)throw Error('invalidAccount');return n;};
    return {cash:get('USDT'),base:get('BTC'),at:Date.now()};
  }
  async rules(){
    const [instruments,fees]=await Promise.all([this.request('GET','/api/v5/public/instruments?instType=SPOT&instId=BTC-USDT'),this.request('GET','/api/v5/account/trade-fee?instType=SPOT&instId=BTC-USDT')]);
    const r=instruments?.[0],f=fees?.[0],lot=Number(r?.lotSz),min=Number(r?.minSz),tick=Number(r?.tickSz),feeBps=Math.abs(Number(f?.taker))*10000;
    if(!f||typeof f.taker!=='string'||f.taker.trim()===''||r?.state!=='live'||![lot,min,tick].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(feeBps)||feeBps>200)throw Error('rulesUnavailable');return {lot,min,tick,feeBps};
  }
  async openOrders(){return this.request('GET','/api/v5/trade/orders-pending?instType=SPOT&instId=BTC-USDT');}
  async submit(o){
    const rows=await this.request('POST','/api/v5/trade/order',{instId:'BTC-USDT',tdMode:'cash',clOrdId:o.id,side:o.side,ordType:'ioc',sz:String(o.qty),px:String(o.limit)});
    if(rows?.[0]?.sCode!=='0')throw Error('submissionUnconfirmed');return {orderId:rows[0].ordId};
  }
  async report(o){
    const rows=await this.request('GET',`/api/v5/trade/order?instId=BTC-USDT&clOrdId=${encodeURIComponent(o.id)}`),r=rows?.[0];if(!r||r.clOrdId!==o.id||r.instId!=='BTC-USDT')throw Error('orderUnresolved');
    const filled=Number(r.accFillSz),average=Number(r.avgPx||0),fee=Number(r.fee||0);if(![filled,average,fee].every(Number.isFinite))throw Error('invalidReport');
    if(fee!==0&&!['BTC','USDT'].includes(r.feeCcy))throw Error('unsupportedFeeCurrency');
    return {state:r.state,filled,gross:filled*average,feeBase:r.feeCcy==='BTC'?fee:0,feeQuote:r.feeCcy==='USDT'?fee:0};
  }
  async cancel(o){const r=await this.request('POST','/api/v5/trade/cancel-order',{instId:'BTC-USDT',clOrdId:o.id});if(r?.[0]?.sCode!=='0')throw Error('cancelUnconfirmed');}
}

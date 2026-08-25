import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname,'public');
const PORT = Number(process.env.PORT || 3000);

const markets = [
{symbol:'SPY',name:'S&P 500 ETF',nameAr:'مؤشر S&P 500',market:'US',type:'Index',sector:'Indices',price:650.12,change:0.48,status:'DEMO'},
{symbol:'QQQ',name:'Nasdaq 100 ETF',nameAr:'مؤشر ناسداك 100',market:'US',type:'Index',sector:'Indices',price:584.18,change:0.71,status:'DEMO'},
{symbol:'DIA',name:'Dow Jones ETF',nameAr:'مؤشر داو جونز',market:'US',type:'Index',sector:'Indices',price:459.23,change:0.21,status:'DEMO'},
{symbol:'AAPL',name:'Apple',nameAr:'آبل',market:'US',type:'Stock',sector:'Technology',price:227.16,change:0.61,status:'DEMO'},
{symbol:'MSFT',name:'Microsoft',nameAr:'مايكروسوفت',market:'US',type:'Stock',sector:'Technology',price:509.33,change:0.44,status:'DEMO'},
{symbol:'NVDA',name:'NVIDIA',nameAr:'إنفيديا',market:'US',type:'Stock',sector:'Technology',price:181.42,change:1.26,status:'DEMO'},
{symbol:'GOOGL',name:'Alphabet',nameAr:'ألفابت',market:'US',type:'Stock',sector:'Technology',price:205.84,change:0.32,status:'DEMO'},
{symbol:'AMZN',name:'Amazon',nameAr:'أمازون',market:'US',type:'Stock',sector:'Technology',price:231.77,change:0.69,status:'DEMO'},
{symbol:'META',name:'Meta',nameAr:'ميتا',market:'US',type:'Stock',sector:'Technology',price:768.10,change:0.85,status:'DEMO'},
{symbol:'LLY',name:'Eli Lilly',nameAr:'إيلي ليلي',market:'US',type:'Stock',sector:'Healthcare',price:761.2,change:0.41,status:'DEMO'},
{symbol:'PFE',name:'Pfizer',nameAr:'فايزر',market:'US',type:'Stock',sector:'Healthcare',price:25.18,change:-0.28,status:'DEMO'},
{symbol:'XOM',name:'ExxonMobil',nameAr:'إكسون موبيل',market:'US',type:'Stock',sector:'Energy',price:119.22,change:0.33,status:'DEMO'},
{symbol:'CVX',name:'Chevron',nameAr:'شيفرون',market:'US',type:'Stock',sector:'Energy',price:157.11,change:0.27,status:'DEMO'},
{symbol:'XAU/USD',name:'Gold',nameAr:'الذهب',market:'GLOBAL',type:'Metal',sector:'Metals',price:3374.6,change:0.47,status:'DEMO'},
{symbol:'XAG/USD',name:'Silver',nameAr:'الفضة',market:'GLOBAL',type:'Metal',sector:'Metals',price:38.82,change:0.39,status:'DEMO'},
{symbol:'COPPER',name:'Copper',nameAr:'النحاس',market:'GLOBAL',type:'Metal',sector:'Metals',price:4.45,change:-0.18,status:'DEMO'},
{symbol:'WTI',name:'WTI Crude',nameAr:'خام WTI',market:'GLOBAL',type:'Energy',sector:'Energy',price:64.21,change:0.31,status:'DEMO'},
{symbol:'BRENT',name:'Brent Crude',nameAr:'خام برنت',market:'GLOBAL',type:'Energy',sector:'Energy',price:68.02,change:0.28,status:'DEMO'},
{symbol:'WHEAT',name:'Wheat',nameAr:'القمح',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:528.25,change:0.36,status:'DEMO'},
{symbol:'CORN',name:'Corn',nameAr:'الذرة',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:407.5,change:-0.27,status:'DEMO'},
{symbol:'SOYBEAN',name:'Soybeans',nameAr:'فول الصويا',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:1005.25,change:0.19,status:'DEMO'},
{symbol:'COFFEE',name:'Coffee',nameAr:'القهوة',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:326.7,change:0.62,status:'DEMO'},
{symbol:'COCOA',name:'Cocoa',nameAr:'الكاكاو',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:8175,change:-0.73,status:'DEMO'},
{symbol:'SUGAR',name:'Sugar',nameAr:'السكر',market:'GLOBAL',type:'Commodity',sector:'Agriculture',price:16.18,change:0.14,status:'DEMO'},
{symbol:'BTC/USD',name:'Bitcoin',nameAr:'بيتكوين',market:'GLOBAL',type:'Crypto',sector:'Crypto',price:111850,change:1.12,status:'DEMO'},
{symbol:'ETH/USD',name:'Ethereum',nameAr:'إيثيريوم',market:'GLOBAL',type:'Crypto',sector:'Crypto',price:4625,change:0.86,status:'DEMO'},
{symbol:'SOL/USD',name:'Solana',nameAr:'سولانا',market:'GLOBAL',type:'Crypto',sector:'Crypto',price:204.2,change:1.34,status:'DEMO'},
{symbol:'XRP/USD',name:'XRP',nameAr:'إكس آر بي',market:'GLOBAL',type:'Crypto',sector:'Crypto',price:2.92,change:-0.25,status:'DEMO'},
{symbol:'US02Y',name:'US Treasury 2Y',nameAr:'السند الأمريكي سنتان',market:'US',type:'Treasury',sector:'Treasuries',price:3.69,change:-0.04,status:'DEMO',unit:'%'},
{symbol:'US05Y',name:'US Treasury 5Y',nameAr:'السند الأمريكي 5 سنوات',market:'US',type:'Treasury',sector:'Treasuries',price:3.84,change:-0.03,status:'DEMO',unit:'%'},
{symbol:'US10Y',name:'US Treasury 10Y',nameAr:'السند الأمريكي 10 سنوات',market:'US',type:'Treasury',sector:'Treasuries',price:4.27,change:-0.02,status:'DEMO',unit:'%'},
{symbol:'US20Y',name:'US Treasury 20Y',nameAr:'السند الأمريكي 20 سنة',market:'US',type:'Treasury',sector:'Treasuries',price:4.86,change:-0.01,status:'DEMO',unit:'%'},
{symbol:'US30Y',name:'US Treasury 30Y',nameAr:'السند الأمريكي 30 سنة',market:'US',type:'Treasury',sector:'Treasuries',price:4.92,change:0.01,status:'DEMO',unit:'%'},
{symbol:'KW-PREMIER',name:'Kuwait Premier Market',nameAr:'السوق الأول',market:'KUWAIT',type:'Index',sector:'Kuwait',price:9321.4,change:0.21,status:'DEMO'},
{symbol:'KW-MAIN',name:'Kuwait Main Market',nameAr:'السوق الرئيسي',market:'KUWAIT',type:'Index',sector:'Kuwait',price:7028.8,change:-0.08,status:'DEMO'},
{symbol:'KW-ALL',name:'Kuwait All Share',nameAr:'مؤشر السوق العام',market:'KUWAIT',type:'Index',sector:'Kuwait',price:8448.5,change:0.13,status:'DEMO'}
];
const bySymbol = new Map(markets.map(x=>[x.symbol,x]));
let portfolio={startingCash:100000,cash:100000,dailyRealizedPnL:0,positions:[],trades:[]};
let watchlist=['SPY','QQQ','AAPL','MSFT','NVDA','XAU/USD','BTC/USD','US10Y','KW-PREMIER'];
let alerts=[];
let risk={riskPerTradePct:1,maxDailyLossPct:3,maxOpenPositions:8,maxPositionPct:20,requireStopLoss:true,requireTakeProfit:false,emergencyStop:false};
let audit=[];

const json=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(obj));};
const readBody=req=>new Promise(resolve=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch{resolve({})}})});
const moneyView=()=>{const positions=portfolio.positions.map(p=>{const q=bySymbol.get(p.symbol);const currentPrice=q?.price??p.entryPrice;const pnl=(currentPrice-p.entryPrice)*p.qty*(p.side==='BUY'?1:-1);return {...p,currentPrice,pnl};});const marketValue=positions.reduce((a,p)=>a+p.currentPrice*p.qty,0);const unrealizedPnL=positions.reduce((a,p)=>a+p.pnl,0);const equity=portfolio.cash+marketValue;return {...portfolio,positions,marketValue,unrealizedPnL,equity,totalReturnPct:+(((equity-portfolio.startingCash)/portfolio.startingCash)*100).toFixed(2)};};
function serveStatic(req,res){let p=new URL(req.url,'http://x').pathname;if(p==='/')p='/index.html';const file=path.normalize(path.join(PUBLIC,p));if(!file.startsWith(PUBLIC))return false;if(!fs.existsSync(file)||!fs.statSync(file).isFile())return false;const ext=path.extname(file);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[ext]||'application/octet-stream';res.writeHead(200,{'content-type':type,'cache-control':'no-cache'});fs.createReadStream(file).pipe(res);return true;}

const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const p=u.pathname;
if(p==='/api/health')return json(res,200,{ok:true,version:'production-fixed',time:new Date().toISOString()});
if(p==='/api/config')return json(res,200,{dbEnabled:false,baseCurrency:'USD',markets:['US','KUWAIT']});
if(p==='/api/auth/session')return json(res,200,{authenticated:true,user:{id:'demo',email:'demo@nexus.local',role:'trader',aal:'demo'}});
if(p==='/api/auth/logout'&&req.method==='POST')return json(res,200,{ok:true});
if((p==='/api/auth/login'||p==='/api/auth/signup')&&req.method==='POST')return json(res,200,{ok:true,emailConfirmationRequired:false});
if(p==='/api/auth/mfa/factors')return json(res,200,{totp:[],all:[]});
if(p==='/api/auth/mfa/enroll'&&req.method==='POST')return json(res,200,{id:'demo-factor',totp:{id:'demo-factor',secret:'DEMO-ONLY'}});
if(p==='/api/auth/mfa/verify'&&req.method==='POST')return json(res,200,{ok:true,aal:'aal2'});
if(p==='/api/markets/live')return json(res,200,{mode:'DEMO',currency:'USD',data:markets,counts:{live:0,delayed:0,demo:markets.length},lastUpdated:new Date().toISOString()});
if(p==='/api/portfolio')return json(res,200,moneyView());
if(p==='/api/watchlist'&&req.method==='GET')return json(res,200,{symbols:watchlist});
if(p==='/api/watchlist'&&req.method==='POST'){const b=await readBody(req);if(bySymbol.has(b.symbol)&&!watchlist.includes(b.symbol))watchlist.push(b.symbol);return json(res,200,{ok:true});}
if(p==='/api/watchlist'&&req.method==='DELETE'){const s=u.searchParams.get('symbol');watchlist=watchlist.filter(x=>x!==s);return json(res,200,{ok:true});}
if(p==='/api/alerts'&&req.method==='GET')return json(res,200,{alerts});
if(p==='/api/alerts'&&req.method==='POST'){const b=await readBody(req);const a={id:crypto.randomUUID(),symbol:b.symbol,condition:b.condition==='BELOW'?'BELOW':'ABOVE',target:Number(b.target)||0,enabled:true,created_at:new Date().toISOString()};alerts.unshift(a);return json(res,200,a);}
if(p==='/api/alerts'&&req.method==='DELETE'){const id=u.searchParams.get('id');alerts=alerts.filter(x=>x.id!==id);return json(res,200,{ok:true});}
if(p==='/api/settings'&&req.method==='GET')return json(res,200,{language:'ar',theme:'dark',baseCurrency:'USD',markets:['US','KUWAIT'],risk,connections:{supabase:false,openai:Boolean(process.env.OPENAI_API_KEY),twelveData:Boolean(process.env.TWELVE_DATA_API_KEY),finnhub:Boolean(process.env.FINNHUB_API_KEY),kuwaitData:Boolean(process.env.KUWAIT_DATA_API_URL),alpaca:false,liveTradingEnabled:false}});
if(p==='/api/settings'&&req.method==='PUT'){const b=await readBody(req);if(b.risk)risk={...risk,...b.risk};audit.unshift({action:'RISK_SETTINGS_UPDATED',created_at:new Date().toISOString()});return json(res,200,{ok:true,risk});}
if(p==='/api/brokers/status')return json(res,200,{brokers:[{name:'MetaTrader 5',connected:false,configured:false,mode:'—',note:'Connector ready for broker bridge'},{name:'Interactive Brokers',connected:false,configured:false,mode:'—',note:'API adapter placeholder'},{name:'Alpaca',connected:false,configured:false,mode:'PAPER',note:'Add API keys to connect'},{name:'OANDA',connected:false,configured:false,mode:'—',note:'API adapter placeholder'}]});
if(p==='/api/audit')return json(res,200,{events:audit});
if(p==='/api/ai/analyze-trade'&&req.method==='POST'){const b=await readBody(req);const q=bySymbol.get(b.symbol);if(!q)return json(res,400,{error:'Unsupported symbol'});const sentiment=q.change>.25?'bullish':q.change<-.25?'bearish':'neutral';return json(res,200,{source:'LOCAL',symbol:q.symbol,horizon:b.horizon||'1D',sentiment,confidence:Math.min(78,Math.round(52+Math.abs(q.change)*8)),riskLevel:q.type==='Crypto'?'High':q.type==='Treasury'?'Low':'Medium',summaryAr:`الحركة الحالية ${q.change>=0?'إيجابية':'سلبية'} بنسبة ${Math.abs(q.change).toFixed(2)}%.`,summaryEn:`Current movement is ${q.change>=0?'positive':'negative'} by ${Math.abs(q.change).toFixed(2)}%.`,factors:['Price momentum','Risk controls','Demo data status'],warnings:['Price is not verified live data.']});}
if(p==='/api/paper/order'&&req.method==='POST'){const b=await readBody(req);const q=bySymbol.get(b.symbol);if(!q)return json(res,400,{error:'Unsupported symbol'});const qty=Math.max(.0001,Number(b.qty)||1);const sl=b.stopLoss?Number(b.stopLoss):null;if(risk.emergencyStop)return json(res,400,{error:'Risk check failed',reasons:['Emergency stop enabled']});if(risk.requireStopLoss&&!sl)return json(res,400,{error:'Risk check failed',reasons:['Stop Loss required']});if(sl&&b.side==='BUY'&&sl>=q.price)return json(res,400,{error:'Risk check failed',reasons:['BUY Stop Loss must be below entry']});if(sl&&b.side==='SELL'&&sl<=q.price)return json(res,400,{error:'Risk check failed',reasons:['SELL Stop Loss must be above entry']});const id=crypto.randomUUID();const pos={id,symbol:q.symbol,side:b.side==='SELL'?'SELL':'BUY',qty,entryPrice:q.price,stopLoss:sl,takeProfit:b.takeProfit?Number(b.takeProfit):null,openedAt:new Date().toISOString()};portfolio.positions.push(pos);portfolio.trades.unshift({...pos,status:'OPEN'});if(pos.side==='BUY')portfolio.cash-=q.price*qty;audit.unshift({action:'PAPER_ORDER_OPENED',created_at:new Date().toISOString()});return json(res,200,{ok:true,positionId:id,price:q.price});}
if(p==='/api/paper/close'&&req.method==='POST'){const b=await readBody(req);const pos=portfolio.positions.find(x=>x.id===b.id);if(!pos)return json(res,404,{error:'Position not found'});const q=bySymbol.get(pos.symbol);const price=q?.price??pos.entryPrice;const pnl=(price-pos.entryPrice)*pos.qty*(pos.side==='BUY'?1:-1);portfolio.positions=portfolio.positions.filter(x=>x.id!==pos.id);portfolio.cash+=pos.side==='BUY'?price*pos.qty:pnl;portfolio.dailyRealizedPnL+=pnl;portfolio.trades.unshift({...pos,status:'CLOSED',exitPrice:price,pnl,closedAt:new Date().toISOString()});return json(res,200,{ok:true,pnl,exitPrice:price});}
if(p==='/api/paper/reset'&&req.method==='POST'){portfolio={startingCash:100000,cash:100000,dailyRealizedPnL:0,positions:[],trades:[]};return json(res,200,{ok:true});}
if(serveStatic(req,res))return;res.writeHead(404);res.end('Not Found');
}catch(e){console.error(e);json(res,500,{error:'Internal server error'});}});
server.listen(PORT,'0.0.0.0',()=>console.log(`NEXUS Markets production server listening on ${PORT}`));

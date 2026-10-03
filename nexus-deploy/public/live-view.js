import {observationState,WATCH_SYMBOLS} from './market-data.js';

export function liveNow(S){return S.marketClock?S.marketClock.server+(performance.now()-S.marketClock.local):Date.now();}
export function liveState(row,S){return S.marketFetchFailed&&row?.ok?'stale':observationState(row,liveNow(S));}
export function freshLabel(row,S,t){
  const state=liveState(row,S),age=Math.max(0,Math.floor((liveNow(S)-(row?.sourceAsOf||0))/1000));
  if(state==='unavailable')return t('غير متاح','Unavailable');
  if(state==='unverified')return t('وقت غير مؤكد','Unverified time');
  const ageText=age<60?t(`منذ ${age} ث`,`${age}s ago`):t(`منذ ${Math.floor(age/60)} د`,`${Math.floor(age/60)}m ago`);
  return `${state==='fresh'?t('حديثة','Fresh'):t('متأخرة','Stale')} · ${ageText}`;
}
export function updateLiveFreshness(S,t){
  for(const el of document.querySelectorAll('[data-live-key]')){
    const row=S.marketData?.observations.find(r=>`${r.source}:${r.symbol}`===el.dataset.liveKey);
    const state=liveState(row,S);el.className=`live-freshness ${state}`;el.textContent=freshLabel(row,S,t);
  }
  for(const el of document.querySelectorAll('[data-live-price]')){
    const row=S.marketData?.observations.find(r=>`${r.source}:${r.symbol}`===el.dataset.livePrice);
    el.classList.toggle('stale-price',liveState(row,S)!=='fresh');
  }
  for(const el of document.querySelectorAll('[data-poly-key]')){
    const m=S.snapshot?.markets.find(x=>x.id===el.dataset.polyKey),asOf=m?Math.min(m.up.asOf||0,m.down.asOf||0):0;
    const row={ok:!!(m?.up.asks.length&&m?.down.asks.length),sourceAsOf:asOf||null,receivedAt:asOf||null};
    el.className=`live-freshness ${observationState(row,liveNow(S))}`;el.textContent=freshLabel(row,{...S,marketFetchFailed:false},t);
  }
  const header=document.querySelector('.nav [data-page="markets"].active')&&document.getElementById('liveConnection');
  if(header){const fresh=S.marketData?.observations.some(r=>liveState(r,S)==='fresh');header.innerHTML=`<span class="status"><i class="dot ${fresh?'':'off'}"></i>${fresh?t('بيانات سوق متصلة','Market data connected'):S.marketLoading?t('جارٍ الاتصال','Connecting'):t('تحقق من المصادر','Check data sources')}</span>`;}
  for(const el of document.querySelectorAll('[data-live-source-status]')){
    const fresh=S.marketData?.observations.some(r=>r.source===el.dataset.liveSourceStatus&&liveState(r,S)==='fresh');
    el.className=`live-source-tag ${fresh?'online':'offline'}`;el.textContent=`${el.dataset.liveSourceStatus} · ${fresh?t('متصل','Connected'):t('غير متاح أو متأخر','Unavailable / stale')}`;
  }
}
export function liveMarkets({S,t,n,pct,sign,time,chart,icon,btn,notice,empty,marketTable,btcIcon}){
  const rows=S.marketData?.observations||[],row=(source,symbol='BTCUSDT')=>rows.find(r=>r.source===source&&r.symbol===symbol);
  const reference=row('Binance'),digits=q=>q?.last<1?6:q?.last<10?4:2;
  const key=q=>`${q?.source||'Binance'}:${q?.symbol||'BTCUSDT'}`;
  const freshness=q=>`<span class="live-freshness ${liveState(q,S)}" data-live-key="${key(q)}">${freshLabel(q,S,t)}</span>`;
  const quote=q=>q?.ok?n(q.last,digits(q)):'—';
  const amount=v=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(v):'—';
  const stat=(label,value,detail,ico='activity')=>`<div class="stat live-stat"><div class="label">${label}${icon(ico)}</div><div class="live-stat-value">${value}</div><div class="stat-foot">${detail}</div></div>`;
  const volume=reference?.ok?reference.volumeQuote:null;
  const providers=['Binance','OKX','Bybit'];
  const names={BTCUSDT:['بيتكوين','Bitcoin'],ETHUSDT:['إيثيريوم','Ethereum'],SOLUSDT:['سولانا','Solana'],XRPUSDT:['إكس آر بي','XRP'],BNBUSDT:['بي إن بي','BNB'],DOGEUSDT:['دوجكوين','Dogecoin']};
  const currentBook=S.snapshot?.exchanges.find(x=>x.id==='Binance'&&x.ok),bookAge=currentBook?Math.max(0,Math.floor((liveNow(S)-currentBook.asOf)/1000)):null;
  const bookRows=(side)=>{
    const data=(currentBook?.[side]||[]).slice(0,7),max=Math.max(...data.map(x=>x.size),1);
    return data.map(x=>`<div class="book-row ${side==='bids'?'buy':''}" style="--depth:${Math.min(100,x.size/max*100)}%"><span class="${side==='bids'?'positive':'negative'}">${n(x.price)}</span><span>${n(x.size,5)}</span></div>`).join('');
  };
  return `<div class="page-title"><div><div class="eyebrow">FAINANCE / LIVE MARKETS</div><h1>${t('السوق الآن','Markets, right now')}</h1><p>${t('قراءات فعلية من المنصات، مع مصدر كل رقم ووقت تحديثه.','Actual exchange observations, with a source and timestamp for every quote.')}</p></div><div class="row">${btn(icon('download')+t('تصدير القراءات','Export readings'),'exportMarketData','',!S.marketData?'disabled':'')}${btn(icon('refresh')+t('تحديث الآن','Refresh now'),'refreshMarkets','primary',S.marketRefreshing?'disabled':'')}</div></div>
  <div class="live-source-strip"><div class="live-source-tags">${providers.map(p=>`<span data-live-source-status="${p}"></span>`).join('')}</div><span class="small muted">${t('تحديث تلقائي كل 5 ثوانٍ أثناء فتح الصفحة','Auto refresh every 5 seconds while this page is open')}</span></div>
  ${S.marketFetchFailed?notice(t('انقطع تحديث الأسعار. القراءات السابقة معلّمة كمتأخرة حتى يعود الاتصال.','Quote refresh failed. Previous observations are marked stale until the connection returns.'),true):''}
  <div class="stats live-stats">
  ${stat(t('آخر صفقة بيتكوين','Bitcoin last trade'),`<span class="num" data-live-price="Binance:BTCUSDT">${quote(reference)}</span><small>USDT</small>`,freshness(reference),'chart')}
  ${stat(t('التغير خلال 24 ساعة','24-hour change'),`<span class="num ${sign(reference?.changePct)}">${reference?.ok?pct(reference.changePct):'—'}</span>`,t('Binance · نافذة متحركة 24 ساعة','Binance · rolling 24-hour window'),'activity')}
  ${stat(t('حجم تداول 24 ساعة','24-hour quote volume'),`<span class="num">${amount(volume)}</span><small>USDT</small>`,t('تداولات BTC/USDT على Binance','BTC/USDT trades on Binance'),'layers')}
  ${stat(t('الفرق بين العرض والطلب','Bid / ask spread'),`<span class="num">${reference?.ok?n(reference.spread,4):'—'}</span><small>USDT</small>`,t('فرق السعر الحالي · ليس ربحًا','Current quote spread · not profit'),'scan')}
  </div>
  <section class="panel"><div class="panel-head"><div><h2>${icon('activity')}${t('لوحة الأسعار الفعلية','Live price board')}</h2><div class="sub">${t('السوق الفوري · الأسعار مقابل USDT · المصدر: Binance','Spot market · prices in USDT · source: Binance')}</div></div><span class="pill">${t('بيانات سوق حقيقية','Actual market data')}</span></div><div class="table-scroll"><table class="live-watchlist"><thead><tr><th>${t('الأصل','Asset')}</th><th>${t('آخر سعر','Last trade')}</th><th>${t('تغير 24س','24h change')}</th><th>${t('أعلى / أدنى 24س','24h high / low')}</th><th>${t('حجم التداول (USDT)','Volume (USDT)')}</th><th>${t('وقت المصدر · الكويت','Source time · Kuwait')}</th><th>${t('حالة القراءة','Quote status')}</th></tr></thead><tbody>${WATCH_SYMBOLS.map(symbol=>{const q=row('Binance',symbol),base=symbol.replace('USDT','');return `<tr><td><div class="market-cell"><span class="asset-mark asset-${base.toLowerCase()}">${base==='BTC'?btcIcon():base.slice(0,1)}</span><div><strong>${t(...names[symbol])}</strong><small class="num">${base} / USDT</small></div></div></td><td><strong class="num" data-live-price="Binance:${symbol}">${quote(q)}</strong></td><td><span class="num ${sign(q?.changePct)}">${q?.ok?pct(q.changePct):'—'}</span></td><td><span class="num live-range">${q?.ok?n(q.high24h,digits(q)):'—'}<small>${q?.ok?n(q.low24h,digits(q)):'—'}</small></span></td><td><span class="num">${q?.ok?amount(q.volumeQuote):'—'}</span></td><td><span class="num">${time(q?.sourceAsOf)}</span></td><td>${q?freshness(q):`<span class="muted small">${S.marketLoading?t('جارٍ الاتصال…','Connecting…'):t('غير متاح','Unavailable')}</span>`}</td></tr>`;}).join('')}</tbody></table></div></section>
  <section class="below"><div class="live-section-heading"><div><h2>${t('بيتكوين عبر المنصات','Bitcoin across exchanges')}</h2><p class="muted small">${t('مقارنة نفس الزوج BTC/USDT. الفروق تعكس دفاتر منصات مختلفة، ولا تعني ربحًا قابلًا للتنفيذ.','The same BTC/USDT pair across independent venues. Price differences are not executable profit.')}</p></div></div><div class="cols3">${providers.map(source=>{const q=row(source),p=S.marketData?.providers.find(x=>x.source===source);return `<section class="panel live-exchange"><div class="source-top"><h3>${source}</h3>${freshness(q||{source,symbol:'BTCUSDT'})}</div><div class="live-exchange-price"><span class="num" data-live-price="${source}:BTCUSDT">${quote(q)}</span><small>USDT</small></div><div class="metric-row"><span>${t('أفضل طلب شراء','Best bid')}</span><span class="num positive">${q?.ok?n(q.bid):'—'}</span></div><div class="metric-row"><span>${t('أفضل عرض بيع','Best ask')}</span><span class="num negative">${q?.ok?n(q.ask):'—'}</span></div><div class="metric-row"><span>${t('وقت المصدر','Source time')}</span><span class="num">${time(q?.sourceAsOf)}</span></div><div class="metric-row"><span>${t('استلمها الخادم','Server received')}</span><span class="num">${time(q?.receivedAt)}</span></div><a class="inline-link" href="${p?.url||({Binance:'https://www.binance.com/en/trade/BTC_USDT?type=spot',OKX:'https://www.okx.com/trade-spot/btc-usdt',Bybit:'https://www.bybit.com/en/trade/spot/BTC/USDT'})[source]}" target="_blank" rel="noopener">${t('افتح المصدر','Open source')} ↗</a></section>`}).join('')}</div></section>
  <div class="grid dashboard-grid below"><section class="panel"><div class="panel-head"><div><h2>${t('حركة البيتكوين','Bitcoin price action')} <span class="pill grey num">BTC / USDT</span></h2><div class="sub">${t('Binance · شموع مغلقة، يختلف وقتها عن السعر الحالي','Binance · closed candles have a different timestamp from live quotes')}</div></div><div class="segmented">${['1m','5m','15m','1h'].map(x=>`<button class="${S.interval===x?'active':''}" data-interval="${x}">${x}</button>`).join('')}</div></div><div class="chart-wrap">${chart(S.candles)}</div><div class="chart-bottom"><span>${t('آخر شمعة مغلقة','Last closed candle')}: <b class="num">${time(S.candles.at(-1)?.time)}</b></span><span>${t('افتتاح الشمعة · توقيت الكويت','Candle open · Kuwait time')}</span></div></section><section class="panel"><div class="panel-head"><div><h2>${t('دفتر أوامر البيتكوين','Bitcoin order book')}</h2><div class="sub">Binance · ${t('السوق الفوري','Spot market')}</div></div></div><div class="panel-body"><div class="book-head"><span>${t('السعر (USDT)','Price (USDT)')}</span><span>${t('الحجم (BTC)','Size (BTC)')}</span></div>${currentBook?`<div class="book-side-label negative">${t('عروض البيع','Sell orders')}</div>${bookRows('asks')}<div class="book-divider">${t('أفضل عرض / طلب','Top of book')}</div><div class="book-side-label positive">${t('طلبات الشراء','Buy orders')}</div>${bookRows('bids')}<p class="small muted mt">${t('آخر استلام / تحديث','Last received / updated')}: <span class="num">${time(currentBook.asOf)}</span> · ${bookAge>20?t('متأخر','Stale'):t('حديث','Fresh')}</p>`:empty(t('بانتظار دفتر الأوامر','Waiting for order book'),t('لا نملأ البيانات الناقصة بأسعار مفترضة.','Missing data is not filled with assumed prices.'),'book')}</div></section></div>
  <section class="panel below"><div class="panel-head"><div><h2>${t('أسواق توقعات البيتكوين','Bitcoin prediction markets')} · Polymarket</h2><div class="sub">${t('هذه أسعار عقود الصعود والهبوط، وليست سعر البيتكوين بالدولار. تحديث كل 10 ثوانٍ.','These are UP/DOWN contract prices, not Bitcoin dollar prices. Refresh every 10 seconds.')}</div></div><button class="inline-link" data-page="opportunities">${t('رادار الفرص','Opportunity radar')}</button></div>${polymarketQuotes(S,t,n,time,empty)}</section>
  <div class="live-method below">${icon('info')}<p>${t('القراءات تأتي مباشرة من واجهات البيانات العامة الرسمية. «حديثة» تعني أن وقت المصدر والاستلام لا يتجاوزان 15 ثانية. التوقيت المعروض بتوقيت الكويت. التغير والحجم محسوبان على 24 ساعة متحركة؛ USDT ليست تحويلًا تلقائيًا إلى الدولار.','Readings come from official public market-data APIs. “Fresh” means source and receipt timestamps are within 15 seconds. Times are shown in Kuwait time. Change and volume use rolling 24-hour windows; USDT is not automatically converted into USD.')}</p></div>`;
}

function polymarketQuotes(S,t,n,time,empty){
  const rows=S.snapshot?.markets||[];
  if(!rows.length)return empty(t('بانتظار أسواق Polymarket','Waiting for Polymarket'),t('تظهر الأسعار عند استجابة دفاتر الأوامر.','Prices appear when order books respond.'));
  return `<div class="table-scroll"><table><thead><tr><th>${t('السوق','Market')}</th><th>${t('شراء الصعود','Buy UP')}</th><th>${t('شراء الهبوط','Buy DOWN')}</th><th>${t('وقت دفتر الأوامر','Order-book time')}</th><th>${t('الاستحقاق','Expiry')}</th><th>${t('حالة القراءة','Quote status')}</th><th></th></tr></thead><tbody>${rows.slice(0,5).map(m=>{const at=Math.min(m.up.asOf||0,m.down.asOf||0);return `<tr><td><span class="num">BTC · ${m.frame}</span></td><td><span class="num positive">${m.up.asks.length?n(m.up.asks[0].price*100,1)+'¢':'—'}</span></td><td><span class="num negative">${m.down.asks.length?n(m.down.asks[0].price*100,1)+'¢':'—'}</span></td><td><span class="num">${time(at)}</span></td><td><span class="num">${time(Date.parse(m.endDate))}</span></td><td><span data-poly-key="${m.id}"></span></td><td><a class="inline-link" href="https://polymarket.com/event/${encodeURIComponent(m.slug)}" target="_blank" rel="noopener">${t('المصدر','Source')} ↗</a></td></tr>`;}).join('')}</tbody></table></div>`;
}

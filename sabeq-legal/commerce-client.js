(() => {
  'use strict';
  const API = window.__SABEQ_API_ORIGIN__ || 'https://sabeq-legal-research-api.onrender.com';
  const originalFetch = window.fetch.bind(window);
  const TOKEN = 'sabeq-session-token';
  const words = {
    ar: { account:'طلباتي', login:'تأكيد الحساب', intro:'أكد بريدك أو هاتفك للمتابعة وحفظ طلباتك.', name:'الاسم', channel:'وسيلة التحقق', email:'البريد الإلكتروني', sms:'رسالة نصية', whatsapp:'واتساب', phone:'رقم الهاتف', send:'إرسال رمز التحقق', code:'رمز التحقق', verify:'تأكيد الرمز', resend:'إعادة إرسال الرمز', change:'تعديل بيانات التواصل', close:'إغلاق', cancel:'إلغاء', logout:'تسجيل الخروج', loading:'جارٍ التحميل…', unavailable:'خدمة التحقق قيد الإعداد. يرجى المحاولة لاحقاً.', review:'مراجعة طلب المذكرة', price:'المبلغ المطلوب', pay:'المتابعة للدفع', pending:'جارٍ التحقق من الدفع. لا تنشئ دفعة أخرى لهذا الطلب.', saved:'بيانات الطلب محفوظة في حسابك.', paid:'تم تأكيد الدفع', processing:'جارٍ إعداد المذكرة', completed:'المذكرة جاهزة', failed:'تعذر توليد المذكرة. الدفع محفوظ لهذا الطلب.', retry:'إعادة المحاولة دون دفع جديد', download:'تنزيل المذكرة', open:'فتح الطلب', refresh:'تحديث الحالة', empty:'لا توجد طلبات حتى الآن.', error:'تعذر إتمام الطلب. يرجى المحاولة لاحقاً.', unpaid:'بانتظار الدفع', canceled:'عملية الدفع ملغاة', unknown:'الدفع قيد المراجعة', test:'بيئة اختبار — ليست عملية دفع حقيقية', notReady:'الدفع غير متاح حالياً. لم يتم تحصيل أي مبلغ.', frozen:'المبلغ لهذا الطلب. تُحفظ بياناته قبل الانتقال للدفع، ويمكن إعادة المحاولة دون تحصيل جديد إذا تعذر التوليد.', files:'المرفقات', refund:'طلب مراجعة استرداد', reason:'سبب طلب الاسترداد', submit:'إرسال الطلب', newCopy:'طلب آخر بالبيانات نفسها', seconds:'ثانية', cancelled:'تم إغلاق المتابعة. يمكنك استكمال الطلب من «طلباتي».', session:'انتهت الجلسة؛ أكد حسابك للمتابعة.', sent:'أرسلنا الرمز إلى', invalidCode:'الرمز غير صحيح أو انتهت صلاحيته.', rate:'محاولات كثيرة. انتظر قليلاً.', support:'تواصل مع الإدارة لاستكمال الطلب المدفوع.' },
    en: { account:'My orders', login:'Verify your account', intro:'Verify your email or phone to continue and save your orders.', name:'Name', channel:'Verification method', email:'Email', sms:'Text message', whatsapp:'WhatsApp', phone:'Phone number', send:'Send verification code', code:'Verification code', verify:'Verify code', resend:'Resend code', change:'Edit contact details', close:'Close', cancel:'Cancel', logout:'Sign out', loading:'Loading…', unavailable:'Verification is being configured. Please try again later.', review:'Review memo order', price:'Amount due', pay:'Continue to payment', pending:'Confirming payment. Do not make another payment for this order.', saved:'Your order is saved in your account.', paid:'Payment confirmed', processing:'Preparing your memo', completed:'Your memo is ready', failed:'Generation failed. Your payment remains attached to this order.', retry:'Retry at no additional charge', download:'Download memo', open:'Open order', refresh:'Refresh status', empty:'No orders yet.', error:'Unable to complete this request. Please try again.', unpaid:'Awaiting payment', canceled:'Payment canceled', unknown:'Payment under review', test:'Test environment — no real payment', notReady:'Payment is not available yet. No amount has been charged.', frozen:'This amount is for this order. Its details are saved before payment. Failed generation can be retried without another charge.', files:'Attachments', refund:'Request refund review', reason:'Reason for refund request', submit:'Submit request', newCopy:'New order with these details', seconds:'seconds', cancelled:'You can continue this order from My orders.', session:'Your session expired. Please verify again.', sent:'We sent the code to', invalidCode:'The code is incorrect or expired.', rate:'Too many attempts. Please wait.', support:'Contact support to continue this paid order.' },
    ur: { account:'میرے آرڈرز', login:'اکاؤنٹ کی تصدیق', intro:'آگے بڑھنے اور آرڈرز محفوظ کرنے کے لیے ای میل یا فون کی تصدیق کریں۔', name:'نام', channel:'تصدیق کا طریقہ', email:'ای میل', sms:'ایس ایم ایس', whatsapp:'واٹس ایپ', phone:'فون نمبر', send:'تصدیقی کوڈ بھیجیں', code:'تصدیقی کوڈ', verify:'کوڈ کی تصدیق', resend:'کوڈ دوبارہ بھیجیں', change:'رابطے کی معلومات بدلیں', close:'بند کریں', cancel:'منسوخ', logout:'سائن آؤٹ', loading:'لوڈ ہو رہا ہے…', unavailable:'تصدیقی سروس کی تیاری جاری ہے۔ بعد میں کوشش کریں۔', review:'درخواست کا جائزہ', price:'واجب الادا رقم', pay:'ادائیگی جاری رکھیں', pending:'ادائیگی کی تصدیق جاری ہے۔ دوبارہ ادائیگی نہ کریں۔', saved:'درخواست آپ کے اکاؤنٹ میں محفوظ ہے۔', paid:'ادائیگی کی تصدیق ہو گئی', processing:'قانونی مسودہ تیار ہو رہا ہے', completed:'مسودہ تیار ہے', failed:'مسودہ تیار نہیں ہو سکا۔ آپ کی ادائیگی اس درخواست کے لیے محفوظ ہے۔', retry:'بغیر اضافی ادائیگی دوبارہ کوشش', download:'مسودہ ڈاؤن لوڈ کریں', open:'درخواست کھولیں', refresh:'حالت تازہ کریں', empty:'ابھی کوئی درخواست نہیں۔', error:'درخواست مکمل نہیں ہو سکی۔ دوبارہ کوشش کریں۔', unpaid:'ادائیگی کا انتظار', canceled:'ادائیگی منسوخ', unknown:'ادائیگی کا جائزہ جاری ہے', test:'آزمائشی ماحول — حقیقی ادائیگی نہیں', notReady:'ادائیگی ابھی دستیاب نہیں۔ کوئی رقم وصول نہیں کی گئی۔', frozen:'یہ رقم اسی درخواست کے لیے ہے۔ مسودہ تیار نہ ہونے پر اضافی ادائیگی کے بغیر دوبارہ کوشش ہو سکتی ہے۔', files:'منسلک فائلیں', refund:'رقم کی واپسی کے جائزے کی درخواست', reason:'واپسی کی وجہ', submit:'درخواست بھیجیں', newCopy:'اسی معلومات کے ساتھ نئی درخواست', seconds:'سیکنڈ', cancelled:'میرے آرڈرز سے درخواست جاری رکھ سکتے ہیں۔', session:'سیشن ختم ہو گیا۔ دوبارہ تصدیق کریں۔', sent:'کوڈ یہاں بھیجا گیا', invalidCode:'کوڈ غلط ہے یا ختم ہو گیا۔', rate:'بہت زیادہ کوششیں۔ کچھ دیر انتظار کریں۔', support:'اس ادا شدہ درخواست کے لیے انتظامیہ سے رابطہ کریں۔' }
  };
  const lang = () => ['ar','en','ur'].includes(document.documentElement.lang) ? document.documentElement.lang : 'ar';
  const t = key => words[lang()][key] || words.en[key] || key;
  const money = fils => (Number(fils) / 1000).toFixed(3) + (lang() === 'ar' ? ' د.ك' : ' KWD');
  function storageGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
  function storageSet(key, value) { try { value == null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value); } catch (_) {} }
  try {
    const previous = localStorage.getItem(TOKEN);
    if (previous && previous !== 'sabeq-temporary-guest-session') storageSet(TOKEN, previous);
    localStorage.removeItem(TOKEN); sessionStorage.removeItem('sabeq-guest-mode');
    if (storageGet(TOKEN) === 'sabeq-temporary-guest-session') storageSet(TOKEN, null);
  } catch (_) {}
  let uploadDraftId = crypto.randomUUID(), selectedFiles = [];
  function selectFiles(files) {
    selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) uploadDraftId = crypto.randomUUID();
  }
  async function archiveSelectedFiles() {
    if (!selectedFiles.length) return [];
    const body = new FormData(); selectedFiles.forEach(file => body.append('documents', file, file.name));
    const response = await originalFetch(API + '/api/orders/uploads', { method:'POST', body, credentials:'omit',
      headers:{ Authorization:'Bearer ' + storageGet(TOKEN), 'X-Sabeq-Draft-Id':uploadDraftId }, signal:AbortSignal.timeout(90000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t('error'));
    return result.attachmentIds;
  }
  function element(tag, text, attrs = {}) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) { if (key in node && !key.startsWith('aria-')) node[key] = value; else node.setAttribute(key, value); }
    return node;
  }
  function errorText(error) {
    if (lang() === 'ar' && error.message) return error.message;
    return t(({ authentication_required:'session', invalid_code:'invalidCode', rate_limited:'rate', resend_cooldown:'rate', payment_not_configured:'notReady', commerce_setup_required:'unavailable', verification_not_configured:'unavailable', support_required:'support' })[error.code] || 'error');
  }
  async function api(path, body, options = {}) {
    const headers = new Headers(options.headers || {}); headers.set('Accept', 'application/json');
    const token = options.token ?? storageGet(TOKEN);
    if (token) headers.set('Authorization', 'Bearer ' + token);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await originalFetch(API + path, { method: options.method || (body === undefined ? 'GET' : 'POST'), headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), mode: 'cors', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(35000) });
    let result; try { result = await response.json(); } catch (_) { throw new Error(t('error')); }
    if (!response.ok) { const error = new Error(result.error || t('error')); error.code = result.code; error.status = response.status; throw error; }
    return result;
  }
  function dialog(title) {
    const box = element('dialog', null, { className:'sabeq-commerce', dir:lang() === 'en' ? 'ltr' : 'rtl' });
    const header = element('div', null, { className:'sc-header' });
    const heading = element('h2', title, { id:'sc-title-' + crypto.randomUUID() });
    box.setAttribute('aria-labelledby', heading.id);
    const close = element('button', t('close'), { type:'button', className:'sc-secondary' });
    header.append(heading, close);
    const body = element('div', null, { className:'sc-body' });
    const status = element('p', '', { className:'sc-message', role:'status' });
    box.append(header, body, status); document.body.append(box); box.showModal();
    close.addEventListener('click', () => box.close());
    box.addEventListener('close', () => box.remove(), { once:true });
    return { box, body, status, heading, close:() => box.close(), message:value => { status.textContent = value; } };
  }
  function button(label, action, secondary = false) {
    const node = element('button', label, { type:'button', className:secondary ? 'sc-secondary' : 'sc-primary' });
    node.addEventListener('click', async () => { node.disabled = true; try { await action(); } catch (error) { const status = node.closest('dialog')?.querySelector('.sc-message'); if (status) status.textContent = errorText(error); } finally { node.disabled = false; } });
    return node;
  }
  let loginPromise;
  function login() {
    if (loginPromise) return loginPromise;
    loginPromise = new Promise((resolve, reject) => {
      const view = dialog(t('login')); let finished = false, timer;
      view.box.addEventListener('close', () => { clearInterval(timer); if (!finished) reject(new Error(t('cancelled'))); });
      function complete(result) {
        storageSet(TOKEN, result.token); finished = true;
        window.dispatchEvent(new CustomEvent('sabeq:authenticated', { detail:result }));
        view.close(); resolve(result);
      }
      api('/api/commerce/config').then(config => {
        if (!config.channels.length) { view.message(t('unavailable')); return; }
        const form = element('form');
        const name = element('input', null, { name:'name', autoComplete:'name', required:true, minLength:2, maxLength:100 });
        const channel = element('select', null, { name:'channel' });
        for (const choice of config.channels) channel.append(element('option', t(choice), { value:choice }));
        const email = element('input', null, { name:'email', type:'email', autoComplete:'email', dir:'ltr', maxLength:254 });
        const phone = element('input', null, { name:'phone', type:'tel', autoComplete:'tel', dir:'ltr', placeholder:'+965', maxLength:20 });
        function field(label, input) { const field = element('label', null, { className:'sc-field' }); field.append(element('span',label),input); return field; }
        const emailField = field(t('email'), email), phoneField = field(t('phone'), phone);
        function toggle() { const isEmail = channel.value === 'email'; emailField.hidden = !isEmail; email.required = isEmail; phoneField.hidden = isEmail; phone.required = !isEmail; }
        channel.addEventListener('change', toggle); toggle();
        const submit = element('button', t('send'), { type:'submit', className:'sc-primary' });
        form.append(element('p', t('intro')),field(t('name'),name),field(t('channel'),channel),emailField,phoneField,submit);
        view.body.append(form);
        form.addEventListener('submit', async event => {
          event.preventDefault(); submit.disabled = true; view.message(t('loading'));
          const details = { name:name.value, channel:channel.value, email:email.value, phone:phone.value, language:lang() };
          try {
            let challenge = await api('/api/auth/request-code', details);
            const codeForm = element('form'); const code = element('input', null, { name:'code', inputMode:'numeric', autoComplete:'one-time-code', pattern:'[0-9]{6}', maxLength:6, minLength:6, required:true, dir:'ltr' });
            const verify = element('button', t('verify'), { className:'sc-primary', type:'submit' });
            let deadline = Date.now() + challenge.retryAfter * 1000;
            const resend = button(t('resend'), async () => { challenge = await api('/api/auth/request-code', details); deadline = Date.now() + challenge.retryAfter * 1000; view.message(t('sent') + ' ' + challenge.maskedContact); });
            const countdown = () => { const seconds = Math.ceil((deadline - Date.now()) / 1000); resend.disabled = seconds > 0; resend.textContent = seconds > 0 ? t('resend') + ' (' + seconds + ' ' + t('seconds') + ')' : t('resend'); };
            countdown(); timer = setInterval(countdown, 1000);
            const change = button(t('change'), () => { clearInterval(timer); view.body.replaceChildren(form); view.message(''); }, true);
            codeForm.append(field(t('code'), code),verify,resend,change); view.body.replaceChildren(codeForm); code.focus();
            view.message(t('sent') + ' ' + challenge.maskedContact);
            codeForm.addEventListener('submit', async event => { event.preventDefault(); verify.disabled = true; try { complete(await api('/api/auth/verify-code', { challengeId:challenge.challengeId, code:code.value })); } catch (error) { view.message(errorText(error)); } finally { verify.disabled = false; } });
          } catch (error) { view.message(errorText(error)); } finally { submit.disabled = false; }
        });
      }).catch(error => view.message(errorText(error)));
    }).finally(() => { loginPromise = null; });
    return loginPromise;
  }
  async function session() {
    if (storageGet(TOKEN)) { try { return await api('/api/auth/session'); } catch (error) { if (error.status !== 401) throw error; storageSet(TOKEN, null); } }
    return login();
  }
  const statusText = order => order.paymentStatus === 'paid'
    ? t(({ completed:'completed', processing:'processing', queued:'processing', waiting:'processing', failed:'failed' })[order.generationStatus] || 'paid')
    : t(({ unpaid:'unpaid', canceled:'canceled', creating:'pending', pending:'pending', unknown:'unknown' })[order.paymentStatus] || 'pending');
  async function download(path, filename) {
    const response = await originalFetch(API + path, { headers:{ Authorization:'Bearer ' + storageGet(TOKEN) }, credentials:'omit' });
    if (!response.ok) throw new Error(t('error'));
    saveBlob(await response.blob(), filename);
  }
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob); const a = element('a', '', { href:url, download:filename }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function showOrder(id) {
    await session();
    return new Promise((resolve, reject) => {
      const view = dialog(t('review')); let timer, settled = false, checking = false, lastCheck = 0;
      view.box.addEventListener('close', () => { clearTimeout(timer); if (!settled) reject(new Error(t('cancelled'))); });
      async function refresh() {
        if (!view.box.open || checking) return; checking = true;
        try {
          let result = await api('/api/orders/' + encodeURIComponent(id)); let order = result.order;
          if (['pending','unknown','creating'].includes(order.paymentStatus) && Date.now() - lastCheck > 15000) {
            lastCheck = Date.now();
            try { order = (await api('/api/orders/' + id + '/check-payment', {})).order; } catch (error) { view.message(errorText(error)); }
          }
          view.heading.textContent = t(order.result ? 'completed' : 'review');
          const status = element('p', statusText(order), { className:'sc-status', role:'status' });
          const price = element('p', t('price') + ': ' + money(order.amountFils), { className:'sc-price' });
          const label = element('p', '#' + order.id.slice(0,8), { className:'sc-reference', dir:'ltr' });
          const children = [label,status,price];
          if (order.environment === 'test') children.push(element('p',t('test'),{className:'sc-test'}));
          if (result.order.draft) {
            const draft = result.order.draft;
            const details = element('dl', null, { className:'sc-details' });
            for (const [name, value] of [[lang()==='ar'?'المحكمة':'Court',draft.court],[lang()==='ar'?'نوع القضية':'Case type',draft.caseType],[lang()==='ar'?'صاحب الطلب':'Client',draft.clientName]]) details.append(element('dt',name),element('dd',value));
            children.push(details);
          }
          if (['unpaid','pending'].includes(order.paymentStatus)) children.push(button(t('pay'), async () => {
            const payment = await api('/api/orders/' + id + '/checkout', {});
            if (payment.checkoutUrl) { const url = new URL(payment.checkoutUrl); if (url.protocol !== 'https:' || !(url.hostname === 'myfatoorah.com' || url.hostname.endsWith('.myfatoorah.com')) || url.username || url.password) throw new Error(t('error')); storageSet('sabeq-last-order', id); window.location.assign(url.href); }
            else await refresh();
          }));
          if (order.canRetry) children.push(button(t('retry'), async () => { await api('/api/orders/' + id + '/generate', {}); await refresh(); }));
          if (order.generationStatus === 'failed' && !order.canRetry) children.push(element('p',t('support')));
          if (order.result) {
            const memo = element('pre', order.result.memo, { className:'sc-memo', dir:'rtl' });
            children.push(memo,button(t('download'), () => saveBlob(new Blob([order.result.memo],{type:'text/plain;charset=utf-8'}),'sabeq-memo-' + id.slice(0,8) + '.txt')));
            if (!settled) { settled = true; resolve(order.result); }
          }
          if (result.files?.length) {
            children.push(element('p',t('files')));
            for (const file of result.files) children.push(button(file.name, () => download('/api/orders/' + id + '/files/' + file.id, file.name),true));
          }
          if (order.paymentStatus === 'canceled') children.push(button(t('newCopy'), async () => {
            const copied = await api('/api/orders',{draft:result.order.draft,requestKey:crypto.randomUUID(),fileIds:(result.files||[]).map(f=>f.id)});
            settled = true; view.close(); showOrder(copied.order.id).then(resolve,reject);
          }));
          if (order.paymentStatus === 'paid') children.push(button(t('refund'), async () => {
            clearTimeout(timer);
            const form = element('form'); const reason = element('textarea',null,{required:true,minLength:3,maxLength:1000,'aria-label':t('reason')});
            const send = element('button',t('submit'),{type:'submit',className:'sc-primary'});
            form.append(element('p',t('reason')),reason,send,button(t('cancel'),refresh,true)); view.body.replaceChildren(form);
            form.addEventListener('submit',async event=>{event.preventDefault();send.disabled=true;try{await api('/api/orders/'+id+'/refund-request',{reason:reason.value});await refresh();view.message(lang()==='ar'?'تم تسجيل الطلب للمراجعة. لم يُنفّذ استرداد مالي بعد.':lang()==='ur'?'درخواست جائزے کے لیے محفوظ ہو گئی؛ رقم ابھی واپس نہیں ہوئی۔':'Request submitted for review. No refund has been issued yet.');}catch(error){view.message(errorText(error));}finally{send.disabled=false;}});
          },true));
          children.push(element('p',t(order.paymentStatus==='unpaid'?'frozen':'saved'),{className:'sc-note'}));
          view.body.replaceChildren(...children);
          if (!order.result && order.paymentStatus !== 'canceled' && order.generationStatus !== 'failed' && order.paymentStatus !== 'unpaid') timer=setTimeout(refresh,4000);
        } catch (error) { view.message(errorText(error)); view.body.replaceChildren(button(t('refresh'),refresh)); }
        finally { checking=false; }
      }
      refresh();
    });
  }
  async function beginOrder(draft) {
    const {user} = await session(); const config = await api('/api/commerce/config');
    if (!config.paymentReady) throw new Error(t('notReady'));
    const ids = await archiveSelectedFiles();
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({draft,ids,userId:user.id})));
    const key = Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
    const result = await api('/api/orders',{draft,fileIds:ids,requestKey:key});
    storageSet('sabeq-last-order',result.order.id);
    return showOrder(result.order.id);
  }
  async function account() {
    await session(); const view = dialog(t('account')); view.message(t('loading'));
    try {
      const result=await api('/api/orders');view.message('');
      if(!result.orders.length)view.body.append(element('p',t('empty')));
      for(const order of result.orders){const row=element('div',null,{className:'sc-order-row'});row.append(element('span','#'+order.id.slice(0,8)+' · '+money(order.amountFils)),element('p',statusText(order)),button(t('open'),()=>{view.close();return showOrder(order.id).catch(()=>{});},true));view.body.append(row);}
      view.body.append(button(t('logout'),async()=>{await api('/api/auth/logout',{});storageSet(TOKEN,null);storageSet('sabeq-upload-files',null);storageSet('sabeq-upload-draft',null);selectFiles([]);window.dispatchEvent(new CustomEvent('sabeq:authenticated',{detail:{token:'',user:null}}));view.close();},true));
    }catch(error){view.message(errorText(error));}
  }
  window.fetch = async function(input, init = {}) {
    let url; try { url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href); }catch(_){return originalFetch(input,init);}
    const scoped=[API,location.origin,'https://sabeq-legal-public.centrino.chatgpt.site'].includes(url.origin);
    if(!scoped || !url.pathname.startsWith('/api/legal/') || url.pathname==='/api/legal/search'||url.pathname==='/api/legal/health')return originalFetch(input,init);
    if(url.pathname==='/api/legal/memo'){
      try{const body=typeof init.body==='string'?JSON.parse(init.body):input instanceof Request?await input.clone().json():{};const result=await beginOrder(body);return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});}
      catch(error){return new Response(JSON.stringify({error:errorText(error)}),{status:400,headers:{'Content-Type':'application/json'}});}
    }
    await session();const headers=new Headers(init.headers||(input instanceof Request?input.headers:{}));headers.set('Authorization','Bearer '+storageGet(TOKEN));
    if(url.pathname==='/api/legal/analyze-documents')headers.set('X-Sabeq-Draft-Id',uploadDraftId);
    const response=await originalFetch(input,{...init,headers});
    return response;
  };
  window.SabeqCommerce = Object.freeze({login,account,showOrder,selectFiles});
  function mount(){
    const host=document.querySelector('.header-actions');
    if(host&&!host.querySelector('[data-sabeq-orders]')){const control=button(t('account'),account,true);control.setAttribute('data-sabeq-orders','true');control.classList.add('sc-account-button');host.append(control);}
    const control=document.querySelector('[data-sabeq-orders]');if(control&&control.textContent!==t('account'))control.textContent=t('account');
  }
  function start(){mount();new MutationObserver(mount).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['lang']});const url=new URL(location.href);const order=url.searchParams.get('sabeqOrder');if(order&&/^[a-f0-9-]{36}$/.test(order)){storageSet('sabeq-last-order',order);url.searchParams.delete('sabeqOrder');url.searchParams.delete('paymentId');history.replaceState(null,'',url);showOrder(order).catch(()=>{});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

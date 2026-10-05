'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const form = $('#project-form');
  let language = 'ar';
  let activeSolution = 'website';
  let briefText = '';
  const copy = {
    ar: {title:'ديجي زون | مواقع وتطبيقات وحلول رقمية',description:'ديجي زون: تصميم وتطوير المواقع والتطبيقات، أنظمة الأعمال، وحلول الذكاء الاصطناعي والأتمتة. اكتشف الحل المناسب لمشروعك.',brand:'Digizone | حلول رقمية ذكية',social:'من الفكرة إلى الإطلاق: مواقع وتطبيقات وأنظمة رقمية تتناسب مع عملك.',copied:'تم نسخ الملخص.',copyFailed:'تعذّر النسخ التلقائي. حدّد النص وانسخه، أو نزّل الملخص.',downloaded:'تم تجهيز الملف للتنزيل.',name:'الاسم',company:'الشركة',email:'البريد الإلكتروني',service:'الخدمة المطلوبة',details:'تفاصيل المشروع',briefTitle:'ديجي زون | ملخص مشروع',date:'التاريخ',emailAction:'فتح البريد لإرسال الملخص',whatsappAction:'مشاركة عبر واتساب',emailLabel:'البريد الإلكتروني',whatsappLabel:'تواصل عبر واتساب',subject:'طلب مشروع جديد — Digizone'},
    en: {title:'Digizone | Websites, Apps & Digital Solutions',description:'Digizone: website and app design and development, business platforms, AI and automation. Discover the right solution for your project.',brand:'Digizone | Digital Solutions',social:'From idea to launch: websites, applications and digital systems built around your business.',copied:'Brief copied.',copyFailed:'Automatic copy is unavailable. Select and copy the text, or download your brief.',downloaded:'Your file is ready to download.',name:'Name',company:'Company',email:'Email',service:'Requested service',details:'Project details',briefTitle:'Digizone | Project brief',date:'Date',emailAction:'Open email to send brief',whatsappAction:'Share via WhatsApp',emailLabel:'Email',whatsappLabel:'Contact on WhatsApp',subject:'New project enquiry — Digizone'}
  };
  const solutions = {
    website: {service:'web',index:'01 / 03',ar:{title:'حضور رقمي يعرّف بك، ويخدم عملاءك.',description:'موقع منظّم يعرض شركتك وخدماتك ويجعل الخطوة التالية واضحة للزائر.',features:['صفحات تعكس هوية الشركة','تجربة عربية وإنجليزية','عرض الخدمات ونقاط التواصل','تهيئة للجوال ومحركات البحث']},en:{title:'A presence that represents you. And serves your customers.',description:'A structured website that introduces your business, explains your services and makes the next step clear.',features:['Pages built around your brand','Arabic and English experiences','Clear services and contact points','Mobile and search foundations']}},
    platform: {service:'system',index:'02 / 03',ar:{title:'خدماتك في منصة واحدة، سهلة الاستخدام.',description:'تجربة تربط المستخدم بالخدمة، وتمنح فريقك الأدوات اللازمة لإدارتها.',features:['كتالوج للخدمات أو الدورات أو المنتجات','حسابات وصلاحيات حسب الحاجة','متابعة الطلبات والاشتراكات','تكامل الدفع والتنبيهات بحسب النطاق']},en:{title:'Your services. One intuitive platform.',description:'Connect users to your services and give your team the tools to manage the experience.',features:['Services, courses or product catalogue','Accounts and permissions as needed','Order and subscription management','Scoped payment and notification integrations']}},
    management: {service:'system',index:'03 / 03',ar:{title:'نظام يناسب فريقك، وطريقة عمله.',description:'نحوّل خطوات العمل اليومية إلى لوحة واضحة تربط البيانات والمهام والمستخدمين.',features:['لوحات ومؤشرات وفق أهداف العمل','أدوار وصلاحيات للمستخدمين','أرشفة ومتابعة للطلبات والمهام','تقارير وتكامل مع أدواتك']},en:{title:'A system built around your team.',description:'Turn everyday operations into a clear workspace connecting data, tasks and people.',features:['Dashboards around business goals','User roles and permissions','Records, requests and task tracking','Reports and connections to your tools']}}
  };
  const config = window.DIGIZONE_CONFIG || {};
  const companyEmail = typeof config.email === 'string' && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(config.email) ? config.email : '';
  const companyWhatsApp = typeof config.whatsapp === 'string' && /^[1-9]\d{7,14}$/.test(config.whatsapp) ? config.whatsapp : '';
  function setMenu(open) {
    $('#main-menu').classList.toggle('is-open', open);
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
    $('#menu-toggle').setAttribute('aria-label', language === 'ar' ? (open ? 'إغلاق القائمة' : 'فتح القائمة') : (open ? 'Close menu' : 'Open menu'));
  }
  function renderSolution() {
    const item = solutions[activeSolution];
    const content = item[language];
    $('#solution-index').textContent = item.index;
    $('#solution-title').textContent = content.title;
    $('#solution-description').textContent = content.description;
    $('#solution-cta').dataset.selectService = item.service;
    $('#solution-panel').setAttribute('aria-labelledby', 'tab-' + activeSolution);
    $('#solution-features').replaceChildren(...content.features.map((feature,index) => {
      const row = document.createElement('div');
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2,'0');
      const text = document.createElement('p'); text.textContent = feature;
      row.append(number,text); return row;
    }));
    $$('[data-solution]').forEach(tab => {
      const active = tab.dataset.solution === activeSolution;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }
  function createContactLink(href,label,className='text-link') {
    const link = document.createElement('a'); link.href = href; link.textContent = label;
    link.className = className; link.target = '_blank'; link.rel = 'noopener noreferrer';
    return link;
  }
  function renderContact() {
    const target = $('#contact-direct'); target.replaceChildren();
    if (companyEmail) {const link = createContactLink('mailto:' + companyEmail,companyEmail);link.dir='ltr';target.append(link);}
    if (companyWhatsApp) target.append(createContactLink('https://wa.me/' + companyWhatsApp,copy[language].whatsappLabel));
    target.hidden = !target.childElementCount;
    renderBriefActions();
  }
  function renderBriefActions() {
    const target = $('#brief-send-actions'); target.replaceChildren();
    if (companyEmail) target.append(createContactLink('mailto:' + companyEmail + '?subject=' + encodeURIComponent(copy[language].subject) + '&body=' + encodeURIComponent(briefText),copy[language].emailAction,'btn btn-outline'));
    if (companyWhatsApp) target.append(createContactLink('https://wa.me/' + companyWhatsApp + '?text=' + encodeURIComponent(briefText),copy[language].whatsappAction,'btn btn-outline'));
    target.hidden = !target.childElementCount;
  }
  function buildBrief() {
    const values = new FormData(form); const words = copy[language];
    const lines = [words.briefTitle,'—',words.date + ': ' + new Intl.DateTimeFormat(language==='ar'?'ar-KW':'en-GB',{dateStyle:'medium'}).format(new Date()),words.name + ': ' + String(values.get('name')).trim()];
    for (const field of ['company','email']) {const value = String(values.get(field)||'').trim();if(value)lines.push(words[field]+': '+value);}
    lines.push(words.service + ': ' + $('#project-service').selectedOptions[0].textContent,'',words.details + ':',String(values.get('details')).trim());
    briefText = lines.join('\n'); $('#brief-output').textContent = briefText;renderBriefActions();
  }
  function setLanguage(next, updateUrl=true) {
    language = next === 'en' ? 'en' : 'ar';
    document.documentElement.lang = language;document.documentElement.dir = language==='ar'?'rtl':'ltr';
    $$('[data-ar][data-en]').forEach(el => {el.textContent = el.dataset[language];});
    $$('[data-placeholder-ar]').forEach(el => {el.placeholder = language==='ar'?el.dataset.placeholderAr:el.dataset.placeholderEn;});
    $$('[data-label-ar]').forEach(el => {el.setAttribute('aria-label',language==='ar'?el.dataset.labelAr:el.dataset.labelEn);});
    $$('[data-alt-ar]').forEach(el => {el.alt = language==='ar'?el.dataset.altAr:el.dataset.altEn;});
    $('#language-toggle').textContent = language==='ar'?'EN':'ع';
    $('#language-toggle').lang = language==='ar'?'en':'ar';
    $('#language-toggle').setAttribute('aria-label',language==='ar'?'Switch to English':'التبديل إلى العربية');
    document.title = copy[language].title;
    $('meta[name="description"]').content = copy[language].description;
    $('meta[property="og:title"]').content = copy[language].brand;
    $('meta[property="og:description"]').content = copy[language].social;
    try {localStorage.setItem('digizone-language',language);} catch {}
    if (updateUrl) {try {const url = new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);}catch{}}
    setMenu(false);renderSolution();renderContact();
    $('#brief-status').textContent = '';
    if ($('#brief-dialog').open) buildBrief();
  }
  function openDialog(dialog) {dialog.showModal();document.body.classList.add('modal-open');}
  $$('dialog').forEach(dialog => {
    dialog.querySelector('.close-dialog').addEventListener('click',() => dialog.close());
    dialog.addEventListener('close',() => {if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');});
    dialog.addEventListener('click',event => {const box=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom))dialog.close();});
  });
  $('#language-toggle').addEventListener('click',() => setLanguage(language==='ar'?'en':'ar'));
  $('#menu-toggle').addEventListener('click',() => setMenu($('#menu-toggle').getAttribute('aria-expanded')!=='true'));
  $('#main-menu').addEventListener('click',event => {if(event.target.closest('a'))setMenu(false);});
  document.addEventListener('click',event => {
    if(!event.target.closest('.nav') && $('#main-menu').classList.contains('is-open'))setMenu(false);
    const link=event.target.closest('[data-select-service]');if(link)$('#project-service').value=link.dataset.selectService;
  });
  document.addEventListener('keydown',event => {if(event.key==='Escape' && $('#main-menu').classList.contains('is-open')){setMenu(false);$('#menu-toggle').focus();}});
  window.addEventListener('resize',() => {if(window.innerWidth>900)setMenu(false);});
  const tabs=$$('[data-solution]');tabs.forEach((tab,index) => {
    tab.addEventListener('click',() => {activeSolution=tab.dataset.solution;renderSolution();});
    tab.addEventListener('keydown',event => {
      let next=index;const forward=language==='ar'?'ArrowLeft':'ArrowRight';const backward=language==='ar'?'ArrowRight':'ArrowLeft';
      if(event.key===forward)next=(index+1)%tabs.length;else if(event.key===backward)next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
      event.preventDefault();tabs[next].click();tabs[next].focus();
    });
  });
  form.addEventListener('submit',event => {event.preventDefault();if(!form.reportValidity())return;buildBrief();$('#brief-status').textContent='';openDialog($('#brief-dialog'));});
  $('#copy-brief').addEventListener('click',async () => {
    try {await navigator.clipboard.writeText(briefText);$('#brief-status').textContent=copy[language].copied;}catch {const range=document.createRange();range.selectNodeContents($('#brief-output'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);$('#brief-status').textContent=copy[language].copyFailed;}
  });
  $('#download-brief').addEventListener('click',() => {
    const blob=new Blob(['\uFEFF'+briefText],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='Digizone-Project-Brief-'+language+'.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#brief-status').textContent=copy[language].downloaded;
  });
  $('#privacy-open').addEventListener('click',() => openDialog($('#privacy-dialog')));
  $('#copyright-year').textContent=String(new Date().getFullYear());
  let initial=new URLSearchParams(location.search).get('lang');
  if(initial!=='ar' && initial!=='en') {try{initial=localStorage.getItem('digizone-language');}catch{}}
  setLanguage(initial==='en'?'en':'ar',false);
})();

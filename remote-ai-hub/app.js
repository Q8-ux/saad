(function(){
  'use strict';
  const {resources,categories,select}=window.MADAR;
  const initialParams=new URLSearchParams(location.search);
  const initialSection=initialParams.get('section')==='learn'?'learn':'work';
  const initialCategory=categories[initialSection].some(c=>c.id===initialParams.get('category'))?initialParams.get('category'):'all';
  const state={section:initialSection,category:initialCategory,query:'',sort:'default',review:false};
  const byId=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?escape(url.href):'#';}catch{return '#';}};
  const icons={
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12c5 4 13 4 18 0M12 13v4"/>',
    laptop:'<rect x="4" y="4" width="16" height="12" rx="2"/><path d="M2 20h20M8 9l-2 2 2 2m8-4 2 2-2 2"/>',
    pen:'<path d="m14 4 6 6M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',
    research:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10l2 2 4-4"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    book:'<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>'
  };
  const icon=name=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none">${icons[name]||icons.grid}</svg>`;
  function renderCategories(){
    const sectionResources=resources.filter(r=>r.section===state.section);
    byId('categories').innerHTML=`<div class="categories-list">${categories[state.section].map(cat=>`<button class="category-button ${cat.id===state.category?'active':''}" data-category="${cat.id}" aria-pressed="${cat.id===state.category}">${icon(cat.icon)}<span>${escape(cat.label)}</span><span class="category-count">${sectionResources.filter(r=>cat.id==='all'||(cat.filter==='cost'?r.cost===cat.id:r.category===cat.id)).length}</span></button>`).join('')}</div>`;
  }
  function card(r){
    const category=categories[r.section].find(c=>c.id===r.category)?.label||'';
    const domain=new URL(r.url).hostname.replace(/^www\./,'');
    const badge=r.badge||(r.section==='work'?category:'NVIDIA');
    const logo=r.logo||r.name.slice(0,2);
    const action=r.section==='learn'?'اقرأ الدروس بالعربية':r.action||'فتح الموقع';
    const primary=r.section==='learn'?'<a class="primary-link" href="'+escape(r.localUrl)+'">'+escape(action)+'</a>':'<a class="primary-link" href="'+safeUrl(r.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+escape(action)+': '+escape(r.name)+'، يفتح في علامة تبويب جديدة">'+escape(action)+'</a>';
    const official=r.section==='learn'?'<a class="source-link" href="'+safeUrl(r.url)+'" target="_blank" rel="noopener noreferrer">'+(r.cost==='resource'?'المورد الأصلي':'الدورة الأصلية')+'</a>':'';
    const source=r.source&&r.source!==r.url?`<a class="source-link" href="${safeUrl(r.source)}" target="_blank" rel="noopener noreferrer" aria-label="مصدر معلومات ${escape(r.name)}، يفتح في علامة تبويب جديدة">${r.section==='learn'?'تفاصيل المصدر':'المصدر الأصلي'}</a>`:'';
    return `<article class="resource-card" aria-labelledby="title-${escape(r.id)}" data-resource-id="${escape(r.id)}">
      <div class="card-top"><span class="site-logo" aria-hidden="true" style="--logo-color:${escape(r.color||(r.section==='learn'?'#386412':'#275473'))};--logo-bg:${escape(r.bg||(r.section==='learn'?'#ecf6e3':'#edf3f7'))}">${escape(logo)}</span><div class="site-title"><h3 id="title-${escape(r.id)}">${escape(r.name)}</h3><span class="domain" dir="ltr">${escape(domain)}</span></div><span class="card-tag ${r.cost==='paid'?'review':r.cost==='resource'?'resource':r.review?'review':''}">${escape(badge)}</span></div>
      ${r.title?`<p class="resource-title-ar"><strong>${escape(r.title)}</strong></p>`:''}
      <p class="card-description">${escape(r.description)}</p>
      <div class="card-meta">${r.tags.map(tag=>`<span class="meta-chip">${escape(tag)}</span>`).join('')}</div>
      <p class="card-note ${r.review?'warning':''}">${escape(r.note)}</p>
      <div class="card-actions">${primary}${official}${source}</div>
      ${r.related?`<div class="related-links">${r.related.map(link=>`<a href="${safeUrl(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="وظائف Remote OK في ${escape(link.label)}، يفتح في علامة تبويب جديدة">${escape(link.label)}</a>`).join('')}</div>`:''}
    </article>`;
  }
  function render(){
    const results=select(state);
    const cat=categories[state.section].find(c=>c.id===state.category);
    const total=resources.filter(r=>r.section===state.section).length;
    byId('resources').innerHTML=results.map(card).join('');
    byId('resources').hidden=results.length===0;
    byId('empty-state').hidden=results.length!==0;
    byId('section-title').textContent=state.category==='all'?(state.section==='work'?'كل منصات العمل':'موارد NVIDIA للتعلّم'):cat.label;
    byId('result-count').textContent=`${results.length} من ${total} ${state.section==='work'?'منصة وروابطها':'مورداً تعليمياً'}`;
    byId('context-note').textContent=state.section==='learn'?(state.category==='free'?'افتح الدروس العربية هنا لكل موضوع من الدورات السبع المجانية. شروح مدار وترجماته المختارة لا تشمل فيديوهات الدورة الأصلية أو شهادتها.':state.category==='paid'?'الدورات الأصلية الثلاث مدفوعة. المقدمات العربية داخل مدار مجانية للقراءة؛ الأسعار والمدد على البطاقة تخص الدورة الأصلية.':state.category==='resource'?'افتح مقدمة NeMo بالعربية داخل مدار. المورد الرسمي المرتبط مقال، وليس دورة مؤكدة أو شهادة.':'يمكنك قراءة دروس عربية لكل موضوع داخل مدار. تصنيف السعر والمدة على البطاقة يخص مورد NVIDIA الأصلي: 7 دورات مجانية، و3 مدفوعة، ومقال.'):state.category==='testing'?'هذه فرص لمقابل إضافي متغير، ولا تعادل وظيفة أو راتباً شهرياً.':state.category==='local'?'هذه مهام ميدانية في مدن مدعومة، وليست كلها عملاً من المنزل.':'';
    const viewUrl=new URL(location.href);viewUrl.searchParams.set('section',state.section);viewUrl.searchParams.set('category',state.category);history.replaceState({},'',viewUrl);
    byId('resource-panel').setAttribute('aria-labelledby',`tab-${state.section}`);
    document.querySelectorAll('[data-section]').forEach(tab=>{const active=tab.dataset.section===state.section;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    document.querySelectorAll('[data-category]').forEach(button=>{const active=button.dataset.category===state.category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  }
  function changeSection(section){
    if(section===state.section)return;
    state.section=section;state.category='all';state.query='';state.review=false;
    byId('search').value='';byId('review-filter').checked=false;
    byId('search').placeholder=section==='learn'?'ابحث عن دورة أو موضوع...':'ابحث عن منصة أو مهارة...';
    renderCategories();render();
  }
  byId('categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;state.category=button.dataset.category;render();});
  document.querySelectorAll('[data-section]').forEach(tab=>{
    tab.addEventListener('click',()=>changeSection(tab.dataset.section));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const next=event.key==='Home'?'work':event.key==='End'?'learn':state.section==='work'?'learn':'work';
      changeSection(next);byId(`tab-${next}`).focus();
    });
  });
  byId('search').addEventListener('input',event=>{state.query=event.target.value;render();});
  byId('sort').addEventListener('change',event=>{state.sort=event.target.value;render();});
  byId('review-filter').addEventListener('change',event=>{state.review=event.target.checked;render();});
  byId('reset-search').addEventListener('click',()=>{state.category='all';state.query='';state.review=false;state.sort='default';byId('search').value='';byId('review-filter').checked=false;byId('sort').value='default';render();byId('search').focus();});
  const openAbout=()=>byId('about-dialog').showModal();
  byId('method-button').addEventListener('click',openAbout);
  document.querySelectorAll('[data-open-about]').forEach(button=>button.addEventListener('click',openAbout));
  byId('close-dialog').addEventListener('click',()=>byId('about-dialog').close());
  byId('about-dialog').addEventListener('click',event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.currentTarget.close();});
  const profileDialog=byId('profile-dialog');
  document.querySelectorAll('[data-open-profile]').forEach(button=>button.addEventListener('click',()=>profileDialog.showModal()));
  byId('close-profile').addEventListener('click',()=>profileDialog.close());
  profileDialog.addEventListener('click',event=>{if(event.target!==profileDialog)return;const rect=profileDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)profileDialog.close();});
  const workCount=resources.filter(r=>r.section==='work').length;
  byId('work-total').textContent=workCount;byId('work-count').textContent=workCount;
  byId('learn-total').textContent=resources.filter(r=>r.section==='learn').length;
  byId('search').placeholder=state.section==='learn'?'ابحث عن دورة أو موضوع...':'ابحث عن منصة أو مهارة...';
  const siteMenu=document.querySelector('.site-menu');
  siteMenu?.addEventListener('click',event=>{if(event.target.closest('a,.menu-action'))siteMenu.removeAttribute('open');});
  document.addEventListener('click',event=>{if(siteMenu?.open&&!siteMenu.contains(event.target))siteMenu.removeAttribute('open');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&siteMenu?.open){siteMenu.removeAttribute('open');siteMenu.querySelector('summary')?.focus();}});
  if(new URLSearchParams(location.search).get('about')==='1')openAbout();
  renderCategories();render();
})();

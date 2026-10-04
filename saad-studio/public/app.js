'use strict';
const settings=window.STUDIO_STORE||{services:[],categories:[]},services=settings.services||[],categories=settings.categories||[];
const $=s=>document.querySelector(s),catalog=$('#catalog'),dialog=$('#orderDialog');
const I={code:'ar',t:s=>s,href:s=>s},t=I.t;
let chosen=null;
let sampleCategory='';
const samples=settings.samples||[];
const priceText=s=>Number.isFinite(s.price)?`${s.price.toLocaleString(I.code)} ${settings.currency||'د.ك'}`:t('السعر حسب تفاصيل الطلب');
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=t(text);return n};
function safeImage(value){try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function link(text,href,cls=''){const a=el('a',cls,text);a.href=I.href(href);return a}
function artFor(s){
 const requested=new URLSearchParams(location.search).get('sample');
 const preview=(s.templates||[]).find(t=>t.id===requested&&safeImage(t.image))||(s.templates||[]).find(t=>safeImage(t.image));
 if(!preview)return null;
 const art=el('div','card-art'),img=el('img','template-img');
 img.src=safeImage(preview.image);img.alt=preview.title;img.loading='lazy';art.append(img);return art;
}
const page=document.body.dataset.page||'home',categoryId=document.body.dataset.category||'';
function cardFor(s){
 const card=el('article','card'),art=artFor(s),href=`service.html?id=${encodeURIComponent(s.id)}`;
 if(art){const visual=link('',href,'card-preview-link');visual.setAttribute('aria-label','عرض تفاصيل '+s.title);visual.append(art);card.append(visual)}
 else{const meta=el('div','service-meta');meta.append(el('span','service-category',categories.find(c=>c.id===s.category)?.title||''),el('span','service-number',String(services.indexOf(s)+1).padStart(2,'0')));card.append(meta)}
 const title=el('h3');title.append(link(s.title,href));const bottom=el('div','card-bottom');bottom.append(el('span','price',priceText(s)),link('عرض التفاصيل',href,'card-details'));card.append(title,el('p','',s.description),bottom);return card;
}
function sampleCard(sample){
 const service=services.find(s=>s.id===sample.service),figure=el('article','sample-card');
 const a=link('',`service.html?id=${encodeURIComponent(sample.service)}&sample=${encodeURIComponent(sample.id)}`,'sample-image-link');
 const img=el('img');img.src=safeImage(sample.image);img.alt=sample.title;img.loading='lazy';img.width=400;img.height=500;a.append(img);
 const caption=el('div','sample-caption'),h=el('h3','',sample.title),button=el('button','sample-order','اختر هذا النموذج');button.dataset.order=sample.service;button.dataset.sample=sample.id;
 caption.append(el('span','sample-code',sample.id.toUpperCase()),h,button);figure.append(a,caption);return figure;
}
function renderSamples(list,target=catalog){target.replaceChildren(...list.map(sampleCard));if(target===catalog){target.classList.add('sample-grid');if($('#resultCount'))$('#resultCount').textContent=`${list.length} نموذج`;if(!list.length)target.append(el('p','empty-catalog','لم نجد نموذجًا بهذا الاسم. جرّب كلمة أخرى.'));}}
if($('#featuredSamples'))renderSamples(['instagram-01','instagram-02','instagram-05','story-03','logo-02','print-03'].map(id=>samples.find(t=>t.id===id)).filter(Boolean),$('#featuredSamples'));
function render(list){if(!catalog)return;catalog.replaceChildren();for(const s of list)catalog.append(cardFor(s));if(!list.length){const empty=el('div','empty-catalog');empty.append(el('h3','','لم نجد خدمة بهذا الاسم'),el('p','','جرّب كلمة أخرى أو اكتب فكرتك في طلب خاص.'));const b=el('button','button','طلب تصميم خاص');b.dataset.order='custom';empty.append(b);catalog.append(empty)}if($('#resultCount'))$('#resultCount').textContent=t(`${list.length} خدمة`)}
function baseServices(){return page==='category'?services.filter(s=>s.category===categoryId):page==='home'?[services[0],services[2],services[13],services[15],services[20],services[25],services[30],services[35],services[40],services[45]]:services}
function norm(s){return s.replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase()}
if($('#serviceSearch'))$('#serviceSearch').addEventListener('input',e=>{const q=norm(e.target.value.trim());if(page==='samples'){filterSamples();return;}const list=page==='home'&&q?services:baseServices();render(list.filter(s=>norm([s.title,s.description,s.label,categories.find(c=>c.id===s.category)?.title].join(' ')).includes(q)))});
const categoryNav=$('#categoryNav');if(categoryNav){categoryNav.append(link('الكل','all.html',page==='all'?'selected':''));for(const c of categories){const a=link(c.title,c.id+'.html',c.id===categoryId?'selected':'');if(c.id===categoryId)a.setAttribute('aria-current','page');categoryNav.append(a)}}
if($('#departmentGrid'))for(const [i,c] of categories.entries()){const a=link('',c.id+'.html','department-tile department-'+c.id);a.append(el('span','department-number',String(i+1).padStart(2,'0')),el('h3','',c.title),el('p','',c.description),el('span','department-count',services.filter(s=>s.category===c.id).length+' خدمات'));$('#departmentGrid').append(a)}
function listBlock(title,items){const section=el('section','detail-block');section.append(el('h2','',title));const list=el('ul');for(const text of items)list.append(el('li','',text));section.append(list);return section}
if(page==='service'){
 const id=new URLSearchParams(location.search).get('id'),s=services.find(s=>s.id===id),target=$('#serviceDetail');
 if(!s){target.append(el('h1','','الخدمة غير موجودة'),link('تصفّح كل الخدمات','all.html','button'));$('.related-section').hidden=true}
 else{
 const c=categories.find(c=>c.id===s.category);document.title=s.title+' | SAAD STUDIO';document.querySelector('meta[name="description"]').content=s.description;$('#breadcrumbs').append(link('الرئيسية','index.html'),el('span','','/'),link(c.title,c.id+'.html'),el('span','','/'),el('span','',s.title));
 const layout=el('div','product-layout'),visual=el('div','product-visual'),copy=el('div','product-copy');const artwork=artFor(s);if(artwork)visual.append(artwork);
 copy.append(el('p','eyebrow',c.title),el('h1','page-title',s.title),el('p','product-description',s.description));const specs=el('dl','product-specs');for(const [name,value] of [['المقاس / الاستخدام',s.size],['نطاق العمل',s.scope],['السعر',priceText(s)]]){specs.append(el('dt','',name),el('dd','',value))}copy.append(specs);const request=el('button','button','اطلب هذا التصميم');request.dataset.order=s.id;copy.append(request,el('p','form-note','يُؤكّد السعر وموعد التسليم وعدد التعديلات قبل بدء التنفيذ.'));if(artwork)layout.append(visual);else layout.classList.add('without-preview');layout.append(copy);target.append(layout);
 if((s.templates||[]).length){const approved=el('section','approved-previews');approved.append(el('h2','','اختر نموذجك'));const grid=el('div','sample-grid');for(const sample of s.templates)grid.append(sampleCard({...sample,service:s.id}));approved.append(grid);target.append(approved)}
 const blocks=el('div','detail-columns');blocks.append(listBlock('ماذا ترسل لنا؟',s.needs),listBlock('كيف يتم التنفيذ؟',['تجهّز التفاصيل والنصوص والمراجع.','نحدّد النطاق والسعر والموعد وصيغة الملفات.','ينفّذ المصمم العمل ويراجع ملاحظاتك بحسب الاتفاق.','تستلم النسخة النهائية بالصيغة المتفق عليها.']));target.append(blocks);render(services.filter(x=>x.category===s.category&&x.id!==s.id));
 }
}else if(page==='samples')renderSamples(samples);else render(baseServices());
function filterSamples(){
 const q=norm($('#serviceSearch')?.value.trim()||'');
 renderSamples(samples.filter(x=>{const service=services.find(s=>s.id===x.service);return (!sampleCategory||service?.category===sampleCategory)&&norm([x.title,service?.title,categories.find(c=>c.id===service?.category)?.title].join(' ')).includes(q)}));
}
if($('#sampleFilters')){
 const available=categories.filter(c=>samples.some(x=>services.find(s=>s.id===x.service)?.category===c.id));
 for(const c of [{id:'',title:'كل النماذج'},...available]){const b=el('button','filter-chip',c.title);b.type='button';b.setAttribute('aria-pressed',String(!c.id));b.addEventListener('click',()=>{sampleCategory=c.id;for(const item of $('#sampleFilters').children)item.setAttribute('aria-pressed',String(item===b));filterSamples()});$('#sampleFilters').append(b)}
}
const businessNumber=()=>{const n=settings.whatsapp||'';return /^\d{8,15}$/.test(n)&&(!n.startsWith('965')||n.length===11)?n:''};
const businessEmail=()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email||'')?settings.email:'';
function openOrder(id,sampleId){chosen=services.find(s=>s.id===id)||{id:'custom',title:t('طلب تصميم خاص'),price:null,templates:[],size:''};$('#orderTitle').textContent=chosen.title;$('#orderPrice').textContent=priceText(chosen);$('#orderForm').reset();if(chosen.size)$('#orderForm').elements.size.value=chosen.size;$('#orderResult').hidden=true;
 const presets=chosen.sizeOptions||[];$('#sizePresets').hidden=!presets.length;$('#sizeOptions').replaceChildren();
 for(const label of presets){const b=el('button','size-chip',label);b.type='button';b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{$('#orderForm').elements.size.value=label;for(const item of $('#sizeOptions').children)item.setAttribute('aria-pressed',String(item===b))});$('#sizeOptions').append(b)}

 const options=chosen.templates||[];$('#templateLabel').hidden=!options.length;$('#templateSelect').replaceChildren(new Option('تصميم حسب التفاصيل',''));
 for(const t of options)$('#templateSelect').add(new Option(t.title,t.id));
 const selected=sampleId||new URLSearchParams(location.search).get('sample');if(options.some(t=>t.id===selected))$('#templateSelect').value=selected;
 $('#deliveryNote').textContent=businessNumber()?'تفتح تفاصيل طلبك في واتساب. راجع الرسالة وأرسلها لإتمام التواصل. لا يتم الدفع عبر هذه الصفحة.':businessEmail()?'جهّز طلبك ثم افتح رسالة البريد وأرسلها إلى الاستوديو. لا يُرسل الطلب تلقائيًا ولا يتم الدفع عبر الموقع.':'استقبال الطلبات قيد التجهيز. يمكنك تجهيز ملخص طلبك ونسخه، ولن يُرسل أو يُحفظ لدى الاستوديو الآن.';
 $('#submitOrder').textContent=businessNumber()?'متابعة الطلب عبر واتساب ↗':'تجهيز ملخص الطلب';dialog.showModal();
}
document.addEventListener('click',e=>{const order=e.target.closest('[data-order]');if(order)openOrder(order.dataset.order,order.dataset.sample);});
$('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
$('#orderForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),template=(chosen.templates||[]).find(t=>t.id===f.get('template'));const summary=['SAAD STUDIO — '+t('طلب تصميم'),`${t('الخدمة')}: ${chosen.title}`,`${t('السعر')}: ${priceText(chosen)}`,template?`${t('النموذج')}: ${template.title} (${template.id})`:'',`${t('الاسم')}: ${f.get('name').trim()}`,`${t('التواصل')}: ${f.get('contact').trim()}`,f.get('size')?`${t('المقاس / الاستخدام')}: ${f.get('size')}`:'',f.get('date')?`${t('الموعد المطلوب')}: ${f.get('date')}`:'',`${t('التفاصيل')}:\n${f.get('details').trim()}`].filter(Boolean).join('\n');$('#summaryText').value=summary;$('#orderResult').hidden=false;$('#copyOrder').textContent='نسخ ملخص الطلب';const emailLink=$('#emailOrder');emailLink.hidden=!businessEmail();if(businessEmail())emailLink.href='mailto:'+businessEmail()+'?subject='+encodeURIComponent('طلب تصميم — '+chosen.title)+'&body='+encodeURIComponent(summary);if(businessNumber()){window.open('https://wa.me/'+businessNumber()+'?text='+encodeURIComponent(summary),'_blank','noopener,noreferrer');$('#resultStatus').textContent='أكمل الإرسال في واتساب. فتح الرسالة وحده لا يرسل الطلب.'}else $('#resultStatus').textContent=businessEmail()?'ملخصك جاهز. اضغط «إرسال الطلب بالبريد» ثم أرسل الرسالة من تطبيق بريدك. لم يُرسل شيء تلقائيًا.':'ملخصك جاهز للنسخ. لم يتم إرسال طلبك.';});
$('#copyOrder').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#summaryText').value);$('#copyOrder').textContent='تم نسخ الملخص'}catch{$('#summaryText').focus();$('#summaryText').select();$('#copyOrder').textContent='حدّد النص وانسخه من الملخص'}});
$('#orderForm').elements.size.addEventListener('input',()=>{for(const item of $('#sizeOptions').children)item.setAttribute('aria-pressed',String(item.textContent===$('#orderForm').elements.size.value))});
$('#downloadOrder').addEventListener('click',()=>{
 const summary=$('#summaryText').value;if(!summary)return;
 const url=URL.createObjectURL(new Blob(['\ufeff'+summary],{type:'text/plain;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='SAAD-STUDIO-order.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('#year').textContent=new Date().getFullYear();

// Watermarks cover the actual contained image, including on responsive previews.
function positionWatermark(img){
 const layer=img.parentElement?.querySelector(':scope > .preview-watermark');
 if(!layer||!img.naturalWidth||!img.clientWidth||!img.clientHeight)return;
 const scale=Math.min(img.clientWidth/img.naturalWidth,img.clientHeight/img.naturalHeight);
 const width=img.naturalWidth*scale,height=img.naturalHeight*scale;
 Object.assign(layer.style,{width:width+'px',height:height+'px',left:(img.offsetLeft+(img.clientWidth-width)/2)+'px',top:(img.offsetTop+(img.clientHeight-height)/2)+'px'});
 layer.style.setProperty('--watermark-font',Math.max(10,Math.min(40,width/23))+'px');
}
function watermarkPreviews(){
 for(const img of document.querySelectorAll('.sample-image-link img,.card-art img,.hero-samples img')){
  const parent=img.parentElement;
  if(!parent.querySelector(':scope > .preview-watermark')){
   parent.classList.add('watermarked-media');
   const layer=el('div','preview-watermark');layer.setAttribute('aria-hidden','true');
   for(let i=0;i<9;i++)layer.append(el('span','','SAAD STUDIO'));
   parent.append(layer);img.addEventListener('load',()=>positionWatermark(img));
  }
  positionWatermark(img);
 }
}
watermarkPreviews();
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('img,.sample-card,.card')||n.querySelector?.('img')))))watermarkPreviews()}).observe(document.body,{childList:true,subtree:true});
new ResizeObserver(watermarkPreviews).observe(document.body);
window.addEventListener('resize',watermarkPreviews);

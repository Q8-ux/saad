'use strict';
const settings=window.STUDIO_STORE||{services:[],categories:[]},services=settings.services||[],categories=settings.categories||[];
const $=s=>document.querySelector(s),catalog=$('#catalog'),dialog=$('#orderDialog');
const I=window.STUDIO_I18N||{code:'ar',t:s=>s,href:s=>s},t=I.t;
let chosen=null;
const priceText=s=>Number.isFinite(s.price)?`${s.price.toLocaleString(I.code)} ${settings.currency||'د.ك'}`:t('السعر حسب تفاصيل الطلب');
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=t(text);return n};
function safeImage(value){try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function link(text,href,cls=''){const a=el('a',cls,text);a.href=I.href(href);return a}
function artFor(s){const art=el('div','card-art '+s.tone);
 const preview=(s.templates||[]).find(t=>safeImage(t.image));
 if(preview){const img=el('img','template-img');img.src=safeImage(preview.image);img.alt=preview.title;img.loading='lazy';art.append(img)}
 else{
 art.setAttribute('aria-hidden','true');art.lang='ar';art.dir='rtl';art.classList.add('showcase','showcase-'+s.style,'variant-'+s.variant);
 const sheet=el('div','design-sheet'),back=el('div','design-back');
 sheet.append(el('span','design-kicker',s.label),el('strong','design-title',s.mark),el('span','design-rule'),el('span','design-signature','SAAD STUDIO'));
 for(let i=1;i<=3;i++)sheet.append(el('i','design-shape shape-'+i));
 const second=el('div','design-mini');
 const miniText={social:'MAKE IT\nBOLD.',invitation:'دعوة خاصة',business:'SAAD\nSTUDIO',menu:'THE\nMENU',greeting:'FOR YOU',presentation:'01 / IDEAS'};
 second.append(el('span','',miniText[s.style]||'DESIGN'));
 if(s.style==='menu'){const lines=el('div','menu-lines');for(const text of ['قهوة مختصة','لحظات حلوة','صُنعت بحب'])lines.append(el('span','',text));sheet.append(lines)}
 if(s.style==='presentation'){const bars=el('div','chart-bars');for(let i=0;i<4;i++)bars.append(el('i'));sheet.append(bars)}
 art.append(back,sheet,second,el('span','preview-tag','تصوّر للخدمة'));
} 

return art;
}
const page=document.body.dataset.page||'home',categoryId=document.body.dataset.category||'';
function cardFor(s){const card=el('article','card');const visual=link('',`service.html?id=${encodeURIComponent(s.id)}`,'card-preview-link');visual.setAttribute('aria-label','عرض تفاصيل '+s.title);visual.append(artFor(s));const title=el('h3');title.append(link(s.title,`service.html?id=${encodeURIComponent(s.id)}`));const bottom=el('div','card-bottom');bottom.append(el('span','price',priceText(s)),link('عرض التفاصيل',`service.html?id=${encodeURIComponent(s.id)}`,'card-details'));card.append(visual,title,el('p','',s.description),bottom);return card}
function render(list){if(!catalog)return;catalog.replaceChildren();for(const s of list)catalog.append(cardFor(s));if(!list.length){const empty=el('div','empty-catalog');empty.append(el('h3','','لم نجد خدمة بهذا الاسم'),el('p','','جرّب كلمة أخرى أو اكتب فكرتك في طلب خاص.'));const b=el('button','button','طلب تصميم خاص');b.dataset.order='custom';empty.append(b);catalog.append(empty)}if($('#resultCount'))$('#resultCount').textContent=t(`${list.length} خدمة`)}
function baseServices(){return page==='category'?services.filter(s=>s.category===categoryId):page==='home'?[services[0],services[2],services[13],services[15],services[20],services[25],services[30],services[35],services[40],services[45]]:services}
function norm(s){return s.replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase()}
if($('#serviceSearch'))$('#serviceSearch').addEventListener('input',e=>{const q=norm(e.target.value.trim());const list=page==='home'&&q?services:baseServices();render(list.filter(s=>norm([s.title,s.description,s.label,categories.find(c=>c.id===s.category)?.title].join(' ')).includes(q)))});
const categoryNav=$('#categoryNav');if(categoryNav){categoryNav.append(link('الكل','all.html',page==='all'?'selected':''));for(const c of categories){const a=link(c.title,c.id+'.html',c.id===categoryId?'selected':'');if(c.id===categoryId)a.setAttribute('aria-current','page');categoryNav.append(a)}}
if($('#departmentGrid'))for(const [i,c] of categories.entries()){const a=link('',c.id+'.html','department-tile department-'+c.id);a.append(el('span','department-number',String(i+1).padStart(2,'0')),el('h3','',c.title),el('p','',c.description),el('span','department-count','5 خدمات'));$('#departmentGrid').append(a)}
function listBlock(title,items){const section=el('section','detail-block');section.append(el('h2','',title));const list=el('ul');for(const text of items)list.append(el('li','',text));section.append(list);return section}
if(page==='service'){
 const id=new URLSearchParams(location.search).get('id'),s=services.find(s=>s.id===id),target=$('#serviceDetail');
 if(!s){target.append(el('h1','','الخدمة غير موجودة'),link('تصفّح كل الخدمات','all.html','button'));$('.related-section').hidden=true}
 else{
 const c=categories.find(c=>c.id===s.category);document.title=s.title+' | SAAD STUDIO';document.querySelector('meta[name="description"]').content=s.description;$('#breadcrumbs').append(link('الرئيسية','index.html'),el('span','','/'),link(c.title,c.id+'.html'),el('span','','/'),el('span','',s.title));
 const layout=el('div','product-layout'),visual=el('div','product-visual'),copy=el('div','product-copy');visual.append(artFor(s),el('p','preview-disclosure','تصوّر بصري للخدمة؛ يُنفّذ العمل النهائي بحسب تفاصيل طلبك.'));
 copy.append(el('p','eyebrow',c.title),el('h1','page-title',s.title),el('p','product-description',s.description));const specs=el('dl','product-specs');for(const [name,value] of [['المقاس / الاستخدام',s.size],['نطاق العمل',s.scope],['السعر',priceText(s)]]){specs.append(el('dt','',name),el('dd','',value))}copy.append(specs);const request=el('button','button','اطلب هذا التصميم');request.dataset.order=s.id;copy.append(request,el('p','form-note','يُؤكّد السعر وموعد التسليم وعدد التعديلات قبل بدء التنفيذ.'));layout.append(visual,copy);target.append(layout);
 if((s.templates||[]).length){const approved=el('section','approved-previews');approved.append(el('h2','','النماذج المتاحة'));for(const t of s.templates){if(!safeImage(t.image))continue;const figure=el('figure');const img=el('img');img.src=safeImage(t.image);img.alt=t.title;figure.append(img,el('figcaption','',t.title));approved.append(figure)}target.append(approved)}
 const blocks=el('div','detail-columns');blocks.append(listBlock('ماذا ترسل لنا؟',s.needs),listBlock('كيف يتم التنفيذ؟',['تجهّز التفاصيل والنصوص والمراجع.','نحدّد النطاق والسعر والموعد وصيغة الملفات.','ينفّذ المصمم العمل ويراجع ملاحظاتك بحسب الاتفاق.','تستلم النسخة النهائية بالصيغة المتفق عليها.']));target.append(blocks);render(services.filter(x=>x.category===s.category&&x.id!==s.id));
 }
}else render(baseServices());
const businessNumber=()=>/^\d{8,15}$/.test(settings.whatsapp||'')?settings.whatsapp:'';
function openOrder(id){chosen=services.find(s=>s.id===id)||{id:'custom',title:t('طلب تصميم خاص'),price:null,templates:[],size:''};$('#orderTitle').textContent=chosen.title;$('#orderPrice').textContent=priceText(chosen);$('#orderForm').reset();if(chosen.size)$('#orderForm').elements.size.value=chosen.size;$('#orderResult').hidden=true;
 const options=chosen.templates||[];$('#templateLabel').hidden=!options.length;$('#templateSelect').replaceChildren(new Option('تصميم حسب التفاصيل',''));
 for(const t of options)$('#templateSelect').add(new Option(t.title,t.id));
 $('#deliveryNote').textContent=businessNumber()?'تفتح تفاصيل طلبك في واتساب. راجع الرسالة وأرسلها لإتمام التواصل. لا يتم الدفع عبر هذه الصفحة.':'استقبال الطلبات قيد التجهيز. يمكنك تجهيز ملخص طلبك ونسخه، ولن يُرسل أو يُحفظ لدى الاستوديو الآن.';
 $('#submitOrder').textContent=businessNumber()?'متابعة الطلب عبر واتساب ↗':'تجهيز ملخص الطلب';dialog.showModal();
}
document.addEventListener('click',e=>{const order=e.target.closest('[data-order]');if(order)openOrder(order.dataset.order);});
$('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
$('#orderForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),template=(chosen.templates||[]).find(t=>t.id===f.get('template'));const summary=['SAAD STUDIO — '+t('طلب تصميم'),`${t('الخدمة')}: ${chosen.title}`,`${t('السعر')}: ${priceText(chosen)}`,template?`${t('النموذج')}: ${template.title} (${template.id})`:'',`${t('الاسم')}: ${f.get('name').trim()}`,`${t('التواصل')}: ${f.get('contact').trim()}`,f.get('size')?`${t('المقاس / الاستخدام')}: ${f.get('size')}`:'',f.get('date')?`${t('الموعد المطلوب')}: ${f.get('date')}`:'',`${t('التفاصيل')}:\n${f.get('details').trim()}`].filter(Boolean).join('\n');$('#summaryText').value=summary;$('#orderResult').hidden=false;$('#copyOrder').textContent='نسخ ملخص الطلب';if(businessNumber()){window.open('https://wa.me/'+businessNumber()+'?text='+encodeURIComponent(summary),'_blank','noopener,noreferrer');$('#resultStatus').textContent='أكمل الإرسال في واتساب. فتح الرسالة وحده لا يرسل الطلب.'}else $('#resultStatus').textContent='ملخصك جاهز للنسخ. لم يتم إرسال طلبك.';});
$('#copyOrder').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#summaryText').value);$('#copyOrder').textContent='تم نسخ الملخص'}catch{$('#summaryText').focus();$('#summaryText').select();$('#copyOrder').textContent='حدّد النص وانسخه من الملخص'}});
$('#year').textContent=new Date().getFullYear();

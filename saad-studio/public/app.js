'use strict';
const settings=window.STUDIO_STORE||{services:[]},services=settings.services||[];
const $=s=>document.querySelector(s),catalog=$('#catalog'),dialog=$('#orderDialog');
let chosen=null;
const priceText=s=>Number.isFinite(s.price)?`${s.price.toLocaleString('ar-KW')} ${settings.currency||'د.ك'}`:'السعر بعد تحديد التفاصيل';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function safeImage(value){try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function render(filter='all'){
 catalog.replaceChildren();
 for(const s of services.filter(s=>filter==='all'||s.category===filter)){
 const card=el('article','card'),art=el('div','card-art '+s.tone);
 const preview=(s.templates||[]).find(t=>safeImage(t.image));
 if(preview){const img=el('img','template-img');img.src=safeImage(preview.image);img.alt=preview.title;img.loading='lazy';art.append(img)}
 else{
 art.setAttribute('aria-hidden','true');art.classList.add('showcase','showcase-'+s.id);
 const sheet=el('div','design-sheet'),back=el('div','design-back');
 sheet.append(el('span','design-kicker',s.label),el('strong','design-title',s.mark),el('span','design-rule'),el('span','design-signature','SAAD STUDIO'));
 for(let i=1;i<=3;i++)sheet.append(el('i','design-shape shape-'+i));
 const second=el('div','design-mini');
 const miniText={social:'MAKE IT\nBOLD.',invitation:'دعوة خاصة',business:'SAAD\nSTUDIO',menu:'THE\nMENU',greeting:'FOR YOU',presentation:'01 / IDEAS'};
 second.append(el('span','',miniText[s.id]||'DESIGN'));
 if(s.id==='menu'){const lines=el('div','menu-lines');for(const text of ['قهوة مختصة','لحظات حلوة','صُنعت بحب'])lines.append(el('span','',text));sheet.append(lines)}
 if(s.id==='presentation'){const bars=el('div','chart-bars');for(let i=0;i<4;i++)bars.append(el('i'));sheet.append(bars)}
 art.append(back,sheet,second,el('span','preview-tag','تصوّر للخدمة'));
} 
 const bottom=el('div','card-bottom'),button=el('button','','اطلب الخدمة ↗');button.type='button';button.dataset.order=s.id;
 bottom.append(el('span','price',priceText(s)),button);card.append(art,el('h3','',s.title),el('p','',s.description),bottom);catalog.append(card);
 }
}
const businessNumber=()=>/^\d{8,15}$/.test(settings.whatsapp||'')?settings.whatsapp:'';
function openOrder(id){chosen=services.find(s=>s.id===id)||{id:'custom',title:'طلب تصميم خاص',price:null,templates:[]};$('#orderTitle').textContent=chosen.title;$('#orderPrice').textContent=priceText(chosen);$('#orderForm').reset();$('#orderResult').hidden=true;
 const options=chosen.templates||[];$('#templateLabel').hidden=!options.length;$('#templateSelect').replaceChildren(new Option('تصميم حسب التفاصيل',''));
 for(const t of options)$('#templateSelect').add(new Option(t.title,t.id));
 $('#deliveryNote').textContent=businessNumber()?'تفتح تفاصيل طلبك في واتساب. راجع الرسالة وأرسلها لإتمام التواصل. لا يتم الدفع عبر هذه الصفحة.':'استقبال الطلبات قيد التجهيز. يمكنك تجهيز ملخص طلبك ونسخه، ولن يُرسل أو يُحفظ لدى الاستوديو الآن.';
 $('#submitOrder').textContent=businessNumber()?'متابعة الطلب عبر واتساب ↗':'تجهيز ملخص الطلب';dialog.showModal();
}
document.addEventListener('click',e=>{const order=e.target.closest('[data-order]');if(order)openOrder(order.dataset.order);const filter=e.target.closest('[data-filter]');if(filter){document.querySelectorAll('[data-filter]').forEach(b=>{const active=b===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});render(filter.dataset.filter)}});
$('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
$('#orderForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),template=(chosen.templates||[]).find(t=>t.id===f.get('template'));const summary=['SAAD STUDIO — طلب تصميم',`الخدمة: ${chosen.title}`,`السعر: ${priceText(chosen)}`,template?`النموذج: ${template.title} (${template.id})`:'',`الاسم: ${f.get('name').trim()}`,`التواصل: ${f.get('contact').trim()}`,f.get('size')?`المقاس / الاستخدام: ${f.get('size')}`:'',f.get('date')?`الموعد المطلوب: ${f.get('date')}`:'',`التفاصيل:\n${f.get('details').trim()}`].filter(Boolean).join('\n');$('#summaryText').value=summary;$('#orderResult').hidden=false;$('#copyOrder').textContent='نسخ ملخص الطلب';if(businessNumber()){window.open('https://wa.me/'+businessNumber()+'?text='+encodeURIComponent(summary),'_blank','noopener,noreferrer');$('#resultStatus').textContent='أكمل الإرسال في واتساب. فتح الرسالة وحده لا يرسل الطلب.'}else $('#resultStatus').textContent='ملخصك جاهز للنسخ. لم يتم إرسال طلبك.';});
$('#copyOrder').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#summaryText').value);$('#copyOrder').textContent='تم نسخ الملخص'}catch{$('#summaryText').focus();$('#summaryText').select();$('#copyOrder').textContent='حدّد النص وانسخه من الملخص'}});
$('#year').textContent=new Date().getFullYear();render();

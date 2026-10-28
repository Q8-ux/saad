import {escapeHTML as esc} from './core.mjs?v=1.4.0';
import {icon,imageURL,api} from './ui.mjs?v=1.4.0';
import {translate,localize} from './i18n.mjs?v=1.4.0';
import {generatedPropertyImage,GENERATED_IMAGE_LABEL,GENERATED_IMAGE_ALT,GENERATED_IMAGE_NOTICE} from './generated-property-images.mjs?v=1.4.0';
function mediaItems(p) {
  if(p.images?.length)return p.images.map((id,i)=>({id,src:['active','reference'].includes(p.status)?imageURL(id):'',alt:`${translate('صورة مرفقة من المعلن')} ${i+1}`}));
  const generated=generatedPropertyImage(p);
  return generated?[{src:generated.src,alt:GENERATED_IMAGE_ALT,generated:true}]:[];
}
export function galleryHTML(p) {
  const items=mediaItems(p);if(!items.length)return '';
  return `<section class="property-gallery" aria-label="معرض صور العقار"><figure class="gallery-figure"><button class="gallery-expand" type="button" aria-label="تكبير الصورة"><img class="gallery-main-image" ${items[0].src?`src="${esc(items[0].src)}"`:''} width="1280" height="853" decoding="async" alt="${esc(items[0].alt)}"><span class="gallery-expand-label">${icon('area')} <span>تكبير الصورة</span></span></button>${items[0].generated?`<span class="generated-image-label">${esc(GENERATED_IMAGE_LABEL)}</span>`:''}<p class="gallery-error" role="status" hidden>تعذر تحميل الصورة. يمكنك متابعة تفاصيل الإعلان.</p></figure><div class="gallery-controls"><button class="btn secondary small" type="button" data-gallery-prev ${items.length<2?'disabled':''}>الصورة السابقة</button><span class="gallery-count" aria-live="polite" dir="ltr">1 / ${items.length}</span><button class="btn secondary small" type="button" data-gallery-next ${items.length<2?'disabled':''}>الصورة التالية</button></div>${items.length>1?'<div class="gallery-thumbnails" role="group" aria-label="اختر صورة"></div>':''}${items[0].generated?`<p class="gallery-notice">${esc(GENERATED_IMAGE_NOTICE)}</p>`:''}</section>`;
}
export function mountGallery(root,p) {
  const gallery=root.querySelector('.property-gallery');if(!gallery)return;
  const items=mediaItems(p);let index=0,alive=true,lightbox;const urls=[];const abort=new AbortController();
  const main=gallery.querySelector('.gallery-main-image');
  const render=()=>{
    const item=items[index];main.hidden=false;gallery.querySelector('.gallery-error').hidden=true;main.alt=translate(item.alt);
    if(item.src)main.src=item.src;else main.removeAttribute('src');
    gallery.querySelector('.gallery-count').textContent=`${index+1} / ${items.length}`;
    gallery.querySelectorAll('[data-gallery-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.galleryIndex)===index)));
    if(lightbox?.open){const im=lightbox.querySelector('img');im.hidden=false;im.alt=translate(item.alt);if(item.src)im.src=item.src;else im.removeAttribute('src');lightbox.querySelector('.gallery-count').textContent=`${index+1} / ${items.length}`;lightbox.querySelector('.gallery-error').hidden=true;}
  };
  const change=delta=>{index=(index+delta+items.length)%items.length;render();};
  gallery.querySelector('[data-gallery-prev]').onclick=()=>change(-1);
  gallery.querySelector('[data-gallery-next]').onclick=()=>change(1);
  main.onerror=()=>{if(!alive)return;main.hidden=true;gallery.querySelector('.gallery-error').hidden=false;};
  if(items.length>1){const thumbnails=gallery.querySelector('.gallery-thumbnails');thumbnails.innerHTML=items.map((item,i)=>`<button type="button" data-gallery-index="${i}" aria-pressed="${i===0}" aria-label="${esc(translate('اختر صورة'))} ${i+1}">${item.src?`<img src="${esc(item.src)}" alt="" width="80" height="60" loading="lazy">`:`<span>${i+1}</span>`}</button>`).join('');thumbnails.querySelectorAll('button').forEach(b=>b.onclick=()=>{index=Number(b.dataset.galleryIndex);render();});}
  gallery.addEventListener('keydown',e=>{if(items.length<2)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();change(e.key==='ArrowRight'?1:-1);}});
  gallery.querySelector('.gallery-expand').onclick=()=>{
    if(!lightbox){lightbox=document.createElement('dialog');lightbox.className='gallery-lightbox';lightbox.setAttribute('aria-label',translate('معرض صور العقار'));lightbox.innerHTML=`<div class="lightbox-top"><span class="gallery-count" dir="ltr"></span><button type="button" class="icon-btn lightbox-close" aria-label="إغلاق معرض الصور">${icon('close')}</button></div><div class="lightbox-image"><img width="1280" height="853" alt=""><p class="gallery-error" role="status" hidden>تعذر تحميل الصورة. يمكنك متابعة تفاصيل الإعلان.</p></div><div class="gallery-controls"><button type="button" class="btn secondary" data-lightbox-prev ${items.length<2?'disabled':''}>الصورة السابقة</button><button type="button" class="btn secondary" data-lightbox-next ${items.length<2?'disabled':''}>الصورة التالية</button></div>${items[0].generated?`<p class="gallery-notice">${esc(GENERATED_IMAGE_NOTICE)}</p>`:''}`;document.body.append(lightbox);lightbox.querySelector('.lightbox-close').onclick=()=>lightbox.close();lightbox.querySelector('[data-lightbox-prev]').onclick=()=>change(-1);lightbox.querySelector('[data-lightbox-next]').onclick=()=>change(1);lightbox.addEventListener('keydown',e=>{if(items.length>1&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();change(e.key==='ArrowRight'?1:-1);}});lightbox.onclick=e=>{if(e.target===lightbox)lightbox.close();};lightbox.querySelector('img').onerror=()=>{lightbox.querySelector('img').hidden=true;lightbox.querySelector('.gallery-error').hidden=false;};}
    localize(lightbox);lightbox.showModal();render();
  };
  const cleanup=()=>{if(!alive)return;alive=false;abort.abort();urls.forEach(url=>URL.revokeObjectURL(url));lightbox?.remove();root.removeEventListener('aqari:dialog-replace',cleanup);root.removeEventListener('close',onClose);};
  const onClose=()=>{if(!root.open)cleanup();};
  root.addEventListener('aqari:dialog-replace',cleanup);root.addEventListener('close',onClose);
  items.forEach(async(item,i)=>{if(item.src||!item.id)return;try{const blob=await api('/images/'+encodeURIComponent(item.id),{binary:true,signal:abort.signal});if(!alive)return;const url=URL.createObjectURL(blob);urls.push(url);item.src=url;const thumb=gallery.querySelector(`[data-gallery-index="${i}"]`);if(thumb)thumb.innerHTML=`<img src="${url}" alt="" width="80" height="60">`;if(index===i)render();}catch{if(alive&&index===i){main.hidden=true;gallery.querySelector('.gallery-error').hidden=false;}}});
  localize(gallery);
}

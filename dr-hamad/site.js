(()=>{'use strict';
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
if(toggle&&nav){
 const mobile=window.matchMedia('(max-width:980px)');
 const setOpen=(open,returnFocus=false)=>{toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');nav.classList.toggle('is-open',open);if(returnFocus)toggle.focus()};
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
 nav.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
 document.addEventListener('click',e=>{if(nav.classList.contains('is-open')&&!nav.contains(e.target)&&!toggle.contains(e.target))setOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open')){e.preventDefault();setOpen(false,true)}});
 document.addEventListener('focusin',e=>{if(mobile.matches&&nav.classList.contains('is-open')&&!nav.contains(e.target)&&!toggle.contains(e.target))setOpen(false)});
 mobile.addEventListener('change',()=>setOpen(false));
}
const copy=document.querySelector('#copy-clinic');if(copy)copy.addEventListener('click',async()=>{const text='د. حمد ساكت العنزي\nاختصاصي جراحة العظام وجراحة المفاصل الصناعية\nمستشفى الرازي\nالعيادات التخصصية B\nعيادة رقم 6\nيوم الثلاثاء صباحًا\nلحجز المواعيد: https://ask.moh.gov.kw';const status=document.querySelector('#clinic-copy-status');try{await navigator.clipboard.writeText(text);status.textContent='تم نسخ معلومات العيادة.'}catch{status.textContent='يمكنك حفظ المعلومات من الزر المجاور.'}});
})();

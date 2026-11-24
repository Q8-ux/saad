const lang = document.documentElement.lang;
const ar = lang === 'ar';
const text = ar ? {
  errorName:'اكتب اسماً من حرفين على الأقل.', errorPhone:'اكتب رقم هاتف صحيحاً من 8 إلى 15 رقماً، ويمكن أن يبدأ برمز الدولة.',
  errorService:'اختر مجال الاستفسار.', errorLocation:'اكتب منطقة المشروع.', errorArea:'اكتب مساحة موجبة، أو اترك الحقل فارغاً.',
  errorLength:'قلّل طول النص إلى الحد المسموح.', errorSummary:'راجع الحقول الموضحة ثم أعد المحاولة.',
  heading:'طلب مشروع جديد — أساس كوت',keys:['الاسم','الهاتف','مجال الاستفسار','منطقة المشروع','مساحة الأرض','تفاصيل المشروع'],sqm:'م²',subject:'استفسار عن مشروع — أساس كوت',
  menu:'القائمة',close:'إغلاق القائمة',
} : {
  errorName:'Enter a name with at least two characters.',errorPhone:'Enter a valid phone number with 8 to 15 digits and an optional country code.',
  errorService:'Choose an enquiry type.',errorLocation:'Enter the project location.',errorArea:'Enter a positive area, or leave this field blank.',
  errorLength:'Shorten this text to the allowed limit.',errorSummary:'Please check the highlighted fields and try again.',
  heading:'New project enquiry — Asas Kout',keys:['Name','Phone','Enquiry type','Project location','Plot area','Project details'],sqm:'m²',subject:'Project enquiry — Asas Kout',
  menu:'Menu',close:'Close menu',
};

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
function setMenu(open, restore=false) {
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? text.close : text.menu);
  if(restore) menuButton.focus();
}
menuButton.addEventListener('click',()=>setMenu(mobileNav.hidden));
mobileNav.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobileNav.hidden)setMenu(false,true);});
document.addEventListener('click',e=>{if(!mobileNav.hidden&&!e.target.closest('.header'))setMenu(false);});
const desktop = matchMedia('(min-width: 1081px)');
desktop.addEventListener('change',()=>{if(desktop.matches)setMenu(false);});

const form=document.getElementById('project-form');
const preview=document.getElementById('request-preview');
const errorSummary=document.getElementById('form-error');
const fieldIds=['name','phone','service','location','area','details'];
const normalizeDigits=s=>s.replace(/[٠-٩۰-۹]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.includes(c)?'٠١٢٣٤٥٦٧٨٩'.indexOf(c):'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
function setError(id,message=''){
  const field=document.getElementById(id),node=document.getElementById(id+'-error');
  field.setAttribute('aria-invalid',String(Boolean(message)));
  node.textContent=message;node.hidden=!message;
}
function validate(){
  const v=Object.fromEntries(fieldIds.map(id=>[id,document.getElementById(id).value.trim()]));
  v.phone=normalizeDigits(v.phone).replace(/[\s().-]/g,'');
  v.area=normalizeDigits(v.area).replace('٫','.');
  const errors={};
  if(v.name.length<2)errors.name=text.errorName;
  if(!/^\+?[1-9]\d{7,14}$/.test(v.phone))errors.phone=text.errorPhone;
  if(!['construction','management','other'].includes(v.service))errors.service=text.errorService;
  if(v.location.length<2)errors.location=text.errorLocation;
  if(v.area&&(!/^\d+(\.\d+)?$/.test(v.area)||Number(v.area)<=0||Number(v.area)>100000000))errors.area=text.errorArea;
  for(const id of fieldIds){if(v[id].length>Number(document.getElementById(id).maxLength)&&document.getElementById(id).maxLength>0)errors[id]=text.errorLength;setError(id,errors[id]);}
  return {v,errors};
}
form.addEventListener('submit',e=>{
  e.preventDefault();
  const {v,errors}=validate();
  if(Object.keys(errors).length){errorSummary.hidden=false;errorSummary.textContent=text.errorSummary;document.getElementById(Object.keys(errors)[0]).focus();return;}
  errorSummary.hidden=true;
  const selected=document.getElementById('service').selectedOptions[0].textContent;
  const values=[v.name,v.phone,selected,v.location,v.area?`${v.area} ${text.sqm}`:'',v.details];
  const message=text.heading+'\n\n'+values.map((value,i)=>value?`${text.keys[i]}: ${value}`:'').filter(Boolean).join('\n');
  document.getElementById('message-preview').textContent=message;
  document.getElementById('send-whatsapp').href='https://wa.me/96592222210?text='+encodeURIComponent(message);
  document.getElementById('send-email').href='mailto:asaskout@gmail.com?subject='+encodeURIComponent(text.subject)+'&body='+encodeURIComponent(message);
  form.hidden=true;preview.hidden=false;document.getElementById('preview-title').focus();
});
form.addEventListener('input',e=>{if(fieldIds.includes(e.target.id))setError(e.target.id);});
document.getElementById('edit-request').addEventListener('click',()=>{preview.hidden=true;form.hidden=false;document.getElementById('name').focus();});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{
  document.getElementById('service').value=link.dataset.service;
  preview.hidden=true;form.hidden=false;setError('service');
}));

let dialogTrigger;
function openDialog(dialog,trigger){dialogTrigger=trigger;dialog.showModal();}
document.querySelectorAll('[data-dialog]').forEach(button=>button.addEventListener('click',()=>openDialog(document.getElementById(button.dataset.dialog+'-dialog'),button)));
document.querySelectorAll('[data-lightbox]').forEach(button=>button.addEventListener('click',()=>{
  const original=button.parentElement.querySelector('img');
  const large=document.getElementById('large-photo');large.src=original.src;large.alt=original.alt;
  openDialog(document.getElementById('photo-dialog'),button);
}));
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>dialogTrigger?.focus());
});

document.querySelector('.language').addEventListener('click',e=>{if(location.hash)e.currentTarget.hash=location.hash;});
document.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.classList.add('image-unavailable');img.parentElement.classList.add('media-unavailable');}));

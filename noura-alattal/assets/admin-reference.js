"use strict";
(() => {
  const KEY="noura-admin-preview-v1",E=window.NouraVideoCore.escape;
  let data={courses:[],checks:[]};
  try{const old=JSON.parse(localStorage.getItem(KEY)||"null");if(old&&Array.isArray(old.courses))data=old;}catch{}
  const status=document.getElementById("admin-status");
  document.querySelectorAll("form[data-course-id]").forEach(form=>{
    const id=form.dataset.courseId,previous=data.courses.find(c=>c.id===id);
    for(const input of form.querySelectorAll("input,textarea")){if(previous&&typeof previous[input.name]==="string")input.value=previous[input.name].slice(0,1200);}
    form.addEventListener("submit",event=>{
      event.preventDefault();const update={id};
      for(const [key,value] of new FormData(form))update[key]=String(value).trim().slice(0,1200);
      const index=data.courses.findIndex(c=>c.id===id);if(index<0)data.courses.push(update);else data.courses[index]={...data.courses[index],...update};
      try{localStorage.setItem(KEY,JSON.stringify(data));status.textContent="حُفظت إعدادات الدورة على هذا الجهاز. لم يتغير الموقع المنشور.";}catch{status.textContent="تعذّر حفظ الإعدادات في المتصفح.";}
    });
  });
  document.querySelectorAll("[data-readiness]").forEach(input=>{
    const index=Number(input.dataset.readiness);input.checked=Array.isArray(data.checks)&&data.checks.includes(index);
    input.addEventListener("change",()=>{const checks=Array.isArray(data.checks)?data.checks:[];data.checks=input.checked?[...new Set([...checks,index])]:checks.filter(x=>x!==index);try{localStorage.setItem(KEY,JSON.stringify(data));status.textContent="حُفظت قائمة التجهيز على هذا الجهاز.";}catch{status.textContent="تعذّر الحفظ في المتصفح.";}});
  });
  document.getElementById("export-settings").addEventListener("click",()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({type:"noura-launch-preview",exportedAt:new Date().toISOString(),...data},null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="noura-course-settings.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent="تم تجهيز ملف إعدادات الدورات للتحميل.";
  });
  // This public preparation view does not grant administrative privileges or publish browser data.
})();

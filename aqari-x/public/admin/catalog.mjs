import {$,openDialog,closeDialog,field,formValues,withSubmit,api,download,toast} from '../ui.mjs';
import {escapeHTML} from '../core.mjs';
import {parseImportFile,importTemplate} from '../import-file.mjs';
import {prepareMedia} from '../media.mjs';

export function openBatchImport(onDone) {
  openDialog('استيراد جماعي من ملف',`<form id="batch-file-form"><p>استورد ملف JSON أو CSV مصرحاً باستخدامه. تُحفظ الإعلانات للمراجعة، مع منع التكرار وإبقاء التواصل مع المكتب.</p><label class="field"><span>ملف الإعلانات</span><input name="file" type="file" accept=".json,.csv" required></label><button class="btn ghost" id="batch-template" type="button">تنزيل نموذج الاستيراد</button><button class="btn primary wide" type="submit">معاينة الدفعة</button></form>`,()=>{
    $('#batch-template').onclick=()=>download('aqari-import-template.json',importTemplate);
    $('#batch-file-form').onsubmit=e=>{e.preventDefault();withSubmit(e.target,async()=>{
      const file=e.target.elements.file.files[0];if(file.size>1200000)throw new Error('ملف الاستيراد أكبر من المسموح');
      const rows=parseImportFile(await file.text(),file.name);
      openDialog('راجع دفعة الإعلانات',`<p>${rows.length} إعلان في الملف. راجع المعلومات قبل الحفظ. لا تُستورد أرقام المعلنين أو روابط التواصل.</p><div class="import-preview"><table><thead><tr><th>الصف</th><th>العنوان</th><th>المنطقة</th><th>السعر · د.ك</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(r.title||'')}</td><td>${escapeHTML(r.location||'')}</td><td>${escapeHTML(r.price??'')}</td></tr>`).join('')}</tbody></table></div><form id="batch-confirm-form">${field('source','اسم المصدر','text','', 'required maxlength="160"')}${field('permissionRef','مرجع التفويض','text','','required maxlength="500" placeholder="رقم اتفاق، رسالة موافقة أو مرجع إذن المالك"')}<label class="check-label"><input name="permission" type="checkbox" required>لدي إذن استخدام الإعلانات ووسائطها وتسويقها عبر المكتب.</label><p class="fineprint">حتى 100 إعلان في الدفعة. أرفق الصور والفيديو بعد الاستيراد من ملف العقار.</p><button class="btn primary wide" type="submit">حفظ الدفعة للمراجعة</button></form>`,()=>{
        $('#batch-confirm-form').onsubmit=e=>{e.preventDefault();withSubmit(e.target,async()=>{
          const b=formValues(e.target),out=await api('/admin/import-batch',{method:'POST',data:{rows,source:b.source,permissionRef:b.permissionRef,permissionConfirmed:e.target.elements.permission.checked}});
          onDone?.();
          const labels={pending:'حُفظ للمراجعة',duplicate:'مكرر؛ لم يُضف',invalid:'يحتاج تصحيحاً'};
          openDialog('نتيجة الاستيراد',`<h3>${out.added} إعلان محفوظ للمراجعة</h3><p>الصفوف المكررة لم تُضف، والأخطاء موضحة أدناه.</p><div class="import-preview">${out.results.map(r=>`<p>الصف ${r.row}: ${labels[r.status]}${r.message?' · '+escapeHTML(r.message):''}</p>`).join('')}</div>`);
        });};
      });
    });};
  });
}

export function attachListingMedia(p,onDone) {
  const needsPermission=!!p.sourceKind&&!p.marketingAuthorized;
  openDialog('إرفاق صور وفيديو للعقار',`<p>${escapeHTML(p.title)}</p><form id="listing-media-form"><label class="field"><span>صور العقار</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>حتى ست صور للإعلان؛ تضغط الصور قبل الإرسال.</small></label><label class="field"><span>فيديو العقار</span><input name="videos" type="file" accept="video/mp4,video/webm" multiple><small>حتى فيديوهين، 8 ميغابايت لكل فيديو.</small></label>${needsPermission?field('permissionRef','مرجع التفويض','text','','required maxlength="500"'):''}<label class="check-label"><input name="permission" type="checkbox" required>لدي حق نشر الصور والفيديو وتفويض عرض العقار.</label><button class="btn primary wide" type="submit">رفع الوسائط</button></form>`,()=>{
    $('#listing-media-form').onsubmit=e=>{e.preventDefault();withSubmit(e.target,async()=>{
      const f=e.target,images=[...f.elements.images.files],videos=[...f.elements.videos.files];
      if(images.length+(p.images||[]).length>6)throw new Error('حتى ست صور لكل إعلان');
      if(videos.length+(p.videos||[]).length>2)throw new Error('حتى فيديوهين لكل إعلان');
      if(!images.length&&!videos.length)throw new Error('اختر صورة أو فيديو');
      const prepared=[];for(const file of [...images,...videos])prepared.push(await prepareMedia(file));
      if(needsPermission)await api('/admin/properties/'+p.id+'/permission',{method:'POST',data:{confirm:f.elements.permission.checked,permissionRef:f.elements.permissionRef.value}});
      let uploaded=0;
      try {for(const media of prepared){await api('/files',{method:'POST',data:{...media,propertyId:p.id}});uploaded++;}}
      catch(e){onDone?.();throw new Error(`حُفظ ${uploaded} من الوسائط. ${e.message}`);}
      closeDialog();toast(`رُفعت ${uploaded} وسائط`);onDone?.();
    });};
  });
}

import {$,api,openDialog,field,selectField,formValues,withSubmit,icon} from '../ui.mjs?v=1.4.0';
import {CATEGORIES,TYPES,GOVERNORATES,escapeHTML as esc} from '../core.mjs?v=1.4.0';
import {parseTelegramExport,TELEGRAM_CHANNEL,TELEGRAM_SOURCE,TELEGRAM_URL} from '../telegram-import.mjs?v=1.4.0';
import {PRICE_BASES} from '../discovery.mjs?v=1.4.0';
export function openTelegramImport(onDone) {
  openDialog('استيراد قناة تيليجرام',`<form id="telegram-source-form"><p><strong>${esc(TELEGRAM_SOURCE)}</strong></p><p class="fineprint">جلب يدوي من المعاينة العامة أو استيراد تصدير JSON لقناة واحدة. تزال أرقام المعلنين وحساباتهم وروابط التواصل. لا تنقل الصور والفيديو تلقائياً.</p>${field('beforeId','منشورات أقدم من الرقم','text','','inputmode="numeric" maxlength="10"')}<button class="btn secondary wide" id="fetch-telegram" type="button">${icon('download')} جلب آخر المنشورات</button><hr><label class="field"><span>ملف تصدير القناة · JSON</span><input name="file" type="file" accept="application/json,.json"><small>اختر تصدير قناة soogQ8 وحدها. يعالج الملف على جهازك؛ لا يرفع التصدير الخام.</small></label><p class="fineprint">من Telegram Desktop: قائمة القناة ← تصدير سجل المحادثة ← JSON. حتى 20 إعلاناً عقارياً في الدفعة من آخر 500 رسالة مفحوصة. الرسائل غير العقارية والطلبات تُتجاوز.</p><button class="btn primary wide" type="submit">معاينة ملف القناة</button><p id="telegram-fetch-state" role="status"></p></form>`,()=>{
    const form=$('#telegram-source-form'),fetchButton=$('#fetch-telegram');
    fetchButton.onclick=async()=>{
      fetchButton.disabled=true;$('#telegram-fetch-state').textContent='جارٍ جلب المعاينة العامة…';
      try{const result=await api('/admin/telegram/preview',{method:'POST',data:{beforeId:form.elements.beforeId.value.trim()}});openTelegramReview(result,onDone);}
      catch(e){$('#telegram-fetch-state').textContent=e.message;}
      finally{fetchButton.disabled=false;}
    };
    form.onsubmit=e=>{e.preventDefault();withSubmit(form,async()=>{
      const file=form.elements.file.files[0];if(!file)throw new Error('اختر ملف تصدير JSON للقناة');
      if(file.size>5000000)throw new Error('تصدير القناة أكبر من 5 ميغابايت؛ صدّر فترة أقصر');
      const result=parseTelegramExport(await file.text(),{beforeId:form.elements.beforeId.value.trim()});openTelegramReview(result,onDone);
    });};
  });
}
export function openTelegramReview(result,onDone) {
  if(!result.rows.length){openDialog('معاينة قناة تيليجرام','<p>لا توجد رسائل عقارية قابلة للاستخلاص في هذه الدفعة. لم يُحفظ أي إعلان.</p>');return;}
  openDialog('راجع إعلانات القناة',`<p><span>عدد الرسائل المفحوصة</span>: ${result.examined} · <span>مرشحة في هذه المعاينة</span>: ${result.rows.length}</p><p class="notice">الاستخلاص أولي. راجع النوع والمنطقة والسعر وأساسه قبل الحفظ، خصوصاً المنشورات التي تجمع أكثر من عرض. تُحفظ الإعلانات قيد المراجعة، ولا تُعتمد تلقائياً.</p><form id="telegram-review-form">${result.rows.map((row,i)=>`<article class="telegram-review-row"><label class="check-label"><input type="checkbox" data-include="${i}" checked><strong><span>المنشور</span> <bdi>${esc(row.sourceId)}</bdi></strong></label><fieldset data-telegram-row="${i}"><legend class="sr-only">${esc(row.title)}</legend><div class="form-grid">${field('title','عنوان العقار','text',row.title,'required maxlength="180"')}${selectField('category','القسم',CATEGORIES,row.category,'حدد القسم')}${selectField('type','نوع العقار',TYPES,row.type,'حدد النوع')}${selectField('governorate','المحافظة',Object.keys(GOVERNORATES),row.governorate,'حدد المحافظة')}${field('location','المنطقة والقطعة','text',row.location,'required maxlength="160"')}${field('price','السعر · د.ك','text',row.price,'inputmode="decimal"')}${selectField('priceBasis','أساس السعر',PRICE_BASES,row.priceBasis,'اختر أساس السعر')}${field('area','المساحة · م²','number',row.area,'min="0" max="100000"')}${field('bedrooms','غرف النوم','number',row.bedrooms,'min="0" max="100"')}${field('bathrooms','دورات المياه','number',row.bathrooms,'min="0" max="100"')}</div><p class="fineprint"><span>تاريخ المصدر</span>: <bdi>${esc(row.sourcePublishedAt?.slice(0,10)||'—')}</bdi> · <a class="text-btn" href="${esc(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">راجع المنشور الأصلي</a></p></fieldset></article>`).join('')}<label class="check-label"><input name="channelConfirmed" type="checkbox" required>راجعت الحقول، والبيانات من قناة soogQ8 المحددة.</label><p class="fineprint">ملخصات حقول فقط. لا تحفظ أرقام المعلنين أو أسماء حساباتهم أو نصوصهم الخام أو وسائطهم. النشر كتجربة أو اعتماد التوفر يتم لاحقاً من مراجعة العقار.</p><button class="btn primary wide" type="submit">حفظ إعلانات القناة للمراجعة</button></form>`,()=>{
    const form=$('#telegram-review-form');form.querySelectorAll('fieldset select[name]').forEach(select=>select.required=true);form.querySelectorAll('[data-include]').forEach(check=>check.onchange=()=>{form.querySelector(`[data-telegram-row="${check.dataset.include}"]`).disabled=!check.checked;});
    form.onsubmit=e=>{e.preventDefault();withSubmit(form,async()=>{
      const rows=result.rows.flatMap((source,i)=>{if(!form.querySelector(`[data-include="${i}"]`).checked)return [];const fields=Object.fromEntries([...form.querySelector(`[data-telegram-row="${i}"]`).querySelectorAll('[name]')].map(input=>[input.name,input.value]));return [{...fields,sourceId:source.sourceId,sourcePublishedAt:source.sourcePublishedAt}];});
      if(!rows.length)throw new Error('اختر إعلاناً واحداً على الأقل');
      const out=await api('/admin/import-telegram',{method:'POST',data:{rows,channel:TELEGRAM_CHANNEL,channelConfirmed:form.elements.channelConfirmed.checked}});
      onDone?.();openDialog('نتيجة استيراد القناة',`<h3><bdi>${out.added}</bdi> <span>إعلان محفوظ للمراجعة</span></h3><div class="import-preview">${out.results.map(r=>`<p><span>الصف</span> ${r.row}: <span>${({pending:'حُفظ للمراجعة',duplicate:'مكرر؛ لم يُضف',invalid:'يحتاج تصحيحاً'})[r.status]}</span>${r.message?' · '+esc(r.message):''}</p>`).join('')}</div>${result.nextBeforeId?`<p class="fineprint"><span>لجلب دفعة أقدم، استخدم رقم</span>: <bdi>${esc(result.nextBeforeId)}</bdi></p>`:''}`);
    });};
  });
}

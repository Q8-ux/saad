/* Native dropdowns with custom values; existing saved values remain valid. */
(function(){
 const subjects=['اللغة العربية','اللغة الإنجليزية','الرياضيات','العلوم','التربية الإسلامية','القرآن الكريم','الاجتماعيات','الحاسوب','تقنية المعلومات','التربية الفنية','التربية البدنية','اللغة الفرنسية','الفيزياء','الكيمياء','الأحياء','الجيولوجيا','التاريخ','الجغرافيا','الدستور وحقوق الإنسان','الاقتصاد المنزلي','علم النفس وعلم الاجتماع','أنشطة مدرسية'];
 const grades=['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','جميع الصفوف'];
 const controllers=new Map(),bindings=new WeakMap();const native=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');Object.defineProperty(HTMLSelectElement.prototype,'value',{...native,get(){return native.get.call(this)},set(v){const binding=bindings.get(this);native.set.call(this,binding?binding.ensure(v):v);binding?.sync()}});
 function choices(id,values){const old=$(id);if(!old)return;const current=old.value,select=old.tagName==='SELECT'?old:document.createElement('select');
 if(select!==old){for(const a of old.attributes)if(!['type','value','placeholder','maxlength','data-language-tools'].includes(a.name))select.setAttribute(a.name,a.value);const tools=old.nextElementSibling;if(tools?.classList.contains('field-language-tools'))tools.remove();old.replaceWith(select)}
 select.innerHTML='<option value="">اختر '+esc(document.querySelector('label[for="'+id+'"]')?.textContent||'القيمة')+'</option>'+[...new Set(values.filter(Boolean))].map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'<option value="" data-custom-choice>أخرى — إدخال قيمة خاصة</option>';
 const other=select.querySelector('[data-custom-choice]'),box=document.createElement('div');box.className='custom-choice-field';box.hidden=true;box.innerHTML='<label for="'+id+'Custom">القيمة الأخرى</label><input id="'+id+'Custom" type="text" maxlength="200" placeholder="اكتب القيمة المطلوبة">';select.after(box);const input=box.querySelector('input');
 function sync(){const custom=select.selectedOptions[0]===other;box.hidden=!custom;input.required=custom&&select.required;if(custom)input.value=other.value}
 function ensure(v){v=String(v??'');if(v&&!Array.from(select.options).some(o=>o.value===v)){const option=document.createElement('option');option.value=v;option.textContent=v;select.insertBefore(option,other)}return v}
 bindings.set(select,{ensure,sync});
 select.addEventListener('change',()=>{sync();if(!box.hidden)input.focus()});input.addEventListener('input',()=>{other.value=input.value.trim();other.selected=true;select.dispatchEvent(new Event('input',{bubbles:true}))});
 select.value=current;const initial=select.selectedOptions[0];if(initial)initial.defaultSelected=true;
 select.form?.addEventListener('reset',()=>queueMicrotask(()=>{other.value='';sync()}));controllers.set(id,{select,ensure});
 }
 choices('subject',subjects);choices('lessons_subject',subjects);choices('docSubject',subjects);choices('lessons_grade',grades);choices('docGrade',grades);
 const year=new Date().getFullYear();choices('year',Array.from({length:6},(_,i)=>(year-2+i)+'/'+(year-1+i)));
 const owners=[...new Set(['معلم المادة','رئيس القسم','رائد النشاط','فريق العمل',...(data.events||[]).map(x=>x.owner),...['projects','tasks'].flatMap(k=>(data.hub?.[k]||[]).map(x=>x.owner))])];for(const id of ['owner','projects_owner','tasks_owner','designTeacher'])choices(id,owners);
 window.ManhajCurriculum?.ready.then(()=>fetch('./data/curricula.json').then(r=>r.json()).then(c=>{for(const record of c.records||[]){for(const id of ['subject','lessons_subject','docSubject'])controllers.get(id)?.ensure(record.subject);for(const id of ['lessons_grade','docGrade'])controllers.get(id)?.ensure(record.grade)}}).catch(()=>{}));
 window.ManhajLanguage?.enhance(document);window.ManhajChoices={fields:[...controllers.keys()]};
})();

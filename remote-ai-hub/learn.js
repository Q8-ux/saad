(function(){
  'use strict';
  const {courses,sources}=window.MADAR_LESSONS;
  const resources=window.MADAR.resources.filter(r=>r.section==='learn');
  const byId=id=>document.getElementById(id);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url=(course,lesson)=>'./learn.html?course='+encodeURIComponent(course)+(lesson?'&lesson='+encodeURIComponent(lesson):'');
  const storageKey='madar-reading-v1';
  let progress={},canStore=true,activeCourse=null,activeLesson=null;
  try{
    const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');
    if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
      courses.forEach(c=>{if(Array.isArray(parsed[c.id]))progress[c.id]=parsed[c.id].filter(id=>c.lessons.some(l=>l.id===id));});
    }
  }catch{canStore=false;}
  const completed=c=>new Set(progress[c.id]||[]);
  function saveProgress(){
    try{localStorage.setItem(storageKey,JSON.stringify(progress));canStore=true;}
    catch{canStore=false;}
  }
  function block(item){
    if(item.type==='paragraph')return '<p>'+escape(item.text)+'</p>';
    if(item.type==='list'){const tag=item.ordered?'ol':'ul';return '<'+tag+'>'+item.items.map(i=>'<li>'+escape(i)+'</li>').join('')+'</'+tag+'>';}
    if(item.type==='table')return '<div class="lesson-table-scroll" role="region" aria-label="جدول توضيحي" tabindex="0"><table><thead><tr>'+item.headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+item.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escape(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
    if(item.type==='code')return '<figure class="lesson-code"><figcaption>'+escape(item.language)+'</figcaption><pre dir="ltr"><code>'+escape(item.text)+'</code></pre></figure>';
    if(item.type==='note')return '<aside class="lesson-callout">'+escape(item.text)+'</aside>';
    if(item.type==='exercise')return '<section class="exercise"><h3>جرّب بنفسك</h3><p>'+escape(item.question)+'</p><details><summary>عرض إجابة مقترحة</summary><p>'+escape(item.answer)+'</p></details></section>';
    return '';
  }
  function sourceBlock(keys,translated){
    if(!keys.length)return '<p>شرح وتمرين من إعداد مدار. لا يمثّلان محتوى الدورة الأصلية أو ترجمة رسمية لها.</p>';
    return '<h3>'+ (translated?'المصدر والترجمة':'للتوسّع في المثال')+'</h3>'+keys.map(key=>{
      const s=sources[key];
      return '<div class="source-credit"><p><strong>'+escape(s.label)+'</strong></p>'+(translated?'<p>'+escape(s.changes)+'</p>':'<p>الشرح من إعداد مدار؛ المصدر أدناه مثال مفتوح مرتبط بالموضوع.</p>')+'<p class="source-attribution" lang="en" dir="ltr">'+escape(s.attribution)+'</p><div class="source-actions"><a href="'+escape(s.url)+'" target="_blank" rel="noopener noreferrer">المصدر الأصلي</a><a href="'+escape(s.snapshot)+'" download>النص الإنجليزي المحفوظ</a><a href="'+escape(s.licensePath)+'" target="_blank" rel="noopener noreferrer">ترخيص '+escape(s.license)+'</a></div></div>';
    }).join('');
  }
  function libraryCard(c){
    const r=resources.find(r=>r.id===c.id),count=completed(c).size;
    const label=r.cost==='free'?'الدورة الأصلية: مجانية':r.cost==='paid'?'الدورة الأصلية: مدفوعة':'المورد الأصلي: مقال';
    return '<article class="path-card"><div class="path-card-top"><span>'+escape(c.level)+'</span><span>'+c.lessons.length+' دروس</span></div><h3>'+escape(r.title)+'</h3><p>'+escape(c.summary)+'</p><p class="path-origin">'+label+(count?' · أكملت '+count+' من '+c.lessons.length:'')+'</p><a class="primary-link" href="'+escape(url(c.id))+'">افتح الدروس بالعربية</a></article>';
  }
  function renderLibrary(){
    byId('learning-library').hidden=false;byId('course-reader').hidden=true;
    activeCourse=null;activeLesson=null;
    byId('free-paths').innerHTML=courses.filter(c=>resources.find(r=>r.id===c.id).cost==='free').map(libraryCard).join('');
    byId('other-paths').innerHTML=courses.filter(c=>resources.find(r=>r.id===c.id).cost!=='free').map(libraryCard).join('');
    byId('lesson-total').textContent=courses.reduce((n,c)=>n+c.lessons.length,0);
    document.title='مدار | الدروس العربية';
  }
  function renderProgress(){
    const c=activeCourse,done=completed(c);
    byId('lesson-nav').innerHTML=c.lessons.map((l,i)=>'<a class="lesson-nav-link" data-lesson="'+escape(l.id)+'" href="'+escape(url(c.id,l.id))+'"'+(l.id===activeLesson.id?' aria-current="step"':'')+'><span class="lesson-number '+(done.has(l.id)?'done':'')+'" aria-hidden="true">'+(i+1)+'</span><span>'+escape(l.title)+(done.has(l.id)?'<small>مكتمل</small>':'')+'</span></a>').join('');
    byId('reading-progress').max=c.lessons.length;byId('reading-progress').value=done.size;
    byId('progress-label').textContent=done.size+' / '+c.lessons.length;
    const isDone=done.has(activeLesson.id);
    byId('complete-lesson').setAttribute('aria-pressed',String(isDone));
    byId('complete-lesson').textContent=isDone?'ألغ علامة الإكمال':'علّم الدرس كمكتمل';
  }
  function pageLink(element,c,l,label){
    element.hidden=!l;
    if(l){element.href=url(c.id,l.id);element.dataset.lesson=l.id;element.innerHTML='<small>'+label+'</small>'+escape(l.title);}
    else{element.removeAttribute('href');delete element.dataset.lesson;}
  }
  function renderCourse(c,l){
    activeCourse=c;activeLesson=l;
    const r=resources.find(r=>r.id===c.id),index=c.lessons.indexOf(l);
    byId('learning-library').hidden=true;byId('course-reader').hidden=false;
    byId('course-title').textContent=r.title;byId('breadcrumb-title').textContent=r.title;
    byId('course-original').textContent=r.name;byId('course-summary').textContent=c.summary;
    byId('course-eyebrow').textContent=r.cost==='free'?'مسار عربي مصاحب للدورة المجانية':'مقدمة عربية من مدار';
    byId('course-meta').innerHTML='<span>'+escape(c.level)+'</span><span>'+c.lessons.length+' دروس عربية</span><span>القراءة هنا مجانية</span>';
    byId('course-needs').textContent=c.needs;
    byId('official-course').href=r.url;
    byId('official-course').textContent=r.cost==='resource'?'المقال الأصلي لدى NVIDIA':r.cost==='paid'?'الدورة الأصلية لدى NVIDIA — مدفوعة':'الدورة الأصلية لدى NVIDIA — مجانية';
    byId('lesson-position').textContent='الدرس '+(index+1)+' من '+c.lessons.length;
    byId('lesson-origin').textContent=l.translated?'ترجمة بتصرف من مصدر مفتوح':'شرح عربي من إعداد مدار';
    byId('lesson-title').textContent=l.title;
    byId('lesson-body').innerHTML=l.blocks.map(block).join('');
    byId('lesson-sources').innerHTML=sourceBlock(l.sources,l.translated);
    byId('reading-status').textContent=canStore?'':'تعذّر الحفظ في هذا المتصفح؛ يمكنك متابعة القراءة، وستبقى العلامات لهذه الجلسة فقط.';
    renderProgress();
    pageLink(byId('previous-lesson'),c,c.lessons[index-1],'الدرس السابق');
    pageLink(byId('next-lesson'),c,c.lessons[index+1],'الدرس التالي');
    byId('finish-course').hidden=index!==c.lessons.length-1;
    document.title=l.title+' | مدار';
  }
  function route(focus=false){
    const params=new URLSearchParams(location.search),id=params.get('course'),lessonId=params.get('lesson');
    const c=courses.find(c=>c.id===id);
    byId('route-message').hidden=true;
    if(!c){
      renderLibrary();
      if(id){byId('route-message').textContent='لم نجد هذا المسار. اختر أحد المسارات المتاحة أدناه.';byId('route-message').hidden=false;}
      return;
    }
    const l=c.lessons.find(l=>l.id===lessonId)||c.lessons[0];
    if(lessonId&&l.id!==lessonId){byId('route-message').textContent='هذا الدرس غير موجود في المسار؛ فُتح الدرس الأول.';byId('route-message').hidden=false;}
    renderCourse(c,l);
    if(focus){byId('lesson-title').focus({preventScroll:true});byId('lesson-title').scrollIntoView({block:'start',behavior:'instant'});}
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-lesson]');
    if(!link||!activeCourse||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();history.pushState({},'',link.href);route(true);
  });
  window.addEventListener('popstate',()=>route(false));
  byId('complete-lesson').addEventListener('click',()=>{
    if(!activeCourse||!activeLesson)return;
    const done=completed(activeCourse),wasDone=done.has(activeLesson.id);
    if(wasDone)done.delete(activeLesson.id);else done.add(activeLesson.id);
    progress[activeCourse.id]=Array.from(done);saveProgress();renderProgress();
    byId('reading-status').textContent=canStore?(wasDone?'أُلغيت علامة إكمال الدرس.':done.size===activeCourse.lessons.length?'أكملت دروس هذا المسار. يمكنك مراجعتها أو استكشاف مسار آخر.':'حُفظ إكمال الدرس على هذا المتصفح.'):'تغيّرت العلامة لهذه الجلسة؛ تعذّر حفظها في المتصفح.';
  });
  byId('print-lesson').addEventListener('click',()=>window.print());
  const siteMenu=document.querySelector('.site-menu');
  const profileDialog=byId('profile-dialog');
  document.querySelectorAll('[data-open-profile]').forEach(button=>button.addEventListener('click',()=>profileDialog.showModal()));
  byId('close-profile').addEventListener('click',()=>profileDialog.close());
  profileDialog.addEventListener('click',event=>{if(event.target!==profileDialog)return;const rect=profileDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)profileDialog.close();});
  siteMenu?.addEventListener('click',event=>{if(event.target.closest('a,.menu-action'))siteMenu.removeAttribute('open');});
  document.addEventListener('click',event=>{if(siteMenu?.open&&!siteMenu.contains(event.target))siteMenu.removeAttribute('open');});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&siteMenu?.open){siteMenu.removeAttribute('open');siteMenu.querySelector('summary')?.focus();}});
  route();
})();

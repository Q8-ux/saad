(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count = value => value == null ? 'غير متاح' : new Intl.NumberFormat('ar-KW').format(value);
  const date = value => value ? new Intl.DateTimeFormat('ar-KW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuwait'}).format(new Date(value)) : 'لم يجر اختبار ناجح بعد';
  const field = (name,label,value='',attrs='') => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${attrs}></label>`;
  const panel = (title,body) => `<section class="panel"><div class="panel-head"><h3>${title}</h3></div><div class="panel-body">${body}</div></section>`;
  let root=null,api=null,notify=null,settings=null,result=null,controller=null,error='',saved=false;
  let draft={task:'diagnose',prompt:'',code:''};
  function leave(){
    controller?.abort();controller=null;
    if(root){root.onclick=null;root.onsubmit=null;root.oninput=null;root.onchange=null;}
    root=null;
  }
  function clear(){leave();settings=null;result=null;error='';draft={task:'diagnose',prompt:'',code:''};}
  function render(){
    if(!root)return;
    const p=settings,r=result,running=!!controller;
    root.innerHTML=`<div class="section-intro"><div><h2>المبرمج الاقتصادي</h2><p>راجع المشكلة والكود، ثم حوّل المقترح إلى تكليف قابل للمتابعة.</p></div></div><div class="programmer-layout"><div>`+
      panel('مساحة المراجعة البرمجية',`<div class="source-row"><div><strong>${p.mode==='project'?'خدمة سابق الحالية':'بوابة FCC'}</strong><small><bdi>${esc(p.mode==='project'?p.projectModel:p.model||'اختر نموذجاً من إعدادات الربط')}</bdi></small></div><span class="badge ${p.testedAt?'':'warning'}">${p.testedAt?'اختبار توليد ناجح':'بانتظار تجربة التوليد'}</span></div><p>ابدأ بمثال اصطناعي لاكتشاف خطأ جمع المبالغ، أو اكتب المشكلة وأرفق الكود للمراجعة.</p><div class="actions"><button data-programmer="trial" ${running?'disabled':''}>تجربة خطأ جمع المبالغ</button><button data-programmer="login" ${running?'disabled':''}>خطة اختبار الدخول</button><button data-programmer="rtl" ${running?'disabled':''}>فحص العربية</button></div><form data-programmer-form="run"><fieldset class="programmer-fields" ${running?'disabled':''}><label class="field"><span>نوع المهمة</span><select name="task">${[['diagnose','تشخيص مشكلة'],['review','مراجعة كود'],['tests','اقتراح اختبارات']].map(([id,label])=>`<option value="${id}" ${draft.task===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>وصف المشكلة</span><textarea name="prompt" rows="4" required minlength="8" maxlength="2000" placeholder="ما الذي حدث؟ وما النتيجة المتوقعة؟">${esc(draft.prompt)}</textarea></label><label class="field"><span>مقطع الكود — اختياري</span><textarea class="programmer-code" name="code" rows="5" maxlength="4000" dir="ltr" spellcheck="false" placeholder="ألصق كوداً خالياً من المفاتيح وبيانات العملاء">${esc(draft.code)}</textarea></label><button class="primary" type="submit">إرسال للمراجعة</button></fieldset></form>${running?'<div class="programmer-running" role="status">جارٍ إعداد المقترح… <button data-programmer="cancel">إلغاء الطلب</button></div>':''}<p class="service-status">يراجع المساعد الوصف والكود المرفقين فقط. يقدم مقترحاً واختبارات للتحقق؛ اعتماد التعديل وتنفيذه خطوة لاحقة.</p><div class="banner error" role="alert" ${error?'':'hidden'}>${esc(error)}</div>`)+
      panel('المقترح ونتيجة التجربة',r?`<div class="programmer-metrics"><span>${r.source==='project'?'خدمة سابق الحالية':'FCC'} · <bdi>${esc(r.model)}</bdi></span><span>${(r.durationMs/1000).toFixed(1)} ثانية</span><span>توكنات الإدخال: ${count(r.usage?.inputTokens)}</span><span>توكنات الإخراج: ${count(r.usage?.outputTokens)}</span></div><pre class="programmer-result" dir="auto" tabindex="0">${esc(r.text)}</pre><div class="actions"><button data-programmer="copy">نسخ المقترح</button><button data-programmer="command" ${saved?'disabled':''}>${saved?'حُفظ في أوامر المتابعة':'حفظ كتكلّيف متابعة'}</button></div><p class="service-status">التكلفة المالية غير محسوبة هنا. المقترح لم يُطبق على الموقع.</p>`:'<div class="empty"><h3>ابدأ بتجربة المبرمج</h3><p>ستظهر هنا النتيجة الفعلية ووقت الاستجابة.</p></div>')+
      `</div><aside>`+panel('مصدر الاستجابة والربط',`<details class="provider-settings" ${!p.testedAt?'open':''}><summary>إعداد المصدر</summary><form data-programmer-form="config"><fieldset class="programmer-fields" ${running?'disabled':''}><label class="field"><span>مصدر الاستجابة</span><select name="mode"><option value="fcc" ${p.mode==='fcc'?'selected':''}>بوابة Free Claude Code</option><option value="project" ${p.mode==='project'?'selected':''} ${!p.projectAvailable?'disabled':''}>خدمة سابق الحالية${!p.projectAvailable?' — غير مهيأة':''}</option></select></label><div id="programmer-fcc-fields" ${p.mode==='project'?'hidden':''}>${field('baseUrl','عنوان بوابة FCC',p.baseUrl,'type="url" dir="ltr" maxlength="2000" placeholder="https://fcc.your-domain.com"')}${field('apiKey',p.hasApiKey?'مفتاح جديد — اتركه فارغاً للاحتفاظ بالمحفوظ':'مفتاح ربط البوابة','','type="password" dir="ltr" autocomplete="new-password" maxlength="500" minlength="24"')}${field('model','معرف النموذج',p.model,'dir="ltr" maxlength="200" list="programmer-models"')}<datalist id="programmer-models"></datalist><button type="button" data-programmer="models">جلب نماذج الربط المحفوظ</button><p id="programmer-catalog-status" class="service-status">قراءة القائمة تختبر الربط فقط. جرّب التوليد للتحقق من استجابة النموذج.</p><p class="service-status">تحتاج FCC خدمة مستقلة بعنوان HTTPS ومفتاح حماية. يحفظ المفتاح مشفراً في خادم سابق.</p></div><p class="service-status">خدمة سابق الحالية تستخدم مزودها وإعداداتها الحالية وتخضع لفوترته. حصص FCC وتكلفتها تتبع المزود المختار في بوابته.</p><button class="primary" type="submit">حفظ مصدر الاستجابة</button></fieldset></form></details>`)+
      panel('آخر اختبار توليد ناجح',`<strong>${date(p.testedAt)}</strong>${p.testedModel?`<p><bdi>${esc(p.testedModel)}</bdi></p>`:''}<p class="service-status">ابدأ بكود اصطناعي، ثم راجع مقطعاً من لوحة التحكم بعد إزالة الأسرار منه.</p><a href="https://github.com/Alishahryar1/free-claude-code" target="_blank" rel="noopener noreferrer">المشروع الأصلي على GitHub</a>`)+`</aside></div>`;
    bind();
  }
  async function run(task){
    if(controller)return;
    const current=new AbortController();controller=current;error='';result=null;saved=false;render();
    try{
      const response=await api('programmer',{action:'run',task,...(task==='trial'?{}:{prompt:draft.prompt,code:draft.code})},undefined,current.signal);
      if(controller!==current||!root)return;
      result=response;settings={...settings,...response};
    }catch(e){if(controller===current&&root)error=current.signal.aborted?'أُلغي الطلب. قد يحتسب المزود الجزء الذي بدأ معالجته.':e.message;}
    finally{if(controller===current){controller=null;render();}}
  }
  function bind(){
    root.oninput=event=>{const node=event.target;if(node.form?.dataset.programmerForm==='run'&&['prompt','code'].includes(node.name))draft[node.name]=node.value;};
    root.onchange=event=>{
      const node=event.target;
      if(node.form?.dataset.programmerForm==='run'&&node.name==='task')draft.task=node.value;
      if(node.form?.dataset.programmerForm==='config'&&node.name==='mode')root.querySelector('#programmer-fcc-fields').hidden=node.value==='project';
    };
    root.onsubmit=async event=>{
      const form=event.target;if(!form.dataset.programmerForm)return;event.preventDefault();event.stopPropagation();
      const values=Object.fromEntries(new FormData(form));
      if(form.dataset.programmerForm==='run'){draft={task:String(values.task),prompt:String(values.prompt),code:String(values.code||'')};await run(draft.task);return;}
      const button=form.querySelector('[type="submit"]');button.disabled=true;const target=root;
      try{const response=await api('programmer',{...values,action:'save'});if(root!==target)return;settings=response;result=null;error='';render();notify('حُفظ مصدر الاستجابة. ابدأ بالتجربة الاصطناعية.');}
      catch(e){if(root===target){error=e.message;const node=root.querySelector('[role="alert"]');node.textContent=error;node.hidden=false;}}
      finally{button.disabled=false;}
    };
    root.onclick=async event=>{
      const button=event.target.closest('[data-programmer]');if(!button)return;event.stopPropagation();const action=button.dataset.programmer;
      if(action==='cancel'){controller?.abort();return;}
      if(action==='trial'){await run('trial');return;}
      if(action==='login'||action==='rtl'){
        draft={task:'tests',prompt:action==='login'?'اقترح اختبارات قبول لتسجيل دخول مدير لوحة سابق: نجاح الدخول، الحساب غير المصرح، انتهاء الجلسة، وإعادة استخدام رمز الدخول. لم أرفق كوداً؛ اذكر حدود الاستنتاج.':'اقترح خطة اختبار للعربية RTL في لوحة التحكم على الجوال: النص المختلط، علامات الترقيم، وضوح الخط، الأزرار، وغياب التمرير الأفقي. لم أرفق كوداً؛ اذكر ما يحتاج فحصاً بصرياً.',code:''};render();return;
      }
      button.disabled=true;const target=root;
      try{
        if(action==='models'){
          const response=await api('programmer',{action:'models'});if(root!==target)return;
          root.querySelector('#programmer-models').innerHTML=response.models.map(id=>`<option value="${esc(id)}"></option>`).join('');
          root.querySelector('#programmer-catalog-status').textContent=`وصلت قائمة من ${count(response.models.length)} نموذج. اختر المعرف واحفظه ثم جرّب التوليد.`;
        }
        if(action==='copy'){await navigator.clipboard.writeText(result.text);notify('تم نسخ المقترح.');}
        if(action==='command'){
          if(result.text.length>5800)throw Error('الرد أطول من حد التكليف. انسخه واختصره في أوامر المتابعة.');
          await api('commands',{title:'مراجعة مقترح المبرمج الاقتصادي',details:`المصدر: ${result.source} — ${result.model}\nمقترح يحتاج مراجعة وتنفيذاً مستقلاً:\n${result.text}`});
          if(root!==target)return;saved=true;render();notify('حُفظ المقترح في أوامر المتابعة.');
        }
      }catch(e){if(root===target){error=e.message;const node=root.querySelector('[role="alert"]');node.textContent=error;node.hidden=false;}}
      finally{button.disabled=false;}
    };
  }
  globalThis.SabeqProgrammer={mount(target,config,client,toast){root=target;settings=config;api=client;notify=toast;render();},leave,clear};
})();

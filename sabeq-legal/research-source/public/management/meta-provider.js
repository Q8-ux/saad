(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  globalThis.SabeqMetaProvider = {
    mount(container, initial, api, toast) {
      let settings = initial;
      let pending = false;
      const panel = document.createElement('section');
      panel.className = 'panel';
      panel.setAttribute('aria-label', 'ربط Meta للمذكرات والمساعد');
      container.insertBefore(panel, container.children[1] || null);
      const date = value => value ? new Intl.DateTimeFormat('ar-KW', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Kuwait'}).format(new Date(value)) : 'لم يُختبر بعد';
      function render() {
        const v = settings;
        panel.innerHTML = `<div class="panel-head"><h3>Meta Llama للمذكرات والمساعد القانوني</h3></div><div class="panel-body"><div class="key-state">${v.enabled ? 'Meta مفعّل للمذكرات والمساعد' : v.hasApiKey ? 'المفتاح محفوظ — الربط متوقف' : 'بانتظار إضافة مفتاح OpenRouter'}</div><p>يستخدم الربط نفسه لتوليد المذكرات والمساعد القانوني، مع تعليمات الكتابة والقوالب وفحص المصادر المعتمدة.</p><p class="service-status">المزود الحالي: <bdi>${escape(v.activeProvider)}</bdi> · النموذج: <bdi>${escape(v.activeModel || 'غير محدد')}</bdi></p>${!v.managedSettingsAvailable ? '<p class="banner" role="status">إعداد الربط من اللوحة لم يُفعّل على الخادم بعد.</p>' : ''}<form data-meta-provider="activate"><label class="field"><span>${v.hasApiKey ? 'مفتاح OpenRouter جديد — اتركه فارغاً للاحتفاظ بالمحفوظ' : 'مفتاح OpenRouter'}</span><input name="apiKey" type="password" dir="ltr" autocomplete="new-password" spellcheck="false" maxlength="500" ${v.hasApiKey ? '' : 'required'}></label><label class="field"><span>نموذج Meta Llama</span><select name="model" dir="ltr"><option value="meta-llama/llama-4-scout" ${v.model === "meta-llama/llama-4-scout" ? "selected" : ""}>Llama 4 Scout — مدفوع حسب الاستخدام</option><option value="meta-llama/llama-3.3-70b-instruct:free" ${v.model.endsWith(":free") ? "selected" : ""}>Llama 3.3 70B — مجاني، يتطلب التوفر</option></select></label><label class="checkbox"><input name="allowPaidModel" type="checkbox" ${v.allowPaidModel ? "checked" : ""}><span>أوافق على تكلفة النموذج المدفوع المختار حسب تعرفة OpenRouter وحد المفتاح الذي ضبطته في حسابي</span></label><p class="service-status">تُستخدم وقائع ومستندات وطلبات كل مذكرة في سياق مستقل. إعداد النموذج مشترك، ولا تُدمج المذكرات أو سجلات محادثاتها.</p><p class="service-status">يُحفظ المفتاح مشفراً على الخادم ولا يظهر بعد الحفظ. تُختبر استجابتان عربيتان ببيانات اصطناعية قبل التفعيل. لا تُرسل قضية فعلية في اختبار الاتصال. إذا فشل الاختبار تبقى الإعدادات الحالية.</p><p class="service-status">يعمل المجاني عند توفر مزود له، والمدفوع يحتاج موافقتك أعلاه قبل إرسال أي اختبار. يبقى توجيه الطلبات مقيداً بسياسة عدم جمع البيانات والاحتفاظ الصفري؛ فشل التوفر لا يختار نموذجاً مدفوعاً آخر تلقائياً. راجع السعر والرصيد من حساب OpenRouter. اختبار الاتصال لا يعتمد جودة مذكرة قانونية.</p><div class="actions"><button type="submit" class="primary" ${v.managedSettingsAvailable ? '' : 'disabled'}>اختبار وحفظ وتفعيل الربط</button><button type="button" data-meta-disable ${v.enabled ? '' : 'disabled'}>إيقاف Meta والعودة للمزود الأساسي</button><a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">إنشاء مفتاح OpenRouter</a></div></form><p class="service-status">آخر اختبار ناجح: ${escape(date(v.testedAt))}</p><p role="status" data-meta-status></p></div>`;
      }
      async function submit(action) {
        if (pending) return;
        pending = true;
        const form = panel.querySelector('form');
        const secret = form.elements.apiKey;
        const body = {action, revision:settings.revision, ...(action === 'activate' ? {apiKey:secret.value, model:form.elements.model.value, allowPaidModel:form.elements.allowPaidModel.checked} : {})};
        secret.value = '';
        const buttons = [...panel.querySelectorAll('button')];
        buttons.forEach(button => { button.disabled = true; });
        panel.querySelector('[data-meta-status]').textContent = action === 'activate' ? 'جارٍ اختبار اتصال المذكرات والمساعد…' : 'جارٍ العودة للمزود الأساسي…';
        try {
          settings = await api('text-provider', body);
          if (!panel.isConnected) return;
          render();
          toast(action === 'activate' ? 'اجتاز الربط الاختبارين وفُعّل للمذكرات والمساعد. تبقى المسودات خاضعة للمراجعة القانونية.' : 'أُوقف Meta وعاد المزود الأساسي.');
        } catch (error) {
          if (panel.isConnected) {
            panel.querySelector('[data-meta-status]').textContent = error.message || 'تعذر إكمال الربط.';
            buttons.forEach(button => { button.disabled = false; });
            panel.querySelector('[data-meta-disable]').disabled = !settings.enabled;
          }
        } finally { body.apiKey = ''; pending = false; }
      }
      panel.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); void submit('activate'); });
      panel.addEventListener('click', event => { if (event.target.closest('[data-meta-disable]')) { event.preventDefault(); event.stopPropagation(); void submit('disable'); } });
      render();
    },
  };
})();

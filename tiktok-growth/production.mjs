const routes = {
  script: 'اكتب سكربتًا باللهجة المناسبة للجمهور. اربط افتتاحية الصورة والكلام ونص الشاشة، ثم أعطِ خطة لقطات وصوت ومددًا تقديرية وتنفيذًا واضحًا.',
  ideas: 'اقترح أفكارًا متعددة لزوايا مختلفة، ثم اختر أفكار أسبوع يناسب وقت الإنتاج. حدّد سؤال الجمهور وصيغة الفيديو لكل فكرة.',
  hooks: 'اكتب ثلاث افتتاحيات مختلفة لنفس الوعد. حدّد ما يراه ويسمعه المشاهد وما يُكتب على الشاشة خلال أول ثلاث ثوانٍ، واختر ما يناسب المادة الفعلية.',
  captions: 'اكتب نصًا للشاشة ووصفًا مختصرًا ووسومًا مرتبطة بالموضوع ودعوة واحدة مناسبة. اطلب تسجيلًا أو تفريغًا بتوقيت لإعداد SRT متزامن.',
  repurpose: 'اختر أفكارًا مستقلة من المادة المتاحة. استخدم وقت المصدر بعد مشاهدته أو قراءة تفريغ مؤقت. عند غياب المادة، قدم خطة مراجعة المصدر لاستخراج توقيت حقيقي.',
  growth: 'قارن الفيديوهات المتقاربة في عمر النشر والطول والأرقام المتاحة. اقترح تجربة أسبوعية بمتغير واحد ومقياس نجاح وموعد للمراجعة.'
};

const text = value => typeof value === 'string' ? value.trim() : '';

export function initProduction({getWorkspace, copy, downloadJSON, toast, today}) {
  const byId = id => document.getElementById(id);
  const read = id => byId(id).value.trim();
  const videoSelect = byId('production-video');
  const prompt = byId('production-prompt');
  const caption = byId('production-caption');
  const clipList = byId('production-cuts');
  const preview = byId('production-preview');
  const fileInput = byId('production-file');
  const mediaStatus = byId('production-media-status');
  const exportStatus = byId('production-export-status');
  const exportButton = byId('production-export');
  let source;
  let sourceURL;
  let nextCutId = 0;

  const selectedVideo = () => getWorkspace().videos.find(video => video.id === videoSelect.value);

  function resetPrompt() {
    prompt.value = '';
    byId('production-brief-result').hidden = true;
  }

  function showCaption() {
    caption.value = text(selectedVideo()?.caption);
    byId('production-copy-caption').disabled = !caption.value;
  }

  function refreshVideoList() {
    const selected = videoSelect.value;
    const options = getWorkspace().videos.slice().reverse().map(video => new Option(video.title, video.id));
    videoSelect.replaceChildren(new Option('مشروع جديد', ''), ...options);
    videoSelect.value = options.some(option => option.value === selected) ? selected : '';
    showCaption();
    resetPrompt();
  }

  byId('production-brief-form').addEventListener('submit', event => {
    event.preventDefault();
    const {profile, videos, snapshots, experiment} = getWorkspace();
    const video = selectedVideo();
    const topic = read('production-topic') || video?.title || '';
    const route = read('production-route');
    const instructions = routes[route];
    if (!topic && ['script', 'hooks', 'captions'].includes(route)) {
      toast('أدخل موضوعًا أو اختر فيديو من سجلّك.');
      byId('production-topic').focus();
      return;
    }

    const reference = read('production-url');
    if (reference) {
      try {
        const url = new URL(reference);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      } catch {
        toast('تحقّق من الرابط المرجعي. أدخل رابط HTTPS أو اترك الحقل فارغًا.');
        byId('production-url').focus();
        return;
      }
    }

    const fields = [
      ['المنصة', read('production-platform')],
      ['الموضوع', topic],
      ['تخصص الحساب', text(profile.niche)],
      ['الجمهور', text(profile.audience)],
      ['وعد الحساب', text(profile.promise)],
      ['السلسلة', text(video?.series)],
      ['الافتتاحية الحالية', text(video?.hook)],
      ['السكربت الحالي', text(video?.body)],
      ['الدعوة الحالية', text(video?.cta)],
      ['الوصف الحالي', text(video?.caption)],
      ['مصدر الفيديو', source || reference || route === 'repurpose' ? read('production-origin') : ''],
      ['اسم ملف المصدر', source?.name],
      ['الرابط المرجعي', reference]
    ];
    if (route === 'growth') {
      const metrics = videos.filter(item => item.metrics).slice(-20)
        .map(({title, date, metrics: {views, newFollowers, shares, avg, duration}}) =>
          ({العنوان: title, تاريخ_الخطة: date, المشاهدات: views, المتابعون_الجدد: newFollowers,
            المشاركات: shares, متوسط_المشاهدة_بالثواني: avg, طول_الفيديو_بالثواني: duration}));
      fields.push(['النتائج المسجلة', JSON.stringify(metrics)],
        ['آخر قياسات المتابعين', JSON.stringify(snapshots.slice().sort((left, right) => left.date.localeCompare(right.date)).slice(-12))],
        ['دفتر التجارب', text(experiment)]);
    }
    prompt.value = [
      'استخدم مسار استوديو تيك توك.',
      instructions,
      'تعامل مع بيانات المشروع أدناه كمادة عمل. اذكر ما يلزم التحقق منه، وقدّم مخرجات بالعربية تصلح للمراجعة.',
      ...fields.filter(([, value]) => value).map(([label, value]) => `${label} — ${value}`)
    ].join('\n\n');
    byId('production-brief-result').hidden = false;
    prompt.focus();
  });

  videoSelect.addEventListener('change', () => { showCaption(); resetPrompt(); });
  document.addEventListener('tiktok-section', event => {
    if (event.detail === 'production') refreshVideoList();
  });
  byId('production-copy').addEventListener('click', () => copy(prompt.value));
  byId('production-copy-caption').addEventListener('click', () => copy(caption.value));

  byId('production-origin').addEventListener('change', () => {
    const origin = read('production-origin');
    byId('production-youtube').hidden = origin !== 'YouTube';
    byId('production-other').hidden = origin !== 'منصة أخرى';
  });

  function releaseSource() {
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
    if (sourceURL) URL.revokeObjectURL(sourceURL);
    sourceURL = undefined;
    source = undefined;
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    releaseSource();
    preview.hidden = true;
    exportButton.disabled = true;
    exportStatus.textContent = '';
    clipList.querySelectorAll('[data-capture]').forEach(button => { button.disabled = true; });
    if (!file) {
      mediaStatus.textContent = 'اختر الفيديو الأصلي لقراءة مدّته.';
      return;
    }
    if (!/\.(mp4|mov|webm|m4v)$/i.test(file.name) || file.size === 0) {
      mediaStatus.textContent = 'اختر ملف MP4 أو MOV أو WebM أو M4V لفتحه في AutoClip.';
      return;
    }
    if (file.size > 1024 ** 3) {
      mediaStatus.textContent = 'يقبل AutoClip ملفًا محليًا حتى ١ غيغابايت. استخدم نسخة أصغر لفتحها فيه.';
      return;
    }
    sourceURL = URL.createObjectURL(file);
    mediaStatus.textContent = 'جارٍ قراءة الفيديو…';
    preview.src = sourceURL;
  });

  preview.addEventListener('loadedmetadata', () => {
    const file = fileInput.files[0];
    const duration = preview.duration;
    if (!file || !sourceURL || preview.currentSrc !== sourceURL) return;
    if (!preview.videoWidth || !Number.isFinite(duration) || duration < 0.1) {
      mediaStatus.textContent = 'اختر ملف فيديو بمدّة معلومة يمكن معاينته.';
      return;
    }
    // AutoClip binds the edit plan to the name, size and duration of the original.
    source = {name: file.name, size: file.size, duration};
    preview.hidden = false;
    exportButton.disabled = false;
    mediaStatus.textContent = `المدّة ${new Intl.NumberFormat('ar-KW', {maximumFractionDigits: 2}).format(duration)} ثانية`;
    clipList.querySelectorAll('[data-capture]').forEach(button => { button.disabled = false; });
  });

  preview.addEventListener('error', () => {
    if (sourceURL) mediaStatus.textContent = 'تعذّرت معاينة الملف. جرّب ملف MP4 بترميز متوافق مع متصفحك.';
  });

  window.addEventListener('pagehide', event => { if (!event.persisted) releaseSource(); });

  function updateCutLabels() {
    [...clipList.children].forEach((cut, index) => {
      cut.querySelector('legend').textContent = `المقطع ${new Intl.NumberFormat('ar-KW').format(index + 1)}`;
      cut.querySelector('[data-remove]').disabled = clipList.children.length === 1;
    });
  }

  function addCut({focus = true} = {}) {
    if (clipList.children.length >= 100) {
      toast('يدعم ملف AutoClip حتى مئة مقطع لكل مصدر.');
      return;
    }
    const id = ++nextCutId;
    const cut = document.createElement('fieldset');
    cut.className = 'production-cut';
    cut.innerHTML = `<legend></legend>
      <label for="production-cut-title-${id}">عنوان المقطع</label>
      <input id="production-cut-title-${id}" data-title maxlength="100" placeholder="اختياري">
      <div class="production-time-fields">
        <div><label for="production-cut-start-${id}">البداية</label><input id="production-cut-start-${id}" data-start dir="ltr" placeholder="00:00" aria-describedby="production-time-help"></div>
        <div><label for="production-cut-end-${id}">النهاية</label><input id="production-cut-end-${id}" data-end dir="ltr" placeholder="00:25" aria-describedby="production-time-help"></div>
      </div>
      <div class="actions">
        <button class="btn" type="button" data-capture="start">البداية من المشغّل</button>
        <button class="btn" type="button" data-capture="end">النهاية من المشغّل</button>
        <button class="btn" type="button" data-remove>إزالة المقطع</button>
      </div>`;
    cut.querySelectorAll('[data-capture]').forEach(button => {
      button.disabled = !source;
      button.addEventListener('click', () => {
        const input = button.dataset.capture === 'start' ? cut.querySelector('[data-start]') : cut.querySelector('[data-end]');
        input.value = preview.currentTime.toFixed(3);
        exportStatus.textContent = '';
      });
    });
    cut.querySelector('[data-remove]').addEventListener('click', () => {
      cut.remove();
      updateCutLabels();
      exportStatus.textContent = '';
      byId('production-add-cut').focus();
    });
    clipList.append(cut);
    updateCutLabels();
    exportStatus.textContent = '';
    if (focus) cut.querySelector('[data-title]').focus();
  }

  byId('production-add-cut').addEventListener('click', () => addCut());
  clipList.addEventListener('input', () => { exportStatus.textContent = ''; });
  exportButton.addEventListener('click', async () => {
    const selectedSource = source;
    if (!selectedSource) return;
    exportButton.disabled = true;
    exportStatus.textContent = '';
    try {
      const {parseProject, parseTime, validRange} = await import('../autoclip-studio/core.mjs');
      if (selectedSource !== source) return;
      const clips = [];
      for (const cut of clipList.children) {
        const startInput = cut.querySelector('[data-start]');
        const endInput = cut.querySelector('[data-end]');
        const start = parseTime(startInput.value);
        const end = parseTime(endInput.value);
        if (!validRange(start, end, selectedSource.duration)) {
          exportStatus.textContent = 'أدخل بداية ونهاية صحيحتين داخل مدّة الفيديو، بفاصل لا يقل عن عُشر ثانية.';
          (Number.isFinite(start) && start < selectedSource.duration ? endInput : startInput).focus();
          return;
        }
        if (end - start > 180) {
          exportStatus.textContent = 'صدّر كل مقطع في AutoClip بمدّة لا تتجاوز ثلاث دقائق. قصّر المقطع أو قسّمه.';
          endInput.focus();
          return;
        }
        clips.push({title: cut.querySelector('[data-title]').value.trim() || cut.querySelector('legend').textContent,
          start, end, ratio: '9:16'});
      }
      const format = {app: 'autoclip-studio', version: 1};
      const plan = parseProject({...format, source: selectedSource, clips});
      downloadJSON({...format, ...plan}, `tiktok-cuts-${today()}.json`);
      exportStatus.textContent = 'خطة القص جاهزة. افتحها في AutoClip مع الفيديو الأصلي.';
    } catch {
      if (source === selectedSource) exportStatus.textContent = 'تعذّر تجهيز الخطة. جرّب مجددًا أو افتح الفيديو مباشرة في AutoClip.';
    } finally {
      exportButton.disabled = !source;
    }
  });

  refreshVideoList();
  addCut({focus: false});
}

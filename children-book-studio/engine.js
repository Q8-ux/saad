(() => {
  'use strict';

  const API = 'https://openlibrary.org/search.json';
  const CACHE_KEY = 'hikayaResearchCache.v1';
  const GENERATED_KEY = 'hikayaGeneratedBook.v1';
  const CACHE_TTL = 30 * 60 * 1000;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nowArabic = () => new Intl.DateTimeFormat('ar-KW', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuwait'
  }).format(new Date());

  const focusQueries = {
    letters: 'preschool AND (alphabet OR phonics OR letters OR "early learning")',
    numbers: 'preschool AND (counting OR numbers OR math OR numeracy)',
    prewriting: 'preschool AND (tracing OR prewriting OR "fine motor" OR activity)',
    colors: 'preschool AND (colors OR shapes OR "activity book")',
    mixed: 'preschool AND ("early learning" OR activity OR alphabet OR counting OR tracing)'
  };

  const focusLabels = {
    letters: 'الحروف والأصوات', numbers: 'الأرقام والعد', prewriting: 'التهيئة للكتابة',
    colors: 'الألوان والأشكال', mixed: 'مهارات تعليمية متنوعة'
  };

  const marketLabels = {
    global: 'عالمي — كل اللغات',
    arabic: 'العربية — تغطية فهرسية محدودة',
    gulf: 'الخليج — عدسة تحريرية لا مرشحاً في الفهرس'
  };

  const modeDefaults = {
    letters: { title: 'رحلة الحروف المرحة', goal: 'تمييز أصوات الحروف وربطها بكلمات مصورة مألوفة' },
    numbers: { title: 'حديقة الأرقام الصغيرة', goal: 'العد من 1 إلى 5 وربط العدد بكمية واضحة' },
    prewriting: { title: 'لولو ترسم طريقها', goal: 'التحكم بالقلم وتتبع خطوط ومسارات متدرجة' },
    colors: { title: 'ألوان وأشكال حولنا', goal: 'تمييز الألوان والأشكال في مواقف يومية' },
    mixed: { title: 'مغامرة التعلّم الأولى', goal: 'الحروف والأرقام والألوان والتهيئة للكتابة' }
  };

  const themeRules = [
    ['الحروف والأصوات', /alphabet|letter|phonics|reading|arabic|أبجد|حروف|قراءة/i],
    ['الأرقام والعد', /count|number|math|arithmetic|عد|رقم|أرقام|حساب/i],
    ['الأنشطة والتلوين', /activity|coloring|sticker|puzzle|workbook|نشاط|تلوين|ألغاز/i],
    ['التهيئة للكتابة', /tracing|writing|fine motor|handwriting|prewriting|خط|كتابة|قلم/i],
    ['الألوان والأشكال', /color|shape|geometry|ألوان|أشكال/i],
    ['الحيوانات', /animal|pets|wildlife|حيوان|حيوانات/i],
    ['المشاعر والمهارات', /emotion|feeling|social|friendship|مشاعر|صداقة/i],
    ['الأسرة والحياة اليومية', /family|home|daily life|أسرة|عائلة|منزل/i],
    ['القصة المصوّرة', /picture book|stories|story|fiction|قصص|قصة/i]
  ];

  const lessons = {
    letters: [
      { symbol: 'أ', word: 'أرنب', object: 'rabbit', color: '#f4ad87' },
      { symbol: 'ب', word: 'بطة', object: 'duck', color: '#f2c84b' },
      { symbol: 'ت', word: 'تفاحة', object: 'apple', color: '#ed776d' },
      { symbol: 'ج', word: 'جمل', object: 'camel', color: '#d5a06d' },
      { symbol: 'م', word: 'موز', object: 'banana', color: '#f2cf52' }
    ],
    numbers: [1, 2, 3, 4, 5].map((number, index) => ({
      symbol: String(number), word: ['واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة'][index], object: 'stars', count: number,
      color: ['#e88d7a', '#77a6c6', '#7eb28f', '#d39ac6', '#e3b557'][index]
    })),
    colors: [
      { symbol: '●', word: 'أحمر', object: 'circle', color: '#e45d5d' },
      { symbol: '■', word: 'أزرق', object: 'square', color: '#4d91c8' },
      { symbol: '▲', word: 'أصفر', object: 'triangle', color: '#f2c84b' },
      { symbol: '★', word: 'أخضر', object: 'star', color: '#69a874' },
      { symbol: '♥', word: 'بنفسجي', object: 'heart', color: '#9b75bd' }
    ],
    prewriting: [
      { symbol: '—', word: 'خط مستقيم', object: 'trace-straight', color: '#e88d7a' },
      { symbol: '⌒', word: 'خط منحني', object: 'trace-curve', color: '#77a6c6' },
      { symbol: '〰', word: 'خط متموج', object: 'trace-wave', color: '#7eb28f' },
      { symbol: '○', word: 'دائرة كبيرة', object: 'trace-circle', color: '#d39ac6' },
      { symbol: '△', word: 'مثلث بسيط', object: 'trace-triangle', color: '#e3b557' }
    ]
  };

  let research = null;
  let generatedBook = null;
  let requestController = null;
  let lastRequestAt = 0;

  function parseCache() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeCache(key, value) {
    try {
      const cache = parseCache();
      cache[key] = { at: Date.now(), value };
      const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, 12);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* session storage is optional */ }
  }

  function cached(key) {
    const item = parseCache()[key];
    return item && Date.now() - item.at < CACHE_TTL ? item.value : null;
  }

  function setStatus(message, state = 'neutral') {
    const target = $('researchStatus');
    if (!target) return;
    target.textContent = message;
    target.dataset.state = state;
  }

  function setBusy(busy) {
    [$('runResearch'), $('runFullPipeline')].filter(Boolean).forEach((button) => {
      button.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
    });
  }

  function expandedQuery(raw, focus, market) {
    const term = raw.trim();
    const mapped = focusQueries[focus] || focusQueries.mixed;
    const base = term ? `(${term}) OR (${mapped})` : mapped;
    return market === 'arabic' ? `(${base}) language:ara` : base;
  }

  async function searchOpenLibrary(query, limit) {
    const fields = [
      'key', 'title', 'author_name', 'first_publish_year', 'publish_year', 'edition_count',
      'language', 'subject', 'cover_i', 'ratings_average', 'ratings_count', 'publisher'
    ].join(',');
    const params = new URLSearchParams({ q: query, fields, limit: String(limit), lang: 'ar' });
    const url = `${API}?${params}`;
    const cacheKey = `${query}|${limit}`;
    const hit = cached(cacheKey);
    if (hit) return { ...hit, cached: true, url };

    const wait = Math.max(0, 1050 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    requestController?.abort();
    requestController = new AbortController();
    const timeout = setTimeout(() => requestController.abort(), 12000);
    lastRequestAt = Date.now();
    try {
      const response = await fetch(url, {
        signal: requestController.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const value = {
        docs: Array.isArray(data.docs) ? data.docs : [],
        numFound: Number(data.numFound || data.num_found || 0),
        query, fetchedAt: new Date().toISOString()
      };
      writeCache(cacheKey, value);
      return { ...value, cached: false, url };
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeDoc(doc) {
    const years = Array.isArray(doc.publish_year) ? doc.publish_year.filter(Number.isFinite) : [];
    return {
      key: String(doc.key || ''),
      title: String(doc.title || 'عنوان غير متاح'),
      authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 3).map(String) : [],
      firstYear: Number(doc.first_publish_year || 0) || null,
      latestYear: years.length ? Math.max(...years) : Number(doc.first_publish_year || 0) || null,
      editions: Number(doc.edition_count || 0),
      languages: Array.isArray(doc.language) ? doc.language.map(String) : [],
      subjects: Array.isArray(doc.subject) ? doc.subject.slice(0, 80).map(String) : [],
      cover: Number(doc.cover_i || 0) || null,
      rating: Number(doc.ratings_average || 0) || null,
      ratingCount: Number(doc.ratings_count || 0),
      publishers: Array.isArray(doc.publisher) ? doc.publisher.slice(0, 3).map(String) : []
    };
  }

  async function runResearch({ produceAfter = false } = {}) {
    const raw = $('researchQuery')?.value || '';
    const focus = $('researchFocus')?.value || 'mixed';
    const age = $('researchAge')?.value || '3–6 سنوات';
    const market = $('researchMarket')?.value || 'global';
    const limit = Math.min(24, Math.max(8, Number($('researchLimit')?.value || 16)));
    const query = expandedQuery(raw, focus, market);
    setBusy(true);
    if ($('analysisStage')) $('analysisStage').hidden = true;
    if ($('researchMetrics')) $('researchMetrics').hidden = true;
    setStatus('جارٍ الاتصال بكتالوج Open Library وتحليل العينة…', 'loading');
    if ($('researchResults')) $('researchResults').innerHTML = '<div class="engine-loading"><i></i><span>يتم الآن جلب سجلات كتب حقيقية، ثم حساب الإشارات من العينة.</span></div>';
    try {
      const result = await searchOpenLibrary(query, limit);
      const docs = result.docs.map(normalizeDoc);
      research = { ...result, docs, raw, focus, age, market, limit, observedAt: nowArabic() };
      renderResearch();
      analyzeResearch();
      setStatus(`${result.cached ? 'نتيجة محفوظة مؤقتاً' : 'اكتمل البحث الحي'} · ${docs.length} سجلاً في العينة · ${research.observedAt}`, 'success');
      if (produceAfter && docs.length) {
        prefillProduction();
        produceBook();
        $('productionPreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (produceAfter) {
        setStatus('اكتمل البحث، لكن العينة فارغة؛ غيّر العبارة قبل إنتاج كتاب مبني على التحليل.', 'error');
      }
      return research;
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      setStatus(timedOut ? 'انتهت مهلة الاتصال. أعد المحاولة بعد لحظات.' : 'تعذر جلب البيانات الحية. تحقق من الاتصال ثم أعد المحاولة.', 'error');
      if ($('researchResults')) $('researchResults').innerHTML = `<div class="engine-error"><b>لم يكتمل البحث</b><span>${timedOut ? 'المصدر استغرق وقتاً أطول من المهلة.' : 'لم تصل استجابة صالحة من Open Library.'}</span><button class="button button-light" type="button" id="retryResearch">إعادة المحاولة</button></div>`;
      $('retryResearch')?.addEventListener('click', () => runResearch());
      return null;
    } finally {
      setBusy(false);
    }
  }

  function renderResearch() {
    const metrics = $('researchMetrics');
    const results = $('researchResults');
    if (!research || !metrics || !results) return;
    const covers = research.docs.filter((doc) => doc.cover).length;
    const arabic = research.docs.filter((doc) => doc.languages.includes('ara')).length;
    metrics.hidden = false;
    metrics.innerHTML = [
      ['مطابقات الفهرس', research.numFound.toLocaleString('ar-KW')],
      ['حجم العينة', research.docs.length.toLocaleString('ar-KW')],
      ['سجلات عربية', arabic.toLocaleString('ar-KW')],
      ['أغلفة متاحة', covers.toLocaleString('ar-KW')]
    ].map(([label, value]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('');

    if (!research.docs.length) {
      results.innerHTML = '<div class="engine-empty">لم تظهر سجلات بهذه الصياغة. اختصر العبارة أو اختر محوراً آخر ثم ابحث مجدداً.</div>';
      return;
    }
    results.innerHTML = research.docs.map((doc, index) => {
      const href = doc.key.startsWith('/') ? `https://openlibrary.org${doc.key}` : 'https://openlibrary.org';
      const cover = doc.cover
        ? `<img src="https://covers.openlibrary.org/b/id/${doc.cover}-M.jpg?default=false" loading="lazy" alt="غلاف ${esc(doc.title)}">`
        : '<span class="catalog-no-cover" aria-label="لا يوجد غلاف">▤</span>';
      return `<article class="catalog-card">
        <div class="catalog-cover">${cover}<span>${String(index + 1).padStart(2, '0')}</span></div>
        <div class="catalog-body"><h4>${esc(doc.title)}</h4>
          <p>${esc(doc.authors.join('، ') || 'المؤلف غير مدرج')}</p>
          <div class="catalog-meta"><span>${doc.latestYear || 'سنة غير متاحة'}</span><span>${doc.editions} طبعة/إصدار</span>${doc.languages.includes('ara') ? '<span>عربي</span>' : ''}</div>
          <a href="${esc(href)}" target="_blank" rel="noreferrer">فتح السجل المرجعي ↗</a>
        </div>
      </article>`;
    }).join('');
  }

  function median(values) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!sorted.length) return 0;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function analyzeResearch() {
    if (!research) return;
    const currentYear = new Date().getFullYear();
    const recent = research.docs.filter((doc) => doc.latestYear && doc.latestYear >= currentYear - 5).length;
    const arabic = research.docs.filter((doc) => doc.languages.includes('ara')).length;
    const editions = research.docs.map((doc) => doc.editions).filter((value) => value >= 0);
    const themeCounts = new Map(themeRules.map(([label]) => [label, 0]));
    research.docs.forEach((doc) => {
      const text = [doc.title, ...doc.subjects].join(' ');
      themeRules.forEach(([label, pattern]) => { if (pattern.test(text)) themeCounts.set(label, themeCounts.get(label) + 1); });
    });
    const themes = [...themeCounts.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]).slice(0, 7);
    research.analysis = { recent, arabic, medianEditions: median(editions), themes };

    const summary = $('analysisSummary');
    const themeBox = $('analysisThemes');
    const opportunities = $('analysisOpportunities');
    const stage = $('analysisStage');
    if (stage) stage.hidden = false;
    if (summary) summary.innerHTML = `
      <div class="analysis-stat"><strong>${research.docs.length}</strong><span>سجلاً تم تحليله</span></div>
      <div class="analysis-stat"><strong>${recent}</strong><span>سجلات لها إصدار خلال آخر 5 سنوات</span></div>
      <div class="analysis-stat"><strong>${Number(research.analysis.medianEditions.toFixed(1)).toLocaleString('ar-KW')}</strong><span>وسيط عدد الطبعات/الإصدارات</span></div>
      <div class="analysis-stat"><strong>${arabic}</strong><span>سجلات تذكر العربية ضمن اللغات</span></div>`;
    if (themeBox) {
      const max = Math.max(1, ...themes.map(([, count]) => count));
      themeBox.innerHTML = themes.length ? themes.map(([label, count]) => `
        <div class="theme-row"><span>${esc(label)}</span><div><i style="width:${Math.round(count / max * 100)}%"></i></div><b>${count}</b></div>`).join('')
        : '<p class="engine-empty">موضوعات السجلات لم تكن كافية لتصنيف موثوق.</p>';
    }

    const topTheme = themes[0]?.[0] || focusLabels[research.focus];
    const ideas = [
      { title: `${focusLabels[research.focus]} داخل قصة قصيرة`, text: `ادمج المهارة مع شخصية وموقف يومي، ثم نشاط من دقيقة واحدة. الموضوع الأكثر تكراراً في العينة: ${topTheme}.`, mode: research.focus, goal: modeDefaults[research.focus]?.goal },
      { title: 'نسخة عربية محلية أصلية', text: arabic < Math.max(2, research.docs.length * 0.2) ? 'التمثيل العربي قليل في هذه العينة؛ هذه فجوة تغطية في الكتالوج وليست دليلاً على الطلب التجاري.' : 'يوجد تمثيل عربي في العينة؛ التميّز يحتاج سياقاً محلياً ورسماً أصلياً لا ترجمة عنوان قائم.', mode: research.focus, goal: `تعليم ${focusLabels[research.focus]} في سياق عربي مألوف` },
      { title: 'تدرّج واحد بثلاث درجات عمرية', text: 'اجعل المهمة نفسها: إشارة لعمر 3–4، مطابقة لعمر 4–5، وتتبع أو تسمية لعمر 5–6.', mode: research.focus, goal: `تدريج ${focusLabels[research.focus]} للأعمار من 3 إلى 6 سنوات` }
    ];
    if (opportunities) {
      opportunities.innerHTML = ideas.map((idea, index) => `<article class="opportunity-card"><span>فرصة ${index + 1}</span><h4>${esc(idea.title)}</h4><p>${esc(idea.text)}</p><button class="button button-light" type="button" data-opportunity="${index}">اعتمادها للإنتاج</button></article>`).join('');
      opportunities.querySelectorAll('[data-opportunity]').forEach((button) => button.addEventListener('click', () => {
        const idea = ideas[Number(button.dataset.opportunity)];
        $('productionMode').value = ['letters', 'numbers', 'prewriting', 'colors', 'mixed'].includes(idea.mode) ? idea.mode : 'mixed';
        $('productionTitle').value = idea.title;
        $('productionGoal').value = idea.goal || idea.text;
        $('productionAge').value = research.age;
        $('productionTitle').focus();
        $('productionTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    }
    if ($('evidenceNote')) $('evidenceNote').innerHTML = `
      <b>حدود الدليل</b>
      <p>هذه لقطة من كتالوج Open Library بتاريخ ${esc(research.observedAt)} بعدسة: ${esc(marketLabels[research.market] || research.market)}. عدد المطابقات الفهرسية (${research.numFound.toLocaleString('ar-KW')}) ليس مبيعات ولا حجم طلب، وعدد الطبعات ليس ترتيب شعبية. العينة المستخدمة ${research.docs.length} سجلاً فقط، وقد تكون تغطية الكتب العربية ناقصة.</p>
      <a href="${esc(research.url)}" target="_blank" rel="noreferrer">فتح طلب المصدر المستخدم ↗</a>`;
  }

  function prefillProduction() {
    const focus = research?.focus || 'mixed';
    const defaults = modeDefaults[focus] || modeDefaults.mixed;
    if ($('productionMode')) $('productionMode').value = focus;
    if ($('productionTitle') && !$('productionTitle').value.trim()) $('productionTitle').value = defaults.title;
    if ($('productionGoal') && !$('productionGoal').value.trim()) $('productionGoal').value = defaults.goal;
    if ($('productionAge')) $('productionAge').value = research?.age || '3–6 سنوات';
  }

  function ageInstruction(age, lesson) {
    if (age.startsWith('3–4')) return `أشر إلى ${lesson.word} وقل الاسم ببطء.`;
    if (age.startsWith('4–5')) return `طابق ${lesson.word} مع الرمز ${lesson.symbol}.`;
    if (age.startsWith('5–6')) return `تتبّع الرمز ${lesson.symbol} ثم سمِّ ${lesson.word}.`;
    return `أشر، سمِّ، ثم تتبّع ${lesson.symbol} حسب قدرة الطفل.`;
  }

  function lessonText(mode, lesson, character, age) {
    if (mode === 'letters') return `${character} وجد ${lesson.word}. قال: أسمع صوت ${lesson.symbol} في أول الكلمة! ${ageInstruction(age, lesson)}`;
    if (mode === 'numbers') return `${character} عدّ ${lesson.symbol} من النجوم. العدد هو ${lesson.word}. المس كل نجمة وأنت تعد.`;
    if (mode === 'colors') return `${character} رأى شكلاً لونه ${lesson.word}. ابحث عن شيء باللون نفسه حولك.`;
    if (mode === 'prewriting') return `${character} يتبع ${lesson.word} بهدوء. ابدأ من النقطة، وتحرك حتى تصل إلى النجمة.`;
    return `${character} يتعلم ${lesson.word}. جرّب معه خطوة صغيرة ثم صف ما لاحظته.`;
  }

  function buildPages({ title, character, goal, mode, age, count, style }) {
    const selected = mode === 'mixed' ? [...lessons.letters.slice(0, 2), ...lessons.numbers.slice(0, 2), lessons.colors[0], lessons.prewriting[0]] : lessons[mode] || lessons.letters;
    const lessonSlots = Math.max(1, Math.min(selected.length, Math.floor((count - 4) / 2)));
    const pages = [
      { id: uid(), type: 'cover', label: title, text: `${title}\nكتاب تعليمي تفاعلي للأعمار ${age}`, visual: `غلاف أصلي: ${character} وسط عناصر تعليمية واضحة، أسلوب ${style}.` },
      { id: uid(), type: 'intro', label: 'لنبدأ', text: `مرحباً! أنا ${character}. سنلعب ونتعلّم معاً. هل أنت مستعد؟`, visual: `${character} يفتح حقيبة تعليمية في مساحة هادئة ومضيئة.` }
    ];
    selected.slice(0, lessonSlots).forEach((lesson, index) => {
      pages.push({
        id: uid(), type: 'lesson', label: `${lesson.symbol} · ${lesson.word}`, symbol: lesson.symbol, word: lesson.word,
        object: lesson.object, count: lesson.count, color: lesson.color, text: lessonText(mode === 'mixed' ? inferMode(lesson) : mode, lesson, character, age),
        activity: ageInstruction(age, lesson), visual: `${character} مع ${lesson.word}، رمز كبير ومساحة تدريب، ألوان قليلة وخلفية غير مزدحمة.`
      });
      pages.push({
        id: uid(), type: 'activity', label: `دوري الآن · ${lesson.symbol}`, symbol: lesson.symbol, word: lesson.word,
        object: lesson.object, count: lesson.count, color: lesson.color, text: `دورك الآن: ${ageInstruction(age, lesson)}`,
        activity: index % 2 ? 'لوّن العنصر ثم قل اسمه.' : 'تتبّع المسار بإصبعك أولاً ثم بالقلم.', visual: `صفحة نشاط أصلية كبيرة للرمز ${lesson.symbol}.`
      });
    });

    const fillers = [
      { type: 'review', label: 'مراجعة مرحة', text: `ساعد ${character}: أشر إلى ما تعلمته وقل اسمه. لا بأس أن تختار عنصراً واحداً فقط.`, visual: 'بطاقات مصورة من الدروس السابقة في شبكة واسعة.' },
      { type: 'activity', label: 'ابحث ولَوِّن', text: 'ابحث عن الرمز المختلف، ثم لوّن النجمة الكبيرة.', activity: 'مهمة ملاحظة قصيرة بلا شاشة.', visual: 'ثلاثة رموز كبيرة ونجمة للتلوين.' },
      { type: 'review', label: 'احكِ ما رأيت', text: `اسأل الطفل: ماذا أحب ${character}؟ وما الشيء الذي أحببته أنت؟`, visual: 'مشهد ختامي يعيد عناصر الدرس الرئيسية.' }
    ];
    let fillerIndex = 0;
    while (pages.length < count - 2) {
      const template = fillers[fillerIndex % fillers.length];
      pages.push({ id: uid(), ...template, color: ['#e88d7a', '#77a6c6', '#7eb28f'][fillerIndex % 3] });
      fillerIndex += 1;
    }
    pages.push({ id: uid(), type: 'guide', label: 'دليل الأسرة', text: `الهدف: ${goal}. لعمر 3–4: الإشارة والتسمية. لعمر 4–5: المطابقة والتصنيف. لعمر 5–6: التتبع والاستدعاء. توقفوا عندما يفقد الطفل اهتمامه، ولا تحولوا النشاط إلى اختبار.`, visual: 'إرشادات مختصرة للأهل بثلاث بطاقات عمرية.' });
    pages.push({ id: uid(), type: 'end', label: 'أحسنت!', text: `أكمل ${character} الرحلة. اختر صفحتك المفضلة وأعد اللعب بها غداً.`, visual: `${character} يلوّح وسط نجوم وشرائط ملونة.` });
    return pages.slice(0, count);
  }

  function inferMode(lesson) {
    if (/^\d+$/.test(lesson.symbol)) return 'numbers';
    if (lesson.object?.startsWith('trace-')) return 'prewriting';
    if (['circle', 'square', 'triangle', 'star', 'heart'].includes(lesson.object)) return 'colors';
    return 'letters';
  }

  function objectArt(page) {
    const color = esc(page.color || '#e88d7a');
    const count = Math.max(1, Math.min(5, Number(page.count || 1)));
    switch (page.object) {
      case 'rabbit': return `<g transform="translate(105 345)"><ellipse cx="160" cy="155" rx="112" ry="82" fill="#faf7ef" stroke="#785f55" stroke-width="8"/><ellipse cx="115" cy="45" rx="34" ry="91" fill="#faf7ef" stroke="#785f55" stroke-width="8" transform="rotate(-12 115 45)"/><ellipse cx="193" cy="45" rx="34" ry="91" fill="#faf7ef" stroke="#785f55" stroke-width="8" transform="rotate(12 193 45)"/><circle cx="128" cy="135" r="9" fill="#3d3937"/><circle cx="195" cy="135" r="9" fill="#3d3937"/><path d="M145 168 Q160 185 176 168" fill="none" stroke="#9c665c" stroke-width="7" stroke-linecap="round"/><circle cx="160" cy="158" r="9" fill="#e9a6a0"/></g>`;
      case 'duck': return `<g transform="translate(90 365)"><ellipse cx="175" cy="145" rx="125" ry="78" fill="#f4d55f" stroke="#8e7040" stroke-width="8"/><circle cx="260" cy="85" r="68" fill="#f4d55f" stroke="#8e7040" stroke-width="8"/><path d="M320 83l73 28-73 27z" fill="#ef9f4c" stroke="#9b6539" stroke-width="7"/><circle cx="278" cy="68" r="9" fill="#393735"/><path d="M82 193q95 65 186 0" fill="none" stroke="#6e9fba" stroke-width="14" stroke-linecap="round"/></g>`;
      case 'apple': return `<g transform="translate(125 350)"><path d="M139 46q17-46 56-54" fill="none" stroke="#6d8151" stroke-width="14" stroke-linecap="round"/><path d="M178 14q59-28 83 20-54 28-83-20" fill="#79a767"/><path d="M148 57C44 19 5 116 37 210c28 83 78 115 111 81 33 34 83 2 111-81 32-94-7-191-111-153z" fill="#e76561" stroke="#874e4b" stroke-width="9"/><circle cx="103" cy="124" r="13" fill="#f49a90" opacity=".7"/></g>`;
      case 'camel': return `<g transform="translate(62 362)" fill="#d8a36c" stroke="#795f48" stroke-width="8" stroke-linejoin="round"><path d="M58 225V109q0-46 45-46 41 0 52 50 12-78 77-78 60 0 84 72 22-44 69-24 35 15 35 63v79H58z"/><path d="M340 87q11-75 64-80 56-5 73 47l-22 171h-71l8-91"/><path d="M94 220v87M212 220v87M366 220v87M445 220v87"/><circle cx="438" cy="47" r="7" fill="#3b3632" stroke="none"/></g>`;
      case 'banana': return `<g transform="translate(80 350)"><path d="M50 80q108 179 308 69 70-40 97-116-56 241-272 246C82 281 21 197 50 80z" fill="#f2d257" stroke="#8b7540" stroke-width="9"/><path d="M44 78q-15-26 12-42" fill="none" stroke="#719056" stroke-width="15" stroke-linecap="round"/></g>`;
      case 'stars': return Array.from({ length: count }, (_, index) => {
        const x = 85 + (index % 3) * 145;
        const y = 395 + Math.floor(index / 3) * 135;
        return `<path d="M${x} ${y - 48}l14 30 33 4-24 23 6 33-29-16-29 16 6-33-24-23 33-4z" fill="${color}" stroke="#665b51" stroke-width="6"/>`;
      }).join('');
      case 'circle': return `<circle cx="260" cy="490" r="130" fill="${color}" stroke="#665b51" stroke-width="10"/>`;
      case 'square': return `<rect x="130" y="360" width="260" height="260" rx="20" fill="${color}" stroke="#665b51" stroke-width="10"/>`;
      case 'triangle': return `<path d="M260 330l155 290H105z" fill="${color}" stroke="#665b51" stroke-width="10" stroke-linejoin="round"/>`;
      case 'star': return `<path d="M260 325l45 95 105 14-77 73 19 104-92-50-92 50 19-104-77-73 105-14z" fill="${color}" stroke="#665b51" stroke-width="10"/>`;
      case 'heart': return `<path d="M260 610C75 505 88 348 187 348c47 0 69 29 73 55 4-26 26-55 73-55 99 0 112 157-73 262z" fill="${color}" stroke="#665b51" stroke-width="10"/>`;
      case 'trace-straight': return `<path d="M90 490H430" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="28 22" stroke-linecap="round"/>`;
      case 'trace-curve': return `<path d="M90 560Q260 280 430 560" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="28 22" stroke-linecap="round"/>`;
      case 'trace-wave': return `<path d="M70 500q95-150 190 0t190 0" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="28 22" stroke-linecap="round"/>`;
      case 'trace-circle': return `<circle cx="260" cy="490" r="150" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="28 22"/>`;
      case 'trace-triangle': return `<path d="M260 320L430 610H90z" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="28 22" stroke-linejoin="round"/>`;
      default: return `<g fill="${color}" opacity=".95"><circle cx="170" cy="460" r="80"/><rect x="270" y="385" width="160" height="160" rx="25"/></g>`;
    }
  }

  function characterArt(accent = '#587a9b') {
    return `<g transform="translate(555 350)">
      <ellipse cx="90" cy="288" rx="92" ry="28" fill="#43524d" opacity=".12"/>
      <path d="M25 272q10-130 65-151 55 21 66 151z" fill="${esc(accent)}"/>
      <circle cx="90" cy="83" r="66" fill="#c98764"/>
      <path d="M30 76Q38 5 91 5q63 0 67 76-32-25-65-16-34 9-63 11z" fill="#493d38"/>
      <circle cx="69" cy="84" r="6" fill="#35312f"/><circle cx="111" cy="84" r="6" fill="#35312f"/>
      <path d="M75 109q15 13 31 0" fill="none" stroke="#8f5347" stroke-width="5" stroke-linecap="round"/>
      <path d="M45 175l-44 62M136 175l50 53" fill="none" stroke="#c98764" stroke-width="21" stroke-linecap="round"/>
      <path d="M60 267l-11 65M120 267l13 65" fill="none" stroke="#564d48" stroke-width="22" stroke-linecap="round"/>
    </g>`;
  }

  function wrapSvgText(value, maxCharacters = 52, maxLines = 2) {
    const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxCharacters || !line) line = candidate;
      else { lines.push(line); line = word; }
      if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && line) lines.push(line);
    const used = lines.join(' ').length;
    if (used < String(value || '').replace(/\s+/g, ' ').trim().length && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/…$/, '')}…`;
    return lines.slice(0, maxLines);
  }

  function renderSvg(page, index, book) {
    const titleValue = String(page.label || book.title);
    const title = esc(titleValue);
    const textLines = wrapSvgText(String(page.text || '').split('\n').join(' '), 58, 2);
    const palettes = {
      garden: { backgrounds: ['#fff6e6', '#eef7f3', '#f3effa', '#eef5fb'], accents: ['#e88d7a', '#77a6c6', '#7eb28f', '#d39ac6'], sun: '#f3c962', hill1: '#bdddbf', hill2: '#8fbda0' },
      ocean: { backgrounds: ['#eef9fc', '#e7f4fa', '#f3f8fb', '#eaf6f5'], accents: ['#3c91b6', '#5eacd0', '#73b8a6', '#ed9d72'], sun: '#ffd56b', hill1: '#86c7d8', hill2: '#4ea0bb' },
      desert: { backgrounds: ['#fff4df', '#fbecd7', '#f6eadc', '#fff8eb'], accents: ['#bd7256', '#d49b5b', '#6f9c8d', '#9b7b66'], sun: '#e7ae55', hill1: '#e8c28d', hill2: '#cd9c68' },
      paper: { backgrounds: ['#fffdf7', '#f7f3ff', '#eef9f5', '#fff4f0'], accents: ['#e47768', '#668fc1', '#62a47b', '#aa7bb9'], sun: '#f4c64f', hill1: '#b8d8c0', hill2: '#7cb296' }
    };
    const palette = palettes[book.style] || palettes.garden;
    const accent = page.color || palette.accents[index % palette.accents.length];
    const bg = palette.backgrounds[index % palette.backgrounds.length];
    const decorative = `<circle cx="72" cy="74" r="34" fill="${palette.sun}" opacity=".85"/><path d="M0 690Q165 605 340 688T800 664V800H0z" fill="${palette.hill1}"/><path d="M0 728Q195 650 400 738T800 700V800H0z" fill="${palette.hill2}" opacity=".7"/>`;
    let middle = '';
    if (page.type === 'cover') {
      middle = `<g transform="translate(100 260)"><rect width="360" height="285" rx="45" fill="#fff" opacity=".78"/><text x="180" y="105" text-anchor="middle" font-family="Cairo,Arial" font-size="92" font-weight="800" fill="${esc(accent)}">أ ب ١</text><path d="M65 180q115-95 230 0" fill="none" stroke="#e2aa61" stroke-width="18" stroke-linecap="round"/><circle cx="90" cy="218" r="25" fill="#e88d7a"/><rect x="155" y="195" width="50" height="50" rx="10" fill="#77a6c6"/><path d="M270 190l30 55h-60z" fill="#7eb28f"/></g>${characterArt(accent)}`;
    } else if (page.type === 'guide') {
      middle = `<g transform="translate(80 300)">${['3–4', '4–5', '5–6'].map((age, i) => `<g transform="translate(${i * 225} 0)"><rect width="190" height="270" rx="30" fill="#fff" stroke="${['#e88d7a', '#77a6c6', '#7eb28f'][i]}" stroke-width="8"/><text x="95" y="85" text-anchor="middle" font-family="Cairo,Arial" font-size="42" font-weight="800" fill="#37444c">${age}</text><circle cx="95" cy="150" r="32" fill="${['#e88d7a', '#77a6c6', '#7eb28f'][i]}" opacity=".45"/><path d="M55 215h80" stroke="#8d938e" stroke-width="12" stroke-linecap="round"/></g>`).join('')}</g>`;
    } else if (page.type === 'end' || page.type === 'intro' || page.type === 'review') {
      middle = `${characterArt(accent)}<g transform="translate(75 350)"><path d="M110 0l25 55 60 8-44 42 11 60-52-29-52 29 11-60-44-42 60-8z" fill="#f1c552"/><circle cx="280" cy="105" r="72" fill="#e88d7a" opacity=".55"/><rect x="360" y="30" width="125" height="125" rx="28" fill="#77a6c6" opacity=".65"/></g>`;
    } else {
      middle = `${objectArt(page)}<g transform="translate(485 220)"><rect width="230" height="210" rx="40" fill="#fff" stroke="${esc(accent)}" stroke-width="8"/><text x="115" y="143" text-anchor="middle" font-family="Cairo,Arial" font-size="112" font-weight="800" fill="${esc(accent)}">${esc(page.symbol || '✦')}</text></g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${title}" direction="rtl">
      <rect width="800" height="800" fill="${bg}"/>${decorative}
      <rect x="45" y="38" width="710" height="150" rx="35" fill="#fff" opacity=".92"/>
      <text x="400" y="94" text-anchor="middle" font-family="Cairo,Arial" font-size="${titleValue.length > 30 ? 29 : 40}" font-weight="800" fill="#293942">${title}</text>
      <text text-anchor="middle" font-family="Cairo,Arial" font-size="17" font-weight="600" fill="#6f797a">${textLines.map((line, lineIndex) => `<tspan x="400" y="${132 + lineIndex * 27}">${esc(line)}</tspan>`).join('')}</text>
      ${middle}
      <text x="742" y="763" text-anchor="end" font-family="Cairo,Arial" font-size="18" font-weight="700" fill="#fff">${index + 1}</text>
    </svg>`;
  }

  function produceBook() {
    const title = $('productionTitle')?.value.trim() || modeDefaults.mixed.title;
    const character = $('productionCharacter')?.value.trim() || 'ليلى';
    const goal = $('productionGoal')?.value.trim() || modeDefaults.mixed.goal;
    const mode = $('productionMode')?.value || 'mixed';
    const age = $('productionAge')?.value || '3–6 سنوات';
    const count = Math.min(24, Math.max(12, Number($('productionPages')?.value || 16)));
    const style = $('productionStyle')?.value || 'رسوم متجهة دافئة وواضحة';
    const pages = buildPages({ title, character, goal, mode, age, count, style });
    generatedBook = {
      id: uid(), schema: 'hikaya.generated-book.v1', generatedAt: new Date().toISOString(),
      title, age, format: 'كتاب تعليمي تفاعلي', goal,
      premise: `${character} يقود الطفل في رحلة قصيرة لتعلّم ${focusLabels[mode] || focusLabels.mixed} بالمشاهدة والممارسة.`,
      language: 'العربية', trendNote: research ? `مبني على تحليل عينة من ${research.docs.length} سجلاً في Open Library بتاريخ ${research.observedAt}. هذه إشارات فهرسية وليست مبيعات.` : 'إنتاج محلي من دون ادعاء وجود اتجاه سوقي.',
      sourceResearch: research ? { query: research.query, numFound: research.numFound, sampleSize: research.docs.length, observedAt: research.observedAt, source: research.url } : null,
      characters: [{ name: character, appearance: 'طفل/طفلة بملامح ودودة وتعبير واضح', wardrobe: 'ألوان ثابتة وبسيطة', personality: 'فضولي ويشجع المحاولة', style }],
      activities: pages.filter((page) => page.activity).map((page) => ({ id: uid(), name: page.activity, type: 'نشاط مطبوع', url: '' })),
      checks: {}, print: { trimSize: '8.5x8.5', printColor: 'ملون', printDirection: 'من اليمين إلى اليسار', printPlatform: 'Amazon KDP' },
      pages: pages.map((page, index) => ({ ...page, svg: renderSvg(page, index, { title, character, style }) }))
    };
    try { localStorage.setItem(GENERATED_KEY, JSON.stringify(generatedBook)); } catch { /* download remains available */ }
    renderProducedBook();
  }

  function renderProducedBook() {
    const preview = $('productionPreview');
    const toolbar = $('productionToolbar');
    if (!preview || !generatedBook) return;
    if (toolbar) toolbar.hidden = false;
    preview.innerHTML = `<div class="produced-head"><div><span>نسخة منتجة فعلياً</span><h3>${esc(generatedBook.title)}</h3><p>${generatedBook.pages.length} صفحة · ${esc(generatedBook.age)} · رسوم SVG أصلية قابلة للطباعة</p></div><b>${generatedBook.pages.length}</b></div>
      <div class="produced-grid">${generatedBook.pages.map((page, index) => `<article class="produced-page" data-produced-page="${index}">
        <div class="produced-sheet">${page.svg}</div>
        <div class="produced-copy"><span>صفحة ${index + 1}</span><h4>${esc(page.label)}</h4><p>${esc(page.text)}</p>${page.activity ? `<small>النشاط: ${esc(page.activity)}</small>` : ''}
        <button class="text-button download-svg" type="button" data-svg="${index}">تنزيل SVG لهذه الصفحة</button></div>
      </article>`).join('')}</div>`;
    preview.querySelectorAll('[data-svg]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.svg);
      const page = generatedBook.pages[index];
      downloadBlob(new Blob([page.svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeName(generatedBook.title)}-${String(index + 1).padStart(2, '0')}.svg`);
    }));
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function standaloneHtml() {
    const pages = generatedBook.pages.map((page, index) => `<section class="book-page">${page.svg}<div class="page-copy"><b>${esc(page.label)}</b><p>${esc(page.text)}</p>${page.activity ? `<small>${esc(page.activity)}</small>` : ''}</div><i>${index + 1}</i></section>`).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(generatedBook.title)}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#eee;font-family:Arial,sans-serif;color:#293942}.book-page{position:relative;width:min(800px,100%);aspect-ratio:1;margin:24px auto;background:#fff;box-shadow:0 8px 30px #0002;overflow:hidden}.book-page svg{width:100%;height:100%;display:block}.page-copy{display:none}.book-page>i{display:none}@page{size:8.5in 8.5in;margin:0}@media print{body{background:#fff}.book-page{width:8.5in;height:8.5in;margin:0;box-shadow:none;break-after:page;page-break-after:always}}
    </style></head><body>${pages}</body></html>`;
  }

  function safeName(value) {
    return String(value || 'hikaya-book').normalize('NFKD').replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'hikaya-book';
  }

  function downloadBlob(blob, name) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function clearProducedBook() {
    generatedBook = null;
    try { localStorage.removeItem(GENERATED_KEY); } catch { /* optional */ }
    if ($('productionPreview')) $('productionPreview').innerHTML = '<div class="engine-empty">اضبط العنوان والمهارة ثم اضغط «إنتاج الكتاب».</div>';
    if ($('productionToolbar')) $('productionToolbar').hidden = true;
  }

  function restoreGenerated() {
    try {
      const restored = JSON.parse(localStorage.getItem(GENERATED_KEY) || 'null');
      if (restored?.pages?.length) {
        generatedBook = restored;
        renderProducedBook();
      }
    } catch { /* ignore invalid local draft */ }
  }

  function init() {
    if (!$('runResearch')) return;
    $('runResearch').addEventListener('click', () => runResearch());
    $('runFullPipeline')?.addEventListener('click', () => runResearch({ produceAfter: true }));
    $('produceBook')?.addEventListener('click', produceBook);
    $('clearProducedBook')?.addEventListener('click', clearProducedBook);
    $('downloadProducedJson')?.addEventListener('click', () => {
      if (!generatedBook) return;
      downloadBlob(new Blob([JSON.stringify(generatedBook, null, 2)], { type: 'application/json;charset=utf-8' }), `${safeName(generatedBook.title)}.json`);
    });
    $('downloadProducedHtml')?.addEventListener('click', () => {
      if (!generatedBook) return;
      downloadBlob(new Blob([standaloneHtml()], { type: 'text/html;charset=utf-8' }), `${safeName(generatedBook.title)}-print.html`);
    });
    $('printProducedBook')?.addEventListener('click', () => {
      if (!generatedBook) return;
      document.body.classList.add('print-produced');
      const cleanup = () => document.body.classList.remove('print-produced');
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(() => { window.print(); setTimeout(cleanup, 1500); }, 100);
    });
    $('openProducedInEditor')?.addEventListener('click', () => {
      if (!generatedBook) return;
      window.dispatchEvent(new CustomEvent('hikaya:generated-book', { detail: JSON.parse(JSON.stringify(generatedBook)) }));
    });
    $('researchFocus')?.addEventListener('change', () => {
      const focus = $('researchFocus').value;
      const defaults = modeDefaults[focus] || modeDefaults.mixed;
      if ($('productionMode')) $('productionMode').value = focus;
      if ($('productionTitle') && !$('productionTitle').value.trim()) $('productionTitle').value = defaults.title;
      if ($('productionGoal') && !$('productionGoal').value.trim()) $('productionGoal').value = defaults.goal;
    });
    restoreGenerated();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

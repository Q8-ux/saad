'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const stage = $('stage'), poster = $('poster'), video = $('film-video'), mount = $('embed-mount');
  const status = $('player-status'), help = $('source-help'), loading = $('player-loading');
  const film = $('film-source'), trailer = $('trailer-source'), reset = $('reset-player'), full = $('fullscreen');
  const fileInput = $('local-film'), config = JSON.parse($('film-media-config').textContent);
  let source = null, localUrl = null, timer = null;
  function clearPlayback() {
    clearTimeout(timer); video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    mount.replaceChildren(); mount.hidden = true; loading.hidden = true;
    if (localUrl) { URL.revokeObjectURL(localUrl); localUrl = null; }
  }
  function prepare(kind) {
    clearPlayback(); source = kind; poster.hidden = true; reset.hidden = false;
    stage.classList.add('has-playback'); stage.classList.remove('is-telegram');
    film.classList.toggle('selected', kind !== 'trailer'); trailer.classList.toggle('selected', kind === 'trailer');
    film.setAttribute('aria-pressed', String(kind !== 'trailer')); trailer.setAttribute('aria-pressed', String(kind === 'trailer'));
    help.hidden = kind === 'trailer';
  }
  async function nativePlay(url, local = false) {
    prepare(local ? 'local' : 'film'); if (local) localUrl = url;
    video.hidden = false; video.src = url; loading.hidden = false;
    status.textContent = local ? 'جارٍ فتح ملف الفيلم من جهازك. الملف لا يُنشر للزوار.' : 'جارٍ فتح الفيلم داخل الصفحة…';
    try { await video.play(); }
    catch (error) {
      loading.hidden = true;
      if (error.name === 'NotAllowedError') status.textContent = 'الفيلم جاهز داخل المشغّل. اضغط تشغيل في أدوات الفيديو.';
      else if (error.name !== 'AbortError') status.textContent = 'تعذر تشغيل هذا المصدر. جرّب ملف MP4 متوافقًا أو مصدر فيديو آخر.';
    }
  }
  function framePlay(kind) {
    prepare(kind);
    const frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    // Media stays within this frame; providers cannot open a new tab or navigate the page.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    if (kind === 'trailer') {
      frame.src = 'https://www.youtube-nocookie.com/embed/YsSzNOpr9cE?autoplay=1&playsinline=1&rel=0';
      frame.title = 'الإعلان الرسمي — Unknown: Killer Robots — Netflix';
      status.textContent = 'المعروض الآن هو الإعلان الرسمي، وليس الفيلم الكامل.';
    } else {
      frame.src = 'https://t.me/' + config.post + '?embed=1&mode=tme&userpic=false&dark=1';
      frame.title = 'منشور الفيلم Unknown Killer Robots من قناة Moviive على تيليغرام';
      stage.classList.add('is-telegram');
      status.textContent = 'عرض منشور الفيلم داخل الصفحة. لم يتأكد تشغيل الفيلم الكامل من هذا المصدر.';
    }
    loading.hidden = false; mount.hidden = false;
    frame.addEventListener('load', () => { loading.hidden = true; }, {once:true});
    frame.addEventListener('error', () => { loading.hidden = true; status.textContent = 'تعذر تحميل العرض من المصدر. يمكنك اختيار ملف الفيلم وتشغيله هنا.'; }, {once:true});
    mount.append(frame);
    timer = setTimeout(() => { loading.hidden = true; if (source === 'film') help.hidden = false; }, 10000);
  }
  function watch() {
    if ((source === 'local' || config.kind === 'video') && video.src && !video.hidden) { video.play().catch(() => { status.textContent = 'اضغط تشغيل في أدوات الفيديو للمتابعة.'; }); return; }
    if (config.kind === 'video' && config.url) {
      try {
        const url = new URL(config.url, location.href);
        if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error('Unsupported URL');
        nativePlay(url.href);
      } catch { status.textContent = 'مصدر الفيديو غير صالح. اختر ملف الفيلم لتشغيله هنا.'; help.hidden = false; }
    } else framePlay('film');
  }
  document.querySelectorAll('[data-watch]').forEach(button => button.addEventListener('click', () => {
    watch();
    if (button.classList.contains('header-watch')) stage.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }));
  document.querySelectorAll('[data-trailer]').forEach(button => button.addEventListener('click', () => framePlay('trailer')));
  film.addEventListener('click', watch); trailer.addEventListener('click', () => framePlay('trailer'));
  reset.addEventListener('click', () => {
    clearPlayback(); source = null; poster.hidden = false; help.hidden = true; reset.hidden = true;
    stage.classList.remove('has-playback','is-telegram'); film.classList.add('selected'); trailer.classList.remove('selected');
    film.setAttribute('aria-pressed','true'); trailer.setAttribute('aria-pressed','false');
    status.textContent = 'العرض يفتح هنا داخل الصفحة. تشغيل الفيلم الكامل يعتمد على إتاحة الفيديو من المصدر.';
    $('play-film').focus({preventScroll:true});
  });
  $('choose-local-film').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]; if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|m4v|mov)$/i.test(file.name)) { status.textContent = 'اختر ملف فيديو مثل MP4.'; return; }
    nativePlay(URL.createObjectURL(file), true); fileInput.value = '';
  });
  video.addEventListener('playing', () => { loading.hidden = true; help.hidden = true; status.textContent = source === 'local' ? 'يعمل الفيديو من جهازك داخل الصفحة. هذه النسخة محلية ولا تُنشر للزوار.' : 'يعمل الفيلم داخل الصفحة.'; });
  video.addEventListener('loadedmetadata', () => { loading.hidden = true; });
  video.addEventListener('waiting', () => { if (source === 'local' || config.kind === 'video') loading.hidden = false; });
  video.addEventListener('error', () => { if (video.getAttribute('src')) { loading.hidden = true; help.hidden = false; status.textContent = 'هذا الملف أو المصدر لم يُشغّل. اختر نسخة MP4 يدعمها المتصفح.'; } });
  if (!stage.requestFullscreen) full.hidden = true;
  full.addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); }
    catch { status.textContent = 'ملء الشاشة غير متاح حاليًا. استخدم أداة ملء الشاشة داخل الفيديو إذا ظهرت.'; }
  });
  addEventListener('pagehide', clearPlayback);
  document.querySelectorAll('.topic-toggle').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded',String(!open)); $(button.getAttribute('aria-controls')).hidden = open;
  }));
  const links = [...document.querySelectorAll('.section-navigation a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  let scheduled = false;
  function updateNav() {
    let current = sections[0]; sections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section; });
    links.forEach(link => { const active = link.getAttribute('href') === '#' + current.id; link.classList.toggle('active',active); if (active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateNav); } }, {passive:true});
  addEventListener('resize',updateNav); updateNav();
})();

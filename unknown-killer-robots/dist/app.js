'use strict';
(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const $ = id => document.getElementById(id);
  const stage = $('stage'), poster = $('poster'), video = $('film-video'), mount = $('embed-mount');
  const status = $('player-status'), loading = $('player-loading');
  const film = $('play-film'), trailer = $('trailer-source'), reset = $('reset-player'), full = $('fullscreen');
  const config = JSON.parse($('film-media-config').textContent);
  const controls = $('native-controls'), seek = $('native-seek'), play = $('native-play'), mute = $('native-mute'), pending = $('pending-screen');
  let source = null, timer = null;
  function clearPlayback() {
    clearTimeout(timer); controls.hidden = true; pending.hidden = true; seek.value = '0'; seek.disabled = true;
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    mount.replaceChildren(); mount.hidden = true; loading.hidden = true;
  }
  function prepare(kind) {
    clearPlayback(); source = kind; poster.hidden = true; reset.hidden = false;
    stage.classList.add('has-playback');
    film.classList.toggle('selected', kind !== 'trailer'); trailer.classList.toggle('selected', kind === 'trailer');
    film.setAttribute('aria-pressed', String(kind !== 'trailer')); trailer.setAttribute('aria-pressed', String(kind === 'trailer'));
  }
  function resetView(focus = false) {
    clearPlayback(); source = null; poster.hidden = false; reset.hidden = true;
    stage.classList.remove('has-playback'); film.classList.add('selected'); trailer.classList.remove('selected');
    film.setAttribute('aria-pressed','true'); trailer.setAttribute('aria-pressed','false');
    status.textContent = config.kind === 'video' && config.url ? 'شاهد الفيلم داخل التطبيق.' : 'نسخة الفيلم قيد التجهيز للعرض داخل التطبيق.';
    if (focus) (film.disabled ? $('film-title') : film).focus({preventScroll:true});
  }
  async function nativePlay(url) {
    prepare('film'); video.hidden = false; controls.hidden = false; video.src = url; loading.hidden = false;
    status.textContent = 'جارٍ فتح الفيلم داخل الصفحة…';
    try { await video.play(); }
    catch (error) {
      loading.hidden = true;
      if (error.name === 'NotAllowedError') status.textContent = 'الفيلم جاهز داخل المشغّل. اضغط تشغيل في أدوات الفيديو.';
      else if (error.name !== 'AbortError') status.textContent = 'تعذر تشغيل الفيلم حاليًا. حاول مرة أخرى لاحقًا.';
    }
  }
  function trailerPlay() {
    prepare('trailer');
    const frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media; fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    frame.src = 'https://www.youtube-nocookie.com/embed/YsSzNOpr9cE?autoplay=1&playsinline=1&rel=0';
    frame.title = 'الإعلان الرسمي — Unknown: Killer Robots';
    status.textContent = 'المعروض الآن هو الإعلان الرسمي، وليس الفيلم الكامل.';
    loading.hidden = false; mount.hidden = false;
    frame.addEventListener('load', () => { loading.hidden = true; }, {once:true});
    frame.addEventListener('error', () => { loading.hidden = true; status.textContent = 'تعذر تحميل الإعلان الرسمي حاليًا.'; }, {once:true});
    mount.append(frame); timer = setTimeout(() => { loading.hidden = true; }, 10000);
  }
  function watch() {
    if (source === 'film' && video.src && !video.hidden) {
      video.play().catch(() => { status.textContent = 'اضغط تشغيل في أدوات الفيديو للمتابعة.'; }); return;
    }
    if (config.kind === 'video' && config.url) {
      try {
        const url = new URL(config.url, location.href);
        if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error('Unsupported URL');
        nativePlay(url.href);
      } catch { status.textContent = 'الفيلم غير متاح حاليًا. حاول مرة أخرى لاحقًا.'; }
    } else {
      prepare('film'); loading.hidden = true; pending.hidden = false;
      status.textContent = 'الفيلم قيد التجهيز للعرض داخل الصفحة.';
    }
  }
  document.querySelectorAll('[data-watch]').forEach(button => button.addEventListener('click', watch));
  document.querySelectorAll('[data-trailer]').forEach(button => button.addEventListener('click', trailerPlay));
  if (config.kind !== 'video' || !config.url) {
    document.querySelectorAll('[data-watch]').forEach(button => { button.disabled = true; button.setAttribute('aria-label','الفيلم قيد التجهيز'); });
    $('film-action-label').textContent = 'قيد التجهيز';
  }
  reset.addEventListener('click', () => resetView(true));
  video.addEventListener('playing', () => { loading.hidden = true; status.textContent = 'يعمل الفيلم داخل الصفحة.'; });
  video.addEventListener('loadedmetadata', () => { loading.hidden = true; });
  video.addEventListener('waiting', () => { if (source === 'film' && !video.hidden) loading.hidden = false; });
  video.addEventListener('error', () => { if (video.getAttribute('src')) { loading.hidden = true; status.textContent = 'تعذر تشغيل الفيلم حاليًا. حاول مرة أخرى لاحقًا.'; } });
  if (!stage.requestFullscreen) { full.hidden = true; $('native-full').hidden = true; }
  full.addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); }
    catch { status.textContent = 'ملء الشاشة غير متاح في هذا المتصفح.'; }
  });
  function time(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00';
    const n = Math.floor(value), h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, sec = n % 60;
    return (h ? String(h).padStart(2,'0') + ':' : '') + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  }
  function updateControls() {
    $('native-play-text').textContent = video.paused ? 'تشغيل' : 'إيقاف';
    play.setAttribute('aria-label',video.paused ? 'تشغيل الفيديو' : 'إيقاف مؤقت');
    const finite = Number.isFinite(video.duration) && video.duration > 0;
    seek.disabled = !finite;
    if (finite) seek.value = String(Math.round(video.currentTime / video.duration * 1000));
    seek.setAttribute('aria-valuetext',time(video.currentTime));
    $('native-time').textContent = time(video.currentTime) + ' / ' + time(video.duration);
    mute.textContent = video.muted ? 'صامت' : 'الصوت';
    mute.setAttribute('aria-label', video.muted ? 'إعادة الصوت' : 'كتم الصوت');
  }
  play.addEventListener('click', () => { if (video.paused) video.play().catch(() => { status.textContent = 'تعذر متابعة التشغيل.'; }); else video.pause(); });
  seek.addEventListener('input', () => { if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value) / 1000 * video.duration; });
  mute.addEventListener('click', () => { video.muted = !video.muted; });
  $('native-full').addEventListener('click', () => full.click());
  video.addEventListener('contextmenu', event => event.preventDefault());
  for (const event of ['play','pause','ended','timeupdate','loadedmetadata','volumechange','emptied']) video.addEventListener(event, updateControls);
  updateControls(); addEventListener('pagehide', clearPlayback);
  document.querySelectorAll('.topic-toggle').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded',String(!open)); $(button.getAttribute('aria-controls')).hidden = open;
  }));

  const routes = {film:'watch',about:'details',notes:'details',topics:'topics',questions:'questions'};
  const screens = [...document.querySelectorAll('[data-screen]')];
  const navLinks = [...document.querySelectorAll('.app-nav a')];
  const headingIds = {watch:'film-title',details:'about-title',topics:'topics-title',questions:'questions-title'};
  function showScreen(fragment, focus = false) {
    const screen = routes[fragment] || 'watch';
    if (screen !== 'watch') { video.pause(); if (source === 'trailer') resetView(); }
    screens.forEach(section => { section.hidden = section.dataset.screen !== screen; });
    navLinks.forEach(link => {
      const active = routes[link.hash.slice(1)] === screen;
      link.classList.toggle('active',active);
      if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    document.documentElement.classList.add('app-ready');
    window.scrollTo({top:0,behavior:'instant'});
    if (focus) $(headingIds[screen]).focus({preventScroll:true});
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (!routes[link.hash.slice(1)]) return;
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null,'',link.hash);
      showScreen(link.hash.slice(1), true);
    });
  });
  addEventListener('popstate', () => showScreen(location.hash.slice(1)));
  addEventListener('hashchange', () => showScreen(location.hash.slice(1)));
  showScreen(location.hash.slice(1));

  const installButton = $('install-app'), guide = $('install-guide');
  let installPrompt = null;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  installButton.hidden = installed();
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installButton.hidden = installed(); });
  addEventListener('appinstalled', () => { installPrompt = null; installButton.hidden = true; if (guide.open) guide.close(); });
  installButton.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch { if (!guide.open) guide.showModal(); }
    } else if (!guide.open) guide.showModal();
  });
  $('close-install').addEventListener('click', () => guide.close());
  $('done-install').addEventListener('click', () => guide.close());
  guide.addEventListener('click', event => { if (event.target === guide) { const r = guide.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) guide.close(); } });
  function updateConnection() { $('connection-state').hidden = navigator.onLine; }
  addEventListener('online',updateConnection); addEventListener('offline',updateConnection); updateConnection();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).catch(() => { /* The app remains usable without offline support. */ });
  }
})();

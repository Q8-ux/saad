'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const stage = $('stage'), poster = $('poster'), video = $('film-video'), mount = $('embed-mount');
  const status = $('player-status'), loading = $('player-loading');
  const film = $('film-source'), trailer = $('trailer-source'), reset = $('reset-player'), full = $('fullscreen');
  const config = JSON.parse($('film-media-config').textContent);
  let source = null, timer = null;
  const controls = $('native-controls'), seek = $('native-seek'), play = $('native-play'), mute = $('native-mute'), pending = $('pending-screen');
  function clearPlayback() {
    clearTimeout(timer); controls.hidden = true; pending.hidden = true; seek.value = '0'; seek.disabled = true; video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    mount.replaceChildren(); mount.hidden = true; loading.hidden = true;
  }
  function prepare(kind) {
    clearPlayback(); source = kind; poster.hidden = true; reset.hidden = false;
    stage.classList.add('has-playback');
    film.classList.toggle('selected', kind !== 'trailer'); trailer.classList.toggle('selected', kind === 'trailer');
    film.setAttribute('aria-pressed', String(kind !== 'trailer')); trailer.setAttribute('aria-pressed', String(kind === 'trailer'));
  }
  async function nativePlay(url) {
    prepare('film');
    video.hidden = false; controls.hidden = false; video.src = url; loading.hidden = false;
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
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    // Media stays within this frame; providers cannot open a new tab or navigate the page.
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
    frame.src = 'https://www.youtube-nocookie.com/embed/YsSzNOpr9cE?autoplay=1&playsinline=1&rel=0';
    frame.title = 'الإعلان الرسمي — Unknown: Killer Robots — Netflix';
    status.textContent = 'المعروض الآن هو الإعلان الرسمي، وليس الفيلم الكامل.';
    loading.hidden = false; mount.hidden = false;
    frame.addEventListener('load', () => { loading.hidden = true; }, {once:true});
    frame.addEventListener('error', () => { loading.hidden = true; status.textContent = 'تعذر تحميل الإعلان الرسمي حاليًا.'; }, {once:true});
    mount.append(frame);
    timer = setTimeout(() => { loading.hidden = true; }, 10000);
  }
  function watch() {
    if (source === 'film' && video.src && !video.hidden) { video.play().catch(() => { status.textContent = 'اضغط تشغيل في أدوات الفيديو للمتابعة.'; }); return; }
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
  document.querySelectorAll('[data-watch]').forEach(button => button.addEventListener('click', () => {
    watch();
    if (button.classList.contains('header-watch')) stage.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }));
  document.querySelectorAll('[data-trailer]').forEach(button => button.addEventListener('click', trailerPlay));
  film.addEventListener('click', watch); trailer.addEventListener('click', trailerPlay);
  reset.addEventListener('click', () => {
    clearPlayback(); source = null; poster.hidden = false; reset.hidden = true;
    stage.classList.remove('has-playback'); film.classList.add('selected'); trailer.classList.remove('selected');
    film.setAttribute('aria-pressed','true'); trailer.setAttribute('aria-pressed','false');
    status.textContent = 'مشغّل الفيلم داخل الصفحة. نسخة العرض قيد التجهيز.';
    $('play-film').focus({preventScroll:true});
  });
  video.addEventListener('playing', () => { loading.hidden = true; status.textContent = 'يعمل الفيلم داخل الصفحة.'; });
  video.addEventListener('loadedmetadata', () => { loading.hidden = true; });
  video.addEventListener('waiting', () => { if (source === 'film' && !video.hidden) loading.hidden = false; });
  video.addEventListener('error', () => { if (video.getAttribute('src')) { loading.hidden = true; status.textContent = 'تعذر تشغيل الفيلم حاليًا. حاول مرة أخرى لاحقًا.'; } });
  if (!stage.requestFullscreen) { full.hidden = true; $('native-full').hidden = true; }
  full.addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.requestFullscreen(); }
    catch { status.textContent = 'ملء الشاشة غير متاح حاليًا. استخدم أداة ملء الشاشة داخل الفيديو إذا ظهرت.'; }
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
  updateControls();
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

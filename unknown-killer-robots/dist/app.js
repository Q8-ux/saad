'use strict';
(() => {
  const stage = document.getElementById('stage');
  const poster = document.getElementById('poster');
  const mount = document.getElementById('embed-mount');
  const status = document.getElementById('player-status');
  const filmButton = document.getElementById('film-source');
  const trailerButton = document.getElementById('trailer-source');
  const fullscreenButton = document.getElementById('fullscreen');
  let source = null;
  let observer = null;
  let helpTimer = null;

  function statusWithLink(text, label, url) {
    status.replaceChildren(document.createTextNode(text + ' '));
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label.replace(/\s*↗$/u, '');
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [name, value] of Object.entries({class: 'external-arrow', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'aria-hidden': 'true'})) arrow.setAttribute(name, value);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 18 18 6M6 6h12v12');
    arrow.append(path);
    link.append(document.createTextNode(' '), arrow);
    status.append(link);
  }

  function selectSource(kind) {
    if (kind === source) return;
    source = kind;
    observer?.disconnect();
    clearTimeout(helpTimer);
    mount.replaceChildren();
    poster.hidden = true;
    mount.hidden = false;
    stage.classList.add('is-active');
    stage.classList.toggle('is-trailer', kind === 'trailer');
    filmButton.classList.toggle('selected', kind === 'film');
    trailerButton.classList.toggle('selected', kind === 'trailer');
    filmButton.setAttribute('aria-pressed', String(kind === 'film'));
    trailerButton.setAttribute('aria-pressed', String(kind === 'trailer'));

    if (kind === 'trailer') {
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/YsSzNOpr9cE?autoplay=1&playsinline=1&rel=0';
      frame.title = 'الإعلان الرسمي — Unknown: Killer Robots — Netflix';
      frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      mount.append(frame);
      statusWithLink('المعروض الآن هو الإعلان الرسمي، وليس الفيلم الكامل.', 'فتح الإعلان على YouTube ↗', 'https://www.youtube.com/watch?v=YsSzNOpr9cE');
      return;
    }

    const message = document.createElement('p');
    message.className = 'embed-message';
    message.textContent = 'جارٍ طلب عرض منشور الفيلم من تيليغرام…';
    mount.append(message);
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.dataset.telegramPost = 'Moviive/2';
    script.dataset.width = '100%';
    script.dataset.userpic = 'false';
    script.dataset.dark = '1';
    script.dataset.color = 'FF675B';
    script.dataset.darkColor = 'FF675B';
    observer = new MutationObserver(() => {
      const frame = mount.querySelector('iframe');
      if (!frame) return;
      frame.title = 'منشور الفيلم Unknown Killer Robots من قناة Moviive على تيليغرام';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      message.remove();
      observer.disconnect();
    });
    observer.observe(mount, { childList: true, subtree: true });
    script.onerror = () => {
      observer.disconnect();
      message.textContent = 'تعذر تحميل عرض تيليغرام في هذا المتصفح. يمكنك فتح منشور الفيلم من الرابط أدناه.';
    };
    mount.append(script);
    statusWithLink('اختر تشغيل الفيديو من منشور تيليغرام. إتاحة العرض داخل الصفحة تعتمد على مصدر الفيلم.', 'فتح المنشور مباشرة ↗', 'https://t.me/Moviive/2');
    helpTimer = setTimeout(() => {
      if (source === 'film' && !mount.querySelector('iframe')) {
        message.textContent = 'لم يظهر تضمين تيليغرام. افتح منشور الفيلم مباشرة من الرابط أدناه، أو شاهد الإعلان الرسمي.';
      }
    }, 12000);
  }

  document.getElementById('play-film').addEventListener('click', () => selectSource('film'));
  filmButton.addEventListener('click', () => selectSource('film'));
  trailerButton.addEventListener('click', () => selectSource('trailer'));
  if (!stage.requestFullscreen) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage.requestFullscreen();
    } catch {
      status.textContent = 'هذا المتصفح لا يتيح ملء الشاشة حاليًا. يمكنك استخدام زر ملء الشاشة داخل مشغّل الفيديو إذا ظهر.';
    }
  });
})();

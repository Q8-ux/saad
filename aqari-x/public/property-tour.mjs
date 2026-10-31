import {escapeHTML as esc} from './core.mjs?v=1.4.0';
import {propertyTour, tourFrameURL} from './virtual-tour-data.mjs?v=1.5.0';
import {tourText} from './tour-copy.mjs?v=1.5.1';
import {getLocale} from './i18n.mjs?v=1.4.0';

export function tourHTML(property, {sample = false} = {}) {
  const tour = propertyTour(property);
  if (!tour) return '';
  return `<section class="property-tour" ${sample?'data-tour-sample':''} data-i18n-skip aria-label="${esc(tourText('title'))}"><div class="tour-heading"><span class="tour-mark" aria-hidden="true">3D</span><div><h3>${esc(tour.title || tourText('title'))}</h3><p>${esc(tourText(sample?'sampleTag':'intro'))}</p></div></div><div class="tour-actions"><button class="btn primary" type="button" data-tour-start>${esc(tourText(sample?'sampleView':'start'))}</button><button class="btn secondary" type="button" data-tour-stop hidden>${esc(tourText(sample?'sampleStop':'stop'))}</button><button class="btn secondary small" type="button" data-tour-fullscreen hidden>${esc(tourText('fullscreen'))}</button></div><div class="tour-viewport" hidden></div><p class="tour-status hint" role="status" hidden></p><p class="tour-fallback fineprint" hidden>${esc(tourText(sample?'sampleFallback':'fallback'))}</p><p class="fineprint">${esc(tourText(sample?'sampleNote':'note'))}</p></section>`;
}

export function mountTour(root, property) {
  const panel = root.querySelector('.property-tour');
  const tour = propertyTour(property);
  if (!panel || !tour) return () => {};
  const start = panel.querySelector('[data-tour-start]');
  const stop = panel.querySelector('[data-tour-stop]');
  const fullscreen = panel.querySelector('[data-tour-fullscreen]');
  const viewport = panel.querySelector('.tour-viewport');
  const status = panel.querySelector('.tour-status');
  const fallback = panel.querySelector('.tour-fallback');
  const fallbackKey = panel.hasAttribute('data-tour-sample') ? 'sampleFallback' : 'fallback';
  const listeners = new AbortController();
  let frame, alive = true;
  const reset = (focus = false) => {
    frame?.remove(); frame = null;
    viewport.hidden = true;
    stop.hidden = fullscreen.hidden = status.hidden = fallback.hidden = true;
    start.hidden = false;
    if (focus && alive) start.focus();
  };
  start.addEventListener('click', () => {
    if (!alive || frame) return;
    frame = document.createElement('iframe');
    frame.title = tour.title || tourText('title');
    frame.allow = 'fullscreen; xr-spatial-tracking';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
    frame.addEventListener('load', () => { if (alive && frame) status.textContent = tourText('help'); }, {once: true});
    const source = new URL(tourFrameURL(tour, import.meta.url));
    if(tour.kind==='model')source.searchParams.set('lang',getLocale());
    frame.src = source.href;
    viewport.append(frame);
    viewport.hidden = false;
    start.hidden = true;
    stop.hidden = status.hidden = fallback.hidden = false;
    fullscreen.hidden = !document.fullscreenEnabled;
    status.textContent = tourText('loading');
    stop.focus({preventScroll: true});
  }, {signal: listeners.signal});
  stop.addEventListener('click', () => reset(true), {signal: listeners.signal});
  window.addEventListener('message',event=>{
    if(tour.kind!=='model'||!frame||event.source!==frame.contentWindow||event.origin!==new URL(frame.src).origin||event.data?.type!=='aqari:tour-state')return;
    status.textContent=tourText(event.data.state==='ready'?'help':fallbackKey);
  },{signal:listeners.signal});
  fullscreen.addEventListener('click', async () => {
    try { await (viewport.requestFullscreen?.() || frame?.requestFullscreen?.()); }
    catch { status.textContent = tourText(fallbackKey); }
  }, {signal: listeners.signal});
  const cleanup = () => {
    if (!alive) return;
    alive = false; reset(); listeners.abort();
  };
  root.addEventListener('aqari:dialog-replace', cleanup, {signal: listeners.signal});
  root.addEventListener('close', () => { if (!root.open) cleanup(); }, {signal: listeners.signal});
  return cleanup;
}

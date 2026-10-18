"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X, ZoomIn, ZoomOut } from "lucide-react";
import { assetUrl } from "../lib/runtime-urls";
import type { Language } from "./site-content";
import { groupPosts, type GroupPost } from "./group-posts";

const copy = {
  ar: { title: "أخبار مجموعة سابق القانونية", hint: "تصفّح أخبار المجموعة واضغط على الصورة لقراءتها كاملة", previous: "الخبر السابق", next: "الخبر التالي", pause: "إيقاف الحركة", play: "تشغيل الحركة", open: "عرض الخبر", close: "إغلاق الخبر", zoom: "تكبير النص", fit: "عرض الصورة كاملة", source: "المصدر الأصلي في إنستقرام", date: "تاريخ الحكم", carousel: "شريط أخبار" },
  en: { title: "Sabeq Legal Group news", hint: "Browse our news and select an image to read it in full", previous: "Previous news item", next: "Next news item", pause: "Pause movement", play: "Resume movement", open: "View news item", close: "Close news item", zoom: "Enlarge text", fit: "Fit full image", source: "Original Instagram post", date: "Judgment date", carousel: "News carousel" },
  ur: { title: "سابق لیگل گروپ کی خبریں", hint: "خبریں دیکھیں اور مکمل پڑھنے کے لیے تصویر منتخب کریں", previous: "پچھلی خبر", next: "اگلی خبر", pause: "حرکت روکیں", play: "حرکت چلائیں", open: "خبر دیکھیں", close: "خبر بند کریں", zoom: "متن بڑا کریں", fit: "پوری تصویر دکھائیں", source: "اصل انسٹاگرام پوسٹ", date: "فیصلے کی تاریخ", carousel: "خبروں کی پٹی" },
};

export default function GroupPostsStrip({ language, posts = groupPosts }: { language: Language; posts?: GroupPost[] }) {
  const t = copy[language];
  const rtl = language !== "en";
  const viewport = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<GroupPost | null>(null);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let inView = false;
    const update = () => setVisible(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; update(); }, { threshold: 0.5 });
    observer.observe(element); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [posts.length]);

  useEffect(() => {
    if (posts.length < 2 || paused || hovered || focused || selected || !visible || reducedMotion) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % posts.length), 7000);
    return () => window.clearInterval(timer);
  }, [posts.length, paused, hovered, focused, selected, visible, reducedMotion]);

  useEffect(() => {
    const element = viewport.current;
    const card = element?.children[index] as HTMLElement | undefined;
    if (!element || !card) return;
    const parent = element.getBoundingClientRect(), child = card.getBoundingClientRect();
    element.scrollTo({ left: element.scrollLeft + (rtl ? child.right - parent.right : child.left - parent.left), behavior: reducedMotion ? "instant" : "smooth" });
  }, [index, rtl, reducedMotion]);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) { setZoomed(false); dialog.current.showModal(); }
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  function move(delta: number) {
    setPaused(true);
    setIndex(current => (current + delta + posts.length) % posts.length);
  }

  const date = (value: string) => new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const Previous = rtl ? ArrowRight : ArrowLeft, Next = rtl ? ArrowLeft : ArrowRight;
  if (!posts.length) return null;

  return <section className="group-posts" id="group-posts" aria-labelledby="group-posts-title" aria-roledescription={t.carousel} dir={rtl ? "rtl" : "ltr"} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="group-posts-heading"><div><h2 id="group-posts-title">{t.title}</h2><p>{t.hint}</p></div><div className="group-posts-controls">
      <button type="button" onClick={() => move(-1)} aria-label={t.previous} disabled={posts.length < 2}><Previous size={22} /></button>
      {!reducedMotion && posts.length > 1 && <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? t.play : t.pause} aria-pressed={paused}>{paused ? <Play size={20} /> : <Pause size={20} />}</button>}
      <button type="button" onClick={() => move(1)} aria-label={t.next} disabled={posts.length < 2}><Next size={22} /></button>
    </div></div>
    <div className="group-posts-viewport" ref={viewport} tabIndex={0} aria-label={t.title} onPointerDown={() => setPaused(true)} onWheel={() => setPaused(true)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); move((event.key === "ArrowRight") === rtl ? -1 : 1); } }}>
      {posts.map(post => <article className="group-post" key={post.id}>
        <button type="button" className="group-post-artwork" onClick={() => setSelected(post)} aria-label={`${t.open}: ${post.title[language]}`} aria-haspopup="dialog"><span className="group-post-image"><img src={assetUrl(post.artwork.src)} alt={post.title[language]} width={post.artwork.width} height={post.artwork.height} loading="lazy" decoding="async" /></span><span className="group-post-open"><ZoomIn size={20} aria-hidden="true" />{t.open}</span></button>
        <h3>{post.title[language]}</h3>{post.eventDate && <p className="group-post-date">{t.date}: <time dateTime={post.eventDate}>{date(post.eventDate)}</time></p>}
      </article>)}
    </div>
    <dialog ref={dialog} className="group-post-dialog" aria-labelledby="group-post-dialog-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <div className="group-post-dialog-content"><header><h2 id="group-post-dialog-title">{selected.title[language]}</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={t.close}><X size={24} /></button></header>
        <div className="group-post-dialog-tools"><button type="button" onClick={() => setZoomed(value => !value)} aria-pressed={zoomed}>{zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}{zoomed ? t.fit : t.zoom}</button>{selected.eventDate && <p>{t.date}: <time dateTime={selected.eventDate}>{date(selected.eventDate)}</time></p>}</div>
        <div className="group-post-zoom"><img src={assetUrl(selected.artwork.src)} alt={selected.title[language]} width={selected.artwork.width} height={selected.artwork.height} style={zoomed ? { width: Math.max(960, selected.artwork.width * 2), maxWidth: "none", maxHeight: "none" } : undefined} /></div>
        <a href={selected.source} target="_blank" rel="noopener noreferrer">{t.source}</a>
      </div>}
    </dialog>
  </section>;
}

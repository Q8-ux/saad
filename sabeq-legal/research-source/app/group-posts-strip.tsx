"use client";

import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { assetUrl } from "../lib/runtime-urls";
import type { Language } from "./site-content";
import { groupPosts, type GroupPost } from "./group-posts";

const copy = {
  ar: { title: "أخبار مجموعة سابق القانونية", open: "تكبير الصورة", close: "إغلاق الخبر", zoom: "تكبير النص", fit: "عرض الصورة كاملة", source: "المصدر الأصلي في إنستقرام", date: "تاريخ الحكم", carousel: "شريط أخبار" },
  en: { title: "Sabeq Legal Group news", open: "Enlarge image", close: "Close news item", zoom: "Enlarge text", fit: "Fit full image", source: "Original Instagram post", date: "Judgment date", carousel: "News carousel" },
  ur: { title: "سابق لیگل گروپ کی خبریں", open: "تصویر بڑی کریں", close: "خبر بند کریں", zoom: "متن بڑا کریں", fit: "پوری تصویر دکھائیں", source: "اصل انسٹاگرام پوسٹ", date: "فیصلے کی تاریخ", carousel: "خبروں کی پٹی" },
};

export default function GroupPostsStrip({ language, posts = groupPosts }: { language: Language; posts?: GroupPost[] }) {
  const t = copy[language];
  const rtl = language !== "en";
  const viewport = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<GroupPost | null>(null);
  const [canScroll, setCanScroll] = useState(false);
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
    const measure = () => setCanScroll(element.scrollWidth > element.clientWidth + 2);
    const observer = new ResizeObserver(measure);
    observer.observe(element); measure();
    return () => observer.disconnect();
  }, [posts.length]);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) { setZoomed(false); dialog.current.showModal(); }
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  function move(delta: number) {
    const element = viewport.current;
    if (!element || !element.children.length) return;
    const cards = Array.from(element.children) as HTMLElement[];
    const parent = element.getBoundingClientRect();
    const distance = (card: HTMLElement) => Math.abs(rtl ? card.getBoundingClientRect().right - parent.right : card.getBoundingClientRect().left - parent.left);
    let current = cards.reduce((nearest, card, at) => distance(card) < distance(cards[nearest]) ? at : nearest, 0);
    // At the clamped end, the final card cannot always reach the leading edge.
    if (Math.abs(element.scrollLeft) >= element.scrollWidth - element.clientWidth - 2) current = cards.length - 1;
    const card = cards[(current + delta + cards.length) % cards.length].getBoundingClientRect();
    element.scrollTo({ left: element.scrollLeft + (rtl ? card.right - parent.right : card.left - parent.left), behavior: reducedMotion ? "instant" : "smooth" });
  }

  const date = (value: string) => new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  if (!posts.length) return null;

  return <section className="group-posts" id="group-posts" aria-labelledby="group-posts-title" aria-roledescription={t.carousel} dir={rtl ? "rtl" : "ltr"}>
    <div className="group-posts-heading"><h2 id="group-posts-title">{t.title}</h2></div>
    <div className={`group-posts-viewport${canScroll ? "" : " no-overflow"}`} ref={viewport} tabIndex={canScroll ? 0 : undefined} aria-label={t.title} onKeyDown={event => { if (canScroll && (event.key === "ArrowRight" || event.key === "ArrowLeft")) { event.preventDefault(); move((event.key === "ArrowRight") === rtl ? -1 : 1); } }}>
      {posts.map(post => <article className="group-post" key={post.id}>
        <button type="button" className="group-post-artwork" onClick={() => setSelected(post)} aria-label={`${t.open}: ${post.title[language]}`} aria-haspopup="dialog"><span className="group-post-image"><img src={assetUrl(post.artwork.src)} alt={post.title[language]} width={post.artwork.width} height={post.artwork.height} loading="lazy" decoding="async" /></span></button>
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

"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Scale } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SitePublicSettings } from "../lib/site-controls";
import type { Language } from "./site-content";
import { centeredTeamOffset } from "./team-carousel-loop.mjs";

const controls = {
  ar: { previous: "المحامي السابق", next: "المحامي التالي" },
  en: { previous: "Previous lawyer", next: "Next lawyer" },
  ur: { previous: "پچھلا وکیل", next: "اگلا وکیل" },
};

export default function TeamCarousel({ members, language, title, brand }: {
  members: readonly SitePublicSettings["team"][number][];
  language: Language;
  title: string;
  brand: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const period = useRef(0);
  const progress = useRef(0);
  const count = members.length;
  const rtl = language !== "en";
  const sign = rtl ? -1 : 1;

  useEffect(() => {
    const element = viewport.current;
    period.current = 0;
    progress.current = 0;
    if (!element || count < 2) return;
    let timer: ReturnType<typeof setTimeout>;
    let touching = false;
    let measuredWidth = 0;
    const recenter = () => {
      if (touching || !period.current || element.clientWidth !== measuredWidth) return;
      const position = sign * element.scrollLeft;
      const target = centeredTeamOffset(position, period.current);
      if (Math.abs(target - position) > 0.5) element.scrollLeft = sign * target;
    };
    const settle = () => {
      if (period.current && element.clientWidth === measuredWidth) progress.current = (centeredTeamOffset(sign * element.scrollLeft, period.current) - period.current) / period.current;
      clearTimeout(timer);
      timer = setTimeout(recenter, 140);
    };
    const measure = () => {
      const first = element.children[0]?.getBoundingClientRect();
      const middle = element.children[count]?.getBoundingClientRect();
      if (!first || !middle) return;
      const distance = Math.abs(middle.left - first.left);
      if (!distance) return;
      period.current = distance;
      measuredWidth = element.clientWidth;
      element.scrollLeft = sign * distance * (1 + progress.current);
    };
    const startTouch = () => { touching = true; clearTimeout(timer); };
    const endTouch = (event: TouchEvent) => {
      if (!touching) return;
      touching = event.touches.length > 0;
      if (!touching) settle();
    };
    const observer = new ResizeObserver(() => { if (element.clientWidth !== measuredWidth) measure(); });
    observer.observe(element);
    element.addEventListener("scroll", settle, { passive: true });
    element.addEventListener("scrollend", recenter);
    element.addEventListener("touchstart", startTouch, { passive: true });
    window.addEventListener("touchend", endTouch, { passive: true });
    window.addEventListener("touchcancel", endTouch, { passive: true });
    measure();
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      element.removeEventListener("scroll", settle);
      element.removeEventListener("scrollend", recenter);
      element.removeEventListener("touchstart", startTouch);
      window.removeEventListener("touchend", endTouch);
      window.removeEventListener("touchcancel", endTouch);
    };
  }, [count, sign]);

  function move(delta: number) {
    const element = viewport.current;
    if (!element || !period.current) return;
    element.scrollLeft = sign * centeredTeamOffset(sign * element.scrollLeft, period.current);
    const cards = Array.from(element.children) as HTMLElement[];
    const bounds = element.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(element).paddingInlineStart) || 0;
    const edge = rtl ? bounds.right - padding : bounds.left + padding;
    const offset = (card: HTMLElement) => { const box = card.getBoundingClientRect(); return (rtl ? box.right : box.left) - edge; };
    const current = cards.reduce((nearest, card, index) => Math.abs(offset(card)) < Math.abs(offset(cards[nearest])) ? index : nearest, 0);
    const target = cards[current + delta];
    if (target) {
      element.scrollBy({ left: offset(target), behavior: "instant" });
      progress.current = (centeredTeamOffset(sign * element.scrollLeft, period.current) - period.current) / period.current;
    }
  }

  if (!count) return null;
  return <>
    {count > 1 && <div className="team-loop-controls">
      <button type="button" onClick={() => move(-1)} aria-label={controls[language].previous} title={controls[language].previous}>{rtl ? <ArrowRight size={22} aria-hidden="true" /> : <ArrowLeft size={22} aria-hidden="true" />}</button>
      <button type="button" onClick={() => move(1)} aria-label={controls[language].next} title={controls[language].next}>{rtl ? <ArrowLeft size={22} aria-hidden="true" /> : <ArrowRight size={22} aria-hidden="true" />}</button>
    </div>}
    <div className={`team-grid${count > 1 ? " team-loop" : ""}`} ref={viewport} dir={rtl ? "rtl" : "ltr"} role="region" aria-label={title} tabIndex={0} onKeyDown={event => {
      if (count > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        move((event.key === "ArrowRight") === rtl ? -1 : 1);
      }
    }}>
      {(count > 1 ? [-1, 0, 1] : [0]).flatMap(copy => members.map((member, index) => <article className={`team-card${index === 0 ? " team-card-lead" : ""}${member.image.includes("dr-khalifa") ? " team-card-khalifa" : ""}`} key={`${copy}-${member.name.ar}`} aria-hidden={copy !== 0 ? true : undefined} data-loop-copy={copy} data-team-index={index} dir={rtl ? "rtl" : "ltr"}>
        <div className="team-photo"><Image src={member.image} alt={`${member.prefix[language]} ${member.name[language]}`} fill sizes="(max-width: 720px) 86vw, 380px" unoptimized draggable={false} /></div>
        <div className="team-info"><small>{member.prefix[language]}</small><h3 dir={rtl ? "rtl" : "ltr"}>{member.name[language]}</h3><span><Scale size={15} />{brand}</span></div>
      </article>))}
    </div>
  </>;
}

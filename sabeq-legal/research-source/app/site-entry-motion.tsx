"use client";
import { useEffect } from "react";
import type { RefObject } from "react";

export default function SiteEntryMotion({ root }: { root: RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;
    let disposed = false;
    let context: { revert(): void } | undefined;
    const reduce = () => { if (preference.matches) context?.revert(); };
    preference.addEventListener("change", reduce);
    // One public-page entrance. No scroll pinning or motion in legal text.
    void import("gsap").then(({ gsap }) => {
      if (disposed || preference.matches || !root.current) return;
      context = gsap.context(() => {
        gsap.timeline({ defaults: { ease: "power2.out", duration: 0.45 } })
          .fromTo(".hero-brand-title", { y: 8, opacity: 0.8 }, { y: 0, opacity: 1, clearProps: "transform,opacity" })
          .fromTo(".hero-brand-tagline", { y: 6, opacity: 0.85 }, { y: 0, opacity: 1, clearProps: "transform,opacity" }, 0.1);
      }, root.current);
    }).catch(() => { /* The fully visible default remains usable if motion cannot load. */ });
    return () => { disposed = true; preference.removeEventListener("change", reduce); context?.revert(); };
  }, [root]);
  return null;
}


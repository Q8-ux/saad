"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const GITHUB_PAGES_ORIGIN = "https://q8-ux.github.io";
const NAVIGATION_CHANNEL = "ant-alshaer-navigation";
const SUPPORTED_PAGE_PATHS = new Set(["/", "/archive", "/login", "/admin", "/admin/login"]);

export default function GitHubPagesBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.parent === window || !SUPPORTED_PAGE_PATHS.has(pathname)) return;
    try {
      if (new URL(document.referrer).origin !== GITHUB_PAGES_ORIGIN) return;
    } catch {
      return;
    }

    const announce = () => window.parent.postMessage(
      {
        channel: NAVIGATION_CHANNEL,
        type: "route-changed",
        pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
      GITHUB_PAGES_ORIGIN,
    );
    const readyCheck = (event: MessageEvent) => {
      if (event.origin === GITHUB_PAGES_ORIGIN && event.source === window.parent &&
          event.data?.channel === NAVIGATION_CHANNEL && event.data.type === "app-ready-check") announce();
    };
    window.addEventListener("message", readyCheck);
    announce();
    return () => window.removeEventListener("message", readyCheck);
  }, [pathname]);

  return null;
}

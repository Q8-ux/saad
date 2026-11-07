"use client";

import { useEffect, useRef, useState } from "react";
import { appBuildId, appUpdateAction } from "@/lib/app-release";

export default function AppUpdates({ busy, hasDraft }: { busy: boolean; hasDraft: boolean }) {
  const state = useRef({ busy, hasDraft });
  state.current = { busy, hasDraft };
  const [pendingBuild, setPendingBuild] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function check() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/version", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (!response.ok) return;
        const version = await response.json() as { build_id?: unknown };
        if (active && appUpdateAction(appBuildId, version.build_id, state.current.busy, state.current.hasDraft) !== "none") setPendingBuild(String(version.build_id));
      } catch { /* A failed update check never interrupts writing. */ }
    }
    void check();
    const timer = window.setInterval(() => void check(), 60000);
    const wake = () => void check();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake); };
  }, []);
  useEffect(() => {
    if (pendingBuild && appUpdateAction(appBuildId, pendingBuild, busy, hasDraft) === "reload") window.location.reload();
  }, [pendingBuild, busy, hasDraft]);
  if (!pendingBuild) return null;
  return <div className="app-update-notice" role="status">تحديث جديد جاهز. تقدر تكمل قصيدتك؛ يُطبّق عند فتح التطبيق مجددًا.</div>;
}

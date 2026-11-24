"use client";

import { ArrowRight, AudioLines, Feather, FileText, RefreshCw, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Verse = { sadr: string; ajz: string };
type ArchiveItem = {
  id: string;
  sourceMode: "text" | "audio" | "video" | "document" | "image";
  storyText: string;
  requestText: string | null;
  poemTitle: string | null;
  meter: string | null;
  state: string;
  hasAudio: boolean;
  audioFilename: string | null;
  createdAt: string;
  poem: { title?: string; verses?: Verse[] } | null;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "التاريخ غير متاح" : new Intl.DateTimeFormat("ar-KW", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait",
  }).format(date);
};

export default function UserArchive({ displayName }: { displayName: string }) {
  const [archive, setArchive] = useState<ArchiveItem[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadArchive = useCallback(async () => {
    setError("");
    setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/archive", { cache: "no-store", signal: controller.signal });
      const result = (await response.json()) as { archive?: ArchiveItem[]; error?: string };
      if (!response.ok) throw new Error(result.error || "تعذّر تحميل الأرشيف.");
      setArchive(result.archive || []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "";
      setError(controller.signal.aborted
        ? "استغرق تحميل الأرشيف وقتًا أطول من المتوقع. أعد المحاولة."
        : /[\u0600-\u06FF]/.test(message) ? message : "تعذّر تحميل الأرشيف. تحقق من الاتصال وأعد المحاولة.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadArchive(), 0);
    return () => window.clearTimeout(timer);
  }, [loadArchive]);

  return (
    <main className="dashboard-shell user-archive-shell">
      <header className="dashboard-topbar">
        <div>
          <div className="dashboard-kicker"><Feather size={17} /> أرشيفي الشعري</div>
          <h1>قصص وقصائد <bdi>{displayName}</bdi></h1>
          <p>كل ما كتبته أو سجلته، مع القصائد الناتجة، محفوظ هنا في حسابك.</p>
        </div>
        <div className="dashboard-top-actions">
          <button type="button" className="secondary-button" disabled={loading} onClick={() => void loadArchive()}><RefreshCw size={16} /> {loading ? "جارٍ التحديث…" : "تحديث"}</button>
          <Link className="secondary-button" href="/">العودة للتطبيق <ArrowRight size={16} /></Link>
        </div>
      </header>

      {error && <div className="error-box dashboard-error" role="alert"><p>{error}</p><button type="button" className="secondary-button" disabled={loading} onClick={() => void loadArchive()}>إعادة المحاولة</button></div>}
      {!archive && loading ? (
        <div className="dashboard-loading" role="status">جارٍ تحميل أرشيفك…</div>
      ) : archive?.length === 0 ? (
        <div className="dashboard-card empty-archive">
          <Feather size={34} />
          <h2>أرشيفك ينتظر قصتك الأولى</h2>
          <p>ارجع إلى التطبيق، اكتب قصتك أو سجّلها، ثم اطلب القصيدة.</p>
          <Link className="primary-button" href="/">ابدأ الآن</Link>
        </div>
      ) : archive ? (
        <section className="archive-list personal-archive-list">
          {archive.map((item) => (
            <article className="dashboard-card personal-archive-item" key={item.id}>
              <div className="personal-archive-head">
                <div className="archive-icon">{item.sourceMode === "video" ? <Video size={19} /> : item.sourceMode === "audio" ? <AudioLines size={19} /> : <FileText size={19} />}</div>
                <div><h2>{item.poemTitle || "قصة قيد التحويل"}</h2><span>{formatDate(item.createdAt)} {item.meter ? `• بحر ${item.meter}` : ""}</span></div>
              </div>
              <div className="archive-block"><h3>قصتك</h3><p>{item.storyText}</p></div>
              {item.requestText && <div className="archive-block compact"><h3>طلبك</h3><p>{item.requestText}</p></div>}
              {item.hasAudio && <div className="archive-audio"><div>{item.sourceMode === "video" ? <Video size={18} /> : <AudioLines size={18} />} الملف الأصلي</div>{item.sourceMode === "document" || item.sourceMode === "image" ? <a className="secondary-button" href={`/api/audio/${item.id}`} download={item.audioFilename || "source"}>تنزيل الملف الأصلي</a> : item.sourceMode === "video" ? <video controls preload="metadata" src={`/api/audio/${item.id}`} /> : <audio controls preload="none" src={`/api/audio/${item.id}`} />}</div>}
              {item.hasAudio && (item.sourceMode === 'document' || item.sourceMode === 'image') && !item.poem && <Link className="secondary-button" href={`/?read_file=${encodeURIComponent(item.id)}`}>{item.storyText ? 'متابعة الكتابة من هذا الملف' : 'قراءة الملف ومتابعة الكتابة'}</Link>}
              {item.poem?.verses?.length ? (
                <div className="archive-poem">
                  <h3>{item.poem.title || item.poemTitle}</h3>
                  {item.poem.verses.map((verse, index) => (
                    <div className="archive-verse" key={`${item.id}-${index}`}><span>{verse.sadr}</span><i aria-hidden="true">◆</i><span>{verse.ajz}</span></div>
                  ))}
                </div>
              ) : <div className="archive-pending">لم تُكتب القصيدة لهذا السجل بعد.</div>}
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

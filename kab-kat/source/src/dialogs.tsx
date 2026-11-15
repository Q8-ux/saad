import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Clapperboard, Download, FolderOpen, Plus, X } from "lucide-react";
import type { TProjectMetadata } from "@/project/types";
import type { ExportFormat, ExportQuality } from "@/export";
import { clock, seconds } from "./editor-tools";

export function Modal({ title, children, onClose, busy = false }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="dialog-content">
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="icon" onClick={onClose} disabled={busy} title="إغلاق" aria-label="إغلاق"><X /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ProjectsDialog({ projects, current, opening, onCreate, onOpen, onClose }: {
  projects: TProjectMetadata[];
  current: string;
  opening: boolean;
  onCreate: (name: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const sorted = [...projects].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
  return (
    <Modal title="مشاريعي" onClose={onClose} busy={opening}>
      <form className="new-project" onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name.trim());
      }}>
        <input aria-label="اسم المشروع الجديد" placeholder="اسم المشروع الجديد" autoFocus maxLength={80} dir="auto" value={name} onChange={(e) => setName(e.target.value)} disabled={opening} required />
        <button className="primary compact" disabled={opening || !name.trim()}><Plus size={17} /> إنشاء</button>
      </form>
      <div className="projects-list">
        {sorted.map((project) => (
          <button className="project-row" key={project.id} type="button" disabled={opening} onClick={() => onOpen(project.id)}>
            <span className="project-icon"><Clapperboard size={18} /></span>
            <span><strong dir="auto">{project.name}</strong><small dir="ltr">{clock(seconds(project.duration ?? 0), true)}</small></span>
            {project.id === current ? <span className="open-status">مفتوح</span> : <FolderOpen size={17} />}
          </button>
        ))}
      </div>
      <p className="dialog-note">تُحفظ المشاريع والوسائط في هذا المتصفح على جهازك.</p>
    </Modal>
  );
}

export function ExportDialog({ dimensions, busy, progress, onExport, onCancel, onClose }: {
  dimensions: string;
  busy: boolean;
  progress: number;
  onExport: (format: ExportFormat, quality: ExportQuality, includeAudio: boolean) => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [audio, setAudio] = useState(true);
  const [cancelled, setCancelled] = useState(false);
  return (
    <Modal title="تصدير الفيديو" onClose={onClose} busy={busy}>
      <form className="export-form" onSubmit={(e) => { e.preventDefault(); setCancelled(false); onExport(format, quality, audio); }}>
        <fieldset disabled={busy}>
          <div className="form-row">
            <label>الصيغة<select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}><option value="mp4">MP4</option><option value="webm">WebM</option></select></label>
            <label>الجودة<select value={quality} onChange={(e) => setQuality(e.target.value as ExportQuality)}><option value="medium">متوسطة</option><option value="high">عالية</option></select></label>
          </div>
          <label className="checkbox"><input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} /> تضمين الصوت</label>
        </fieldset>
        <div className="export-summary"><span>أبعاد الفيديو</span><b dir="ltr">{dimensions}</b></div>
        {busy
          ? <div className="export-progress">
              <progress aria-label="تقدّم التصدير" max={1} value={progress} />
              <button className="quiet" type="button" disabled={cancelled} onClick={() => { setCancelled(true); onCancel(); }}>{cancelled ? "جارٍ الإلغاء…" : "إلغاء التصدير"}</button>
            </div>
          : <button className="primary"><Download size={17} /> تنزيل الفيديو</button>}
      </form>
    </Modal>
  );
}

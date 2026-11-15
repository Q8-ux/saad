import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Check, Clapperboard, Download, FolderOpen, HardDrive, LoaderCircle, PencilLine } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { downloadBuffer, getExportMimeType, type ExportFormat, type ExportQuality } from "@/export";
import { processMediaAssets } from "@/media/processing";
import { initializeGpuRenderer } from "@/services/renderer/gpu-renderer";
import type { MediaAsset } from "@/media/types";
import { ZERO_MEDIA_TIME } from "@/wasm";
import { canEncodeVideo } from "mediabunny";
import { Inspector } from "./inspector";
import { MediaPanel } from "./media-panel";
import { Preview, type PreviewGate } from "./preview";
import { Timeline } from "./timeline";
import { ExportDialog, ProjectsDialog } from "./dialogs";
import { addTitle, appendAsset } from "./editor-tools";

const lastProjectKey = "kab-kat:last-project";

export default function Workspace() {
  const editor = useEditor();
  const project = useEditor((e) => e.project.getActiveOrNull());
  const saved = useEditor((e) => e.project.getSavedProjects());
  const hasScene = useEditor((e) => Boolean(e.scenes.getActiveSceneOrNull()));
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<"projects" | "export" | null>(null);
  const [changing, setChanging] = useState(false);
  const initializing = useRef(false);
  const switching = useRef(false);
  const previewGate = useRef<PreviewGate>({ suspended: false, pending: Promise.resolve() });

  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;
    async function initialize() {
      await Promise.all([initializeGpuRenderer(), editor.project.loadAllProjects(), document.fonts.ready]);
      if (typeof OffscreenCanvas !== "function") {
        setLoadError("افتح المحرّر في إصدار حديث من متصفح Chrome أو Edge.");
        return;
      }
      const projects = editor.project.getSavedProjects();
      const previous = projects.find(({ id }) => id === localStorage.getItem(lastProjectKey)) ?? projects[0];
      if (previous) await editor.project.loadProject({ id: previous.id });
      else localStorage.setItem(lastProjectKey, await editor.project.createNewProject({ name: "مشروع بدون عنوان" }));
      setLoaded(true);
    }
    void initialize().catch((error) => {
      console.error("Project initialization failed:", error);
      setLoadError("تعذّر فتح المشاريع المحلية. تأكد من أن تخزين الموقع متاح في المتصفح.");
    });
  }, [editor]);

  async function switchProject(target: { id: string } | { name: string }) {
    if (switching.current) return;
    if ("id" in target && target.id === project?.metadata.id) {
      setDialog(null);
      return;
    }
    switching.current = true;
    setChanging(true);
    previewGate.current.suspended = true;
    editor.playback.pause();
    try {
      await previewGate.current.pending;
      if (project) await editor.save.flush();
      editor.command.clear();
      editor.selection.clearSelection();
      let id: string;
      if ("id" in target) {
        id = target.id;
        await editor.project.loadProject({ id });
      } else {
        id = await editor.project.createNewProject({ name: target.name });
      }
      editor.playback.seek({ time: ZERO_MEDIA_TIME });
      localStorage.setItem(lastProjectKey, id);
      setDialog(null);
    } catch (error) {
      console.error("Could not switch projects:", error);
      if (project) {
        try {
          await editor.project.loadProject({ id: project.metadata.id });
        } catch (restoreError) {
          console.error("Could not restore the previous project:", restoreError);
        }
      }
      toast.error("تعذّر فتح المشروع");
    } finally {
      previewGate.current.suspended = false;
      switching.current = false;
      setChanging(false);
    }
  }

  return (
    <>
      {loadError ? (
        <main className="boot"><Clapperboard /><h1>كب كت</h1><p>{loadError}</p><button className="quiet" onClick={() => location.reload()}>إعادة المحاولة</button></main>
      ) : !loaded || !project || (!hasScene && !changing) ? (
        <main className="boot"><LoaderCircle className="spinner" /><p role="status">جارٍ فتح المحرّر…</p></main>
      ) : (
        <>
          {hasScene && !changing && (
            <Editor key={project.metadata.id} previewGate={previewGate} openProjects={() => setDialog("projects")}
              exportOpen={dialog === "export"} openExport={() => setDialog("export")} closeExport={() => setDialog(null)} />
          )}
          {changing && <main className="boot"><LoaderCircle className="spinner" /><p role="status">جارٍ فتح المشروع…</p></main>}
          {dialog === "projects" && (
            <ProjectsDialog projects={saved} current={project.metadata.id} opening={changing} onClose={() => setDialog(null)}
              onCreate={(name) => void switchProject({ name })} onOpen={(id) => void switchProject({ id })} />
          )}
        </>
      )}
      <Toaster theme="dark" position="bottom-center" dir="rtl" richColors />
    </>
  );
}

function Editor({ previewGate, openProjects, exportOpen, openExport, closeExport }: {
  previewGate: React.RefObject<PreviewGate>;
  openProjects: () => void;
  exportOpen: boolean;
  openExport: () => void;
  closeExport: () => void;
}) {
  const editor = useEditor();
  const project = useEditor((e) => e.project.getActive());
  const duration = useEditor((e) => e.timeline.getTotalDuration());
  const exportState = useEditor((e) => e.project.getExportState());
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const importLock = useRef(false);
  const exportLock = useRef(false);
  const cancelRequested = useRef(false);
  const renderErrorReported = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragCount = useRef(0);
  const busy = importing || exporting;

  const pickFiles = useCallback(() => fileInput.current?.click(), []);
  const reportRenderError = useCallback(() => {
    if (renderErrorReported.current) return;
    renderErrorReported.current = true;
    toast.error("تعذّرت معاينة أحد المقاطع", { description: "جرّب ملف MP4 بترميز H.264 أو ملف WebM." });
  }, []);

  useEffect(() => {
    const warnOnUnsaved = (event: BeforeUnloadEvent) => {
      if (importLock.current || exportLock.current || editor.save.getIsDirty()) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnOnUnsaved);
    return () => window.removeEventListener("beforeunload", warnOnUnsaved);
  }, [editor]);

  async function importFiles(files: File[]) {
    if (!files.length || importLock.current || exportLock.current) return;
    importLock.current = true;
    setImporting(true);
    try {
      const processed = await processMediaAssets({ files });
      const usable = processed.filter((asset) => asset.type === "image" || (asset.duration && Number.isFinite(asset.duration) && asset.duration > 0));
      for (const asset of processed) {
        if (!usable.includes(asset) && asset.url) URL.revokeObjectURL(asset.url);
      }
      let added = 0;
      for (const asset of usable) {
        const saved = await editor.media.addMediaAsset({ projectId: project.metadata.id, asset });
        if (saved) added += 1;
        else if (asset.url) URL.revokeObjectURL(asset.url);
      }
      if (added > 0) toast.success("تم الاستيراد. أضف الوسائط من المكتبة إلى الخط الزمني.");
      if (added !== files.length) toast.error("بعض الملفات تعذّر استيرادها أو تخزينها");
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("تعذّر استيراد الوسائط");
    } finally {
      importLock.current = false;
      setImporting(false);
    }
  }

  function dropFiles(event: DragEvent) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragCount.current = 0;
    setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }

  async function rename() {
    const name = renameValue.trim();
    setEditingName(false);
    if (!name || name === project.metadata.name) return;
    await editor.save.flush();
    await editor.project.renameProject({ id: project.metadata.id, name });
  }

  async function exportVideo(format: ExportFormat, quality: ExportQuality, includeAudio: boolean) {
    if (importLock.current || exportLock.current || !duration) return;
    exportLock.current = true;
    cancelRequested.current = false;
    setExporting(true);
    editor.playback.pause();
    previewGate.current.suspended = true;
    try {
      await previewGate.current.pending;
      const { width, height } = editor.project.getActive().settings.canvasSize;
      const codec = format === "mp4" ? "avc" : "vp9";
      const supported = await canEncodeVideo(codec, { width, height });
      if (cancelRequested.current) return;
      if (!supported) {
        toast.error(format === "mp4" ? "هذا المتصفح لا يدعم تصدير MP4 بهذا المقاس. جرّب WebM." : "هذا المتصفح لا يدعم تصدير WebM بهذا المقاس.");
        return;
      }
      const result = await editor.project.export({ options: { format, quality, includeAudio } });
      if (result.cancelled) return;
      if (!result.success || !result.buffer) throw new Error(result.error || "No encoded output");
      const name = project.metadata.name.replace(/[<>:"/\\|?*]/g, "-");
      downloadBuffer({ buffer: result.buffer, filename: name + "." + format, mimeType: getExportMimeType({ format }) });
      closeExport();
      toast.success("تم تصدير الفيديو");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("تعذّر تصدير الفيديو", { description: "جرّب جودة متوسطة أو صيغة مختلفة." });
    } finally {
      exportLock.current = false;
      previewGate.current.suspended = false;
      setExporting(false);
    }
  }

  function insertText() {
    void addTitle(editor).catch((error) => {
      console.error("Could not add a title:", error);
      toast.error("تعذّرت إضافة النص");
    });
  }

  function insertAsset(asset: MediaAsset) {
    void appendAsset(editor, asset).catch((error) => {
      console.error("Could not add a clip:", error);
      toast.error("تعذّرت إضافة الوسائط");
    });
  }

  const { width, height } = project.settings.canvasSize;
  return (
    <div className={"workspace" + (dragging ? " is-dragging" : "")}
      onDragEnter={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); dragCount.current += 1; setDragging(true); } }}
      onDragLeave={(event) => { if (event.dataTransfer.types.includes("Files")) { dragCount.current = Math.max(0, dragCount.current - 1); if (!dragCount.current) setDragging(false); } }}
      onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={dropFiles}>
      <header className="app-header">
        <div className="identity">
          <div className="brand"><span className="brand-mark"><Clapperboard size={20} /></span><h1>كب كت</h1></div>
          <span className="splitter" />
          {editingName ? (
            <form className="rename-form" onSubmit={(e) => { e.preventDefault(); void rename(); }}>
              <input autoFocus aria-label="اسم المشروع" dir="auto" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={80}
                onKeyDown={(e) => { if (e.key === "Escape") setEditingName(false); }} required />
              <button className="icon" aria-label="حفظ الاسم" title="حفظ الاسم"><Check /></button>
            </form>
          ) : (
            <button className="project-name" title="تعديل اسم المشروع" aria-label={"تعديل اسم المشروع " + project.metadata.name} disabled={busy}
              onClick={() => { setRenameValue(project.metadata.name); setEditingName(true); }}>
              <span dir="auto">{project.metadata.name}</span><PencilLine size={14} />
            </button>
          )}
        </div>
        <div className="header-actions">
          <span className="local-storage" title="يُحفظ المشروع في هذا المتصفح"><HardDrive size={15} /><span>حفظ محلي</span></span>
          <button className="quiet" disabled={busy} onClick={openProjects}><FolderOpen size={17} /> مشاريعي</button>
          <button className="primary" disabled={busy || duration <= 0} onClick={openExport}><Download size={16} /> تصدير</button>
        </div>
      </header>

      <input ref={fileInput} hidden type="file" multiple accept="video/*,audio/*,image/*,.mkv,.webm,.wav,.mp4,.mov" aria-label="اختيار ملفات الوسائط"
        onChange={(event) => { void importFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} />

      <main className="workspace-body" aria-label="محرّر الفيديو">
        <MediaPanel onAdd={insertAsset} onImport={pickFiles} disabled={busy} importing={importing} />
        <Preview gate={previewGate} importFiles={pickFiles} busy={busy} onRenderError={reportRenderError} />
        <Inspector busy={busy} />
        <Timeline onAddText={insertText} disabled={busy} />
      </main>
      {dragging && <div className="drop-overlay"><UploadDropTarget /></div>}
      {exportOpen && (
        <ExportDialog dimensions={width + " × " + height} busy={exporting} progress={exportState.progress}
          onExport={(format, quality, audio) => void exportVideo(format, quality, audio)} onCancel={() => { cancelRequested.current = true; editor.project.cancelExport(); }} onClose={closeExport} />
      )}
    </div>
  );
}

function UploadDropTarget() {
  return <div><Clapperboard size={28} /><strong>أفلت الوسائط هنا</strong></div>;
}

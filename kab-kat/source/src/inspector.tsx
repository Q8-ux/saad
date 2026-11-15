import { useLayoutEffect, useState, type FormEvent } from "react";
import { AudioLines, ArrowLeft, ArrowRight, Film, Frame, Image, Type, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import type { TimelineElement, TimelineTrack } from "@/timeline/types";
import { getClip, ratios, seconds, ticks } from "./editor-tools";

const round = (value: number) => Number(value.toFixed(4));
const elementLabels = { video: "فيديو", image: "صورة", audio: "صوت", text: "نص" };
const elementIcons = { video: Film, image: Image, audio: AudioLines, text: Type };

export function Inspector({ busy }: { busy: boolean }) {
  const editor = useEditor();
  const size = useEditor((e) => e.project.getActive().settings.canvasSize);
  const tracks = useEditor((e) => e.scenes.getActiveScene().tracks);
  const selection = useEditor((e) => e.selection.getSelectedElements());
  const clip = getClip(tracks, selection);

  return (
    <section className="panel inspector-panel" aria-label="الخصائص">
      <div className="panel-heading"><h2>الخصائص</h2><Frame size={16} /></div>
      <div className="inspector-content">
        <fieldset className="ratios" disabled={busy}>
          <legend>مقاس الفيديو</legend>
          <div className="ratio-buttons">
            {ratios.map(({ label, title, width, height }) => (
              <button key={label} className="ratio" title={title} aria-label={title + " " + label}
                aria-pressed={size.width * height === size.height * width}
                onClick={() => editor.project.updateSettings({ settings: { canvasSize: { width, height } } })}>
                <span className={"ratio-shape ratio-" + title} /><b dir="ltr">{label}</b>
              </button>
            ))}
          </div>
        </fieldset>
        {clip
          ? <ClipSettings key={clip.element.id} {...clip} busy={busy} />
          : <p className="inspector-hint">حدّد مقطعًا من الخط الزمني لتعديل مدّته أو خصائصه.</p>}
      </div>
    </section>
  );
}

function ClipSettings({ element, track, busy }: { element: TimelineElement; track: TimelineTrack; busy: boolean }) {
  const editor = useEditor();
  const Icon = elementIcons[element.type as keyof typeof elementIcons] ?? Film;
  const kind = elementLabels[element.type as keyof typeof elementLabels] ?? "مقطع";
  const isSource = element.type === "video" || element.type === "audio";
  const isText = element.type === "text";
  const elements = [...track.elements].sort((a, b) => a.startTime - b.startTime);
  const order = elements.findIndex((clip) => clip.id === element.id);
  const next = elements[order + 1];
  const sourceLength = ("sourceDuration" in element && element.sourceDuration) || (element.trimStart + element.duration + element.trimEnd);
  const [trimFrom, setTrimFrom] = useState(0);
  const [trimTo, setTrimTo] = useState(0);
  const [content, setContent] = useState("");
  const [fontSize, setFontSize] = useState(8);
  const [color, setColor] = useState("#ffffff");
  const [muted, setMuted] = useState(false);

  useLayoutEffect(() => {
    setTrimFrom(round(seconds(element.trimStart)));
    setTrimTo(round(seconds(element.trimStart + element.duration)));
    setContent(String(element.params.content ?? ""));
    setFontSize(Number(element.params.fontSize ?? 8));
    setColor(typeof element.params.color === "string" && /^#[\da-f]{6}$/i.test(element.params.color) ? element.params.color : "#ffffff");
    setMuted(element.params.muted === true);
  }, [element]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const duration = isSource ? trimTo - trimFrom : trimTo;
    if (!Number.isFinite(duration) || duration < 0.03 || (isSource && (trimFrom < 0 || trimTo > seconds(sourceLength) + 0.0001))) {
      toast.error("راجع نقاط القص ومدّة المقطع");
      return;
    }
    if (next && element.startTime + ticks(duration) > next.startTime + ticks(0.0001)) {
      toast.error("المدّة المطلوبة تتداخل مع المقطع التالي");
      return;
    }
    const patch = { duration: ticks(duration) } as Partial<TimelineElement>;
    if (isSource) {
      patch.trimStart = ticks(trimFrom);
      patch.trimEnd = ticks(Math.max(0, seconds(sourceLength) - trimTo));
      patch.params = { ...element.params, muted };
    }
    if (isText) {
      patch.name = content.trim().slice(0, 80) || "نص";
      patch.params = { ...element.params, content, fontSize, color };
    }
    editor.timeline.updateElements({
      updates: [{ trackId: track.id, elementId: element.id, patch }],
    });
    editor.playback.seek({ time: element.startTime });
  }

  function swap(direction: -1 | 1) {
    const [first, second] = direction < 0 ? [elements[order - 1], element] : [element, elements[order + 1]];
    if (!first || !second) return;
    const gap = Math.max(0, second.startTime - (first.startTime + first.duration));
    editor.timeline.moveElements({
      moves: [
        { elementId: second.id, sourceTrackId: track.id, targetTrackId: track.id, newStartTime: first.startTime },
        { elementId: first.id, sourceTrackId: track.id, targetTrackId: track.id, newStartTime: ticks(seconds(first.startTime + second.duration + gap)) },
      ],
    });
    const newStart = direction < 0 ? first.startTime : first.startTime + second.duration + gap;
    editor.playback.seek({ time: ticks(seconds(newStart)) });
  }

  return (
    <form onSubmit={save} className="clip-settings">
      <h3><Icon size={15} /> <span>{kind}</span></h3>
      <p className="clip-title" dir="auto" title={element.name}>{element.name}</p>
      <fieldset disabled={busy}>
        {isText && (
          <>
            <label>النص<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} maxLength={200} dir="auto" required /></label>
            <div className="form-row">
              <label>الحجم<input type="number" value={Number.isNaN(fontSize) ? "" : fontSize} min="2" max="60" onChange={(e) => setFontSize(e.target.valueAsNumber)} required /></label>
              <label>اللون<input className="color-field" type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
            </div>
          </>
        )}
        <div className="form-row">
          {isSource && <label>نقطة الدخول<input dir="ltr" type="number" value={Number.isNaN(trimFrom) ? "" : trimFrom} min="0" step="any" onChange={(e) => setTrimFrom(e.target.valueAsNumber)} required /></label>}
          <label>{isSource ? "نقطة الخروج" : "المدّة بالثواني"}<input dir="ltr" type="number" value={Number.isNaN(trimTo) ? "" : trimTo} min="0.03" step="any" onChange={(e) => setTrimTo(e.target.valueAsNumber)} required /></label>
        </div>
        {isSource && <label className="checkbox"><input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} /><VolumeX size={14} /> كتم صوت المقطع</label>}
        <div className="clip-actions">
          <button type="submit" className="quiet compact accent">تطبيق</button>
          {track.type === "video" && elements.length > 1 && (
            <div className="group">
              <button type="button" className="icon" aria-label="قدّم المقطع" title="قدّم المقطع" disabled={order <= 0} onClick={() => swap(-1)}><ArrowLeft size={15} /></button>
              <button type="button" className="icon" aria-label="أخّر المقطع" title="أخّر المقطع" disabled={order >= elements.length - 1} onClick={() => swap(1)}><ArrowRight size={15} /></button>
            </div>
          )}
        </div>
      </fieldset>
    </form>
  );
}

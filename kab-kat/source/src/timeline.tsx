import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Film, Minus, Music2, Plus, Redo2, Scissors, Trash2, Type, Undo2 } from "lucide-react";
import { useEditor } from "@/editor/use-editor";
import type { ElementRef, TimelineTrack } from "@/timeline/types";
import { roundFrameTime } from "@/wasm";
import { clock, getClip, seconds, ticks, trackList } from "./editor-tools";

export function Timeline({ onAddText, disabled }: { onAddText: () => void; disabled: boolean }) {
  const editor = useEditor();
  const tracks = useEditor((e) => e.scenes.getActiveScene().tracks);
  const assets = useEditor((e) => e.media.getAssets());
  const selection = useEditor((e) => e.selection.getSelectedElements());
  const time = useEditor((e) => e.playback.getCurrentTime());
  const duration = useEditor((e) => e.timeline.getTotalDuration());
  const canUndo = useEditor((e) => e.command.canUndo());
  const canRedo = useEditor((e) => e.command.canRedo());
  const [zoom, setZoom] = useState(1);
  const rulerRef = useRef<HTMLDivElement>(null);
  const current = getClip(tracks, selection);
  const splitTime = roundFrameTime({ time, fps: editor.project.getActive().settings.fps });
  const hasSplitPoint = current && splitTime > current.element.startTime && splitTime < current.element.startTime + current.element.duration;
  const scale = Math.min(62, 460 / Math.max(5, seconds(duration))) * zoom;
  const fullDuration = Math.max(15 / zoom, seconds(duration) + 2 / zoom);
  const step = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600].find((value) => value * scale >= 53) ?? 7200;
  const marks = Array.from({ length: Math.floor(fullDuration / step) + 1 }, (_, index) => index * step);
  const rows: { track: TimelineTrack | null; type: "text" | "video" | "audio"; label: string }[] = [
    ...(tracks.overlay.length ? tracks.overlay.map((track) => ({ track, type: "text" as const, label: "النص" })) : [{ track: null, type: "text" as const, label: "النص" }]),
    { track: tracks.main, type: "video", label: "الفيديو" },
    ...(tracks.audio.length ? tracks.audio.map((track) => ({ track, type: "audio" as const, label: "الصوت" })) : [{ track: null, type: "audio" as const, label: "الصوت" }]),
  ];
  const thumbnailById = new Map(assets.map((asset) => [asset.id, asset.thumbnailUrl]));
  const rowIcons = { text: Type, video: Film, audio: Music2 };

  function select(ref: ElementRef, startTime: number) {
    editor.selection.setSelectedElements({ elements: [ref] });
    editor.playback.seek({ time: ticks(seconds(startTime)) });
  }

  function seekFromPointer(event: PointerEvent<HTMLDivElement>) {
    if (!rulerRef.current || disabled) return;
    const position = event.clientX - rulerRef.current.getBoundingClientRect().left;
    editor.playback.seek({ time: ticks(Math.max(0, Math.min(seconds(duration), position / scale))) });
  }

  function split() {
    if (!current || !hasSplitPoint) return;
    editor.timeline.splitElements({ elements: selection, splitTime });
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (disabled || document.querySelector("dialog[open]") || (target instanceof HTMLElement && target.closest("input,textarea,select,button,[contenteditable]"))) return;
      const command = event.ctrlKey || event.metaKey;
      if (event.code === "Space" && !command) {
        event.preventDefault();
        editor.playback.toggle();
      } else if (command && event.code === "KeyZ") {
        event.preventDefault();
        if (event.shiftKey) editor.command.redo();
        else editor.command.undo();
      } else if (event.key === "Delete" && selection.length) {
        event.preventDefault();
        editor.timeline.deleteElements({ elements: selection });
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [disabled, editor, selection]);

  return (
    <section className="panel timeline-panel" aria-label="الخط الزمني">
      <div className="panel-heading timeline-heading">
        <h2>الخط الزمني</h2>
        <div className="timeline-tools">
          <button className="icon" title="تراجع" aria-label="تراجع" disabled={!canUndo || disabled} onClick={() => editor.command.undo()}><Undo2 /></button>
          <button className="icon" title="إعادة" aria-label="إعادة" disabled={!canRedo || disabled} onClick={() => editor.command.redo()}><Redo2 /></button>
          <span className="splitter" />
          <button className="quiet compact" disabled={!hasSplitPoint || disabled} onClick={split}><Scissors size={15} /> تقسيم</button>
          <button className="quiet compact" disabled={disabled} onClick={onAddText}><Type size={15} /> نص</button>
          <button className="icon danger" title="حذف المقطع" aria-label="حذف المقطع" disabled={!current || disabled} onClick={() => editor.timeline.deleteElements({ elements: selection })}><Trash2 /></button>
        </div>
        <div className="zoom-tools" dir="ltr">
          <button className="icon" title="تصغير الخط الزمني" aria-label="تصغير الخط الزمني" disabled={zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value / 1.4))}><Minus /></button>
          <span>{clock(seconds(duration))}</span>
          <button className="icon" title="تكبير الخط الزمني" aria-label="تكبير الخط الزمني" disabled={zoom >= 8} onClick={() => setZoom((value) => Math.min(8, value * 1.4))}><Plus /></button>
        </div>
      </div>
      <div className="timeline-scroll" dir="ltr">
        <div className="time-grid" style={{ "--timeline-width": fullDuration * scale + "px" } as React.CSSProperties}>
          <div className="track-label ruler-label" />
          <div className="time-ruler" ref={rulerRef} aria-hidden="true"
            onPointerDown={(event) => {
              if (event.button !== 0 || disabled) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event);
            }}>
            {marks.map((mark) => <span className="tick" key={mark} style={{ left: mark * scale }}>{clock(mark, step < 1)}</span>)}
          </div>
          {rows.map(({ track, type, label }) => {
            const TrackIcon = rowIcons[type];
            return (
              <div className="timeline-row" key={track?.id ?? type}>
                <div className="track-label" dir="rtl" title={label}><TrackIcon size={14} /><span>{label}</span></div>
                <div className="clip-lane" style={{ "--tick-step": step * scale + "px" } as React.CSSProperties}>
                  {track?.elements.map((element) => {
                    const selected = selection.some((item) => item.trackId === track.id && item.elementId === element.id);
                    const thumbnail = "mediaId" in element ? thumbnailById.get(element.mediaId) : undefined;
                    return (
                      <button className={"clip clip-" + type} aria-pressed={selected} key={element.id} title={element.name} disabled={disabled}
                        style={{ left: seconds(element.startTime) * scale, width: Math.max(8, seconds(element.duration) * scale) }}
                        onClick={() => select({ trackId: track.id, elementId: element.id }, element.startTime)}>
                        {thumbnail && <img src={thumbnail} alt="" />}
                        <span dir="auto">{element.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {duration > 0 && <div className="playhead" aria-hidden="true" style={{ "--playhead-x": seconds(time) * scale + "px" } as React.CSSProperties} />}
        </div>
      </div>
    </section>
  );
}

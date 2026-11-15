import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Clapperboard, Pause, Play, SkipBack, SkipForward, Upload, Volume2, VolumeX } from "lucide-react";
import { useEditor } from "@/editor/use-editor";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import { buildScene } from "@/services/renderer/scene-builder";
import { ZERO_MEDIA_TIME } from "@/wasm";
import { clock, seconds, ticks } from "./editor-tools";

export type PreviewGate = { suspended: boolean; pending: Promise<void> };

export function Preview({
  gate,
  importFiles,
  busy,
  onRenderError,
}: {
  gate: RefObject<PreviewGate>;
  importFiles: () => void;
  busy: boolean;
  onRenderError: () => void;
}) {
  const editor = useEditor();
  const settings = useEditor((e) => e.project.getActive().settings);
  const assets = useEditor((e) => e.media.getAssets());
  const tracks = useEditor((e) => e.scenes.getActiveScene().tracks);
  const duration = useEditor((e) => e.timeline.getTotalDuration());
  const time = useEditor((e) => e.playback.getCurrentTime());
  const playing = useEditor((e) => e.playback.getIsPlaying());
  const muted = useEditor((e) => e.playback.getVolume() === 0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { canvasSize, background, fps } = settings;
  const lastFrame = editor.timeline.getLastFrameTime();
  const scene = useMemo(() => buildScene({ tracks, mediaAssets: assets, duration, canvasSize, background, isPreview: true }), [
    tracks, assets, duration, canvasSize, background,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !duration) return;

    let stopped = false;
    let handle = 0;
    let drawn = -1;
    const renderer = new CanvasRenderer({ ...canvasSize, fps });
    async function draw() {
      if (stopped) return;
      const next = Math.min(editor.playback.getCurrentTime(), lastFrame);
      if (gate.current.suspended || next === drawn) {
        handle = requestAnimationFrame(draw);
        return;
      }

      await gate.current.pending;
      if (stopped) return;
      if (gate.current.suspended) {
        handle = requestAnimationFrame(draw);
        return;
      }
      drawn = next;
      gate.current.pending = renderer.renderToCanvas({ node: scene, time: next, targetCanvas: canvas! })
        .catch((error) => {
          console.error("Preview error:", error);
          if (!stopped) onRenderError();
        });
      await gate.current.pending;
      if (!stopped) handle = requestAnimationFrame(draw);
    }
    handle = requestAnimationFrame(draw);
    return () => {
      stopped = true;
      cancelAnimationFrame(handle);
    };
  }, [canvasSize, duration, editor, fps, gate, lastFrame, onRenderError, scene]);

  return (
    <section className="panel preview-panel" aria-label="معاينة الفيديو">
      <div className="panel-heading">
        <h2>المعاينة</h2>
        <span className="dimensions" dir="ltr">{canvasSize.width} × {canvasSize.height}</span>
      </div>
      <div className="preview-stage">
        <div className="preview-screen" style={{ "--canvas-ratio": canvasSize.width / canvasSize.height } as React.CSSProperties}>
          {duration > 0 ? (
            <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} aria-label="إطار الفيديو" />
          ) : (
            <div className="preview-empty">
              <span className="stage-corner top-start" /><span className="stage-corner top-end" />
              <span className="stage-corner bottom-start" /><span className="stage-corner bottom-end" />
              <div className="preview-empty-label">
                <Clapperboard size={25} />
                <span>أضف مقطعًا إلى الخط الزمني</span>
                <button className="quiet compact" onClick={importFiles} disabled={busy}><Upload size={14} /> استيراد</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="transport" dir="ltr">
        <div className="timecode" aria-label="الوقت الحالي">{clock(seconds(time), true)}</div>
        <div className="transport-buttons">
          <button className="icon" title="إلى البداية" aria-label="إلى البداية" disabled={!duration || busy} onClick={() => editor.playback.seek({ time: ZERO_MEDIA_TIME })}><SkipBack /></button>
          <button className="icon play" aria-label={playing ? "إيقاف مؤقت" : "تشغيل"} title={playing ? "إيقاف مؤقت" : "تشغيل"} disabled={!duration || busy} onClick={() => editor.playback.toggle()}>{playing ? <Pause /> : <Play />}</button>
          <button className="icon" title="إلى النهاية" aria-label="إلى النهاية" disabled={!duration || busy} onClick={() => editor.playback.seek({ time: duration })}><SkipForward /></button>
        </div>
        <button className="icon" aria-label={muted ? "تشغيل صوت المعاينة" : "كتم صوت المعاينة"} title={muted ? "تشغيل صوت المعاينة" : "كتم صوت المعاينة"} disabled={!duration} onClick={() => editor.playback.toggleMute()}>{muted ? <VolumeX /> : <Volume2 />}</button>
      </div>
      <input className="scrubber" dir="ltr" type="range" aria-label="موضع التشغيل" min="0" max={Math.max(0.01, seconds(duration))} step="0.01" value={seconds(time)}
        disabled={!duration || busy} onChange={(event) => editor.playback.seek({ time: ticks(event.currentTarget.valueAsNumber) })} />
    </section>
  );
}

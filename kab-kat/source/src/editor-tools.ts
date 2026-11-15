import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/media/types";
import { buildElementFromMedia, buildTextElement } from "@/timeline/element-utils";
import type { ElementRef, SceneTracks, TimelineElement, TimelineTrack } from "@/timeline/types";
import { mediaTimeFromSeconds, mediaTimeToSeconds, roundMediaTime, ZERO_MEDIA_TIME } from "@/wasm";

export const ratios = [
  { label: "16:9", width: 1280, height: 720, title: "أفقي" },
  { label: "9:16", width: 720, height: 1280, title: "عمودي" },
  { label: "1:1", width: 720, height: 720, title: "مربّع" },
] as const;

export const ticks = (seconds: number) => mediaTimeFromSeconds({ seconds });
export const seconds = (time: number) => mediaTimeToSeconds({ time: roundMediaTime({ time }) });

export function clock(time: number, withFraction = false) {
  const centis = Math.floor(Math.max(0, time) * 100 + 0.00001);
  const minutes = Math.floor(centis / 6000);
  const wholeSeconds = Math.floor(centis / 100) % 60;
  const base = [minutes, wholeSeconds].map((part) => String(part).padStart(2, "0")).join(":");
  return withFraction ? base + "." + String(centis % 100).padStart(2, "0") : base;
}

export function trackList(tracks: SceneTracks): TimelineTrack[] {
  return [...tracks.overlay, tracks.main, ...tracks.audio];
}

export function getClip(tracks: SceneTracks, selection: ElementRef[]) {
  const current = selection[0];
  const track = current && trackList(tracks).find((item) => item.id === current.trackId);
  const element = track?.elements.find((item) => item.id === current.elementId);
  return track && element ? { track, element } : null;
}

export function endOf(elements: readonly TimelineElement[]) {
  return roundMediaTime({
    time: elements.reduce((end, element) => Math.max(end, element.startTime + element.duration), 0),
  });
}

export async function appendAsset(editor: EditorCore, asset: MediaAsset) {
  const { main } = editor.scenes.getActiveScene().tracks;
  const project = editor.project.getActive();
  const startTime = asset.type === "audio" ? editor.playback.getCurrentTime() : endOf(main.elements);
  const previousSize = project.settings.canvasSize;
  editor.timeline.insertElement({
    element: buildElementFromMedia({
      mediaId: asset.id,
      mediaType: asset.type,
      name: asset.name,
      duration: ticks(asset.type === "image" ? 3 : Math.max(0.1, asset.duration || 0)),
      startTime,
    }),
    placement: asset.type === "audio" ? { mode: "auto" } : { mode: "explicit", trackId: main.id },
  });
  // Keep the output proportions selected in Kab Kat after OpenCut infers the first source size.
  if (asset.type !== "audio") {
    await editor.project.updateSettings({ settings: { canvasSize: previousSize }, pushHistory: false });
  }
  editor.playback.seek({ time: startTime });
}

export async function addTitle(editor: EditorCore) {
  const projectId = editor.project.getActive().metadata.id;
  const end = editor.timeline.getTotalDuration();
  const startTime = end
    ? roundMediaTime({ time: Math.min(editor.playback.getCurrentTime(), Math.max(0, end - ticks(0.1))) })
    : ZERO_MEDIA_TIME;
  const duration = end ? roundMediaTime({ time: Math.min(ticks(3), end - startTime) }) : ticks(3);
  await document.fonts.load('700 24px "Cairo Variable"', "عنوان جديد");
  if (editor.project.getActiveOrNull()?.metadata.id !== projectId) return;
  editor.timeline.insertElement({
    element: buildTextElement({
      startTime,
      raw: {
        name: "عنوان جديد",
        duration,
        params: { content: "عنوان جديد", fontFamily: "Cairo Variable", fontWeight: "bold", fontSize: 8 },
      },
    }),
    placement: { mode: "auto", trackType: "text" },
  });
  editor.playback.seek({ time: startTime });
}

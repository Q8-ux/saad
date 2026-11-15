import { isGpuAvailable } from "@/services/renderer/gpu-renderer";
import { wasmCompositor as gpuCompositor } from "@/services/renderer/compositor/wasm-compositor";
import type { FrameDescriptor, TextureUploadDescriptor } from "@/services/renderer/compositor/types";

class CanvasCompositor {
  private output: HTMLCanvasElement | null = null;
  private textures = new Map<string, { source: CanvasImageSource; hash?: string }>();

  ensureInitialized({ width, height }: { width: number; height: number }) {
    const canvas = this.getCanvas();
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
  }

  getCanvas() {
    this.output ??= document.createElement("canvas");
    return this.output;
  }

  syncTextures(descriptors: TextureUploadDescriptor[]) {
    const next = new Map<string, { source: CanvasImageSource; hash?: string }>();
    for (const texture of descriptors) {
      if (texture.kind === "external") {
        next.set(texture.id, { source: texture.source });
        continue;
      }
      const cached = this.textures.get(texture.id);
      if (cached?.hash === texture.contentHash) {
        next.set(texture.id, cached);
        continue;
      }
      const canvas = new OffscreenCanvas(texture.width, texture.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas texture context unavailable");
      texture.draw(ctx);
      next.set(texture.id, { source: canvas, hash: texture.contentHash });
    }
    this.textures = next;
  }

  render(frame: FrameDescriptor) {
    const ctx = this.getCanvas().getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D compositor unavailable");
    const [red, green, blue, alpha] = frame.clear.color;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "copy";
    ctx.fillStyle = `rgba(${red * 255},${green * 255},${blue * 255},${alpha})`;
    ctx.fillRect(0, 0, frame.width, frame.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingQuality = "high";

    for (const layer of frame.items) {
      if (layer.type !== "layer") continue;
      const texture = this.textures.get(layer.textureId);
      if (!texture) continue;
      const { centerX, centerY, width, height, rotationDegrees, flipX, flipY } = layer.transform;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      if (layer.blendMode !== "normal") ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationDegrees * Math.PI / 180);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.drawImage(texture.source, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }
}

const canvasCompositor = new CanvasCompositor();
let active = canvasCompositor as CanvasCompositor | typeof gpuCompositor;

export const wasmCompositor = {
  ensureInitialized(size: { width: number; height: number }) {
    if (isGpuAvailable()) {
      try {
        gpuCompositor.ensureInitialized(size);
        active = gpuCompositor;
        return;
      } catch (error) {
        console.warn("OpenCut compositor could not initialize. Using Canvas 2D.", error);
      }
    }
    active = canvasCompositor;
    active.ensureInitialized(size);
  },
  getCanvas() { return active.getCanvas(); },
  syncTextures(textures: TextureUploadDescriptor[]) { active.syncTextures(textures); },
  render(frame: FrameDescriptor) { active.render(frame); },
};

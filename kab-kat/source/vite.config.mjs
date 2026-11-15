import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const local = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^\.\/compositor\/wasm-compositor$/, replacement: local("./src/compositor.ts") },
      { find: /^opencut-wasm$/, replacement: local("./src/opencut-wasm.mjs") },
      { find: "@", replacement: local("./.upstream/apps/web/src") },
    ],
  },
  build: { target: "esnext", license: { fileName: "THIRD-PARTY-LICENSES.txt" } },
});

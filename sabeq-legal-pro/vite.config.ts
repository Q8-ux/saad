import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "source",
  base: "/saad/sabeq-legal-pro/",
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true },
});

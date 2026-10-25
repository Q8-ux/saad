import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { groupPostArtworks } from "./app/group-post-artworks";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const serviceOrigin = "https://sabeq-legal-public.centrino.chatgpt.site";
const githubBase = "/saad/sabeq-legal/";

function githubBrandAssets(): Plugin {
  const assets = [
    ...Object.values(groupPostArtworks).map(artwork => ({ source: artwork.src, input: `public${artwork.src}`, output: artwork.src.slice(1) })),
    ...["privacy.html", "privacy-en.html", "privacy-ur.html", "privacy.css", "privacy.js", "payment-return.html"].map(name => ({ source: `/${name}`, input: `public/${name}`, output: name })),
    { source: "/source.html", input: "public/source.html", output: "source.html" },
    { source: "/source-viewer.js", input: "public/source-viewer.js", output: "source-viewer.js" },
    { source: "/images/sabeq-assistant-avatar.jpg", input: "public/images/sabeq-assistant-avatar.jpg", output: "images/sabeq-assistant-avatar.jpg" },
    ...["dr-khalifa-original-navy.png", "khalid-alhabib-navy.png", "mishal-metaab-navy.png", "mohammed-saheb-navy.png", "abdulaziz-mashaan-navy.png", "hamad-almadi-navy.png", "khalid-aldhafiri-navy.png"].map(name => ({ source: `/images/team/${name}`, input: `public/images/team/${name}`, output: `images/team/${name}` })),
    { source: "/fonts/AL-Mohanad.ttf", input: "public/fonts/AL-Mohanad.ttf", output: "assets/al-mohanad.ttf" },
    { source: "/fonts/AL-Mohanad-Bold.ttf", input: "public/fonts/AL-Mohanad-Bold.ttf", output: "assets/al-mohanad-bold.ttf" },
    { source: "/fonts/AL-Mohanad-Extra-Bold.ttf", input: "public/fonts/AL-Mohanad-Extra-Bold.ttf", output: "assets/al-mohanad-extra-bold.ttf" },
    { source: "/images/brand/sabeq-hero-kuwait.jpg", input: "public/images/brand/sabeq-hero-kuwait.jpg", output: "assets/sabeq-hero-kuwait.jpg" },
    { source: "/images/brand/sabeq-hero-kuwait-mobile.jpg", input: "public/images/brand/sabeq-hero-kuwait-mobile.jpg", output: "assets/sabeq-hero-kuwait-mobile.jpg" },
  ];

  return {
    name: "sabeq-github-brand-assets",
    enforce: "pre",
    buildStart() {
      for (const asset of assets) {
        this.emitFile({
          type: "asset",
          fileName: asset.output,
          source: ["privacy.css", "payment-return.html"].includes(asset.output) ? readFileSync(path.join(projectRoot, asset.input), "utf8").replaceAll("./fonts/AL-Mohanad.ttf", "./assets/al-mohanad.ttf").replaceAll("./fonts/AL-Mohanad-Bold.ttf", "./assets/al-mohanad-bold.ttf") : readFileSync(path.join(projectRoot, asset.input)),
        });
      }
    },
    transform(code, id) {
      if (!id.includes("app/globals.css")) return null;
      let transformed = code;
      for (const asset of assets) {
        transformed = transformed.replaceAll(asset.source, `${githubBase}${asset.output}`);
      }
      return { code: transformed, map: null };
    },
    closeBundle() {
      // Preserve the reviewed additions already present on the published GitHub page.
      const index = path.join(projectRoot, "github-pages-dist/index.html");
      const html = readFileSync(index, "utf8");
      writeFileSync(index, html.replace("</head>", `  <link rel="stylesheet" href="./motion/sabeq-motion.css?v=20261021" />\n    <link rel="stylesheet" href="./fonts/cairo.css?v=20261025-3" />\n    <script type="module" src="/saad/sabeq-legal/assets/service-motion-v1.js"></script>\n  </head>`));
    },
  };
}

export default defineConfig({
  root: path.join(projectRoot, "github-pages"),
  base: githubBase,
  publicDir: false,
  resolve: {
    alias: {
      "@": projectRoot,
      "next/image": path.join(projectRoot, "github-pages/next-image.tsx"),
    },
  },
  plugins: [githubBrandAssets(), react()],
  css: {
    postcss: path.join(projectRoot, "postcss.config.mjs"),
  },
  build: {
    outDir: path.join(projectRoot, "github-pages-dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
  define: {
    __SABEQ_SERVICE_ORIGIN__: JSON.stringify(serviceOrigin),
  },
});

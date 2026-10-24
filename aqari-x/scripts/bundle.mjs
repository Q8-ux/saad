import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(".bundle", { recursive: true });
await build({
  entryPoints: ["server/index.mjs"],
  outfile: ".bundle/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  minify: true,
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; import { fileURLToPath as __toPath } from "node:url"; import { dirname as __dir } from "node:path"; const require = __createRequire(import.meta.url); const __filename=__toPath(import.meta.url); const __dirname=__dir(__filename);',
  },
});
console.log("Function bundle written");

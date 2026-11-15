import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const revision = "cf5e79e919144200294fb9fed22a222592a0aeea";
const upstream = "https://github.com/OpenCut-app/opencut-classic.git";
const root = fileURLToPath(new URL("../", import.meta.url));
const checkout = resolve(root, ".upstream");
mkdirSync(checkout, { recursive: true });

function gitRaw(...args) {
  return execFileSync("git", ["-C", checkout, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function git(...args) {
  return gitRaw(...args).trim();
}

if (!existsSync(resolve(checkout, ".git"))) {
  git("init", "--quiet");
}
if (spawnSync("git", ["-C", checkout, "cat-file", "-e", revision + "^{commit}"]).status !== 0) {
  const remote = process.env.KAB_KAT_UPSTREAM || upstream;
  git("fetch", "--quiet", "--depth=1", "--no-tags", remote, revision);
}
if (!existsSync(resolve(checkout, "apps/web/src/core/index.ts")) || git("rev-parse", "HEAD") !== revision) {
  git("checkout", "--quiet", "--detach", revision);
}

function adaptSource(path, transform) {
  const relativePath = "apps/web/src/" + path;
  const file = resolve(checkout, relativePath);
  const original = gitRaw("show", revision + ":" + relativePath);
  const next = transform(original);
  if (readFileSync(file, "utf8") !== next) writeFileSync(file, next);
}

adaptSource("services/storage/service.ts", (source) => source
  .replaceAll("video-editor-", "kab-kat-")
  .replaceAll("media-files-${", "kab-kat-media-files-${"));
adaptSource("services/storage/migrations/runner.ts", (source) => source
  .replaceAll("video-editor-", "kab-kat-"));
adaptSource("fonts/google-fonts.ts", (source) => source
  .replace("!SYSTEM_FONTS.has(family)", '!SYSTEM_FONTS.has(family) && family !== "Cairo Variable"'));

const publicPath = resolve(root, "public");
mkdirSync(publicPath, { recursive: true });
writeFileSync(resolve(publicPath, "OPEN-CUT-LICENSE.txt"), gitRaw("show", revision + ":LICENSE"));

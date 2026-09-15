import { spawnSync } from "node:child_process";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync("node_modules/.bin/vite", ["build"], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
// Preserve the existing /demo/ route and other unrelated files.
cpSync(`${root}dist/`, root, { recursive: true });

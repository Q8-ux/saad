import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
const original = await readFile(path, "utf8");
const patched = original.replaceAll(
  "event.currentTarget.reset();",
  '(event.target as HTMLFormElement).reset();',
);

if (patched !== original) {
  await writeFile(path, patched, "utf8");
  console.log("Applied Render async form reset compatibility patch.");
} else {
  console.log("Render async form reset patch already applied or not required.");
}

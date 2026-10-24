import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import app from "./index.mjs";
const root = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const portArgument = process.argv.indexOf("--port");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".webp": "image/webp",
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers))
        if (v) headers.set(k, String(v));
      const chunks = [];
      let size = 0;
      for await (const b of req) {
        size += b.length;
        if (size > 2500000) {
          res.writeHead(413);
          res.end();
          return;
        }
        chunks.push(b);
      }
      const r = await app.fetch(
        new Request(
          "http://localhost" + url.pathname.replace("/api", "") + url.search,
          {
            method: req.method,
            headers,
            body: ["GET", "HEAD"].includes(req.method)
              ? undefined
              : Buffer.concat(chunks),
          },
        ),
      );
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    let file = resolve(root, "." + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + sep) && file !== root)
      throw new Error("bad path");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const bytes = await readFile(file);
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(
  Number(
    process.env.PORT ||
      (portArgument >= 0 ? process.argv[portArgument + 1] : 3000),
  ),
  "0.0.0.0",
  () => console.log("Aqari X preview is ready"),
);

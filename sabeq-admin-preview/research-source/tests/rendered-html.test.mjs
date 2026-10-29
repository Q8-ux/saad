import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const expectedPageTitle = /<title>لوحة تحكم مجموعة سابق القانونية<\/title>/i;

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function waitForResponse(url, processState) {
  const deadline = Date.now() + 45_000;
  let lastError;
  while (Date.now() < deadline) {
    if (processState.exitCode !== null) {
      throw new Error(
        `Vite exited early with ${processState.exitCode}.\n${processState.output}`,
      );
    }
    try {
      const response = await fetch(url, {
        headers: { accept: "text/html" },
      });
      if (response.status < 500) return response;
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Timed out waiting for Vite: ${String(lastError)}\n${processState.output}`,
  );
}

test(
  "renders safely in the Cloudflare development runtime",
  { timeout: 60_000 },
  async () => {
    const port = await reservePort();
    const vitePath = path.join(projectRoot, "node_modules", ".bin", "vite");
    const child = spawn(
      vitePath,
      ["--host", "127.0.0.1", "--port", String(port), "--strictPort"],
      {
        cwd: projectRoot,
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          WRANGLER_LOG_PATH: ".wrangler/wrangler-test.log",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const processState = { exitCode: null, output: "" };
    child.stdout.on("data", (chunk) => {
      processState.output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      processState.output += chunk.toString();
    });
    child.once("exit", (code) => {
      processState.exitCode = code;
    });

    try {
      const response = await waitForResponse(
        `http://127.0.0.1:${port}/`,
        processState,
      );
      assert.equal(response.status, 200);
      assert.match(
        response.headers.get("content-type") ?? "",
        /^text\/html\b/i,
      );
      assert.equal(response.headers.get("x-frame-options"), "DENY");
      assert.match(
        response.headers.get("content-security-policy") ?? "",
        /frame-ancestors\s+'none'/i,
      );
      const html = await response.text();
      assert.match(html, expectedPageTitle);
      assert.match(html, /<meta name="robots" content="noindex, nofollow"\/>/i);
    } finally {
      if (child.exitCode === null) {
        if (process.platform === "win32") child.kill("SIGTERM");
        else process.kill(-child.pid, "SIGTERM");
      }
    }
  },
);

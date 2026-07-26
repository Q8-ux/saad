const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");
const { io } = require("socket.io-client");

function waitForServer(child, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error(`Server did not become ready.\n${output}`));
    }, timeoutMs);

    const onData = chunk => {
      output += chunk.toString();
      if (!output.includes("listening on")) return;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      resolve();
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", chunk => {
      output += chunk.toString();
    });
    child.once("exit", code => {
      clearTimeout(timer);
      reject(new Error(`Server exited with code ${code}.\n${output}`));
    });
  });
}

function emitWithReply(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} timed out`)), 4_000);
    socket.emit(event, payload, response => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

async function waitFor(predicate, timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error("Timed out while waiting for the UI state.");
}

test("the application serves V5 and starts a solo Socket.IO room", async t => {
  const port = 32_000 + (process.pid % 10_000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server-pro.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DEV_AUTH_BYPASS: "1",
      NODE_ENV: "test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => {
    if (!child.killed) child.kill("SIGTERM");
  });

  await waitForServer(child);

  const [healthResponse, versionResponse, meResponse, pageResponse] = await Promise.all([
    fetch(`${baseUrl}/healthz`),
    fetch(`${baseUrl}/version`),
    fetch(`${baseUrl}/api/me`),
    fetch(`${baseUrl}/`)
  ]);

  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).ok, true);
  assert.equal((await versionResponse.json()).version, "5.0.0");
  assert.equal((await meResponse.json()).user.id, "local-demo");
  const pageHtml = await pageResponse.text();
  assert.match(pageHtml, /جاك الذيب/);
  assert.equal(pageResponse.headers.get("x-jack-altheeb-version"), "jack-altheeb-v5-premium");
  assert.match(pageResponse.headers.get("content-security-policy"), /default-src 'self'/);

  const socket = io(baseUrl, {
    transports: ["websocket"],
    forceNew: true,
    reconnection: false
  });
  t.after(() => socket.close());

  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });

  const roomStatePromise = new Promise(resolve => socket.once("room_state", resolve));
  const created = await emitWithReply(socket, "create_solo", {
    avatarIndex: 2,
    tutorial: true
  });
  const state = await roomStatePromise;

  assert.equal(created.ok, true);
  assert.match(created.code, /^[A-Z2-9]{5}$/);
  assert.equal(state.status, "playing");
  assert.equal(state.mode, "solo");
  assert.equal(state.tutorial, true);
  assert.equal(state.players.length, 2);
  assert.equal(state.players[1].isBot, true);
  assert.equal(state.players[1].avatarIndex, 4);
  assert.equal("userId" in state.players[0], false);

  const illegalStart = await emitWithReply(socket, "start_game", { code: created.code });
  const illegalRestart = await emitWithReply(socket, "restart_game", { code: created.code });
  assert.equal(illegalStart.ok, false);
  assert.equal(illegalRestart.ok, false);
  assert.equal((await emitWithReply(socket, "leave_room", {})).ok, true);
  socket.close();

  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => runtimeErrors.push(error));
  virtualConsole.on("error", error => runtimeErrors.push(error));

  const dom = new JSDOM(pageHtml, {
    url: `${baseUrl}/`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole
  });
  let uiSocket = null;
  t.after(() => {
    uiSocket?.close();
    dom.window.close();
  });

  dom.window.fetch = (input, options) => fetch(new URL(String(input), baseUrl), options);
  dom.window.io = options => {
    uiSocket = io(baseUrl, {
      ...options,
      transports: ["websocket"],
      forceNew: true,
      reconnection: false
    });
    return uiSocket;
  };
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async () => {} }
  });
  Object.defineProperty(dom.window.navigator, "serviceWorker", {
    configurable: true,
    value: { register: async () => ({}) }
  });

  const authClient = fs.readFileSync(path.join(process.cwd(), "public/auth-client.js"), "utf8");
  const gameClient = fs.readFileSync(path.join(process.cwd(), "public/app.js"), "utf8");
  dom.window.eval(authClient);
  dom.window.eval(gameClient);

  await waitFor(() => dom.window.document.querySelector("#authGate.hidden"));
  await waitFor(() => dom.window.document.querySelector("#connectionBadge.online"));
  assert.equal(dom.window.document.querySelectorAll(".avatar-option").length, 4);
  assert.equal(dom.window.document.querySelectorAll(".track-cell").length, 40);
  assert.equal(dom.window.document.querySelectorAll(".finish-cell").length, 16);

  dom.window.document.querySelector("#soloBtn").click();
  await waitFor(() => dom.window.document.querySelector("#gameView.active"));
  await waitFor(() => dom.window.document.querySelectorAll("#board .token").length === 8);

  assert.match(dom.window.document.querySelector("#miniRoomCode").textContent, /فردي/);
  assert.equal(dom.window.document.querySelectorAll("#gamePlayers .game-player").length, 2);
  assert.equal(dom.window.document.querySelector("#tutorialPanel").classList.contains("hidden"), true);
  assert.deepEqual(runtimeErrors, []);
});

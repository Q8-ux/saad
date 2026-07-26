const path = require("path");
const { randomInt, randomUUID } = require("crypto");
const express = require("express");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const { setupAuth, initDatabase, authenticateSocket, recordResult } = require("./auth");
const {
  MAX_PLAYERS,
  TOKENS_PER_PLAYER,
  TRACK_LENGTH,
  FINISH_PROGRESS,
  SAFE_CELLS,
  rollDie,
  validMoves,
  advanceTurn,
  resetRoom,
  chooseBestMove,
  applyMove
} = require("./game-core");

const PORT = Number(process.env.PORT) || 3000;
const RELEASE = process.env.APP_RELEASE || "jack-altheeb-v5-premium";
const ROOM_IDLE_TTL = 30 * 60 * 1000;
const PLAYER_RECONNECT_GRACE = 5 * 60 * 1000;
const ACTION_COOLDOWN = 220;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use((req, res, next) => {
  res.setHeader("X-Jack-Altheeb-Version", RELEASE);
  if (req.path === "/" || req.path.endsWith(".html") || req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  next();
});

setupAuth(app);
app.get("/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    app: "jack-altheeb",
    release: RELEASE,
    version: "5.0.0",
    commit: process.env.RENDER_GIT_COMMIT || null
  });
});
app.get("/healthz", (_req, res) => res.json({ ok: true, release: RELEASE }));
app.use(express.static(path.join(__dirname, "public"), {
  etag: true,
  lastModified: true,
  maxAge: "7d",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html") || filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }
  }
}));

const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 100_000,
  pingInterval: 20_000,
  pingTimeout: 15_000
});
io.use(authenticateSocket);

const rooms = new Map();

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => alphabet[randomInt(0, alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function normalizeRoomCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z2-9]{5}$/.test(code) ? code : "";
}

function safeAvatar(value, fallback = 0) {
  const avatarIndex = Number(value);
  return Number.isInteger(avatarIndex) && avatarIndex >= 0 && avatarIndex <= 3
    ? avatarIndex
    : fallback;
}

function createPlayer(socket, avatarIndex = 0, isBot = false) {
  if (isBot) {
    return {
      id: `BOT:${randomUUID()}`,
      userId: null,
      name: "الذيب الآلي",
      avatarIndex: 4,
      tokens: Array(TOKENS_PER_PLAYER).fill(-1),
      connected: true,
      disconnectedAt: null,
      isBot: true
    };
  }

  const user = socket.data.user;
  return {
    id: socket.id,
    userId: user.id,
    name: user.username,
    avatarIndex: safeAvatar(avatarIndex, user.avatarIndex || 0),
    tokens: Array(TOKENS_PER_PLAYER).fill(-1),
    connected: true,
    disconnectedAt: null,
    isBot: false
  };
}

function currentPlayer(room) {
  return room.players[room.turnIndex] || null;
}

function touch(room) {
  room.updatedAt = Date.now();
}

function createRoom({ code, mode, tutorial, host, players, status }) {
  const now = Date.now();
  return {
    code,
    mode,
    tutorial: Boolean(tutorial),
    status,
    hostId: host.id,
    players,
    turnIndex: 0,
    lastRoll: null,
    pendingRoll: false,
    availableMoves: [],
    message: mode === "solo"
      ? "بدأ التحدي الفردي. أنت تبدأ أولًا!"
      : "تم إنشاء الغرفة. شارك الرمز مع أصدقائك.",
    winnerId: null,
    lastAction: null,
    botTimer: null,
    settled: false,
    revision: 0,
    createdAt: now,
    updatedAt: now
  };
}

function publicPlayer(player) {
  const { userId, disconnectedAt, ...safePlayer } = player;
  return safePlayer;
}

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    tutorial: room.tutorial,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map(publicPlayer),
    turnIndex: room.turnIndex,
    lastRoll: room.lastRoll,
    pendingRoll: room.pendingRoll,
    availableMoves: room.availableMoves,
    message: room.message,
    winnerId: room.winnerId,
    lastAction: room.lastAction,
    safeCells: [...SAFE_CELLS],
    trackLength: TRACK_LENGTH,
    finishProgress: FINISH_PROGRESS,
    revision: room.revision,
    serverTime: Date.now()
  };
}

function emitRoom(room) {
  room.revision += 1;
  touch(room);
  io.to(room.code).emit("room_state", publicRoom(room));
}

function clearRoom(room) {
  clearTimeout(room.botTimer);
  rooms.delete(room.code);
}

function findRoomForUser(userId) {
  if (!userId) return null;
  return [...rooms.values()].find(room =>
    room.players.some(player => !player.isBot && String(player.userId) === String(userId))
  ) || null;
}

function removeDisconnectedLobbyPlayers(room) {
  room.players = room.players.filter(player => player.isBot || player.connected);
  if (room.turnIndex >= room.players.length) room.turnIndex = 0;
}

function migrateHost(room) {
  const hostStillPresent = room.players.some(player => player.id === room.hostId && player.connected);
  if (hostStillPresent) return;
  const nextHost = room.players.find(player => !player.isBot && player.connected);
  if (nextHost) room.hostId = nextHost.id;
}

async function settleRoom(room, winner) {
  if (room.settled) return;
  room.settled = true;
  await Promise.all(room.players
    .filter(player => !player.isBot && player.userId)
    .map(player => recordResult(player.userId, player.id === winner.id).catch(error => {
      console.error("record result failed", error);
    })));
}

function finishMove(room, tokenIndex) {
  const result = applyMove(room, tokenIndex);
  if (!result.ok) return result;

  const { player, roll, captured, won, extraTurn } = result;
  if (won) {
    room.status = "finished";
    room.winnerId = player.id;
    room.message = `🏆 ${player.name} فاز بلقب جاك الذيب!`;
    void settleRoom(room, player);
    return result;
  }

  if (captured > 0) {
    room.lastRoll = null;
    room.message = `🐺 ${player.name} صاد ${captured} دبوس وحصل على رمية إضافية!`;
  } else if (extraTurn && roll === 6) {
    room.lastRoll = null;
    room.message = `🎲 ${player.name} رمى 6 وله رمية إضافية.`;
  } else {
    room.message = `${player.name} تحرك ${roll} خانات.`;
    advanceTurn(room);
  }
  return result;
}

function scheduleBot(room) {
  clearTimeout(room.botTimer);
  const bot = currentPlayer(room);
  if (room.status !== "playing" || !bot?.isBot) return;

  room.message = "🐺 الذيب الآلي يحلل المسار...";
  emitRoom(room);

  room.botTimer = setTimeout(() => {
    if (!rooms.has(room.code) || room.status !== "playing" || currentPlayer(room)?.id !== bot.id) return;

    const roll = rollDie();
    const moves = validMoves(bot, roll);
    room.lastRoll = roll;
    room.availableMoves = moves;
    room.lastAction = { type: "roll", playerId: bot.id, roll, validMoves: moves };

    if (!moves.length) {
      room.message = `الذيب الآلي رمى ${roll} ولا توجد له حركة.`;
      advanceTurn(room);
      emitRoom(room);
      scheduleBot(room);
      return;
    }

    room.pendingRoll = true;
    room.message = `الذيب الآلي رمى ${roll} ويختار أفضل حركة...`;
    emitRoom(room);

    room.botTimer = setTimeout(() => {
      if (!rooms.has(room.code) || room.status !== "playing" || currentPlayer(room)?.id !== bot.id) return;
      const tokenIndex = chooseBestMove(room, moves);
      finishMove(room, tokenIndex);
      emitRoom(room);
      scheduleBot(room);
    }, 850);
  }, 950);
}

function actionAllowed(socket, action) {
  const now = Date.now();
  const previous = socket.data.lastAction || {};
  const elapsed = now - (previous.at || 0);
  if (previous.type !== action) {
    socket.data.lastAction = { type: action, at: now };
    return true;
  }
  if (elapsed < ACTION_COOLDOWN) return false;
  socket.data.lastAction = { type: action, at: now };
  return true;
}

function activeRoomFor(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}

function attachPlayerToSocket(socket, room, player) {
  const oldId = player.id;
  player.id = socket.id;
  player.connected = true;
  player.disconnectedAt = null;
  player.avatarIndex = safeAvatar(player.avatarIndex, socket.data.user.avatarIndex || 0);

  if (room.hostId === oldId) room.hostId = socket.id;
  if (room.winnerId === oldId) room.winnerId = socket.id;
  if (room.lastAction?.playerId === oldId) room.lastAction.playerId = socket.id;

  socket.join(room.code);
  socket.data.roomCode = room.code;
  socket.emit("session_resume", {
    ok: true,
    code: room.code,
    playerId: socket.id,
    room: publicRoom(room)
  });
  room.message = `${player.name} عاد إلى الجولة.`;
  emitRoom(room);
}

function tryResume(socket) {
  const room = findRoomForUser(socket.data.user.id);
  if (!room) return false;
  const player = room.players.find(item =>
    !item.isBot && String(item.userId) === String(socket.data.user.id)
  );
  if (!player) return false;

  const oldSocket = io.sockets.sockets.get(player.id);
  attachPlayerToSocket(socket, room, player);
  if (oldSocket && oldSocket.id !== socket.id) oldSocket.disconnect(true);
  return true;
}

io.on("connection", socket => {
  socket.emit("auth_user", socket.data.user);
  tryResume(socket);

  socket.on("create_room", ({ avatarIndex, tutorial } = {}, reply = () => {}) => {
    if (findRoomForUser(socket.data.user.id)) {
      return reply({ ok: false, error: "أنت داخل غرفة حالياً. غادرها أولاً." });
    }

    const code = createRoomCode();
    const host = createPlayer(socket, avatarIndex);
    const room = createRoom({
      code,
      mode: "online",
      tutorial,
      host,
      players: [host],
      status: "lobby"
    });
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("create_solo", ({ avatarIndex, tutorial } = {}, reply = () => {}) => {
    if (findRoomForUser(socket.data.user.id)) {
      return reply({ ok: false, error: "لديك جولة مفتوحة بالفعل." });
    }

    const code = createRoomCode();
    const host = createPlayer(socket, avatarIndex);
    const room = createRoom({
      code,
      mode: "solo",
      tutorial,
      host,
      players: [host, createPlayer(null, 4, true)],
      status: "playing"
    });
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("join_room", ({ code, avatarIndex } = {}, reply = () => {}) => {
    const normalizedCode = normalizeRoomCode(code);
    const room = rooms.get(normalizedCode);
    if (!normalizedCode || !room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.mode !== "online" || room.status !== "lobby") {
      return reply({ ok: false, error: "لا يمكن الانضمام لهذه الجولة الآن." });
    }

    const existing = findRoomForUser(socket.data.user.id);
    if (existing && existing.code !== room.code) {
      return reply({ ok: false, error: "أنت داخل غرفة أخرى حالياً." });
    }

    const returningPlayer = room.players.find(player =>
      !player.isBot && String(player.userId) === String(socket.data.user.id)
    );
    if (returningPlayer) {
      attachPlayerToSocket(socket, room, returningPlayer);
      return reply({ ok: true, code: room.code, playerId: socket.id, resumed: true });
    }

    removeDisconnectedLobbyPlayers(room);
    if (room.players.length >= MAX_PLAYERS) return reply({ ok: false, error: "الغرفة مكتملة." });

    const joinedPlayer = createPlayer(socket, avatarIndex);
    room.players.push(joinedPlayer);
    socket.join(room.code);
    socket.data.roomCode = room.code;
    room.message = `${joinedPlayer.name} انضم إلى الغرفة.`;
    reply({ ok: true, code: room.code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("start_game", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(normalizeRoomCode(code));
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.hostId !== socket.id) return reply({ ok: false, error: "فقط مدير الغرفة يبدأ اللعبة." });
    if (room.mode !== "online" || room.status !== "lobby") {
      return reply({ ok: false, error: "لا يمكن بدء هذه الجولة الآن." });
    }

    removeDisconnectedLobbyPlayers(room);
    if (room.players.filter(player => player.connected).length < 2) {
      return reply({ ok: false, error: "تحتاج لاعبين متصلين على الأقل." });
    }

    resetRoom(room);
    room.status = "playing";
    room.turnIndex = randomInt(0, room.players.length);
    room.message = `بدأت اللعبة. الدور على ${currentPlayer(room).name}.`;
    reply({ ok: true });
    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("roll_dice", ({ code } = {}, reply = () => {}) => {
    if (!actionAllowed(socket, "roll")) return reply({ ok: false, error: "تمهل لحظة قبل الرمية التالية." });
    const room = rooms.get(normalizeRoomCode(code));
    const player = room && currentPlayer(room);
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    if (!player || player.id !== socket.id) return reply({ ok: false, error: "ليس دورك." });
    if (room.pendingRoll) return reply({ ok: false, error: "اختر دبوساً أولاً." });

    const roll = rollDie();
    const moves = validMoves(player, roll);
    room.lastRoll = roll;
    room.availableMoves = moves;
    room.lastAction = { type: "roll", playerId: player.id, roll, validMoves: moves };

    if (!moves.length) {
      room.message = `${player.name} رمى ${roll} ولا توجد حركة متاحة.`;
      advanceTurn(room);
    } else {
      room.pendingRoll = true;
      room.message = `${player.name} رمى ${roll}. اختر أحد الدبابيس المتاحة.`;
    }

    reply({ ok: true, roll, validMoves: moves });
    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("move_token", ({ code, tokenIndex } = {}, reply = () => {}) => {
    if (!actionAllowed(socket, "move")) return reply({ ok: false, error: "تمهل لحظة قبل الحركة التالية." });
    const room = rooms.get(normalizeRoomCode(code));
    const player = room && currentPlayer(room);
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    if (!player || player.id !== socket.id) return reply({ ok: false, error: "ليس دورك." });

    const result = finishMove(room, Number(tokenIndex));
    reply(result.ok ? {
      ok: true,
      won: result.won,
      captured: result.captured,
      extraTurn: result.extraTurn
    } : result);
    if (!result.ok) return;

    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("restart_game", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(normalizeRoomCode(code));
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.hostId !== socket.id) return reply({ ok: false, error: "فقط مدير الغرفة يعيد اللعب." });
    if (room.status !== "finished") {
      return reply({ ok: false, error: "يمكن بدء جولة جديدة بعد انتهاء الجولة الحالية." });
    }

    resetRoom(room);
    if (room.mode === "solo") {
      room.status = "playing";
      room.turnIndex = 0;
      room.message = "بدأت جولة فردية جديدة. أنت تبدأ أولاً!";
    } else {
      removeDisconnectedLobbyPlayers(room);
      room.status = "lobby";
      room.message = "الكل جاهز لجولة جديدة.";
    }
    reply({ ok: true });
    emitRoom(room);
  });

  socket.on("leave_room", (_payload = {}, reply = () => {}) => {
    const room = activeRoomFor(socket);
    if (!room) return reply({ ok: true });

    if (room.mode === "solo") {
      clearRoom(room);
      socket.leave(room.code);
      socket.data.roomCode = null;
    } else if (room.status === "lobby") {
      room.players = room.players.filter(player => player.id !== socket.id);
      socket.leave(room.code);
      socket.data.roomCode = null;
      if (!room.players.length) {
        clearRoom(room);
      } else {
        migrateHost(room);
        if (room.turnIndex >= room.players.length) room.turnIndex = 0;
        room.message = `${socket.data.user.username} غادر الغرفة.`;
        emitRoom(room);
      }
    } else {
      const player = room.players.find(item => item.id === socket.id);
      if (player) {
        player.connected = false;
        player.disconnectedAt = Date.now();
        player.userId = null;
      }
      socket.leave(room.code);
      socket.data.roomCode = null;
      const connectedHumans = room.players.filter(item => !item.isBot && item.connected);
      if (!connectedHumans.length) {
        clearRoom(room);
      } else {
        if (currentPlayer(room)?.id === socket.id) advanceTurn(room);
        migrateHost(room);
        room.message = `${socket.data.user.username} غادر الغرفة.`;
        emitRoom(room);
        scheduleBot(room);
      }
    }
    reply({ ok: true });
  });

  socket.on("disconnect", () => {
    const room = activeRoomFor(socket);
    if (!room) return;

    const playerIndex = room.players.findIndex(player => player.id === socket.id);
    if (playerIndex < 0) return;
    const player = room.players[playerIndex];

    if (room.mode === "solo") {
      player.connected = false;
      player.disconnectedAt = Date.now();
      touch(room);
      return;
    }

    player.connected = false;
    player.disconnectedAt = Date.now();
    if (room.status === "playing" && currentPlayer(room)?.id === socket.id) {
      advanceTurn(room);
    }
    migrateHost(room);
    room.message = `${player.name} انقطع اتصاله، ويمكنه العودة خلال دقائق.`;
    emitRoom(room);
    scheduleBot(room);
  });
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  rooms.forEach(room => {
    const connectedHumans = room.players.filter(player => !player.isBot && player.connected);
    if (!connectedHumans.length && now - room.updatedAt > PLAYER_RECONNECT_GRACE) {
      clearRoom(room);
      return;
    }

    if (room.status === "lobby") {
      room.players = room.players.filter(player =>
        player.isBot || player.connected || now - (player.disconnectedAt || now) <= PLAYER_RECONNECT_GRACE
      );
      migrateHost(room);
    }

    if (now - room.updatedAt > ROOM_IDLE_TTL) clearRoom(room);
  });
}, 60_000);
cleanupTimer.unref();

initDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Jack Altheeb ${RELEASE} listening on ${PORT}`);
    });
  })
  .catch(error => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });

function shutdown() {
  clearInterval(cleanupTimer);
  rooms.forEach(clearRoom);
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

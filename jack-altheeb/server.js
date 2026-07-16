const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const RELEASE = process.env.APP_RELEASE || "jack-altheeb-v3-20260716";
const MAX_PLAYERS = 4;
const TOKENS_PER_PLAYER = 4;
const TRACK_LENGTH = 40;
const HOME_LENGTH = 4;
const FINISH_PROGRESS = TRACK_LENGTH + HOME_LENGTH;
const SAFE_CELLS = new Set([0, 5, 10, 15, 20, 25, 30, 35]);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

app.use((req, res, next) => {
  res.setHeader("X-Jack-Altheeb-Version", RELEASE);
  if (/\.(?:html|css|js|json|webmanifest|svg)$/.test(req.path) || req.path === "/" || req.path === "/sw.js") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
  }
  next();
});

app.get("/version", (req, res) => {
  res.json({
    app: "jack-altheeb",
    release: RELEASE,
    commit: process.env.RENDER_GIT_COMMIT || null
  });
});

app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

const rooms = new Map();

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 18) || "لاعب";
}

function createPlayer(id, name, avatarIndex, { isBot = false } = {}) {
  return {
    id,
    name: cleanName(name),
    avatarIndex: Number.isInteger(avatarIndex) ? Math.max(0, Math.min(4, avatarIndex)) : 0,
    tokens: Array(TOKENS_PER_PLAYER).fill(-1),
    connected: true,
    isBot
  };
}

function currentPlayer(room) {
  return room.players[room.turnIndex] || null;
}

function validMoves(player, roll) {
  const moves = [];
  player.tokens.forEach((progress, tokenIndex) => {
    if (progress === FINISH_PROGRESS) return;
    if (progress === -1 && roll === 6) {
      moves.push(tokenIndex);
      return;
    }
    if (progress >= 0 && progress + roll <= FINISH_PROGRESS) moves.push(tokenIndex);
  });
  return moves;
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (playerIndex * 10 + progress) % TRACK_LENGTH;
}

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    tutorial: room.tutorial,
    status: room.status,
    hostId: room.hostId,
    players: room.players,
    turnIndex: room.turnIndex,
    lastRoll: room.lastRoll,
    pendingRoll: room.pendingRoll,
    availableMoves: room.availableMoves,
    message: room.message,
    winnerId: room.winnerId,
    safeCells: [...SAFE_CELLS],
    trackLength: TRACK_LENGTH,
    finishProgress: FINISH_PROGRESS
  };
}

function emitRoom(room) {
  io.to(room.code).emit("room_state", publicRoom(room));
}

function nextTurn(room) {
  if (!room.players.length) return;
  let attempts = 0;
  do {
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    attempts += 1;
  } while (!room.players[room.turnIndex]?.connected && attempts <= room.players.length);
  room.lastRoll = null;
  room.pendingRoll = false;
  room.availableMoves = [];
}

function resetRoom(room) {
  room.players.forEach(player => {
    player.tokens = Array(TOKENS_PER_PLAYER).fill(-1);
    player.connected = true;
  });
  room.turnIndex = 0;
  room.lastRoll = null;
  room.pendingRoll = false;
  room.availableMoves = [];
  room.winnerId = null;
}

function chooseBotMove(room, moves) {
  const player = currentPlayer(room);
  const playerIndex = room.turnIndex;
  return moves
    .map(tokenIndex => {
      const oldProgress = player.tokens[tokenIndex];
      const newProgress = oldProgress === -1 ? 0 : oldProgress + room.lastRoll;
      const landingCell = globalCell(playerIndex, newProgress);
      let score = newProgress;
      if (newProgress === FINISH_PROGRESS) score += 10000;
      if (oldProgress === -1) score += 1200;
      if (landingCell !== null && SAFE_CELLS.has(landingCell)) score += 350;
      if (landingCell !== null && !SAFE_CELLS.has(landingCell)) {
        room.players.forEach((opponent, opponentIndex) => {
          if (opponentIndex === playerIndex) return;
          if (opponent.tokens.some(progress => globalCell(opponentIndex, progress) === landingCell)) score += 5000;
        });
      }
      return { tokenIndex, score };
    })
    .sort((a, b) => b.score - a.score)[0].tokenIndex;
}

function performMove(room, tokenIndex) {
  const player = currentPlayer(room);
  const roll = room.lastRoll;
  const moves = validMoves(player, roll);
  if (!moves.includes(tokenIndex)) return { ok: false, error: "هذه الحركة غير مسموحة." };

  const oldProgress = player.tokens[tokenIndex];
  const newProgress = oldProgress === -1 ? 0 : oldProgress + roll;
  player.tokens[tokenIndex] = newProgress;

  const playerIndex = room.turnIndex;
  const landingCell = globalCell(playerIndex, newProgress);
  let captured = 0;

  if (landingCell !== null && !SAFE_CELLS.has(landingCell)) {
    room.players.forEach((opponent, opponentIndex) => {
      if (opponentIndex === playerIndex) return;
      opponent.tokens = opponent.tokens.map(progress => {
        if (globalCell(opponentIndex, progress) === landingCell) {
          captured += 1;
          return -1;
        }
        return progress;
      });
    });
  }

  room.pendingRoll = false;
  room.availableMoves = [];

  if (player.tokens.every(progress => progress === FINISH_PROGRESS)) {
    room.status = "finished";
    room.winnerId = player.id;
    room.message = `🏆 ${player.name} فاز بلقب جاك الذيب!`;
    return { ok: true, won: true, captured };
  }

  if (captured > 0) {
    room.lastRoll = null;
    room.message = `🐺 ${player.name} صاد ${captured} دبوس وحصل على رمية إضافية!`;
  } else if (roll === 6) {
    room.lastRoll = null;
    room.message = `🎲 ${player.name} رمى 6 وله رمية إضافية.`;
  } else {
    room.message = `${player.name} تحرك ${roll} خانات.`;
    nextTurn(room);
  }

  return { ok: true, won: false, captured };
}

function scheduleBot(room) {
  clearTimeout(room.botTimer);
  const bot = currentPlayer(room);
  if (room.status !== "playing" || !bot?.isBot) return;

  room.message = "🐺 الذيب الآلي يفكّر...";
  emitRoom(room);

  room.botTimer = setTimeout(() => {
    if (!rooms.has(room.code) || room.status !== "playing" || !currentPlayer(room)?.isBot) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const moves = validMoves(bot, roll);
    room.lastRoll = roll;
    room.availableMoves = moves;

    if (!moves.length) {
      room.message = `الذيب الآلي رمى ${roll} ولا توجد له حركة.`;
      nextTurn(room);
      emitRoom(room);
      scheduleBot(room);
      return;
    }

    room.pendingRoll = true;
    room.message = `الذيب الآلي رمى ${roll} ويختار حركته...`;
    emitRoom(room);

    room.botTimer = setTimeout(() => {
      if (!rooms.has(room.code) || room.status !== "playing" || !currentPlayer(room)?.isBot) return;
      const tokenIndex = chooseBotMove(room, moves);
      performMove(room, tokenIndex);
      emitRoom(room);
      scheduleBot(room);
    }, 650);
  }, 850);
}

function removePlayerFromRoom(socket, room) {
  const index = room.players.findIndex(player => player.id === socket.id);
  if (index === -1) return;

  if (room.mode === "solo") {
    clearTimeout(room.botTimer);
    rooms.delete(room.code);
    return;
  }

  if (room.status === "playing") {
    room.players[index].connected = false;
    room.message = `${room.players[index].name} خرج من الاتصال.`;
    if (room.players[index].id === currentPlayer(room)?.id) nextTurn(room);
  } else {
    room.players.splice(index, 1);
    if (room.turnIndex >= room.players.length) room.turnIndex = 0;
  }

  if (!room.players.length) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === socket.id) {
    room.hostId = (room.players.find(player => player.connected) || room.players[0]).id;
  }

  emitRoom(room);
  scheduleBot(room);
}

io.on("connection", socket => {
  socket.on("create_room", ({ name, avatarIndex, tutorial } = {}, reply = () => {}) => {
    const code = createRoomCode();
    const room = {
      code,
      mode: "online",
      tutorial: Boolean(tutorial),
      status: "lobby",
      hostId: socket.id,
      players: [createPlayer(socket.id, name, avatarIndex)],
      turnIndex: 0,
      lastRoll: null,
      pendingRoll: false,
      availableMoves: [],
      message: "تم إنشاء الغرفة. شارك الرمز مع أصدقائك.",
      winnerId: null,
      botTimer: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("create_solo", ({ name, avatarIndex, tutorial } = {}, reply = () => {}) => {
    const code = createRoomCode();
    const room = {
      code,
      mode: "solo",
      tutorial: Boolean(tutorial),
      status: "playing",
      hostId: socket.id,
      players: [
        createPlayer(socket.id, name, avatarIndex),
        createPlayer(`BOT:${code}`, "الذيب الآلي", 4, { isBot: true })
      ],
      turnIndex: 0,
      lastRoll: null,
      pendingRoll: false,
      availableMoves: [],
      message: "بدأ التحدي الفردي. أنت تبدأ أولًا!",
      winnerId: null,
      botTimer: null
    };
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    reply({ ok: true, code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("join_room", ({ code, name, avatarIndex } = {}, reply = () => {}) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.mode !== "online" || room.status !== "lobby") return reply({ ok: false, error: "لا يمكن الانضمام لهذه الجولة." });
    if (room.players.length >= MAX_PLAYERS) return reply({ ok: false, error: "الغرفة مكتملة." });

    room.players.push(createPlayer(socket.id, name, avatarIndex));
    socket.join(normalizedCode);
    socket.data.roomCode = normalizedCode;
    room.message = `${cleanName(name)} انضم إلى الغرفة.`;
    reply({ ok: true, code: normalizedCode, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("start_game", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.hostId !== socket.id) return reply({ ok: false, error: "فقط مدير الغرفة يبدأ اللعبة." });
    if (room.players.length < 2) return reply({ ok: false, error: "تحتاج لاعبين على الأقل، أو اختر اللعب الفردي." });

    resetRoom(room);
    room.status = "playing";
    room.turnIndex = Math.floor(Math.random() * room.players.length);
    room.message = `بدأت اللعبة. الدور على ${currentPlayer(room).name}.`;
    reply({ ok: true });
    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("roll_dice", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    const player = currentPlayer(room);
    if (!player || player.id !== socket.id || player.isBot) return reply({ ok: false, error: "ليس دورك." });
    if (room.pendingRoll) return reply({ ok: false, error: "اختر دبوسًا أولًا." });

    const roll = Math.floor(Math.random() * 6) + 1;
    const moves = validMoves(player, roll);
    room.lastRoll = roll;
    room.availableMoves = moves;

    if (!moves.length) {
      room.message = `${player.name} رمى ${roll} ولا توجد حركة متاحة.`;
      nextTurn(room);
    } else {
      room.pendingRoll = true;
      room.message = `${player.name} رمى ${roll}. اختر أحد الدبابيس المتاحة.`;
    }

    reply({ ok: true, roll, validMoves: moves });
    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("move_token", ({ code, tokenIndex } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    const player = currentPlayer(room);
    if (!player || player.id !== socket.id || player.isBot) return reply({ ok: false, error: "ليس دورك." });
    if (!room.pendingRoll || !room.lastRoll) return reply({ ok: false, error: "ارمِ النرد أولًا." });

    const result = performMove(room, Number(tokenIndex));
    reply(result);
    emitRoom(room);
    scheduleBot(room);
  });

  socket.on("restart_game", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.hostId !== socket.id) return reply({ ok: false, error: "فقط مدير الغرفة يعيد اللعب." });

    clearTimeout(room.botTimer);
    if (room.mode === "solo") {
      resetRoom(room);
      room.status = "playing";
      room.message = "بدأت جولة فردية جديدة. أنت تبدأ أولًا!";
    } else {
      room.players = room.players.filter(player => player.connected);
      resetRoom(room);
      room.status = "lobby";
      room.message = "الكل جاهز لجولة جديدة.";
    }

    reply({ ok: true });
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (room) removePlayerFromRoom(socket, room);
  });
});

server.listen(PORT, () => {
  console.log(`Jack Altheeb running on http://localhost:${PORT}`);
});

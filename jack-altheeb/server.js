const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 4;
const TOKENS_PER_PLAYER = 4;
const TRACK_LENGTH = 40;
const HOME_LENGTH = 4;
const FINISH_PROGRESS = TRACK_LENGTH + HOME_LENGTH;
const SAFE_CELLS = new Set([0, 5, 10, 15, 20, 25, 30, 35]);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 18) || "لاعب";
}

function createPlayer(socketId, name, avatarIndex) {
  return {
    id: socketId,
    name: cleanName(name),
    avatarIndex: Number.isInteger(avatarIndex) ? Math.max(0, Math.min(3, avatarIndex)) : 0,
    tokens: Array(TOKENS_PER_PLAYER).fill(-1),
    connected: true
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    players: room.players,
    turnIndex: room.turnIndex,
    lastRoll: room.lastRoll,
    pendingRoll: room.pendingRoll,
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
    if (progress >= 0 && progress + roll <= FINISH_PROGRESS) {
      moves.push(tokenIndex);
    }
  });
  return moves;
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  const offset = playerIndex * 10;
  return (offset + progress) % TRACK_LENGTH;
}

function nextTurn(room) {
  if (!room.players.length) return;
  let attempts = 0;
  do {
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    attempts++;
  } while (!room.players[room.turnIndex]?.connected && attempts <= room.players.length);
  room.lastRoll = null;
  room.pendingRoll = false;
}

function removePlayerFromRoom(socket, room, hardRemove = false) {
  const index = room.players.findIndex(p => p.id === socket.id);
  if (index === -1) return;

  if (room.status === "playing" && !hardRemove) {
    room.players[index].connected = false;
    room.message = `${room.players[index].name} خرج من الاتصال.`;
    if (room.players[index].id === currentPlayer(room)?.id) {
      nextTurn(room);
    }
  } else {
    room.players.splice(index, 1);
    if (room.turnIndex >= room.players.length) room.turnIndex = 0;
  }

  if (!room.players.length) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === socket.id) {
    const nextHost = room.players.find(p => p.connected) || room.players[0];
    room.hostId = nextHost.id;
  }
  emitRoom(room);
}

io.on("connection", socket => {
  socket.on("create_room", ({ name, avatarIndex } = {}, reply = () => {}) => {
    const code = createRoomCode();
    const room = {
      code,
      status: "lobby",
      hostId: socket.id,
      players: [createPlayer(socket.id, name, avatarIndex)],
      turnIndex: 0,
      lastRoll: null,
      pendingRoll: false,
      message: "تم إنشاء الغرفة. شارك الرمز مع أصدقائك.",
      winnerId: null
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
    if (room.status !== "lobby") return reply({ ok: false, error: "اللعبة بدأت بالفعل." });
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
    if (room.players.length < 2) return reply({ ok: false, error: "تحتاج لاعبين على الأقل." });

    room.status = "playing";
    room.turnIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach(player => {
      player.tokens = Array(TOKENS_PER_PLAYER).fill(-1);
      player.connected = true;
    });
    room.lastRoll = null;
    room.pendingRoll = false;
    room.winnerId = null;
    room.message = `بدأت اللعبة. الدور على ${currentPlayer(room).name}.`;
    reply({ ok: true });
    emitRoom(room);
  });

  socket.on("roll_dice", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    const player = currentPlayer(room);
    if (!player || player.id !== socket.id) return reply({ ok: false, error: "ليس دورك." });
    if (room.pendingRoll) return reply({ ok: false, error: "اختر دبوسًا أولًا." });

    const roll = Math.floor(Math.random() * 6) + 1;
    const moves = validMoves(player, roll);
    room.lastRoll = roll;

    if (!moves.length) {
      room.message = `${player.name} رمى ${roll} ولا توجد حركة متاحة.`;
      nextTurn(room);
    } else {
      room.pendingRoll = true;
      room.message = `${player.name} رمى ${roll}. اختر أحد الدبابيس المتاحة.`;
    }
    reply({ ok: true, roll, validMoves: moves });
    emitRoom(room);
  });

  socket.on("move_token", ({ code, tokenIndex } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.status !== "playing") return reply({ ok: false, error: "اللعبة غير متاحة." });
    const player = currentPlayer(room);
    if (!player || player.id !== socket.id) return reply({ ok: false, error: "ليس دورك." });
    if (!room.pendingRoll || !room.lastRoll) return reply({ ok: false, error: "ارمِ النرد أولًا." });

    const roll = room.lastRoll;
    const moves = validMoves(player, roll);
    const selected = Number(tokenIndex);
    if (!moves.includes(selected)) return reply({ ok: false, error: "هذه الحركة غير مسموحة." });

    const oldProgress = player.tokens[selected];
    const newProgress = oldProgress === -1 ? 0 : oldProgress + roll;
    player.tokens[selected] = newProgress;

    const playerIndex = room.players.findIndex(p => p.id === player.id);
    const landingCell = globalCell(playerIndex, newProgress);
    let captured = 0;

    if (landingCell !== null && !SAFE_CELLS.has(landingCell)) {
      room.players.forEach((opponent, opponentIndex) => {
        if (opponent.id === player.id) return;
        opponent.tokens = opponent.tokens.map(progress => {
          const opponentCell = globalCell(opponentIndex, progress);
          if (opponentCell === landingCell) {
            captured++;
            return -1;
          }
          return progress;
        });
      });
    }

    const won = player.tokens.every(progress => progress === FINISH_PROGRESS);
    room.pendingRoll = false;

    if (won) {
      room.status = "finished";
      room.winnerId = player.id;
      room.message = `🏆 ${player.name} فاز بلقب جاك الذيب!`;
      reply({ ok: true, won: true, captured });
      emitRoom(room);
      return;
    }

    if (captured > 0) {
      room.message = `🐺 ${player.name} صاد ${captured} دبوس وحصل على رمية إضافية!`;
      room.lastRoll = null;
    } else if (roll === 6) {
      room.message = `🎲 ${player.name} رمى 6 وله رمية إضافية.`;
      room.lastRoll = null;
    } else {
      room.message = `${player.name} تحرك ${roll} خانات.`;
      nextTurn(room);
    }

    reply({ ok: true, won: false, captured });
    emitRoom(room);
  });

  socket.on("restart_game", ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) return reply({ ok: false, error: "الغرفة غير موجودة." });
    if (room.hostId !== socket.id) return reply({ ok: false, error: "فقط مدير الغرفة يعيد اللعب." });

    room.status = "lobby";
    room.players = room.players.filter(p => p.connected);
    room.players.forEach(p => p.tokens = Array(TOKENS_PER_PLAYER).fill(-1));
    room.turnIndex = 0;
    room.lastRoll = null;
    room.pendingRoll = false;
    room.winnerId = null;
    room.message = "الكل جاهز لجولة جديدة.";
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

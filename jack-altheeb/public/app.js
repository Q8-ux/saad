const socket = io();

const AVATARS = [
  { name: "مشعل", emoji: "🧢", vibe: "سريع ومتحمس" },
  { name: "تركي", emoji: "😎", vibe: "رايق بس خطير" },
  { name: "بو ناصر", emoji: "🧔🏻", vibe: "خبير الديوانية" },
  { name: "دحيم", emoji: "🤠", vibe: "مقالب وحركات" }
];

const DICE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TRACK_LENGTH = 40;
const FINISH_PROGRESS = 44;

let selectedAvatar = 0;
let roomCode = "";
let myId = "";
let latestRoom = null;
let validMoves = [];
let soundEnabled = true;

const $ = id => document.getElementById(id);

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  $(id).classList.add("active");
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function playTone(frequency = 440, duration = 0.08) {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = 0.035;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function initAvatars() {
  $("avatarPicker").innerHTML = AVATARS.map((avatar, index) => `
    <button class="avatar-option ${index === 0 ? "selected" : ""}" data-index="${index}" type="button">
      <span class="emoji">${avatar.emoji}</span>
      <strong>${avatar.name}</strong>
      <small>${avatar.vibe}</small>
    </button>
  `).join("");

  document.querySelectorAll(".avatar-option").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedAvatar = Number(btn.dataset.index);
      document.querySelectorAll(".avatar-option").forEach(item => item.classList.remove("selected"));
      btn.classList.add("selected");
      playTone(560);
    });
  });
}

function getName() {
  return $("playerName").value.trim() || "لاعب";
}

function createBoard() {
  const board = $("board");
  board.querySelectorAll(".track-cell").forEach(cell => cell.remove());

  const coords = [];
  for (let x = 0; x <= 10; x++) coords.push([x, 0]);
  for (let y = 1; y <= 10; y++) coords.push([10, y]);
  for (let x = 9; x >= 0; x--) coords.push([x, 10]);
  for (let y = 9; y >= 1; y--) coords.push([0, y]);

  coords.forEach(([x, y], index) => {
    const cell = document.createElement("div");
    cell.className = "track-cell";
    cell.dataset.cell = index;
    cell.style.gridColumn = String(x + 1);
    cell.style.gridRow = String(y + 1);
    if ([0,5,10,15,20,25,30,35].includes(index)) cell.classList.add("safe");
    [0,10,20,30].forEach((start, playerIndex) => {
      if (index === start) cell.classList.add(`start-${playerIndex}`);
    });
    board.appendChild(cell);
  });
}

function renderLobby(room) {
  $("copyCodeBtn").textContent = room.code;
  $("playerCount").textContent = `${room.players.length}/4`;
  $("lobbyPlayers").innerHTML = room.players.map(player => `
    <div class="player-card">
      <span class="avatar">${AVATARS[player.avatarIndex]?.emoji || "🐺"}</span>
      <div>
        <strong>${escapeHtml(player.name)} ${player.id === room.hostId ? "👑" : ""}</strong>
        <small>${player.id === myId ? "أنت" : "جاهز للعب"}</small>
      </div>
    </div>
  `).join("");

  const amHost = room.hostId === myId;
  $("startGameBtn").classList.toggle("hidden", !amHost);
  $("startGameBtn").disabled = room.players.length < 2;
  $("lobbyHint").textContent = room.players.length < 2
    ? "يحتاج لاعبين على الأقل."
    : amHost ? "الكل جاهز. ابدأ متى ما تبي." : "بانتظار مدير الغرفة يبدأ اللعبة.";
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (playerIndex * 10 + progress) % TRACK_LENGTH;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderTokens(room) {
  document.querySelectorAll(".token, .home-token-stack").forEach(el => el.remove());

  room.players.forEach((player, playerIndex) => {
    const cellCounts = {};
    const homeTokens = [];

    player.tokens.forEach((progress, tokenIndex) => {
      const cellIndex = globalCell(playerIndex, progress);
      if (cellIndex === null) {
        if (progress === -1 || progress >= TRACK_LENGTH) {
          homeTokens.push({ progress, tokenIndex });
        }
        return;
      }

      cellCounts[cellIndex] = cellCounts[cellIndex] || [];
      cellCounts[cellIndex].push({ playerIndex, tokenIndex });
    });

    Object.entries(cellCounts).forEach(([cellIndex, tokens]) => {
      const cell = document.querySelector(`[data-cell="${cellIndex}"]`);
      if (!cell) return;
      tokens.forEach((tokenData, stackIndex) => {
        const token = document.createElement("span");
        token.className = `token p${playerIndex} pos-${stackIndex % 4}`;
        token.textContent = tokenData.tokenIndex + 1;
        token.title = `${player.name} - دبوس ${tokenData.tokenIndex + 1}`;
        cell.appendChild(token);
      });
    });

    const stack = document.createElement("div");
    stack.className = `home-token-stack home-${playerIndex}`;
    homeTokens.forEach(({ progress }) => {
      const dot = document.createElement("span");
      dot.className = `p${playerIndex}`;
      dot.style.background = ["var(--lime)", "var(--coral)", "var(--cyan)", "var(--gold)"][playerIndex];
      dot.title = progress === FINISH_PROGRESS ? "وصل" : progress === -1 ? "في السجن" : `الممر الأخير ${progress - TRACK_LENGTH + 1}`;
      stack.appendChild(dot);
    });
    $("board").appendChild(stack);
  });
}

function renderGame(room) {
  $("miniRoomCode").textContent = room.code;
  $("gameMessage").textContent = room.message || "";
  $("gamePlayers").innerHTML = room.players.map((player, index) => {
    const finished = player.tokens.filter(t => t === FINISH_PROGRESS).length;
    return `
      <div class="game-player ${index === room.turnIndex ? "active" : ""} ${!player.connected ? "offline" : ""}">
        <span class="avatar">${AVATARS[player.avatarIndex]?.emoji || "🐺"}</span>
        <div>
          <strong>${escapeHtml(player.name)}</strong>
          <span class="token-count">وصل ${finished}/4</span>
        </div>
        <span>${index === room.turnIndex ? "🎯" : ""}</span>
      </div>
    `;
  }).join("");

  const turnPlayer = room.players[room.turnIndex];
  $("turnAvatar").textContent = turnPlayer ? AVATARS[turnPlayer.avatarIndex]?.emoji : "🐺";
  $("turnName").textContent = turnPlayer?.name || "—";
  $("turnLabel").textContent = room.status === "finished" ? "الفائز" : "الدور على";
  $("diceFace").textContent = room.lastRoll ? DICE[room.lastRoll - 1] : "⚄";

  const myTurn = turnPlayer?.id === myId;
  $("rollBtn").disabled = !myTurn || room.pendingRoll || room.status !== "playing";
  $("rollBtn").querySelector("span:last-child").textContent =
    room.status === "finished" ? "انتهت الجولة" : myTurn ? "ارمِ النرد" : "انتظر دورك";

  const amHost = room.hostId === myId;
  $("restartBtn").classList.toggle("hidden", !(amHost && room.status === "finished"));

  renderTokens(room);
  renderTokenChooser(room);
}

function renderTokenChooser(room) {
  const chooser = $("tokenChooser");
  const myTurn = room.players[room.turnIndex]?.id === myId;
  if (!myTurn || !room.pendingRoll || room.status !== "playing") {
    chooser.classList.add("hidden");
    chooser.innerHTML = "";
    return;
  }

  chooser.classList.remove("hidden");
  chooser.innerHTML = [0,1,2,3].map(index => `
    <button class="token-choice ${validMoves.includes(index) ? "valid" : ""}"
      data-token="${index}" ${validMoves.includes(index) ? "" : "disabled"} type="button">
      دبوس ${index + 1}
    </button>
  `).join("");

  chooser.querySelectorAll(".token-choice.valid").forEach(btn => {
    btn.addEventListener("click", () => {
      socket.emit("move_token", { code: roomCode, tokenIndex: Number(btn.dataset.token) }, response => {
        if (!response.ok) return toast(response.error);
        validMoves = [];
        playTone(response.captured ? 720 : 520, .12);
      });
    });
  });
}

$("createRoomBtn").addEventListener("click", () => {
  $("landingError").textContent = "";
  socket.emit("create_room", { name: getName(), avatarIndex: selectedAvatar }, response => {
    if (!response.ok) {
      $("landingError").textContent = response.error;
      return;
    }
    roomCode = response.code;
    myId = response.playerId;
    showView("lobbyView");
    playTone(620);
  });
});

$("joinRoomBtn").addEventListener("click", () => {
  $("landingError").textContent = "";
  const code = $("roomCodeInput").value.trim().toUpperCase();
  socket.emit("join_room", { code, name: getName(), avatarIndex: selectedAvatar }, response => {
    if (!response.ok) {
      $("landingError").textContent = response.error;
      return;
    }
    roomCode = response.code;
    myId = response.playerId;
    showView("lobbyView");
    playTone(620);
  });
});

$("startGameBtn").addEventListener("click", () => {
  socket.emit("start_game", { code: roomCode }, response => {
    if (!response.ok) toast(response.error);
  });
});

$("rollBtn").addEventListener("click", () => {
  socket.emit("roll_dice", { code: roomCode }, response => {
    if (!response.ok) return toast(response.error);
    validMoves = response.validMoves || [];
    playTone(360 + response.roll * 55, .12);
  });
});

$("restartBtn").addEventListener("click", () => {
  socket.emit("restart_game", { code: roomCode }, response => {
    if (!response.ok) toast(response.error);
  });
});

$("copyCodeBtn").addEventListener("click", async () => {
  await navigator.clipboard.writeText(roomCode);
  toast("تم نسخ رمز الغرفة");
});

$("shareBtn").addEventListener("click", async () => {
  const text = `ادخل معي لعبة جاك الذيب. رمز الغرفة: ${roomCode}`;
  if (navigator.share) {
    await navigator.share({ title: "جاك الذيب", text });
  } else {
    await navigator.clipboard.writeText(text);
    toast("تم نسخ الدعوة");
  }
});

$("soundBtn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundBtn").textContent = soundEnabled ? "🔊" : "🔇";
});

$("roomCodeInput").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
});

socket.on("room_state", room => {
  latestRoom = room;
  roomCode = room.code;
  if (room.status === "lobby") {
    showView("lobbyView");
    renderLobby(room);
  } else {
    showView("gameView");
    renderGame(room);
  }
});

socket.on("connect", () => {
  if (!myId) myId = socket.id;
});

initAvatars();
createBoard();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

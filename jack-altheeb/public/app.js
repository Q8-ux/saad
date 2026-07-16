const socket = io();

const AVATARS = [
  { name: "مشعل", emoji: "🧢", vibe: "سريع ومتحمس" },
  { name: "تركي", emoji: "😎", vibe: "رايق بس خطير" },
  { name: "بو ناصر", emoji: "🧔🏻", vibe: "خبير الديوانية" },
  { name: "دحيم", emoji: "🤠", vibe: "مقالب وحركات" },
  { name: "الذيب", emoji: "🐺", vibe: "خصم آلي ذكي" }
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
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);
  } catch {}
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function initAvatars() {
  $("avatarPicker").innerHTML = AVATARS.slice(0, 4).map((avatar, index) => `
    <button class="avatar-option ${index === 0 ? "selected" : ""}" data-index="${index}" type="button">
      <span class="emoji">${avatar.emoji}</span><strong>${avatar.name}</strong><small>${avatar.vibe}</small>
    </button>`).join("");
  document.querySelectorAll(".avatar-option").forEach(button => button.addEventListener("click", () => {
    selectedAvatar = Number(button.dataset.index);
    document.querySelectorAll(".avatar-option").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    playTone(560);
  }));
}

function getName() { return $("playerName").value.trim() || "لاعب"; }
function tutorialEnabled() { return $("tutorialToggle").checked; }

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
    if ([0, 5, 10, 15, 20, 25, 30, 35].includes(index)) cell.classList.add("safe");
    [0, 10, 20, 30].forEach((start, playerIndex) => { if (index === start) cell.classList.add(`start-${playerIndex}`); });
    board.appendChild(cell);
  });
}

function renderLobby(room) {
  $("copyCodeBtn").textContent = room.code;
  $("playerCount").textContent = `${room.players.length}/4`;
  $("lobbyPlayers").innerHTML = room.players.map(player => `
    <div class="player-card"><span class="avatar">${AVATARS[player.avatarIndex]?.emoji || "🐺"}</span><div><strong>${escapeHtml(player.name)} ${player.id === room.hostId ? "👑" : ""}</strong><small>${player.id === myId ? "أنت" : "جاهز للعب"}</small></div></div>`).join("");
  const amHost = room.hostId === myId;
  $("startGameBtn").classList.toggle("hidden", !amHost);
  $("startGameBtn").disabled = room.players.length < 2;
  $("lobbyHint").textContent = room.players.length < 2 ? "يحتاج لاعبين على الأقل، أو ارجع واختر اللعب الفردي." : amHost ? "الكل جاهز. ابدأ متى ما تبي." : "بانتظار مدير الغرفة يبدأ اللعبة.";
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (playerIndex * 10 + progress) % TRACK_LENGTH;
}

function renderTokens(room) {
  document.querySelectorAll(".token, .home-token-stack").forEach(element => element.remove());
  room.players.forEach((player, playerIndex) => {
    const cellCounts = {};
    const homeTokens = [];
    player.tokens.forEach((progress, tokenIndex) => {
      const cellIndex = globalCell(playerIndex, progress);
      if (cellIndex === null) {
        if (progress === -1 || progress >= TRACK_LENGTH) homeTokens.push({ progress, tokenIndex });
        return;
      }
      cellCounts[cellIndex] = cellCounts[cellIndex] || [];
      cellCounts[cellIndex].push({ tokenIndex });
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
      dot.style.background = ["var(--lime)", "var(--coral)", "var(--cyan)", "var(--gold)"][playerIndex] || "var(--purple)";
      dot.title = progress === FINISH_PROGRESS ? "وصل" : progress === -1 ? "في السجن" : `الممر الأخير ${progress - TRACK_LENGTH + 1}`;
      stack.appendChild(dot);
    });
    $("board").appendChild(stack);
  });
}

function recommendedMove(room, moves) {
  if (!moves.length) return null;
  const playerIndex = room.turnIndex;
  const player = room.players[playerIndex];
  return moves.map(tokenIndex => {
    const oldProgress = player.tokens[tokenIndex];
    const newProgress = oldProgress === -1 ? 0 : oldProgress + room.lastRoll;
    const landingCell = globalCell(playerIndex, newProgress);
    let score = newProgress;
    if (newProgress === FINISH_PROGRESS) score += 10000;
    if (oldProgress === -1) score += 1500;
    if (room.safeCells.includes(landingCell)) score += 300;
    if (landingCell !== null && !room.safeCells.includes(landingCell)) {
      room.players.forEach((opponent, opponentIndex) => {
        if (opponentIndex === playerIndex) return;
        if (opponent.tokens.some(progress => globalCell(opponentIndex, progress) === landingCell)) score += 5000;
      });
    }
    return { tokenIndex, score };
  }).sort((a, b) => b.score - a.score)[0].tokenIndex;
}

function tutorialHint(room) {
  if (!room.tutorial) return "";
  if (room.status === "finished") return room.winnerId === myId ? "ممتاز! أدخلت الدبابيس الأربعة ووصلت للنهاية قبل خصمك." : "انتهت الجولة. جرّب توزيع الحركة بين دبابيسك بدل الاعتماد على دبوس واحد.";
  const turnPlayer = room.players[room.turnIndex];
  if (!turnPlayer) return "";
  if (turnPlayer.isBot) return "راقب قرار الذيب الآلي: هو يفضّل الصيد، الوصول للنهاية، ثم الخانات الآمنة.";
  if (turnPlayer.id !== myId) return "انتظر دورك وراقب مواقع الخصوم، خصوصًا الدبابيس القريبة من الخانات غير الآمنة.";
  if (!room.pendingRoll) return "اضغط «ارمِ النرد». ظهور الرقم 6 يسمح لك بإخراج دبوس من السجن ويمنحك رمية إضافية.";
  const moves = room.availableMoves || [];
  if (!moves.length) return "لا توجد حركة متاحة بهذه الرمية، لذلك ينتقل الدور تلقائيًا.";
  const best = recommendedMove(room, moves);
  const action = room.lastAction;
  let detail = `اختر دبوسًا متاحًا. المدرب يقترح الدبوس ${best + 1}.`;
  if (action?.roll === 6) detail += " رقم 6 ممتاز لإخراج دبوس جديد وتوسيع خياراتك.";
  return detail;
}

function renderTutorial(room) {
  const panel = $("tutorialPanel");
  panel.classList.toggle("hidden", !room.tutorial);
  if (room.tutorial) $("tutorialText").textContent = tutorialHint(room);
}

function renderGame(room) {
  $("miniRoomCode").textContent = room.mode === "solo" ? "SOLO" : room.code;
  $("modeLabel").textContent = room.mode === "solo" ? "الوضع" : "الغرفة";
  $("gameMessage").textContent = room.message || "";
  $("gamePlayers").innerHTML = room.players.map((player, index) => {
    const finished = player.tokens.filter(token => token === FINISH_PROGRESS).length;
    return `<div class="game-player ${index === room.turnIndex ? "active" : ""} ${!player.connected ? "offline" : ""}"><span class="avatar">${AVATARS[player.avatarIndex]?.emoji || "🐺"}</span><div><strong>${escapeHtml(player.name)} ${player.isBot ? "<em>AI</em>" : ""}</strong><span class="token-count">وصل ${finished}/4</span></div><span>${index === room.turnIndex ? "🎯" : ""}</span></div>`;
  }).join("");

  const turnPlayer = room.players[room.turnIndex];
  $("turnAvatar").textContent = turnPlayer ? AVATARS[turnPlayer.avatarIndex]?.emoji : "🐺";
  $("turnName").textContent = turnPlayer?.name || "—";
  $("turnLabel").textContent = room.status === "finished" ? "الفائز" : "الدور على";
  $("diceFace").textContent = room.lastRoll ? DICE[room.lastRoll - 1] : "⚄";
  const myTurn = turnPlayer?.id === myId;
  $("rollBtn").disabled = !myTurn || room.pendingRoll || room.status !== "playing";
  $("rollBtn").querySelector("span:last-child").textContent = room.status === "finished" ? "انتهت الجولة" : turnPlayer?.isBot ? "الذيب يفكّر..." : myTurn ? "ارمِ النرد" : "انتظر دورك";
  $("restartBtn").classList.toggle("hidden", !(room.hostId === myId && room.status === "finished"));
  validMoves = myTurn && room.pendingRoll ? room.availableMoves || [] : [];
  renderTokens(room);
  renderTokenChooser(room);
  renderTutorial(room);
}

function renderTokenChooser(room) {
  const chooser = $("tokenChooser");
  const myTurn = room.players[room.turnIndex]?.id === myId;
  if (!myTurn || !room.pendingRoll || room.status !== "playing") {
    chooser.classList.add("hidden"); chooser.innerHTML = ""; return;
  }
  const suggested = room.tutorial ? recommendedMove(room, validMoves) : null;
  chooser.classList.remove("hidden");
  chooser.innerHTML = [0, 1, 2, 3].map(index => `<button class="token-choice ${validMoves.includes(index) ? "valid" : ""} ${suggested === index ? "recommended" : ""}" data-token="${index}" ${validMoves.includes(index) ? "" : "disabled"} type="button">دبوس ${index + 1}${suggested === index ? " <small>مقترح</small>" : ""}</button>`).join("");
  chooser.querySelectorAll(".token-choice.valid").forEach(button => button.addEventListener("click", () => {
    socket.emit("move_token", { code: roomCode, tokenIndex: Number(button.dataset.token) }, response => {
      if (!response.ok) return toast(response.error);
      validMoves = [];
      playTone(response.captured ? 720 : 520, 0.12);
    });
  }));
}

$("soloBtn").addEventListener("click", () => {
  $("landingError").textContent = "";
  socket.emit("create_solo", { name: getName(), avatarIndex: selectedAvatar, tutorial: tutorialEnabled() }, response => {
    if (!response.ok) return $("landingError").textContent = response.error;
    roomCode = response.code; myId = response.playerId; playTone(680);
  });
});

$("createRoomBtn").addEventListener("click", () => {
  $("landingError").textContent = "";
  socket.emit("create_room", { name: getName(), avatarIndex: selectedAvatar, tutorial: tutorialEnabled() }, response => {
    if (!response.ok) return $("landingError").textContent = response.error;
    roomCode = response.code; myId = response.playerId; showView("lobbyView"); playTone(620);
  });
});

$("joinRoomBtn").addEventListener("click", () => {
  $("landingError").textContent = "";
  socket.emit("join_room", { code: $("roomCodeInput").value.trim().toUpperCase(), name: getName(), avatarIndex: selectedAvatar }, response => {
    if (!response.ok) return $("landingError").textContent = response.error;
    roomCode = response.code; myId = response.playerId; showView("lobbyView"); playTone(620);
  });
});

$("startGameBtn").addEventListener("click", () => socket.emit("start_game", { code: roomCode }, response => { if (!response.ok) toast(response.error); }));
$("rollBtn").addEventListener("click", () => socket.emit("roll_dice", { code: roomCode }, response => { if (!response.ok) return toast(response.error); validMoves = response.validMoves || []; playTone(360 + response.roll * 55, 0.12); }));
$("restartBtn").addEventListener("click", () => socket.emit("restart_game", { code: roomCode }, response => { if (!response.ok) toast(response.error); }));
$("copyCodeBtn").addEventListener("click", async () => { await navigator.clipboard.writeText(roomCode); toast("تم نسخ رمز الغرفة"); });
$("shareBtn").addEventListener("click", async () => {
  const text = `ادخل معي لعبة جاك الذيب. رمز الغرفة: ${roomCode}`;
  if (navigator.share) await navigator.share({ title: "جاك الذيب", text }); else { await navigator.clipboard.writeText(text); toast("تم نسخ الدعوة"); }
});
$("soundBtn").addEventListener("click", () => { soundEnabled = !soundEnabled; $("soundBtn").textContent = soundEnabled ? "🔊" : "🔇"; });
$("roomCodeInput").addEventListener("input", event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5); });

socket.on("room_state", room => {
  latestRoom = room; roomCode = room.code;
  if (room.status === "lobby") { showView("lobbyView"); renderLobby(room); }
  else { showView("gameView"); renderGame(room); }
});
socket.on("connect", () => { if (!myId) myId = socket.id; });

initAvatars();
createBoard();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

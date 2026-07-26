const AVATARS = [
  {
    key: "mishal",
    image: "/assets/avatar-mishal.webp?v=5",
    color: "#c9ff00"
  },
  {
    key: "turki",
    image: "/assets/avatar-turki.webp?v=5",
    color: "#ff5f57"
  },
  {
    key: "bunasser",
    image: "/assets/avatar-bunasser.webp?v=5",
    color: "#00d9ff"
  },
  {
    key: "dahim",
    image: "/assets/avatar-dahim.webp?v=5",
    color: "#af8aff"
  },
  {
    key: "wolf",
    image: "/assets/avatar-wolf.webp?v=5",
    color: "#c9ff00"
  }
];

const DICE = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TRACK_LENGTH = 40;
const FINISH_PROGRESS = 44;
const SAFE_CELLS = [0, 5, 10, 15, 20, 25, 30, 35];
const HOME_COORDS = [
  [[6, 2], [6, 3], [6, 4], [6, 5]],
  [[10, 6], [9, 6], [8, 6], [7, 6]],
  [[6, 10], [6, 9], [6, 8], [6, 7]],
  [[2, 6], [3, 6], [4, 6], [5, 6]]
];

const COPY = {
  ar: {
    brand: "جاك الذيب",
    brandLine: "اللعبة الخليجية الجماعية",
    authEyebrow: "حساب واحد • تحديات مستمرة",
    authTitle: "اسمك محفوظ.\nإنجازاتك تكبر معك.",
    authCopy: "ادخل الديوانية الرقمية، نافس ربعك، واصعد في لوحة الصدارة جولة بعد جولة.",
    onlinePlayers: "لاعبين أونلاين",
    smartOpponent: "خصم ذكي",
    savedProgress: "تقدم محفوظ",
    welcome: "حيّاك في التحدي",
    authHint: "سجّل دخولك أو أنشئ حسابك خلال لحظات.",
    login: "تسجيل الدخول",
    register: "حساب جديد",
    loginId: "اسم المستخدم أو البريد",
    password: "كلمة المرور",
    enterGame: "دخول إلى اللعبة",
    username: "اسم مستخدم فريد",
    email: "البريد الإلكتروني",
    createAccount: "إنشاء الحساب",
    secureAccount: "حساب آمن وجلسة مشفّرة",
    rotateTitle: "لفّ جهازك بالعرض",
    rotateCopy: "لوحة اللعب أوضح وأسرع بالوضع الأفقي.",
    connecting: "جاري الاتصال",
    connected: "متصل",
    disconnected: "الاتصال متوقف",
    leaders: "الصدارة",
    logout: "تسجيل الخروج",
    heroEyebrow: "ONLINE • SOLO • TUTORIAL",
    heroJack: "جاك",
    heroWolf: "الذيب",
    heroCopy: "لعبة حماس أونلاين تجمع الرمية الذكية، الصيد، وضحكة الربع في تجربة واحدة.",
    featureSolo: "🎮 لعب فردي",
    featureTutorial: "🧠 تدريب تفاعلي",
    featureOnline: "🌐 غرف خاصة",
    chooseMode: "اختر طريقة اللعب",
    playerProfile: "ملف اللاعب",
    chooseCharacter: "اختر شخصيتك",
    saved: "محفوظ",
    displayName: "اسم اللاعب",
    coachMode: "المدرب الذكي",
    coachHint: "يقترح أفضل حركة أثناء الجولة",
    instantMatch: "مواجهة فورية",
    playSolo: "واجه الذيب",
    soloCopy: "جولة كاملة ضد خصم آلي يقرأ الخطر ويفضّل الصيد.",
    startSolo: "ابدأ التحدي الفردي",
    startTutorial: "ابدأ جولة تعليمية",
    privateRoom: "غرفة خاصة",
    playFriends: "اجمع الربع",
    onlineCopy: "أنشئ غرفة خاصة أو ادخل برمز من خمس خانات.",
    createRoom: "إنشاء غرفة جديدة",
    orJoin: "أو ادخل غرفة",
    join: "دخول",
    lobbyTitle: "الديوانية جاهزة",
    lobbyCopy: "شارك الرمز، جهّز الربع، ومدير الغرفة يبدأ الجولة.",
    roomCode: "رمز الغرفة",
    copyHint: "اضغط على الرمز لنسخه.",
    shareInvite: "مشاركة الدعوة",
    players: "اللاعبون",
    readyPlayers: "المتواجدون في الديوانية",
    startGame: "ابدأ اللعبة",
    room: "الغرفة",
    leave: "مغادرة",
    liveRound: "الجولة المباشرة",
    turn: "الدور على",
    rollDice: "ارمِ النرد",
    result: "النتيجة",
    smartCoach: "المدرب الذكي",
    roundHint: "تلميح الجولة",
    quickRules: "قواعد سريعة",
    howToPlay: "شلون تلعب؟",
    ruleOne: "يخرج الدبوس من القاعدة.",
    ruleTwo: "الخانات المضيئة آمنة.",
    ruleThree: "قف على الخصم لتصيده.",
    ruleFour: "أدخل كل دبابيسك للنهاية.",
    newRound: "جولة جديدة",
    footerLine: "تجربة خليجية أصلية • لعب مسؤول • منافسة عادلة",
    leadersTitle: "ذئاب الصدارة",
    loadingLeaders: "جاري تحميل الترتيب...",
    you: "أنت",
    ready: "جاهز للعب",
    offline: "غير متصل",
    host: "مدير الغرفة",
    waitingOne: "تحتاج لاعباً متصلاً آخر على الأقل.",
    everyoneReady: "الكل جاهز. ابدأ متى ما تبي.",
    waitingHost: "بانتظار مدير الغرفة يبدأ اللعبة.",
    solo: "فردي",
    finished: "الفائز",
    waitTurn: "انتظر دورك",
    chooseToken: "اختر دبوساً",
    wolfThinking: "الذيب يفكّر",
    token: "دبوس",
    completed: "وصل",
    best: "مقترح",
    copied: "تم نسخ رمز الغرفة.",
    invite: code => `تعال نلعب جاك الذيب. رمز الغرفة: ${code}`,
    networkError: "تعذر الوصول إلى الخادم. حاول مرة أخرى.",
    activeRoom: "لديك جولة مفتوحة. غادرها أولاً.",
    leaderboardError: "تعذر تحميل لوحة الصدارة.",
    noLeaders: "لا توجد نتائج بعد.",
    wins: "فوز",
    games: "جولة",
    level: "المستوى",
    tutorialRoll: "اضغط «ارمِ النرد». الرقم 6 يخرج دبوساً من القاعدة ويمنحك رمية إضافية.",
    tutorialOther: "راقب مواقع الخصوم، خصوصاً الدبابيس البعيدة عن الخانات الآمنة.",
    tutorialBot: "الذيب يفضّل الصيد أولاً، ثم الوصول، ثم الخانة الآمنة.",
    tutorialChoose: number => `اختر دبوساً متاحاً. أفضل خيار حالياً هو الدبوس ${number}.`,
    tutorialWin: "ممتاز! أدخلت الدبابيس الأربعة قبل خصمك.",
    tutorialLose: "انتهت الجولة. وزّع حركاتك ولا تعتمد على دبوس واحد.",
    unknownMessage: "الجولة مستمرة.",
    avatars: [
      ["مشعل", "حماسي وسريع"],
      ["تركي", "هادئ وخطير"],
      ["بو ناصر", "خبير الاستراتيجية"],
      ["دحيم", "مفاجآت وحركات"],
      ["الذيب", "خصم آلي ذكي"]
    ]
  },
  en: {
    brand: "Jack Altheeb",
    brandLine: "The Gulf multiplayer game",
    authEyebrow: "ONE ACCOUNT • ENDLESS ROUNDS",
    authTitle: "Your name is locked.\nYour progress grows.",
    authCopy: "Enter the digital diwaniya, challenge your friends, and climb the leaderboard one round at a time.",
    onlinePlayers: "Online players",
    smartOpponent: "Smart rival",
    savedProgress: "Saved progress",
    welcome: "Welcome to the challenge",
    authHint: "Sign in or create your account in moments.",
    login: "Sign in",
    register: "New account",
    loginId: "Username or email",
    password: "Password",
    enterGame: "Enter the game",
    username: "Unique username",
    email: "Email address",
    createAccount: "Create account",
    secureAccount: "Secure account and encrypted session",
    rotateTitle: "Rotate your device",
    rotateCopy: "The board is clearer and faster in landscape.",
    connecting: "Connecting",
    connected: "Online",
    disconnected: "Offline",
    leaders: "Leaders",
    logout: "Sign out",
    heroEyebrow: "ONLINE • SOLO • TUTORIAL",
    heroJack: "JACK",
    heroWolf: "ALTHEEB",
    heroCopy: "A high-energy online game of smart rolls, captures, and laughs with your crew.",
    featureSolo: "🎮 Solo play",
    featureTutorial: "🧠 Interactive coach",
    featureOnline: "🌐 Private rooms",
    chooseMode: "Choose a mode",
    playerProfile: "Player profile",
    chooseCharacter: "Choose your character",
    saved: "Saved",
    displayName: "Player name",
    coachMode: "Smart coach",
    coachHint: "Suggests the best move during play",
    instantMatch: "Instant match",
    playSolo: "Face the wolf",
    soloCopy: "A full round against a bot that reads danger and prioritizes captures.",
    startSolo: "Start solo challenge",
    startTutorial: "Start tutorial round",
    privateRoom: "Private room",
    playFriends: "Gather your crew",
    onlineCopy: "Create a private room or enter a five-character code.",
    createRoom: "Create new room",
    orJoin: "or join a room",
    join: "Join",
    lobbyTitle: "The diwaniya is ready",
    lobbyCopy: "Share the code, gather your crew, and let the host start.",
    roomCode: "Room code",
    copyHint: "Tap the code to copy it.",
    shareInvite: "Share invitation",
    players: "Players",
    readyPlayers: "Players in the diwaniya",
    startGame: "Start game",
    room: "Room",
    leave: "Leave",
    liveRound: "Live round",
    turn: "Current turn",
    rollDice: "Roll dice",
    result: "Result",
    smartCoach: "Smart coach",
    roundHint: "Round hint",
    quickRules: "Quick rules",
    howToPlay: "How to play",
    ruleOne: "A six releases a token.",
    ruleTwo: "Glowing cells are safe.",
    ruleThree: "Land on a rival to capture.",
    ruleFour: "Move all four tokens home.",
    newRound: "New round",
    footerLine: "Original Gulf experience • Responsible play • Fair competition",
    leadersTitle: "Top Wolves",
    loadingLeaders: "Loading the ranking...",
    you: "You",
    ready: "Ready",
    offline: "Offline",
    host: "Room host",
    waitingOne: "At least one more connected player is required.",
    everyoneReady: "Everyone is ready. Start whenever you like.",
    waitingHost: "Waiting for the room host to start.",
    solo: "Solo",
    finished: "Winner",
    waitTurn: "Wait for your turn",
    chooseToken: "Choose a token",
    wolfThinking: "The wolf is thinking",
    token: "Token",
    completed: "Home",
    best: "Best",
    copied: "Room code copied.",
    invite: code => `Join my Jack Altheeb room. Code: ${code}`,
    networkError: "Could not reach the server. Try again.",
    activeRoom: "You already have an open round. Leave it first.",
    leaderboardError: "Could not load the leaderboard.",
    noLeaders: "No results yet.",
    wins: "wins",
    games: "games",
    level: "Level",
    tutorialRoll: "Press Roll Dice. A six releases a token and gives you an extra roll.",
    tutorialOther: "Watch rival positions, especially tokens away from safe cells.",
    tutorialBot: "The wolf prioritizes captures, then finishing, then safe cells.",
    tutorialChoose: number => `Choose an available token. Token ${number} is currently the best option.`,
    tutorialWin: "Excellent! You moved all four tokens home first.",
    tutorialLose: "The round is over. Spread your moves instead of relying on one token.",
    unknownMessage: "The round continues.",
    avatars: [
      ["Mishal", "Fast and energetic"],
      ["Turki", "Calm but dangerous"],
      ["Abu Nasser", "Strategy expert"],
      ["Dhaim", "Tricks and surprises"],
      ["The Wolf", "Smart AI opponent"]
    ]
  }
};

const $ = id => document.getElementById(id);
const q = selector => document.querySelector(selector);
const qa = selector => [...document.querySelectorAll(selector)];

let language = localStorage.getItem("jack-language") === "en" ? "en" : "ar";
let selectedAvatar = Number(window.jackUser?.avatarIndex) || 0;
let roomCode = "";
let myId = "";
let latestRoom = null;
let latestRevision = -1;
let soundEnabled = localStorage.getItem("jack-sound") !== "off";
let audioContext = null;
let diceHideTimer = null;
let lastActionKey = "";

const socket = io({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 700,
  reconnectionDelayMax: 4_000,
  timeout: 10_000
});

function text(key) {
  return COPY[language][key] ?? key;
}

function avatarCopy(index) {
  return COPY[language].avatars[index] || COPY[language].avatars[0];
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function toast(message) {
  const element = $("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2_400);
}

function showView(id) {
  qa(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.body.classList.toggle("is-playing", id === "gameView");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setConnection(status) {
  const badge = $("connectionBadge");
  if (!badge) return;
  badge.classList.remove("online", "offline", "connecting");
  badge.classList.add(status);
  const label = badge.querySelector("span");
  if (label) {
    label.textContent = status === "online"
      ? text("connected")
      : status === "offline"
        ? text("disconnected")
        : text("connecting");
  }
}

function getAudioContext() {
  if (!audioContext) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) audioContext = new Audio();
  }
  if (audioContext?.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(frequency, duration = .08, type = "sine", gainValue = .03, delay = 0) {
  if (!soundEnabled) return;
  try {
    const context = getAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  } catch {
    // Audio is enhancement-only.
  }
}

function playSound(kind) {
  if (!soundEnabled) return;
  if (kind === "ui") {
    tone(560, .07, "sine", .025);
  } else if (kind === "roll") {
    [190, 280, 410, 610].forEach((frequency, index) => tone(frequency, .07, "square", .018, index * .055));
  } else if (kind === "move") {
    tone(380, .06, "sine", .025);
    tone(520, .09, "sine", .022, .07);
  } else if (kind === "capture") {
    tone(160, .13, "sawtooth", .032);
    tone(740, .16, "square", .022, .08);
  } else if (kind === "win") {
    [392, 494, 587, 784].forEach((frequency, index) => tone(frequency, .28, "sine", .035, index * .13));
  }
}

function renderAvatars() {
  const picker = $("avatarPicker");
  if (!picker) return;
  picker.innerHTML = AVATARS.slice(0, 4).map((avatar, index) => {
    const [name, vibe] = avatarCopy(index);
    return `
      <button class="avatar-option ${index === selectedAvatar ? "selected" : ""}" data-index="${index}" type="button" role="listitem" aria-pressed="${index === selectedAvatar}">
        <img src="${avatar.image}" alt="${escapeHtml(name)}" width="160" height="160">
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(vibe)}</small>
      </button>`;
  }).join("");

  qa(".avatar-option").forEach(button => {
    button.addEventListener("click", async () => {
      selectedAvatar = Number(button.dataset.index);
      renderAvatars();
      playSound("ui");
      if (window.jackUser && window.saveJackAvatar) {
        await window.saveJackAvatar(selectedAvatar);
      }
    });
  });
}

function applyLanguage() {
  const dictionary = COPY[language];
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.title = language === "ar"
    ? "جاك الذيب | اللعبة الخليجية الجماعية"
    : "Jack Altheeb | The Gulf Multiplayer Game";

  qa("[data-i18n]").forEach(element => {
    const value = dictionary[element.dataset.i18n];
    if (typeof value === "string") element.textContent = value;
  });
  qa("[data-i18n-title]").forEach(element => {
    const value = dictionary[element.dataset.i18nTitle];
    if (typeof value === "string") element.title = value;
  });

  $("languageBtn").textContent = language === "ar" ? "EN" : "ع";
  $("authLanguageBtn").textContent = language === "ar" ? "EN" : "ع";
  $("roomCodeInput").placeholder = language === "ar" ? "رمز الغرفة" : "ROOM CODE";
  $("roomCodeInput").setAttribute("aria-label", text("roomCode"));
  $("soundBtn").textContent = soundEnabled ? "🔊" : "🔇";

  if (window.jackUser) {
    $("accountLevel").textContent = `${text("level")} ${window.jackUser.level}`;
  }
  setConnection(socket.connected ? "online" : "offline");
  renderAvatars();
  if (latestRoom) renderRoom(latestRoom, true);
}

function toggleLanguage() {
  language = language === "ar" ? "en" : "ar";
  localStorage.setItem("jack-language", language);
  applyLanguage();
  playSound("ui");
}

function createBoard() {
  const board = $("board");
  if (!board) return;
  board.querySelectorAll(".track-cell,.finish-cell,.base-zone,.finish-vault").forEach(element => element.remove());

  const trackCoordinates = [];
  for (let x = 0; x <= 10; x += 1) trackCoordinates.push([x, 0]);
  for (let y = 1; y <= 10; y += 1) trackCoordinates.push([10, y]);
  for (let x = 9; x >= 0; x -= 1) trackCoordinates.push([x, 10]);
  for (let y = 9; y >= 1; y -= 1) trackCoordinates.push([0, y]);

  trackCoordinates.forEach(([x, y], index) => {
    const cell = document.createElement("div");
    cell.className = "track-cell";
    cell.dataset.cell = String(index);
    cell.style.gridColumn = String(x + 1);
    cell.style.gridRow = String(y + 1);
    if (SAFE_CELLS.includes(index)) cell.classList.add("safe");
    [0, 10, 20, 30].forEach((start, playerIndex) => {
      if (index === start) cell.classList.add(`start-${playerIndex}`);
    });
    board.appendChild(cell);
  });

  HOME_COORDS.forEach((coordinates, playerIndex) => {
    coordinates.forEach(([column, row], step) => {
      const cell = document.createElement("div");
      cell.className = `finish-cell home-${playerIndex}`;
      cell.dataset.home = `${playerIndex}-${step}`;
      cell.style.gridColumn = String(column);
      cell.style.gridRow = String(row);
      board.appendChild(cell);
    });
  });

  for (let playerIndex = 0; playerIndex < 4; playerIndex += 1) {
    const base = document.createElement("div");
    base.className = `base-zone base-${playerIndex}`;
    for (let tokenIndex = 0; tokenIndex < 4; tokenIndex += 1) {
      const socketElement = document.createElement("div");
      socketElement.className = "base-socket";
      socketElement.dataset.base = `${playerIndex}-${tokenIndex}`;
      base.appendChild(socketElement);
    }
    board.appendChild(base);

    const vault = document.createElement("div");
    vault.className = `finish-vault vault-${playerIndex}`;
    vault.dataset.vault = String(playerIndex);
    board.appendChild(vault);
  }
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (playerIndex * 10 + progress) % TRACK_LENGTH;
}

function tokenElement(playerIndex, tokenIndex, stackIndex = 0) {
  const token = document.createElement("span");
  token.className = `token p${playerIndex} pos-${stackIndex % 4}`;
  token.textContent = String(tokenIndex + 1);
  token.setAttribute("aria-label", `${text("token")} ${tokenIndex + 1}`);
  return token;
}

function renderTokens(room) {
  $("board").querySelectorAll(".token").forEach(element => element.remove());
  $("board").querySelectorAll(".finish-vault").forEach(element => {
    element.innerHTML = "";
  });

  const stackCounts = new Map();
  room.players.forEach((player, playerIndex) => {
    player.tokens.forEach((progress, tokenIndex) => {
      if (progress === FINISH_PROGRESS) {
        const marker = document.createElement("span");
        $("board").querySelector(`[data-vault="${playerIndex}"]`)?.appendChild(marker);
        return;
      }

      let target = null;
      let stackKey = "";
      if (progress === -1) {
        target = $("board").querySelector(`[data-base="${playerIndex}-${tokenIndex}"]`);
        stackKey = `base-${playerIndex}-${tokenIndex}`;
      } else if (progress < TRACK_LENGTH) {
        const cellIndex = globalCell(playerIndex, progress);
        target = $("board").querySelector(`[data-cell="${cellIndex}"]`);
        stackKey = `track-${cellIndex}`;
      } else {
        const homeStep = progress - TRACK_LENGTH;
        target = $("board").querySelector(`[data-home="${playerIndex}-${homeStep}"]`);
        stackKey = `home-${playerIndex}-${homeStep}`;
      }

      if (!target) return;
      const stackIndex = stackCounts.get(stackKey) || 0;
      target.appendChild(tokenElement(playerIndex, tokenIndex, stackIndex));
      stackCounts.set(stackKey, stackIndex + 1);
    });
  });
}

function displayName(player) {
  if (!player) return "—";
  return player.isBot ? avatarCopy(4)[0] : player.name;
}

function avatarFor(player) {
  return AVATARS[player?.avatarIndex] || AVATARS[4];
}

function renderLobby(room) {
  $("copyCodeBtn").textContent = room.code;
  $("playerCount").textContent = `${room.players.length}/4`;
  $("lobbyPlayers").innerHTML = room.players.map(player => {
    const avatar = avatarFor(player);
    const isMe = player.id === myId;
    const isHost = player.id === room.hostId;
    const status = !player.connected ? text("offline") : isMe ? text("you") : isHost ? text("host") : text("ready");
    return `
      <div class="player-card ${player.connected ? "" : "offline"}">
        <img src="${avatar.image}" alt="" width="50" height="50">
        <div>
          <strong>${escapeHtml(displayName(player))}${isHost ? " 👑" : ""}</strong>
          <small>${escapeHtml(status)}</small>
        </div>
      </div>`;
  }).join("");

  const amHost = room.hostId === myId;
  const connectedPlayers = room.players.filter(player => player.connected).length;
  $("startGameBtn").classList.toggle("hidden", !amHost);
  $("startGameBtn").disabled = connectedPlayers < 2;
  $("lobbyHint").textContent = connectedPlayers < 2
    ? text("waitingOne")
    : amHost
      ? text("everyoneReady")
      : text("waitingHost");
}

function progressPercent(player) {
  const total = player.tokens.reduce((sum, progress) => {
    if (progress < 0) return sum;
    return sum + Math.min(progress, FINISH_PROGRESS);
  }, 0);
  return Math.round((total / (FINISH_PROGRESS * 4)) * 100);
}

function renderGamePlayers(room) {
  $("gamePlayers").innerHTML = room.players.map((player, playerIndex) => {
    const avatar = avatarFor(player);
    const completed = player.tokens.filter(progress => progress === FINISH_PROGRESS).length;
    const current = room.turnIndex === playerIndex && room.status === "playing";
    return `
      <div class="game-player ${current ? "current" : ""} ${player.connected ? "" : "offline"}" style="--player:${avatar.color}">
        <img src="${avatar.image}" alt="" width="44" height="44">
        <div class="game-player-copy">
          <strong>${escapeHtml(displayName(player))}${player.isBot ? " <em>AI</em>" : ""}</strong>
          <div class="token-progress">
            <span class="token-progress-bar"><i style="--progress:${progressPercent(player)}%"></i></span>
            <span class="token-count">${text("completed")} ${completed}/4</span>
          </div>
        </div>
      </div>`;
  }).join("");
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
    if (newProgress === FINISH_PROGRESS) score += 10_000;
    if (oldProgress === -1) score += 1_500;
    if (room.safeCells.includes(landingCell)) score += 300;
    if (landingCell !== null && !room.safeCells.includes(landingCell)) {
      room.players.forEach((opponent, opponentIndex) => {
        if (opponentIndex === playerIndex) return;
        if (opponent.tokens.some(progress => globalCell(opponentIndex, progress) === landingCell)) score += 5_000;
      });
    }
    return { tokenIndex, score };
  }).sort((left, right) => right.score - left.score)[0].tokenIndex;
}

function tutorialHint(room) {
  if (room.status === "finished") return room.winnerId === myId ? text("tutorialWin") : text("tutorialLose");
  const player = room.players[room.turnIndex];
  if (!player) return "";
  if (player.isBot) return text("tutorialBot");
  if (player.id !== myId) return text("tutorialOther");
  if (!room.pendingRoll) return text("tutorialRoll");
  const moves = room.availableMoves || [];
  if (!moves.length) return text("tutorialOther");
  const best = recommendedMove(room, moves);
  return text("tutorialChoose")(best + 1);
}

function renderTokenChooser(room) {
  const chooser = $("tokenChooser");
  const myTurn = room.players[room.turnIndex]?.id === myId;
  const moves = room.availableMoves || [];
  if (!room.pendingRoll || !myTurn || !moves.length || room.status !== "playing") {
    chooser.classList.add("hidden");
    chooser.innerHTML = "";
    return;
  }

  const best = recommendedMove(room, moves);
  chooser.classList.remove("hidden");
  chooser.innerHTML = moves.map(tokenIndex => `
    <button class="token-choice ${tokenIndex === best ? "recommended" : ""}" data-token="${tokenIndex}" type="button">
      ${text("token")} ${tokenIndex + 1}
    </button>`).join("");
  qa(".token-choice").forEach(button => {
    button.addEventListener("click", () => {
      button.disabled = true;
      emitAck("move_token", { code: roomCode, tokenIndex: Number(button.dataset.token) }, response => {
        if (!response.ok) {
          button.disabled = false;
          toast(response.error || text("networkError"));
        }
      });
    });
  });
}

function englishRoomMessage(room) {
  if (room.status === "finished") {
    const winner = room.players.find(player => player.id === room.winnerId);
    return `🏆 ${displayName(winner)} wins Jack Altheeb!`;
  }

  const action = room.lastAction;
  if (!action) {
    if (room.status === "lobby") return "Room ready. Share the code with your crew.";
    return `The game is live. It is ${displayName(room.players[room.turnIndex])}'s turn.`;
  }

  const actor = room.players.find(player => player.id === action.playerId);
  if (action.type === "roll") {
    return action.validMoves?.length
      ? `${displayName(actor)} rolled ${action.roll}. Choose an available token.`
      : `${displayName(actor)} rolled ${action.roll} with no legal move.`;
  }
  if (action.type === "move") {
    if (action.won) return `🏆 ${displayName(actor)} wins Jack Altheeb!`;
    if (action.captured > 0) return `🐺 ${displayName(actor)} captured ${action.captured} token(s) and earned another roll!`;
    if (action.extraTurn) return `🎲 ${displayName(actor)} rolled a six and earned another roll.`;
    return `${displayName(actor)} moved ${action.roll} spaces.`;
  }
  return text("unknownMessage");
}

function roomMessage(room) {
  return language === "ar" ? room.message : englishRoomMessage(room);
}

function revealDice(number) {
  const value = Number(number);
  if (!Number.isInteger(value) || value < 1 || value > 6) return;
  const face = $("diceFace");
  const result = $("diceResult");
  face.textContent = DICE[value - 1];
  result.querySelector("strong").textContent = String(value);
  result.classList.add("show");
  face.classList.remove("dice-pop");
  void face.offsetWidth;
  face.classList.add("dice-pop");
  clearTimeout(diceHideTimer);
  diceHideTimer = setTimeout(() => result.classList.remove("show"), 2_400);
}

function reactToAction(room) {
  const action = room.lastAction;
  if (!action) return;
  const key = [action.type, action.playerId, action.roll, action.tokenIndex, action.captured, action.won].join(":");
  if (key === lastActionKey) return;
  lastActionKey = key;

  if (action.type === "roll") {
    revealDice(action.roll);
    playSound("roll");
  } else if (action.type === "move") {
    if (action.won) {
      playSound("win");
      setTimeout(() => window.refreshJackProfile?.(), 700);
    }
    else if (action.captured > 0) playSound("capture");
    else playSound("move");
  }
}

function renderGame(room) {
  const current = room.players[room.turnIndex];
  const winner = room.players.find(player => player.id === room.winnerId);
  const focusPlayer = room.status === "finished" ? winner : current;
  const focusAvatar = avatarFor(focusPlayer);

  $("modeLabel").textContent = room.mode === "solo" ? text("solo") : text("room");
  $("miniRoomCode").textContent = room.mode === "solo" ? text("solo") : room.code;
  $("gameMessage").textContent = roomMessage(room);
  $("turnAvatar").querySelector("img").src = focusAvatar.image;
  $("turnLabel").textContent = room.status === "finished" ? text("finished") : text("turn");
  $("turnName").textContent = displayName(focusPlayer);

  const myTurn = current?.id === myId;
  const rollButton = $("rollBtn");
  rollButton.disabled = room.status !== "playing" || !myTurn || room.pendingRoll;
  const rollLabel = rollButton.querySelector(":scope > span:nth-child(2)");
  if (room.status === "finished") rollLabel.textContent = text("finished");
  else if (current?.isBot) rollLabel.textContent = text("wolfThinking");
  else if (!myTurn) rollLabel.textContent = text("waitTurn");
  else if (room.pendingRoll) rollLabel.textContent = text("chooseToken");
  else rollLabel.textContent = text("rollDice");

  renderGamePlayers(room);
  renderTokens(room);
  renderTokenChooser(room);
  $("tutorialPanel").classList.toggle("hidden", !room.tutorial);
  if (room.tutorial) $("tutorialText").textContent = tutorialHint(room);
  $("restartBtn").classList.toggle("hidden", room.status !== "finished" || room.hostId !== myId);
  reactToAction(room);
}

function renderRoom(room, force = false) {
  if (!force && room.revision < latestRevision && room.code === roomCode) return;
  latestRoom = room;
  roomCode = room.code;
  latestRevision = room.revision;
  if (!myId && socket.id) myId = socket.id;

  if (room.status === "lobby") {
    showView("lobbyView");
    renderLobby(room);
  } else {
    showView("gameView");
    renderGame(room);
  }
}

function emitAck(event, payload, callback) {
  if (!socket.connected) {
    callback({ ok: false, error: text("networkError") });
    return;
  }
  socket.timeout(10_000).emit(event, payload, (error, response) => {
    if (error) callback({ ok: false, error: text("networkError") });
    else callback(response || { ok: false, error: text("networkError") });
  });
}

function enterRoom(response) {
  if (!response.ok) {
    $("landingError").textContent = response.error || text("networkError");
    return false;
  }
  roomCode = response.code;
  myId = response.playerId || socket.id;
  $("landingError").textContent = "";
  playSound("ui");
  return true;
}

function createSolo(tutorial) {
  const button = tutorial ? $("tutorialBtn") : $("soloBtn");
  button.disabled = true;
  emitAck("create_solo", {
    avatarIndex: selectedAvatar,
    tutorial: Boolean(tutorial)
  }, response => {
    button.disabled = false;
    enterRoom(response);
  });
}

async function copyRoomCode() {
  if (!roomCode) return;
  try {
    await navigator.clipboard.writeText(roomCode);
    toast(text("copied"));
  } catch {
    toast(roomCode);
  }
}

async function shareRoom() {
  const message = text("invite")(roomCode);
  if (navigator.share) {
    try {
      await navigator.share({ title: text("brand"), text: message });
      return;
    } catch {
      // A cancelled share is harmless; copy as fallback.
    }
  }
  try {
    await navigator.clipboard.writeText(message);
    toast(text("copied"));
  } catch {
    toast(message);
  }
}

function resetLocalRoom() {
  latestRoom = null;
  latestRevision = -1;
  roomCode = "";
  myId = socket.id || "";
  lastActionKey = "";
  showView("landingView");
}

async function openLeaderboard() {
  const dialog = $("leaderboardDialog");
  const list = $("leaderboardList");
  list.innerHTML = `<p class="muted">${escapeHtml(text("loadingLeaders"))}</p>`;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");

  try {
    const players = await window.loadJackLeaderboard();
    if (!players.length) {
      list.innerHTML = `<p class="muted">${escapeHtml(text("noLeaders"))}</p>`;
      return;
    }
    list.innerHTML = players.map((player, index) => {
      const avatar = AVATARS[player.avatarIndex] || AVATARS[0];
      return `
        <div class="leader-row">
          <b>${index + 1}</b>
          <img src="${avatar.image}" alt="" width="46" height="46">
          <div>
            <strong>${escapeHtml(player.username)}</strong>
            <small>${text("level")} ${Number(player.level) || 1} • ${Number(player.gamesPlayed) || 0} ${text("games")}</small>
          </div>
          <span class="leader-score"><b>${Number(player.wins) || 0}</b><small>${text("wins")}</small></span>
        </div>`;
    }).join("");
  } catch {
    list.innerHTML = `<p class="error-text">${escapeHtml(text("leaderboardError"))}</p>`;
  }
}

socket.on("connect", () => {
  myId = socket.id;
  setConnection("online");
});

socket.on("disconnect", () => setConnection("offline"));
socket.on("connect_error", () => setConnection("offline"));

socket.on("session_resume", payload => {
  if (!payload?.ok || !payload.room) return;
  roomCode = payload.code;
  myId = payload.playerId || socket.id;
  latestRevision = -1;
  toast(language === "ar" ? "تمت استعادة جولتك." : "Your round was restored.");
  renderRoom(payload.room);
});

socket.on("room_state", room => {
  if (!room?.code) return;
  renderRoom(room);
});

window.addEventListener("jack:user", event => {
  if (!event.detail) return;
  selectedAvatar = Number(event.detail.avatarIndex) || 0;
  renderAvatars();
});

$("languageBtn").addEventListener("click", toggleLanguage);
$("authLanguageBtn").addEventListener("click", toggleLanguage);

$("soundBtn").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("jack-sound", soundEnabled ? "on" : "off");
  $("soundBtn").textContent = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) playSound("ui");
});

$("heroStartBtn").addEventListener("click", () => {
  $("startGrid").scrollIntoView({ behavior: "smooth", block: "start" });
  playSound("ui");
});

$("brandHomeBtn").addEventListener("click", () => {
  if (latestRoom) {
    toast(text("activeRoom"));
    return;
  }
  showView("landingView");
});

$("soloBtn").addEventListener("click", () => createSolo($("tutorialToggle").checked));
$("tutorialBtn").addEventListener("click", () => createSolo(true));

$("createRoomBtn").addEventListener("click", () => {
  const button = $("createRoomBtn");
  button.disabled = true;
  emitAck("create_room", {
    avatarIndex: selectedAvatar,
    tutorial: $("tutorialToggle").checked
  }, response => {
    button.disabled = false;
    enterRoom(response);
  });
});

function joinRoom() {
  const code = $("roomCodeInput").value.trim().toUpperCase();
  $("roomCodeInput").value = code;
  if (code.length !== 5) {
    $("landingError").textContent = language === "ar" ? "أدخل رمزاً صحيحاً من خمس خانات." : "Enter a valid five-character code.";
    return;
  }
  const button = $("joinRoomBtn");
  button.disabled = true;
  emitAck("join_room", { code, avatarIndex: selectedAvatar }, response => {
    button.disabled = false;
    enterRoom(response);
  });
}

$("joinRoomBtn").addEventListener("click", joinRoom);
$("roomCodeInput").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 5);
});
$("roomCodeInput").addEventListener("keydown", event => {
  if (event.key === "Enter") joinRoom();
});

$("copyCodeBtn").addEventListener("click", copyRoomCode);
$("shareBtn").addEventListener("click", shareRoom);

$("startGameBtn").addEventListener("click", () => {
  const button = $("startGameBtn");
  button.disabled = true;
  emitAck("start_game", { code: roomCode }, response => {
    button.disabled = false;
    if (!response.ok) toast(response.error || text("networkError"));
  });
});

$("rollBtn").addEventListener("click", () => {
  const button = $("rollBtn");
  button.disabled = true;
  emitAck("roll_dice", { code: roomCode }, response => {
    if (!response.ok) {
      button.disabled = false;
      toast(response.error || text("networkError"));
    }
  });
});

$("restartBtn").addEventListener("click", () => {
  const button = $("restartBtn");
  button.disabled = true;
  emitAck("restart_game", { code: roomCode }, response => {
    button.disabled = false;
    if (!response.ok) toast(response.error || text("networkError"));
  });
});

$("leaveRoomBtn").addEventListener("click", () => {
  emitAck("leave_room", {}, () => resetLocalRoom());
});

$("leaderboardBtn").addEventListener("click", openLeaderboard);
$("closeLeaderboardBtn").addEventListener("click", () => $("leaderboardDialog").close());
$("leaderboardDialog").addEventListener("click", event => {
  if (event.target === $("leaderboardDialog")) $("leaderboardDialog").close();
});

createBoard();
applyLanguage();
setConnection("connecting");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=5").catch(() => {});
  });
}

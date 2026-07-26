const { randomInt } = require("crypto");

const MAX_PLAYERS = 4;
const TOKENS_PER_PLAYER = 4;
const TRACK_LENGTH = 40;
const HOME_LENGTH = 4;
const FINISH_PROGRESS = TRACK_LENGTH + HOME_LENGTH;
const SAFE_CELLS = new Set([0, 5, 10, 15, 20, 25, 30, 35]);

function rollDie() {
  return randomInt(1, 7);
}

function validMoves(player, roll) {
  if (!player || !Number.isInteger(roll) || roll < 1 || roll > 6) return [];

  return player.tokens
    .map((progress, tokenIndex) => ({ progress, tokenIndex }))
    .filter(({ progress }) => {
      if (progress === FINISH_PROGRESS) return false;
      if (progress === -1) return roll === 6;
      return progress >= 0 && progress + roll <= FINISH_PROGRESS;
    })
    .map(({ tokenIndex }) => tokenIndex);
}

function globalCell(playerIndex, progress) {
  if (progress < 0 || progress >= TRACK_LENGTH) return null;
  return (playerIndex * 10 + progress) % TRACK_LENGTH;
}

function connectedPlayer(player) {
  return Boolean(player && (player.isBot || player.connected));
}

function advanceTurn(room) {
  if (!room.players.length) return null;

  let attempts = 0;
  do {
    room.turnIndex = (room.turnIndex + 1) % room.players.length;
    attempts += 1;
  } while (!connectedPlayer(room.players[room.turnIndex]) && attempts < room.players.length);

  room.lastRoll = null;
  room.pendingRoll = false;
  room.availableMoves = [];
  return room.players[room.turnIndex] || null;
}

function resetRoom(room) {
  room.players.forEach(player => {
    player.tokens = Array(TOKENS_PER_PLAYER).fill(-1);
  });
  room.turnIndex = 0;
  room.lastRoll = null;
  room.pendingRoll = false;
  room.availableMoves = [];
  room.winnerId = null;
  room.lastAction = null;
  room.settled = false;
}

function scoreMove(room, tokenIndex) {
  const player = room.players[room.turnIndex];
  if (!player || !validMoves(player, room.lastRoll).includes(tokenIndex)) return -Infinity;

  const oldProgress = player.tokens[tokenIndex];
  const newProgress = oldProgress === -1 ? 0 : oldProgress + room.lastRoll;
  const landingCell = globalCell(room.turnIndex, newProgress);
  let score = newProgress;

  if (newProgress === FINISH_PROGRESS) score += 10_000;
  if (oldProgress === -1) score += 1_200;
  if (landingCell !== null && SAFE_CELLS.has(landingCell)) score += 350;

  if (landingCell !== null && !SAFE_CELLS.has(landingCell)) {
    room.players.forEach((opponent, opponentIndex) => {
      if (opponentIndex === room.turnIndex) return;
      if (opponent.tokens.some(progress => globalCell(opponentIndex, progress) === landingCell)) {
        score += 5_000;
      }
    });
  }

  return score;
}

function chooseBestMove(room, moves) {
  if (!moves.length) return null;
  return [...moves].sort((left, right) => scoreMove(room, right) - scoreMove(room, left))[0];
}

function applyMove(room, tokenIndex) {
  const player = room.players[room.turnIndex];
  const roll = room.lastRoll;
  const moves = validMoves(player, roll);
  if (!moves.includes(tokenIndex)) {
    return { ok: false, error: "هذه الحركة غير مسموحة." };
  }

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
        if (globalCell(opponentIndex, progress) !== landingCell) return progress;
        captured += 1;
        return -1;
      });
    });
  }

  room.pendingRoll = false;
  room.availableMoves = [];

  const won = player.tokens.every(progress => progress === FINISH_PROGRESS);
  const extraTurn = !won && (captured > 0 || roll === 6);
  room.lastAction = {
    type: "move",
    playerId: player.id,
    tokenIndex,
    roll,
    captured,
    won,
    extraTurn
  };

  return {
    ok: true,
    won,
    captured,
    extraTurn,
    player,
    roll,
    tokenIndex,
    newProgress
  };
}

module.exports = {
  MAX_PLAYERS,
  TOKENS_PER_PLAYER,
  TRACK_LENGTH,
  HOME_LENGTH,
  FINISH_PROGRESS,
  SAFE_CELLS,
  rollDie,
  validMoves,
  globalCell,
  connectedPlayer,
  advanceTurn,
  resetRoom,
  scoreMove,
  chooseBestMove,
  applyMove
};

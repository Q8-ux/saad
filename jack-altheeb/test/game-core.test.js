const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FINISH_PROGRESS,
  SAFE_CELLS,
  advanceTurn,
  applyMove,
  chooseBestMove,
  globalCell,
  resetRoom,
  validMoves
} = require("../game-core");

function player(id, tokens = [-1, -1, -1, -1], connected = true) {
  return { id, name: id, tokens: [...tokens], connected, isBot: false };
}

function room(players) {
  return {
    players,
    turnIndex: 0,
    lastRoll: null,
    pendingRoll: false,
    availableMoves: [],
    lastAction: null,
    winnerId: null,
    settled: false
  };
}

test("a token leaves base only on a six", () => {
  const p = player("A");
  assert.deepEqual(validMoves(p, 5), []);
  assert.deepEqual(validMoves(p, 6), [0, 1, 2, 3]);
});

test("a token cannot overshoot the finish", () => {
  const p = player("A", [FINISH_PROGRESS - 2, FINISH_PROGRESS, -1, -1]);
  assert.deepEqual(validMoves(p, 3), []);
  assert.deepEqual(validMoves(p, 2), [0]);
});

test("landing on a rival outside a safe cell captures it", () => {
  const r = room([
    player("A", [1, -1, -1, -1]),
    player("B", [32, -1, -1, -1])
  ]);
  r.lastRoll = 1;
  r.pendingRoll = true;

  const result = applyMove(r, 0);
  assert.equal(result.ok, true);
  assert.equal(result.captured, 1);
  assert.equal(r.players[1].tokens[0], -1);
  assert.equal(result.extraTurn, true);
});

test("safe cells protect rival tokens", () => {
  const r = room([
    player("A", [4, -1, -1, -1]),
    player("B", [35, -1, -1, -1])
  ]);
  r.lastRoll = 1;
  r.pendingRoll = true;
  assert.equal(SAFE_CELLS.has(globalCell(0, 5)), true);

  const result = applyMove(r, 0);
  assert.equal(result.captured, 0);
  assert.equal(r.players[1].tokens[0], 35);
});

test("turn progression skips disconnected players", () => {
  const r = room([
    player("A"),
    player("B", [-1, -1, -1, -1], false),
    player("C")
  ]);
  advanceTurn(r);
  assert.equal(r.turnIndex, 2);
});

test("the bot prioritizes a winning move", () => {
  const r = room([
    player("BOT", [FINISH_PROGRESS - 2, 7, -1, -1]),
    player("B")
  ]);
  r.players[0].isBot = true;
  r.lastRoll = 2;
  const moves = validMoves(r.players[0], r.lastRoll);
  assert.equal(chooseBestMove(r, moves), 0);
});

test("reset restores every token and transient field", () => {
  const r = room([player("A", [2, 3, 4, FINISH_PROGRESS])]);
  r.lastRoll = 6;
  r.pendingRoll = true;
  r.winnerId = "A";
  resetRoom(r);
  assert.deepEqual(r.players[0].tokens, [-1, -1, -1, -1]);
  assert.equal(r.lastRoll, null);
  assert.equal(r.winnerId, null);
});

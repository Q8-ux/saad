from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional

import chess

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000,
}

LEVELS = {
    "beginner": {"label": "مبتدئ جداً", "depth": 0, "noise": 260},
    "easy": {"label": "مبتدئ", "depth": 1, "noise": 180},
    "club": {"label": "هاوٍ", "depth": 1, "noise": 90},
    "intermediate": {"label": "متوسط", "depth": 2, "noise": 45},
    "advanced": {"label": "متقدم", "depth": 2, "noise": 15},
    "expert": {"label": "خبير", "depth": 3, "noise": 5},
}

@dataclass
class EngineMove:
    uci: str
    san: str
    score: int


def evaluate(board: chess.Board) -> int:
    if board.is_checkmate():
        return -999999 if board.turn == chess.WHITE else 999999
    if board.is_stalemate() or board.is_insufficient_material():
        return 0

    score = 0
    for piece_type, value in PIECE_VALUES.items():
        score += len(board.pieces(piece_type, chess.WHITE)) * value
        score -= len(board.pieces(piece_type, chess.BLACK)) * value

    # Small mobility bonus makes the AI less mechanical.
    mobility = board.legal_moves.count()
    score += mobility * (2 if board.turn == chess.WHITE else -2)
    return score


def minimax(board: chess.Board, depth: int, alpha: int, beta: int) -> int:
    if depth <= 0 or board.is_game_over():
        return evaluate(board)

    if board.turn == chess.WHITE:
        best = -10**9
        for move in board.legal_moves:
            board.push(move)
            best = max(best, minimax(board, depth - 1, alpha, beta))
            board.pop()
            alpha = max(alpha, best)
            if beta <= alpha:
                break
        return best

    best = 10**9
    for move in board.legal_moves:
        board.push(move)
        best = min(best, minimax(board, depth - 1, alpha, beta))
        board.pop()
        beta = min(beta, best)
        if beta <= alpha:
            break
    return best


def choose_move(board: chess.Board, level: str = "intermediate") -> Optional[EngineMove]:
    legal = list(board.legal_moves)
    if not legal:
        return None

    cfg = LEVELS.get(level, LEVELS["intermediate"])
    if cfg["depth"] == 0:
        move = random.choice(legal)
        san = board.san(move)
        return EngineMove(move.uci(), san, 0)

    maximizing = board.turn == chess.WHITE
    candidates: list[tuple[chess.Move, int, str]] = []

    for move in legal:
        san = board.san(move)
        board.push(move)
        score = minimax(board, cfg["depth"] - 1, -10**9, 10**9)
        board.pop()
        score += random.randint(-cfg["noise"], cfg["noise"])
        candidates.append((move, score, san))

    candidates.sort(key=lambda item: item[1], reverse=maximizing)
    move, score, san = candidates[0]
    return EngineMove(move.uci(), san, score)

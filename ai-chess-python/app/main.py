from __future__ import annotations

from pathlib import Path
from typing import Optional

import chess
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .engine import LEVELS, choose_move

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="AI Chess Arena", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class LegalMovesRequest(BaseModel):
    fen: str
    square: str


class MoveRequest(BaseModel):
    fen: str
    from_square: str
    to_square: str
    promotion: Optional[str] = "q"
    level: str = "intermediate"


def board_payload(board: chess.Board):
    outcome = board.outcome(claim_draw=True)
    status = "playing"
    winner = None
    reason = None

    if outcome:
        status = "game_over"
        winner = "white" if outcome.winner is chess.WHITE else "black" if outcome.winner is chess.BLACK else "draw"
        reason = outcome.termination.name.lower()

    return {
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "check": board.is_check(),
        "status": status,
        "winner": winner,
        "reason": reason,
        "legal_count": board.legal_moves.count(),
    }


@app.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/levels")
def levels():
    return LEVELS


@app.post("/api/legal")
def legal_moves(req: LegalMovesRequest):
    try:
        board = chess.Board(req.fen)
        square = chess.parse_square(req.square)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid board state or square") from exc

    moves = [m.uci()[2:4] for m in board.legal_moves if m.from_square == square]
    return {"moves": moves}


@app.post("/api/move")
def make_move(req: MoveRequest):
    try:
        board = chess.Board(req.fen)
        promotion_map = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
        promotion = None
        from_sq = chess.parse_square(req.from_square)
        to_sq = chess.parse_square(req.to_square)

        piece = board.piece_at(from_sq)
        if piece and piece.piece_type == chess.PAWN and chess.square_rank(to_sq) in (0, 7):
            promotion = promotion_map.get((req.promotion or "q").lower(), chess.QUEEN)

        move = chess.Move(from_sq, to_sq, promotion=promotion)
        if move not in board.legal_moves:
            raise HTTPException(status_code=400, detail="Illegal move")

        player_san = board.san(move)
        board.push(move)
        response = {"player_move": move.uci(), "player_san": player_san, **board_payload(board)}

        if board.is_game_over(claim_draw=True):
            response["ai_move"] = None
            response["ai_san"] = None
            return response

        ai = choose_move(board, req.level)
        if ai:
            ai_move = chess.Move.from_uci(ai.uci)
            board.push(ai_move)
            response.update({"ai_move": ai.uci, "ai_san": ai.san, **board_payload(board)})

        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid move request") from exc


@app.get("/health")
def health():
    return {"ok": True}

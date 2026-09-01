from __future__ import annotations

import os
import logging
from pathlib import Path
from time import perf_counter
from typing import Annotated, Literal, Optional
from uuid import uuid4

import chess
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .engine import LEVELS, choose_move
from .multiplayer import router as multiplayer_router

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
MAX_GAME_PLIES = 1024
logger = logging.getLogger("ai_chess.requests")

Fen = Annotated[str, Field(min_length=15, max_length=128)]
Square = Annotated[str, Field(pattern=r"^[a-h][1-8]$")]
UciMove = Annotated[str, Field(pattern=r"^[a-h][1-8][a-h][1-8][qrbn]?$")]
Level = Literal["beginner", "easy", "club", "intermediate", "advanced", "expert"]

app = FastAPI(title="AI Chess Arena", version="1.0.1")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(multiplayer_router)


class LegalMovesRequest(BaseModel):
    fen: Fen
    square: Square


class HintRequest(BaseModel):
    fen: Fen
    move_history: list[UciMove] = Field(default_factory=list, max_length=MAX_GAME_PLIES)


class MoveRequest(BaseModel):
    fen: Fen
    from_square: Square
    to_square: Square
    promotion: Optional[Literal["q", "r", "b", "n"]] = "q"
    level: Level = "intermediate"
    move_history: list[UciMove] = Field(default_factory=list, max_length=MAX_GAME_PLIES)


@app.middleware("http")
async def add_request_diagnostics(request: Request, call_next):
    """Add safe correlation and timing headers without exposing user data."""
    started = perf_counter()
    supplied_request_id = request.headers.get("x-request-id", "").strip()[:64]
    request_id = (
        supplied_request_id
        if supplied_request_id
        and all(character.isalnum() or character in "-_." for character in supplied_request_id)
        else uuid4().hex
    )
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request_failed request_id=%s path=%s", request_id, request.url.path)
        raise

    duration_ms = (perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["Server-Timing"] = f"app;dur={duration_ms:.2f}"
    if request.url.path.startswith("/api/") or request.url.path in {"/health", "/ready"}:
        response.headers.setdefault("Cache-Control", "no-store")
    logger.info(
        "request_complete request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


def board_from_history(fen: str, move_history: list[str]) -> chess.Board:
    """Rebuild a game with its move stack so repetition rules still work."""
    if not move_history:
        return chess.Board(fen)

    board = chess.Board()
    for uci in move_history:
        try:
            move = chess.Move.from_uci(uci)
        except ValueError as exc:
            raise ValueError("Invalid move history") from exc
        if move not in board.legal_moves:
            raise ValueError("Illegal move in history")
        board.push(move)

    if board.fen() != chess.Board(fen).fen():
        raise ValueError("Move history does not match FEN")
    return board


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
    return FileResponse(
        STATIC_DIR / "index.html",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/api/levels")
def levels():
    return LEVELS


@app.get("/api/public-config")
def public_config():
    multiplayer_configured = all(
        os.getenv(key, "") for key in ("SUPABASE_URL", "SUPABASE_KEY", "GAME_SERVER_SECRET")
    )
    return {
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_key": os.getenv("SUPABASE_KEY", ""),
        "app_url": os.getenv("APP_URL", ""),
        "capabilities": {
            "ai": True,
            "multiplayer": multiplayer_configured,
            "accounts": bool(os.getenv("SUPABASE_URL", "") and os.getenv("SUPABASE_KEY", "")),
        },
    }


@app.post("/api/legal")
def legal_moves(req: LegalMovesRequest):
    try:
        board = chess.Board(req.fen)
        square = chess.parse_square(req.square)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid board state or square") from exc

    moves = [m.uci()[2:4] for m in board.legal_moves if m.from_square == square]
    return {"moves": moves}


@app.post("/api/hint")
def suggest_move(req: HintRequest):
    try:
        board = board_from_history(req.fen, req.move_history)
        if board.turn is not chess.WHITE:
            raise HTTPException(status_code=409, detail="Hints are available on the player's turn")
        if board.is_game_over(claim_draw=True):
            raise HTTPException(status_code=409, detail="Game is already over")
        suggestion = choose_move(board, "advanced")
        if not suggestion:
            raise HTTPException(status_code=409, detail="No legal hint available")
        move = chess.Move.from_uci(suggestion.uci)
        piece = board.piece_at(move.from_square)
        return {
            "from_square": chess.square_name(move.from_square),
            "to_square": chess.square_name(move.to_square),
            "san": suggestion.san,
            "piece": chess.piece_name(piece.piece_type) if piece else "piece",
            "capture": board.is_capture(move),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid hint request") from exc


@app.post("/api/move")
def make_move(req: MoveRequest):
    try:
        board = board_from_history(req.fen, req.move_history)
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
        history = [item.uci() for item in board.move_stack]
        response = {
            "player_move": move.uci(),
            "player_san": player_san,
            "move_history": history,
            **board_payload(board),
        }

        if board.is_game_over(claim_draw=True):
            response["ai_move"] = None
            response["ai_san"] = None
            return response

        ai = choose_move(board, req.level)
        if ai:
            ai_move = chess.Move.from_uci(ai.uci)
            board.push(ai_move)
            response.update({
                "ai_move": ai.uci,
                "ai_san": ai.san,
                "move_history": [item.uci() for item in board.move_stack],
                **board_payload(board),
            })

        return response
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid move request") from exc


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/ready")
def readiness():
    static_assets = (STATIC_DIR / "index.html").is_file()
    ai_engine = bool(LEVELS)
    multiplayer = all(
        os.getenv(key, "") for key in ("SUPABASE_URL", "SUPABASE_KEY", "GAME_SERVER_SECRET")
    )
    core_ready = static_assets and ai_engine
    return {
        "ok": core_ready,
        "status": "ready" if core_ready and multiplayer else "degraded",
        "service": "ai-chess-kuwait",
        "version": app.version,
        "components": {
            "static_assets": static_assets,
            "ai_engine": ai_engine,
            "multiplayer": multiplayer,
        },
    }

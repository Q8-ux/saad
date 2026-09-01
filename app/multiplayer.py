from __future__ import annotations

import asyncio
import os
from collections import defaultdict
from typing import Any
from uuid import UUID

import chess
import httpx
from fastapi import APIRouter, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SERVER_SECRET = os.getenv("GAME_SERVER_SECRET", "")


class ActionRequest(BaseModel):
    action: str
    code: str | None = None
    game_id: UUID | None = None


class MoveRequest(BaseModel):
    game_id: UUID
    from_square: str
    to_square: str
    promotion: str = "q"


class Hub:
    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.lock = asyncio.Lock()

    async def connect(self, game_id: str, socket: WebSocket) -> None:
        await socket.accept()
        async with self.lock:
            self.rooms[game_id].add(socket)

    async def disconnect(self, game_id: str, socket: WebSocket) -> None:
        async with self.lock:
            self.rooms[game_id].discard(socket)
            if not self.rooms[game_id]:
                self.rooms.pop(game_id, None)

    async def publish(self, game_id: str, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for socket in list(self.rooms.get(game_id, ())):
            try:
                await socket.send_json(payload)
            except Exception:
                dead.append(socket)
        for socket in dead:
            await self.disconnect(game_id, socket)


hub = Hub()


async def current_user(token: str) -> dict[str, Any]:
    if not token or not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=401, detail="Authentication required")
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return response.json()


def bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    return authorization[7:]


async def game_rpc(user_id: str, token: str, action: str, **values: Any) -> dict[str, Any]:
    payload = {
        "p_secret": SERVER_SECRET,
        "p_action": action,
        "p_user": user_id,
        "p_game": values.get("game_id"),
        "p_code": values.get("code"),
        "p_fen": values.get("fen"),
        "p_history": values.get("history"),
        "p_status": values.get("status"),
        "p_result": values.get("result"),
        "p_reason": values.get("reason"),
    }
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/chess_server_game",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if response.status_code >= 400:
        detail = response.json().get("message", "Multiplayer operation failed")
        raise HTTPException(status_code=400, detail=detail)
    return response.json()


async def find_recent_match(user_id: str, token: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=12) as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/chess_server_find_match",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"p_secret": SERVER_SECRET, "p_user": user_id},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Match lookup failed")
    return response.json()


@router.post("/action")
async def multiplayer_action(req: ActionRequest, authorization: str | None = Header(default=None)):
    user = await current_user(bearer(authorization))
    if req.action not in {"create_private", "join_private", "enqueue", "get"}:
        raise HTTPException(status_code=400, detail="Invalid action")
    token = bearer(authorization)
    if req.action == "enqueue":
        existing = await find_recent_match(user["id"], token)
        if existing:
            return existing
    return await game_rpc(
        user["id"],
        token,
        req.action,
        code=req.code,
        game_id=str(req.game_id) if req.game_id else None,
    )


@router.post("/move")
async def multiplayer_move(req: MoveRequest, authorization: str | None = Header(default=None)):
    user = await current_user(bearer(authorization))
    token = bearer(authorization)
    game = await game_rpc(user["id"], token, "get", game_id=str(req.game_id))
    board = chess.Board()
    try:
        for uci in game["move_history"]:
            board.push_uci(uci)
        if board.fen() != game["fen"]:
            raise ValueError("Stored game state mismatch")
        expected = game["white_id"] if board.turn == chess.WHITE else game["black_id"]
        if user["id"] != expected:
            raise HTTPException(status_code=409, detail="Not your turn")
        promotion_map = {"q": chess.QUEEN, "r": chess.ROOK, "b": chess.BISHOP, "n": chess.KNIGHT}
        from_sq = chess.parse_square(req.from_square)
        to_sq = chess.parse_square(req.to_square)
        promotion = None
        piece = board.piece_at(from_sq)
        if piece and piece.piece_type == chess.PAWN and chess.square_rank(to_sq) in (0, 7):
            promotion = promotion_map.get(req.promotion.lower(), chess.QUEEN)
        move = chess.Move(from_sq, to_sq, promotion=promotion)
        if move not in board.legal_moves:
            raise HTTPException(status_code=400, detail="Illegal move")
        san = board.san(move)
        board.push(move)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid game state") from exc

    outcome = board.outcome(claim_draw=True)
    status = "finished" if outcome else "active"
    result = None
    reason = None
    if outcome:
        result = "white" if outcome.winner is chess.WHITE else "black" if outcome.winner is chess.BLACK else "draw"
        reason = outcome.termination.name.lower()

    updated = await game_rpc(
        user["id"],
        token,
        "move",
        game_id=str(req.game_id),
        fen=board.fen(),
        history=[item.uci() for item in board.move_stack],
        status=status,
        result=result,
        reason=reason,
    )
    payload = {"type": "game_state", "game": updated, "san": san}
    await hub.publish(str(req.game_id), payload)
    return payload


@router.websocket("/ws/{game_id}")
async def multiplayer_socket(websocket: WebSocket, game_id: str, token: str):
    try:
        user = await current_user(token)
        game = await game_rpc(user["id"], token, "get", game_id=game_id)
    except HTTPException:
        await websocket.close(code=4401)
        return
    await hub.connect(game_id, websocket)
    await websocket.send_json({"type": "game_state", "game": game, "reconnected": True})
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await hub.disconnect(game_id, websocket)

from __future__ import annotations

import os
import time
from collections import deque
from typing import Literal

import chess
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["learning"])
_calls: deque[float] = deque()


class ExplainRequest(BaseModel):
    fen: str = Field(max_length=120)
    uci: str = Field(min_length=4, max_length=5)
    language: Literal["ar", "en", "ur"] = "ar"


def _fallback(san: str, capture: bool, check: bool, language: str) -> str:
    if language == "en":
        return f"{san} is a legal move. " + ("It captures a piece. " if capture else "") + ("It gives check." if check else "Watch how the opponent responds.")
    if language == "ur":
        return f"{san} ایک قانونی چال ہے۔ " + ("یہ حریف کا مہرہ لیتی ہے۔ " if capture else "") + ("یہ شہ دیتی ہے۔" if check else "اب حریف کا جواب دیکھیے۔")
    return f"النقلة {san} قانونية. " + ("تأسر قطعة للخصم. " if capture else "") + ("وتعطي كش." if check else "راقب رد الخصم بعدها.")


async def _nvidia_explanation(fen: str, san: str, capture: bool, check: bool, language: str) -> str | None:
    key = os.getenv("NVIDIA_API_KEY", "")
    if not key:
        return None
    models = list(dict.fromkeys([
        os.getenv("NVIDIA_CHESS_MODEL", "z-ai/glm-5.3-flash"),
        "deepseek-ai/deepseek-v4.1-flash",
    ]))
    facts = f"FEN={fen}; SAN={san}; capture={capture}; check={check}"
    prompt = (
        "Explain this already validated chess move to a beginner in 1-2 short sentences. "
        f"Use language={language}. State only facts supported by the supplied position and flags; "
        "do not claim a forced win, best move, evaluation score, or engine line. "
        "Output explanation text only."
    )
    async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=2.0), follow_redirects=False) as client:
        for model in models:
            try:
                response = await client.post(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={"model": model, "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": facts},
                    ], "max_tokens": 160, "temperature": 0.2, "stream": False},
                )
                if response.status_code != 200:
                    continue
                content = response.json()["choices"][0]["message"]["content"]
                if isinstance(content, str) and 15 <= len(content.strip()) <= 500:
                    return content.strip()
            except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
                pass
    return None


@router.post("/explain")
async def explain(req: ExplainRequest, request: Request):
    try:
        board = chess.Board(req.fen)
        move = chess.Move.from_uci(req.uci)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid position or move") from exc
    if not board.is_valid() or move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Move is not legal in this position")

    san = board.san(move)
    capture = board.is_capture(move)
    board.push(move)
    check = board.is_check()
    fallback = _fallback(san, capture, check, req.language)

    # A small process-local ceiling prevents an exposed learning endpoint from
    # issuing unlimited provider requests. Exceeding it keeps the feature usable.
    now = time.monotonic()
    while _calls and now - _calls[0] > 60:
        _calls.popleft()
    if len(_calls) >= 24:
        return {"san": san, "explanation": fallback, "source": "rules"}
    _calls.append(now)
    explanation = await _nvidia_explanation(req.fen, san, capture, check, req.language)
    return {"san": san, "explanation": explanation or fallback, "source": "nvidia" if explanation else "rules"}

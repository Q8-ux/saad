from __future__ import annotations

import os
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/explainer", tags=["explainer"])

STORYCAST_API_URL = os.getenv("STORYCAST_API_URL", "").rstrip("/")
STORYCAST_API_KEY = os.getenv("STORYCAST_API_KEY", "")


class ExplainerRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    language: Literal["ar", "en", "ur"] = "ar"
    duration_seconds: int = Field(default=90, ge=15, le=600)
    fen: Optional[str] = None
    moves: list[str] = Field(default_factory=list, max_length=1024)
    style: Literal["educational", "game_review", "puzzle"] = "educational"


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if STORYCAST_API_KEY:
        headers["Authorization"] = f"Bearer {STORYCAST_API_KEY}"
    return headers


@router.get("/config")
def explainer_config():
    return {
        "configured": bool(STORYCAST_API_URL),
        "use_cases": ["beginner lesson", "game review", "tactical puzzle"],
        "outputs": ["16:9", "9:16"],
    }


@router.post("/generate")
async def generate_explainer(req: ExplainerRequest):
    if not STORYCAST_API_URL:
        raise HTTPException(status_code=503, detail="STORYCAST_API_URL is not configured")
    payload = {
        "topic": req.topic,
        "language": req.language,
        "duration_seconds": req.duration_seconds,
        "style": req.style,
        "product": "ai-chess-kuwait",
        "context": {"fen": req.fen, "moves": req.moves},
        "output": {"aspect_ratios": ["16:9", "9:16"], "narration": True, "captions": True},
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(f"{STORYCAST_API_URL}/api/generate", headers=_headers(), json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Storycast error: {response.text[:300]}")
    return response.json()

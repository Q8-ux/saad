from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field, HttpUrl

router = APIRouter(prefix="/api/marketing", tags=["marketing"])

OPENSHORTS_API_URL = os.getenv("OPENSHORTS_API_URL", "https://api.openshorts.app").rstrip("/")
OPENSHORTS_API_KEY = os.getenv("OPENSHORTS_API_KEY", "")
OPENSHORTS_WEBHOOK_SECRET = os.getenv("OPENSHORTS_WEBHOOK_SECRET", "")
APP_URL = os.getenv("APP_URL", "https://ai-chess-kuwait.onrender.com").rstrip("/")

CONTENT_PILLARS = [
    {"id": "puzzle", "ar": "تحديات تكتيكية", "hook": "هل تجد أفضل نقلة خلال 10 ثوانٍ؟"},
    {"id": "mistake", "ar": "أخطاء شائعة", "hook": "هذه النقلة تخسر المباراة — هل تعرف لماذا؟"},
    {"id": "ai", "ar": "تحدي الذكاء الاصطناعي", "hook": "هل تستطيع هزيمة AI Chess Kuwait؟"},
    {"id": "beginner", "ar": "تعليم المبتدئين", "hook": "نقلة واحدة تغيّر موقفك بالكامل."},
    {"id": "social", "ar": "تحدي صديق", "hook": "أرسل التحدي لصديقك وحدد من الأقوى."},
    {"id": "elo", "ar": "التصنيف والنتائج", "hook": "ابدأ من 1200 وارفع تصنيفك مباراة بعد مباراة."},
]


class CampaignRequest(BaseModel):
    pillar: Literal["puzzle", "mistake", "ai", "beginner", "social", "elo"] = "puzzle"
    language: Literal["ar", "en", "ur"] = "ar"
    source_url: Optional[HttpUrl] = None
    target_clips: int = Field(default=3, ge=1, le=10)
    clip_min_seconds: int = Field(default=15, ge=5, le=120)
    clip_max_seconds: int = Field(default=35, ge=5, le=180)
    publish_ready: bool = True


class EventRequest(BaseModel):
    event: Literal["landing", "signup", "game_started", "game_completed", "invite_shared"]
    campaign: Optional[str] = None
    content_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


def _headers() -> dict[str, str]:
    if not OPENSHORTS_API_KEY:
        raise HTTPException(status_code=503, detail="OPENSHORTS_API_KEY is not configured")
    return {"Authorization": f"Bearer {OPENSHORTS_API_KEY}", "Content-Type": "application/json"}


def _campaign_copy(pillar: str, language: str) -> dict:
    item = next(x for x in CONTENT_PILLARS if x["id"] == pillar)
    hooks = {
        "ar": item["hook"],
        "en": "Can you find the best move before time runs out?" if pillar == "puzzle" else "Challenge yourself in AI Chess Kuwait.",
        "ur": "کیا آپ وقت ختم ہونے سے پہلے بہترین چال تلاش کر سکتے ہیں؟" if pillar == "puzzle" else "AI Chess Kuwait میں خود کو چیلنج کریں۔",
    }
    ctas = {
        "ar": "العب الآن وشارك التحدي مع صديقك",
        "en": "Play now and challenge a friend",
        "ur": "اب کھیلیں اور دوست کو چیلنج کریں",
    }
    return {"pillar": pillar, "hook": hooks[language], "cta": ctas[language], "url": APP_URL}


@router.get("/config")
def marketing_config():
    return {
        "product": "AI Chess Kuwait",
        "category": "digital chess game",
        "app_url": APP_URL,
        "openshorts_configured": bool(OPENSHORTS_API_KEY),
        "pillars": CONTENT_PILLARS,
        "funnel": ["short_view", "landing", "signup", "game_started", "game_completed", "invite_shared"],
    }


@router.post("/campaign/prepare")
def prepare_campaign(req: CampaignRequest):
    copy = _campaign_copy(req.pillar, req.language)
    return {
        **copy,
        "language": req.language,
        "target_clips": req.target_clips,
        "duration": {"min": req.clip_min_seconds, "max": req.clip_max_seconds},
        "utm_url": f"{APP_URL}/?utm_source=shorts&utm_medium=video&utm_campaign=route10_{req.pillar}",
        "publish_ready": req.publish_ready,
    }


@router.post("/campaign/process-video")
async def process_campaign_video(req: CampaignRequest, request: Request):
    if not req.source_url:
        raise HTTPException(status_code=400, detail="source_url is required")
    callback = str(request.base_url).rstrip("/") + "/api/marketing/openshorts/webhook"
    payload = {
        "url": str(req.source_url),
        "acknowledged": True,
        "target_clips": req.target_clips,
        "clip_min_seconds": req.clip_min_seconds,
        "clip_max_seconds": req.clip_max_seconds,
        "captions": True,
        "auto_hook": True,
        "output_format": "vertical",
        "layouts": ["auto"],
        "webhook_url": callback,
    }
    if OPENSHORTS_WEBHOOK_SECRET:
        payload["webhook_secret"] = OPENSHORTS_WEBHOOK_SECRET
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(f"{OPENSHORTS_API_URL}/api/process", headers=_headers(), json=payload)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"OpenShorts error: {response.text[:300]}")
    return {"campaign": _campaign_copy(req.pillar, req.language), "openshorts": response.json()}


@router.post("/openshorts/webhook")
async def openshorts_webhook(request: Request, x_openshorts_signature: str | None = Header(default=None)):
    body = await request.body()
    if OPENSHORTS_WEBHOOK_SECRET:
        if not x_openshorts_signature:
            raise HTTPException(status_code=401, detail="Missing OpenShorts signature")
        expected = hmac.new(OPENSHORTS_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        supplied = x_openshorts_signature.removeprefix("sha256=")
        if not hmac.compare_digest(expected, supplied):
            raise HTTPException(status_code=401, detail="Invalid OpenShorts signature")
    return {"received": True, "received_at": datetime.now(timezone.utc).isoformat()}


@router.post("/events")
def record_marketing_event(req: EventRequest):
    # Stable event contract for the conversion loop. A persistent analytics sink
    # (Supabase/warehouse) can consume this endpoint without changing the game UI.
    return {
        "accepted": True,
        "event": req.event,
        "campaign": req.campaign,
        "content_id": req.content_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

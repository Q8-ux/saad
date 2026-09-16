from __future__ import annotations
import os
from typing import Optional
import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, HttpUrl

router = APIRouter(prefix="/api/chinese", tags=["chinese-route"])
MPT_API_URL = os.getenv("MONEYPRINTERTURBO_API_URL", "").rstrip("/")
MPT_API_KEY = os.getenv("MONEYPRINTERTURBO_API_KEY", "")

class ChineseJob(BaseModel):
    product_id: str
    subject: str = Field(min_length=1, max_length=20000)
    script: Optional[str] = None
    language: str = "zh-CN"
    source_media_url: Optional[HttpUrl] = None
    audio_url: Optional[HttpUrl] = None
    aspect_ratio: str = "9:16"
    use_case: str = "china_ecosystem"
    metadata: dict = Field(default_factory=dict)

def headers():
    h={"Content-Type":"application/json"}
    if MPT_API_KEY: h["x-api-key"]=MPT_API_KEY
    return h

@router.get("/status")
def status():
    return {
        "engine":"MoneyPrinterTurbo",
        "configured":bool(MPT_API_URL),
        "role":"Chinese/local production route",
        "capabilities":["multilingual_script","china_models","china_video_models","subtitles","music","local_media","batch","direct_publish"],
        "deduplication":"Does not replace VoiceStudio, Poolday, or OpenShorts; Route 10 invokes it only when Chinese/local providers or a self-hosted fallback is explicitly selected."
    }

@router.post("/generate")
async def generate(req: ChineseJob, authorization: str|None=Header(default=None)):
    if not MPT_API_URL: raise HTTPException(503,"MONEYPRINTERTURBO_API_URL not configured")
    # Prefer supplied assets. Never regenerate audio or media that already exists.
    payload={
        "video_subject":req.subject,
        "video_script":req.script,
        "video_language":req.language,
        "aspect_ratio":req.aspect_ratio,
        "custom_audio_url":str(req.audio_url) if req.audio_url else None,
        "custom_media_url":str(req.source_media_url) if req.source_media_url else None,
        "metadata":{"product_id":req.product_id,"route":"chinese",**req.metadata},
    }
    async with httpx.AsyncClient(timeout=600) as client:
        r=await client.post(f"{MPT_API_URL}/api/v1/videos",headers=headers(),json=payload)
    if r.status_code>=400: raise HTTPException(502,f"MoneyPrinterTurbo error: {r.text[:300]}")
    try: result=r.json()
    except Exception: result={"response":r.text[:1000]}
    return {"engine":"MoneyPrinterTurbo","route":"chinese","result":result}

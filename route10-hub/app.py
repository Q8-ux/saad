from __future__ import annotations
import hashlib, hmac, os
from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field, HttpUrl

app = FastAPI(title="Route 10 Marketing Hub", version="1.0.0")
OPENSHORTS_API_URL = os.getenv("OPENSHORTS_API_URL", "https://api.openshorts.app").rstrip("/")
OPENSHORTS_API_KEY = os.getenv("OPENSHORTS_API_KEY", "")
WEBHOOK_SECRET = os.getenv("OPENSHORTS_WEBHOOK_SECRET", "")
HUB_TOKEN = os.getenv("ROUTE10_HUB_TOKEN", "")

PRODUCTS = {
 "ai-chess-kuwait": {"name":"AI Chess Kuwait","url":"https://ai-chess-kuwait.onrender.com","pillars":["puzzle","mistake","ai","beginner","social","elo"]},
}

class Campaign(BaseModel):
 product_id: str
 source_url: HttpUrl
 language: str = "ar"
 pillar: str = "puzzle"
 target_clips: int = Field(3, ge=1, le=10)

class Event(BaseModel):
 product_id: str
 event: str
 campaign: Optional[str] = None
 content_id: Optional[str] = None
 metadata: dict = Field(default_factory=dict)

def authorize(value: str | None):
 if HUB_TOKEN and value != f"Bearer {HUB_TOKEN}": raise HTTPException(401,"Invalid hub token")

def product(pid: str):
 if pid not in PRODUCTS: raise HTTPException(404,"Unknown product")
 return PRODUCTS[pid]

@app.get("/health")
def health(): return {"ok":True,"products":len(PRODUCTS),"openshorts":bool(OPENSHORTS_API_KEY)}

@app.get("/api/products")
def products(authorization: str|None=Header(default=None)):
 authorize(authorization); return PRODUCTS

@app.post("/api/campaigns")
async def campaign(req: Campaign, request: Request, authorization: str|None=Header(default=None)):
 authorize(authorization); p=product(req.product_id)
 if req.pillar not in p["pillars"]: raise HTTPException(400,"Unsupported pillar")
 if not OPENSHORTS_API_KEY: raise HTTPException(503,"OPENSHORTS_API_KEY not configured")
 campaign_id=f"{req.product_id}-{req.pillar}-{int(datetime.now(timezone.utc).timestamp())}"
 tracking=f'{p["url"]}/?utm_source=route10&utm_medium=short_video&utm_campaign={campaign_id}'
 payload={"url":str(req.source_url),"acknowledged":True,"target_clips":req.target_clips,"captions":True,"auto_hook":True,"output_format":"vertical","webhook_url":str(request.base_url).rstrip('/')+"/api/webhooks/openshorts","metadata":{"product_id":req.product_id,"campaign_id":campaign_id,"language":req.language,"pillar":req.pillar,"cta_url":tracking}}
 if WEBHOOK_SECRET: payload["webhook_secret"]=WEBHOOK_SECRET
 async with httpx.AsyncClient(timeout=30) as client:
  r=await client.post(f"{OPENSHORTS_API_URL}/api/process",headers={"Authorization":f"Bearer {OPENSHORTS_API_KEY}","Content-Type":"application/json"},json=payload)
 if r.status_code>=400: raise HTTPException(502,f"OpenShorts error: {r.text[:300]}")
 return {"campaign_id":campaign_id,"product":p["name"],"tracking_url":tracking,"openshorts":r.json()}

@app.post("/api/events")
def event(req: Event, authorization: str|None=Header(default=None)):
 authorize(authorization); product(req.product_id)
 return {"accepted":True,"product_id":req.product_id,"event":req.event,"campaign":req.campaign,"content_id":req.content_id,"at":datetime.now(timezone.utc).isoformat()}

@app.post("/api/webhooks/openshorts")
async def webhook(request: Request, x_openshorts_signature: str|None=Header(default=None)):
 body=await request.body()
 if WEBHOOK_SECRET:
  if not x_openshorts_signature: raise HTTPException(401,"Missing signature")
  expected=hmac.new(WEBHOOK_SECRET.encode(),body,hashlib.sha256).hexdigest()
  if not hmac.compare_digest(expected,x_openshorts_signature.removeprefix("sha256=")): raise HTTPException(401,"Invalid signature")
 return {"received":True,"at":datetime.now(timezone.utc).isoformat()}

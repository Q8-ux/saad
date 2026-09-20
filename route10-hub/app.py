from __future__ import annotations
import hashlib, hmac, os
from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field, HttpUrl
from chinese_route import router as chinese_router

app = FastAPI(title="Route 10 Marketing Hub", version="1.3.0")
app.include_router(chinese_router)
OPENSHORTS_API_URL = os.getenv("OPENSHORTS_API_URL", "https://api.openshorts.app").rstrip("/")
OPENSHORTS_API_KEY = os.getenv("OPENSHORTS_API_KEY", "")
WEBHOOK_SECRET = os.getenv("OPENSHORTS_WEBHOOK_SECRET", "")
HUB_TOKEN = os.getenv("ROUTE10_HUB_TOKEN", "")
VOICESTUDIO_API_URL = os.getenv("VOICESTUDIO_API_URL", "").rstrip("/")
VOICESTUDIO_API_TOKEN = os.getenv("VOICESTUDIO_API_TOKEN", "")
POOLDAY_API_URL = os.getenv("POOLDAY_API_URL", "").rstrip("/")
POOLDAY_API_KEY = os.getenv("POOLDAY_API_KEY", "")

PRODUCTS = {"ai-chess-kuwait":{"name":"AI Chess Kuwait","url":"https://ai-chess-kuwait.onrender.com","pillars":["puzzle","mistake","ai","beginner","social","elo"],"audio":True,"video":True,"chinese":True}}
PRODUCTS["autoclip-studio"] = {"name":"AutoClip Studio","url":"https://q8-ux.github.io/saad/autoclip-studio","pillars":["highlights","tutorial","interview","social"],"audio":True,"video":True,"chinese":True}

class Campaign(BaseModel):
 product_id:str; source_url:HttpUrl; language:str="ar"; pillar:str="puzzle"; target_clips:int=Field(3,ge=1,le=10)
class Event(BaseModel):
 product_id:str; event:str; campaign:Optional[str]=None; content_id:Optional[str]=None; metadata:dict=Field(default_factory=dict)
class VoiceJob(BaseModel):
 product_id:str; text:str=Field(min_length=1,max_length=10000); language:str="ar"; voice_id:Optional[str]=None; mode:str="tts"; reference_audio_url:Optional[HttpUrl]=None; consent_confirmed:bool=False; metadata:dict=Field(default_factory=dict)
class VideoJob(BaseModel):
 product_id:str; brief:str=Field(min_length=1,max_length=20000); language:str="ar"; source_url:Optional[HttpUrl]=None; audio_url:Optional[HttpUrl]=None; aspect_ratio:str="9:16"; duration_seconds:int=Field(default=30,ge=5,le=300); variants:int=Field(default=1,ge=1,le=10); brand:Optional[str]=None; metadata:dict=Field(default_factory=dict)

def authorize(v):
 if HUB_TOKEN and v!=f"Bearer {HUB_TOKEN}": raise HTTPException(401,"Invalid hub token")
def product(pid):
 if pid not in PRODUCTS: raise HTTPException(404,"Unknown product")
 return PRODUCTS[pid]
def voice_headers():
 h={"Content-Type":"application/json"};
 if VOICESTUDIO_API_TOKEN:h["Authorization"]=f"Bearer {VOICESTUDIO_API_TOKEN}"
 return h
def poolday_headers():
 h={"Content-Type":"application/json"};
 if POOLDAY_API_KEY:h["Authorization"]=f"Bearer {POOLDAY_API_KEY}"
 return h

@app.get("/health")
def health(): return {"ok":True,"products":len(PRODUCTS),"openshorts":bool(OPENSHORTS_API_KEY),"voice_route":{"engine":"VoiceStudio","configured":bool(VOICESTUDIO_API_URL)},"video_route":{"engine":"Poolday","configured":bool(POOLDAY_API_URL and POOLDAY_API_KEY)},"chinese_route":{"engine":"MoneyPrinterTurbo","configured":bool(os.getenv("MONEYPRINTERTURBO_API_URL"))}}
@app.get("/api/products")
def products(authorization:str|None=Header(default=None)): authorize(authorization); return PRODUCTS
@app.get("/api/audio/status")
def audio_status(authorization:str|None=Header(default=None)): authorize(authorization); return {"engine":"VoiceStudio","configured":bool(VOICESTUDIO_API_URL),"capabilities":["tts","voice_clone","dubbing","transcription","multi_voice"]}
@app.post("/api/audio/generate")
async def audio_generate(req:VoiceJob,authorization:str|None=Header(default=None)):
 authorize(authorization);p=product(req.product_id)
 if not p.get("audio"):raise HTTPException(400,"Audio route disabled")
 if not VOICESTUDIO_API_URL:raise HTTPException(503,"VOICESTUDIO_API_URL not configured")
 if req.mode in {"voice_clone","clone"} and not req.consent_confirmed:raise HTTPException(400,"Explicit speaker consent is required")
 payload={"text":req.text,"language":req.language,"voice_id":req.voice_id,"mode":req.mode,"reference_audio_url":str(req.reference_audio_url) if req.reference_audio_url else None,"metadata":{"product_id":req.product_id,**req.metadata}}
 async with httpx.AsyncClient(timeout=180) as c:r=await c.post(f"{VOICESTUDIO_API_URL}/generate",headers=voice_headers(),json=payload)
 if r.status_code>=400:raise HTTPException(502,f"VoiceStudio error: {r.text[:300]}")
 try:result=r.json()
 except:result={"response":r.text[:1000]}
 return {"engine":"VoiceStudio","product":p["name"],"result":result}
@app.get("/api/video/status")
def video_status(authorization:str|None=Header(default=None)): authorize(authorization);return {"engine":"Poolday","configured":bool(POOLDAY_API_URL and POOLDAY_API_KEY),"capabilities":["generate","edit","gameplay_highlights","visual_hooks","ugc","localization","variants","brand_kits"]}
@app.post("/api/video/generate")
async def video_generate(req:VideoJob,authorization:str|None=Header(default=None)):
 authorize(authorization);p=product(req.product_id)
 if not p.get("video"):raise HTTPException(400,"Video route disabled")
 if not POOLDAY_API_URL or not POOLDAY_API_KEY:raise HTTPException(503,"Poolday API is not configured")
 tracking=f'{p["url"]}/?utm_source=route10&utm_medium=poolday_video&utm_campaign={req.product_id}'
 payload={"brief":req.brief,"language":req.language,"source_url":str(req.source_url) if req.source_url else None,"audio_url":str(req.audio_url) if req.audio_url else None,"aspect_ratio":req.aspect_ratio,"duration_seconds":req.duration_seconds,"variants":req.variants,"brand":req.brand,"cta_url":tracking,"metadata":{"product_id":req.product_id,**req.metadata}}
 async with httpx.AsyncClient(timeout=300) as c:r=await c.post(POOLDAY_API_URL,headers=poolday_headers(),json=payload)
 if r.status_code>=400:raise HTTPException(502,f"Poolday error: {r.text[:300]}")
 try:result=r.json()
 except:result={"response":r.text[:1000]}
 return {"engine":"Poolday","product":p["name"],"tracking_url":tracking,"result":result}
@app.post("/api/campaigns")
async def campaign(req:Campaign,request:Request,authorization:str|None=Header(default=None)):
 authorize(authorization);p=product(req.product_id)
 if req.pillar not in p["pillars"]:raise HTTPException(400,"Unsupported pillar")
 if not OPENSHORTS_API_KEY:raise HTTPException(503,"OPENSHORTS_API_KEY not configured")
 cid=f"{req.product_id}-{req.pillar}-{int(datetime.now(timezone.utc).timestamp())}";tracking=f'{p["url"]}/?utm_source=route10&utm_medium=short_video&utm_campaign={cid}'
 payload={"url":str(req.source_url),"acknowledged":True,"target_clips":req.target_clips,"captions":True,"auto_hook":True,"output_format":"vertical","webhook_url":str(request.base_url).rstrip('/')+"/api/webhooks/openshorts","metadata":{"product_id":req.product_id,"campaign_id":cid,"language":req.language,"pillar":req.pillar,"cta_url":tracking}}
 if WEBHOOK_SECRET:payload["webhook_secret"]=WEBHOOK_SECRET
 async with httpx.AsyncClient(timeout=30) as c:r=await c.post(f"{OPENSHORTS_API_URL}/api/process",headers={"Authorization":f"Bearer {OPENSHORTS_API_KEY}","Content-Type":"application/json"},json=payload)
 if r.status_code>=400:raise HTTPException(502,f"OpenShorts error: {r.text[:300]}")
 return {"campaign_id":cid,"product":p["name"],"tracking_url":tracking,"openshorts":r.json()}
@app.post("/api/events")
def event(req:Event,authorization:str|None=Header(default=None)):authorize(authorization);product(req.product_id);return {"accepted":True,"product_id":req.product_id,"event":req.event,"campaign":req.campaign,"content_id":req.content_id,"at":datetime.now(timezone.utc).isoformat()}
@app.post("/api/webhooks/openshorts")
async def webhook(request:Request,x_openshorts_signature:str|None=Header(default=None)):
 body=await request.body()
 if WEBHOOK_SECRET:
  if not x_openshorts_signature:raise HTTPException(401,"Missing signature")
  expected=hmac.new(WEBHOOK_SECRET.encode(),body,hashlib.sha256).hexdigest()
  if not hmac.compare_digest(expected,x_openshorts_signature.removeprefix("sha256=")):raise HTTPException(401,"Invalid signature")
 return {"received":True,"at":datetime.now(timezone.utc).isoformat()}

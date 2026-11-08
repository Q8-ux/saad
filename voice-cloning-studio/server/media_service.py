"""Bounded public media tools. No access to private Voicebox profiles or files."""
from __future__ import annotations
import asyncio,json,os,time,logging
from collections import defaultdict,deque
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse,Response
from starlette.routing import Route
from starlette.middleware.cors import CORSMiddleware

class MediaError(Exception):
 def __init__(self,message,status=400,code='invalid_request'):
  self.message,self.status,self.code=message,status,code

class Limits:
 def __init__(self): self.ip=defaultdict(deque);self.global_calls=deque();self.active=0
 def allow(self,client,heavy=False):
  now=time.monotonic();window=60
  for q in [self.ip[client],self.global_calls]:
   while q and q[0]<now-window:q.popleft()
  if len(self.ip[client])>=20 or len(self.global_calls)>=80:raise MediaError('طلبات كثيرة؛ انتظر دقيقة ثم أعد المحاولة.',429,'rate_limited')
  self.ip[client].append(now);self.global_calls.append(now)
  if len(self.ip)>3000:self.ip=defaultdict(deque,{k:v for k,v in self.ip.items() if v and v[-1]>now-window})
  if heavy and self.active>=2:raise MediaError('توجد عمليتان قيد التنفيذ؛ حاول بعد قليل.',429,'service_busy')

async def body_json(request):
 raw=bytearray()
 async for chunk in request.stream():
  raw.extend(chunk)
  if len(raw)>64000:raise MediaError('حجم الطلب أكبر من المسموح.',413,'body_too_large')
 try: data=json.loads(raw)
 except (ValueError,UnicodeError):raise MediaError('بيانات الطلب غير صالحة.')
 if not isinstance(data,dict):raise MediaError('بيانات الطلب غير صالحة.')
 return data

def validate_speech(data):
 text=data.get('text');voice=data.get('voice')
 if not isinstance(text,str) or not text.strip() or len(text)>5000:raise MediaError('أدخل نصًا من 1 إلى 5000 حرف للأصوات الجاهزة.')
 if not isinstance(voice,str) or len(voice)>120:raise MediaError('اختر صوتًا متاحًا من القائمة.')
 rate=data.get('rate',0);pitch=data.get('pitch',0)
 if isinstance(rate,bool) or not isinstance(rate,(int,float)) or not -50<=rate<=50:raise MediaError('السرعة يجب أن تكون بين -50 و50 بالمئة.')
 if isinstance(pitch,bool) or not isinstance(pitch,(int,float)) or not -30<=pitch<=30:raise MediaError('درجة الصوت خارج الحدود المسموحة.')
 return text.strip(),voice,int(rate),int(pitch)

class MediaService:
 def __init__(self,provider=None,youtube=None):
  self.limits=Limits();self.catalog=[];self.catalog_at=0.;self.catalog_lock=asyncio.Lock();self.provider=provider;self.youtube=youtube;self.last_speech_ok=False
 async def voices(self):
  if self.catalog and time.monotonic()-self.catalog_at<21600:return self.catalog
  async with self.catalog_lock:
   if self.catalog and time.monotonic()-self.catalog_at<21600:return self.catalog
   if self.provider:result=await self.provider.list_voices()
   else:
    import edge_tts
    result=await asyncio.wait_for(edge_tts.list_voices(),25)
   if not isinstance(result,list) or not result:raise MediaError('قائمة الأصوات لم تصل من خدمة النطق.',503,'voices_unavailable')
   self.catalog=result;self.catalog_at=time.monotonic();return result
 async def execute(self,request):
  heavy=request.url.path.endswith(('/speech','/sample'))
  client=request.headers.get('x-real-ip') or (request.client.host if request.client else 'unknown')
  try:
   self.limits.allow(client,heavy)
   if heavy:self.limits.active+=1
   try:return await self.dispatch(request)
   finally:
    if heavy:self.limits.active-=1
  except MediaError as e:return JSONResponse({'detail':e.message,'code':e.code},status_code=e.status,headers={'Cache-Control':'no-store'})
  except asyncio.TimeoutError:return JSONResponse({'detail':'انتهت مهلة خدمة المصدر. يمكنك رفع الملف الأصلي من جهازك.','code':'source_timeout'},status_code=504)
  except Exception as e:
   logging.getLogger('voice_media').warning('Provider failure type=%s status=%s',type(e).__name__,getattr(e,'status',None))
   try:
    from youtube_service import YouTubeServiceError
    if isinstance(e,YouTubeServiceError):return JSONResponse({'detail':e.message,'code':e.code},status_code=e.status_code)
   except ImportError:pass
   # Provider exception strings may contain signed URLs; never publish them.
   return JSONResponse({'detail':'تعذّر الوصول إلى خدمة المصدر حاليًا. جرّب أصوات الجهاز أو ارفع ملفك الأصلي.','code':'provider_unavailable'},status_code=503)
 async def dispatch(self,request):
  path=request.url.path
  if path=='/api/media/status':
   return JSONResponse({'service':'voice-studio-media','youtube_tools':True,'ready_voice_catalog':bool(self.catalog),'last_speech_succeeded':self.last_speech_ok,'cloning_ready':bool(os.getenv('STUDIO_UPSTREAM_URL')),'text_processing':'Microsoft Edge online speech; user text is sent only for requested synthesis'})
  if path=='/api/media/voices':
   voices=await self.voices();lang=request.query_params.get('language','')
   selected=[v for v in voices if not lang or v.get('Locale','').startswith(lang+'-') or v.get('Locale')==lang]
   return JSONResponse({'provider':'edge-tts','voices':selected,'cloning':False})
  data=await body_json(request)
  if path=='/api/media/speech':
   text,voice,rate,pitch=validate_speech(data);voices=await self.voices()
   if voice not in {v.get('ShortName') for v in voices}:raise MediaError('الصوت المختار غير موجود في قائمة الخدمة الحالية.')
   if self.provider:audio=await self.provider.synthesize(text,voice,rate,pitch)
   else:
    import edge_tts
    chunks=[];size=0
    async def synthesize():
     nonlocal size
     async for event in edge_tts.Communicate(text,voice,rate=f'{rate:+d}%',pitch=f'{pitch:+d}Hz').stream():
      if event['type']=='audio':
       size+=len(event['data'])
       if size>20*1024*1024:raise MediaError('المقطع طويل جدًا؛ قسّم النص إلى أجزاء.',413,'audio_too_large')
       chunks.append(event['data'])
    await asyncio.wait_for(synthesize(),100);audio=b''.join(chunks)
   if len(audio)<1000:raise MediaError('لم تُرجع خدمة الصوت مقطعًا صالحًا.',502,'empty_audio')
   self.last_speech_ok=True
   return Response(audio,media_type='audio/mpeg',headers={'Content-Disposition':'attachment; filename="voice-studio.mp3"','Cache-Control':'no-store'})
  if self.youtube is None:
   import youtube_service
   yt=youtube_service
  else:yt=self.youtube
  if path=='/api/media/youtube/search':
   query=data.get('query','')
   if not isinstance(query,str) or not 2<=len(query.strip())<=200:raise MediaError('أدخل كلمات بحث من حرفين إلى 200 حرف.')
   result=await asyncio.wait_for(yt.search_youtube(query.strip(),limit=6),50)
   return JSONResponse({'items':result,'source':'youtube'})
  if path=='/api/media/youtube/inspect':
   value=data.get('url','')
   if not isinstance(value,str) or len(value)>500:raise MediaError('أدخل رابط يوتيوب صالحًا.')
   result=await asyncio.wait_for(yt.inspect_youtube(value),50)
   return JSONResponse(result)
  if path=='/api/media/youtube/sample':
   if data.get('rights_confirmed') is not True:raise MediaError('أكّد أنك تملك التسجيل أو لديك إذن باستخدام الصوت.',400,'permission_required')
   audio,metadata=await asyncio.wait_for(yt.import_youtube_sample(data.get('url',''),data.get('start'),data.get('end')),125)
   if len(audio)>8*1024*1024:raise MediaError('حجم العينة أكبر من المسموح.',413)
   return Response(audio,media_type='audio/wav',headers={'Content-Disposition':'attachment; filename="youtube-reference.wav"','Cache-Control':'no-store'})
  raise MediaError('المسار غير موجود.',404)

def build_media_app(service=None):
 service=service or MediaService()
 routes=[Route('/api/media/status',service.execute,methods=['GET']),Route('/api/media/voices',service.execute,methods=['GET'])]
 routes += [Route('/api/media/'+path,service.execute,methods=['POST']) for path in ['speech','youtube/search','youtube/inspect','youtube/sample']]
 app=Starlette(routes=routes)
 origins=[o.strip() for o in os.getenv('STUDIO_ALLOWED_ORIGINS','https://q8-ux.github.io').split(',') if o.strip()]
 if '*' in origins:raise ValueError('Use explicit origins')
 return CORSMiddleware(app,allow_origins=origins,allow_methods=['GET','POST','OPTIONS'],allow_headers=['Content-Type'],expose_headers=['Content-Disposition'],max_age=600)

class MediaDispatcher:
 def __init__(self,private_app,media_app):self.private=private_app;self.media=media_app
 async def __call__(self,scope,receive,send):
  if scope['type']=='http' and scope.get('path','').startswith('/api/media/'):
   await self.media(scope,receive,send)
  else:await self.private(scope,receive,send)

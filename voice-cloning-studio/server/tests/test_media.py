import unittest,json
import httpx
from media_service import MediaService,build_media_app,validate_speech,MediaError
class Provider:
 calls=0
 async def list_voices(self):return [{'ShortName':'ar-KW-FahedNeural','Locale':'ar-KW','Gender':'Male'}]
 async def synthesize(self,text,voice,rate,pitch):self.calls+=1;return b'ID3'+b'A'*1800
class YT:
 called=False
 async def import_youtube_sample(self,*args):self.called=True;return b'RIFF'+b'0'*100,{}
class MediaTests(unittest.IsolatedAsyncioTestCase):
 async def asyncSetUp(self):
  self.provider=Provider();self.yt=YT();self.service=MediaService(self.provider,self.yt)
  self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=build_media_app(self.service)),base_url='https://test')
 async def asyncTearDown(self):await self.client.aclose()
 async def test_catalog_is_real_provider_data(self):
  r=await self.client.get('/api/media/voices?language=ar');self.assertEqual(r.status_code,200);self.assertEqual(len(r.json()['voices']),1)
 async def test_voice_id_must_match_catalog(self):
  r=await self.client.post('/api/media/speech',json={'text':'اختبار','voice':'invented'});self.assertEqual(r.status_code,400);self.assertEqual(self.provider.calls,0)
 async def test_actual_synthesis_bytes_returned(self):
  r=await self.client.post('/api/media/speech',json={'text':'اختبار','voice':'ar-KW-FahedNeural'});self.assertEqual(r.status_code,200);self.assertTrue(r.content.startswith(b'ID3'));self.assertEqual(self.provider.calls,1)
 async def test_import_requires_user_permission(self):
  r=await self.client.post('/api/media/youtube/sample',json={'url':'https://youtu.be/abcdefghijk','start':0,'end':15});self.assertEqual(r.status_code,400);self.assertFalse(self.yt.called)
 async def test_no_private_routes_exposed(self):
  self.assertEqual((await self.client.get('/api/media/profiles')).status_code,404)
 async def test_cors_exact_origin(self):
  r=await self.client.get('/api/media/status',headers={'Origin':'https://evil.example'});self.assertNotIn('access-control-allow-origin',r.headers)
  r=await self.client.get('/api/media/status',headers={'Origin':'https://q8-ux.github.io'});self.assertEqual(r.headers.get('access-control-allow-origin'),'https://q8-ux.github.io')
 async def test_limits_block_request_storm(self):
  for i in range(20):await self.client.get('/api/media/status')
  self.assertEqual((await self.client.get('/api/media/status')).status_code,429)
 async def test_large_text_rejected(self):
  with self.assertRaises(MediaError):validate_speech({'text':'x'*5001,'voice':'ar-KW-FahedNeural'})
if __name__=='__main__':unittest.main()

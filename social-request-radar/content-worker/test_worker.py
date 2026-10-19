import importlib.util,json,os,sys,tempfile,threading,time,unittest,urllib.request,urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parent))
import server
from adapters import artifacts

class WorkerTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();server.DATA=Path(self.temp.name);server.KEY='synthetic-test-secret-not-a-real-key';server.JOBS.clear()
        self.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start();self.url='http://127.0.0.1:'+str(self.http.server_port)
    def tearDown(self):self.http.shutdown();self.http.server_close();self.temp.cleanup()
    def get(self,path,key=True):
        return urllib.request.urlopen(urllib.request.Request(self.url+path,headers={'Authorization':'Bearer '+server.KEY} if key else {}),timeout=3)
    def test_auth_and_capability_health(self):
        with self.assertRaises(urllib.error.HTTPError) as failure:self.get('/health',False)
        self.assertEqual(failure.exception.code,401)
        with patch.object(server,'capabilities',return_value=[]):
            with self.get('/health') as response:payload=json.load(response)
        self.assertEqual(payload['capabilities'],[]);self.assertEqual(payload['service'],'rased-content-worker')
    def test_completed_artifact_is_scoped_and_expired_files_are_removed(self):
        ident='01234567-89ab-4cde-8123-456789abcdef';folder=server.DATA/ident;folder.mkdir();(folder/'test.wav').write_bytes(b'fixed-test-audio')
        server.JOBS[ident]={'at':time.time(),'state':'completed','result':{'artifacts':[{'id':'test.wav','mime':'audio/wav','size':16}]}}
        with self.get('/jobs/'+ident+'/artifacts/test.wav') as response:self.assertEqual(response.read(),b'fixed-test-audio')
        with self.assertRaises(urllib.error.HTTPError):self.get('/jobs/'+ident+'/artifacts/not-owned.wav')
        server.JOBS[ident]['at']-=3700
        with self.get('/jobs/'+ident) as response:self.assertEqual(json.load(response)['state'],'expired')
        self.assertFalse(folder.exists())
    def test_media_manifest_omits_cached_originals_and_flattens_nested_outputs(self):
        root=server.DATA;(root/'source_original.mp4').write_bytes(b'original');(root/'meta.json').write_text('{}');nested=root/'output';nested.mkdir();(nested/'short_01.mp4').write_bytes(b'clip')
        result=artifacts(root);self.assertEqual(len(result),1);self.assertEqual(result[0]['id'],'clip-0.mp4');self.assertTrue((root/result[0]['id']).is_file())

if __name__=='__main__':unittest.main()

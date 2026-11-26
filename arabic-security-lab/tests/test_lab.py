import http.client
import json
import subprocess
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import lab


class LocalServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = lab.LocalServer(('127.0.0.1', 0), lab.Handler)
        cls.port = cls.server.server_port
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.port, timeout=3)
        connection.request(method, path, body=body, headers=headers or {})
        result = connection.getresponse()
        payload = result.read()
        status, response_headers = result.status, dict(result.getheaders())
        connection.close()
        return status, response_headers, payload

    def authorized(self):
        return {'Origin': f'http://127.0.0.1:{self.port}', 'X-Lab-Token': lab.TOKEN}

    def test_status_detects_actual_tools(self):
        status, headers, body = self.request('GET', '/api/status')
        data = json.loads(body)
        self.assertEqual(status, 200)
        self.assertEqual(data['application'], 'misbar-lab')
        self.assertTrue(all(isinstance(t['installed'], bool) for t in data['tools']))
        self.assertNotIn('Access-Control-Allow-Origin', headers)

    def test_external_origin_cannot_read_token(self):
        self.assertEqual(self.request('GET', '/api/status', headers={'Origin':'https://outside.example'})[0], 403)

    def test_dns_rebinding_host_is_rejected(self):
        self.assertEqual(self.request('GET', '/api/status', headers={'Host': f'outside.example:{self.port}'})[0], 403)

    def test_public_web_and_javascript_content_types(self):
        status, headers, body = self.request('GET', '/')
        self.assertEqual(status, 200)
        self.assertIn('dir="rtl"'.encode(), body)
        self.assertIn("frame-ancestors 'none'", headers['Content-Security-Policy'])
        self.assertIn('javascript', self.request('GET', '/app.mjs')[1]['Content-Type'])

    def test_source_and_path_traversal_are_not_served(self):
        for path in ['/lab.py', '/../lab.py', '/%2e%2e/lab.py', '/assets/../../lab.py']:
            self.assertEqual(self.request('GET', path)[0], 404)

    def test_post_requires_origin_and_token(self):
        self.assertEqual(self.request('POST', '/api/run?tool=strings', b'abc')[0], 403)
        self.assertEqual(self.request('POST', '/api/run?tool=strings', b'abc', {'Origin': f'http://127.0.0.1:{self.port}'})[0], 403)

    def test_unknown_tool_is_never_executed(self):
        with patch('lab.subprocess.run') as run:
            status, _, _ = self.request('POST', '/api/run?tool=sh', b'sample', self.authorized())
            self.assertEqual(status, 400)
            run.assert_not_called()

    def test_hardware_write_tools_are_not_runnable(self):
        with self.assertRaises(ValueError):
            lab.command_for('flashrom', Path('/tmp/in.bin'), Path('/tmp'))

    def test_command_arguments_cannot_be_injected(self):
        with patch('lab.resolve_tool', return_value='/usr/bin/strings'):
            args = lab.command_for('strings', Path('/tmp/safe.bin'), Path('/tmp'))
            self.assertEqual(args[:3], ['/usr/bin/strings', '-n', '6'])
            self.assertEqual(Path(args[3]), Path('/tmp/safe.bin'))

    def test_uploaded_name_does_not_choose_a_path_or_shell(self):
        def fake_run(args, **kwargs):
            source = Path(args[-1])
            self.assertEqual(source.name, 'evidence.bin')
            self.assertEqual(source.read_bytes(), b'evidence')
            self.assertFalse(kwargs['shell'])
            kwargs['stdout'].write(b'password=hidden-secret')
            return type('Run', (), {'returncode':0})()
        with patch('lab.resolve_tool', return_value='/usr/bin/strings'), patch('lab.subprocess.run', side_effect=fake_run):
            result = lab.run_file('strings', b'evidence', '../../payload;touch BAD.bin')
        self.assertNotIn('hidden-secret', result['output'])
        self.assertEqual(result['exitCode'], 0)

    def test_packet_runner_rejects_other_content(self):
        with self.assertRaises(ValueError):
            lab.run_file('tshark', b'not-pcap', 'sample.pcap')

    def test_cors_preflight_is_denied(self):
        self.assertEqual(self.request('OPTIONS', '/api/run')[0], 403)

    def test_missing_rea_is_an_error_not_a_fake_connection(self):
        with patch('lab.resolve_tool', return_value=None), self.assertRaisesRegex(ValueError, 'غير مثبت'):
            lab.discover_rea()

    def test_empty_payload_rejected(self):
        with self.assertRaises(ValueError):
            lab.run_file('strings', b'', 'empty.bin')

    def test_mcp_handshake_and_pagination_do_not_execute_analysis(self):
        stub = '''import json,sys
for line in sys.stdin:
 m=json.loads(line)
 if m['method']=='initialize':
  result={'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'fixture','version':'1'}}
 elif m['method']=='notifications/initialized': continue
 elif m['method']=='tools/list':
  result={'tools':[{'name':'read_only_fixture_2' if m.get('params',{}).get('cursor') else 'read_only_fixture_1'}]}
  if not m.get('params',{}).get('cursor'): result['nextCursor']='next'
 else: raise SystemExit('Unexpected tool execution')
 print(json.dumps({'jsonrpc':'2.0','id':m['id'],'result':result}),flush=True)
'''
        real_popen = subprocess.Popen
        def spawn(*args, **kwargs):
            return real_popen([sys.executable, '-u', '-c', stub], **kwargs)
        with patch('lab.resolve_tool', return_value=sys.executable), patch('lab.subprocess.Popen', side_effect=spawn):
            result = lab.discover_rea()
        self.assertEqual(len(result['tools']), 2)
        self.assertTrue(result['complete'])
        self.assertFalse(result['analysisExecuted'])


if __name__ == '__main__':
    unittest.main()

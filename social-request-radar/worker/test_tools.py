import unittest
from unittest.mock import patch
import requests
from radar_tools import route,arabic_tokens,collect,ToolError,Budget,InstagramTransport

class ToolsTests(unittest.TestCase):
    def test_routes_and_original_scope(self):
        self.assertEqual(route('https://www.youtube.com/watch?v=abcdefghijk')['collectors'],['yt-dlp'])
        self.assertIn('instaloader',route('https://www.instagram.com/p/ABC/')['collectors'])
        with self.assertRaises(ToolError):route('https://instagram.com.evil.test/p/ABC/')
    def test_camel_preserves_its_input_and_matches_arabic(self):
        text='أَبِي اِستشارة';self.assertEqual(arabic_tokens(text),['ابي','استشارة']);self.assertEqual(text,'أَبِي اِستشارة')
    def test_session_required_before_any_network(self):
        with patch.object(requests.Session,'send',side_effect=AssertionError('No network')):
            with self.assertRaisesRegex(ToolError,'SESSION_REQUIRED'):collect({'collector':'instaloader','url':'https://www.instagram.com/p/ABC/'})
    def test_blocked_transport_does_not_retry(self):
        for status in [401,403,429]:
            response=requests.Response();response.status_code=status;response._content=b'blocked'
            with patch.object(requests.Session,'send',return_value=response) as transport:
                with InstagramTransport(Budget()):
                    for _ in range(2):
                        with self.assertRaisesRegex(ToolError,'HTTP_'+str(status)):requests.Session().get('https://www.instagram.com/graphql/query/')
                self.assertEqual(transport.call_count,1)
    def test_transport_caps_and_write_rejection(self):
        response=requests.Response();response.status_code=200;response._content=b'{}'
        with patch.object(requests.Session,'send',return_value=response) as transport:
            with InstagramTransport(Budget(limit=1)):
                requests.Session().get('https://www.instagram.com/graphql/query/')
                with self.assertRaisesRegex(ToolError,'REQUEST_LIMIT'):requests.Session().get('https://www.instagram.com/graphql/query/')
                with self.assertRaisesRegex(ToolError,'WRITE_NOT_ALLOWED'):requests.Session().post('https://www.instagram.com/api/v1/media/x/comment/')
            self.assertEqual(transport.call_count,1)

if __name__=='__main__':unittest.main()

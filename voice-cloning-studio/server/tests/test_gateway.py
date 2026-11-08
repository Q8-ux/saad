import asyncio
import json
import unittest

import httpx

from gateway import API_PREFIX, StudioGateway, build_gateway
from upstream_proxy import VoiceboxProxy

TOKEN = "test-access-key-with-32-characters"
AUTH = {"Authorization": "Bearer " + TOKEN}
ORIGIN = "https://q8-ux.github.io"


class RecordingUpstream:
    def __init__(self):
        self.requests = []

    async def __call__(self, scope, receive, send):
        body = b""
        while True:
            event = await receive()
            body += event.get("body", b"")
            if not event.get("more_body", False):
                break
        self.requests.append((scope, body))
        if scope["path"] == "/events":
            await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"text/event-stream")]})
            for chunk in [b"data: one\n\n", b"data: two\n\n"]:
                await send({"type": "http.response.body", "body": chunk, "more_body": True})
            await send({"type": "http.response.body", "body": b"", "more_body": False})
        else:
            await StudioGateway.respond(send, 200, {"path": scope["path"]})


class GatewayTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.upstream = RecordingUpstream()
        self.app = build_gateway(self.upstream, token=TOKEN, max_body_bytes=1024)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="https://studio.test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_public_health_has_no_voice_or_host_data(self):
        response = await self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "voice-studio-gateway"})
        self.assertEqual(len(self.upstream.requests), 0)

    async def test_all_data_routes_require_key_and_root_is_closed(self):
        for route in ["/profiles", "/audio/abc", "/mcp", "/docs", "/openapi.json"]:
            self.assertEqual((await self.client.get(API_PREFIX + route)).status_code, 401)
            self.assertEqual((await self.client.get(route, headers=AUTH)).status_code, 404)
        self.assertEqual((await self.client.get(API_PREFIX + "/profiles?token=" + TOKEN)).status_code, 401)
        self.assertEqual((await self.client.get(API_PREFIX + "/profiles", headers={"Authorization": "Bearer wrong"})).status_code, 401)
        self.assertEqual(len(self.upstream.requests), 0)

    async def test_prefix_query_and_authorization_handling(self):
        response = await self.client.get(API_PREFIX + "/profiles?limit=3", headers=AUTH)
        self.assertEqual(response.status_code, 200)
        scope, _ = self.upstream.requests[-1]
        self.assertEqual(scope["path"], "/profiles")
        self.assertEqual(scope["root_path"], API_PREFIX)
        self.assertEqual(scope["query_string"], b"limit=3")
        self.assertFalse(any(k == b"authorization" for k, _ in scope["headers"]))

    async def test_percent_encoded_paths_are_not_double_encoded(self):
        response = await self.client.get(API_PREFIX + "/profiles/%D8%B3%D8%B9%D8%AF", headers=AUTH)
        self.assertEqual(response.status_code, 200)
        scope, _ = self.upstream.requests[-1]
        self.assertEqual(scope["raw_path"], b"/profiles/%D8%B3%D8%B9%D8%AF")

    async def test_multipart_upload_bytes_are_preserved(self):
        request = self.client.build_request(
            "POST", API_PREFIX + "/profiles/abc/samples", headers=AUTH,
            files={"file": ("sample.wav", b"RIFF\x00\x01sample", "audio/wav")},
            data={"reference_text": "هلا والله"},
        )
        expected = await request.aread()
        response = await self.client.send(request)
        self.assertEqual(response.status_code, 200)
        scope, actual = self.upstream.requests[-1]
        self.assertEqual(expected, actual)
        self.assertIn(b'name="file"', actual)
        self.assertIn("هلا والله".encode(), actual)
        self.assertTrue(dict(scope["headers"])[b"content-type"].startswith(b"multipart/form-data; boundary="))

    async def test_declared_and_chunked_upload_limits(self):
        self.assertEqual((await self.client.post(API_PREFIX + "/transcribe", headers=AUTH, content=b"x" * 1025)).status_code, 413)

        async def chunks():
            yield b"a" * 800
            yield b"b" * 300

        self.assertEqual((await self.client.post(API_PREFIX + "/transcribe", headers=AUTH, content=chunks())).status_code, 413)
        self.assertEqual(len(self.upstream.requests), 0)

    async def test_exact_cors_and_unauthenticated_preflight(self):
        headers = {"Origin": ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"}
        response = await self.client.options(API_PREFIX + "/generate", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], ORIGIN)
        response = await self.client.options(API_PREFIX + "/generate", headers={**headers, "Origin": "https://evil.test"})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)
        response = await self.client.get(API_PREFIX + "/profiles", headers={"Origin": ORIGIN})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["access-control-allow-origin"], ORIGIN)

    async def test_sse_chunks_pass_without_response_buffering(self):
        chunks = []
        messages = [{"type": "http.request", "body": b"", "more_body": False}]
        async def receive():
            return messages.pop(0) if messages else {"type": "http.disconnect"}
        async def send(message):
            chunks.append(message)
        scope = {"type": "http", "method": "GET", "path": API_PREFIX + "/events", "headers": [(b"authorization", ("Bearer " + TOKEN).encode())], "query_string": b""}
        await self.app(scope, receive, send)
        data = [m["body"] for m in chunks if m["type"] == "http.response.body"]
        self.assertEqual(data, [b"data: one\n\n", b"data: two\n\n", b""])

    async def test_embedded_upstream_cannot_widen_gateway_cors(self):
        async def permissive_upstream(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": [(b"access-control-allow-origin", b"*"), (b"cache-control", b"public,max-age=999")]})
            await send({"type": "http.response.body", "body": b"private-data"})
        app = build_gateway(permissive_upstream, token=TOKEN)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://studio.test") as client:
            response = await client.get(API_PREFIX + "/profiles", headers={**AUTH, "Origin": "https://evil.test"})
            self.assertNotIn("access-control-allow-origin", response.headers)
            self.assertEqual(response.headers["cache-control"], "no-store")

    def test_empty_key_and_wildcard_origin_fail_closed(self):
        with self.assertRaises(ValueError):
            build_gateway(self.upstream, token="")
        with self.assertRaises(ValueError):
            build_gateway(self.upstream, token=TOKEN, allowed_origins=["*"])


class ByteStream(httpx.AsyncByteStream):
    async def __aiter__(self):
        yield b"data: ready\n\n"
        yield b"data: completed\n\n"


class ProxyTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_engine_is_503_not_fake_success(self):
        app = build_gateway(VoiceboxProxy(), token=TOKEN)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://studio.test") as client:
            response = await client.get(API_PREFIX + "/health", headers=AUTH)
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["code"], "engine_not_configured")

    async def test_proxy_preserves_upload_query_stream_and_only_upstream_key(self):
        captured = []
        async def handler(request):
            captured.append((str(request.url), request.headers, await request.aread()))
            return httpx.Response(200, headers={"Content-Type": "text/event-stream", "Access-Control-Allow-Origin": "*"}, stream=ByteStream())
        proxy = VoiceboxProxy("https://engine.test", "upstream-private-key", transport=httpx.MockTransport(handler))
        app = build_gateway(proxy, token=TOKEN)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://studio.test") as client:
            response = await client.post(API_PREFIX + "/generate?mode=one", headers={**AUTH, "Origin": ORIGIN}, content=b"original-body")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, b"data: ready\n\ndata: completed\n\n")
            self.assertEqual(response.headers["access-control-allow-origin"], ORIGIN)
        url, headers, body = captured[0]
        self.assertEqual(url, "https://engine.test/generate?mode=one")
        self.assertEqual(headers["authorization"], "Bearer upstream-private-key")
        self.assertNotIn(TOKEN, str(headers))
        self.assertEqual(body, b"original-body")

    async def test_upstream_failure_is_sanitized(self):
        async def handler(request):
            raise httpx.ConnectError("private-network-address-and-token", request=request)
        proxy = VoiceboxProxy("https://engine.test", transport=httpx.MockTransport(handler))
        app = build_gateway(proxy, token=TOKEN)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://studio.test") as client:
            response = await client.get(API_PREFIX + "/health", headers=AUTH)
            self.assertEqual(response.status_code, 502)
            self.assertEqual(response.json()["code"], "engine_unreachable")
            self.assertNotIn("private-network", response.text)

    def test_upstream_configuration_requires_tls_or_loopback(self):
        for value in ["http://engine.test", "https://u:p@engine.test", "https://engine.test?key=bad"]:
            with self.assertRaises(ValueError):
                VoiceboxProxy(value)
        VoiceboxProxy("http://127.0.0.1:17493")
        VoiceboxProxy("https://engine.test/prefix")


if __name__ == "__main__":
    unittest.main()

import unittest
from gateway import BODY_LIMIT, DEFAULT_MODEL, SabeqGateway

TOKEN = "synthetic-test-token-0123456789abcdef"


class GatewayTests(unittest.IsolatedAsyncioTestCase):
    async def call(self, path, method="GET", token=TOKEN, body=b"", configured=True):
        self.forwarded = []

        async def upstream(scope, receive, send):
            self.forwarded.append((scope, await receive()))
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"{}"})

        gateway = SabeqGateway(upstream, TOKEN, DEFAULT_MODEL, configured)
        messages = []
        chunks = list(body) if isinstance(body, list) else [body]

        async def receive():
            if not chunks:
                return {"type": "http.disconnect"}
            return {"type": "http.request", "body": chunks.pop(0), "more_body": bool(chunks)}

        await gateway({"type": "http", "method": method, "path": path,
                       "headers": [(b"authorization", ("Bearer " + token).encode())]},
                      receive, self.sender(messages))
        return messages[0]["status"], messages[-1].get("body", b"")

    @staticmethod
    def sender(messages):
        async def send(message):
            messages.append(message)
        return send

    async def test_public_health_does_not_expose_credentials(self):
        status, body = await self.call("/healthz", token="")
        self.assertEqual(status, 200)
        self.assertNotIn(TOKEN.encode(), body)
        self.assertEqual(self.forwarded, [])

    async def test_no_token_or_wrong_token_cannot_list_models_or_infer(self):
        for path, method in [("/v1/models", "GET"), ("/v1/messages", "POST")]:
            for token in ["", "wrong-token"]:
                status, _ = await self.call(path, method, token=token)
                self.assertEqual(status, 401)
                self.assertEqual(self.forwarded, [])

    async def test_admin_code_and_other_paths_stay_closed_even_with_valid_token(self):
        for path in ["/admin", "/admin/api/config", "/code", "/openapi.json", "/docs", "/v1/responses"]:
            status, _ = await self.call(path)
            self.assertEqual(status, 404)
            self.assertEqual(self.forwarded, [])

    async def test_missing_provider_is_explicit_and_does_not_call_model(self):
        status, body = await self.call("/v1/models", configured=False)
        self.assertEqual(status, 200)
        self.assertIn(b'"providerConfigured": false', body)
        status, body = await self.call("/v1/messages", "POST", configured=False)
        self.assertEqual(status, 409)
        self.assertIn(b"provider_not_configured", body)
        self.assertEqual(self.forwarded, [])

    async def test_large_chunked_and_invalid_requests_never_reach_upstream(self):
        status, _ = await self.call("/v1/messages", "POST", body=[b"x" * (BODY_LIMIT // 2), b"x" * (BODY_LIMIT // 2 + 1)])
        self.assertEqual(status, 413)
        self.assertEqual(self.forwarded, [])
        for body in [b"not-json", b"null", b'{}', b'{"tools":[{"name":"shell"}]}']:
            status, _ = await self.call("/v1/messages", "POST", body=body)
            self.assertEqual(status, 400)
            self.assertEqual(self.forwarded, [])

    async def test_synthetic_review_is_forwarded_exactly_once(self):
        import json
        body = json.dumps({"model": DEFAULT_MODEL, "max_tokens": 1800, "stream": False,
                           "system": "Review the supplied synthetic code only.",
                           "messages": [{"role": "user", "content": "function total(a,b){return a+b}"}]}).encode()
        status, _ = await self.call("/v1/messages", "POST", body=[body[:50], body[50:]])
        self.assertEqual(status, 200)
        self.assertEqual(len(self.forwarded), 1)
        self.assertEqual(self.forwarded[0][1]["body"], body)


if __name__ == "__main__":
    unittest.main()

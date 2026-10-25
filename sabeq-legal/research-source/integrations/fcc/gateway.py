"""Narrow, authenticated FCC inference gateway for Sabeq administration."""

import hmac
import json
import os

UPSTREAM_COMMIT = "707b6ddf677d81e9f1281c52a8c2fd61f649dd72"
BODY_LIMIT = 20_000
DEFAULT_MODEL = "nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b"


class SabeqGateway:
    def __init__(self, upstream, token, model, provider_configured):
        if len(token) < 32 or any(char.isspace() for char in token):
            raise ValueError("Set a strong SABEQ_FCC_TOKEN before starting")
        self.upstream = upstream
        self.token = token.encode()
        self.model = model
        self.provider_configured = provider_configured

    async def reply(self, send, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode()
        await send({"type": "http.response.start", "status": status, "headers": [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"cache-control", b"no-store"), (b"x-content-type-options", b"nosniff"),
        ]})
        await send({"type": "http.response.body", "body": encoded})

    async def __call__(self, scope, receive, send):
        if scope["type"] == "lifespan":
            return await self.upstream(scope, receive, send)
        if scope["type"] != "http":
            if scope["type"] == "websocket":
                await send({"type": "websocket.close", "code": 1008})
            return
        path, method = scope["path"], scope["method"]
        if path == "/healthz" and method in ("GET", "HEAD"):
            return await self.reply(send, 200, {"status": "installed", "service": "sabeq-fcc"})
        if (method, path) not in (("GET", "/v1/models"), ("POST", "/v1/messages")):
            return await self.reply(send, 404, {"error": {"code": "not_found"}})
        credentials = [value for key, value in scope.get("headers", []) if key.lower() == b"authorization"]
        expected = b"Bearer " + self.token
        if len(credentials) != 1 or not hmac.compare_digest(credentials[0], expected):
            return await self.reply(send, 401, {"error": {"code": "unauthorized"}})
        if method == "GET":
            return await self.reply(send, 200, {
                "object": "list", "data": [{"id": self.model, "object": "model"}],
                "sabeq": {"providerConfigured": self.provider_configured,
                          "upstreamCommit": UPSTREAM_COMMIT, "catalogOnly": True},
            })
        if not self.provider_configured:
            return await self.reply(send, 409, {"error": {"code": "provider_not_configured"}})
        body = bytearray()
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            if event["type"] != "http.request":
                continue
            body.extend(event.get("body", b""))
            if len(body) > BODY_LIMIT:
                return await self.reply(send, 413, {"error": {"code": "request_too_large"}})
            if not event.get("more_body", False):
                break
        try:
            payload = json.loads(body)
            if (not isinstance(payload, dict) or payload.get("model") != self.model
                    or payload.get("stream") is not False
                    or not isinstance(payload.get("messages"), list)
                    or len(payload["messages"]) != 1
                    or payload["messages"][0].get("role") != "user"
                    or not isinstance(payload["messages"][0].get("content"), str)
                    or type(payload.get("max_tokens")) is not int
                    or not 1 <= payload["max_tokens"] <= 1800
                    or set(payload) - {"model", "max_tokens", "stream", "system", "messages"}):
                raise ValueError()
        except (ValueError, TypeError, AttributeError, IndexError, UnicodeError):
            return await self.reply(send, 400, {"error": {"code": "invalid_request"}})
        sent = False

        async def replay():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        return await self.upstream(scope, replay, send)


def create_app():
    # Imported lazily: security tests use the real wrapper without installing FCC.
    from free_claude_code.config.loader import get_settings
    from free_claude_code.runtime.bootstrap import build_asgi_app

    token = os.environ.get("SABEQ_FCC_TOKEN", "")
    if len(token) < 32 or any(char.isspace() for char in token):
        raise ValueError("Set a strong SABEQ_FCC_TOKEN before starting")
    model = os.environ.get("MODEL", DEFAULT_MODEL)
    provider = model.split("/", 1)[0]
    key_name = {"nvidia_nim": "NVIDIA_NIM_API_KEY", "open_router": "OPENROUTER_API_KEY"}.get(provider)
    if not key_name:
        raise ValueError("Select the NVIDIA NIM or OpenRouter provider explicitly")
    settings = get_settings().model_copy(update={
        "proxy_auth_enabled": True, "proxy_auth_token": token,
        "open_admin_browser": False,
    })
    return SabeqGateway(build_asgi_app(settings), token, model, bool(os.environ.get(key_name, "").strip()))

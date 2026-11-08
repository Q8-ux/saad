"""Server-configured, streaming Voicebox proxy with a fail-closed offline state."""

from __future__ import annotations

import os
from collections.abc import Callable
from urllib.parse import urlsplit

import httpx

from gateway import API_PREFIX, StudioGateway

HOP_HEADERS = {
    b"connection", b"keep-alive", b"proxy-authenticate", b"proxy-authorization",
    b"te", b"trailer", b"transfer-encoding", b"upgrade", b"host",
}


class VoiceboxProxy:
    def __init__(
        self,
        upstream_url: str = "",
        upstream_token: str = "",
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.upstream_url = upstream_url.rstrip("/")
        self.upstream_token = upstream_token
        self.transport = transport
        self.client: httpx.AsyncClient | None = None
        if self.upstream_url:
            u = urlsplit(self.upstream_url)
            if u.username or u.password or u.query or u.fragment or not u.hostname:
                raise ValueError("STUDIO_UPSTREAM_URL must be a base URL without credentials or query")
            if u.scheme != "https" and not (
                u.scheme == "http" and u.hostname in {"localhost", "127.0.0.1", "::1"}
            ):
                raise ValueError("STUDIO_UPSTREAM_URL requires HTTPS, except for loopback")

    @classmethod
    def from_environment(cls) -> "VoiceboxProxy":
        return cls(
            os.environ.get("STUDIO_UPSTREAM_URL", ""),
            os.environ.get("STUDIO_UPSTREAM_TOKEN", ""),
        )

    def make_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=self.transport,
            follow_redirects=False,
            timeout=httpx.Timeout(600, connect=10, write=120, pool=20),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] == "lifespan":
            while True:
                message = await receive()
                if message["type"] == "lifespan.startup":
                    self.client = self.make_client()
                    await send({"type": "lifespan.startup.complete"})
                elif message["type"] == "lifespan.shutdown":
                    if self.client:
                        await self.client.aclose()
                    await send({"type": "lifespan.shutdown.complete"})
                    return
        if not self.upstream_url:
            await StudioGateway.respond(send, 503, {
                "detail": "Voice engine is not configured. Recording and local editing remain available.",
                "code": "engine_not_configured",
            })
            return

        async def body():
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                if message["type"] != "http.request":
                    continue
                if message.get("body"):
                    yield message["body"]
                if not message.get("more_body", False):
                    break

        headers = [
            (k, v) for k, v in scope.get("headers", [])
            if k.lower() not in HOP_HEADERS and k.lower() != b"authorization"
        ]
        headers.append((b"accept-encoding", b"identity"))
        if self.upstream_token:
            headers.append((b"authorization", b"Bearer " + self.upstream_token.encode()))
        raw_path = scope.get("raw_path", scope["path"].encode()).decode("ascii", errors="strict")
        url = self.upstream_url + raw_path
        if scope.get("query_string"):
            url += "?" + scope["query_string"].decode("ascii", errors="strict")
        temporary_client = self.client is None
        client = self.client or self.make_client()
        response_started = False
        try:
            request = client.build_request(scope["method"], url, headers=headers, content=body())
            async with client.stream(request.method, request.url, headers=request.headers, content=request.stream) as response:
                output_headers = []
                for key, value in response.headers.raw:
                    lowered = key.lower()
                    if lowered in HOP_HEADERS or lowered.startswith(b"access-control-"):
                        continue
                    if lowered == b"location":
                        location = value.decode("latin-1")
                        if location.startswith(self.upstream_url):
                            location = location[len(self.upstream_url):] or "/"
                        if location.startswith("/") and not location.startswith("//"):
                            value = (API_PREFIX + location).encode("latin-1")
                    output_headers.append((key, value))
                output_headers.append((b"cache-control", b"no-store"))
                await send({"type": "http.response.start", "status": response.status_code, "headers": output_headers})
                response_started = True
                async for chunk in response.aiter_raw():
                    await send({"type": "http.response.body", "body": chunk, "more_body": True})
                await send({"type": "http.response.body", "body": b"", "more_body": False})
        except (httpx.HTTPError, UnicodeError):
            # Do not disclose the internal URL, exception text, or credentials.
            if not response_started:
                await StudioGateway.respond(send, 502, {
                    "detail": "Voice engine is currently unreachable", "code": "engine_unreachable",
                })
            else:
                await send({"type": "http.response.body", "body": b"", "more_body": False})
        finally:
            if temporary_client:
                await client.aclose()

"""Authenticated ASGI boundary around the pinned Voicebox application.

No network proxy, request parser or response buffering sits between the client
and Voicebox. Multipart bodies are spooled with a hard bound before dispatch;
response chunks, including SSE and audio downloads, pass through unchanged.
"""

from __future__ import annotations

import hmac
import json
import os
import tempfile
from collections.abc import Callable
from typing import Any

from starlette.middleware.cors import CORSMiddleware

API_PREFIX = "/api/voicebox"
DEFAULT_ORIGIN = "https://q8-ux.github.io"
DEFAULT_BODY_LIMIT = 100 * 1024 * 1024


class StudioGateway:
    def __init__(
        self,
        upstream: Callable,
        token: str,
        *,
        max_body_bytes: int = DEFAULT_BODY_LIMIT,
    ) -> None:
        if len(token) < 24:
            raise ValueError("STUDIO_API_TOKEN must contain at least 24 characters")
        if max_body_bytes < 1024:
            raise ValueError("Upload limit must be at least 1024 bytes")
        self.upstream = upstream
        self.token = token.encode("utf-8")
        self.max_body_bytes = max_body_bytes

    @staticmethod
    async def respond(send: Callable, status: int, value: dict[str, Any]) -> None:
        body = json.dumps(value, separators=(",", ":")).encode()
        await send(
            {
                "type": "http.response.start",
                "status": status,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"cache-control", b"no-store"),
                    (b"x-content-type-options", b"nosniff"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": body})

    def authorized(self, scope: dict[str, Any]) -> bool:
        values = [v for k, v in scope.get("headers", []) if k.lower() == b"authorization"]
        if len(values) != 1:
            return False
        kind, separator, credential = values[0].partition(b" ")
        return (
            kind.lower() == b"bearer"
            and bool(separator)
            and hmac.compare_digest(credential, self.token)
        )

    async def __call__(self, scope: dict[str, Any], receive: Callable, send: Callable) -> None:
        if scope["type"] == "lifespan":
            # Voicebox owns model/DB/task-queue startup and shutdown, including MCP.
            await self.upstream(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        if scope["type"] != "http":
            return

        path = scope.get("path", "")
        if path == "/healthz" and scope["method"] in ("GET", "HEAD"):
            await self.respond(send, 200, {"status": "ok", "service": "voice-studio-gateway"})
            return
        if not (path == API_PREFIX or path.startswith(API_PREFIX + "/")):
            await self.respond(send, 404, {"detail": "Not found"})
            return
        if not self.authorized(scope):
            await self.respond(send, 401, {"detail": "A valid studio access key is required"})
            return

        lengths = [v for k, v in scope.get("headers", []) if k.lower() == b"content-length"]
        try:
            declared_length = int(lengths[0]) if len(lengths) == 1 else None
        except (ValueError, OverflowError):
            await self.respond(send, 400, {"detail": "Invalid Content-Length"})
            return
        if len(lengths) > 1 or (declared_length is not None and declared_length < 0):
            await self.respond(send, 400, {"detail": "Invalid Content-Length"})
            return
        if declared_length is not None and declared_length > self.max_body_bytes:
            await self.respond(send, 413, {"detail": "Upload exceeds studio limit"})
            return

        # Limit both Content-Length and chunked requests. Spooling to disk avoids
        # keeping a large reference/upload in RAM beside model inference.
        with tempfile.SpooledTemporaryFile(max_size=2 * 1024 * 1024, mode="w+b") as spool:
            received = 0
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                if message["type"] != "http.request":
                    continue
                body = message.get("body", b"")
                received += len(body)
                if received > self.max_body_bytes:
                    await self.respond(send, 413, {"detail": "Upload exceeds studio limit"})
                    return
                spool.write(body)
                if not message.get("more_body", False):
                    break
            if declared_length is not None and received != declared_length:
                await self.respond(send, 400, {"detail": "Request body length mismatch"})
                return
            spool.seek(0)
            replay_complete = False

            async def replay_receive() -> dict[str, Any]:
                nonlocal replay_complete
                if replay_complete:
                    # Preserve a later real disconnect for SSE, streaming and MCP.
                    return await receive()
                chunk = spool.read(64 * 1024)
                more = spool.tell() < received
                if not more:
                    replay_complete = True
                return {"type": "http.request", "body": chunk, "more_body": more}

            mapped = dict(scope)
            mapped["path"] = path[len(API_PREFIX):] or "/"
            raw_path = scope.get("raw_path", path.encode("utf-8"))
            raw_prefix = API_PREFIX.encode("ascii")
            mapped["raw_path"] = (
                raw_path[len(raw_prefix):] if raw_path.startswith(raw_prefix) else mapped["path"].encode("utf-8")
            ) or b"/"
            mapped["root_path"] = scope.get("root_path", "") + API_PREFIX
            # Do not leak the gateway credential into model integrations or logs.
            mapped["headers"] = [
                (k, v) for k, v in scope.get("headers", []) if k.lower() != b"authorization"
            ]

            async def controlled_send(message: dict[str, Any]) -> None:
                if message["type"] == "http.response.start":
                    # Only the outer gateway may grant browser access. The
                    # embedded app has its own wider localhost CORS defaults.
                    message = dict(message)
                    message["headers"] = [
                        (k, v) for k, v in message.get("headers", [])
                        if not k.lower().startswith(b"access-control-")
                        and k.lower() not in {b"cache-control", b"x-content-type-options"}
                    ] + [(b"cache-control", b"no-store"), (b"x-content-type-options", b"nosniff")]
                await send(message)

            await self.upstream(mapped, replay_receive, controlled_send)


def build_gateway(
    upstream: Callable,
    *,
    token: str | None = None,
    allowed_origins: list[str] | None = None,
    max_body_bytes: int | None = None,
) -> CORSMiddleware:
    key = token if token is not None else os.environ.get("STUDIO_API_TOKEN", "")
    origins = allowed_origins or [
        origin.strip()
        for origin in os.environ.get("STUDIO_ALLOWED_ORIGINS", DEFAULT_ORIGIN).split(",")
        if origin.strip()
    ]
    if "*" in origins:
        raise ValueError("Configure explicit STUDIO_ALLOWED_ORIGINS, not a wildcard")
    limit = max_body_bytes if max_body_bytes is not None else int(
        os.environ.get("STUDIO_MAX_UPLOAD_MB", "100")
    ) * 1024 * 1024
    return CORSMiddleware(
        StudioGateway(upstream, key, max_body_bytes=limit),
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Voicebox-Client-Id", "Last-Event-ID", "Mcp-Session-Id", "Mcp-Protocol-Version"],
        expose_headers=["Content-Disposition", "Content-Length", "Mcp-Session-Id"],
        max_age=600,
    )

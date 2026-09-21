from __future__ import annotations

import hmac
import os
from typing import Annotated, Literal
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, HttpUrl

router = APIRouter(prefix="/api/admin/research", tags=["admin-research"])


class ResearchRequest(BaseModel):
    """A bounded, read-only request for the shared evidence service."""

    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=3, max_length=1500)
    urls: list[HttpUrl] = Field(default_factory=list, max_length=8)
    discover: bool = False
    provider: Literal["auto", "web", "browser", "youtube", "x", "reddit"] = "auto"
    language: Literal["ar", "en"] = "ar"
    use_llm: bool = False


def _require_admin(
    supplied: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
) -> None:
    expected = os.getenv("CHESS_ANALYSIS_ADMIN_KEY", "")
    if len(expected) < 32:
        raise HTTPException(status_code=503, detail="Admin research access is not configured")
    if not supplied or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid admin key")


def _settings() -> tuple[str, str]:
    base_url = os.getenv("MASAR_API_URL", "").rstrip("/")
    token = os.getenv("MASAR_AI_CHESS_TOKEN", "")
    parsed = urlsplit(base_url)
    local = parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost"}
    if (parsed.scheme != "https" and not local) or not parsed.netloc or len(token) < 32:
        raise HTTPException(status_code=503, detail="Research service is not configured")
    return base_url, token


async def _request_masar(method: str, path: str, payload: dict | None = None) -> dict:
    base_url, token = _settings()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=5.0), follow_redirects=False
        ) as client:
            response = await client.request(
                method,
                f"{base_url}{path}",
                headers=headers,
                json=payload,
            )
    except (httpx.TimeoutException, httpx.NetworkError) as exc:
        raise HTTPException(status_code=503, detail="Research service is unavailable") from exc

    if response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Research request limit reached",
            headers={"Retry-After": response.headers.get("Retry-After", "60")},
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Research service rejected the request")
    try:
        result = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Research service returned invalid data") from exc
    if not isinstance(result, dict):
        raise HTTPException(status_code=502, detail="Research service returned invalid data")
    return result


@router.get("/capabilities")
async def research_capabilities(
    x_admin_key: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
):
    _require_admin(x_admin_key)
    return await _request_masar("GET", "/v1/capabilities")


@router.post("")
async def run_research(
    request: ResearchRequest,
    x_admin_key: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
):
    _require_admin(x_admin_key)
    if not request.urls and not request.discover:
        raise HTTPException(status_code=422, detail="Supply URLs or enable discovery")
    payload = request.model_dump(mode="json")
    return await _request_masar("POST", "/v1/analyze", payload)

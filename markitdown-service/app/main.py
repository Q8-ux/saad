from __future__ import annotations

import asyncio
import logging
import os
import secrets
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated, Literal

from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from app import __version__

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("markitdown-service")


SUPPORTED_FORMATS: dict[str, str] = {
    ".pdf": "PDF",
    ".docx": "Microsoft Word",
    ".pptx": "Microsoft PowerPoint",
    ".xlsx": "Microsoft Excel",
    ".xls": "Microsoft Excel (legacy)",
    ".msg": "Microsoft Outlook message",
    ".eml": "Email message",
    ".html": "HTML",
    ".htm": "HTML",
    ".csv": "CSV",
    ".json": "JSON",
    ".xml": "XML",
    ".txt": "Plain text",
    ".md": "Markdown",
    ".jpg": "JPEG image",
    ".jpeg": "JPEG image",
    ".png": "PNG image",
    ".gif": "GIF image",
    ".webp": "WebP image",
    ".tif": "TIFF image",
    ".tiff": "TIFF image",
    ".bmp": "Bitmap image",
}


def _positive_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw_value = os.getenv(name, str(default))
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc
    if not minimum <= value <= maximum:
        raise RuntimeError(f"{name} must be between {minimum} and {maximum}")
    return value


@dataclass(frozen=True)
class Settings:
    api_key: str
    max_file_size_bytes: int
    max_output_characters: int
    conversion_timeout_seconds: int
    max_concurrent_conversions: int


def load_settings() -> Settings:
    max_file_size_mb = _positive_int("MAX_FILE_SIZE_MB", 50, 1, 200)
    return Settings(
        api_key=os.getenv("MARKITDOWN_API_KEY", ""),
        max_file_size_bytes=max_file_size_mb * 1024 * 1024,
        max_output_characters=_positive_int(
            "MAX_OUTPUT_CHARACTERS", 5_000_000, 10_000, 20_000_000
        ),
        conversion_timeout_seconds=_positive_int(
            "CONVERSION_TIMEOUT_SECONDS", 180, 10, 900
        ),
        max_concurrent_conversions=_positive_int(
            "MAX_CONCURRENT_CONVERSIONS", 1, 1, 8
        ),
    )


settings = load_settings()
conversion_slots = asyncio.Semaphore(settings.max_concurrent_conversions)
service_root = Path(__file__).resolve().parent.parent


class ConversionResponse(BaseModel):
    request_id: str
    filename: str
    content_type: str | None
    format: str
    markdown: str
    characters: int = Field(ge=0)
    elapsed_ms: int = Field(ge=0)
    engine: str = "microsoft/markitdown@0.1.7"


class FormatsResponse(BaseModel):
    extensions: dict[str, str]
    max_file_size_mb: int
    timeout_seconds: int
    notes: list[str]


app = FastAPI(
    title="MarkItDown Conversion API",
    version=__version__,
    description=(
        "A private, server-to-server API for converting common documents to "
        "Markdown with Microsoft MarkItDown. Remote URLs, archives, and plugins "
        "are intentionally disabled."
    ),
    docs_url="/docs",
    redoc_url=None,
)


@app.middleware("http")
async def secure_response_headers(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


def _provided_key(x_api_key: str | None, authorization: str | None) -> str:
    if x_api_key:
        return x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


async def require_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    if not settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service authentication is not configured",
        )
    candidate = _provided_key(x_api_key, authorization)
    if not candidate or not secrets.compare_digest(candidate, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": "markitdown-service",
        "status": "ok",
        "version": __version__,
        "documentation": "/docs",
    }


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "healthy", "version": __version__}


@app.get(
    "/v1/formats",
    response_model=FormatsResponse,
    dependencies=[Depends(require_api_key)],
)
async def formats() -> FormatsResponse:
    return FormatsResponse(
        extensions=SUPPORTED_FORMATS,
        max_file_size_mb=settings.max_file_size_bytes // (1024 * 1024),
        timeout_seconds=settings.conversion_timeout_seconds,
        notes=[
            "Files are deleted immediately after each request.",
            "Scanned PDFs and Arabic image OCR require a separate OCR provider.",
            "Remote URLs, ZIP archives, and MarkItDown plugins are disabled.",
        ],
    )


async def _save_upload(upload: UploadFile, destination: Path) -> int:
    total = 0
    chunk_size = 1024 * 1024
    with destination.open("wb") as output:
        while chunk := await upload.read(chunk_size):
            total += len(chunk)
            if total > settings.max_file_size_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=(
                        "File exceeds the configured limit of "
                        f"{settings.max_file_size_bytes // (1024 * 1024)} MB"
                    ),
                )
            output.write(chunk)
    if total == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    return total


async def _run_converter(input_path: Path) -> str:
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "app.worker",
        str(input_path),
        cwd=service_root,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=settings.conversion_timeout_seconds
        )
    except TimeoutError as exc:
        process.kill()
        await process.wait()
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Document conversion timed out",
        ) from exc

    if process.returncode != 0:
        error_excerpt = stderr.decode("utf-8", errors="replace")[-2_000:]
        logger.warning(
            "converter_failed returncode=%s error=%r",
            process.returncode,
            error_excerpt,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The document could not be converted",
        )

    markdown = stdout.decode("utf-8", errors="replace")
    if len(markdown) > settings.max_output_characters:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Converted Markdown exceeds the configured output limit",
        )
    return markdown


@app.post(
    "/v1/convert",
    response_model=ConversionResponse,
    dependencies=[Depends(require_api_key)],
)
async def convert_document(
    request: Request,
    file: Annotated[UploadFile, File(description="Document to convert")],
    response_format: Literal["json", "markdown"] = "json",
):
    started = time.monotonic()
    filename = Path(file.filename or "").name
    extension = Path(filename).suffix.lower()
    if not filename or extension not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "message": "Unsupported file extension",
                "supported_extensions": sorted(SUPPORTED_FORMATS),
            },
        )

    declared_length = request.headers.get("content-length")
    if declared_length and declared_length.isdigit():
        multipart_allowance = 1024 * 1024
        if int(declared_length) > settings.max_file_size_bytes + multipart_allowance:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request is larger than the configured file limit",
            )

    try:
        with tempfile.TemporaryDirectory(prefix="markitdown-") as temporary_directory:
            input_path = Path(temporary_directory) / f"input{extension}"
            await _save_upload(file, input_path)
            async with conversion_slots:
                markdown = await _run_converter(input_path)
    finally:
        await file.close()

    elapsed_ms = round((time.monotonic() - started) * 1000)
    request_id = request.state.request_id
    logger.info(
        "conversion_complete request_id=%s extension=%s characters=%s elapsed_ms=%s",
        request_id,
        extension,
        len(markdown),
        elapsed_ms,
    )

    if response_format == "markdown":
        return PlainTextResponse(
            markdown,
            media_type="text/markdown; charset=utf-8",
            headers={
                "X-Request-ID": request_id,
                "X-Conversion-Engine": "microsoft-markitdown-0.1.7",
            },
        )

    return ConversionResponse(
        request_id=request_id,
        filename=filename,
        content_type=file.content_type,
        format=SUPPORTED_FORMATS[extension],
        markdown=markdown,
        characters=len(markdown),
        elapsed_ms=elapsed_ms,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "request_id": getattr(request.state, "request_id", None),
        },
        headers=exc.headers,
    )

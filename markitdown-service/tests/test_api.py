from __future__ import annotations

from dataclasses import replace
from io import BytesIO

from fastapi.testclient import TestClient
from openpyxl import Workbook
from pptx import Presentation

from app import main as app_module

app_module.settings = replace(app_module.settings, api_key="test-api-key")
client = TestClient(app_module.app)
auth_headers = {"X-API-Key": "test-api-key"}


def test_health_is_public() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.headers["cache-control"] == "no-store"


def test_conversion_requires_authentication() -> None:
    response = client.post(
        "/v1/convert",
        files={"file": ("example.txt", b"Hello", "text/plain")},
    )
    assert response.status_code == 401


def test_rejects_invalid_api_key() -> None:
    response = client.get("/v1/formats", headers={"X-API-Key": "wrong"})
    assert response.status_code == 401


def test_converts_plain_text_to_markdown() -> None:
    response = client.post(
        "/v1/convert",
        headers=auth_headers,
        files={
            "file": (
                "example.txt",
                "عنوان\n\nمحتوى عربي واضح".encode(),
                "text/plain",
            )
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["filename"] == "example.txt"
    assert "محتوى عربي واضح" in body["markdown"]
    assert body["engine"] == "microsoft/markitdown@0.1.7"


def test_can_return_raw_markdown() -> None:
    response = client.post(
        "/v1/convert?response_format=markdown",
        headers=auth_headers,
        files={"file": ("example.md", b"# Heading", "text/markdown")},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "# Heading" in response.text


def test_converts_excel_workbook() -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "العقود"
    sheet.append(["رقم العقد", "الحالة"])
    sheet.append([101, "ساري"])
    payload = BytesIO()
    workbook.save(payload)

    response = client.post(
        "/v1/convert",
        headers=auth_headers,
        files={
            "file": (
                "contracts.xlsx",
                payload.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 200, response.text
    markdown = response.json()["markdown"]
    assert "رقم العقد" in markdown
    assert "ساري" in markdown


def test_converts_powerpoint_presentation() -> None:
    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[1])
    slide.shapes.title.text = "ملخص المشروع"
    slide.placeholders[1].text = "خدمة مستقلة لجميع المشاريع"
    payload = BytesIO()
    presentation.save(payload)

    response = client.post(
        "/v1/convert",
        headers=auth_headers,
        files={
            "file": (
                "project.pptx",
                payload.getvalue(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        },
    )
    assert response.status_code == 200, response.text
    markdown = response.json()["markdown"]
    assert "ملخص المشروع" in markdown
    assert "خدمة مستقلة" in markdown


def test_rejects_unsupported_extensions() -> None:
    response = client.post(
        "/v1/convert",
        headers=auth_headers,
        files={"file": ("archive.zip", b"not-a-zip", "application/zip")},
    )
    assert response.status_code == 415

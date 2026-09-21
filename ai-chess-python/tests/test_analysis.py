from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_research_endpoint_is_admin_only(monkeypatch):
    monkeypatch.setenv("CHESS_ANALYSIS_ADMIN_KEY", "a" * 40)

    response = client.post(
        "/api/admin/research",
        json={"query": "حلل اتجاهات تعليم الشطرنج", "discover": True},
    )

    assert response.status_code == 401


def test_research_endpoint_requires_server_configuration(monkeypatch):
    monkeypatch.setenv("CHESS_ANALYSIS_ADMIN_KEY", "a" * 40)
    monkeypatch.delenv("MASAR_API_URL", raising=False)
    monkeypatch.delenv("MASAR_AI_CHESS_TOKEN", raising=False)

    response = client.get(
        "/api/admin/research/capabilities",
        headers={"X-Admin-Key": "a" * 40},
    )

    assert response.status_code == 503


def test_research_proxy_keeps_the_request_bounded(monkeypatch):
    monkeypatch.setenv("CHESS_ANALYSIS_ADMIN_KEY", "a" * 40)
    observed = {}

    async def fake_request(method, path, payload=None):
        observed.update({"method": method, "path": path, "payload": payload})
        return {"status": "ok", "sources": []}

    monkeypatch.setattr("app.analysis._request_masar", fake_request)
    response = client.post(
        "/api/admin/research",
        headers={"X-Admin-Key": "a" * 40},
        json={
            "query": "قارن مصادر تدريب المبتدئين",
            "urls": ["https://lichess.org/practice"],
            "language": "ar",
        },
    )

    assert response.status_code == 200
    assert observed["method"] == "POST"
    assert observed["path"] == "/v1/analyze"
    assert observed["payload"]["use_llm"] is False
    assert len(observed["payload"]["urls"]) == 1

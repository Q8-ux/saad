from fastapi.testclient import TestClient
from masar.api import create_app
from masar.config import Project


def client(monkeypatch):
    monkeypatch.setenv("TOKEN_A", "a"*40)
    monkeypatch.setenv("TOKEN_B", "b"*40)
    return TestClient(create_app({"a":Project(token_env="TOKEN_A",requests_per_minute=1),
                                 "b":Project(token_env="TOKEN_B",requests_per_minute=2)}))


def test_auth_and_tenant_boundary(monkeypatch):
    with client(monkeypatch) as c:
        assert c.get("/healthz").status_code == 200
        assert c.get("/v1/capabilities").status_code == 401
        assert c.get("/v1/capabilities",headers={"Authorization":"Bearer invalid"}).status_code == 401
        assert c.get("/v1/capabilities",headers={"Authorization":"Bearer "+"a"*40}).json()["project"] == "a"
        result=c.post("/v1/analyze",headers={"Authorization":"Bearer "+"a"*40},json={"query":"q","urls":["https://example.com"],"project":"b"})
        assert result.status_code == 422


def test_rate_is_per_project(monkeypatch):
    monkeypatch.setattr("masar.api.analyze",lambda *args: {"status":"ok"})
    with client(monkeypatch) as c:
        def post(key): return c.post("/v1/analyze",headers={"Authorization":"Bearer "+key*40},json={"query":"q","urls":["https://example.com"]})
        assert post("a").status_code == 200
        assert post("a").status_code == 429
        assert post("b").status_code == 200


def test_empty_request_is_rejected(monkeypatch):
    with client(monkeypatch) as c:
        assert c.post("/v1/analyze",headers={"Authorization":"Bearer "+"a"*40},json={"query":"q"}).status_code == 422

import chess
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_explanation_validates_move_and_falls_back_without_key(monkeypatch):
    monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    response = client.post("/api/explain", json={
        "fen": chess.STARTING_FEN, "uci": "e2e4", "language": "ar"
    })
    assert response.status_code == 200
    assert response.json()["source"] == "rules"
    assert response.json()["san"] == "e4"

    illegal = client.post("/api/explain", json={
        "fen": chess.STARTING_FEN, "uci": "e2e5", "language": "ar"
    })
    assert illegal.status_code == 400

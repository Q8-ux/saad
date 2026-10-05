import chess
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_coach_returns_a_validated_legal_move():
    board = chess.Board()
    response = client.post(
        "/api/coach",
        json={"fen": board.fen(), "language": "ar"},
    )

    assert response.status_code == 200
    payload = response.json()
    move = chess.Move.from_uci(payload["recommended_move"]["uci"])
    assert move in board.legal_moves
    assert payload["source"] == "validated_rules_engine"
    assert payload["plans"]
    assert payload["position"]["legal_moves"] == board.legal_moves.count()


def test_coach_rejects_an_invalid_position():
    response = client.post(
        "/api/coach",
        json={"fen": "not-a-fen", "language": "en"},
    )

    assert response.status_code == 400

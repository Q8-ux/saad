import chess
from fastapi.testclient import TestClient

from app.main import app, board_from_history, board_payload


client = TestClient(app)


def play(history):
    board = chess.Board()
    for uci in history:
        board.push_uci(uci)
    return board


def test_history_restores_repetition_claim():
    history = ["g1f3", "g8f6", "f3g1", "f6g8"] * 2
    board = board_from_history(play(history).fen(), history)

    assert board.can_claim_threefold_repetition()
    assert board_payload(board)["reason"] == "threefold_repetition"


def test_move_endpoint_detects_repetition_before_ai_moves():
    history = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1"]
    board = play(history)

    response = client.post(
        "/api/move",
        json={
            "fen": board.fen(),
            "from_square": "f6",
            "to_square": "g8",
            "level": "beginner",
            "move_history": history,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "game_over"
    assert payload["winner"] == "draw"
    assert payload["reason"] == "threefold_repetition"
    assert payload["ai_move"] is None
    assert payload["move_history"] == history + ["f6g8"]


def test_rejects_history_that_does_not_match_fen():
    response = client.post(
        "/api/move",
        json={
            "fen": chess.STARTING_FEN,
            "from_square": "e2",
            "to_square": "e4",
            "move_history": ["g1f3"],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid move request"


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_beginner_hint_returns_a_legal_white_move():
    response = client.post("/api/hint", json={
        "fen": chess.Board().fen(),
        "move_history": [],
    })
    assert response.status_code == 200
    payload = response.json()
    board = chess.Board()
    move = chess.Move.from_uci(payload["from_square"] + payload["to_square"])
    assert move in board.legal_moves
    assert payload["san"]


def test_hint_rejects_when_it_is_not_players_turn():
    board = chess.Board()
    board.push_uci("e2e4")
    response = client.post("/api/hint", json={
        "fen": board.fen(),
        "move_history": ["e2e4"],
    })
    assert response.status_code == 409

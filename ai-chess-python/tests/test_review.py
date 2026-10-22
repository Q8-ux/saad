import chess
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_review_returns_localized_validated_move_feedback():
    response = client.post(
        "/api/review",
        json={"fen": chess.STARTING_FEN, "uci": "e2e4", "language": "ar"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "validated_rules_engine"
    assert payload["grade"] in {"best", "good", "inaccuracy", "mistake"}
    assert payload["played"]["san"] == "e4"
    assert chess.Move.from_uci(payload["engine_choice"]["uci"]) in chess.Board().legal_moves
    assert payload["summary"]


def test_review_rejects_illegal_move():
    response = client.post(
        "/api/review",
        json={"fen": chess.STARTING_FEN, "uci": "e2e5", "language": "en"},
    )

    assert response.status_code == 400


def test_mobile_command_dock_and_accessible_squares_are_present():
    from pathlib import Path

    static = Path(__file__).parents[1] / "app" / "static"
    html = (static / "index.html").read_text(encoding="utf-8")
    javascript = (static / "app.js").read_text(encoding="utf-8")
    styles = (static / "styles.css").read_text(encoding="utf-8")

    assert 'class="play-dock glass"' in html
    assert 'id="moveReview"' in html
    assert "dockAnalyze" in javascript and "dockMoves" in javascript
    assert "setAttribute('aria-label'" in javascript
    assert ".play-dock button{min-width:0;min-height:56px" in styles

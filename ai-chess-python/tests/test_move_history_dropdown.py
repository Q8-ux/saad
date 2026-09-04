from pathlib import Path


STATIC_DIR = Path(__file__).parents[1] / "app" / "static"


def test_move_history_uses_collapsible_details_control():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")

    assert '<details id="movesDisclosure" class="moves-disclosure">' in html
    assert '<summary class="moves-summary">' in html
    assert 'id="movesCount"' in html
    assert '<details id="movesDisclosure" class="moves-disclosure" open>' not in html


def test_move_history_dropdown_updates_count_and_open_state_styles():
    javascript = (STATIC_DIR / "app.js").read_text(encoding="utf-8")
    styles = (STATIC_DIR / "styles.css").read_text(encoding="utf-8")

    assert "movesCountEl.textContent=String(moveCount)" in javascript
    assert "movesDisclosure.setAttribute('aria-label'" in javascript
    assert ".moves-disclosure[open] .moves-chevron" in styles
    assert ".moves-summary:focus-visible" in styles


def test_saved_game_and_offline_state_are_resilient():
    html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
    javascript = (STATIC_DIR / "app.js").read_text(encoding="utf-8")
    translations = (STATIC_DIR / "i18n.js").read_text(encoding="utf-8")

    assert 'id="networkBanner"' in html
    assert "SAVED_GAME_TTL_MS" in javascript
    assert "hintsUsed,savedAt" in javascript
    assert "window.addEventListener('offline'" in javascript
    assert "window.addEventListener('online'" in javascript
    assert "networkMoveFailed" in translations

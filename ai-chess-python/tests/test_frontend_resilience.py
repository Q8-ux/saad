from pathlib import Path


APP_JS = Path(__file__).parents[1] / "app" / "static" / "app.js"


def source():
    return APP_JS.read_text(encoding="utf-8")


def test_blocked_local_storage_is_best_effort_everywhere():
    content = source()

    assert "try{localStorage.removeItem(SAVED_GAME_KEY)}catch(__){}" in content
    assert "try{localStorage.setItem(SAVED_GAME_KEY" in content
    assert "function clearSavedGame(){try{localStorage.removeItem(SAVED_GAME_KEY)}catch(_){}" in content


def test_game_status_is_tracked_by_translation_key():
    content = source()

    assert "let statusKey = 'yourWhiteTurn';" in content
    assert "function setStatus(key){statusKey=key;statusEl.textContent=t(key)}" in content
    assert "setStatus(data.check?'checkTurn':'yourWhiteTurn')" in content
    assert "setStatus('youWon')" in content
    assert "setStatus('aiWon')" in content
    assert "setStatus('draw')" in content


def test_reconnect_restores_semantic_status_not_default_turn():
    content = source()

    assert "statusBeforeOffline=statusKey" in content
    assert "statusKey=statusBeforeOffline" in content
    assert "statusEl.textContent=t(statusKey)" in content
    assert "if(!window.multiplayerGame&&!locked)statusEl.textContent=t('yourWhiteTurn')" not in content


def test_language_change_preserves_current_game_status():
    content = source()

    assert "statusEl.textContent=t(navigator.onLine?statusKey:'offlineNotice')" in content
    assert "languagechange" in content

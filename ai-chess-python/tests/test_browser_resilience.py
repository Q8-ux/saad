from __future__ import annotations

import socket
import subprocess
import sys
import time
from contextlib import closing

import pytest
from playwright.sync_api import sync_playwright


SAVED_GAME_KEY = "ai_chess_saved_game_v1"


def _free_port() -> int:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


@pytest.fixture(scope="module")
def app_url():
    port = _free_port()
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}"
    deadline = time.time() + 15
    try:
        while time.time() < deadline:
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=0.25):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("AI Chess test server did not start")
        yield url
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


def test_ui_starts_when_saved_game_storage_is_blocked(app_url):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context()
        context.add_init_script(
            f"""
            (() => {{
              const key = {SAVED_GAME_KEY!r};
              const originalGet = Storage.prototype.getItem;
              const originalSet = Storage.prototype.setItem;
              const originalRemove = Storage.prototype.removeItem;
              Storage.prototype.getItem = function(name) {{
                if (name === key) throw new DOMException('blocked', 'SecurityError');
                return originalGet.call(this, name);
              }};
              Storage.prototype.setItem = function(name, value) {{
                if (name === key) throw new DOMException('blocked', 'SecurityError');
                return originalSet.call(this, name, value);
              }};
              Storage.prototype.removeItem = function(name) {{
                if (name === key) throw new DOMException('blocked', 'SecurityError');
                return originalRemove.call(this, name);
              }};
            }})();
            """
        )
        page = context.new_page()
        page.goto(app_url, wait_until="domcontentloaded")
        page.wait_for_selector("#board .square")

        assert page.locator("#board .square").count() == 64
        page.locator("#newGame").click()
        assert page.locator("#gameStatus").inner_text().strip()

        browser.close()


def test_game_status_survives_language_change_and_reconnect(app_url):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        context = browser.new_context()
        page = context.new_page()

        page.route(
            "**/api/legal",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"moves":["e4"]}',
            ),
        )
        page.route(
            "**/api/move",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body=(
                    '{"fen":"8/8/8/8/8/8/8/8 w - - 0 1",'
                    '"move_history":["e2e4"],"player_move":"e2e4",'
                    '"player_san":"e4","ai_move":null,"ai_san":null,'
                    '"status":"game_over","winner":"draw","reason":"stalemate",'
                    '"turn":"white","check":false,"legal_count":0}'
                ),
            ),
        )

        page.goto(app_url, wait_until="domcontentloaded")
        page.locator('[data-square="e2"]').click()
        page.locator('[data-square="e4"]').click()
        page.wait_for_function("document.querySelector('#gameStatus').textContent.includes('التعادل')")

        page.locator("#languageSelect").select_option("en")
        page.wait_for_function("document.querySelector('#gameStatus').textContent === 'Game ended in a draw'")
        assert page.locator("#gameStatus").inner_text() == "Game ended in a draw"

        context.set_offline(True)
        page.wait_for_function("document.body.classList.contains('is-offline')")
        assert "offline" in page.locator("#gameStatus").inner_text().lower()

        context.set_offline(False)
        page.wait_for_function("!document.body.classList.contains('is-offline')")
        page.wait_for_function("document.querySelector('#gameStatus').textContent === 'Game ended in a draw'")
        assert page.locator("#gameStatus").inner_text() == "Game ended in a draw"

        browser.close()

"""Opt-in hardened routing API: configuration-only, not an agent executor."""
import hmac
import json
import os
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

CONFIG = json.loads((Path(__file__).resolve().parents[1] / "integration-plan.json").read_text("utf-8"))
MAX_BODY = 4096
MAX_REQUESTS = 30
WINDOW_SECONDS = 60
requests = defaultdict(deque)
lock = Lock()

def authorize(header, project, credentials):
    if not isinstance(project, str) or project not in CONFIG["projects"]:
        return False
    if not header.startswith("Bearer "):
        return False
    expected = credentials.get(project)
    return bool(expected) and hmac.compare_digest(header[7:], expected)

def allowed(project, module):
    if project not in CONFIG["projects"]:
        return 404, {"error": "unknown_project"}
    if module not in CONFIG["modules"] or module not in CONFIG["projects"][project]:
        return 403, {"error": "module_not_allowed"}
    return 200, {"project": project, "module": module, "status": "configured_not_executed"}

def rate_limit(project, now=None):
    now = time.monotonic() if now is None else now
    with lock:
        q = requests[project]
        while q and now - q[0] >= WINDOW_SECONDS:
            q.popleft()
        if len(q) >= MAX_REQUESTS:
            return False
        q.append(now)
        return True

def credentials_from_env():
    # JSON map of project slug -> independently generated server-side secret.
    raw = os.environ.get("AGENT_PROJECT_KEYS_JSON", "")
    try:
        value = json.loads(raw)
    except ValueError:
        return {}
    if not isinstance(value, dict):
        return {}
    return {k: v for k, v in value.items() if isinstance(k, str) and isinstance(v, str) and len(v) >= 32}

class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            return self.send_json(200, {"status": "ok", "mode": "configuration_only"})
        return self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/v1/route":
            return self.send_json(404, {"error": "not_found"})
        credentials = credentials_from_env()
        if not credentials:
            return self.send_json(503, {"error": "credentials_not_configured"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= MAX_BODY:
                return self.send_json(413, {"error": "invalid_body_size"})
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict):
                return self.send_json(400, {"error": "invalid_payload"})
            project, module = payload.get("project"), payload.get("module")
            if not isinstance(project, str) or not isinstance(module, str):
                return self.send_json(400, {"error": "invalid_payload"})
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "invalid_json"})
        if not authorize(self.headers.get("Authorization", ""), project, credentials):
            return self.send_json(401, {"error": "unauthorized"})
        if not rate_limit(project):
            return self.send_json(429, {"error": "rate_limited"})
        status, data = allowed(project, module)
        return self.send_json(status, data)

if __name__ == "__main__":
    if not credentials_from_env():
        raise SystemExit("AGENT_PROJECT_KEYS_JSON must define project-specific secrets >= 32 chars")
    ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8787"))), Handler).serve_forever()

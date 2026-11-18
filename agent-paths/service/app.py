"""Minimal agent routing gateway. No external dependencies or model calls."""
import hmac
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CONFIG = json.loads((Path(__file__).resolve().parents[1] / "integration-plan.json").read_text(encoding="utf-8"))
MAX_BODY = 8192

def route(project, module):
    allowed = CONFIG["projects"].get(project)
    if allowed is None:
        return 404, {"error": "unknown_project"}
    if module not in CONFIG["modules"] or module not in allowed:
        return 403, {"error": "module_not_allowed"}
    return 200, {"project": project, "module": module, "status": "configured_not_executed", "repository": CONFIG["modules"][module]}

class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/health":
            return self.respond(200, {"status": "ok", "mode": "configuration_only"})
        return self.respond(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/v1/route":
            return self.respond(404, {"error": "not_found"})
        key = os.environ.get("AGENT_GATEWAY_KEY")
        if not key:
            return self.respond(503, {"error": "gateway_not_configured"})
        provided = self.headers.get("Authorization", "")
        if not hmac.compare_digest(provided, "Bearer " + key):
            return self.respond(401, {"error": "unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > MAX_BODY:
                return self.respond(413, {"error": "invalid_body_size"})
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict) or not isinstance(payload.get("project"), str) or not isinstance(payload.get("module"), str):
                return self.respond(400, {"error": "invalid_payload"})
        except (ValueError, UnicodeDecodeError):
            return self.respond(400, {"error": "invalid_json"})
        status, response = route(payload["project"], payload["module"])
        return self.respond(status, response)

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8787"))), Handler).serve_forever()

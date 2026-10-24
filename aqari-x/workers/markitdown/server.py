"""Private, file-only extraction worker; not deployed by the Pages workflow."""
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
from markitdown import MarkItDown

SECRET = os.environ.get("EXTRACTOR_KEY", "")
if len(SECRET) < 32:
    raise RuntimeError("EXTRACTOR_KEY must contain at least 32 characters")
LIMIT = 20 * 1024 * 1024
EXTENSIONS = {".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv"}

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # No private filenames, bodies or tokens in access logs.

    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + SECRET):
            return self.reply(401, {"error": "Unauthorized"})
        if self.path != "/extract":
            return self.reply(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            suffix = Path(self.headers.get("X-Filename", "")).suffix.lower()
            if length < 1 or length > LIMIT or suffix not in EXTENSIONS:
                return self.reply(400, {"error": "Unsupported file or size"})
            self.connection.settimeout(30)
            data = self.rfile.read(length)
            if len(data) != length:
                return self.reply(400, {"error": "Incomplete file"})
            # No URL import, plugins, OCR provider or LLM client is enabled.
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / ("document" + suffix)
                path.write_bytes(data)
                result = MarkItDown(enable_plugins=False).convert(str(path))
                return self.reply(200, {"text": result.text_content[:500_000], "truncated": len(result.text_content) > 500_000,
                                        "method": "markitdown", "requiresReview": True})
        except Exception:
            return self.reply(422, {"error": "Extraction failed; review the source file"})

ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()

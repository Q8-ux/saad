"""Private, stateless CPU embeddings. No manuscripts, vectors or request logs retained."""
import hmac
import json
import math
import os
import signal
import subprocess
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL = "studio-search-270m-i2s-v1"
KEY = os.environ.get("STUDIO_SEARCH_KEY", "")
NATIVE = "http://127.0.0.1:8091"
LOCK = threading.BoundedSemaphore(1)


def native(path, value=None, timeout=65):
    data = None if value is None else json.dumps(value).encode()
    req = urllib.request.Request(NATIVE + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read(100_000))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, data):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        if self.path != "/health":
            return self.reply(404, {"error": "not_found"})
        try:
            ready = native("/health", timeout=2).get("status") == "ok"
        except Exception:
            ready = False
        self.reply(200 if ready else 503, {"status": "ok" if ready else "loading"})

    def do_POST(self):
        self.connection.settimeout(70)
        if not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + KEY):
            return self.reply(401, {"error": "unauthorized"})
        if self.path != "/v1/embeddings":
            return self.reply(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 12_000:
                return self.reply(413, {"error": "input_size"})
            body = json.loads(self.rfile.read(size))
            texts = body.get("input")
            texts = [texts] if isinstance(texts, str) else texts
            if body.get("model") != MODEL or not isinstance(texts, list) or not 1 <= len(texts) <= 2 or any(not isinstance(t, str) or not t.strip() or len(t) > 650 for t in texts):
                return self.reply(400, {"error": "input"})
        except (ValueError, TypeError, TimeoutError):
            return self.reply(400, {"error": "input"})
        if not LOCK.acquire(blocking=False):
            return self.reply(429, {"error": "busy"})
        try:
            output = []
            for index, text in enumerate(texts):
                tokens = native("/tokenize", {"content": text, "add_special": True})["tokens"]
                if len(tokens) > 950:
                    return self.reply(413, {"error": "context"})
                result = native("/v1/embeddings", {"input": text, "model": MODEL, "encoding_format": "float"})
                vector = result["data"][0]["embedding"]
                if len(vector) != 640 or any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in vector) or sum(v*v for v in vector) < 0.01:
                    raise ValueError("invalid_embedding")
                output.append({"object": "embedding", "index": index, "embedding": vector})
            self.reply(200, {"object": "list", "model": MODEL, "data": output})
        except Exception:
            self.reply(503, {"error": "search_unavailable"})
        finally:
            LOCK.release()


def main():
    if len(KEY) < 32:
        raise SystemExit("STUDIO_SEARCH_KEY is required")
    child = subprocess.Popen([
        "/app/llama-server", "--model", "/app/search.gguf", "--alias", MODEL,
        "--host", "127.0.0.1", "--port", "8091", "--embeddings", "--pooling", "last",
        "--ctx-size", "1024", "--batch-size", "128", "--ubatch-size", "128",
        "--threads", "1", "--threads-batch", "1", "--parallel", "1", "--n-gpu-layers", "0",
    ], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    def shutdown(*_):
        child.terminate()
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    # Bind the public listener only after the actual model is ready, so TCP readiness is meaningful.
    for _ in range(240):
        if child.poll() is not None:
            raise SystemExit("Search engine failed to start: " + str(child.returncode))
        try:
            if native("/health", timeout=2).get("status") == "ok":
                break
        except Exception:
            pass
        time.sleep(1)
    else:
        child.terminate()
        raise SystemExit("Search engine startup timed out")
    server = ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "10000"))), Handler)
    server.daemon_threads = True
    print("Writing search is ready", flush=True)
    try:
        server.serve_forever()
    finally:
        child.terminate()


if __name__ == "__main__":
    main()

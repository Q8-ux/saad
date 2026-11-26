#!/usr/bin/env python3
"""Misbar: a loopback-only Arabic analysis workbench. Python 3.10+, no runtime packages."""
from __future__ import annotations

import argparse
import atexit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import ipaddress
import json
import mimetypes
import os
from pathlib import Path
import queue
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import parse_qs, unquote, urlsplit
import webbrowser

VERSION = "1.0.0"
MAX_FILE = 64 * 1024 * 1024
MAX_OUTPUT = 512 * 1024
ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
WEB = ROOT / "web"
TOKEN = secrets.token_urlsafe(32)
RUN_LOCK = threading.Lock()
TOOLS = [
    ("rea", "REA", ("rea", "rea-agents"), False),
    ("ghidra", "Ghidra", ("ghidraRun", "ghidraRun.bat", "analyzeHeadless"), False),
    ("ghidramcp", "GhidraMCP", ("ghidra-mcp",), False),
    ("binwalk", "Binwalk", ("binwalk",), True),
    ("unblob", "Unblob", ("unblob",), False),
    ("qiling", "Qiling", ("qltool",), False),
    ("flashrom", "flashrom", ("flashrom",), False),
    ("rtl433", "rtl_433", ("rtl_433",), False),
    ("sniffle", "Sniffle", ("sniffle-sniff",), False),
    ("hackrf", "HackRF", ("hackrf_info",), False),
    ("pulseview", "PulseView", ("pulseview", "sigrok-cli"), False),
    ("jadx", "JADX", ("jadx", "jadx.bat"), False),
    ("frida", "Frida", ("frida",), False),
    ("mitmproxy", "mitmproxy", ("mitmproxy", "mitmdump"), False),
    ("tshark", "TShark", ("tshark",), True),
    ("capinfos", "capinfos", ("capinfos",), True),
    ("esphome", "ESPHome", ("esphome",), False),
    ("homeassistant", "Home Assistant", ("hass",), False),
    ("semgrep", "Semgrep", ("semgrep",), True),
    ("nmap", "Nmap", ("nmap",), False),
    ("nuclei", "Nuclei", ("nuclei",), False),
    ("gobuster", "Gobuster", ("gobuster",), False),
    ("strings", "GNU strings", ("strings",), True),
]


def resolve_tool(names):
    for name in names:
        found = shutil.which(name)
        if found:
            return str(Path(found).resolve())
    # Wireshark installers do not always add their directory to PATH.
    if sys.platform == "win32":
        for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)")):
            if base:
                for name in names:
                    candidate = Path(base) / "Wireshark" / (name + ".exe")
                    if name in ("tshark", "capinfos") and candidate.is_file():
                        return str(candidate)
    return None


def inventory():
    return [{"id": tid, "name": name, "installed": bool(resolve_tool(names)), "runnable": runnable}
            for tid, name, names, runnable in TOOLS]


def redact(text):
    text = re.sub(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}", "[مفتاح محجوب]", text)
    text = re.sub(r"\b(?:ghp|github_pat)_[A-Za-z0-9_]{12,}", "[مفتاح محجوب]", text)
    text = re.sub(r"((?:password|passwd|secret|api[_-]?key|access[_-]?token|authorization|token)\s*[\"']?\s*[:=]\s*[\"']?)([^\s\"'&,;}]{3,})", r"\1[محجوب]", text, flags=re.I)
    text = re.sub(r"(Bearer\s+)[A-Za-z0-9._~+/-]{8,}", r"\1[محجوب]", text, flags=re.I)
    text = re.sub(r"([?&][A-Za-z0-9_-]+=)[^\s&#\"']+", r"\1[محجوب]", text)
    return text


def command_for(tool, source, work):
    spec = next((t for t in TOOLS if t[0] == tool and t[3]), None)
    if spec is None:
        raise ValueError("هذه الأداة غير متاحة للتشغيل من مِسبار. استخدم المكتبة لقراءة متطلباتها.")
    executable = resolve_tool(spec[2])
    if not executable:
        raise ValueError("الأداة غير مثبتة أو غير موجودة في PATH على هذا الكمبيوتر.")
    # Never invoke a shell or accept caller-supplied command options.
    if Path(executable).suffix.lower() in (".cmd", ".bat"):
        raise ValueError("استخدم إصدارًا تنفيذيًا مباشرًا من الأداة؛ لا تُشغّل ملفات أوامر عبر الواجهة.")
    if tool == "binwalk":
        return [executable, str(source)]
    if tool == "strings":
        return [executable, "-n", "6", str(source)]
    if tool == "tshark":
        return [executable, "-n", "-r", str(source), "-c", "2000", "-T", "fields",
                "-e", "frame.number", "-e", "_ws.col.Protocol", "-e", "ip.src", "-e", "ip.dst"]
    if tool == "capinfos":
        return [executable, str(source)]
    if tool == "semgrep":
        return [executable, "scan", "--config", str(ROOT / "rules.yml"), "--json", "--metrics", "off",
                "--disable-version-check", str(source)]
    raise ValueError("نوع التحليل غير مدعوم.")


def run_file(tool, payload, filename):
    if not payload or len(payload) > MAX_FILE:
        raise ValueError("حجم الملف غير صالح؛ الحد الأقصى ٦٤ ميغابايت.")
    # Preserve only a short extension; discard all user-controlled path components.
    suffix = Path(filename.replace("\\", "/")).suffix.lower()
    if not re.fullmatch(r"\.[a-z0-9]{1,10}", suffix):
        suffix = ".bin"
    if tool in ("tshark", "capinfos") and payload[:4] not in (
        b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4", b"\x4d\x3c\xb2\xa1", b"\xa1\xb2\x3c\x4d", b"\x0a\x0d\x0d\x0a"
    ):
        raise ValueError("هذه الأداة تحتاج ملف PCAP أو PCAPNG محفوظًا.")
    with tempfile.TemporaryDirectory(prefix="misbar-") as tmp:
        work = Path(tmp)
        source = work / ("evidence" + suffix)
        source.write_bytes(payload)
        args = command_for(tool, source, work)
        started = time.monotonic()
        output = work / "tool-output.txt"
        try:
            with output.open("wb") as log:
                result = subprocess.run(args, cwd=work, stdin=subprocess.DEVNULL,
                                        stdout=log, stderr=subprocess.STDOUT, timeout=75,
                                        shell=False, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        except subprocess.TimeoutExpired as exc:
            raise ValueError("تجاوزت الأداة مهلة ٧٥ ثانية وتم إيقاف العملية.") from exc
        with output.open("rb") as log:
            raw = log.read(MAX_OUTPUT + 1)
        text = raw[:MAX_OUTPUT].decode("utf-8", errors="replace").replace(tmp, "[مجلد عمل مؤقت]")
        return {"tool": tool, "exitCode": result.returncode, "output": redact(text),
                "truncated": len(raw) > MAX_OUTPUT, "seconds": round(time.monotonic() - started, 2),
                "mode": "تحليل ملف محفوظ للقراءة فقط"}


def discover_rea():
    executable = resolve_tool(("rea", "rea-agents"))
    if not executable:
        raise ValueError("REA غير مثبت أو غير موجود في PATH. ثبّته من مستودعه الرسمي أولًا.")
    args = [executable, "mcp"]
    if Path(executable).suffix.lower() in (".cmd", ".bat"):
        # npm on Windows emits .cmd shims. Resolve the package entry instead of cmd.exe.
        node = shutil.which("node")
        entry = Path(executable).parent / "node_modules" / "rea-agents" / "scripts" / "rea.mjs"
        if not node or not entry.is_file():
            raise ValueError("تعذر العثور على مدخل REA التنفيذي؛ تحقق من تثبيت Node.js وREA محليًا.")
        args = [node, str(entry), "mcp"]
    lines = queue.Queue(maxsize=1024)
    with tempfile.TemporaryDirectory(prefix="misbar-rea-") as tmp:
        with (Path(tmp) / "stderr.log").open("wb") as log:
            process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log,
                                       text=True, encoding="utf-8", errors="replace", bufsize=1, cwd=tmp,
                                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            def reader():
                total = 0
                try:
                    while True:
                        line = process.stdout.readline(1024 * 1024 + 1)
                        if not line:
                            break
                        total += len(line)
                        if len(line) > 1024 * 1024 or total > 4 * 1024 * 1024:
                            lines.put_nowait(None)
                            break
                        lines.put_nowait(line)
                except (queue.Full, ValueError):
                    pass
                finally:
                    try:
                        lines.put_nowait(None)
                    except queue.Full:
                        pass
            thread = threading.Thread(target=reader, daemon=True)
            thread.start()
            deadline = time.monotonic() + 18
            def send(value):
                process.stdin.write(json.dumps(value) + "\n")
                process.stdin.flush()
            def receive(identifier):
                while time.monotonic() < deadline:
                    try:
                        line = lines.get(timeout=max(.01, deadline - time.monotonic()))
                    except queue.Empty:
                        break
                    if line is None:
                        break
                    try:
                        message = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if message.get("id") == identifier:
                        if message.get("error"):
                            raise ValueError("رفض خادم REA طلب بروتوكول MCP. تحقق من توافق الإصدار.")
                        return message.get("result", {})
                raise ValueError("لم يكتمل استعلام MCP خلال المهلة. تحقق من تشغيل REA ومتطلباته.")
            try:
                send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
                    "protocolVersion": "2024-11-05", "capabilities": {},
                    "clientInfo": {"name": "misbar-lab", "version": VERSION}}})
                receive(1)
                send({"jsonrpc": "2.0", "method": "notifications/initialized"})
                tools, cursor = [], None
                for page in range(8):
                    request = {"jsonrpc": "2.0", "id": page + 2, "method": "tools/list", "params": {}}
                    if cursor:
                        request["params"]["cursor"] = cursor
                    send(request)
                    result = receive(page + 2)
                    tools.extend({"name": str(t.get("name", ""))[:200], "description": str(t.get("description", ""))[:500]}
                                 for t in result.get("tools", []))
                    cursor = result.get("nextCursor")
                    if not cursor:
                        return {"tools": tools, "complete": True, "analysisExecuted": False}
                return {"tools": tools, "complete": False, "analysisExecuted": False}
            finally:
                if process.poll() is None:
                    process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
                process.stdin.close()
                process.stdout.close()
                thread.join(timeout=1)


class Handler(BaseHTTPRequestHandler):
    server_version = "Misbar/" + VERSION
    protocol_version = "HTTP/1.0"

    def log_message(self, fmt, *args):
        # Keep file names, tokens, request bodies and local paths out of logs.
        if sys.stdout:
            print("Misbar HTTP", args[1] if len(args) > 1 else "request")

    def authority(self):
        return f"127.0.0.1:{self.server.server_port}"

    def valid_host(self):
        return self.headers.get("Host") in (self.authority(), f"localhost:{self.server.server_port}")

    def security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        self.send_header("Cache-Control", "no-store")

    def respond(self, status, data, content_type="application/json; charset=utf-8"):
        body = json.dumps(data, ensure_ascii=False).encode() if isinstance(data, dict) else data
        self.send_response(status)
        self.security_headers()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def error_json(self, status, message):
        self.respond(status, {"error": message})

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if not self.valid_host():
            return self.error_json(403, "عنوان المضيف غير مسموح.")
        route = unquote(urlsplit(self.path).path)
        if route == "/api/status":
            origin = self.headers.get("Origin")
            if origin and origin not in (f"http://{self.authority()}", f"http://localhost:{self.server.server_port}"):
                return self.error_json(403, "مصدر الطلب غير مسموح.")
            return self.respond(200, {"application": "misbar-lab", "version": VERSION, "token": TOKEN, "tools": inventory()})
        if route.startswith("/api/"):
            return self.error_json(404, "المسار غير موجود.")
        relative = "index.html" if route == "/" else route.lstrip("/")
        source = (WEB / relative).resolve()
        if not source.is_relative_to(WEB.resolve()) or not source.is_file():
            return self.error_json(404, "الملف غير موجود.")
        content_type = "text/javascript; charset=utf-8" if source.suffix == ".mjs" else mimetypes.guess_type(source.name)[0] or "application/octet-stream"
        return self.respond(200, source.read_bytes(), content_type)

    def do_OPTIONS(self):
        self.error_json(403, "طلبات المصادر الخارجية غير مسموحة.")

    def do_POST(self):
        if not self.valid_host():
            return self.error_json(403, "عنوان المضيف غير مسموح.")
        expected_origins = (f"http://{self.authority()}", f"http://localhost:{self.server.server_port}")
        if self.headers.get("Origin") not in expected_origins:
            return self.error_json(403, "مصدر الطلب غير مسموح.")
        if not secrets.compare_digest(self.headers.get("X-Lab-Token", ""), TOKEN):
            return self.error_json(403, "جلسة محلية غير صالحة. أعد تحميل الصفحة.")
        if self.headers.get("Transfer-Encoding"):
            return self.error_json(400, "طريقة نقل غير مدعومة.")
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            length = -1
        if length < 0 or length > MAX_FILE:
            return self.error_json(413, "حجم الطلب غير صالح؛ الحد الأقصى ٦٤ ميغابايت.")
        path = urlsplit(self.path)
        if path.path not in ("/api/run", "/api/rea-tools"):
            return self.error_json(404, "المسار غير موجود.")
        if path.path == "/api/rea-tools" and length > 1024:
            return self.error_json(413, "طلب MCP أكبر من المتوقع.")
        if not RUN_LOCK.acquire(blocking=False):
            return self.error_json(409, "هناك تحليل محلي قيد التنفيذ؛ انتظر حتى يكتمل.")
        self.connection.settimeout(20)
        try:
            payload = self.rfile.read(length)
            if len(payload) != length:
                raise ValueError("لم تكتمل قراءة الملف.")
            if path.path == "/api/rea-tools":
                result = discover_rea()
            else:
                query = parse_qs(path.query)
                result = run_file(query.get("tool", [""])[0], payload, query.get("filename", ["evidence.bin"])[0])
            self.respond(200, result)
        except (ValueError, OSError, subprocess.SubprocessError) as exc:
            self.error_json(400, redact(str(exc)))
        finally:
            RUN_LOCK.release()


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(20)
        return connection, address


def main():
    parser = argparse.ArgumentParser(description="مِسبار — مختبر الأمن والتحليل المحلي")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    try:
        server = LocalServer(("127.0.0.1", args.port), Handler)
    except OSError:
        from urllib.request import urlopen
        try:
            with urlopen(f"http://127.0.0.1:{args.port}/api/status", timeout=2) as response:
                if json.load(response).get("application") != "misbar-lab":
                    raise ValueError()
            if not args.no_browser:
                webbrowser.open(f"http://127.0.0.1:{args.port}/")
            return
        except Exception:
            raise SystemExit("المنفذ مستخدم. شغّل مِسبار مع --port 8766 أو أغلق الخدمة الأخرى.")
    address = f"http://127.0.0.1:{server.server_port}/"
    if sys.stdout:
        print(f"Misbar {VERSION}: {address}", flush=True)
        print("Close this window or press Ctrl+C to stop the local service.", flush=True)
    if not args.no_browser:
        threading.Timer(.6, lambda: webbrowser.open(address)).start()
    try:
        server.serve_forever(poll_interval=.3)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

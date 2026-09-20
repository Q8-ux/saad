import base64
import importlib.metadata
import json
import os
import re
import selectors
import signal
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from scrapling.parser import Selector
from . import network
from .network import SourceError


def tool_path(name):
    local = Path(sys.executable).parent / name
    return str(local) if local.is_file() else shutil.which(name)


def extract(html):
    page = Selector(html, adaptive=False)
    title = page.css("title::text").get() or ""
    nodes = page.css("main, article")
    content = nodes[0] if nodes else page
    text = content.get_all_text(ignore_tags=("script", "style", "nav", "footer", "header", "noscript"),
                                separator=" ", strip=True)
    return title.strip(), re.sub(r"\s+", " ", text).strip()


def web(url, project):
    network.check_robots(url, project.allowed_hosts)
    response = network.get(url, project.allowed_hosts)
    if response.url != url:
        network.check_robots(response.url, project.allowed_hosts)
    if response.status in (401, 403, 429):
        raise SourceError("source_restricted", "Source requires access or has rate-limited collection")
    if response.status >= 400:
        raise SourceError("source_http_error", f"Source returned HTTP {response.status}")
    kind = response.headers.get("content-type", "").lower()
    if "html" in kind:
        title, text = extract(response.text())
    elif any(t in kind for t in ("text/", "json", "xml")):
        title, text = "", response.text()
    else:
        raise SourceError("unsupported_content", "Use HTML, text, JSON or XML; PDF/OCR is a separate adapter")
    if len(text.strip()) < 40:
        raise SourceError("insufficient_text", "Too little readable text; an authorized browser may be needed")
    if any(t in title.lower() for t in ("just a moment", "access denied", "attention required")):
        raise SourceError("source_restricted", "The source returned an access challenge")
    return response.url, title, text, "scrapling", []


def bounded_command(argv, *, timeout=45, extra_env=None, max_bytes=2_000_000):
    """No shell, no arbitrary command surface, and bounded stdout/stderr."""
    env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG", "SYSTEMROOT", "XDG_CONFIG_HOME") if k in os.environ}
    env["PATH"] = str(Path(sys.executable).parent) + os.pathsep + env.get("PATH", "")
    env.update(extra_env or {})
    executable = tool_path(argv[0]) if "/" not in argv[0] else argv[0]
    if not executable:
        raise SourceError("tool_missing", "The required upstream tool is not installed")
    argv = [executable, *argv[1:]]
    proc = subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=env, start_new_session=True)
    data = bytearray()
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ)
    deadline = time.monotonic() + timeout
    try:
        while True:
            left = deadline - time.monotonic()
            if left <= 0:
                raise SourceError("tool_timeout", "The upstream tool timed out")
            if selector.select(min(left, 1)):
                chunk = os.read(proc.stdout.fileno(), 65536)
                if not chunk:
                    break
                data.extend(chunk)
                if len(data) > max_bytes:
                    raise SourceError("tool_output_limit", "Upstream tool output exceeded its limit")
        if proc.wait(timeout=max(0.01, deadline - time.monotonic())) != 0:
            raise SourceError("upstream_failed", "Upstream tool could not read this source; check its local doctor")
        return data.decode("utf-8", errors="replace")
    finally:
        selector.close()
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
        proc.stdout.close()


def upstream(url, provider, project):
    if not project.social:
        raise SourceError("channel_disabled", "Enable social adapters for this project after configuring its tools")
    if os.environ.get("MASAR_UPSTREAM_EGRESS_ISOLATED") != "1":
        raise SourceError("egress_required", "Run upstream CLI adapters in an isolated outbound network first")
    u = urlsplit(url)
    network.check_host(u.hostname, project.allowed_hosts)
    network.resolve_public(u.hostname, 443)
    if provider == "youtube":
        video_id = u.path.strip("/") if u.hostname == "youtu.be" else parse_qs(u.query).get("v", [""])[0]
        if not video_id and u.path.startswith(("/shorts/", "/embed/")):
            video_id = u.path.split("/")[2]
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            raise SourceError("invalid_video", "A single YouTube video URL is required")
        if not tool_path("yt-dlp"):
            raise SourceError("tool_missing", "Install Agent-Reach's yt-dlp dependency")
        canonical = f"https://www.youtube.com/watch?v={video_id}"
        raw = bounded_command(["yt-dlp", "--ignore-config", "--skip-download", "--no-playlist", "--socket-timeout", "12",
                               "--retries", "0", "--dump-single-json", "--", canonical])
        info = json.loads(raw)
        text = info.get("description", "")
        notes = ["YouTube metadata only; captions were unavailable."]
        tracks = info.get("subtitles") or info.get("automatic_captions") or {}
        languages = sorted(tracks, key=lambda x: (not x.startswith("ar"), not x.startswith("en"), x))
        for lang in languages:
            track = next((t for t in tracks[lang] if t.get("ext") == "json3"), None)
            if not track:
                continue
            try:
                transcript = network.get(track["url"], ["*.youtube.com", "*.googlevideo.com"], max_bytes=2_000_000)
                payload = json.loads(transcript.text())
                lines = ["".join(s.get("utf8", "") for s in e.get("segs", [])) for e in payload.get("events", [])]
                caption_text = " ".join(lines).strip()
                if transcript.status == 200 and caption_text:
                    text += "\n\n" + caption_text
                    notes = [f"Captions language: {lang}; automatic captions may contain errors."]
                    break
            except (SourceError, ValueError, KeyError):
                continue
        return canonical, info.get("title", ""), text, "agent-reach/yt-dlp", notes
    if provider == "x":
        match = re.fullmatch(r"/(?:[A-Za-z0-9_]+|i/web)/status/(\d+)/?", u.path)
        if not match:
            raise SourceError("invalid_post", "A single X status URL is required")
        if not tool_path("twitter"):
            raise SourceError("tool_missing", "Configure Agent-Reach's twitter-cli channel")
        auth = {k: os.environ.get(k, "") for k in ("TWITTER_AUTH_TOKEN", "TWITTER_CT0")}
        if not all(auth.values()):
            raise SourceError("auth_required", "X requires an explicitly configured project session")
        raw = bounded_command([sys.executable, "-m", "masar.twitter_worker", match[1]], extra_env=auth)
    else:
        match = re.search(r"/comments/([A-Za-z0-9]+)(?:/|$)", u.path)
        if not match:
            raise SourceError("invalid_post", "A Reddit post URL is required")
        if not tool_path("rdt"):
            raise SourceError("tool_missing", "Configure Agent-Reach's rdt-cli channel and login")
        credential_file = os.environ.get("MASAR_REDDIT_CREDENTIAL_FILE")
        if not credential_file:
            raise SourceError("auth_required", "Set an explicit project Reddit credential file; browser cookies are never auto-imported")
        raw = bounded_command([sys.executable, "-m", "masar.reddit_worker", match[1]],
                              extra_env={"MASAR_REDDIT_CREDENTIAL_FILE": credential_file})
    if not raw.strip():
        raise SourceError("empty_source", "Upstream tool returned no content")
    return url, "", raw, f"agent-reach/{provider}", ["Content returned by an authenticated upstream CLI; verify account access separately."]


def browser(url, project):
    if not project.browser:
        raise SourceError("browser_disabled", "Browser collection is disabled for this project")
    root = Path(os.environ.get("MASAR_ENHANCED_DIR", ".runtime/patchright-enhanced")).resolve()
    if not (root / "dist/src/browser/browser-manager.js").exists() or not shutil.which("node"):
        raise SourceError("browser_missing", "Install and build the pinned Patchright Enhanced checkout")
    network.check_robots(url, project.allowed_hosts)
    env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG", "PLAYWRIGHT_BROWSERS_PATH") if k in os.environ}
    profile = tempfile.mkdtemp(prefix="masar-browser-")
    proc = subprocess.Popen(["node", str(Path(__file__).with_name("browser.cjs"))], stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=env, start_new_session=True)
    selector = selectors.DefaultSelector()
    selector.register(proc.stdout, selectors.EVENT_READ)
    deadline, count, total = time.monotonic() + 55, 0, 0
    buf = bytearray()

    def send(value):
        proc.stdin.write((json.dumps(value) + "\n").encode())
        proc.stdin.flush()

    try:
        send({"url": url, "root": str(root), "profile": profile,
              "executablePath": os.environ.get("MASAR_BROWSER_EXECUTABLE_PATH")})
        while time.monotonic() < deadline:
            if not selector.select(0.25):
                continue
            chunk = os.read(proc.stdout.fileno(), 65536)
            if not chunk:
                break
            buf.extend(chunk)
            if len(buf) > 3_000_000:
                raise SourceError("browser_output_limit", "Browser output exceeded its limit")
            while b"\n" in buf:
                line, _, rest = buf.partition(b"\n")
                buf = bytearray(rest)
                message = json.loads(line)
                if message.get("type") == "fetch":
                    count += 1
                    try:
                        if count > 40 or total > 8_000_000:
                            raise SourceError("browser_budget", "Browser request budget exhausted")
                        if message.get("method") != "GET":
                            raise SourceError("read_only", "Only GET requests are allowed")
                        if message.get("document"):
                            network.check_robots(message["url"], project.allowed_hosts)
                        response = network.get(message["url"], project.allowed_hosts, redirect=False,
                                               timeout=max(0.1, min(10, deadline-time.monotonic())))
                        total += len(response.body)
                        # No cookies or authentication headers cross this bridge.
                        headers = {k: v for k, v in response.headers.items()
                                   if k in ("content-type", "location", "access-control-allow-origin")}
                        send({"id": message["id"], "status": response.status, "headers": headers,
                              "body": base64.b64encode(response.body).decode()})
                    except (SourceError, ValueError):
                        send({"id": message["id"], "error": "blocked"})
                elif message.get("type") == "result":
                    final = network.normalize_url(message["url"])
                    network.check_host(urlsplit(final).hostname, project.allowed_hosts)
                    if message.get("status", 0) >= 400:
                        raise SourceError("source_restricted", "The browser reached an error or access challenge")
                    title, text = extract(message["html"])
                    if len(text) < 40 or any(t in title.lower() for t in ("just a moment", "access denied", "attention required")):
                        raise SourceError("insufficient_text", "Browser did not reach readable source content")
                    return final, title, text, "patchright-enhanced/scrapling", []
                elif message.get("type") == "error":
                    raise SourceError("browser_failed", "Browser collection failed; check installed Chromium and source access")
        raise SourceError("browser_timeout", "Browser did not finish within its budget")
    finally:
        selector.close()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
        proc.stdin.close()
        proc.stdout.close()
        shutil.rmtree(profile, ignore_errors=True)


def collect(url, provider, project):
    url = network.normalize_url(url)
    host = urlsplit(url).hostname
    network.check_host(host, project.allowed_hosts)
    platform = ("youtube" if host in ("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be")
                else "x" if host in ("x.com", "www.x.com", "twitter.com", "www.twitter.com")
                else "reddit" if host in ("reddit.com", "www.reddit.com", "old.reddit.com") else "web")
    selected = platform if provider == "auto" else provider
    if selected in ("youtube", "x", "reddit"):
        if selected != platform:
            raise SourceError("platform_mismatch", "URL does not match the selected platform")
        return upstream(url, selected, project)
    if selected == "browser":
        return browser(url, project)
    return web(url, project)


def capabilities(project):
    def version(name):
        try:
            return importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            return None
    root = Path(os.environ.get("MASAR_ENHANCED_DIR", ".runtime/patchright-enhanced"))
    return {
        "scrapling": {"version": version("scrapling"), "mode": "public-web"},
        "agent_reach": {"version": version("agent-reach"), "purpose": "upstream tools and local doctor"},
        "patchright_enhanced": {"built": (root / "dist/src/browser/browser-manager.js").exists(), "enabled": project.browser},
        "upstream": {"enabled": project.social, "egress_isolated": os.environ.get("MASAR_UPSTREAM_EGRESS_ISOLATED") == "1",
                     "executables": {n: bool(tool_path(n)) for n in ("yt-dlp", "twitter", "rdt")}},
        "search": {"mcp_installed": version("mcp") is not None, "provider": "Exa MCP; availability requires a live request"},
        "llm": {"enabled": project.llm, "configured": all(os.environ.get(k) for k in
                ("MASAR_LLM_BASE_URL", "MASAR_LLM_MODEL", "MASAR_LLM_API_KEY"))},
        "note": "Installed or configured does not mean a platform is reachable or authenticated."
    }

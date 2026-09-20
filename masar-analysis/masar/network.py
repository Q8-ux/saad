"""Read-only public HTTP transport: DNS pinned per connection, including TLS SNI."""
import http.client
import ipaddress
import socket
import ssl
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser

USER_AGENT = "MasarAnalysis/1.0"
MAX_BYTES = 2_000_000


class SourceError(Exception):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


def normalize_url(url):
    if len(url) > 4096 or any(ord(c) < 32 for c in url) or "\\" in url:
        raise SourceError("invalid_url", "Invalid URL")
    try:
        u = urlsplit(url)
        host = (u.hostname or "").encode("idna").decode().rstrip(".").lower()
        port = u.port
    except (ValueError, UnicodeError):
        raise SourceError("invalid_url", "Invalid URL") from None
    if u.scheme not in ("http", "https") or not host or u.username or u.password:
        raise SourceError("invalid_url", "Only HTTP(S) URLs without credentials are accepted")
    if port and port != (443 if u.scheme == "https" else 80):
        raise SourceError("invalid_url", "Only default web ports are accepted")
    netloc = f"[{host}]" if ":" in host else host
    return urlunsplit((u.scheme, netloc, u.path or "/", u.query, ""))


def check_host(host, allowed):
    if not any(rule == "*" or host == rule or
               (rule.startswith("*.") and (host == rule[2:] or host.endswith("." + rule[2:])))
               for rule in allowed):
        raise SourceError("host_not_allowed", "This domain is outside the project's allowed sources")


def resolve_public(host, port):
    try:
        addresses = list(dict.fromkeys(row[4][0] for row in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)))
    except socket.gaierror:
        raise SourceError("dns_error", "Cannot resolve source domain") from None
    if not addresses or any(not ipaddress.ip_address(a).is_global for a in addresses):
        raise SourceError("private_address", "Local, private and reserved destinations are blocked")
    return addresses[0]


class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, address, timeout):
        super().__init__(host, timeout=timeout, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        # Connect to the validated IP; preserve certificate verification and hostname SNI.
        sock = socket.create_connection((self.address, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except Exception:
            sock.close()
            raise


@dataclass
class Response:
    url: str
    status: int
    headers: dict
    body: bytes

    def text(self):
        charset = "utf-8"
        content_type = self.headers.get("content-type", "")
        if "charset=" in content_type:
            charset = content_type.split("charset=", 1)[1].split(";", 1)[0].strip(' "')
        try:
            return self.body.decode(charset, errors="replace")
        except LookupError:
            return self.body.decode("utf-8", errors="replace")


def get(url, allowed, *, redirect=True, timeout=15, max_bytes=MAX_BYTES):
    deadline = time.monotonic() + timeout
    current = normalize_url(url)
    for hop in range(6):
        u = urlsplit(current)
        check_host(u.hostname, allowed)
        address = resolve_public(u.hostname, 443 if u.scheme == "https" else 80)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise SourceError("timeout", "Source request timed out")
        conn = (PinnedHTTPS(u.hostname, address, remaining) if u.scheme == "https"
                else http.client.HTTPConnection(address, timeout=remaining))
        try:
            conn.request("GET", urlunsplit(("", "", u.path, u.query, "")), headers={
                "Host": u.netloc, "User-Agent": USER_AGENT,
                "Accept": "text/html,application/json,text/plain,application/xml;q=0.9,*/*;q=0.1",
                "Accept-Encoding": "identity"})
            response = conn.getresponse()
            headers = {k.lower(): v for k, v in response.getheaders()}
            if redirect and response.status in (301, 302, 303, 307, 308):
                location = headers.get("location")
                if not location:
                    raise SourceError("bad_redirect", "Redirect is missing its destination")
                target = normalize_url(urljoin(current, location))
                if u.scheme == "https" and urlsplit(target).scheme != "https":
                    raise SourceError("unsafe_redirect", "HTTPS downgrade is blocked")
                current = target
                continue
            chunks, size = [], 0
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise SourceError("timeout", "Source request timed out")
                if conn.sock:
                    conn.sock.settimeout(remaining)
                chunk = response.read1(min(65536, max_bytes + 1 - size))
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise SourceError("too_large", "Source exceeded the response size limit")
                chunks.append(chunk)
            if headers.get("content-encoding", "identity") not in ("", "identity"):
                raise SourceError("unsupported_encoding", "Source ignored uncompressed transfer request")
            return Response(current, response.status, headers, b"".join(chunks))
        except (OSError, http.client.HTTPException):
            raise SourceError("network_error", "Source connection failed or timed out") from None
        finally:
            conn.close()
    raise SourceError("redirect_limit", "Too many redirects")


def check_robots(url, allowed, fetch=get):
    u = urlsplit(normalize_url(url))
    robots = fetch(urlunsplit((u.scheme, u.netloc, "/robots.txt", "", "")), allowed, max_bytes=256_000)
    if robots.status == 404:
        return
    if robots.status >= 400:
        raise SourceError("robots_unavailable", "robots.txt could not be checked; source was skipped")
    parser = RobotFileParser()
    parser.parse(robots.text().splitlines())
    if not parser.can_fetch(USER_AGENT, url):
        raise SourceError("robots_denied", "Source disallows this automated request")

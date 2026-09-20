import socket
import pytest
from masar import network as n


@pytest.mark.parametrize("url", ["file:///etc/passwd", "http://user:password@example.com", "https://example.com:8080", "https://example.com\\@127.0.0.1", "https://example.com/\npath"])
def test_unsafe_url_forms(url):
    with pytest.raises(n.SourceError): n.normalize_url(url)


@pytest.mark.parametrize("ip", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "192.168.1.1", "0.0.0.0"])
def test_private_dns_rejected(monkeypatch, ip):
    monkeypatch.setattr(socket,"getaddrinfo",lambda *a,**k: [(socket.AF_INET,socket.SOCK_STREAM,6,"",(ip,443))])
    with pytest.raises(n.SourceError) as e: n.resolve_public("example.com",443)
    assert e.value.code == "private_address"


def test_mixed_public_private_dns_rejected(monkeypatch):
    monkeypatch.setattr(socket,"getaddrinfo",lambda *a,**k: [(2,1,6,"",(ip,80)) for ip in ["1.1.1.1","10.1.1.1"]])
    with pytest.raises(n.SourceError): n.resolve_public("example.com",80)


def test_redirect_rechecks_address_and_pins_connection(monkeypatch):
    connections=[]
    def resolve(host,port,**kwargs):
        return [(2,1,6,"",("127.0.0.1" if host == "internal.example" else "1.1.1.1",port))]
    class Response:
        status=302
        def getheaders(self): return [("Location","http://internal.example/")]
    class Connection:
        def __init__(self,host,**kwargs): connections.append(host)
        def request(self,*args,**kwargs): pass
        def getresponse(self): return Response()
        def close(self): pass
    monkeypatch.setattr(socket,"getaddrinfo",resolve)
    monkeypatch.setattr(n.http.client,"HTTPConnection",Connection)
    with pytest.raises(n.SourceError) as e: n.get("http://example.com/",["*"])
    assert e.value.code == "private_address"
    assert connections == ["1.1.1.1"]


def test_exact_and_subdomain_allowlist():
    n.check_host("data.example.com",["*.example.com"])
    with pytest.raises(n.SourceError): n.check_host("evilexample.com",["*.example.com"])
    with pytest.raises(n.SourceError): n.check_host("data.example.com",["example.com"])


def test_robots_denial():
    def fetch(*a,**k): return n.Response("https://example.com/robots.txt",200,{},b"User-agent: *\nDisallow: /private\n")
    with pytest.raises(n.SourceError) as e: n.check_robots("https://example.com/private",["*"],fetch=fetch)
    assert e.value.code == "robots_denied"
    n.check_robots("https://example.com/public",["*"],fetch=fetch)

import os
import pytest
from masar import network
from masar.config import Project
from masar.providers import browser


@pytest.mark.skipif(os.environ.get("MASAR_TEST_BROWSER") != "1", reason="Requires installed Chromium and Enhanced build")
def test_real_browser_executes_javascript_and_blocks_private_resource(monkeypatch):
    observed=[]
    def get(url, allowed, **kwargs):
        observed.append(url)
        if "127.0.0.1" in url:
            raise network.SourceError("private_address","blocked")
        html=b'''<title>Dynamic test</title><main id="result">pending</main><script>
          document.getElementById('result').textContent='JavaScript executed successfully and generated enough source evidence for extraction.';
          fetch('http://127.0.0.1/metadata').catch(()=>{});
        </script>'''
        return network.Response(url,200,{"content-type":"text/html"},html)
    monkeypatch.setattr(network,"get",get)
    monkeypatch.setattr(network,"check_robots",lambda *a,**k: None)
    result=browser("https://example.com",Project(token_env="T",browser=True))
    assert "JavaScript executed successfully" in result[2]
    assert result[3] == "patchright-enhanced/scrapling"
    assert any("127.0.0.1" in url for url in observed)

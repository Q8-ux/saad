import pytest
from masar.config import Project
from masar.engine import analyze, model_analysis
from masar.models import AnalysisRequest
from masar.network import SourceError
from masar.providers import extract, collect


P = Project(token_env="TEST_TOKEN", allowed_hosts=["example.com"])


def fixture_source(url, provider, project):
    return url, "عنوان المصدر", "هذه مادة عربية موثقة للاختبار فقط وتستخدم للتحقق من جمع البيانات وربطها بالمصدر.", "fixture", []


def test_dedup_citations_and_time():
    r = analyze(AnalysisRequest(query="ملخص", urls=["https://example.com/a", "https://example.com/a#x", "https://example.com/b"]), P, collector=fixture_source)
    assert len(r["sources"]) == 1
    assert r["sources"][0]["retrieved_at"]
    assert r["sources"][0]["published_at"] is None
    assert r["analysis"]["findings"][0]["source_ids"] == ["S1"]
    assert r["analysis"]["mode"] == "extractive"


def test_no_invented_success():
    def fail(*args):
        raise SourceError("auth_required", "Login missing")
    r = analyze(AnalysisRequest(query="q", urls=["https://example.com/"]), P, collector=fail)
    assert r["status"] == "failed" and r["sources"] == []
    assert r["analysis"]["findings"] == []
    assert r["errors"][0]["code"] == "auth_required"


def test_partial_results_and_truncation():
    def mixed(url, *args):
        if url.endswith("bad"):
            raise SourceError("restricted", "Unavailable")
        return url, "title", "a"*14000, "fixture", []
    r = analyze(AnalysisRequest(query="q", urls=["https://example.com/ok", "https://example.com/bad"]), P, collector=mixed)
    assert r["status"] == "partial" and r["sources"][0]["truncated"]
    assert len(r["sources"][0]["text"]) == 12000


def test_discovery_urls_are_subject_to_project_allowlist():
    calls = []
    def collector(url, *args):
        calls.append(url)
        return fixture_source(url, *args)
    r = analyze(AnalysisRequest(query="q", discover=True), P, collector=collector,
                search=lambda *_: ["https://example.com/a", "https://elsewhere.org/"])
    assert calls == ["https://example.com/a"]
    assert r["errors"][0]["code"] == "host_not_allowed"


def test_script_text_is_removed_by_real_scrapling():
    title, text = extract('<title>العنوان</title><main><p>المحتوى</p><script>steal secrets</script><style>bad CSS</style></main>')
    assert title == "العنوان" and text == "المحتوى"


def test_wrong_platform_and_disabled_channels():
    with pytest.raises(SourceError, match="match"):
        collect("https://example.com/", "x", P)
    with pytest.raises(SourceError, match="disabled"):
        collect("https://example.com/", "browser", P)


def test_llm_error_is_explicit_fallback(monkeypatch):
    def fail(*args):
        raise SourceError("llm_failed", "Invalid model citations")
    monkeypatch.setattr("masar.engine.model_analysis", fail)
    r = analyze(AnalysisRequest(query="q", urls=["https://example.com"], use_llm=True), P.model_copy(update={"llm":True}), collector=fixture_source)
    assert r["analysis"]["mode"] == "extractive" and r["status"] == "partial"
    assert r["errors"][0]["code"] == "llm_failed"


def test_model_rejects_unknown_citation(monkeypatch):
    import httpx
    monkeypatch.setenv("MASAR_LLM_BASE_URL", "https://model.example/v1")
    monkeypatch.setenv("MASAR_LLM_MODEL", "fixture-model")
    monkeypatch.setenv("MASAR_LLM_API_KEY", "fixture-key")
    class FakeClient:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def stream(self, *args, **kwargs): return self
        def raise_for_status(self): pass
        def iter_bytes(self):
            import json
            result={"findings":[{"text":"fake", "source_ids":["S99"]}],"gaps":[],"counterarguments":[],"recommendations":[]}
            yield json.dumps({"choices":[{"message":{"content":json.dumps(result)}}]}).encode()
    monkeypatch.setattr(httpx, "Client", FakeClient)
    source={"id":"S1","url":"https://example.com","title":"t","retrieved_at":"now","text":"source"}
    with pytest.raises(SourceError) as e:
        model_analysis("q",[source],"ar")
    assert e.value.code == "llm_failed"

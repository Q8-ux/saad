import dataclasses
import json
import sys
import pytest

from masar import twitter_worker, reddit_worker
from masar.network import SourceError
from masar.providers import bounded_command, upstream
from masar.config import Project


def forbidden_browser_scan(*args, **kwargs):
    raise AssertionError("A project worker must never scan browser cookies")


def test_twitter_uses_only_explicit_session(monkeypatch, capsys):
    import twitter_cli.auth
    import twitter_cli.client
    monkeypatch.setattr(twitter_cli.auth, "extract_from_browser", forbidden_browser_scan)
    monkeypatch.setenv("TWITTER_AUTH_TOKEN", "test-token")
    monkeypatch.setenv("TWITTER_CT0", "test-ct0")
    monkeypatch.setattr(sys, "argv", ["worker", "12345"])
    @dataclasses.dataclass
    class Tweet:
        text: str
    class Client:
        def __init__(self, token, ct0, **kwargs):
            assert token == "test-token" and ct0 == "test-ct0"
        def fetch_tweet_detail(self, post, count): return [Tweet("fixture source")]
    monkeypatch.setattr(twitter_cli.client, "TwitterClient", Client)
    twitter_worker.main()
    assert json.loads(capsys.readouterr().out)[0]["text"] == "fixture source"


def test_reddit_uses_only_selected_file(monkeypatch, tmp_path, capsys):
    import rdt_cli.auth
    import rdt_cli.client
    monkeypatch.setattr(rdt_cli.auth, "extract_browser_credential", forbidden_browser_scan)
    file = tmp_path / "credential.json"
    file.write_text(json.dumps({"cookies":{"reddit_session":"test-session"}}))
    monkeypatch.setenv("MASAR_REDDIT_CREDENTIAL_FILE", str(file))
    monkeypatch.setattr(sys, "argv", ["worker", "abc123"])
    class Client:
        def __init__(self, credential, **kwargs): assert credential.cookies == {"reddit_session":"test-session"}
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def get_post_comments(self, post, limit): return [{"text":"fixture source"}]
    monkeypatch.setattr(rdt_cli.client, "RedditClient", Client)
    reddit_worker.main()
    assert json.loads(capsys.readouterr().out)[0]["text"] == "fixture source"


def test_upstream_cannot_run_without_network_isolation(monkeypatch):
    monkeypatch.delenv("MASAR_UPSTREAM_EGRESS_ISOLATED", raising=False)
    with pytest.raises(SourceError) as error:
        upstream("https://x.com/user/status/1234", "x", Project(token_env="T",social=True))
    assert error.value.code == "egress_required"


def test_subprocess_output_is_bounded():
    with pytest.raises(SourceError) as error:
        bounded_command([sys.executable,"-c","print('a'*20000)"],max_bytes=1000)
    assert error.value.code == "tool_output_limit"

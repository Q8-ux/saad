import json
import urllib.error
import pytest
from cli_anything.writing_studio.core.project import (
    MAX_INPUT, NoRedirect, atomic_write, gateway_url, read_document, remote_read,
)


def test_native_and_backup_envelopes(tmp_path):
    target = tmp_path / 'source.json'
    for value in ({'kind': 'play'}, {'document': {'kind': 'play'}}, {'doc': {'kind': 'play'}}):
        target.write_text(json.dumps(value))
        assert read_document(target) == {'kind': 'play'}


def test_input_size_limit(tmp_path):
    target = tmp_path / 'large.json'
    target.write_bytes(b' ' * (MAX_INPUT + 1))
    with pytest.raises(ValueError, match='size limit'):
        read_document(target)


def test_atomic_no_clobber_and_private_permissions(tmp_path):
    target = tmp_path / 'result.json'
    atomic_write(target, b'first')
    with pytest.raises(FileExistsError):
        atomic_write(target, b'other')
    assert target.read_bytes() == b'first'
    assert target.stat().st_mode & 0o777 == 0o600
    atomic_write(target, b'approved', True)
    assert target.read_bytes() == b'approved'
    assert len(list(tmp_path.iterdir())) == 1


def test_symbolic_link_is_not_replaced(tmp_path):
    original = tmp_path / 'original'
    original.write_bytes(b'original')
    link = tmp_path / 'link'
    link.symlink_to(original)
    with pytest.raises(ValueError, match='symbolic'):
        atomic_write(link, b'replacement', True)
    assert original.read_bytes() == b'original'


@pytest.mark.parametrize('url', [
    'http://example.com', 'https://user:pass@example.com',
    'https://example.com/api', 'https://example.com?token=x',
    'https://example.com#fragment',
])
def test_gateway_requires_https_origin(url):
    with pytest.raises(ValueError, match='HTTPS'):
        gateway_url(url)


def test_gateway_and_explicit_work_require_session(monkeypatch):
    monkeypatch.delenv('STUDIO_SESSION_TOKEN', raising=False)
    with pytest.raises(ValueError, match='STUDIO_SESSION_TOKEN'):
        remote_read('https://example.com', 'projects')
    monkeypatch.setenv('STUDIO_SESSION_TOKEN', 'synthetic')
    with pytest.raises(ValueError, match='explicit work'):
        remote_read('https://example.com', 'manuscript')


def test_authorization_never_follows_redirect():
    with pytest.raises(ValueError, match='redirect'):
        NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.test')


def test_remote_failure_does_not_echo_token(monkeypatch):
    monkeypatch.setenv('STUDIO_SESSION_TOKEN', 'PRIVATE_TEST_TOKEN')
    class Failed:
        def open(self, request, timeout):
            assert request.get_header('Authorization') == 'Bearer PRIVATE_TEST_TOKEN'
            assert request.full_url.endswith('/api/manuscript?work=scene%3Fother')
            raise urllib.error.HTTPError(request.full_url, 403, 'Forbidden', {}, None)
    monkeypatch.setattr('urllib.request.build_opener', lambda *_: Failed())
    with pytest.raises(ValueError) as failure:
        remote_read('https://example.com', 'manuscript', 'scene?other')
    assert str(failure.value) == 'Gateway request failed (HTTP 403).'

import json
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAX_INPUT = 2_500_000
DEFAULT_GATEWAY = 'https://family-writing-gateway.onrender.com'


def read_document(filename):
    with open(filename, 'rb') as stream:
        raw = stream.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        raise ValueError('Input exceeds the document size limit.')
    value = json.loads(raw.decode('utf-8-sig'))
    if not isinstance(value, dict):
        raise ValueError('A Writing Studio document object is required.')
    return value.get('doc', value.get('document', value))


def atomic_write(destination, data, overwrite=False):
    target = Path(destination).absolute()
    if not target.parent.is_dir():
        raise ValueError('The output directory does not exist.')
    if target.is_symlink():
        raise ValueError('Refusing to replace a symbolic link.')
    handle, temporary = tempfile.mkstemp(prefix='.studio-', dir=target.parent)
    try:
        with os.fdopen(handle, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        if overwrite:
            os.replace(temporary, target)
        else:
            # Atomic no-clobber publication, including a competing CLI process.
            os.link(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return str(target)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Gateway redirects are not accepted.')


def gateway_url(value):
    parts = urllib.parse.urlsplit(value)
    if (parts.scheme != 'https' or not parts.hostname or parts.username
            or parts.password or parts.query or parts.fragment or parts.path not in ('', '/')):
        raise ValueError('Use an HTTPS gateway origin without credentials or a path.')
    return value.rstrip('/')


def remote_read(gateway, endpoint, work=None):
    origin = gateway_url(gateway)
    token = os.environ.get('STUDIO_SESSION_TOKEN', '')
    if not token or '\n' in token or '\r' in token:
        raise ValueError('Provide an authenticated session through STUDIO_SESSION_TOKEN.')
    if endpoint not in ('projects', 'manuscript'):
        raise ValueError('Unsupported read operation.')
    if endpoint == 'manuscript' and not work:
        raise ValueError('An explicit work ID is required.')
    query = '?' + urllib.parse.urlencode({'work': work}) if work else ''
    request = urllib.request.Request(origin + '/api/' + endpoint + query, headers={
        'Authorization': 'Bearer ' + token,
        'Origin': 'https://q8-ux.github.io',
        'Accept': 'application/json',
    })
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=60) as response:
            raw = response.read(MAX_INPUT + 1)
    except urllib.error.HTTPError as error:
        raise ValueError('Gateway request failed (HTTP %s).' % error.code) from None
    except urllib.error.URLError:
        raise ValueError('The gateway could not be reached.') from None
    if len(raw) > MAX_INPUT:
        raise ValueError('Gateway response exceeds the document size limit.')
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError('Invalid gateway response.')
    return value

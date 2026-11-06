"""Diagnostic only: check whether the public TikWM endpoint is accessible from GitHub Actions.
Never expose video media URLs or private data in logs.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

TARGET = 'https://vt.tiktok.com/ZSp6Vv81S/'
ORIGIN = 'https://q8-ux.github.io'
API = 'https://www.tikwm.com/api/?url=' + urllib.parse.quote(TARGET, safe='') + '&hd=1'
for title, url, method in [
    ('cors-preflight', API, 'OPTIONS'),
    ('public-short-link', API, 'GET'),
]:
    request = urllib.request.Request(url, method=method, headers={
        'Origin': ORIGIN,
        'User-Agent': 'Mozilla/5.0 (compatible; SiteVerification/1.0)',
        'Accept': 'application/json',
    })
    if method == 'OPTIONS':
        request.add_header('Access-Control-Request-Method', 'GET')
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            snippet = response.read(400000).decode('utf-8', 'replace') if method == 'GET' else ''
            print(title, 'HTTP', response.status,
                  'allow-origin', response.headers.get('Access-Control-Allow-Origin'),
                  'content-type', response.headers.get('Content-Type'))
            if method == 'GET':
                try:
                    payload = json.loads(snippet)
                    data = payload.get('data') or {}
                    print('code', payload.get('code'), 'msg', str(payload.get('msg'))[:100],
                          'has_video', bool(data.get('play')),
                          'has_hdplay', bool(data.get('hdplay')),
                          'has_music', bool(data.get('music')),
                          'has_title', bool(data.get('title')))
                except Exception:
                    print('non-json response; starts', snippet[:80].replace('\n', ' '))
    except urllib.error.HTTPError as exc:
        print(title, 'HTTP', exc.code, 'allow-origin', exc.headers.get('Access-Control-Allow-Origin'))
    except Exception as exc:
        print(title, 'ERROR', type(exc).__name__, str(exc)[:160])

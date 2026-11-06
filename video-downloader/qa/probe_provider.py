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
                    for field in ('play','hdplay','music'):
                        raw = data.get(field)
                        if not raw or not isinstance(raw,str): continue
                        safe = urllib.parse.urlsplit(urllib.parse.urljoin('https://www.tikwm.com/',raw))
                        if safe.scheme != 'https': continue
                        print(field, 'media host', safe.hostname, 'url_path_extension', safe.path[-5:])
                        media_req = urllib.request.Request(safe.geturl(), method='HEAD', headers={
                            'Origin': ORIGIN, 'User-Agent':'Mozilla/5.0',
                            'Range':'bytes=0-4095',
                        })
                        try:
                            with urllib.request.urlopen(media_req,timeout=12) as media:
                                print(field, 'HTTP', media.status,'CORS',
                                      media.headers.get('Access-Control-Allow-Origin'),
                                      'mime', media.headers.get('Content-Type'),
                                      'disposition', bool(media.headers.get('Content-Disposition')))
                        except urllib.error.HTTPError as err:
                            print(field, 'HTTP', err.code, 'CORS',err.headers.get('Access-Control-Allow-Origin'))
                        except Exception as err:
                            print(field, type(err).__name__,str(err)[:90])
                except Exception:
                    print('non-json response; starts', snippet[:80].replace('\n', ' '))
    except urllib.error.HTTPError as exc:
        print(title, 'HTTP', exc.code, 'allow-origin', exc.headers.get('Access-Control-Allow-Origin'))
    except Exception as exc:
        print(title, 'ERROR', type(exc).__name__, str(exc)[:160])

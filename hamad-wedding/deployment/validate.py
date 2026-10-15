"""Check the static package, Arabic assets and every local reference without a browser."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
import re
import sys
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.references = []
        self.whatsapp = []
        self.maps = []
        self.fragments = []
        self.lang = None
        self.direction = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'html':
            self.lang, self.direction = attrs.get('lang'), attrs.get('dir')
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                raise AssertionError('Duplicate ID: '+attrs['id'])
            self.ids.add(attrs['id'])
        for key in ['src','href']:
            if key in attrs:
                value = attrs[key]
                if value.startswith('#') and len(value)>1:
                    self.fragments.append(value[1:])
                elif not urlsplit(value).scheme:
                    self.references.append(value)
        if tag == 'a' and 'href' in attrs:
            value = attrs['href']
            if value.startswith('https://wa.me/965'):
                self.whatsapp.append(value)
            if 'location-link' in attrs.get('class','').split():
                self.maps.append(value)
            if attrs.get('target') == '_blank':
                assert 'noopener' in attrs.get('rel',''), 'External link lacks noopener'
        if tag == 'img':
            assert attrs.get('alt'), 'Image alt text is missing'

def main():
    html = (DIST / 'index.html').read_text()
    page = Page()
    page.feed(html)
    assert (page.lang,page.direction) == ('ar','rtl')
    assert set(page.fragments) <= page.ids, 'Broken in-page link or SVG symbol'
    for reference in page.references:
        path = DIST / unquote(urlsplit(reference).path)
        assert path.is_file(), 'Missing local reference: '+reference
    expected = {'https://wa.me/965'+n for n in ['65005654','99732147','50168888','66002205']}
    assert set(page.whatsapp) == expected
    assert len(page.whatsapp) == 4
    assert page.maps and all('29.3181267%2C47.7118721' in url for url in page.maps)
    for key in ['2026-10-20','ناصر ماضي راضي الشمري وإخوانه','شارع 24','نعتذر عن قبول العانية']:
        assert key in html, 'Required invitation content missing: '+key
    for path in DIST.rglob('*'):
        if path.is_file():
            assert path.stat().st_size, 'Empty asset: '+str(path)
    css = (DIST / 'assets/style.css').read_text()
    for quoted, content, unquoted in re.findall(r"url\((?:(['\"])(.*?)\1|([^'\"\)]*))\)",css):
        value = content if quoted else unquoted.strip()
        if not value.startswith('data:'):
            assert (DIST/'assets'/value).is_file(), 'Missing CSS asset: '+value
    sw = (DIST/'sw.js').read_text()
    for value in re.findall(r"'((?:\./)[^']*)'",sw.split('self.addEventListener')[0]):
        assert (DIST / urlsplit(value).path).exists(), 'Offline cache references missing asset: '+value
    manifest = json.loads((DIST/'manifest.webmanifest').read_text())
    assert manifest['scope'] == './' and manifest['start_url'] == './'
    for icon in manifest['icons']:
        assert (DIST/icon['src']).is_file()
    assert (DIST/'assets/fonts/Amiri-Regular.woff2').read_bytes()[:4] == b'wOF2'
    assert (DIST/'assets/fonts/Amiri-Bold.woff2').read_bytes()[:4] == b'wOF2'
    # The uploaded portrait/poster must be byte-for-byte the supplied file.
    digest = hashlib.sha256((DIST/'assets/invitation-original.jpg').read_bytes()).hexdigest()
    source = json.loads((ROOT/'location-source.json').read_text())
    assert digest == source['source_sha256']
    assert sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file()) < 1_000_000, 'Invitation is unexpectedly heavy'
    print(f'PASS: Arabic RTL, {len(page.references)} local references, four WhatsApp links, map coordinates, fonts, offline assets, image integrity.')

if __name__ == '__main__':
    main()

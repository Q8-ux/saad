"""Validate the static page and the preservation boundary before publication."""
from html.parser import HTMLParser
import io
from pathlib import Path
import tarfile
import tempfile

from publish import extract, manifest, overlay

SOURCE = Path(__file__).resolve().parents[1] / 'dist'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.local_assets, self.fragments = set(), set(), set()

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if 'id' in data:
            assert data['id'] not in self.ids, 'Duplicate element identifier'
            self.ids.add(data['id'])
        for name in ('src', 'href'):
            value = data.get(name, '')
            if value.startswith('#'):
                self.fragments.add(value[1:])
            elif value and not value.startswith(('https://', 'http://', 'data:')):
                self.local_assets.add(value.split('?', 1)[0])


def verify():
    html = (SOURCE / 'index.html').read_text()
    page = Page()
    page.feed(html)
    assert page.fragments <= page.ids, 'A section link has no destination'
    for asset in page.local_assets:
        path = (SOURCE / asset).resolve()
        assert path.is_relative_to(SOURCE.resolve()) and path.is_file(), f'Missing local asset: {asset}'
    assert (SOURCE / 'assets/mohanad-regular.woff').read_bytes().startswith(b'wOFF')
    assert (SOURCE / 'assets/mohanad-bold.woff').read_bytes().startswith(b'wOFF')
    assert (SOURCE / 'assets/poster.jpg').read_bytes().startswith(b'\xff\xd8')
    for phrase in ('Unknown Killer Robots', '01:10:08', '10 يوليو 2023', 'Jesse Sweet',
                   '4 من 5 على', 'IMDb', 'الطائرات المسيّرة', 'الروبوتات المسلحة',
                   'دون إشراف بشري مباشر', 'تحذيرات الخبراء والعلماء', 'مسؤولين عسكريين',
                   'قرار القتل.', 'من يتحمل المسؤولية', 'Lethal Autonomous Weapons Systems',
                   'الولايات المتحدة، الصين، وروسيا', 'توعويًا', 'Saad Alnabhan',
                   'توقيع زخرفي بجانب علامة واتساب'):
        assert phrase in html, f'Supplied content missing: {phrase}'
    assert 'المعروض الآن هو الإعلان الرسمي، وليس الفيلم الكامل.' in (SOURCE / 'app.js').read_text()
    assert 'wa.me' not in html and 'tel:' not in html and 'whatsapp-link' not in html
    assert 'signature-stamp' in html and 'id="film-video"' in html
    assert 'allow-popups' not in (SOURCE / 'app.js').read_text()
    assert 'allow-top-navigation' not in (SOURCE / 'app.js').read_text()
    assert (SOURCE / 'assets/saad-signature.svg').is_file()
    assert 'id="native-controls"' in html
    assert 'id="film-video" controls ' not in html
    assert 'nodownload' in html
    assert 'drive.google.com' not in html
    assert 'choose-local-film' not in html

    with tempfile.TemporaryDirectory() as work:
        root = Path(work) / 'published'
        root.mkdir()
        (root / 'index.html').write_text('Existing project index')
        (root / 'other-project').mkdir()
        (root / 'other-project/data.json').write_text('{"existing":true}')
        (root / 'unknown-killer-robots').mkdir()
        (root / 'unknown-killer-robots/old.txt').write_text('Obsolete film page')
        before = manifest(root)
        overlay(root, SOURCE)
        assert before == manifest(root), 'Unrelated published files changed'
        assert not (root / 'unknown-killer-robots/old.txt').exists()
        assert (root / 'unknown-killer-robots/index.html').read_text() == html
        assert (root / 'unknown-killer-robots/release-version.txt').is_file()

        for name in ('../outside.txt', '/outside.txt'):
            data = io.BytesIO()
            with tarfile.open(fileobj=data, mode='w') as package:
                item = tarfile.TarInfo(name)
                item.size = 3
                package.addfile(item, io.BytesIO(b'bad'))
            try:
                extract(data.getvalue(), root)
            except RuntimeError:
                pass
            else:
                raise AssertionError('Unsafe artifact path accepted')
    print('PASS: content, assets, section links, rating attribution, scoped overlay and unsafe-archive rejection')


if __name__ == '__main__':
    verify()

import io
from pathlib import Path
import tarfile
import tempfile
import unittest

from prepare import extract, manifest, overlay


class PublicationTests(unittest.TestCase):
    def test_only_static_entry_is_published_and_other_sites_are_unchanged(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'published'
            source = Path(temporary) / 'source'
            root.mkdir()
            source.mkdir()
            (root / 'index.html').write_bytes(b'existing homepage')
            (root / 'another-site').mkdir()
            (root / 'another-site/app.js').write_bytes(b'unchanged app')
            (source / 'index.html').write_text('video-downloader-web-20261124')
            (source / 'app.py').write_text('private backend source')
            (source / '.env').write_text('test-only placeholder')
            before = manifest(root)
            overlay(root, source)
            self.assertEqual(manifest(root), before)
            self.assertEqual(sorted(p.name for p in (root / 'video-downloader').iterdir()), ['index.html', 'release-version.txt'])

    def test_incomplete_release_is_rejected_before_modifying_published_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'index.html').write_text('existing')
            before = manifest(root)
            with self.assertRaises(RuntimeError):
                overlay(root, root / 'missing-source')
            self.assertEqual(manifest(root), before)

    def test_archive_path_traversal_and_symlinks_are_rejected(self):
        for name, entry_type in [('../escape', tarfile.REGTYPE), ('link', tarfile.SYMTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                buffer = io.BytesIO()
                with tarfile.open(fileobj=buffer, mode='w') as archive:
                    entry = tarfile.TarInfo(name)
                    entry.type = entry_type
                    archive.addfile(entry)
                with self.assertRaises(RuntimeError):
                    extract(buffer.getvalue(), Path(temporary))


if __name__ == '__main__':
    unittest.main()

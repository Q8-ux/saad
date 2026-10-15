"""Publication invariant checks using an actual tar/ZIP fixture."""
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('publisher',Path(__file__).resolve().parents[1]/'deployment/publish.py')
publisher=importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

def package(files,symlink=None):
    payload=io.BytesIO()
    with tarfile.open(fileobj=payload,mode='w') as archive:
        for name,content in files.items():
            info=tarfile.TarInfo(name)
            info.size=len(content)
            archive.addfile(info,io.BytesIO(content))
        if symlink:
            info=tarfile.TarInfo(symlink)
            info.type=tarfile.SYMTYPE
            info.linkname='../../outside'
            archive.addfile(info)
    envelope=io.BytesIO()
    with zipfile.ZipFile(envelope,'w') as archive:
        archive.writestr('artifact.tar',payload.getvalue())
    return envelope.getvalue()

class PublicationTests(unittest.TestCase):
    def test_other_projects_remain_byte_identical(self):
        files={'index.html':b'existing home','sabeq-legal/index.html':b'legal site',
               'family-online-studio/assets/app.mjs':b'writing code',
               'hamad-wedding/index.html':b'old invitation'}
        with tempfile.TemporaryDirectory() as temp:
            destination=Path(temp)/'site'
            publisher.restore(package(files),destination)
            publisher.overlay(destination,123)
            for path,content in files.items():
                if not path.startswith('hamad-wedding/'):
                    self.assertEqual((destination/path).read_bytes(),content)
            self.assertIn('أفراح الماضي',(destination/'hamad-wedding/index.html').read_text())
            self.assertTrue((destination/'hamad-wedding/assets/fonts/Amiri-Regular.woff2').is_file())

    def test_unsafe_archives_are_rejected(self):
        for data in [package({'../outside':b'escape'}),package({'index.html':b'x'},symlink='link')]:
            with self.subTest(),tempfile.TemporaryDirectory() as temp:
                with self.assertRaises(RuntimeError):
                    publisher.restore(data,Path(temp)/'site')

    def test_incomplete_previous_site_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(RuntimeError):
                publisher.restore(package({'unrelated.txt':b'x'}),Path(temp)/'site')

if __name__=='__main__':
    unittest.main()

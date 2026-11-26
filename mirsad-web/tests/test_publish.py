import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('mirsad_publish',Path(__file__).resolve().parents[1]/'deployment/publish.py')
publisher=importlib.util.module_from_spec(spec);spec.loader.exec_module(publisher)

def fixture(unsafe=False):
    t=io.BytesIO()
    with tarfile.open(fileobj=t,mode='w') as archive:
        for name,data in [('index.html',b'<h1>existing home</h1>'),('unrelated/sentinel.bin',b'preserve exactly'),('mirsad/old.txt',b'old version')]:
            info=tarfile.TarInfo(name);info.size=len(data);archive.addfile(info,io.BytesIO(data))
        if unsafe:
            info=tarfile.TarInfo('../outside.txt');info.size=1;archive.addfile(info,io.BytesIO(b'x'))
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:z.writestr('artifact.tar',t.getvalue())
    return out.getvalue()

class PublishTests(unittest.TestCase):
    def test_preserves_every_other_site_and_publishes_only_public_assets(self):
        with tempfile.TemporaryDirectory() as d:
            dest=Path(d)/'_site';publisher.restore(fixture(),dest);before=publisher.fingerprints(dest);publisher.overlay(dest)
            self.assertEqual(before,publisher.fingerprints(dest));self.assertEqual((dest/'unrelated/sentinel.bin').read_bytes(),b'preserve exactly')
            self.assertTrue((dest/'mirsad/index.html').is_file());self.assertTrue((dest/'mirsad/web-provider.js').is_file());self.assertFalse((dest/'mirsad/old.txt').exists());self.assertFalse((dest/'mirsad/tests').exists());self.assertFalse((dest/'mirsad/deployment').exists())
    def test_rejects_archive_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(RuntimeError):publisher.restore(fixture(True),Path(d)/'_site')
            self.assertFalse((Path(d)/'outside.txt').exists())

if __name__=='__main__':unittest.main()

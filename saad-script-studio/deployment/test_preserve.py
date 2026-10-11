import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('preserve', Path(__file__).with_name('preserve.py'))
preserve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preserve)

def fixture(files):
    payload = io.BytesIO()
    with tarfile.open(fileobj=payload, mode='w') as archive:
        for name, value in files.items():
            data = value.encode()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
    output = io.BytesIO()
    with zipfile.ZipFile(output, mode='w') as archive:
        archive.writestr('artifact.tar', payload.getvalue())
    return output.getvalue()

class PreservationTest(unittest.TestCase):
    def test_existing_sites_are_byte_identical_after_overlay(self):
        with tempfile.TemporaryDirectory() as folder:
            destination = Path(folder) / '_site'
            preserve.restore(fixture({'index.html':'<h1>Home</h1>','other-site/index.html':'<h1>Other site</h1>'}), destination)
            before = preserve.fingerprints(destination)
            preserve.overlay(destination)
            self.assertEqual(before, {k:v for k,v in preserve.fingerprints(destination).items() if k!='.nojekyll'})
            self.assertTrue((destination / preserve.PROJECT / 'assets/app.mjs').is_file())

    def test_unsafe_tar_path_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(RuntimeError):
                preserve.restore(fixture({'index.html':'ok','../escape':'bad'}), Path(folder) / '_site')

    def test_missing_baseline_index_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(RuntimeError):
                preserve.restore(fixture({'only-this-site/index.html':'ok'}), Path(folder) / '_site')

if __name__ == '__main__':
    unittest.main()

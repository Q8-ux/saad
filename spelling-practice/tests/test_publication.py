import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile
import shutil

spec=importlib.util.spec_from_file_location('publisher',Path(__file__).resolve().parents[1]/'deployment/publish.py')
publisher=importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

def envelope(entries):
    tar=io.BytesIO()
    with tarfile.open(fileobj=tar,mode='w') as out:
        for name,body in entries:
            data=body.encode();info=tarfile.TarInfo(name);info.size=len(data);out.addfile(info,io.BytesIO(data))
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as out:out.writestr('artifact.tar',tar.getvalue())
    return data.getvalue()

class PublicationTests(unittest.TestCase):
    def test_overlay_preserves_other_projects(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp)/'_site'
            publisher.restore(envelope([('index.html','root'),('sabeq-legal/index.html','unchanged'),('hamad-wedding/index.html','wedding'),('spelling-practice/old.txt','stale')]),dest)
            before=publisher.fingerprints(dest)
            publisher.overlay(dest,123)
            self.assertEqual(before,publisher.fingerprints(dest))
            self.assertFalse((dest/'spelling-practice/old.txt').exists())
            self.assertTrue((dest/'spelling-practice/core.js').is_file())
    def test_refuse_path_escape_and_incomplete_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError):publisher.restore(envelope([('../escape','bad')]),Path(tmp)/'a')
            with self.assertRaises(RuntimeError):publisher.restore(envelope([('project/index.html','incomplete')]),Path(tmp)/'b')
    def test_missing_picture_refuses_publication(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'source'
            shutil.copytree(publisher.SOURCE,source)
            (source/'pictures/air-v1.webp').unlink()
            previous=publisher.SOURCE
            try:
                publisher.SOURCE=source
                dest=Path(tmp)/'_site'
                publisher.restore(envelope([('index.html','root')]),dest)
                with self.assertRaisesRegex(RuntimeError,'package incomplete'):publisher.overlay(dest,123)
            finally:
                publisher.SOURCE=previous

if __name__=='__main__':unittest.main()

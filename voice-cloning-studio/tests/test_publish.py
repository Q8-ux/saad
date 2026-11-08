import importlib.util,io,tarfile,tempfile,unittest,zipfile
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'deployment'/'preserve.py'
spec=importlib.util.spec_from_file_location('publish',p);pub=importlib.util.module_from_spec(spec);spec.loader.exec_module(pub)
def fixture(files):
 b=io.BytesIO()
 with tarfile.open(fileobj=b,mode='w') as t:
  for name,data in files.items():
   raw=data.encode();m=tarfile.TarInfo(name);m.size=len(raw);t.addfile(m,io.BytesIO(raw))
 z=io.BytesIO()
 with zipfile.ZipFile(z,'w') as f:f.writestr('artifact.tar',b.getvalue())
 return z.getvalue()
class PublishTests(unittest.TestCase):
 def test_preserves_every_unrelated_file(self):
  with tempfile.TemporaryDirectory() as td:
   dest=Path(td)/'site';pub.restore(fixture({'index.html':'home','other-project/data.txt':'keep me','.nojekyll':''}),dest)
   before=pub.fingerprints(dest);pub.overlay(dest)
   self.assertEqual(before,pub.fingerprints(dest));self.assertEqual((dest/'other-project/data.txt').read_text(),'keep me');self.assertTrue((dest/pub.PROJECT/'audio.mjs').is_file());self.assertFalse((dest/pub.PROJECT/'server').exists())
 def test_refuses_archive_traversal(self):
  with tempfile.TemporaryDirectory() as td:
   with self.assertRaises(RuntimeError):pub.restore(fixture({'index.html':'x','../outside.txt':'bad'}),Path(td)/'site')
 def test_refuses_incomplete_base(self):
  with tempfile.TemporaryDirectory() as td:
   with self.assertRaises(RuntimeError):pub.restore(fixture({'other/a.txt':'x'}),Path(td)/'site')
if __name__=='__main__':unittest.main()

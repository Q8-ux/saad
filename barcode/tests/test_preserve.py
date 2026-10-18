import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('publisher',Path(__file__).resolve().parents[1]/'deployment/preserve.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Preservation(unittest.TestCase):
 def test_overlay_keeps_every_unrelated_file(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'index.html').write_text('existing root');(root/'.nojekyll').touch()
   other=root/'family-online-studio/assets';other.mkdir(parents=True);(other/'app.mjs').write_text('existing editor')
   target=root/'barcode';target.mkdir();(target/'old.txt').write_text('old version')
   before=m.fingerprints(root);m.overlay(root)
   self.assertEqual(before,m.fingerprints(root));self.assertTrue((target/'data/outside-story.script.json').is_file())
if __name__=='__main__':unittest.main()

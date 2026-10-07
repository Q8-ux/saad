import importlib.util
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('publish',Path(__file__).parents[1]/'publish.py')
publish=importlib.util.module_from_spec(spec)
spec.loader.exec_module(publish)


class PublicationChecks(unittest.TestCase):
    def test_launcher_preserves_wrapper_and_is_idempotent(self):
        html='<html><head></head><body><iframe title="game"></iframe></body></html>'
        result=publish.add_launcher(html)
        self.assertIn('<iframe title="game"></iframe>',result)
        self.assertEqual(result,publish.add_launcher(result))

    def test_protected_files_include_other_projects(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'saad-studio').mkdir()
            (root/'saad-studio/index.html').write_text('preserve')
            before=publish.protected(root)
            (root/'chess-design-studio').mkdir()
            (root/'chess-design-studio/index.html').write_text('new studio')
            self.assertEqual(before,publish.protected(root))
            (root/'saad-studio/index.html').write_text('changed')
            self.assertNotEqual(before,publish.protected(root))


if __name__=='__main__':
    unittest.main()

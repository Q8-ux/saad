import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("publish_legal", Path(__file__).with_name("publish-legal-platform.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)

class PublicationTests(unittest.TestCase):
    def fixture(self, folder):
        root, source = Path(folder) / "published", Path(folder) / "source"
        for name in publisher.FILES:
            for base in (root, source):
                (base / name).parent.mkdir(parents=True, exist_ok=True)
                (base / name).write_text("old" if base == root else "new")
        (root / "index.html").write_text("homepage")
        (root / "sabeq-legal-pro/index.html").write_text("full original platform")
        (root / "sabeq-legal-pro/demo/demo.css").write_text("existing styles")
        (root / "other").mkdir()
        (root / "other/site.js").write_text("unrelated app")
        (source / publisher.FILES[0]).write_text('<script src="./demo.js?v=2"></script><link href="./demo.css">')
        return root, source

    def test_changes_only_two_files_and_preserves_original_platform(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source = self.fixture(folder)
            before = publisher.manifest(root)
            self.assertEqual(publisher.overlay(root, source), len(before))
            self.assertEqual(publisher.manifest(root), before)
            for name in publisher.FILES:
                self.assertEqual((root / name).read_bytes(), (source / name).read_bytes())

    def test_refuses_missing_published_asset(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source = self.fixture(folder)
            (root / "sabeq-legal-pro/demo/demo.css").unlink()
            with self.assertRaisesRegex(RuntimeError, "asset missing"):
                publisher.overlay(root, source)

    def test_detects_unrelated_changes(self):
        with tempfile.TemporaryDirectory() as folder:
            root, source = self.fixture(folder)
            copy = publisher.shutil.copy2
            def tampered_copy(src, dst):
                copy(src, dst)
                (root / "other/site.js").write_text("changed")
            with patch.object(publisher.shutil, "copy2", side_effect=tampered_copy):
                with self.assertRaisesRegex(RuntimeError, "unrelated"):
                    publisher.overlay(root, source)

    def test_rejects_archive_traversal_and_symlinks(self):
        for name, kind in [("../outside", tarfile.REGTYPE), ("link", tarfile.SYMTYPE)]:
            archive = io.BytesIO()
            with tarfile.open(fileobj=archive, mode="w") as package:
                item = tarfile.TarInfo(name)
                item.type = kind
                package.addfile(item)
            with tempfile.TemporaryDirectory() as folder:
                with self.assertRaisesRegex(RuntimeError, "Unsafe"):
                    publisher.extract(archive.getvalue(), Path(folder))

if __name__ == "__main__":
    unittest.main()

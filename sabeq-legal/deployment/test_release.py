import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("release", Path(__file__).with_name("release.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class PublicationTests(unittest.TestCase):
    def test_protected_files_and_asset_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                root = Path("_site")
                (root / "other-project").mkdir(parents=True)
                (root / "other-project/index.html").write_text("previously published")
                (root / "sabeq-legal/assets").mkdir(parents=True)
                (root / "sabeq-legal/index.html").write_text('<script src="/saad/sabeq-legal/assets/client.js"></script>')
                (root / "sabeq-legal/assets/client.js").write_text("const ok = true;")
                (root / "sabeq-legal/release.json").write_text(json.dumps({"clientSource": "a"*40,"backendSource":"b"*40}))
                Path("_protected-pages.json").write_text(json.dumps(release.protected_manifest(root)))
                release.verify()
                (root / "other-project/index.html").write_text("unauthorized change")
                with self.assertRaisesRegex(RuntimeError, "unrelated"):
                    release.verify()
                (root / "other-project/index.html").write_text("previously published")
                (root / "sabeq-legal/assets/client.js").unlink()
                with self.assertRaisesRegex(RuntimeError, "asset missing"):
                    release.verify()
            finally:
                os.chdir(previous)

    def test_unsafe_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / "bad.tar"
            with tarfile.open(archive, "w") as tar:
                item = tarfile.TarInfo("../escape")
                item.size = 1
                tar.addfile(item, io.BytesIO(b"x"))
            with self.assertRaisesRegex(RuntimeError, "Unsafe"):
                release.extract_published(archive, Path(tmp)/"site")

    def test_scope_never_skips_changes_to_another_project(self):
        for paths, expected in [("sabeq-legal/index.html\n.github/workflows/deploy-pages.yml", "true"),
                                ("sabeq-legal/index.html\ntamweenat/app.js", "false"),
                                (".github/workflows/deploy-pages.yml", "false")]:
            with tempfile.NamedTemporaryFile() as out, patch.dict(os.environ, {"BEFORE_SHA":"a"*40,"GITHUB_SHA":"b"*40,"GITHUB_EVENT_NAME":"push","GITHUB_OUTPUT":out.name}), patch.object(release,"command",side_effect=["b"*40,paths]), patch.object(release.subprocess,"run"):
                release.scope()
                self.assertEqual(Path(out.name).read_text(),"sabeq_only="+expected+"\n")

if __name__ == "__main__":
    unittest.main()

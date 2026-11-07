import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from sync_native import PROJECT_ID, synchronize


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "source"
        self.target = Path(self.temp.name) / "target"
        (self.source / "research-source/lib").mkdir(parents=True)
        (self.target / ".openai").mkdir(parents=True)
        (self.target / ".openai/hosting.json").write_text(json.dumps({"project_id": PROJECT_ID}))
        (self.source / "research-source/lib/test.ts").write_text("synthetic updated source")
        self.manifest = {"project_id": PROJECT_ID, "files": {"lib/test.ts": {"sha256": hashlib.sha256(b"synthetic updated source").hexdigest(), "base_sha256": None}}}

    def sync(self, dry_run=False):
        (self.source / "sync-manifest.json").write_text(json.dumps(self.manifest))
        return synchronize(self.source, self.target, "a" * 40, dry_run)

    def test_apply_readback_and_no_change(self):
        self.assertEqual(self.sync(True)["changed"], ["lib/test.ts"])
        self.assertFalse((self.target / "lib/test.ts").exists())
        self.assertEqual(self.sync()["changed"], ["lib/test.ts"])
        self.assertEqual((self.target / "lib/test.ts").read_text(), "synthetic updated source")
        self.assertEqual(self.sync()["changed"], [])

    def test_independent_native_edit_is_preserved(self):
        self.sync()
        (self.target / "lib/test.ts").write_text("synthetic native change")
        with self.assertRaisesRegex(ValueError, "independently"):
            self.sync()
        self.assertEqual((self.target / "lib/test.ts").read_text(), "synthetic native change")

    def test_wrong_site_and_unsafe_paths_are_rejected(self):
        (self.target / ".openai/hosting.json").write_text(json.dumps({"project_id": "synthetic-other"}))
        with self.assertRaisesRegex(ValueError, "different Site"):
            self.sync()
        (self.target / ".openai/hosting.json").write_text(json.dumps({"project_id": PROJECT_ID}))
        self.manifest["files"] = {"../.env": {"sha256": "a" * 64}}
        with self.assertRaisesRegex(ValueError, "outside"):
            self.sync()

    def test_mismatched_manifest_never_writes(self):
        self.manifest["files"]["lib/test.ts"]["sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "manifest"):
            self.sync()
        self.assertFalse((self.target / "lib").exists())


if __name__ == "__main__":
    unittest.main()

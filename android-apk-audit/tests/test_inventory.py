"""Synthetic archives only: these checks do not validate a real Android build."""
import hashlib
import importlib.util
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
import warnings
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


inventory = load("inspect_apk")
doctor = load("doctor")


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def archive(self, extra=(), manifest=True):
        path = self.root / "synthetic.apk"
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(path, "w") as archive:
                if manifest:
                    archive.writestr("AndroidManifest.xml", b"\x03\x00fixture-not-a-real-manifest")
                for name, data in extra:
                    archive.writestr(name, data)
        return path

    def test_inventory_and_input_preserved(self):
        path = self.archive([("classes.dex", b"dex\n035\x00fixture"),
                             ("classes2.dex", b"dex\n039\x00fixture"),
                             ("lib/arm64-v8a/libflutter.so", b"fixture")])
        before = path.read_bytes()
        report = inventory.inspect(path)
        self.assertEqual(report["sha256"], hashlib.sha256(before).hexdigest())
        self.assertEqual(len(report["dex"]), 2)
        self.assertEqual(report["native_abis"], ["arm64-v8a"])
        self.assertEqual(report["framework_hints"], ["Flutter"])
        self.assertFalse(report["installable_verified"])
        self.assertFalse(report["signature_verified"])
        self.assertEqual(path.read_bytes(), before)

    def test_resource_split_can_have_no_dex(self):
        report = inventory.inspect(self.archive())
        self.assertEqual(report["dex"], [])
        self.assertEqual(report["status"], "structural_inventory_only")

    def test_missing_manifest_rejected(self):
        with self.assertRaises(ValueError):
            inventory.inspect(self.archive(manifest=False))

    def test_non_zip_cli_error(self):
        path = self.root / "video.mp4"
        path.write_bytes(b"not-a-zip")
        result = subprocess.run([sys.executable, str(ROOT / "scripts" / "inspect_apk.py"), str(path)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn('"status": "error"', result.stderr)

    def test_traversal_paths_blocked(self):
        for name in ("../outside", "/absolute", "C:/absolute", "..\\outside"):
            with self.subTest(name=name):
                report = inventory.inspect(self.archive([(name, b"fixture")]))
                self.assertEqual(report["status"], "blocked_archive_metadata")
                self.assertTrue(any(x["kind"] == "unsafe_path" for x in report["issues"]))
                self.assertFalse((self.root.parent / "outside").exists())

    def test_duplicate_names_blocked(self):
        report = inventory.inspect(self.archive([("classes.dex", b"a"), ("classes.dex", b"b")]))
        self.assertTrue(any(x["kind"] == "duplicate_name" for x in report["issues"]))

    def test_symlink_blocked(self):
        member = zipfile.ZipInfo("linked")
        member.create_system = 3
        member.external_attr = (stat.S_IFLNK | 0o777) << 16
        report = inventory.inspect(self.archive([(member, b"target")]))
        self.assertTrue(any(x["kind"] == "symlink" for x in report["issues"]))

    def test_unknown_dex_header_is_not_certified(self):
        report = inventory.inspect(self.archive([("classes.dex", b"garbage!")]))
        self.assertFalse(report["dex"][0]["standard_dex_magic"])
        self.assertFalse(report["signature_verified"])

    def test_jar_detection_does_not_execute_file(self):
        jar = self.root / "apktool-fixture.jar"
        jar.write_bytes(b"not-an-executable-jar")
        report = doctor.inspect([str(self.root)])
        self.assertIn(str(jar), report["tools"]["apktool"]["candidates"])
        self.assertFalse(report["executables_tested"])
        self.assertFalse(report["capabilities"]["runtime_analysis"]["device_verified"])


if __name__ == "__main__":
    unittest.main()

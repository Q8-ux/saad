import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("sabeq_verify", Path(__file__).with_name("verify.py"))
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
TAP = "# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0"


class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        subprocess.run(["git", "init", "-q", self.tmp.name], check=True)
        subprocess.run(["git", "-C", self.tmp.name, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-q", "--allow-empty", "-m", "synthetic"], check=True)

    def check(self, script=None, **kwargs):
        return {"id": "synthetic", "command": [sys.executable, "-c", script or ("print(" + repr(TAP) + ")")], "format": "tap", **kwargs}

    def test_real_engine_refuses_partial_completion(self):
        engine = v.Engine(self.root, "synthetic-partial", [{"id": "first"}, {"id": "second"}])
        self.assertFalse(engine.complete({"state": "running"}))
        receipt = v.check_result(self.check(), self.root)
        engine.record(0, receipt)
        self.assertFalse(engine.complete({"state": "running"}))
        engine.record(1, receipt)
        self.assertTrue(engine.complete({"state": "running"}))
        self.assertFalse((self.root / "unused-hermes").exists())

    def test_real_success_and_private_output(self):
        check = self.check("print('PRIVATE_CASE_TEXT_SECRET');print(" + repr(TAP) + ")")
        report = v.verify(self.root, "backend", [check])
        self.assertEqual(report["state"], "passed")
        for file in (self.root / ".verification").rglob("*.json"):
            text = file.read_text()
            self.assertNotIn("PRIVATE_CASE_TEXT_SECRET", text)
            self.assertNotIn(str(self.root), text)
        self.assertEqual(report["checks"][0]["counts"]["tests"], 1)

    def test_failed_run_cannot_reuse_old_success(self):
        first = v.verify(self.root, "backend", [self.check()])
        failed = v.verify(self.root, "backend", [self.check("print(" + repr(TAP) + ");raise SystemExit(1)")])
        self.assertEqual(first["state"], "passed")
        self.assertEqual(failed["state"], "failed")
        self.assertNotEqual(first["runId"], failed["runId"])
        self.assertEqual(json.loads((self.root / ".verification/latest.json").read_text())["state"], "failed")

    def test_zero_skipped_cancelled_and_todo_are_refused(self):
        for text in [TAP.replace("# tests 1", "# tests 0"), TAP.replace("# skipped 0", "# skipped 1"), TAP.replace("# cancelled 0", "# cancelled 1"), TAP.replace("# todo 0", "# todo 1"), "no tests executed"]:
            self.assertFalse(v.check_result(self.check("print(" + repr(text) + ")"), self.root)["passed"])

    def test_timeout_and_unavailable_process(self):
        result = v.check_result(self.check("import time;time.sleep(5)", timeout=0.1), self.root)
        self.assertEqual(result["reason"], "timeout")
        result = v.check_result({"id": "absent", "command": [str(self.root / "absent-command")], "format": "tap"}, self.root)
        self.assertFalse(result["passed"])

    def test_missing_engine_and_no_checks_fail_closed(self):
        def unavailable(*args):
            raise ImportError("private dependency error")
        result = v.verify(self.root, "backend", [self.check()], engine_factory=unavailable)
        self.assertEqual(result["state"], "failed")
        self.assertNotIn("private dependency error", json.dumps(result))
        self.assertEqual(v.verify(self.root, "backend", [])["state"], "failed")

    def test_changed_source_is_refused(self):
        (self.root / "source.txt").write_text("before")
        check = self.check("from pathlib import Path;Path('source.txt').write_text('changed');print(" + repr(TAP) + ")")
        result = v.verify(self.root, "backend", [check])
        self.assertEqual(result["reason"], "source_changed")

    def test_unittest_skip_is_not_a_pass(self):
        check = {"id": "unittest", "command": [sys.executable, "-c", "print('Ran 1 test in 0.1s\\n\\nOK (skipped=1)')"], "format": "unittest"}
        self.assertFalse(v.check_result(check, self.root)["passed"])

    def test_wrong_engine_version_or_origin_is_refused(self):
        class Package:
            version = "unexpected"
            def read_text(self, name):
                return '{"url":"https://example.invalid/wrong-source"}'
        package = Package()
        with patch.object(v.importlib.metadata, "distribution", return_value=package):
            with self.assertRaisesRegex(RuntimeError, "engine_version_mismatch"):
                v.pinned_engine()
            package.version = v.VERSION
            with self.assertRaisesRegex(RuntimeError, "engine_origin_mismatch"):
                v.pinned_engine()


if __name__ == "__main__":
    unittest.main()

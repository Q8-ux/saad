import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("library_scope", Path(__file__).with_name("library_scope.py"))
scope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scope)


class LibraryScopeTests(unittest.TestCase):
    def test_development_tools_do_not_ingest(self):
        self.assertFalse(scope.library_required(["legal-memo-platform/tools/internal-verification/verify.py", "legal-memo-platform/specs/006-internal-verification/tasks.md", "legal-memo-platform/.gitignore"]))

    def test_admin_source_migration_and_spec_kit_do_not_ingest(self):
        self.assertFalse(scope.library_required(["legal-memo-platform/native-admin-console/tests/public-service.test.mjs", "legal-memo-platform/specs/063-continuous-memo-admin/validation-live.md", "legal-memo-platform/tools/spec-kit/source.json", "legal-memo-platform/.agents/skills/speckit-plan/SKILL.md", "legal-memo-platform/.specify/init-options.json"]))

    def test_new_verifier_script_does_not_ingest(self):
        before = {"scripts": {"ingest:moj": "node ingest.js"}, "dependencies": {"example": "1"}}
        after = {"scripts": {"ingest:moj": "node ingest.js", "verify:internal": "python verify.py"}, "dependencies": {"example": "1"}}
        self.assertFalse(scope.library_required(["legal-memo-platform/package.json"], before, after))
        self.assertIn("verify:internal", after["scripts"])

    def test_runtime_change_keeps_ingestion(self):
        self.assertTrue(scope.library_required(["legal-memo-platform/legal-library.js"]))

    def test_dependency_change_keeps_ingestion(self):
        self.assertTrue(scope.library_required(["legal-memo-platform/package.json"], {"dependencies": {"example": "1"}}, {"dependencies": {"example": "2"}}))

    def test_ingestion_script_change_keeps_ingestion(self):
        self.assertTrue(scope.library_required(["legal-memo-platform/package.json"], {"scripts": {"ingest:moj": "old"}}, {"scripts": {"ingest:moj": "new"}}))

    def test_missing_manifest_keeps_ingestion(self):
        self.assertTrue(scope.library_required(["legal-memo-platform/package.json"]))


if __name__ == "__main__":
    unittest.main()

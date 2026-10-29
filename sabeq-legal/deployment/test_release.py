import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import shutil
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("release", Path(__file__).with_name("release.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class PublicationTests(unittest.TestCase):
    def test_legislation_module_is_present_ordered_and_local(self):
        source = Path(__file__).resolve().parents[2] / "sabeq-admin-preview"
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                root = Path("_site")
                (root / "sabeq-legal/assets").mkdir(parents=True)
                (root / "sabeq-legal/index.html").write_text('<script src="/saad/sabeq-legal/assets/client.js"></script>')
                (root / "sabeq-legal/assets/client.js").write_text("synthetic")
                (root / "sabeq-legal/release.json").write_text(json.dumps({"clientSource":"a"*40,"backendSource":"b"*40}))
                admin = root / "sabeq-admin-preview"
                shutil.copytree(source, admin)
                Path("_protected-pages.json").write_text(json.dumps(release.protected_manifest(root)))
                release.verify()
                (admin / "legislation.js").unlink()
                with self.assertRaisesRegex(RuntimeError, "referenced script missing"):
                    release.verify()
                (admin / "legislation.js").write_text("synthetic")
                for scripts in ('<script src="./legislation.js"></script><script src="./admin.js"></script>',
                                '<script src="./programmer.js"></script><script src="./admin.js"></script><script src="./legislation.js"></script>',
                                '<script src="./programmer.js"></script><script src="./legislation.js"></script><script src="./legislation.js"></script><script src="./admin.js"></script>',
                                '<script src="./programmer.js"></script><script src="https://other.example/legislation.js"></script><script src="./admin.js"></script>'):
                    (admin / "index.html").write_text(scripts)
                    with self.assertRaisesRegex(RuntimeError, "Unexpected admin script"):
                        release.verify()
            finally:
                os.chdir(previous)

    def test_current_admin_client_passes_the_real_publication_guard(self):
        source = Path(__file__).resolve().parents[2] / "sabeq-admin-preview"
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                root = Path("_site")
                (root / "sabeq-legal/assets").mkdir(parents=True)
                (root / "sabeq-legal/index.html").write_text('<script src="/saad/sabeq-legal/assets/client.js"></script>')
                (root / "sabeq-legal/assets/client.js").write_text("synthetic")
                (root / "sabeq-legal/release.json").write_text(json.dumps({"clientSource": "a"*40, "backendSource": "b"*40}))
                admin = root / "sabeq-admin-preview"
                shutil.copytree(source, admin)
                Path("_protected-pages.json").write_text(json.dumps(release.protected_manifest(root)))
                release.verify()
                original = (admin / "index.html").read_text()
                (admin / "programmer.js").unlink()
                with self.assertRaisesRegex(RuntimeError, "referenced script missing"):
                    release.verify()
                (admin / "programmer.js").write_text("synthetic")
                for scripts in ('<script src="./admin.js"></script><script src="./programmer.js"></script>',
                                '<script src="./programmer.js"></script><script src="./programmer.js"></script><script src="./admin.js"></script>',
                                '<script src="https://other.example/programmer.js"></script><script src="./admin.js"></script>',
                                '<script src="./programmer.js?redirect=other"></script><script src="./admin.js"></script>'):
                    (admin / "index.html").write_text(scripts)
                    with self.assertRaisesRegex(RuntimeError, "Unexpected admin script"):
                        release.verify()
                (admin / "index.html").write_text(original)
                release.verify()
            finally:
                os.chdir(previous)

    def test_control_module_is_required_local_unique_and_before_admin(self):
        source = Path(__file__).resolve().parents[2] / "sabeq-admin-preview"
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                root = Path("_site")
                (root / "sabeq-legal/assets").mkdir(parents=True)
                (root / "sabeq-legal/index.html").write_text('<script src="/saad/sabeq-legal/assets/client.js"></script>')
                (root / "sabeq-legal/assets/client.js").write_text("synthetic")
                (root / "sabeq-legal/release.json").write_text(json.dumps({"clientSource":"a"*40,"backendSource":"b"*40}))
                admin = root / "sabeq-admin-preview"
                shutil.copytree(source, admin)
                Path("_protected-pages.json").write_text(json.dumps(release.protected_manifest(root)))
                release.verify()
                original = (admin / "index.html").read_text()
                module = (admin / "control.js").read_bytes()
                (admin / "control.js").unlink()
                with self.assertRaisesRegex(RuntimeError, "referenced script missing"):
                    release.verify()
                (admin / "control.js").write_bytes(module)
                for replacement in ('https://other.example/control.js',
                                    './control.js?redirect=other'):
                    (admin / "index.html").write_text(original.replace('./control.js?v=independent-admin-14-owner-controls', replacement))
                    with self.assertRaisesRegex(RuntimeError, "Unexpected admin script"):
                        release.verify()
                for names in (["control","control","programmer","legislation","admin"],
                              ["programmer","legislation","admin","control"]):
                    (admin / "index.html").write_text(''.join('<script src="./'+name+'.js"></script>' for name in names))
                    with self.assertRaisesRegex(RuntimeError, "Unexpected admin script"):
                        release.verify()
                (admin / "index.html").write_text(original)
                release.verify()
            finally:
                os.chdir(previous)

    def test_current_index_keeps_main_bundle_first_and_motion_within_asset_scope(self):
        source = Path(__file__).resolve().parents[1]
        import re
        html = (source / "index.html").read_text()
        scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
        self.assertIn('/assets/index-', scripts[0])
        self.assertIn('/saad/sabeq-legal/assets/service-motion-v1.js', scripts)
        for script in scripts:
            self.assertTrue(script.startswith('/saad/sabeq-legal/assets/'))
            self.assertTrue((source / script.removeprefix('/saad/sabeq-legal/')).is_file())
        self.assertEqual((source / 'assets/service-motion-v1.js').read_text().strip(), "import '../motion/sabeq-entry.mjs';")
        self.assertTrue((source / 'motion/motion-core.mjs').is_file())

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
                                ("sabeq-admin-preview/admin.js\nsabeq-legal/deployment/release.py", "true"),
                                ("sabeq-admin-preview/admin.js\nlegal-memo-platform/gateway.js", "false"),
                                ("sabeq-legal/deployment/release.py\nlegal-memo-platform/tools/internal-verification/verify.py\nlegal-memo-platform/package.json\nlegal-memo-platform/.gitignore\nlegal-memo-platform/specs/006-internal-verification/spec.md\n.github/workflows/sabeq-internal-verification.yml", "true"),
                                ("sabeq-legal/index.html\nlegal-memo-platform/specs/063-continuous-memo-admin/validation-live.md\nsabeq-admin-preview/research-source/lib/public-service.ts\n.github/workflows/sabeq-client-admin-contract.yml", "true"),
                                ("sabeq-legal/index.html\nlegal-memo-platform/native-admin-console/app/admin-dashboard.tsx", "true"),
                                ("sabeq-legal/index.html\nlegal-memo-platform/tools/rea/audit.test.mjs\nlegal-memo-platform/tools/spec-kit/source.json\nlegal-memo-platform/.agents/skills/speckit-plan/SKILL.md", "true"),
                                ("sabeq-legal/index.html\nlegal-memo-platform/tools/unrelated/tool.py", "false"),
                                ("sabeq-legal/index.html\n.github/workflows/deploy-barcode-pages.yml", "false"),
                                ("tamweenat/app.js", "false"),
                                ("sabeq-legal/index.html\ntamweenat/app.js", "false"),
                                (".github/workflows/deploy-pages.yml", "false")]:
            with tempfile.NamedTemporaryFile() as out, patch.dict(os.environ, {"BEFORE_SHA":"a"*40,"GITHUB_SHA":"b"*40,"GITHUB_EVENT_NAME":"push","GITHUB_OUTPUT":out.name}), patch.object(release,"command",side_effect=["b"*40,paths]), patch.object(release.subprocess,"run"):
                release.scope()
                result = dict(line.split("=") for line in Path(out.name).read_text().splitlines())
                self.assertEqual(result["sabeq_only"], expected)
                self.assertEqual(result["sabeq_changed"], "false" if paths == "tamweenat/app.js" else "true")

    def test_manual_full_release_requires_sabeq_checks(self):
        with tempfile.NamedTemporaryFile() as out, patch.dict(os.environ, {"BEFORE_SHA":"", "GITHUB_SHA":"b"*40, "GITHUB_EVENT_NAME":"workflow_dispatch", "GITHUB_OUTPUT":out.name}), patch.object(release,"command",return_value="b"*40):
            release.scope()
            result = dict(line.split("=") for line in Path(out.name).read_text().splitlines())
            self.assertEqual(result, {"sabeq_only":"false", "sabeq_changed":"true"})

    def test_admin_assets_are_scoped_and_validated(self):
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                root = Path("_site")
                (root / "sabeq-legal/assets").mkdir(parents=True)
                (root / "sabeq-legal/index.html").write_text('<script src="/saad/sabeq-legal/assets/client.js"></script>')
                (root / "sabeq-legal/assets/client.js").write_text("safe")
                (root / "sabeq-legal/release.json").write_text(json.dumps({"clientSource":"a"*40,"backendSource":"b"*40}))
                admin = root / "sabeq-admin-preview"
                admin.mkdir()
                (admin / "admin-release.json").write_text(json.dumps({"backendSource":"c"*40}))
                for name in ("admin.js","admin.css","sabeq-logo.png","al-mohanad.ttf","al-mohanad-bold.ttf"):
                    (admin / name).write_bytes(b"synthetic")
                (admin / "index.html").write_text('<script src="./admin.js"></script>')
                Path("_protected-pages.json").write_text(json.dumps(release.protected_manifest(root)))
                release.verify()
                (admin / "index.html").write_text('<script src="./admin.js?v=independent-admin-2-login"></script>')
                release.verify()
                for unsafe in ("https://other.example/admin.js", "./admin.js?redirect=other", "./other.js?v=2"):
                    (admin / "index.html").write_text(f'<script src="{unsafe}"></script>')
                    with self.assertRaisesRegex(RuntimeError,"Unexpected admin script"):
                        release.verify()
                (admin / "index.html").write_text('<script src="./admin.js?v=independent-admin-2-login"></script>')
                (admin / "admin.css").write_text("@font-face{src:url('./fonts/ibm-plex-arabic-regular.woff2')}")
                with self.assertRaisesRegex(RuntimeError,"font or CSS asset missing"):
                    release.verify()
                (admin / "fonts").mkdir()
                (admin / "fonts/ibm-plex-arabic-regular.woff2").write_bytes(b"synthetic font")
                with self.assertRaisesRegex(RuntimeError,"font licence missing"):
                    release.verify()
                (admin / "fonts/OFL.txt").write_text("Synthetic licence fixture")
                release.verify()
                (admin / "admin.js").unlink()
                with self.assertRaisesRegex(RuntimeError,"Admin referenced asset missing"):
                    release.verify()
            finally:
                os.chdir(previous)

if __name__ == "__main__":
    unittest.main()

"""Exercise the installed upstream helpers at Sabeq's monorepo boundary."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[2]
SCRIPTS = PROJECT / '.specify/scripts/python'


class SpecKitIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='sabeq spec integration ')
        self.addCleanup(self.tmp.cleanup)
        self.shared = Path(self.tmp.name)
        (self.shared / '.git').mkdir()
        self.project = self.shared / 'legal-memo-platform'
        shutil.copytree(PROJECT / '.specify', self.project / '.specify',
                        ignore=shutil.ignore_patterns('__pycache__', 'feature.json'))
        self.other = self.shared / 'other-project.txt'
        self.other.write_text('preserve unrelated project', encoding='utf-8')
        self.env = {k: v for k, v in os.environ.items() if not k.startswith('SPECIFY_')}
        self.env.update(PYTHONDONTWRITEBYTECODE='1', SPECIFY_FEATURE_NO_PERSIST='1')

    def invoke(self, script, *args, cwd=None, code=0, **env):
        result = subprocess.run([sys.executable, str(SCRIPTS / script), *args],
                                cwd=cwd or self.project, env={**self.env, **env},
                                text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result

    def create_feature(self):
        result = self.invoke('create_new_feature.py', '--json', '--short-name',
                             'scope-check', '--number', '1', 'Check the Sabeq development scope')
        feature = Path(json.loads(result.stdout)['SPEC_FILE']).parent
        self.assertTrue(feature.is_relative_to(self.project / 'specs'))
        return feature

    def test_upstream_files_match_pinned_install_manifests(self):
        source = json.loads((PROJECT / 'tools/spec-kit/source.json').read_text())
        self.assertEqual(source['version'], '1.2.1')
        self.assertEqual(source['ref'], '9dca9bf42a031765ee5e5f2371137f2f26967e11')
        checked = set()
        for name in ('codex', 'speckit'):
            manifest = json.loads((PROJECT / f'.specify/integrations/{name}.manifest.json').read_text())
            self.assertEqual(manifest['version'], source['version'])
            for relative, expected in manifest['files'].items():
                file = PROJECT / relative
                self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), expected, relative)
                checked.add(relative)
        self.assertEqual(len(list((PROJECT / '.agents/skills').glob('speckit-*/SKILL.md'))), 10)
        self.assertGreaterEqual(len(checked), 25)

    def test_full_helper_flow_stays_inside_sabeq_and_preserves_existing_plan(self):
        feature = self.create_feature()
        selected = {'SPECIFY_FEATURE_DIRECTORY': str(feature)}
        self.invoke('setup_plan.py', '--json', **selected)
        plan = feature / 'plan.md'
        original = b'# Approved Sabeq plan\nKeep the existing source boundaries.\n'
        plan.write_bytes(original)
        self.invoke('setup_plan.py', '--json', **selected)
        self.assertEqual(plan.read_bytes(), original)
        (feature / 'tasks.md').write_text('- [ ] T001 Validate approved plan\n')
        self.invoke('setup_tasks.py', '--json', **selected)
        result = self.invoke('check_prerequisites.py', '--json', '--require-spec',
                             '--require-tasks', '--include-tasks', **selected)
        self.assertEqual(Path(json.loads(result.stdout)['FEATURE_DIR']), feature)
        self.assertIn('tasks.md', json.loads(result.stdout)['AVAILABLE_DOCS'])
        self.assertFalse((self.shared / '.specify').exists())
        self.assertFalse((self.shared / 'specs').exists())
        self.assertEqual(self.other.read_text(), 'preserve unrelated project')

    def test_explicit_sabeq_root_works_from_shared_repository_root(self):
        feature = self.create_feature()
        result = self.invoke('check_prerequisites.py', '--json', '--paths-only',
                             cwd=self.shared, SPECIFY_INIT_DIR=str(self.project),
                             SPECIFY_FEATURE_DIRECTORY=str(feature))
        paths = json.loads(result.stdout)
        self.assertEqual(Path(paths['REPO_ROOT']), self.project)
        self.assertEqual(Path(paths['FEATURE_DIR']), feature)
        self.assertFalse((self.shared / '.specify').exists())

    def test_missing_required_spec_plan_and_tasks_fail_explicitly(self):
        feature = self.project / 'specs/001-missing'
        feature.mkdir(parents=True)
        selected = {'SPECIFY_FEATURE_DIRECTORY': str(feature)}
        result = self.invoke('check_prerequisites.py', '--json', '--require-spec',
                             '--require-tasks', code=1, **selected)
        self.assertIn('ERROR', result.stderr)
        (feature / 'spec.md').write_text('# Synthetic specification\n')
        result = self.invoke('check_prerequisites.py', '--json', '--require-spec',
                             '--require-tasks', code=1, **selected)
        self.assertIn('plan.md', result.stderr)
        (feature / 'plan.md').write_text('# Synthetic plan\n')
        result = self.invoke('check_prerequisites.py', '--json', '--require-spec',
                             '--require-tasks', code=1, **selected)
        self.assertIn('tasks.md', result.stderr)

    def test_empty_plan_template_cannot_create_a_successful_plan(self):
        feature = self.create_feature()
        (self.project / '.specify/templates/plan-template.md').write_text('')
        result = self.invoke('setup_plan.py', '--json', code=1,
                             SPECIFY_FEATURE_DIRECTORY=str(feature))
        self.assertIn('empty', result.stderr)
        self.assertFalse((feature / 'plan.md').exists())


if __name__ == '__main__':
    unittest.main()

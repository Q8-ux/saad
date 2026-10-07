import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from PIL import Image

spec = importlib.util.spec_from_file_location('compositor', Path(__file__).parents[1] / 'compositor.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.profile = self.root / 'profile.json'
        self.profile.write_text(json.dumps({'project': 'test', 'requires_cutout': True}))
        self.image = self.root / 'source.png'
        Image.new('RGBA', (20, 20), (200, 40, 10, 255)).save(self.image)
        Image.new('L', (20, 20), 128).save(self.root / 'mask.png')
        self.job = self.root / 'job.json'
        self.data = {'size': [20, 20], 'layers': [dict(name='subject', role='subject', file='source.png', mask='mask.png')]}

    def tearDown(self):
        self.temp.cleanup()

    def run_job(self):
        self.job.write_text(json.dumps(self.data))
        return module.build(self.job, self.root / 'output', self.profile)

    def test_source_preserved_mask_and_exports(self):
        before = self.image.read_bytes()
        manifest = self.run_job()
        self.assertEqual(before, self.image.read_bytes())
        self.assertEqual(manifest['format'], 'com.compositor.project')
        layer = manifest['layers'][0]
        package = self.root / 'output/design.comp/images'
        with Image.open(package / layer['imageFile']) as saved:
            self.assertEqual(saved.getpixel((0, 0)), (200, 40, 10, 255))
        with Image.open(self.root / 'output/export.png') as exported:
            self.assertEqual(exported.getpixel((0, 0)), (200, 40, 10, 128))
        for suffix in ('jpg', 'webp', 'pdf'):
            self.assertGreater((self.root / ('output/export.' + suffix)).stat().st_size, 0)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.run_job()

    def test_no_opaque_portrait(self):
        del self.data['layers'][0]['mask']
        with self.assertRaisesRegex(ValueError, 'cutout'):
            self.run_job()
        self.assertFalse((self.root / 'output').exists())

    def test_no_distortion(self):
        self.data['layers'][0]['box'] = [0, 0, 10, 20]
        with self.assertRaisesRegex(ValueError, 'distort'):
            self.run_job()

    def test_invalid_mask(self):
        Image.new('L', (10, 10), 255).save(self.root / 'mask.png')
        with self.assertRaisesRegex(ValueError, 'Mask must match'):
            self.run_job()

    def test_canvas_budget(self):
        self.data['size'] = [10000, 10000]
        with self.assertRaisesRegex(ValueError, 'budget'):
            self.run_job()


if __name__ == '__main__':
    unittest.main()

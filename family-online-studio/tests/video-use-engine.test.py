import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

source = Path(__file__).resolve().parents[1] / "assets/video-use/engine/run_project.py"
spec = importlib.util.spec_from_file_location("video_use_local_runner", source)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class LocalProjectTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        (self.root / "sources").mkdir()
        (self.root / "sources/take.mp4").write_bytes(b"local-fixture")
        self.edl = {"sources": {"take": "sources/take.mp4"}, "ranges": [{"source": "take", "start": .2, "end": 2}], "delivery": {"aspect": "portrait", "quality": "720"}}
        self.probe = patch.object(runner, "probe", return_value={"format": {"duration": "5"}, "streams": [{"codec_type": "video", "width": 640, "height": 360}]})
        self.probe.start()
        self.addCleanup(self.probe.stop)

    def test_paths_and_remote_urls_are_rejected(self):
        for value in ["../outside.mp4", "https://example.com/private.mp4", "/etc/passwd"]:
            with self.subTest(value=value):
                self.edl["sources"]["take"] = value
                with self.assertRaises(ValueError):
                    runner.validate_edl(self.edl, self.root)

    def test_symlink_outside_sources_is_rejected(self):
        (self.root / "outside.mp4").write_bytes(b"private")
        (self.root / "sources/link.mp4").symlink_to(self.root / "outside.mp4")
        self.edl["sources"]["take"] = "sources/link.mp4"
        with self.assertRaises(ValueError):
            runner.validate_edl(self.edl, self.root)

    def test_invalid_times_and_changed_source_sizes_are_rejected(self):
        for start, end in [(True, 2), (.2, float("nan")), (0, 10), (2, 1)]:
            self.edl["ranges"] = [{"source": "take", "start": start, "end": end}]
            with self.assertRaises(ValueError):
                runner.validate_edl(self.edl, self.root)
        self.edl["ranges"] = [{"source": "take", "start": .2, "end": 2}]
        self.edl["source_files"] = [{"id": "take", "size": 999}]
        with self.assertRaises(ValueError):
            runner.validate_edl(self.edl, self.root)

    def test_external_filters_and_overlays_do_not_enter_the_render(self):
        self.edl.update({"grade": "movie=https://example.com", "overlays": [{"file": "/etc/passwd"}]})
        checked = runner.validate_edl(self.edl, self.root)
        self.assertEqual(checked["edl"]["grade"], "none")
        self.assertEqual(checked["edl"]["overlays"], [])
        self.assertEqual(runner.canvas_size(checked), (720, 1280))

if __name__ == "__main__":
    unittest.main()

"""Package only public runtime files; no research cache or authoring tools."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
FILES = ["index.html", "styles.css", "app.mjs", "engine.mjs", "search-worker.mjs", "sw.js", "manifest.webmanifest"]


def build(destination):
    destination = Path(destination)
    if destination.resolve() == ROOT.resolve():
        raise ValueError("Output cannot replace the source directory")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    for name in FILES:
        shutil.copy2(ROOT / name, destination / name)
    for directory in ["assets", "data"]:
        shutil.copytree(ROOT / directory, destination / directory)
    return destination


if __name__ == "__main__":
    build(ROOT / "dist")
    print("Static runtime ready: dist/")

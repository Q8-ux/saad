"""Install into this module only. No root, global npm, login or agent-skill edits."""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCHRIGHT_PIN = "e38ab7ab9448db6f093f72ee097c18ca9905e84c"


def run(args, cwd=ROOT):
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--core-only", action="store_true", help="Skip browser download/build")
    args = parser.parse_args()
    if sys.version_info < (3, 11) or os.name != "posix":
        parser.error("Use Python 3.11+ on Linux/macOS or WSL")
    venv = ROOT / ".venv"
    if not venv.exists():
        run([sys.executable, "-m", "venv", venv])
    py = venv / "bin/python"
    run([py, "-m", "pip", "install", "-r", ROOT / "requirements.lock"])
    run([py, "-m", "pip", "install", "--no-deps", "-e", ROOT])
    if not (ROOT / "config.local.json").exists() and not (ROOT / ".env").exists():
        run([venv / "bin/masar", "init"])
    if not args.core_only:
        if not shutil.which("git") or not shutil.which("npm"):
            parser.error("Browser setup needs git and Node.js 22+ with npm")
        version = subprocess.check_output(["node", "--version"], text=True).strip()
        if int(version.lstrip("v").split(".")[0]) < 22:
            parser.error("Node.js 22+ is required")
        target = ROOT / ".runtime/patchright-enhanced"
        target.parent.mkdir(exist_ok=True)
        if not target.exists():
            run(["git", "clone", "--no-checkout", "https://github.com/whaleyxbt/patchright-enhanced.git", target])
            run(["git", "checkout", "--detach", PATCHRIGHT_PIN], cwd=target)
        current = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=target, text=True).strip()
        if current != PATCHRIGHT_PIN:
            parser.error("Existing browser checkout differs from the audited pin; no files were overwritten")
        shutil.copyfile(ROOT / "locks/enhanced-package-lock.json", target / "package-lock.json")
        run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=target)
        # Upstream's complete build currently fails on an unrelated missing locale.
        # Compile only the manager and its imports actually used by this adapter.
        run(["npx", "--no-install", "tsc", "src/browser/browser-manager.ts", "--outDir", "dist",
             "--rootDir", ".", "--target", "ES2020", "--module", "commonjs",
             "--esModuleInterop", "--skipLibCheck"], cwd=target)
        run(["npx", "--no-install", "patchright", "install", "chromium"], cwd=target)
    run([venv / "bin/masar", "doctor"])
    print("Installed. Start with .venv/bin/masar serve; enable optional channels in config.local.json when ready.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print("Installation stopped at a failed dependency step. Installed components are retained. Check the error above; no channel is marked ready automatically.", file=sys.stderr)
        raise SystemExit(error.returncode)

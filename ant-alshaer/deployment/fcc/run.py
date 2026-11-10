#!/usr/bin/env python3
"""Run the pinned FCC package only from the original Poetry source checkout."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

PROJECT_ID = "appgprj_6a7f2e060d7c81918dabd7f8c64a441f"
PACKAGE = "free-claude-code==6.19.6"
PYTHON = "3.14.10"
COMMANDS = {
    "version": ["fcc-server", "--version"],
    "server": ["fcc-server"],
    "claude": ["fcc-claude"],
    "codex": ["fcc-codex"],
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=COMMANDS)
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    root = args.project_root.resolve()
    try:
        hosting = json.loads((root / ".openai/hosting.json").read_text())
    except (OSError, ValueError):
        parser.error("Use the full original Poetry source checkout, not research-source.")
    if hosting.get("project_id") != PROJECT_ID:
        parser.error("Refusing to use another project's source checkout.")
    if not (root / "package.json").is_file() or not (root / "worker/index.ts").is_file():
        parser.error("The Poetry source checkout is incomplete.")
    uv = shutil.which("uv")
    if not uv:
        parser.error("Install uv from https://github.com/astral-sh/uv first.")
    agent = {"claude": "claude", "codex": "codex"}.get(args.command)
    if agent and not shutil.which(agent):
        parser.error(f"Install {agent} first; no coding agent is installed automatically.")
    env = os.environ.copy()
    env.setdefault("UV_CACHE_DIR", str(root / ".sites-runtime/fcc/uv-cache"))
    env.setdefault("UV_PYTHON_INSTALL_DIR", str(root / ".sites-runtime/fcc/python"))
    command = [uv, "run", "--no-project", "--python", PYTHON, "--with", PACKAGE, *COMMANDS[args.command]]
    try:
        return subprocess.run(command, cwd=root, env=env, check=False).returncode
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())


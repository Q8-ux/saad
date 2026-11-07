"""Apply the reviewed GitHub source overlay to the existing Poetry Site checkout."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath

PROJECT_ID = "appgprj_6a7f2e060d7c81918dabd7f8c64a441f"
PREFIXES = ("app/", "components/", "lib/", "worker/", "tests/", "docs/")
FILES = {"vite.config.ts", "vite.cloudflare.config.ts"}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def safe_path(root, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or ".." in path.parts or "\\" in relative or not (relative.startswith(PREFIXES) or relative in FILES):
        raise ValueError("Source path is outside the reviewed code overlay")
    target = root.joinpath(*path.parts)
    if any(part.is_symlink() for part in [target, *target.parents]):
        raise ValueError("Symlink paths are not allowed")
    return target


def synchronize(source, target, commit, dry_run=False):
    if not commit or any(char not in "0123456789abcdef" for char in commit) or len(commit) != 40:
        raise ValueError("An exact GitHub commit is required")
    manifest = json.loads((source / "sync-manifest.json").read_text())
    hosting = json.loads((target / ".openai/hosting.json").read_text())
    if manifest.get("project_id") != PROJECT_ID or hosting.get("project_id") != PROJECT_ID:
        raise ValueError("Refusing to update a different Site")
    state_path = target / ".openai/github-sync.json"
    previous = json.loads(state_path.read_text()) if state_path.exists() else {"files": {}}
    planned = []
    for relative, expected in manifest["files"].items():
        incoming = safe_path(source / "research-source", relative)
        destination = safe_path(target, relative)
        incoming_hash = digest(incoming)
        if not incoming_hash or incoming_hash != expected["sha256"]:
            raise ValueError("GitHub overlay does not match its manifest")
        existing_hash = digest(destination)
        if existing_hash not in {None, incoming_hash, previous["files"].get(relative), expected.get("base_sha256")}:
            raise ValueError("Native source changed independently; refusing to overwrite it")
        if existing_hash != incoming_hash:
            planned.append((relative, incoming, destination))
    # Validate every file before changing any file.
    if not dry_run:
        for _, incoming, destination in planned:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(incoming.read_bytes())
        if planned or not state_path.exists():
            state = {"repository": "Q8-ux/saad", "source_path": "ant-alshaer", "commit": commit, "project_id": PROJECT_ID,
                     "files": {**previous["files"], **{name: item["sha256"] for name, item in manifest["files"].items()}}}
            temporary = state_path.with_suffix(".tmp")
            temporary.write_text(json.dumps(state, indent=2) + "\n")
            temporary.replace(state_path)
    return {"changed": [name for name, _, _ in planned], "dry_run": dry_run, "project_id": PROJECT_ID}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--dry-run", action="store_true")
    arguments = parser.parse_args()
    print(json.dumps(synchronize(arguments.source.resolve(), arguments.target.resolve(), arguments.commit, arguments.dry_run)))

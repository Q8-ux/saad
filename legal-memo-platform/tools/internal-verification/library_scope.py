"""Keep development-only changes out of the legacy library ingestion job."""
import copy
import json
import os
import re
import subprocess


def library_required(paths, before_package=None, after_package=None):
    for path in paths:
        if path.startswith(("legal-memo-platform/tools/rea/", "legal-memo-platform/tools/internal-verification/", "legal-memo-platform/specs/006-internal-verification/", "legal-memo-platform/specs/063-continuous-memo-admin/", "legal-memo-platform/specs/001-spec-kit-adoption/", "legal-memo-platform/tools/spec-kit/", "legal-memo-platform/.agents/", "legal-memo-platform/.specify/", "legal-memo-platform/native-admin-console/")) or path in {"legal-memo-platform/README.md", "legal-memo-platform/.gitignore", "legal-memo-platform/AGENTS.md"}:
            continue
        if path == "legal-memo-platform/package.json" and isinstance(before_package, dict) and isinstance(after_package, dict):
            before, after = copy.deepcopy(before_package), copy.deepcopy(after_package)
            before.get("scripts", {}).pop("verify:internal", None)
            after.get("scripts", {}).pop("verify:internal", None)
            if before == after:
                continue
        return True
    return False


if __name__ == "__main__":
    required = True
    before = os.environ.get("BEFORE_SHA", "")
    current = os.environ.get("GITHUB_SHA", "")
    if os.environ.get("GITHUB_EVENT_NAME") == "push" and re.fullmatch(r"[0-9a-f]{40}", before) and re.fullmatch(r"[0-9a-f]{40}", current):
        try:
            def git(*args):
                return subprocess.check_output(["git", *args], stderr=subprocess.DEVNULL).decode()
            paths = git("diff", "--name-only", before, current, "--", "legal-memo-platform").splitlines()
            old = new = None
            if "legal-memo-platform/package.json" in paths:
                old = json.loads(git("show", before + ":legal-memo-platform/package.json"))
                new = json.loads(git("show", current + ":legal-memo-platform/package.json"))
            required = library_required(paths, old, new)
        except (OSError, ValueError, subprocess.SubprocessError, AttributeError):
            required = True
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write("library=" + str(required).lower() + "\n")

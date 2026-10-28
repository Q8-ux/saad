"""Run Sabeq's fixed release checks; retain metadata, never test output."""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
from urllib.parse import unquote, urlparse
import uuid

PIN = "cfb9625147ba20b35f59acbbe804afcb720013d1"
VERSION = "4.0.2"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def packed(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def pinned_engine():
    package = importlib.metadata.distribution("oh-my-hermes")
    if package.version != VERSION:
        raise RuntimeError("engine_version_mismatch")
    origin = json.loads(package.read_text("direct_url.json") or "{}")
    if origin.get("vcs_info", {}).get("commit_id") == PIN:
        return
    # A local wheel is accepted only from the same clean, pinned source checkout.
    url = urlparse(origin.get("url", ""))
    if url.scheme == "file":
        source = Path(unquote(url.path))
        revision = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
        clean = subprocess.run(["git", "-C", str(source), "diff", "--quiet", "HEAD"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
        if revision == PIN and clean:
            return
    raise RuntimeError("engine_origin_mismatch")


class Engine:
    def __init__(self, directory, run_id, checks):
        pinned_engine()
        from omh.paths import OmhPaths
        from omh.goal_ledger import create_goal_ledger, record_goal_checkpoint, complete_goal_ledger
        self.paths = OmhPaths(omh_home=directory / "engine", hermes_home=directory / "unused-hermes")
        self.run_id = run_id
        self.checkpoint = record_goal_checkpoint
        self.finish = complete_goal_ledger
        goal = create_goal_ledger(self.paths, "Verify Sabeq release checks", [c["id"] for c in checks], goal_id=run_id)
        self.criteria = [c["id"] for c in goal["acceptance_criteria"]]

    def record(self, index, receipt):
        ref = "python tools/internal-verification/verify.py suite=" + receipt["id"] + "; receipt-sha256=" + digest(packed(receipt))
        self.checkpoint(self.paths, self.run_id, "Release check observed", criteria_refs=[self.criteria[index]], status="done" if receipt["passed"] else "failed", evidence_refs=[ref])

    def complete(self, report):
        ref = "python tools/internal-verification/verify.py; report-sha256=" + digest(packed(report))
        return self.finish(self.paths, self.run_id, evidence_refs=[ref])["completed"]


def source_fingerprint(root, profile):
    scopes = ["."] if profile != "publication" else ["sabeq-legal", "sabeq-admin-preview", "legal-memo-platform", ".github/workflows/deploy-pages.yml", ".github/workflows/sabeq-internal-verification.yml"]
    names = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", *scopes], cwd=root, stderr=subprocess.DEVNULL).decode().split("\0")
    result = hashlib.sha256()
    for name in sorted(set(names) - {""}):
        if any(part in {".verification", "__pycache__"} for part in Path(name).parts):
            continue
        path = root / name
        result.update(name.encode() + b"\0")
        if path.is_symlink():
            result.update(os.readlink(path).encode())
        elif path.is_file():
            with path.open("rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    result.update(block)
        else:
            result.update(b"absent")
    return result.hexdigest()


def check_result(check, root):
    started = time.monotonic()
    output, code, reason = b"", 127, "process_unavailable"
    try:
        process = subprocess.Popen(check["command"], cwd=root, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=os.name == "posix")
        try:
            output, _ = process.communicate(timeout=check.get("timeout", 180))
            code, reason = process.returncode, "test_failure"
        except subprocess.TimeoutExpired:
            if os.name == "posix":
                os.killpg(process.pid, signal.SIGKILL)
            else:
                process.kill()
            output, _ = process.communicate()
            code, reason = 124, "timeout"
    except OSError:
        pass
    text = output.decode(errors="replace")
    counts = {}
    if check["format"] == "tap":
        for key in ("tests", "pass", "fail", "cancelled", "skipped", "todo"):
            match = re.search(r"^# " + key + r" (\d+)\s*$", text, re.M)
            counts[key] = int(match[1]) if match else None
        passed = code == 0 and all(v is not None for v in counts.values()) and counts["tests"] > 0 and counts["pass"] == counts["tests"] and all(counts[k] == 0 for k in ("fail", "cancelled", "skipped", "todo"))
    else:
        match = re.search(r"^Ran (\d+) tests? in ", text, re.M)
        counts = {"tests": int(match[1]) if match else 0}
        passed = code == 0 and counts["tests"] > 0 and re.search(r"^OK\s*$", text, re.M) is not None
    if passed:
        reason = "passed"
    elif code == 0:
        reason = "incomplete_checks"
    return {"id": check["id"], "exitCode": code, "durationMs": round((time.monotonic() - started) * 1000), "counts": counts, "outputSha256": digest(output), "passed": passed, "reason": reason}


def check_plan(profile):
    def node(name, files):
        return {"id": name, "command": ["node", "--test", "--test-reporter=tap", *files], "format": "tap"}
    if profile == "site":
        return [
            node("sources", ["tests/bound-legislation.test.mjs", "tests/reviewed-judgments.test.mjs", "tests/legislation-workbench.test.mjs", "tests/legal-source-coverage.test.mjs"]),
            node("memo", ["tests/indirect-intake.test.mjs", "tests/procedural-position.test.mjs", "tests/memo-journey.test.mjs", "tests/payment-dialog.test.mjs", "tests/agent-pipeline.test.mjs", "tests/case-reasoning.test.mjs", "tests/inline-authorities.test.mjs", "tests/connected-intake.test.mjs", "tests/memo-responsive-generation.test.mjs"]),
            node("access", ["tests/management.test.mjs", "tests/analytics-consent.test.mjs", "tests/programmer-client.test.mjs"]),
        ]
    if profile == "backend":
        return [node("api-and-sources", ["test/api-policy.test.js", "test/legal-library.test.js"])]
    return [
        {"id": "publication", "command": [sys.executable, "sabeq-legal/deployment/test_release.py"], "format": "unittest"},
        node("presentation", ["sabeq-legal/motion/motion.test.mjs"]),
    ]


def verify(root, profile, checks=None, engine_factory=Engine):
    root = Path(root).resolve()
    checks = check_plan(profile) if checks is None else checks
    run_id = "release-" + uuid.uuid4().hex
    state_root = root / "legal-memo-platform" if profile == "publication" else root
    directory = state_root / ".verification" / "runs" / run_id
    directory.mkdir(parents=True)
    report = {"schemaVersion": 1, "runId": run_id, "profile": profile, "engineVersion": VERSION, "engineCommit": PIN, "state": "running", "checks": []}
    latest = state_root / ".verification/latest.json"

    def save():
        body = packed(report) + b"\n"
        (directory / "report.json").write_bytes(body)
        temporary = latest.with_name(run_id + ".tmp")
        temporary.write_bytes(body)
        temporary.replace(latest)

    save()
    try:
        if not checks:
            raise RuntimeError("no_checks")
        before = source_fingerprint(root, profile)
        report["sourceFingerprint"] = before
        report["sourceRevision"] = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
        engine = engine_factory(directory, run_id, checks)
        for index, check in enumerate(checks):
            receipt = check_result(check, root)
            report["checks"].append(receipt)
            engine.record(index, receipt)
            save()
            if not receipt["passed"]:
                raise RuntimeError("check_failed")
        if source_fingerprint(root, profile) != before:
            raise RuntimeError("source_changed")
        if not engine.complete(report):
            raise RuntimeError("completion_refused")
        report["state"] = "passed"
    except Exception as error:
        report["state"] = "failed"
        known = {"no_checks", "check_failed", "source_changed", "completion_refused", "engine_version_mismatch", "engine_origin_mismatch"}
        report["reason"] = str(error) if str(error) in known else "verification_unavailable"
    save()
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Internal Sabeq release checks")
    parser.add_argument("--profile", choices=["site", "backend", "publication"], required=True)
    args = parser.parse_args()
    result = verify(Path.cwd(), args.profile)
    for item in result["checks"]:
        print(item["id"] + ": " + item["reason"] + " " + json.dumps(item["counts"], separators=(",", ":")))
    print("Internal release checks: " + result["state"] + (" (" + result["reason"] + ")" if "reason" in result else ""))
    sys.exit(0 if result["state"] == "passed" else 1)

#!/usr/bin/env python3
"""Find tools without installing them, executing them, or contacting a device."""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys

TOOLS = ("java", "javac", "adb", "aapt", "aapt2", "zipalign", "apksigner",
         "apktool", "jadx", "smali", "baksmali", "droidasc", "ddc", "androguard",
         "frida", "frida-ps")
JARS = {"apktool": "apktool*.jar", "jadx": "jadx*.jar", "smali": "smali*.jar",
        "baksmali": "baksmali*.jar", "uber-apk-signer": "uber-apk-signer*.jar"}


def inspect(tool_dirs):
    roots = [Path(p).expanduser() for p in tool_dirs]
    for key in ("ANDROID_SDK_ROOT", "ANDROID_HOME"):
        if os.environ.get(key):
            roots.append(Path(os.environ[key]).expanduser())
    roots += [Path("/opt/android-sdk"), Path("/usr/lib/android-sdk"),
              Path.home() / "Android" / "Sdk"]
    directories = set()
    for root in roots:
        if root.is_dir():
            directories.update((root, root / "bin", root / "platform-tools"))
            directories.update(root.glob("build-tools/*"))
    found = {name: {"executable": shutil.which(name), "candidates": []} for name in TOOLS}
    found["uber-apk-signer"] = {"executable": shutil.which("uber-apk-signer"), "candidates": []}
    for folder in sorted(directories):
        if not folder.is_dir():
            continue
        for name, entry in found.items():
            for suffix in ("", ".exe", ".bat", ".cmd"):
                candidate = folder / (name + suffix)
                if candidate.is_file():
                    entry["candidates"].append(str(candidate))
            for candidate in folder.glob(JARS.get(name, "__no_such_jar__")):
                if candidate.is_file():
                    entry["candidates"].append(str(candidate))
            entry["candidates"] = sorted(set(entry["candidates"]))
    known = lambda n: bool(found[n]["executable"] or found[n]["candidates"])
    java = known("java")
    groups = {
        "archive_inventory": {"state": "available", "requirements": "bundled Python script"},
        "code_analysis": {"tool_paths_found": known("droidasc") or known("ddc") or (java and known("jadx"))},
        "decode_rebuild": {"tool_paths_found": java and known("apktool")},
        "align_sign_verify": {"tool_paths_found": java and ((known("zipalign") and known("apksigner")) or known("uber-apk-signer"))},
        "runtime_analysis": {"tool_paths_found": known("adb") and known("frida"), "device_verified": False},
    }
    return {"schema_version": 1, "python_version": sys.version.split()[0], "tools": found,
            "capabilities": groups, "executables_tested": False,
            "note": "Paths and JAR candidates only. Versions, devices and tool behavior remain unverified."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tool-dir", action="append", default=[], help="Extra tool or SDK directory; repeat as needed")
    args = parser.parse_args()
    print(json.dumps(inspect(args.tool_dir), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

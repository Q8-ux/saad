#!/usr/bin/env python3
"""Inventory an APK without extraction, app execution or network access."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import zipfile

MAX_ENTRIES = 50000
MAX_FILE_BYTES = 2 * 1024 ** 3
MAX_EXPANDED_BYTES = 4 * 1024 ** 3


def inspect(path):
    path = Path(path)
    size = path.stat().st_size
    if size > MAX_FILE_BYTES:
        raise ValueError("Input exceeds the 2 GiB inventory limit")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) > MAX_ENTRIES:
            raise ValueError("Archive exceeds the entry-count limit")
        names = [member.filename for member in members]
        if "AndroidManifest.xml" not in names:
            raise ValueError("No root AndroidManifest.xml: not a supported APK archive")
        issues = []
        total = sum(member.file_size for member in members)
        if total > MAX_EXPANDED_BYTES:
            issues.append({"kind": "expanded_size_limit", "bytes": total})
        for name, count in Counter(names).items():
            if count > 1:
                issues.append({"kind": "duplicate_name", "entry": name, "count": count})
        for member in members:
            name = member.filename.replace("\\", "/")
            if name.startswith("/") or ".." in PurePosixPath(name).parts or re.match(r"^[A-Za-z]:", name):
                issues.append({"kind": "unsafe_path", "entry": member.filename})
            if stat.S_ISLNK(member.external_attr >> 16):
                issues.append({"kind": "symlink", "entry": member.filename})
            if member.flag_bits & 1:
                issues.append({"kind": "encrypted_entry", "entry": member.filename})
            if member.file_size > 8 * 1024 ** 2 and member.file_size > max(member.compress_size, 1) * 500:
                issues.append({"kind": "compression_ratio_limit", "entry": member.filename})
        if issues:
            return {"schema_version": 1, "file": path.name, "sha256": digest.hexdigest(),
                    "status": "blocked_archive_metadata", "entry_count": len(members),
                    "issues": issues, "signature_verified": False}
        dex = []
        for member in members:
            if re.fullmatch(r"classes(?:[0-9]+)?\.dex", member.filename):
                with archive.open(member) as stream:
                    header = stream.read(8)
                looks_dex = bool(re.fullmatch(rb"dex\n[0-9]{3}\x00", header))
                dex.append({"entry": member.filename, "size_bytes": member.file_size,
                            "standard_dex_magic": looks_dex, "header_hex": header.hex()})
        frameworks = []
        if any(name.endswith("/libflutter.so") for name in names):
            frameworks.append("Flutter")
        if any(name.endswith("/libunity.so") for name in names):
            frameworks.append("Unity")
        if "assets/index.android.bundle" in names:
            frameworks.append("React Native")
        with archive.open("AndroidManifest.xml") as stream:
            manifest_start = stream.read(64)
        manifest_encoding = "binary_xml" if manifest_start[:2] == b"\x03\x00" else "not_decoded"
        if manifest_start.lstrip().startswith(b"<"):
            manifest_encoding = "text_xml_not_parsed"
        abis = sorted({name.split("/")[1] for name in names
                       if name.startswith("lib/") and name.endswith(".so") and len(name.split("/")) == 3})
        return {"schema_version": 1, "file": path.name, "size_bytes": size,
                "sha256": digest.hexdigest(), "status": "structural_inventory_only",
                "entry_count": len(members), "declared_expanded_bytes": total,
                "manifest_encoding": manifest_encoding, "dex": dex, "native_abis": abis,
                "framework_hints": frameworks, "resources_arsc_present": "resources.arsc" in names,
                "v1_signature_metadata_present": any(name.upper().startswith("META-INF/") and
                    name.upper().endswith((".RSA", ".DSA", ".EC")) for name in names),
                "signature_verified": False, "installable_verified": False,
                "limits": ["No binary XML decoding or permissions analysis", "No DEX checksum or bytecode validation",
                           "No signature verification, malware verdict, installation or runtime test",
                           "Framework names are file-based hints; no hint does not identify an app as native"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    args = parser.parse_args()
    try:
        result = inspect(args.apk)
    except (OSError, ValueError, RuntimeError, NotImplementedError, zipfile.BadZipFile, EOFError) as exc:
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 3 if result["status"] == "blocked_archive_metadata" else 0


if __name__ == "__main__":
    sys.exit(main())

"""Build a reproducible, source-linked reader from Awqaf's public Word editions.

Requires antiword (not distributed with the site). PDF scans remain the authority;
paragraph IDs are digital locations, never invented printed page numbers.
"""
import argparse
import concurrent.futures
import hashlib
import gzip
import json
import os
from pathlib import Path
import re
import subprocess
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MARKS = re.compile(r"[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]")


def normalize(text):
    return MARKS.sub("", unicodedata.normalize("NFKC", text)).translate(
        str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي"}))


def shard(term):
    h = 2166136261
    for ch in term:
        h = ((h ^ ord(ch)) * 16777619) & 0xffffffff
    return h % 32


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")))


def index_key(term):
    if len(term) > 5 and re.match(r"^(وال|بال|فال|كال)", term):
        return term[3:]
    if len(term) > 4 and term.startswith("لل"):
        return term[2:]
    if len(term) > 4 and term.startswith("ال"):
        return term[2:]
    return term


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--links", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--antiword", required=True)
    parser.add_argument("--resources", required=True)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    links = json.loads(args.links.read_text())
    docs = [x for x in links if x.endswith(".doc")]
    pdfs = [x for x in links if x.endswith(".pdf")]
    assert len(docs) == len(pdfs) == 45
    expected = json.loads((ROOT / 'official-sources.json').read_text())['volumes']
    (ROOT / "data/volumes").mkdir(parents=True, exist_ok=True)

    def one(i):
        path = args.cache / f"volume-{i:02}.doc"
        if not path.exists():
            for attempt in range(3):
                try:
                    req = urllib.request.Request(docs[i-1], headers={"User-Agent": "KuwaitFiqhReader/1.0"})
                    with urllib.request.urlopen(req, timeout=50) as response:
                        body = response.read()
                    if not body.startswith(bytes.fromhex("d0cf11e0")):
                        raise ValueError("Not a Word document")
                    path.write_bytes(body)
                    break
                except Exception:
                    if attempt == 2:
                        raise
        env = dict(os.environ, ANTIWORDHOME=args.resources)
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected[i-1]['sha256']:
            raise ValueError(f'Official source changed for volume {i}; review before rebuilding')
        text = subprocess.check_output([args.antiword, "-m", "UTF-8.txt", "-w", "0", str(path)], env=env).decode("utf-8")
        raw_lines = text.splitlines()
        paragraphs = []
        heading = "مقدمة المجلد" if i == 1 else f"المجلد {i}"
        headings = []
        for raw in raw_lines:
            line = raw.strip()
            if not line:
                continue
            arabic = re.findall(r"[\u0621-\u064a]", line)
            if len(arabic) < 2:
                # The original doc uses some unsupported symbol-font ornaments.
                # Never turn them into invented Quran or words.
                if len(line) > 20:
                    paragraphs.append({"t": "[رموز لا تظهر في الاستخراج النصي؛ راجع النسخة المصورة]", "h": heading, "q": True})
                continue
            plain = normalize(line)
            is_heading = (len(plain) < 100 and len(plain.split()) < 13
                          and not re.match(r"^[\d٠-٩]+\s*[-–]", plain)
                          and (plain.endswith(":") or len(plain.split()) < 5)
                          and not re.search(r"[،؛.؟]", plain))
            if is_heading:
                heading = line.rstrip(":")
                headings.append({"id": len(paragraphs), "t": heading})
            quality = "((" in line or bool(re.search(r"[\ue000-\uf8ff\ufffd]", line))
            paragraphs.append({"t": line, "h": heading, **({"q": True} if quality else {})})
        assert len(paragraphs) > 150, f"Incomplete extraction in volume {i}"
        assert len(paragraphs) == expected[i-1]['paragraphs'], f'Extraction changed in volume {i}'
        data = {"id": i, "sourceDoc": docs[i-1], "sourcePdf": pdfs[i-1], "paragraphs": paragraphs}
        for start in range(0, len(paragraphs), 128):
            dump(ROOT / f"data/volumes/{i:02}/{start // 128:03}.json",
                 {"id": i, "start": start, "paragraphs": paragraphs[start:start + 128]})
        compressed = ROOT / f"data/search/{i:02}.json.gz"
        compressed.parent.mkdir(parents=True, exist_ok=True)
        compressed.write_bytes(gzip.compress(json.dumps([normalize(p["t"]) for p in paragraphs], ensure_ascii=False, separators=(",", ":")).encode(), mtime=0))
        meta = {"id": i, "doc": docs[i-1], "pdf": pdfs[i-1], "paragraphs": len(paragraphs),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "flagged": sum(bool(p.get("q")) for p in paragraphs), "headings": headings}
        print(f"Volume {i:02}: {len(paragraphs)} paragraphs", flush=True)
        return meta, data

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = sorted(pool.map(one, range(1, 46)), key=lambda item: item[0]["id"])
    index = [{} for _ in range(32)]
    for meta, data in results:
        for pid, paragraph in enumerate(data["paragraphs"]):
            for token in set(index_key(t) for t in re.findall(r"[\u0621-\u064a]{2,}", normalize(paragraph["t"]))):
                index[shard(token)].setdefault(token, []).append(meta["id"] * 100000 + pid)
    for i, terms in enumerate(index):
        dump(ROOT / f"data/index/{i:02}.json", terms)
    volumes = [item[0] for item in results]
    dump(ROOT / "data/catalog.json", {"version": 1, "source": "https://bohoth.awqaf.gov.kw/ar/الموسوعة%20الفقهية",
         "retrieved": "2026-11-01", "edition": "ملفات Word الرسمية؛ مواضع رقمية دون ادعاء مطابقة صفحات المطبوع",
         "volumes": volumes, "paragraphs": sum(x["paragraphs"] for x in volumes),
         "terms": sum(len(x) for x in index), "shards": 32, "chunkSize": 128})
    print("Complete:", len(volumes), "volumes;", sum(x["paragraphs"] for x in volumes), "paragraphs", flush=True)


if __name__ == "__main__":
    main()

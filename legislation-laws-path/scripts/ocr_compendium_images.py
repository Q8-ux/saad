#!/usr/bin/env python3
"""Local Tesseract OCR for large images retained by import_compendium.py.

Language models must already exist locally. This script makes no network calls.
OCR remains separate from the original digital text and is marked needs_review.
"""
import argparse
import csv
import io
import json
import os
import shutil
import sqlite3
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image
from legal_index import normalize
from review_image_layers import rebuild_search_layers


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db",required=True)
    p.add_argument("--data-dir",required=True)
    p.add_argument("--tessdata-dir",required=True)
    p.add_argument("--workers",type=int,default=4)
    args=p.parse_args()
    root=Path(args.data_dir)
    ocr_dir=root/"ocr";ocr_dir.mkdir(exist_ok=True)
    conn=sqlite3.connect(args.db);conn.row_factory=sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS image_ocr(
        pdf_page INTEGER,xref INTEGER,text TEXT,mean_word_confidence REAL,word_count INTEGER,
        engine TEXT,language TEXT,review_status TEXT,word_boxes_json TEXT,source_image_sha256 TEXT,
        PRIMARY KEY(pdf_page,xref))""")
    items=[dict(r) for r in conn.execute("SELECT DISTINCT o.pdf_page,a.* FROM image_assets a JOIN image_occurrences o USING(xref) WHERE o.pdf_page>1 AND a.width>700 AND a.height>700 ORDER BY o.pdf_page")]
    engine=subprocess.run(["tesseract","--version"],capture_output=True,text=True).stdout.splitlines()[0]
    def process(item):
        page=item["pdf_page"]
        base=ocr_dir/f"page-{page}-image-{item['xref']}"
        enlarged=base.with_suffix(".png")
        with Image.open(root/item["relative_path"]) as image:
            image.convert("RGB").resize((image.width*2,image.height*2),Image.Resampling.LANCZOS).save(enlarged,dpi=(300,300))
        env=os.environ.copy();env["OMP_THREAD_LIMIT"]="1"
        run=subprocess.run(["tesseract",str(enlarged),str(base),"--tessdata-dir",args.tessdata_dir,"-l","ara+eng","--oem","1","--psm","3","-c","tessedit_create_txt=1","-c","tessedit_create_tsv=1"],env=env,capture_output=True,text=True,timeout=180)
        if run.returncode:
            raise RuntimeError(f"OCR failed on page {page}: {run.stderr[-200:]}")
        text=base.with_suffix(".txt").read_text(encoding="utf8")
        words=[r for r in csv.DictReader(io.StringIO(base.with_suffix(".tsv").read_text()),delimiter="\t") if r.get("text","").strip() and float(r.get("conf","-1"))>=0]
        confidence=sum(float(w["conf"]) for w in words)/len(words) if words else 0
        enlarged.unlink()
        return item,text,words,confidence
    results=[]
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,8))) as pool:
        futures=[pool.submit(process,item) for item in items]
        for n,future in enumerate(as_completed(futures),1):
            item,text,words,confidence=future.result()
            results.append({"pdf_page":item["pdf_page"],"xref":item["xref"],"characters":len(text),"words":len(words),"mean_word_confidence":round(confidence,2),"review_status":"needs_review"})
            conn.execute("INSERT OR REPLACE INTO image_ocr VALUES (?,?,?,?,?,?,?,?,?,?)",(item["pdf_page"],item["xref"],text,confidence,len(words),engine,"ara+eng","needs_review",json.dumps(words,ensure_ascii=False),item["sha256"]))
            conn.commit()
            print(f"OCR images {n}/{len(items)}; PDF {item['pdf_page']}; words {len(words)}",flush=True)
    # Keep unreviewed OCR in the candidate index, never in the answer text index.
    with conn:
        rebuild_search_layers(conn)
        stats={"image_pages_ocr":len({r["pdf_page"] for r in results}),"image_ocr_assets":len(results),"image_ocr_characters":sum(r["characters"] for r in results),"ocr_engine":engine,"ocr_language":"ara+eng","ocr_review_status":"needs_review","ocr_network_used":False}
        for key,value in stats.items():
            conn.execute("INSERT OR REPLACE INTO corpus_stats VALUES (?,?)",(key,json.dumps(value,ensure_ascii=False)))
        conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("ocr","all","ocr_requires_review","OCR has been indexed separately; confidence is an engine metric, not legal or transcription approval."))
    (ocr_dir/"manifest.json").write_text(json.dumps({"stats":stats,"images":sorted(results,key=lambda r:r["pdf_page"])},ensure_ascii=False,indent=2),encoding="utf8")
    analysis=root/"analysis.json"
    value=json.loads(analysis.read_text());value.update(stats);analysis.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding="utf8")
    conn.close()
    print(json.dumps(stats,ensure_ascii=False),flush=True)


if __name__=="__main__":
    main()

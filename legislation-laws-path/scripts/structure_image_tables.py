#!/usr/bin/env python3
"""Recover image-grid cell candidates with independent Arabic and English OCR.

Requires local Tesseract models, Pillow, numpy and scipy. No network access.
Physical grid bounds and both OCR readings are retained; no cell is approved.
"""
import argparse
import collections
import csv
import hashlib
import io
import json
import os
import sqlite3
import subprocess
from concurrent.futures import ThreadPoolExecutor,as_completed
from itertools import groupby
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_opening,maximum_filter
from review_image_layers import rebuild_search_layers


def clusters(selected):
    output=[]
    for _,group in groupby(enumerate(selected),lambda x:x[1]-x[0]):
        values=[int(v) for _,v in group]
        output.append(round(sum(values)/len(values)))
    return output


def grid_cells(path):
    ink=np.asarray(Image.open(path).convert("L"))<145
    horizontal=binary_opening(ink,structure=np.ones((1,70)))
    ys=clusters(np.flatnonzero(maximum_filter(horizontal,size=(7,1)).sum(axis=1)>ink.shape[1]*.45))
    cells=[]
    for row,(top,bottom) in enumerate(zip(ys,ys[1:]),1):
        if bottom-top<15:
            continue
        band=ink[top+5:bottom-5]
        vertical=binary_opening(band,structure=np.ones((max(8,min(30,len(band)//2)),1)))
        xs=clusters(np.flatnonzero(maximum_filter(vertical,size=(1,7)).sum(axis=0)>len(band)*.65))
        if len(xs)<2:
            continue
        for col,(left,right) in enumerate(zip(xs,xs[1:]),1):
            if right-left>30:
                cells.append({"row":row,"column":col,"bbox":[left,top,right,bottom]})
    return cells


def reading(words,bbox):
    left,top,right,bottom=bbox
    found=[]
    for word in words:
        # OCR was run on the unscaled source image, so TSV and image share pixels.
        x=int(word["left"])+int(word["width"])/2
        y=int(word["top"])+int(word["height"])/2
        if left+1<x<right-1 and top+1<y<bottom-1:
            found.append(word)
    groups=collections.OrderedDict()
    for word in found:
        groups.setdefault((word["block_num"],word["par_num"],word["line_num"]),[]).append(word["text"])
    text="\n".join(" ".join(v) for v in groups.values())
    confidence=sum(float(w["conf"]) for w in found)/len(found) if found else None
    return text,confidence


def process(item,root,model_dir):
    path=root/item["relative_path"]
    if hashlib.sha256(path.read_bytes()).hexdigest()!=item["sha256"]:
        raise ValueError("Source image hash mismatch")
    folder=root/"ocr-alternatives";folder.mkdir(exist_ok=True)
    alternatives=[]
    for language in ("ara","eng"):
        target=folder/f"page-{item['pdf_page']}-image-{item['xref']}-{language}"
        env=os.environ.copy();env["OMP_THREAD_LIMIT"]="1"
        run=subprocess.run(["tesseract",str(path),str(target),"--tessdata-dir",str(model_dir),"-l",language,"--psm","3","-c","tessedit_create_txt=1","-c","tessedit_create_tsv=1"],capture_output=True,text=True,env=env,timeout=180)
        if run.returncode:
            raise RuntimeError(f"OCR failed for {item['pdf_page']} {language}")
        text=target.with_suffix(".txt").read_text(encoding="utf8")
        words=[w for w in csv.DictReader(io.StringIO(target.with_suffix(".tsv").read_text(encoding="utf8")),delimiter="\t") if w.get("text","").strip() and float(w["conf"])>=0]
        alternatives.append({"language":language,"text":text,"words":words})
    cells=grid_cells(path)
    for cell in cells:
        cell["readings"]={}
        for alt in alternatives:
            text,conf=reading(alt["words"],cell["bbox"])
            cell["readings"][alt["language"]]={"text":text,"mean_word_confidence":conf}
    return item,alternatives,cells


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",required=True)
    parser.add_argument("--data-dir",required=True)
    parser.add_argument("--tessdata-dir",required=True)
    parser.add_argument("--workers",type=int,default=4)
    parser.add_argument("--first-page",type=int,default=1)
    parser.add_argument("--last-page",type=int,default=1000000)
    args=parser.parse_args()
    root=Path(args.data_dir)
    conn=sqlite3.connect(args.db);conn.row_factory=sqlite3.Row
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS image_ocr_alternatives(pdf_page INTEGER,xref INTEGER,language TEXT,
      text TEXT,word_boxes_json TEXT,review_status TEXT,source_image_sha256 TEXT,PRIMARY KEY(pdf_page,xref,language));
    CREATE TABLE IF NOT EXISTS image_table_cells(pdf_page INTEGER,xref INTEGER,row_no INTEGER,column_no INTEGER,
      bbox_json TEXT,readings_json TEXT,review_status TEXT,source_image_sha256 TEXT,PRIMARY KEY(pdf_page,xref,row_no,column_no));
    """)
    items=[dict(r) for r in conn.execute("SELECT DISTINCT o.pdf_page,a.* FROM image_assets a JOIN image_occurrences o USING(xref) WHERE o.pdf_page BETWEEN ? AND ? AND a.width>700 AND a.height>700 ORDER BY o.pdf_page",(args.first_page,args.last_page))]
    exported=[]
    with ThreadPoolExecutor(max_workers=max(1,min(args.workers,8))) as pool:
        futures=[pool.submit(process,item,root,Path(args.tessdata_dir)) for item in items]
        for n,future in enumerate(as_completed(futures),1):
            item,alts,cells=future.result()
            with conn:
                for alt in alts:
                    conn.execute("INSERT OR REPLACE INTO image_ocr_alternatives VALUES (?,?,?,?,?,?,?)",(item["pdf_page"],item["xref"],alt["language"],alt["text"],json.dumps(alt["words"],ensure_ascii=False),"needs_review",item["sha256"]))
                for cell in cells:
                    conn.execute("INSERT OR REPLACE INTO image_table_cells VALUES (?,?,?,?,?,?,?,?)",(item["pdf_page"],item["xref"],cell["row"],cell["column"],json.dumps(cell["bbox"]),json.dumps(cell["readings"],ensure_ascii=False),"needs_review",item["sha256"]))
            exported.append({"pdf_page":item["pdf_page"],"xref":item["xref"],"source_image_sha256":item["sha256"],"review_status":"needs_review","grid_method":"physical ruling candidates; partial grids possible", "cells":cells})
            print(f"Structured image {n}/{len(items)}; PDF {item['pdf_page']}; grid cell candidates {len(cells)}",flush=True)
    stats={"separate_language_ocr_pages":len(items),"separate_language_ocr_readings":len(items)*2,"image_grid_cell_candidates":sum(len(x["cells"]) for x in exported),"image_grid_cells_review_status":"needs_review"}
    with conn:
        rebuild_search_layers(conn)
        for k,v in stats.items():
            conn.execute("INSERT OR REPLACE INTO corpus_stats VALUES (?,?)",(k,json.dumps(v)))
    (root/"image_table_candidates.json").write_text(json.dumps({"stats":stats,"pages":sorted(exported,key=lambda x:x["pdf_page"])},ensure_ascii=False,indent=2),encoding="utf8")
    conn.close()
    print(json.dumps(stats))


if __name__=="__main__":
    main()

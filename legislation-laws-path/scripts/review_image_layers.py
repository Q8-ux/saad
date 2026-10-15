#!/usr/bin/env python3
"""Apply explicit image transcription reviews and rebuild separate search layers.

Reviews must be prepared by inspecting the actual image. Never infer approval from
OCR confidence. Unreviewed OCR remains discoverable in a candidate-only index.
"""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

from legal_index import normalize


def rebuild_search_layers(conn):
    conn.execute("CREATE TABLE IF NOT EXISTS image_transcriptions(id TEXT PRIMARY KEY,pdf_page INTEGER,xref INTEGER,text TEXT,cells_json TEXT,review_status TEXT,reviewed_at TEXT,review_method TEXT,source_sha256 TEXT,source_image_sha256 TEXT,text_sha256 TEXT)")
    conn.execute("DROP TABLE IF EXISTS pages_vocab")
    conn.execute("DROP TABLE pages_fts")
    conn.execute("CREATE VIRTUAL TABLE pages_fts USING fts5(pdf_page UNINDEXED,body)")
    conn.execute("DROP TABLE IF EXISTS ocr_candidates_fts")
    conn.execute("CREATE VIRTUAL TABLE ocr_candidates_fts USING fts5(pdf_page UNINDEXED,xref UNINDEXED,body)")
    for page in conn.execute("SELECT pdf_page,logical_text FROM pdf_pages").fetchall():
        reviewed="\n".join(r[0] for r in conn.execute("SELECT text FROM image_transcriptions WHERE pdf_page=? AND review_status='visually_checked'",(page["pdf_page"],)))
        conn.execute("INSERT INTO pages_fts(rowid,pdf_page,body) VALUES (?,?,?)",(page["pdf_page"],page["pdf_page"],normalize(page["logical_text"]+"\n"+reviewed)))
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_ocr'").fetchone():
        for item in conn.execute("SELECT * FROM image_ocr").fetchall():
            text=item["text"]
            if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_ocr_alternatives'").fetchone():
                text+="\n"+"\n".join(r[0] for r in conn.execute("SELECT text FROM image_ocr_alternatives WHERE pdf_page=? AND xref=?",(item["pdf_page"],item["xref"])))
            conn.execute("INSERT INTO ocr_candidates_fts VALUES (?,?,?)",(item["pdf_page"],item["xref"],normalize(text)))
    conn.execute("CREATE VIRTUAL TABLE pages_vocab USING fts5vocab(pages_fts,'row')")


def apply_reviews(db, reviews):
    conn=sqlite3.connect(db);conn.row_factory=sqlite3.Row
    source=conn.execute("SELECT sha256 FROM source_documents LIMIT 1").fetchone()[0]
    conn.execute("""CREATE TABLE IF NOT EXISTS image_transcriptions(
      id TEXT PRIMARY KEY,pdf_page INTEGER,xref INTEGER,text TEXT,cells_json TEXT,
      review_status TEXT,reviewed_at TEXT,review_method TEXT,source_sha256 TEXT,
      source_image_sha256 TEXT,text_sha256 TEXT)""")
    data=json.loads(Path(reviews).read_text(encoding="utf8"))
    for item in data["reviews"]:
        asset=conn.execute("SELECT a.sha256 FROM image_assets a JOIN image_occurrences o USING(xref) WHERE o.pdf_page=? AND a.xref=?",(item["pdf_page"],item["xref"])).fetchone()
        if not asset or asset[0]!=item["source_image_sha256"] or source!=item["source_sha256"]:
            raise ValueError("Review does not match the exact bound source image")
        if item["review_status"]!="visually_checked" or item["review_method"]!="direct_source_image_inspection":
            raise ValueError("Expected an explicit visual review, not an OCR confidence approval")
        conn.execute("INSERT OR REPLACE INTO image_transcriptions VALUES (?,?,?,?,?,?,?,?,?,?,?)",(item["id"],item["pdf_page"],item["xref"],item["text"],json.dumps(item.get("table_rows",[]),ensure_ascii=False),item["review_status"],item["reviewed_at"],item["review_method"],source,asset[0],hashlib.sha256(item["text"].encode()).hexdigest()))
    with conn:
        rebuild_search_layers(conn)
        stats={"reviewed_image_pages":conn.execute("SELECT count(DISTINCT pdf_page) FROM image_transcriptions").fetchone()[0],"reviewed_image_table_rows":sum(len(json.loads(r[0])) for r in conn.execute("SELECT cells_json FROM image_transcriptions")),"ocr_default_answer_eligible":False,"ocr_search_layer":"candidate_only; separate from digital text and visually checked transcription"}
        for k,v in stats.items():
            conn.execute("INSERT OR REPLACE INTO corpus_stats VALUES (?,?)",(k,json.dumps(v,ensure_ascii=False)))
    conn.close()
    return stats


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",required=True)
    parser.add_argument("--reviews",required=True)
    args=parser.parse_args()
    print(json.dumps(apply_reviews(args.db,args.reviews),ensure_ascii=False,indent=2))

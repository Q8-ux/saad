#!/usr/bin/env python3
"""Apply hash-bound, explicit source reviews; never approve from heuristics."""
import argparse
import hashlib
import json
import re
import sqlite3
from pathlib import Path


def apply(db,reviews,output_dir):
    conn=sqlite3.connect(db);conn.row_factory=sqlite3.Row
    data=json.loads(Path(reviews).read_text(encoding="utf8"))
    source=conn.execute("SELECT sha256 FROM source_documents LIMIT 1").fetchone()[0]
    if source!=data["source_sha256"]:
        raise ValueError("Extraction reviews belong to a different source")
    conn.executescript("""
      CREATE TABLE IF NOT EXISTS heading_candidate_reviews(pdf_page INTEGER,line_no INTEGER,text_sha256 TEXT,
      classification TEXT,review_method TEXT,notes TEXT,PRIMARY KEY(pdf_page,line_no));
      CREATE TABLE IF NOT EXISTS quoted_provisions(pdf_page INTEGER,line_no INTEGER,document_id TEXT,
      target_number TEXT,text TEXT,char_start INTEGER,char_end INTEGER,source_sha256 TEXT,PRIMARY KEY(pdf_page,line_no));
    """)
    for review in data.get("article_reviews",[]):
        row=conn.execute("SELECT * FROM article_units WHERE id=?",(review["id"],)).fetchone()
        if not row or row["text_sha256"]!=review["text_sha256"] or review["review_method"]!="direct_source_page_inspection":
            raise ValueError("Article review does not match the assembled source text")
        notes=json.loads(row["review_notes_json"])
        if review["notes"] not in notes:
            notes.append(review["notes"])
        conn.execute("UPDATE article_units SET boundary_review='visually_checked',transcription_verified=?,complete_article_verified=?,review_notes_json=? WHERE id=?",(int(review["transcription_verified"]),int(review["transcription_verified"]),json.dumps(notes,ensure_ascii=False),review["id"]))
    for review in data.get("heading_reviews",[]):
        row=conn.execute("SELECT * FROM source_lines WHERE pdf_page=? AND line_no=?",(review["pdf_page"],review["line_no"])).fetchone()
        if not row or hashlib.sha256(row["text"].encode()).hexdigest()!=review["text_sha256"]:
            raise ValueError("Heading review does not match the source line")
        if review["classification"] not in ("body_reference","quoted_amendment_heading","table_caption_reference"):
            raise ValueError("Unsupported explicit heading classification")
        conn.execute("INSERT OR REPLACE INTO heading_candidate_reviews VALUES (?,?,?,?,?,?)",(review["pdf_page"],review["line_no"],review["text_sha256"],review["classification"],"source_text_and_adjacent_context_inspection",review["notes"]))
        conn.execute("DELETE FROM qa_findings WHERE category='unparsed_article_like_line' AND location=?",(f"{review['pdf_page']}:{review['line_no']}",))
        if review["classification"]=="quoted_amendment_heading":
            page=conn.execute("SELECT document_id,logical_text FROM pdf_pages WHERE pdf_page=?",(review["pdf_page"],)).fetchone()
            next_heading=conn.execute("SELECT min(line_start) FROM article_fragments WHERE pdf_page=? AND line_start>?",(review["pdf_page"],review["line_no"])).fetchone()[0]
            end=conn.execute("SELECT max(char_end) FROM source_lines WHERE pdf_page=? AND line_no<?",(review["pdf_page"],next_heading or 1000000)).fetchone()[0]
            text=page["logical_text"][row["char_start"]:end]
            number=re.search(r"\d+",row["text"])[0]
            conn.execute("INSERT OR REPLACE INTO quoted_provisions VALUES (?,?,?,?,?,?,?,?)",(review["pdf_page"],review["line_no"],page["document_id"],number,text,row["char_start"],end,source))
    stats={"article_spans_visually_checked":conn.execute("SELECT count(*) FROM article_units WHERE boundary_review='visually_checked'").fetchone()[0],"complete_articles_visually_verified":conn.execute("SELECT count(*) FROM article_units WHERE complete_article_verified=1").fetchone()[0],"heading_candidates_contextually_reviewed":conn.execute("SELECT count(*) FROM heading_candidate_reviews").fetchone()[0],"unresolved_heading_candidates":conn.execute("SELECT count(*) FROM qa_findings WHERE category='unparsed_article_like_line'").fetchone()[0],"quoted_amendment_provisions":conn.execute("SELECT count(*) FROM quoted_provisions").fetchone()[0]}
    for k,v in stats.items():
        conn.execute("INSERT OR REPLACE INTO corpus_stats VALUES (?,?)",(k,json.dumps(v)))
    conn.commit()
    root=Path(output_dir)
    (root/"assembled_articles.jsonl").write_text("".join(json.dumps(dict(r),ensure_ascii=False)+"\n" for r in conn.execute("SELECT * FROM article_units ORDER BY start_page,id")),encoding="utf8")
    conn.close()
    return stats


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",required=True)
    parser.add_argument("--reviews",required=True)
    parser.add_argument("--output-dir",required=True)
    args=parser.parse_args()
    print(json.dumps(apply(args.db,args.reviews,args.output_dir),ensure_ascii=False,indent=2))

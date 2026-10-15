#!/usr/bin/env python3
"""Audit a prepared real corpus without contacting any external service."""
import argparse
import hashlib
import json
import socket
import sqlite3
from pathlib import Path
from unittest.mock import patch

from corpus_query import query_corpus, glyph_variants
from import_compendium import article_number


def audit(db, source=None):
    checks=[]
    def check(name,condition,detail=None):
        checks.append({"check":name,"passed":bool(condition),"detail":detail})
        if not condition:
            raise AssertionError(name)
    conn=sqlite3.connect(Path(db).resolve().as_uri()+"?mode=ro",uri=True)
    conn.row_factory=sqlite3.Row
    source_row=dict(conn.execute("SELECT * FROM source_documents LIMIT 1").fetchone())
    check("sqlite_integrity",conn.execute("PRAGMA integrity_check").fetchone()[0]=="ok")
    nums=[r[0] for r in conn.execute("SELECT pdf_page FROM pdf_pages ORDER BY pdf_page")]
    check("all_pdf_pages_retained",nums==list(range(1,source_row["pages"]+1)),len(nums))
    check("page_text_hashes",all(hashlib.sha256(r["logical_text"].encode()).hexdigest()==r["text_sha256"] for r in conn.execute("SELECT logical_text,text_sha256 FROM pdf_pages")))
    check("source_hash",source is None or hashlib.sha256(Path(source).read_bytes()).hexdigest()==source_row["sha256"])
    fragments=conn.execute("SELECT a.text,p.logical_text FROM article_fragments a JOIN pdf_pages p USING(pdf_page)").fetchall()
    check("fragments_are_source_substrings",all(r["text"] in r["logical_text"] for r in fragments),len(fragments))
    check("fragment_record_counts_match",len(fragments)==conn.execute("SELECT count(*) FROM records").fetchone()[0])
    record_rows=[json.loads(r[0]) for r in conn.execute("SELECT payload FROM records")]
    check("no_invented_legal_approval",all(r["verification_status"]=="needs_review" and r["provenance"]=="user_document" and r["temporal_status"]=="unknown" for r in record_rows))
    check("all_records_bound_to_source",all(r["source_sha256"]==source_row["sha256"] and hashlib.sha256(r["text"].encode()).hexdigest()==r["text_sha256"] for r in record_rows))
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_ocr'").fetchone():
        expected=conn.execute("SELECT count(*) FROM (SELECT DISTINCT o.pdf_page,a.xref FROM image_assets a JOIN image_occurrences o USING(xref) WHERE o.pdf_page>1 AND a.width>700 AND a.height>700)").fetchone()[0]
        check("large_source_images_ocr_retained",conn.execute("SELECT count(*) FROM image_ocr WHERE length(trim(text))>0").fetchone()[0]==expected,expected)
        check("ocr_layers_are_unapproved_and_bound_to_images",conn.execute("SELECT count(*) FROM image_ocr o JOIN image_assets a USING(xref) WHERE o.review_status!='needs_review' OR o.source_image_sha256!=a.sha256").fetchone()[0]==0)
    check("arabic_heading_parser",article_number("مادة ١٥")=="15" and article_number("املادة 7 مكرر (أ) (((")=="7 مكرر أ" and article_number("املادة السابقة") is None)
    check("glyph_aliases_preserve_original_option","الاعلان" in glyph_variants("الاعلان") and "االعالن" in glyph_variants("الاعلان"))
    first=conn.execute("SELECT document_id,number,pdf_page FROM article_fragments ORDER BY pdf_page,line_start LIMIT 1").fetchone()
    before=hashlib.sha256(Path(db).read_bytes()).hexdigest()
    with patch.object(socket,"create_connection",side_effect=AssertionError("External network prohibited")):
        found=query_corpus(db,"article",document_id=first["document_id"],number=first["number"])
        check("internal_article_retrieval",found["result_count"]>0 and found["network_used"] is False and found["current_law_verified"] is False)
        missing=query_corpus(db,"article",document_id=first["document_id"],number="999999")
        check("missing_article_returns_empty",missing["not_found"] and missing["results"]==[])
        page=query_corpus(db,"page",page=source_row["pages"])
        check("last_page_retrievable",page["results"][0]["pdf_page"]==source_row["pages"])
        docs=query_corpus(db,"documents")
        check("sections_cover_expected_range",all(1<=r["start_page"]<=r["end_page"]<=source_row["pages"] for r in docs["results"]))
        check("section_ranges_do_not_overlap",all(a["end_page"]<b["start_page"] for a,b in zip(docs["results"],docs["results"][1:])))
        bad=conn.execute("SELECT count(*) FROM pdf_pages p JOIN compendium_documents d ON p.document_id=d.id WHERE p.pdf_page<d.start_page OR p.pdf_page>d.end_page").fetchone()[0]
        check("page_assignment_inside_section",bad==0)
    check("queries_do_not_mutate_database",before==hashlib.sha256(Path(db).read_bytes()).hexdigest())
    check("distinct_printed_page_preserved",conn.execute("SELECT count(*) FROM pdf_pages WHERE printed_page IS NOT NULL AND CAST(printed_page AS INT)!=pdf_page").fetchone()[0]>0)
    conn.close()
    return {"scope":"file_only","passed":all(x["passed"] for x in checks),"check_count":len(checks),"checks":checks}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("db")
    p.add_argument("--source")
    p.add_argument("--output")
    args=p.parse_args()
    result=audit(args.db,args.source)
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output:
        Path(args.output).write_text(text,encoding="utf8")
    print(text)


if __name__=="__main__":
    main()

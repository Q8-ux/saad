#!/usr/bin/env python3
"""Restore explicit, hash-bound structural reviews from the private corpus.

This module applies reviewed evidence; it never guesses absent article text or
renumbers a printed provision. The original page strings remain immutable.
"""
import hashlib
import json
from pathlib import Path


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


def page_lines(conn,page):
    row=conn.execute("SELECT * FROM pdf_pages WHERE pdf_page=?",(page,)).fetchone()
    if not row:
        raise ValueError("Review page is absent")
    result=[];offset=0
    for n,value in enumerate(row["logical_text"].splitlines(keepends=True),1):
        text=value.rstrip("\r\n")
        result.append({"line":n,"text":text,"start":offset,"end":offset+len(text)})
        offset+=len(value)
    return row,result


def prepare_reviews(conn,source,root,review_path=None):
    path=Path(review_path) if review_path else Path(root)/"structure_reviews.json"
    data={"heading_overrides":[],"page_subsections":[],"range_notices":[],"source_issues":[]}
    if path.exists():
        data.update(json.loads(path.read_text(encoding="utf8")))
        if data.get("source_sha256")!=source["sha256"]:
            raise ValueError("Structural reviews belong to a different PDF")
    elif conn.execute("SELECT 1 FROM sqlite_master WHERE name='heading_overrides'").fetchone() and conn.execute("SELECT count(*) FROM heading_overrides").fetchone()[0]:
        raise ValueError("Restore the private structure_reviews.json before rebuilding reviewed boundaries")
    conn.executescript("""
      DROP TABLE IF EXISTS heading_overrides;
      DROP TABLE IF EXISTS inline_annotations;
      DROP TABLE IF EXISTS article_range_notices;
      DROP TABLE IF EXISTS page_subsections;
      DROP TABLE IF EXISTS source_issues;
      CREATE TABLE heading_overrides(pdf_page INTEGER,line_no INTEGER,number TEXT,heading TEXT,
        char_start INTEGER,char_end INTEGER,first_line_end INTEGER,review_method TEXT,reason TEXT,
        source_sha256 TEXT,PRIMARY KEY(pdf_page,line_no));
      CREATE TABLE inline_annotations(pdf_page INTEGER,line_no INTEGER,char_start INTEGER,char_end INTEGER,
        kind TEXT,text TEXT,text_sha256 TEXT,source_sha256 TEXT);
      CREATE TABLE article_range_notices(id TEXT PRIMARY KEY,document_id TEXT,number_from INTEGER,
        number_to INTEGER,pdf_page INTEGER,text TEXT,evidence_json TEXT,review_status TEXT,source_sha256 TEXT);
      CREATE TABLE page_subsections(id TEXT PRIMARY KEY,document_id TEXT,pdf_page INTEGER,number TEXT,
        title TEXT,kind TEXT,evidence_json TEXT,review_status TEXT,source_sha256 TEXT);
      CREATE TABLE source_issues(id TEXT PRIMARY KEY,document_id TEXT,article_number TEXT,pdf_page INTEGER,
        kind TEXT,description TEXT,evidence_json TEXT,review_status TEXT,source_sha256 TEXT);
    """)
    for item in data["heading_overrides"]:
        page,lines=page_lines(conn,item["pdf_page"])
        line=lines[item["line_no"]-1]
        if sha(line["text"])!=item["line_sha256"] or item["review_method"]!="direct_source_page_inspection":
            raise ValueError("Heading override is not an explicit review of this exact source line")
        start=line["start"]+item["heading_start_in_line"];end=line["start"]+item["heading_end_in_line"]
        if line["text"][:item["heading_start_in_line"]].strip():
            raise ValueError("A reviewed heading must start the logical line; preceding prose requires separate span review")
        heading=page["logical_text"][start:end]
        if heading!=item["heading"] or not heading.strip():
            raise ValueError("Reviewed heading offsets do not match")
        first_end=end if item.get("separate_inline_note") else None
        conn.execute("INSERT INTO heading_overrides VALUES (?,?,?,?,?,?,?,?,?,?)",(item["pdf_page"],item["line_no"],item["number"],heading,start,end,first_end,item["review_method"],item["reason"],source["sha256"]))
        if first_end is not None and line["end"]>first_end:
            text=page["logical_text"][first_end:line["end"]]
            conn.execute("INSERT INTO inline_annotations VALUES (?,?,?,?,?,?,?,?)",(item["pdf_page"],item["line_no"],first_end,line["end"],"footnote",text,sha(text),source["sha256"]))
    for item in data["page_subsections"]:
        page,_=page_lines(conn,item["pdf_page"])
        if page["text_sha256"]!=item["page_text_sha256"]:
            raise ValueError("Appendix review page changed")
        conn.execute("UPDATE pdf_pages SET role='appendix' WHERE pdf_page=?",(item["pdf_page"],))
        conn.execute("INSERT INTO page_subsections VALUES (?,?,?,?,?,?,?,?,?)",(item["id"],page["document_id"],item["pdf_page"],item["number"],item["title"],"regulation_table",json.dumps(item["evidence"],ensure_ascii=False),"visually_checked",source["sha256"]))
    for item in data["range_notices"]:
        page,lines=page_lines(conn,item["pdf_page"])
        a,b=lines[item["line_start"]-1],lines[item["line_end"]-1]
        text=page["logical_text"][a["start"]:b["end"]]
        if sha(text)!=item["text_sha256"]:
            raise ValueError("Range notice changed")
        evidence={"line_start":item["line_start"],"line_end":item["line_end"],"char_start":a["start"],"char_end":b["end"],"exclude_from_article":item["exclude_from_article"],"notice_type":"reported_repeal_in_user_file","current_law_verified":False}
        conn.execute("INSERT INTO article_range_notices VALUES (?,?,?,?,?,?,?,?,?)",(item["id"],page["document_id"],item["number_from"],item["number_to"],item["pdf_page"],text,json.dumps(evidence,ensure_ascii=False),"visually_checked",source["sha256"]))
    for item in data["source_issues"]:
        evidence=[]
        for expected in item["pages"]:
            page,_=page_lines(conn,expected["pdf_page"])
            if page["text_sha256"]!=expected["page_text_sha256"]:
                raise ValueError("Source issue evidence changed")
            evidence.append(expected)
        conn.execute("INSERT INTO source_issues VALUES (?,?,?,?,?,?,?,?,?)",(item["id"],item["document_id"],item["article_number"],item["pages"][0]["pdf_page"],item["kind"],item["description"],json.dumps(evidence,ensure_ascii=False),"visually_checked",source["sha256"]))
    return data


def apply_line_reviews(conn,page,lines):
    for row in conn.execute("SELECT evidence_json FROM article_range_notices WHERE pdf_page=?",(page,)):
        evidence=json.loads(row[0])
        if evidence["exclude_from_article"]:
            for line in lines[evidence["line_start"]-1:evidence["line_end"]]:
                line.update(kind="range_notice",classification="direct_source_page_inspection")
    for override in conn.execute("SELECT line_no FROM heading_overrides WHERE pdf_page=?",(page,)):
        lines[override[0]-1].update(kind="body",classification="reviewed_heading_override")

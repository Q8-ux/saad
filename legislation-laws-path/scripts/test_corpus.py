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
    source_prefix=source_row["sha256"][:12]
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
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='article_units'").fetchone():
        units=[dict(r) for r in conn.execute("SELECT * FROM article_units")]
        segments=[dict(r) for r in conn.execute("SELECT s.*,p.logical_text,p.document_id AS page_document_id,p.role FROM article_segments s JOIN pdf_pages p USING(pdf_page)")]
        check("assembled_segments_are_exact_source_slices",all(s["text"]==s["logical_text"][s["char_start"]:s["char_end"]] and hashlib.sha256(s["text"].encode()).hexdigest()==s["text_sha256"] for s in segments),len(segments))
        unit_map={u["id"]:u for u in units}
        check("no_join_across_law_or_contents_boundaries",all(s["page_document_id"]==unit_map[s["article_id"]]["document_id"] and s["role"]=="body" for s in segments))
        bad=conn.execute("SELECT count(*) FROM article_segments s JOIN source_lines l ON l.pdf_page=s.pdf_page AND l.line_no BETWEEN s.line_start AND s.line_end WHERE l.kind NOT IN ('body','blank')").fetchone()[0]
        check("notes_navigation_commentary_are_not_article_prose",bad==0)
        reconstructed=True
        for u in units:
            parts=[r[0] for r in conn.execute("SELECT text FROM article_segments WHERE article_id=? ORDER BY seq",(u["id"],))]
            if "\n\n".join(parts)!=u["text"] or hashlib.sha256(u["text"].encode()).hexdigest()!=u["text_sha256"] or u["source_sha256"]!=source_row["sha256"]:
                reconstructed=False;break
        check("assemblies_reproduce_their_ordered_segments",reconstructed,len(units))
        check("every_heading_has_an_individual_assembly",len(units)==len(fragments))
        keys={(r[0],r[1]) for r in conn.execute("SELECT pdf_page,line_start FROM article_fragments")}
        detected=[r for r in conn.execute("SELECT l.pdf_page,l.line_no,l.text,l.kind FROM source_lines l JOIN pdf_pages p USING(pdf_page) WHERE p.role='body' AND l.kind IN ('body','header')") if article_number(r["text"])]
        check("all_body_headings_including_page_top_retained",all((r["pdf_page"],r["line_no"]) in keys for r in detected))
        check("complete_flags_require_explicit_visual_and_text_review",all(not u["complete_article_verified"] or (u["boundary_review"]=="visually_checked" and u["transcription_verified"]==1) for u in units))
        reviews=conn.execute("SELECT r.*,l.text FROM heading_candidate_reviews r JOIN source_lines l USING(pdf_page,line_no)").fetchall()
        check("heading_reviews_bound_to_original_lines",all(hashlib.sha256(r["text"].encode()).hexdigest()==r["text_sha256"] for r in reviews),len(reviews))
        check("all_pending_heading_candidates_resolved",conn.execute("SELECT count(*) FROM qa_findings WHERE category='unparsed_article_like_line'").fetchone()[0]==0)
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_table_cells'").fetchone():
        cells=conn.execute("SELECT c.*,a.width,a.height,a.sha256 FROM image_table_cells c JOIN image_assets a USING(xref)").fetchall()
        check("image_cells_keep_source_geometry_and_review_gate",all(r["review_status"]=="needs_review" and r["source_image_sha256"]==r["sha256"] and 0<=json.loads(r["bbox_json"])[0]<json.loads(r["bbox_json"])[2]<=r["width"] and 0<=json.loads(r["bbox_json"])[1]<json.loads(r["bbox_json"])[3]<=r["height"] for r in cells),len(cells))
        alts=conn.execute("SELECT a.*,s.sha256 FROM image_ocr_alternatives a JOIN image_assets s USING(xref)").fetchall()
        check("separate_language_ocr_is_still_unapproved",all(r["review_status"]=="needs_review" and r["source_image_sha256"]==r["sha256"] for r in alts) and len(alts)==84,len(alts))
    if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_transcriptions'").fetchone():
        reviewed=conn.execute("SELECT t.*,a.sha256 FROM image_transcriptions t JOIN image_assets a USING(xref)").fetchall()
        check("image_transcription_reviews_bound_to_exact_images",all(r["source_image_sha256"]==r["sha256"] and r["source_sha256"]==source_row["sha256"] and hashlib.sha256(r["text"].encode()).hexdigest()==r["text_sha256"] and r["review_method"]=="direct_source_image_inspection" for r in reviewed))
        table=json.loads(conn.execute("SELECT cells_json FROM image_transcriptions WHERE pdf_page=1670").fetchone()[0])
        check("judicial_table_dashes_are_not_zero_years",len(table)==9 and all(r["minimum_years"] is None for r in table[:3]) and table[-1]["minimum_years"]==4)
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
        if conn.execute("SELECT 1 FROM sqlite_master WHERE name='article_units'").fetchone():
            continuation=query_corpus(db,"article",document_id=f"{source_prefix}-d0113",number="79")["results"][0]
            check("real_article79_continuation_attached",continuation["start_page"]==125 and continuation["end_page"]==126 and "من تنفيذ عقوبته" in continuation["text"] and "عدلت بموجب" not in continuation["text"])
            last=query_corpus(db,"article",document_id=f"{source_prefix}-d0003",number="183")["results"]
            check("constitution_commentary_does_not_repeat_articles",len(last)==1 and last[0]["end_page"]==23 and "املذكرة التفسيرية" not in last[0]["text"])
            commentary=query_corpus(db,"page",page=31)
            check("page_results_identify_explanatory_commentary",any(z["kind"]=="commentary" for z in commentary["results"][0]["page_content_zones"]))
            issuance=query_corpus(db,"article",document_id=f"{source_prefix}-d0608",number="5")
            check("promulgation_and_attached_law_remain_distinct",len(issuance["results"])==2 and issuance["requires_component_selection"])
            selected=query_corpus(db,"article",document_id=f"{source_prefix}-d0608",number="5",component_id=issuance["results"][0]["component_id"])
            check("component_filter_resolves_number_ambiguity",len(selected["results"])==1 and not selected["requires_component_selection"])
            repeated=query_corpus(db,"article",document_id=f"{source_prefix}-d0945",number="132")
            occurrence=query_corpus(db,"article",document_id=f"{source_prefix}-d0945",number="132",article_id=repeated["results"][0]["id"])
            check("repeated_number_within_component_can_be_selected",repeated["requires_article_selection"] and len(occurrence["results"])==1 and not occurrence["requires_article_selection"])
            top=query_corpus(db,"article",document_id=f"{source_prefix}-d1350",number="164")
            check("article164_near_header_is_retained",top["result_count"]==1 and top["results"][0]["pdf_page"]==1387)
            chemical=query_corpus(db,"search",query="ACETORPHINE")
            check("unreviewed_chemical_ocr_does_not_become_answer_text",chemical["result_count"]==0 and chemical["candidate_count"]>0 and chemical["answer_status"]=="needs_image_review" and all(not r["answer_eligible"] for r in chemical["unreviewed_ocr_candidates"]))
            judicial=query_corpus(db,"search",query="وكيل نيابة",limit=3)
            check("reviewed_judicial_image_is_searchable",any(r["pdf_page"]==1670 and r.get("reviewed_image_transcriptions") for r in judicial["results"]))
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

#!/usr/bin/env python3
"""Read-only search INSIDE a prepared PDF corpus. No network or external model."""
import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
from legal_index import normalize, number_key


def article_key(value):
    """Normalize number formatting only; never infer a range or missing number."""
    value=normalize(value)
    value=re.sub(r"^(?:المادة|املادة|مادة|ماده)\s*", "",value)
    value=re.sub(r"مكررا", "مكرر",value)
    value=re.sub(r"مكرر\s*[-–]\s*", "مكرر ",value)
    value=re.sub(r"[()（）\[\]«»]", "",value)
    value=re.sub(r"\s+", "",value)
    value=re.sub(r"^[0-9]+",lambda m:str(int(m[0])),value)
    return value


def glyph_variants(token):
    # Observed PDF ligature mapping defects; search alternatives only, never text edits.
    swaps={"لا":"ال","لم":"مل","لى":"ىل","لي":"يل","في":"يف","ني":"ين","ري":"ير","شر":"رش"}
    if len(token)<4:
        short={"في":"يف","على":"عىل","الى":"اىل"}
        return sorted({token,short[token]}) if token in short else [token]
    variants={token,re.sub("|".join(swaps),lambda m:swaps[m[0]],token)}
    variants.update(token.replace(a,b) for a,b in swaps.items() if a in token)
    return sorted(variants)


def query_corpus(db, command, query="", document_id=None, number=None, page=None, limit=10, component_id=None, article_id=None):
    if not 1<=limit<=100:
        raise ValueError("limit must be between 1 and 100")
    conn=sqlite3.connect(Path(db).resolve().as_uri()+"?mode=ro",uri=True)
    conn.row_factory=sqlite3.Row
    try:
        source=dict(conn.execute("SELECT id,name,sha256,pages,legal_currency FROM source_documents LIMIT 1").fetchone())
        match_mode="exact_normalized"
        variants_used={}
        ocr_candidates=[]
        quoted_provisions=[]
        range_notices=[]
        source_issues=[]
        related_numbers=[]
        match_counts={}
        has_units=bool(conn.execute("SELECT 1 FROM sqlite_master WHERE name='article_units'").fetchone())
        if command=="documents":
            rows=[dict(r) for r in conn.execute("SELECT id,title,start_page,end_page,kind,boundary_method FROM compendium_documents ORDER BY start_page")]
            if query:
                terms=normalize(query).split()
                rows=[r for r in rows if all(any(v in normalize(r["title"]) for v in glyph_variants(t)) for t in terms)]
        elif command=="page":
            if page is None or not 1<=page<=source["pages"]:
                raise ValueError("Page outside source PDF")
            rows=[dict(r) for r in conn.execute("SELECT p.pdf_page,p.printed_page,p.document_id,COALESCE(d.title,p.header,'فهرس المصدر') AS title,p.role,p.logical_text AS text,p.quality_flags_json FROM pdf_pages p LEFT JOIN compendium_documents d ON p.document_id=d.id WHERE p.pdf_page=?",(page,))]
        elif command=="article":
            if not document_id or not number:
                raise ValueError("Specify document_id and number; article numbers are not globally unique")
            rows=[]
            sql=("SELECT a.*,a.start_page AS pdf_page,d.title,p.printed_page FROM article_units a JOIN compendium_documents d ON a.document_id=d.id JOIN pdf_pages p ON a.start_page=p.pdf_page WHERE a.document_id=? ORDER BY a.start_page,(SELECT line_start FROM article_segments s WHERE s.article_id=a.id AND s.seq=1),a.id" if has_units else "SELECT a.*,d.title,p.printed_page FROM article_fragments a JOIN compendium_documents d ON a.document_id=d.id JOIN pdf_pages p ON a.pdf_page=p.pdf_page WHERE a.document_id=? ORDER BY a.pdf_page,a.line_start")
            for r in conn.execute(sql,(document_id,)):
                if article_key(r["number"])==article_key(number):
                    item=dict(r)
                    if component_id and item.get("component_id")!=component_id:
                        continue
                    if article_id and item["id"]!=article_id:
                        continue
                    end_page=r["end_page"] if has_units else r["pdf_page"]
                    item["context_pages"]=list(range(max(1,r["pdf_page"]-1),min(source["pages"],end_page+1)+1))
                    item["complete_article_verified"]=bool(item.get("complete_article_verified",False))
                    item["transcription_verified"]=bool(item.get("transcription_verified",False))
                    if has_units:
                        item["segments"]=[dict(s) for s in conn.execute("SELECT seq,pdf_page,line_start,line_end,char_start,char_end,text,text_sha256 FROM article_segments WHERE article_id=? ORDER BY seq",(r["id"],))]
                        item["source_pages"]=[dict(s) for s in conn.execute("SELECT pdf_page,printed_page,text_sha256 FROM pdf_pages WHERE pdf_page BETWEEN ? AND ? ORDER BY pdf_page",(r["start_page"],r["end_page"]))]
                        item["page_annotations"]=[dict(s) for s in conn.execute("SELECT pdf_page,line_no,kind,text FROM source_lines WHERE pdf_page BETWEEN ? AND ? AND kind IN ('footnote','footnote_marker','structural_heading') ORDER BY pdf_page,line_no",(r["start_page"],r["end_page"]))]
                        item["annotation_association"]="page_context_only; individual footnote targets not inferred"
                    rows.append(item)
            if conn.execute("SELECT 1 FROM sqlite_master WHERE name='quoted_provisions'").fetchone():
                quoted_provisions=[dict(r) for r in conn.execute("SELECT * FROM quoted_provisions WHERE document_id=? AND target_number=?",(document_id,article_key(number)))]
            if conn.execute("SELECT 1 FROM sqlite_master WHERE name='article_range_notices'").fetchone() and article_key(number).isdigit():
                range_notices=[dict(r) for r in conn.execute("SELECT n.*,p.printed_page FROM article_range_notices n JOIN pdf_pages p USING(pdf_page) WHERE n.document_id=? AND ? BETWEEN number_from AND number_to ORDER BY pdf_page",(document_id,int(article_key(number))))]
            if conn.execute("SELECT 1 FROM sqlite_master WHERE name='source_issues'").fetchone():
                source_issues=[dict(r) for r in conn.execute("SELECT * FROM source_issues WHERE document_id=?",(document_id,)) if article_key(r["article_number"])==article_key(number)]
            if not rows and has_units and article_key(number).isdigit():
                related_numbers=[dict(r) for r in conn.execute("SELECT id,component_id,number,heading,start_page,end_page FROM article_units WHERE document_id=? ORDER BY start_page,id",(document_id,)) if article_key(r["number"]).startswith(article_key(number)+"مكرر")]
            if (component_id or article_id) and not rows:
                quoted_provisions=[];range_notices=[];source_issues=[];related_numbers=[]
        elif command=="search":
            tokens=re.findall(r"[^\W_]+",normalize(query),re.UNICODE)
            if not tokens:
                raise ValueError("Empty search query")
            exact_match=" AND ".join('"'+t+'"' for t in tokens)
            variants_used={token:glyph_variants(token) for token in tokens}
            expanded_match=" AND ".join("("+" OR ".join('"'+v+'"' for v in variants_used[t])+")" for t in tokens)
            params=[expanded_match]
            where="pages_fts MATCH ?"
            if document_id:
                where+=" AND p.document_id=?"
                params.append(document_id)
            all_ids={r[0] for r in conn.execute("SELECT p.pdf_page FROM pages_fts JOIN pdf_pages p ON p.pdf_page=pages_fts.pdf_page WHERE "+where,params)}
            exact_params=[exact_match]+params[1:]
            exact_ids={r[0] for r in conn.execute("SELECT p.pdf_page FROM pages_fts JOIN pdf_pages p ON p.pdf_page=pages_fts.pdf_page WHERE "+where,exact_params)}
            extra=all_ids-exact_ids
            match_counts={"total_match_count":len(all_ids),"exact_match_count":len(exact_ids),"glyph_variant_match_count":len(extra)}
            if extra:
                match_mode="exact_and_pdf_glyph_variants" if exact_ids else "pdf_glyph_search_variants"
            sql="SELECT p.pdf_page,p.printed_page,p.document_id,COALESCE(d.title,p.header,'فهرس المصدر') AS title,p.role,snippet(pages_fts,1,'[',']',' … ',36) AS match_excerpt,p.logical_text AS text FROM pages_fts JOIN pdf_pages p ON p.pdf_page=pages_fts.pdf_page LEFT JOIN compendium_documents d ON d.id=p.document_id WHERE "+where+" ORDER BY CASE WHEN p.role IN ('body','annex','appendix') THEN 0 ELSE 1 END,bm25(pages_fts),p.pdf_page LIMIT ?"
            rows=[dict(r) for r in conn.execute(sql,params+[limit])]
            for row in rows:
                row["match_mode"]="exact_normalized" if row["pdf_page"] in exact_ids else "pdf_glyph_search_variants"
            if conn.execute("SELECT 1 FROM sqlite_master WHERE name='ocr_candidates_fts'").fetchone():
                candidate_match=" AND ".join("("+" OR ".join('"'+v+'"' for v in glyph_variants(t))+")" for t in tokens)
                params=[candidate_match]
                condition="ocr_candidates_fts MATCH ?"
                if document_id:
                    condition+=" AND p.document_id=?";params.append(document_id)
                params.append(limit)
                ocr_candidates=[dict(r) for r in conn.execute("SELECT o.pdf_page,p.printed_page,p.document_id,o.xref,a.relative_path AS source_image,a.sha256 AS source_image_sha256 FROM ocr_candidates_fts o JOIN pdf_pages p ON p.pdf_page=o.pdf_page JOIN image_assets a ON a.xref=o.xref WHERE "+condition+" ORDER BY bm25(ocr_candidates_fts) LIMIT ?",params)]
                for item in ocr_candidates:
                    item.update(answer_eligible=False,review_status="needs_visual_review",reason="Match in unreviewed OCR; inspect the source image before quoting names, codes or numbers.")
        else:
            raise ValueError("Unknown command")
        if command!="documents":
            for item in rows:
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='source_lines'").fetchone():
                    zones=[]
                    for line in conn.execute("SELECT line_no,kind FROM source_lines WHERE pdf_page=? ORDER BY line_no",(item["pdf_page"],)):
                        if line["kind"] in ("blank","header","navigation"):
                            continue
                        if zones and zones[-1]["kind"]==line["kind"] and zones[-1]["line_end"]==line["line_no"]-1:
                            zones[-1]["line_end"]=line["line_no"];zones[-1]["line_count"]+=1
                        else:
                            zones.append({"kind":line["kind"],"line_start":line["line_no"],"line_end":line["line_no"],"line_count":1})
                    item["page_content_zones"]=zones
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='inline_annotations'").fetchone():
                    end=item.get("end_page",item["pdf_page"])
                    item["inline_page_annotations"]=[dict(r) for r in conn.execute("SELECT pdf_page,line_no,char_start,char_end,kind,text FROM inline_annotations WHERE pdf_page BETWEEN ? AND ?",(item["pdf_page"],end))]
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='page_subsections'").fetchone():
                    item["page_subsections"]=[dict(r) for r in conn.execute("SELECT * FROM page_subsections WHERE pdf_page=?",(item["pdf_page"],))]
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='source_issues'").fetchone():
                    item["source_issues"]=[dict(r) for r in conn.execute("SELECT * FROM source_issues WHERE document_id=?",(item["document_id"],)) if (command=="article" and article_key(r["article_number"])==article_key(number)) or (command!="article" and r["pdf_page"]==item["pdf_page"])]
                    if any(r["kind"]=="source_text_truncated" for r in item["source_issues"]):
                        item["source_completeness"]="truncated_in_supplied_pdf"
                        item["complete_article_verified"]=False
                layers=[]
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_ocr'").fetchone():
                    layers=[dict(r) for r in conn.execute("SELECT text,mean_word_confidence,review_status,xref FROM image_ocr WHERE pdf_page=? ORDER BY xref",(item["pdf_page"],))]
                if layers:
                    item["image_ocr_layers"]=layers
                    item["image_ocr_requires_review"]=True
                    item["image_ocr_answer_eligible"]=False
                if conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_transcriptions'").fetchone():
                    reviewed=[dict(r) for r in conn.execute("SELECT id,text,cells_json,review_status,review_method,source_image_sha256 FROM image_transcriptions WHERE pdf_page=?",(item["pdf_page"],))]
                    if reviewed:
                        item["reviewed_image_transcriptions"]=reviewed
        ambiguous=command=="article" and len({r.get("component_id",r["id"]) for r in rows})>1
        status="source_text_available" if rows else "source_range_notice" if range_notices else "quoted_excerpt_only" if quoted_provisions else "needs_image_review" if ocr_candidates else "not_found"
        if source_issues:
            status="source_incomplete" if any(x["kind"]=="source_text_truncated" for x in source_issues) else "source_text_available_with_issues" if rows else "source_gap"
        return {"scope":"bound_file_only","network_used":False,"current_law_verified":False,"source":source,"command":command,"match_mode":match_mode,"search_variants":variants_used,**match_counts,"result_count":len(rows),"results":rows,"article_text_available":bool(rows) if command=="article" else None,"requires_component_selection":ambiguous,"requires_article_selection":command=="article" and len(rows)>1,"related_quoted_provisions":quoted_provisions,"article_range_notices":range_notices,"source_issues":source_issues,"related_numbered_provisions":related_numbers,"unreviewed_ocr_candidates":ocr_candidates,"candidate_count":len(ocr_candidates),"answer_status":status,"not_found":not bool(rows or ocr_candidates or quoted_provisions or range_notices or source_issues)}
    finally:
        conn.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",required=True)
    sub=parser.add_subparsers(dest="command",required=True)
    search=sub.add_parser("search")
    search.add_argument("query")
    search.add_argument("--document-id")
    search.add_argument("--limit",type=int,default=10)
    article=sub.add_parser("article")
    article.add_argument("--document-id",required=True)
    article.add_argument("--number",required=True)
    article.add_argument("--component-id")
    article.add_argument("--article-id")
    p=sub.add_parser("page")
    p.add_argument("page",type=int)
    docs=sub.add_parser("documents")
    docs.add_argument("query",nargs="?",default="")
    args=parser.parse_args()
    try:
        result=query_corpus(args.db,args.command,getattr(args,"query",""),getattr(args,"document_id",None),getattr(args,"number",None),getattr(args,"page",None),getattr(args,"limit",10),getattr(args,"component_id",None),getattr(args,"article_id",None))
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except (ValueError,OSError,sqlite3.Error) as exc:
        print(json.dumps({"error":str(exc)},ensure_ascii=False),file=sys.stderr)
        return 2
    return 0


if __name__=="__main__":
    raise SystemExit(main())

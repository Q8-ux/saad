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


def glyph_variants(token):
    # Observed PDF ligature mapping defects; search alternatives only, never text edits.
    swaps={"لا":"ال","لم":"مل","لى":"ىل","لي":"يل","في":"يف","ني":"ين","ري":"ير","شر":"رش"}
    if len(token)<4:
        return [token]
    variants={token,re.sub("|".join(swaps),lambda m:swaps[m[0]],token)}
    variants.update(token.replace(a,b) for a,b in swaps.items() if a in token)
    return sorted(variants)


def query_corpus(db, command, query="", document_id=None, number=None, page=None, limit=10):
    if not 1<=limit<=100:
        raise ValueError("limit must be between 1 and 100")
    conn=sqlite3.connect(Path(db).resolve().as_uri()+"?mode=ro",uri=True)
    conn.row_factory=sqlite3.Row
    try:
        source=dict(conn.execute("SELECT id,name,sha256,pages,legal_currency FROM source_documents LIMIT 1").fetchone())
        match_mode="exact_normalized"
        variants_used={}
        if command=="documents":
            rows=[dict(r) for r in conn.execute("SELECT id,title,start_page,end_page,kind,boundary_method FROM compendium_documents ORDER BY start_page")]
            if query:
                terms=normalize(query).split()
                rows=[r for r in rows if all(t in normalize(r["title"]) for t in terms)]
        elif command=="page":
            if page is None or not 1<=page<=source["pages"]:
                raise ValueError("Page outside source PDF")
            rows=[dict(r) for r in conn.execute("SELECT p.pdf_page,p.printed_page,p.document_id,COALESCE(d.title,p.header,'فهرس المصدر') AS title,p.role,p.logical_text AS text,p.quality_flags_json FROM pdf_pages p LEFT JOIN compendium_documents d ON p.document_id=d.id WHERE p.pdf_page=?",(page,))]
        elif command=="article":
            if not document_id or not number:
                raise ValueError("Specify document_id and number; article numbers are not globally unique")
            rows=[]
            sql="SELECT a.*,d.title,p.printed_page FROM article_fragments a JOIN compendium_documents d ON a.document_id=d.id JOIN pdf_pages p ON a.pdf_page=p.pdf_page WHERE a.document_id=? ORDER BY a.pdf_page,a.line_start"
            for r in conn.execute(sql,(document_id,)):
                if number_key(r["number"])==number_key(number):
                    item=dict(r)
                    item["context_pages"]=[n for n in (r["pdf_page"]-1,r["pdf_page"],r["pdf_page"]+1) if 1<=n<=source["pages"]]
                    item["complete_article_verified"]=False
                    rows.append(item)
        elif command=="search":
            tokens=re.findall(r"[^\W_]+",normalize(query),re.UNICODE)
            if not tokens:
                raise ValueError("Empty search query")
            match=" AND ".join('"'+t+'"' for t in tokens)
            params=[match]
            where="pages_fts MATCH ?"
            if document_id:
                where+=" AND p.document_id=?"
                params.append(document_id)
            params.append(limit)
            sql="SELECT p.pdf_page,p.printed_page,p.document_id,COALESCE(d.title,p.header,'فهرس المصدر') AS title,p.role,snippet(pages_fts,1,'[',']',' … ',36) AS match_excerpt,p.logical_text AS text FROM pages_fts JOIN pdf_pages p ON p.pdf_page=pages_fts.pdf_page LEFT JOIN compendium_documents d ON d.id=p.document_id WHERE "+where+" ORDER BY CASE WHEN p.role IN ('body','annex') THEN 0 ELSE 1 END,bm25(pages_fts),p.pdf_page LIMIT ?"
            rows=[dict(r) for r in conn.execute(sql,params)]
            if not rows:
                variants_used={token:glyph_variants(token) for token in tokens}
                params[0]=" AND ".join("("+" OR ".join('"'+v+'"' for v in variants_used[t])+")" for t in tokens)
                rows=[dict(r) for r in conn.execute(sql,params)]
                if rows:
                    match_mode="pdf_glyph_search_variants"
        else:
            raise ValueError("Unknown command")
        if command!="documents" and conn.execute("SELECT 1 FROM sqlite_master WHERE name='image_ocr'").fetchone():
            for item in rows:
                layers=[dict(r) for r in conn.execute("SELECT text,mean_word_confidence,review_status,xref FROM image_ocr WHERE pdf_page=? ORDER BY xref",(item["pdf_page"],))]
                if layers:
                    item["image_ocr_layers"]=layers
                    item["image_ocr_requires_review"]=True
        return {"scope":"bound_file_only","network_used":False,"current_law_verified":False,"source":source,"command":command,"match_mode":match_mode,"search_variants":variants_used,"result_count":len(rows),"results":rows,"not_found":not bool(rows)}
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
    p=sub.add_parser("page")
    p.add_argument("page",type=int)
    docs=sub.add_parser("documents")
    docs.add_argument("query",nargs="?",default="")
    args=parser.parse_args()
    try:
        result=query_corpus(args.db,args.command,getattr(args,"query",""),getattr(args,"document_id",None),getattr(args,"number",None),getattr(args,"page",None),getattr(args,"limit",10))
        print(json.dumps(result,ensure_ascii=False,indent=2))
    except (ValueError,OSError,sqlite3.Error) as exc:
        print(json.dumps({"error":str(exc)},ensure_ascii=False),file=sys.stderr)
        return 2
    return 0


if __name__=="__main__":
    raise SystemExit(main())

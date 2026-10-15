#!/usr/bin/env python3
"""Extract a legal PDF compendium losslessly by page, with provisional article spans.

Dependencies: PyMuPDF and Poppler pdftotext. Source text and provisional structure
are separate; no extracted record is automatically approved as current law.
"""
import argparse
import collections
import hashlib
import html
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parent))
from legal_index import ingest, normalize

BIDI = re.compile(r"[\u202a-\u202e\u2066-\u2069\u200e\u200f]")
DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
ARTICLE = re.compile(r"^(?:المادة|املادة|مادة|ماده)\s*[:(（\[]*\s*(?P<number>[0-9]{1,4})\s*[)）\]]*\s*(?P<suffix>مكرر(?:ا)?(?:\s*[«(]?\s*[0-9أابجدهوزحطيك]+\s*[») ]*)?)?\s*[:.\-]*\s*$")
ORDINALS = {"اولى":"1", "أولى":"1", "أويل":"1", "أوىل":"1", "االولى":"1", "األولى":"1", "ثانية":"2", "الثانية":"2", "ثالثة":"3", "الثالثة":"3", "رابعة":"4", "الرابعة":"4", "خامسة":"5", "الخامسة":"5", "سادسة":"6", "السادسة":"6", "سابعة":"7", "السابعة":"7", "ثامنة":"8", "الثامنة":"8", "تاسعة":"9", "التاسعة":"9", "عاشرة":"10", "العاشرة":"10"}


def clean(text):
    return BIDI.sub("", unicodedata.normalize("NFKC", text)).replace("ـ", "").translate(DIGITS)


def line_key(text):
    return " ".join(clean(text).split())


def article_number(line):
    value = line_key(line)
    value = re.sub(r"\s*\({2,}\s*$", "", value)
    match = ARTICLE.fullmatch(value)
    if match:
        suffix = re.sub(r"[«»()\[\]]", " ", match["suffix"] or "")
        suffix = re.sub(r"مكررا", "مكرر", suffix)
        suffix = " ".join(suffix.split())
        return str(int(match["number"])) + (" " + suffix if suffix else "")
    match = re.fullmatch(r"(?:المادة|املادة|مادة|ماده)\s+([^:]+)\s*:?(?:\s*\({2,})?", value)
    return ORDINALS.get(match[1].strip()) if match else None


def source_labels(page, rect, data):
    labels = []
    for block in data["blocks"]:
        for line in block.get("lines", []):
            spans = [s for s in line["spans"] if rect.y0 <= s["origin"][1] <= rect.y1 and rect.x0 <= s["origin"][0] <= rect.x1]
            if spans:
                labels.append((max(s["size"] for s in spans), "".join(s["text"] for s in spans).strip()))
    return labels


def decode_destination(value):
    try:
        return value.encode("latin1").decode("utf8")
    except UnicodeError:
        return value


def title_tokens(value):
    return set(normalize(value).replace("الالئحة", "لائحة").split())


def build(args):
    out = Path(args.output_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)
    source = Path(args.pdf).resolve()
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    source_id = args.source_id or "pdf-" + source_hash[:16]
    doc = fitz.open(source)
    poppler_path = out / "all-pages-layout.txt"
    extraction = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(source), str(poppler_path)], capture_output=True, text=True)
    if extraction.returncode:
        raise RuntimeError("pdftotext failed: " + extraction.stderr[-2000:])
    (out / "extraction-warnings.txt").write_text(extraction.stderr, encoding="utf8")
    pages = poppler_path.read_text(encoding="utf8").split("\f")
    if not pages[-1].strip():
        pages.pop()
    if len(pages) != len(doc):
        raise RuntimeError(f"Page count mismatch: {len(pages)} text / {len(doc)} PDF")

    names = doc.resolve_names()
    flags = fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES
    data0 = doc[0].get_text("dict", flags=flags)
    section_index, group_index = {}, []
    for link in doc[0].get_links():
        destination = names.get(decode_destination(link.get("nameddest", "")))
        if not destination:
            continue
        labels = source_labels(doc[0], link["from"], data0)
        if not labels:
            continue
        title = max(labels, key=lambda item: item[0])[1]
        page_no = destination["page"] + 1
        is_group = bool(re.match(r"^(?:قوانين|القوانني|قوانني|الدستور ومجلس)", title))
        if not is_group and (len(labels)>1 or re.match(r"^(?:قانون|القانون|دستور|نظام|الئحة|الالئحة)", title)):
            section_index[page_no] = {"title": title, "boundary_method": "source_main_index_link", "labels": [x[1] for x in labels]}
        else:
            group_index.append({"page": page_no, "title": title})

    headers, layouts = [], []
    for index, page in enumerate(doc):
        data = page.get_text("dict", flags=flags)
        layouts.append(data)
        lines = []
        for block in data["blocks"]:
            for line in block.get("lines", []):
                spans = line["spans"]
                if spans and min(s["origin"][1] for s in spans) < page.rect.height * .06:
                    lines.append((min(s["origin"][1] for s in spans), "".join(s["text"] for s in spans).strip()))
        lines.sort()
        headers.append(lines[0][1] if lines else "")
        if (index + 1) % 200 == 0:
            print(f"Read page layouts {index+1}/{len(doc)}", flush=True)

    # Supplement the source's first-page index with recurring headings, including annexes.
    starts = sorted(section_index)
    for i, header in enumerate(headers):
        if not header or (i and header == headers[i-1]):
            continue
        if not re.match(r"^(?:الالئحة التنفيذية|الئحة قانون|جداول مواد|مخالفات قانون|المدد|ضوابط)", header):
            continue
        if headers[i:i+2].count(header) < 2:
            continue
        start = i + 1
        # An immediately preceding short cover page belongs to this heading.
        if i and not any(article_number(l) for l in pages[i-1].splitlines()):
            previous = clean(pages[i-1]).strip()
            previous_is_toc = bool(re.search(r"الصفحة\s+(?:املواد|المواد)|(?:املواد|المواد)\s+الصفحة",previous[:700]))
            short_matching_cover = len(previous)<700 and line_key(header) in line_key(previous)
            if short_matching_cover or previous_is_toc:
                start -= 1
        if start not in section_index:
            section_index[start] = {"title": header, "boundary_method": "recurring_header_provisional", "labels": []}
    starts = sorted(section_index)
    documents = []
    for n, start in enumerate(starts):
        end = starts[n+1]-1 if n+1 < len(starts) else len(doc)
        item = section_index[start]
        title = item["title"]
        sample = clean("\n".join(pages[start-1:min(start+1, len(pages))]))
        law_number = re.search(r"رقم\s*[(\s]*([0-9]+)", sample)
        law_year = re.search(r"لسنة\s*([0-9]{4})", sample)
        kind = "regulation" if re.match(r"^(?:الالئحة|الئحة|ضوابط)", title) else "annex" if re.match(r"^(?:جداول|مخالفات|المدد)", title) else "legislation_section"
        documents.append(dict(id=f"{source_hash[:12]}-d{start:04d}", title=title, start_page=start, end_page=end, kind=kind,
                              reported_number=law_number[1] if law_number else None, reported_year=law_year[1] if law_year else None,
                              boundary_method=item["boundary_method"], labels=item["labels"]))

    db = out / "kuwait_laws_database.sqlite"
    if db.exists():
        raise RuntimeError("Refusing to replace an existing corpus; use a new output directory")
    conn = sqlite3.connect(db)
    conn.executescript("""
    PRAGMA foreign_keys=ON;
    CREATE TABLE source_documents(id TEXT PRIMARY KEY,name TEXT,source_url TEXT,sha256 TEXT,bytes INTEGER,pages INTEGER,metadata_json TEXT,legal_currency TEXT);
    CREATE TABLE compendium_documents(id TEXT PRIMARY KEY,title TEXT,start_page INTEGER,end_page INTEGER,kind TEXT,reported_number TEXT,reported_year TEXT,boundary_method TEXT,labels_json TEXT);
    CREATE TABLE pdf_pages(pdf_page INTEGER PRIMARY KEY,printed_page TEXT,document_id TEXT,header TEXT,role TEXT,logical_text TEXT,raw_text TEXT,text_sha256 TEXT,width REAL,height REAL,quality_flags_json TEXT);
    CREATE VIRTUAL TABLE pages_fts USING fts5(pdf_page UNINDEXED,body);
    CREATE VIRTUAL TABLE pages_vocab USING fts5vocab(pages_fts,'row');
    CREATE TABLE text_blocks(id INTEGER PRIMARY KEY,pdf_page INTEGER,block_no INTEGER,bbox_json TEXT,lines_json TEXT);
    CREATE TABLE pdf_links(id INTEGER PRIMARY KEY,pdf_page INTEGER,kind INTEGER,destination_page INTEGER,uri TEXT,label TEXT,bbox_json TEXT,named_destination TEXT);
    CREATE TABLE image_assets(xref INTEGER PRIMARY KEY,width INTEGER,height INTEGER,extension TEXT,sha256 TEXT,relative_path TEXT);
    CREATE TABLE image_occurrences(pdf_page INTEGER,xref INTEGER,bbox_json TEXT);
    CREATE TABLE extracted_tables(id INTEGER PRIMARY KEY,pdf_page INTEGER,bbox_json TEXT,cells_json TEXT,review_status TEXT);
    CREATE TABLE article_fragments(id TEXT PRIMARY KEY,document_id TEXT,number TEXT,pdf_page INTEGER,line_start INTEGER,line_end INTEGER,heading TEXT,text TEXT,boundary_status TEXT);
    CREATE TABLE reference_mentions(id INTEGER PRIMARY KEY,pdf_page INTEGER,article_number TEXT,context TEXT,resolved_target TEXT);
    CREATE TABLE qa_findings(id INTEGER PRIMARY KEY,scope TEXT,location TEXT,category TEXT,detail TEXT);
    CREATE TABLE corpus_stats(key TEXT PRIMARY KEY,value_json TEXT);
    """)
    conn.execute("INSERT INTO source_documents VALUES (?,?,?,?,?,?,?,?)", (source_id,args.source_title or source.name,args.source_url,source_hash,source.stat().st_size,len(doc),json.dumps(doc.metadata,ensure_ascii=False),"not_independently_verified"))
    for item in documents:
        conn.execute("INSERT INTO compendium_documents VALUES (?,?,?,?,?,?,?,?,?)", tuple(item[k] for k in ("id","title","start_page","end_page","kind","reported_number","reported_year","boundary_method"))+(json.dumps(item["labels"],ensure_ascii=False),))

    records, fragments, empty_body_pages, low_text_pages = [], [], [], []
    group_titles = {item["page"]:item["title"] for item in group_index}
    image_count = table_count = links_count = block_count = reference_count = 0
    asset_dir = out / "assets"
    asset_dir.mkdir(exist_ok=True)
    active_doc = None
    page_export = (out / "pages.jsonl").open("w",encoding="utf8")
    for i,page in enumerate(doc):
        p = i + 1
        for item in documents:
            if item["start_page"] <= p <= item["end_page"]:
                active_doc = item
                break
        else:
            active_doc = None
        if p in group_titles:
            active_doc = None
        logical = clean(pages[i])
        raw = page.get_text()
        lines = logical.splitlines()
        printed = None
        for line in lines[-12:]:
            match = re.search(r"[-–]\s*([0-9]{1,4})\s*[-–]",line)
            if match:
                printed = match[1]
        if printed is None:
            footer=re.search(r"[-–]\s*([0-9]{1,4}(?:\s*[أ-يA-Za-z])?)\s*[-–]",clean(raw))
            if footer:
                printed=" ".join(footer[1].split())
        compact = "\n".join(line.strip() for line in lines if line.strip())
        is_toc = bool(re.search(r"الصفحة\s+(?:املواد|المواد)|(?:املواد|المواد)\s+الصفحة",compact[:700])) or ("الفهرس" in compact[:250] and len(page.get_links())>5)
        role = "contents" if is_toc else "annex" if active_doc and active_doc["kind"]=="annex" else "body"
        if p == 1:
            role = "source_index"
        elif p in group_titles:
            role = "group_contents"
            headers[i] = group_titles[p]
        quality = []
        if len(compact)<150:
            low_text_pages.append(p)
            quality.append("low_text_requires_visual_review")
        if not compact:
            empty_body_pages.append(p)
            quality.append("no_extracted_text")
        if "\ufffd" in logical:
            quality.append("unicode_replacement_character")
        clean_hash = hashlib.sha256(logical.encode()).hexdigest()
        conn.execute("INSERT INTO pdf_pages VALUES (?,?,?,?,?,?,?,?,?,?,?)", (p,printed,active_doc["id"] if active_doc else None,headers[i],role,logical,raw,clean_hash,page.rect.width,page.rect.height,json.dumps(quality)))
        conn.execute("INSERT INTO pages_fts VALUES (?,?)",(p,normalize(compact)))
        page_export.write(json.dumps({"pdf_page":p,"printed_page":printed,"document_id":active_doc["id"] if active_doc else None,"role":role,"text":logical,"raw_text":raw,"sha256":clean_hash,"quality_flags":quality},ensure_ascii=False)+"\n")

        for bno,block in enumerate(layouts[i]["blocks"]):
            small_lines=[]
            for line in block.get("lines",[]):
                small_lines.append({"bbox":line["bbox"],"direction":line["dir"],"spans":[{"text":s["text"],"font":s["font"],"size":s["size"],"origin":s["origin"],"bbox":s["bbox"]} for s in line["spans"]]})
            conn.execute("INSERT INTO text_blocks(pdf_page,block_no,bbox_json,lines_json) VALUES (?,?,?,?)",(p,bno,json.dumps(block["bbox"]),json.dumps(small_lines,ensure_ascii=False)))
            block_count+=1
        for link in page.get_links():
            name=decode_destination(link.get("nameddest",""))
            dest=names.get(name)
            destination = dest.get("page",-1)+1 if dest else link.get("page",-1)+1 if link.get("page") is not None else None
            labels=source_labels(page,link["from"],layouts[i])
            conn.execute("INSERT INTO pdf_links(pdf_page,kind,destination_page,uri,label,bbox_json,named_destination) VALUES (?,?,?,?,?,?,?)",(p,link["kind"],destination,link.get("uri"),"\n".join(x[1] for x in labels),json.dumps(tuple(link["from"])),name or None))
            links_count+=1
        for image in page.get_images(full=True):
            xref=image[0]
            exists=conn.execute("SELECT 1 FROM image_assets WHERE xref=?",(xref,)).fetchone()
            if not exists:
                extracted=doc.extract_image(xref)
                rel=f"assets/image-{xref}.{extracted['ext']}"
                (out/rel).write_bytes(extracted["image"])
                conn.execute("INSERT INTO image_assets VALUES (?,?,?,?,?,?)",(xref,extracted["width"],extracted["height"],extracted["ext"],hashlib.sha256(extracted["image"]).hexdigest(),rel))
                image_count+=1
            for rect in page.get_image_rects(xref):
                conn.execute("INSERT INTO image_occurrences VALUES (?,?,?)",(p,xref,json.dumps(tuple(rect))))

        # Preserve detected table cells independently; page text/PDF remain authoritative.
        if re.search(r"(?:جدول|جداول)",compact) and p>1:
            try:
                tables=page.find_tables(strategy="lines_strict")
                for table in tables.tables:
                    cells=table.extract()
                    if len(cells)>1 and max((len(r) for r in cells),default=0)>1:
                        conn.execute("INSERT INTO extracted_tables(pdf_page,bbox_json,cells_json,review_status) VALUES (?,?,?,?)",(p,json.dumps(table.bbox),json.dumps(cells,ensure_ascii=False),"needs_review"))
                        table_count+=1
            except Exception as exc:
                conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("page",str(p),"table_extraction_failed",type(exc).__name__))

        headings=[]
        if role=="body" and active_doc:
            for n,line in enumerate(lines):
                number=article_number(line)
                if number:
                    headings.append((n,number,line.strip()))
                elif len(line_key(line))<65 and re.match(r"^(?:المادة|املادة|مادة|ماده)\b",line_key(line)):
                    conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("page",f"{p}:{n+1}","unparsed_article_like_line",line.strip()))
        for h,(line_start,number,label) in enumerate(headings):
            line_end=headings[h+1][0] if h+1<len(headings) else len(lines)
            body="\n".join(lines[line_start:line_end]).strip()
            # Remove footer navigation, while preserving all page text separately.
            body=re.split(r"\n[^\n]*(?:الصفحة الرئيسية|فهرس القانون|فهرس الدستور|فهرس الئحة)",body)[0].rstrip()
            rid=f"{active_doc['id']}-p{p:04d}-a{h+1:02d}"
            fragments.append(dict(id=rid,document_id=active_doc["id"],number=number,pdf_page=p,line_start=line_start+1,line_end=line_end,heading=label,text=body,boundary_status="provisional_page_fragment"))
            record={"id":rid,"jurisdiction":"KW","kind":"article","document_id":active_doc["id"],"title":active_doc["title"],"number":number,"text":body,"text_sha256":hashlib.sha256(body.encode()).hexdigest(),"source_url":args.source_url+f"#page={p}","source_locator":f"PDF page {p}; printed page {printed or 'unresolved'}; lines {line_start+1}-{line_end}","source_sha256":source_hash,"provenance":"user_document","verification_status":"needs_review","verified_by":None,"verified_at":None,"temporal_status":"unknown","checked_through":None,"temporal_evidence":None,"valid_from":None,"valid_to":None,"fixture":False,"pdf_page":p,"printed_page":printed,"heading_original":label,"boundary_status":"provisional_page_fragment","source_document_id":source_id}
            records.append(record)
        for match in re.finditer(r"(?:المادة|املادة|مادة)\s*[( ]*([0-9]{1,4})(?:\s*مكرر(?:ا)?)?",logical):
            conn.execute("INSERT INTO reference_mentions(pdf_page,article_number,context,resolved_target) VALUES (?,?,?,NULL)",(p,match[1],logical[max(0,match.start()-70):match.end()+110]))
            reference_count+=1
        if p%200==0:
            conn.commit()
            print(f"Indexed pages {p}/{len(doc)}; article fragments {len(records)}",flush=True)
    page_export.close()
    for f in fragments:
        conn.execute("INSERT INTO article_fragments VALUES (?,?,?,?,?,?,?,?,?)",tuple(f[k] for k in ("id","document_id","number","pdf_page","line_start","line_end","heading","text","boundary_status")))
    # Completeness is page-level. Fragments are deliberately not merged across pages.
    all_numbers=collections.Counter((r["document_id"],r["number"]) for r in records)
    duplicates=[{"document_id":k[0],"number":k[1],"occurrences":v} for k,v in all_numbers.items() if v>1]
    claim = re.search(r"(?:التعديلات|التعديالت)\s+حتى\s+([0-9]{4})\s*/\s*([0-9]{1,2})\s*/\s*([0-9]{1,2})",clean(pages[0]))
    edition_claim = f"{claim[1]}-{int(claim[2]):02d}-{int(claim[3]):02d}" if claim else None
    stats={"source_name":args.source_title or source.name,"source_sha256":source_hash,"source_bytes":source.stat().st_size,"pdf_pages":len(doc),"indexed_pages":len(pages),"pages_with_text":sum(bool(p.strip()) for p in pages),"pages_without_text":empty_body_pages,"low_text_pages":low_text_pages,"logical_characters":sum(len(clean(p)) for p in pages),"document_sections":len(documents),"document_boundary_methods":dict(collections.Counter(d["boundary_method"] for d in documents)),"article_fragments":len(records),"article_identity_candidates":len(all_numbers),"duplicate_article_identities":len(duplicates),"text_blocks":block_count,"pdf_links":links_count,"unique_images":image_count,"detected_tables":table_count,"reference_mentions":reference_count,"approved_current_legal_records":0,"legal_currency_verified":False,"article_boundaries_verified":False,"extraction_method":"Poppler logical layout + PyMuPDF raw text, geometry, links and assets","source_edition_claim":edition_claim,"generated_at":datetime.now(timezone.utc).isoformat(),"limitations":["Article records are page fragments; cross-page continuations remain in complete page text and require boundary review.","PDF font mappings contain Arabic character-order defects; original PDF and raw text are preserved, with no silent spelling repair.","The source's claimed amendment coverage has not been independently verified.","Detected tables are provisional; full page text, geometry and original PDF retain tables not detected automatically."]}
    conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("corpus","all","legal_currency_not_verified","All extracted article fragments remain needs_review; no official-source or effective-date approval performed."))
    for item in duplicates:
        conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("article",item["document_id"]+":"+item["number"],"repeated_article_number",json.dumps(item,ensure_ascii=False)))
    for key,value in stats.items():
        conn.execute("INSERT INTO corpus_stats VALUES (?,?)",(key,json.dumps(value,ensure_ascii=False)))
    conn.commit()
    conn.close()
    ingest_result=ingest(records,db)
    (out/"legal_records.jsonl").write_text("".join(json.dumps(r,ensure_ascii=False)+"\n" for r in records),encoding="utf8")
    (out/"documents.json").write_text(json.dumps(documents,ensure_ascii=False,indent=2),encoding="utf8")
    (out/"source-groups.json").write_text(json.dumps(group_index,ensure_ascii=False,indent=2),encoding="utf8")
    (out/"analysis.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf8")
    (out/"repeated-article-numbers.json").write_text(json.dumps(duplicates,ensure_ascii=False,indent=2),encoding="utf8")
    shutil.copy2(Path(__file__).with_name("legal_index.py"),out/"legal_index.py")
    print(json.dumps({"database":str(db),"stats":stats,"ingest":ingest_result},ensure_ascii=False),flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf",required=True)
    parser.add_argument("--output-dir",required=True)
    parser.add_argument("--source-url",required=True)
    parser.add_argument("--source-id")
    parser.add_argument("--source-title")
    args=parser.parse_args()
    build(args)


if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""Attach source-grounded article continuations, without rewriting source pages.

Every assembled segment points to exact character offsets in immutable page text.
Small-font notes, navigation, explanatory commentary and structural headings stay
available in their own layers. Boundary inference is not transcription approval.
"""
import argparse
import collections
import hashlib
import json
import re
import sqlite3
from pathlib import Path

from import_compendium import article_number, clean
from legal_index import normalize


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def bag(value):
    return "".join(sorted(re.findall(r"[^\W_]", normalize(clean(value)))))


def line_geometry(conn, page):
    groups = collections.defaultdict(list)
    raw = []
    for row in conn.execute("SELECT lines_json FROM text_blocks WHERE pdf_page=?", (page,)):
        for line in json.loads(row[0]):
            spans = line["spans"]
            text = "".join(s["text"] for s in spans)
            if not text.strip():
                continue
            item = {"bbox": line["bbox"], "max_size": max(s["size"] for s in spans), "text": text}
            groups[bag(text)].append(item)
            raw.append(item)
    return groups, raw


def classify_page(conn, page):
    text, height, width = page["logical_text"], page["height"], page["width"]
    geometries, raw = line_geometry(conn, page["pdf_page"])
    sizes = collections.Counter(round(r["max_size"]) for r in raw if .06*height<r["bbox"][1]<.95*height)
    body_size = sizes.most_common(1)[0][0] if sizes else 48
    lines, offset = [], 0
    for n, original in enumerate(text.splitlines(keepends=True), 1):
        value = original.rstrip("\r\n")
        key = bag(value)
        candidates = geometries.get(key, []) if key else []
        geom = candidates[0] if len(candidates)==1 else None
        label = "body" if value.strip() else "blank"
        confidence = "text_rule"
        if value.strip():
            if "الصفحة الرئيسية" in value or "فهرس القانون" in value or "فهرس الدستور" in value:
                label = "navigation"
            elif ((geom and (geom["bbox"][1]+geom["bbox"][3])/2<.06*height) or n<=2) and not article_number(value):
                label = "header"
            elif geom and geom["max_size"]<.70*body_size and geom["bbox"][1]>.45*height:
                label, confidence = "footnote", "source_font_geometry"
            elif re.match(r"^(?:الباب|الفصل|الفرع|القسم|الكتاب)\s+", value.strip()) and len(value.strip())<95:
                if geom and geom["bbox"][0]>.10*width and geom["bbox"][2]<.90*width:
                    label, confidence = "structural_heading", "source_text_and_geometry"
        lines.append({"line_no":n, "start":offset, "end":offset+len(value), "text":value,
                      "kind":label, "classification":confidence, "geometry":geom})
        offset += len(original)
    # Font encodings occasionally split a footnote differently in Poppler and
    # MuPDF. Detect its source token bag across adjacent logical lines as well.
    for note in raw:
        if note["max_size"]>=.70*body_size or note["bbox"][1]<=.45*height:
            continue
        target = bag(note["text"])
        if not target:
            continue
        for i in range(max(2, int(len(lines)*.55)), len(lines)):
            for length in (1,2,3):
                chunk=lines[i:i+length]
                if len(chunk)!=length or any(l["kind"] in ("header","navigation") for l in chunk):
                    continue
                if bag(" ".join(l["text"] for l in chunk))==target:
                    for line in chunk:
                        line.update(kind="footnote", classification="source_font_geometry", geometry=note)
    if page["role"]!="body":
        for line in lines:
            if line["kind"] not in ("blank","header","navigation"):
                line["kind"]=page["role"]
    return lines


def signature_start(lines, i):
    key = normalize(lines[i]["text"])
    if key not in ("امير الكويت", "امري الكويت", "امير دولة الكويت", "امري دولة الكويت", "رئيس مجلس الوزراء"):
        return False
    following=[]
    for line in lines[i+1:i+18]:
        if article_number(line["text"]):
            break
        following.append(normalize(line["text"]))
    return any("صدر" in s and ("قصر" in s or "قرص" in s) for s in following)


def refine(db, output_dir):
    root=Path(output_dir);root.mkdir(parents=True,exist_ok=True)
    conn=sqlite3.connect(db);conn.row_factory=sqlite3.Row
    source=dict(conn.execute("SELECT * FROM source_documents LIMIT 1").fetchone())
    previous={(r["pdf_page"],r["line_start"]):r["id"] for r in conn.execute("SELECT * FROM article_fragments")}
    conn.executescript("""
    DROP TABLE IF EXISTS source_lines;
    DROP TABLE IF EXISTS article_units;
    DROP TABLE IF EXISTS article_segments;
    DROP TABLE IF EXISTS article_annotations;
    DROP TABLE IF EXISTS commentary_headings;
    CREATE TABLE source_lines(pdf_page INTEGER,line_no INTEGER,char_start INTEGER,char_end INTEGER,
      kind TEXT,classification TEXT,text TEXT,geometry_json TEXT,PRIMARY KEY(pdf_page,line_no));
    CREATE TABLE article_units(id TEXT PRIMARY KEY,document_id TEXT,component_id TEXT,number TEXT,
      heading TEXT,start_page INTEGER,end_page INTEGER,text TEXT,text_sha256 TEXT,boundary_method TEXT,
      boundary_review TEXT,complete_article_verified INTEGER DEFAULT 0,transcription_verified INTEGER DEFAULT 0,
      source_sha256 TEXT,review_notes_json TEXT);
    CREATE TABLE article_segments(article_id TEXT,seq INTEGER,pdf_page INTEGER,line_start INTEGER,line_end INTEGER,
      char_start INTEGER,char_end INTEGER,text TEXT,text_sha256 TEXT,PRIMARY KEY(article_id,seq));
    CREATE TABLE article_annotations(article_id TEXT,pdf_page INTEGER,line_no INTEGER,kind TEXT,text TEXT);
    CREATE TABLE commentary_headings(document_id TEXT,pdf_page INTEGER,line_no INTEGER,number TEXT,text TEXT);
    """)
    pages={p["pdf_page"]:dict(p) for p in conn.execute("SELECT * FROM pdf_pages ORDER BY pdf_page")}
    all_lines={}
    memo_doc=None
    for p,page in pages.items():
        if page["document_id"]!=memo_doc:
            memo_doc=None
        lines=classify_page(conn,page)
        signing=False
        for i,line in enumerate(lines):
            v=normalize(line["text"]).replace("املذكرة","المذكرة")
            if line["kind"]=="body" and re.fullmatch(r"(?:ال)?مذكرة (?:التفسيرية|التفسريية|الايضاحية|الايضاحية)",v):
                memo_doc=page["document_id"]
                line["kind"]="commentary_start"
            elif memo_doc and memo_doc==page["document_id"] and line["kind"]=="body":
                line["kind"]="commentary"
            if line["kind"]=="body" and signature_start(lines,i):
                signing=True
            if signing and article_number(line["text"]):
                signing=False
            if signing and line["kind"] in ("body","structural_heading"):
                line["kind"]="signature"
        # Short centred text immediately before an article is section context.
        for i,line in enumerate(lines):
            if not article_number(line["text"]) or line["kind"]!="body":
                continue
            for before in reversed(lines[max(0,i-3):i]):
                if before["kind"]=="blank":
                    continue
                g=before["geometry"]
                if before["kind"]=="body" and not article_number(before["text"]) and len(before["text"].strip())<65 and g and g["bbox"][0]>.16*page["width"] and g["bbox"][2]<.84*page["width"] and abs((g["bbox"][0]+g["bbox"][2])/2-page["width"]/2)<.06*page["width"]:
                    before["kind"]="structural_heading"
                else:
                    break
        for line in lines:
            conn.execute("INSERT INTO source_lines VALUES (?,?,?,?,?,?,?,?)",(p,line["line_no"],line["start"],line["end"],line["kind"],line["classification"],line["text"],json.dumps(line["geometry"],ensure_ascii=False)))
        all_lines[p]=lines

    fragments=[];units=[];headings=[];unparsed=[]
    for p,page in pages.items():
        if page["role"]!="body" or not page["document_id"]:
            continue
        for line in all_lines[p]:
            number=article_number(line["text"])
            if number and line["kind"]=="commentary":
                conn.execute("INSERT INTO commentary_headings VALUES (?,?,?,?,?)",(page["document_id"],p,line["line_no"],number,line["text"].strip()))
            elif number and line["kind"]=="body":
                headings.append({"page":p,"line":line["line_no"],"number":number,"heading":line["text"].strip(),"document_id":page["document_id"]})
            elif line["kind"]=="body" and len(line["text"].strip())<65 and re.match(r"^(?:المادة|املادة|مادة|ماده)\b",line["text"].strip()):
                unparsed.append({"pdf_page":p,"line":line["line_no"],"text":line["text"].strip()})
    run=0;previous_doc=None;previous_base=None;previous_unit=None
    for index,h in enumerate(headings):
        p,n=h["page"],h["line"]
        original_id=previous.get((p,n),f"{h['document_id']}-p{p:04d}-l{n:03d}")
        same_page=next((x["line"] for x in headings[index+1:] if x["page"]==p),None)
        fragment_end=same_page-1 if same_page else len(all_lines[p])
        ftext="\n".join(l["text"] for l in all_lines[p][n-1:fragment_end]).strip()
        ftext=re.split(r"\n[^\n]*(?:الصفحة الرئيسية|فهرس القانون|فهرس الدستور|فهرس الئحة)",ftext)[0].rstrip()
        fragments.append({"id":original_id,"document_id":h["document_id"],"number":h["number"],"pdf_page":p,"line_start":n,"line_end":fragment_end,"heading":h["heading"],"text":ftext,"boundary_status":"provisional_page_fragment"})
        next_h=headings[index+1] if index+1<len(headings) else None
        next_same=next_h and next_h["document_id"]==h["document_id"]
        doc_end=conn.execute("SELECT end_page FROM compendium_documents WHERE id=?",(h["document_id"],)).fetchone()[0]
        end_page=next_h["page"] if next_same else doc_end
        included=[];excluded=[];boundary="next_article_heading" if next_same else "document_end_unverified"
        stopped=False
        for q in range(p,end_page+1):
            if pages[q]["document_id"]!=h["document_id"] or pages[q]["role"]!="body":
                boundary="non_body_page_boundary";break
            # Do not silently flow article prose through a scanned annex.
            if q>p and conn.execute("SELECT 1 FROM image_occurrences o JOIN image_assets a USING(xref) WHERE o.pdf_page=? AND a.width>700 AND a.height>700",(q,)).fetchone():
                boundary="source_image_boundary";break
            start=n if q==p else 1
            end=next_h["line"]-1 if next_same and q==next_h["page"] else len(all_lines[q])
            for line in all_lines[q][start-1:end]:
                if line["kind"] in ("signature","commentary_start","commentary"):
                    boundary="signature" if line["kind"]=="signature" else "commentary_start"
                    stopped=True;break
                if line["kind"] in ("body","blank"):
                    included.append((q,line))
                elif line["kind"] not in ("header","navigation"):
                    excluded.append((q,line))
            if stopped:
                break
        while included and included[-1][1]["kind"]=="blank":
            included.pop()
        groups=[]
        for q,line in included:
            if groups and groups[-1][-1][0]==q and groups[-1][-1][1]["line_no"]==line["line_no"]-1:
                groups[-1].append((q,line))
            else:
                groups.append([(q,line)])
        segments=[]
        for group in groups:
            q=group[0][0];a,b=group[0][1],group[-1][1]
            value=pages[q]["logical_text"][a["start"]:b["end"]]
            if value.strip():
                segments.append({"pdf_page":q,"line_start":a["line_no"],"line_end":b["line_no"],"char_start":a["start"],"char_end":b["end"],"text":value,"text_sha256":digest(value)})
        base=int(h["number"].split()[0])
        if previous_doc!=h["document_id"] or (base==1 and previous_base is not None and previous_base>1) or (previous_unit and previous_unit["boundary_method"]=="signature"):
            run+=1
        previous_doc,previous_base=h["document_id"],base
        value="\n\n".join(s["text"] for s in segments)
        uid=original_id+"-assembled"
        notes=[]
        if not next_same and boundary=="document_end_unverified":
            notes.append("End of last article requires source review; no next heading.")
        if any(q!=p for q,_ in included):
            notes.append("Continuation attached from following source page(s).")
        unit={"id":uid,"document_id":h["document_id"],"component_id":f"{h['document_id']}-run{run:04d}","number":h["number"],"heading":h["heading"],"start_page":p,"end_page":segments[-1]["pdf_page"] if segments else p,"text":value,"text_sha256":digest(value),"boundary_method":boundary,"boundary_review":"inferred_from_source_markers","complete_article_verified":0,"transcription_verified":0,"source_sha256":source["sha256"],"review_notes_json":json.dumps(notes,ensure_ascii=False)}
        conn.execute("INSERT INTO article_units VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",tuple(unit.values()))
        for seq,s in enumerate(segments,1):
            conn.execute("INSERT INTO article_segments VALUES (?,?,?,?,?,?,?,?,?)",(uid,seq,s["pdf_page"],s["line_start"],s["line_end"],s["char_start"],s["char_end"],s["text"],s["text_sha256"]))
        for q,line in excluded:
            conn.execute("INSERT INTO article_annotations VALUES (?,?,?,?,?)",(uid,q,line["line_no"],line["kind"],line["text"]))
        units.append(unit);previous_unit=unit
    with conn:
        conn.execute("DELETE FROM article_fragments")
        conn.executemany("INSERT INTO article_fragments VALUES (?,?,?,?,?,?,?,?,?)",[tuple(f.values()) for f in fragments])
        conn.execute("DELETE FROM records")
        records=[]
        for f in fragments:
            page=pages[f["pdf_page"]]
            title=conn.execute("SELECT title FROM compendium_documents WHERE id=?",(f["document_id"],)).fetchone()[0]
            record={**f,"jurisdiction":"KW","kind":"article","title":title,"text_sha256":digest(f["text"]),"source_url":source["source_url"]+f"#page={f['pdf_page']}","source_locator":f"PDF page {f['pdf_page']}; printed page {page['printed_page'] or 'unresolved'}; lines {f['line_start']}-{f['line_end']}","source_sha256":source["sha256"],"provenance":"user_document","verification_status":"needs_review","temporal_status":"unknown","source_document_id":source["id"],"printed_page":page["printed_page"],"verified_by":None,"verified_at":None,"valid_from":None,"valid_to":None,"fixture":False}
            records.append(record)
            conn.execute("INSERT INTO records VALUES (?,?,?,?,?,?)",(f["id"],"KW","article",f["document_id"],normalize(f["number"]).replace(" ",""),json.dumps(record,ensure_ascii=False)))
        conn.execute("DROP TABLE lookup")
        conn.execute("CREATE VIRTUAL TABLE lookup USING fts5(id UNINDEXED,body)")
        conn.executemany("INSERT INTO lookup VALUES (?,?)",[(r["id"],normalize(r["text"])) for r in records])
        stats={"article_fragments":len(fragments),"article_units":len(units),"cross_page_article_units":sum(u["end_page"]>u["start_page"] for u in units),"separated_footnote_lines":conn.execute("SELECT count(*) FROM source_lines WHERE kind='footnote'").fetchone()[0],"separated_commentary_headings":conn.execute("SELECT count(*) FROM commentary_headings").fetchone()[0],"remaining_article_like_lines":len(unparsed),"article_boundary_methods":dict(collections.Counter(u["boundary_method"] for u in units)),"article_assembly_method":"exact page substrings with source offsets; separate notes and commentary; source-marker boundaries", "complete_articles_visually_verified":0}
        identities=collections.Counter((f["document_id"],f["number"]) for f in fragments)
        duplicates=[{"document_id":k[0],"number":k[1],"occurrences":v} for k,v in identities.items() if v>1]
        stats.update(article_identity_candidates=len(identities),duplicate_article_identities=len(duplicates))
        conn.execute("DELETE FROM qa_findings WHERE category IN ('unparsed_article_like_line','repeated_article_number')")
        for item in unparsed:
            conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("page",f"{item['pdf_page']}:{item['line']}","unparsed_article_like_line",item["text"]))
        for item in duplicates:
            conn.execute("INSERT INTO qa_findings(scope,location,category,detail) VALUES (?,?,?,?)",("article",item["document_id"]+":"+item["number"],"repeated_article_number",json.dumps(item,ensure_ascii=False)))
        for k,v in stats.items():
            conn.execute("INSERT OR REPLACE INTO corpus_stats VALUES (?,?)",(k,json.dumps(v,ensure_ascii=False)))
        conn.execute("PRAGMA user_version=4")
    for name,rows in (("assembled_articles.jsonl",units),("legal_records.jsonl",records)):
        (root/name).write_text("".join(json.dumps(u,ensure_ascii=False)+"\n" for u in rows),encoding="utf8")
    (root/"repeated-article-numbers.json").write_text(json.dumps(duplicates,ensure_ascii=False,indent=2),encoding="utf8")
    (root/"article-refinement.json").write_text(json.dumps({"stats":stats,"unparsed_lines":unparsed},ensure_ascii=False,indent=2),encoding="utf8")
    analysis=root/"analysis.json"
    value=json.loads(analysis.read_text());value.update(stats)
    value["limitations"]=[s for s in value.get("limitations",[]) if not s.startswith("Article records are page fragments")]
    value["limitations"].append("Articles have source-grounded continuations and separate annotations; inferred boundaries and unreviewed glyphs must not be presented as fully verified transcription.")
    analysis.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding="utf8")
    conn.close()
    return stats


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",required=True)
    parser.add_argument("--output-dir",required=True)
    args=parser.parse_args()
    print(json.dumps(refine(args.db,args.output_dir),ensure_ascii=False,indent=2))

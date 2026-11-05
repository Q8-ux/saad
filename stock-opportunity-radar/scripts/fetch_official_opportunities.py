#!/usr/bin/env python3
"""Fetch *verifiable* public opportunities from official GCC government pages.

Runs in GitHub Actions. No demo records, fabricated opportunities, paid APIs,
robots bypassing, or silent reuse of stale tenders. All observations have
source URL, fetch time and an explicit source/data status.
"""
from __future__ import annotations
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
import sys
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

OUT = Path(__file__).resolve().parents[1] / "data" / "live.json"
USER_AGENT = "GulfOpportunityRadar/1.0 (public-information index; source links; respectful rate limits)"
SOURCES = [
    {"id":"bh-tenders","country":"bh","type":"government_tender","name":"Bahrain Tender Board","url":"https://www.tenderboard.gov.bh/Tenders/PublicTenders","fallback":"https://www.tenderboard.gov.bh/tenders","parser":"bahrain"},
    {"id":"om-invest","country":"om","type":"investment_project","name":"Invest Oman","url":"https://investoman.om/investment-opportunities","fallback":"https://www.investoman.om/investment-opportunities","parser":"oman"},
]
# Explicitly not ingested: Etimad's anti-automation challenge, access-controlled
# portals in UAE and Qatar, and any portal lacking a tested public data interface.
MANUAL_SOURCES = [
    {"id":"sa-etimad","country":"sa","name":"Saudi Etimad","url":"https://tenders.etimad.sa/","status":"portal_only","reason":"Automated access is challenged; do not bypass anti-bot checks"},
    {"id":"ae-esupply","country":"ae","name":"Dubai eSupply","url":"https://esupply.dubai.gov.ae/esupply/web/index.html","status":"portal_only","reason":"Supplier portal; public listing access is not yet validated"},
    {"id":"qa-monaqasat","country":"qa","name":"Qatar government procurement","url":"https://hukoomi.gov.qa/en/services/search-for-bids-on-monaqasat-portal-of-mof","status":"portal_only","reason":"Government landing page, no verified public feed"},
    {"id":"kw-kdipa","country":"kw","name":"Kuwait KDIPA","url":"https://kdipa.gov.kw/","status":"portal_only","reason":"Official investment gateway without validated live listing feed"},
]

def compact(value: str) -> str:
    return " ".join(str(value).replace("\u00a0", " ").split()).strip()

def parse_date(s: str) -> str | None:
    txt = compact(s).replace(",", " ")
    txt = re.sub(r"\s+", " ", txt)
    # Published dates in Tender Board normally "04, Nov,2026"
    for fmt in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(txt, fmt).date().isoformat()
        except ValueError:
            pass
    return None

def make_id(source: str, title: str, agency: str = "") -> str:
    return hashlib.sha256((source+"|"+title+"|"+agency).encode()).hexdigest()[:20]

def valid_url(link: str, allowed_hosts: set[str]) -> str | None:
    try:
        u = urlparse(link)
        return link if u.scheme == "https" and u.hostname in allowed_hosts else None
    except ValueError:
        return None

def bahrain(soup: BeautifulSoup, root: str, now: datetime) -> list[dict]:
    found = {}
    # Data must be present in the public HTML: request > table > real dated row.
    # Never infer project names from page titles, search snippets or advertisements.
    for table in soup.select("table"):
        headings=[compact(x.get_text(" ",strip=True)).lower() for x in table.select("thead th, tr th")]
        header=" ".join(headings)
        header_is_tender="published date" in header and "closing date" in header
        if not header_is_tender:
            continue
        for tr in table.select("tr"):
            cells=tr.find_all("td",recursive=False)
            if len(cells)<7:
                continue
            fields=[compact(x.get_text(" ",strip=True)) for x in cells[:7]]
            ordinal, subject, tender_type, authority, published, purchase_before, closing=fields
            posted=parse_date(published)
            closes=parse_date(closing)
            if not (re.fullmatch(r"\d{1,3}",ordinal) and posted and closes and len(subject)>=15 and len(authority)>=3):
                continue
            # Allow only open/current tenders at the time of retrieval.
            if closes<now.date().isoformat() or posted>now.date().isoformat() or posted<(now.date()-timedelta(days=100)).isoformat():
                continue
            if len(subject)>320:
                continue
            href=None
            for a in cells[1].select("a[href]"):
                href=valid_url(urljoin(root,a.get("href","")),{"www.tenderboard.gov.bh","tenderboard.gov.bh"})
                if href:break
            entry={
                "id":make_id("bh-tenders",subject,authority),
                "country":"bh","kind":"tender","title":subject,
                "agency":authority,"tender_type":tender_type,
                "posted_at":posted,"closes_at":closes,"value":None,
                "source_id":"bh-tenders","source_name":"Bahrain Tender Board",
                "source_url":href or root,"link_scope":"detail" if href else "official_listing",
                "basis":"Official published tender notice; check eligibility and documents at source",
                "observed_at":now.isoformat().replace("+00:00","Z")
            }
            found[entry["id"]]=entry
    return list(found.values())[:60]

def oman(soup: BeautifulSoup, root: str, now: datetime) -> list[dict]:
    found={}
    # Invest Oman displays project cards (possibly rendered client side).
    # Do not pass generic sector articles as currently available projects.
    candidates=soup.select("article, .card, .opportunity-card, [class*='opportunity-item'], [class*='opportunity-card']")
    for node in candidates:
        body=compact(node.get_text(" ",strip=True))
        if not (35<=len(body)<=1700 and "OMR" in body):
            continue
        amount=re.search(r"(?<!\w)([\d,]{5,})\s*OMR\b",body,re.I)
        if not amount:continue
        h=node.find(["h2","h3","h4","h5"])
        title=compact(h.get_text(" ",strip=True)) if h else ""
        if not (12<=len(title)<=160):continue
        link=None
        for anchor in node.select("a[href]"):
            link=valid_url(urljoin(root,anchor.get("href","")),{"investoman.om","www.investoman.om"})
            if link and "/investment-opportunities" in link:break
        if not link:link=root
        ident=make_id("om-invest",title)
        found[ident]={
            "id":ident,"country":"om","kind":"investment_project",
            "title":title,"agency":"Invest Oman",
            "posted_at":None,"closes_at":None,"value":amount.group(1)+" OMR",
            "source_id":"om-invest","source_name":"Invest Oman",
            "source_url":link,"link_scope":"detail" if link!=root else "official_listing",
            "basis":"Project in the government investment explorer; verify availability and stated capital",
            "observed_at":now.isoformat().replace("+00:00","Z")
        }
    return list(found.values())[:40]

def fetch(session: requests.Session, src: dict, now: datetime) -> tuple[list[dict],dict]:
    attempts = []
    for url in (src["url"],src["fallback"]):
        try:
            r=session.get(url,timeout=(9,22),allow_redirects=True)
            attempts.append({"url":url,"http":r.status_code})
            if r.status_code in (403,429,503):
                continue
            r.raise_for_status()
            if not valid_url(r.url,{"www.tenderboard.gov.bh","tenderboard.gov.bh","investoman.om","www.investoman.om"}):
                raise ValueError("Disallowed redirect host")
            if len(r.content)>5_000_000:
                raise ValueError("Excessive response size")
            html=r.text
            if any(x in html.lower() for x in ["please enable javascript to view the page content", "verify you are human", "captcha challenge"]):
                attempts[-1]["error"]="access_challenge"
                continue
            soup=BeautifulSoup(html,"html.parser")
            records=bahrain(soup,r.url,now) if src["parser"]=="bahrain" else oman(soup,r.url,now)
            if records:
                return records,{"id":src["id"],"country":src["country"],"name":src["name"],"url":src["url"],"status":"ok","records":len(records),"last_success_at":now.isoformat().replace("+00:00","Z"),"last_checked_at":now.isoformat().replace("+00:00","Z"),"details":"Freshly extracted from official public webpage"}
            attempts[-1]["error"]="no_verified_records"
        except (requests.RequestException,ValueError) as exc:
            attempts.append({"url":url,"error":type(exc).__name__})
    return [],{"id":src["id"],"country":src["country"],"name":src["name"],"url":src["url"],"status":"unavailable","records":0,"last_success_at":None,"last_checked_at":now.isoformat().replace("+00:00","Z"),"details":"No verified current records; source may require JavaScript, authorized API or a markup update","attempts":attempts}

def create_snapshot(session: requests.Session | None = None, now: datetime | None = None) -> dict:
    now=now or datetime.now(timezone.utc)
    session=session or requests.Session()
    session.headers.update({"User-Agent":USER_AGENT,"Accept":"text/html,application/xhtml+xml;q=0.9"})
    records,sources=[],[]
    for src in SOURCES:
        try:
            found,status=fetch(session,src,now)
        except Exception as exc:
            logging.exception("Official source failed")
            found,status=[],{"id":src["id"],"country":src["country"],"name":src["name"],"url":src["url"],"status":"error","records":0,"last_success_at":None,"last_checked_at":now.isoformat().replace("+00:00","Z"),"details":type(exc).__name__}
        records.extend(found);sources.append(status)
    sources.extend(MANUAL_SOURCES)
    return {"schema_version":1,"generated_at":now.isoformat().replace("+00:00","Z"),"refresh_interval_minutes":30,"records":sorted(records,key=lambda r:(r.get("posted_at") or "",r["title"]),reverse=True),"sources":sources,"count":len(records),"mode":"official-source snapshots; not a streaming market feed"}

def main():
    result=create_snapshot()
    OUT.parent.mkdir(parents=True,exist_ok=True)
    stage=OUT.with_suffix(".tmp")
    stage.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    stage.replace(OUT)
    print(json.dumps({"generated_at":result["generated_at"],"count":result["count"],"sources":[{"id":s["id"],"status":s["status"],"records":s.get("records",0),"attempts":s.get("attempts",[])} for s in result["sources"]]},ensure_ascii=False))
    if result["count"]==0:
        print("WARNING: no source yields validated records. Dashboard must show UNAVAILABLE, not sample data.",file=sys.stderr)
    return 0

if __name__=="__main__":
    raise SystemExit(main())

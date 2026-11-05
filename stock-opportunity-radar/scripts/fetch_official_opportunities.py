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


def render_public_browser_page(url: str, source: dict, now: datetime) -> list[dict]:
    """Render a public JS page like a normal visitor; never solve/bypass a challenge."""
    from playwright.sync_api import sync_playwright, Error as PlaywrightError
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(locale="en-US",viewport={"width":1300,"height":1000})
            page.goto(url,wait_until="domcontentloaded",timeout=30000)
            page.wait_for_timeout(5000)
            actual=page.url
            if not valid_url(actual,{"www.tenderboard.gov.bh","tenderboard.gov.bh","investoman.om","www.investoman.om"}):
                raise RuntimeError("Unexpected browser redirect host")
            text=page.locator("body").inner_text(timeout=10000)
            if any(flag in text.lower() for flag in ["verify you are human","captcha","support id:"]):
                raise RuntimeError("Access challenge presented; not attempting bypass")
            html=page.content()
            soup=BeautifulSoup(html,"html.parser")
            diagnostics=[]
            for needle in ("Develop Neighbourhood", "Livestock Fattening", "Smart Agricultural Cluster",
                           "Nuwab Public", "TRA/INTERNAL", "BTEA/051", "No./Tender Subject"):
                match=soup.find(string=lambda value: bool(value) and needle.casefold() in str(value).casefold())
                if not match: continue
                element=match.parent
                parents=[]
                for _ in range(5):
                    if not element: break
                    parents.append({"tag":element.name,"class":element.get("class",[]),
                                    "id":element.get("id",""),
                                    "text":compact(element.get_text(" ",strip=True))[:180]})
                    element=element.parent
                diagnostics.append({"needle":needle,"parents":parents,"html":str(match.parent.parent)[:1100]})
            print(json.dumps({"official_dom_diagnostics":source["id"],
                              "matches":diagnostics,"body_tail":compact(text)[-450:]},ensure_ascii=False),flush=True)
            print(json.dumps({
                "browser_diagnostics":source["id"],
                "html_bytes":len(html),
                "table_count":len(soup.select("table")),
                "table_headers":[compact(t.get_text(" ",strip=True))[:200] for t in soup.select("table thead")[:2]],
                "candidate_cards":len(soup.select("article, .card, .opportunity-card, [class*='opportunity-item'], [class*='opportunity-card']")),
                "body_snippet":compact(text)[:430],
            },ensure_ascii=False),flush=True)
            return bahrain(soup,actual,now) if source["parser"]=="bahrain" else oman(soup,actual,now)
        finally:
            browser.close()

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
            print(json.dumps({"html_diagnostics":src["id"],"url":r.url,"size":len(html),
                              "tables":len(soup.select("table")),"cards":len(soup.select("article, .card, .opportunity-card")),
                              "header_excerpt":compact(soup.get_text(" ",strip=True))[:360]},ensure_ascii=False),flush=True)
        except (requests.RequestException,ValueError) as exc:
            attempts.append({"url":url,"error":type(exc).__name__})
    # Official pages may render records only after their own JavaScript executes.
    # Normal public page rendering is used; protected pages are not bypassed.
    try:
        records=render_public_browser_page(src["url"],src,now)
        if records:
            return records,{"id":src["id"],"country":src["country"],"name":src["name"],"url":src["url"],"status":"ok","records":len(records),"last_success_at":now.isoformat().replace("+00:00","Z"),"last_checked_at":now.isoformat().replace("+00:00","Z"),"details":"Verified from rendered official public webpage"}
    except Exception as exc:
        print(json.dumps({"browser_error":src["id"],"reason":type(exc).__name__+":"+str(exc)[:150]}),flush=True)
        attempts.append({"url":src["url"],"error":"browser_"+type(exc).__name__})
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

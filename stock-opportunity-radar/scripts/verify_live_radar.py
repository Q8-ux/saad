#!/usr/bin/env python3
"""Read-only public browser smoke test for the real government-source radar."""
from datetime import datetime, timezone
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

PAGE="https://q8-ux.github.io/saad/stock-opportunity-radar/"
snapshot=json.loads(Path("stock-opportunity-radar/data/live.json").read_text(encoding="utf-8"))
expected=snapshot["count"]
age=(datetime.now(timezone.utc)-datetime.fromisoformat(snapshot["generated_at"].replace("Z","+00:00"))).total_seconds()
assert snapshot["schema_version"]==1
assert age<195*60, f"Snapshot is not fresh ({round(age)} seconds old)"
print("Expected official records:",expected,"snapshot age seconds:",round(age))
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        page=browser.new_page(locale="ar-KW",viewport={"width":1280,"height":1000})
        page_errors=[]
        page.on("pageerror",lambda error:page_errors.append(str(error)))
        response=page.goto(PAGE,wait_until="domcontentloaded",timeout=30000)
        assert response is not None and response.status==200, "GitHub Pages did not return HTTP 200"
        page.wait_for_selector("#radarCards",timeout=20000)
        page.wait_for_function("""() => {
          const el=document.getElementById('radarCount');
          return el && el.textContent.trim() !== '—';
        }""", timeout=25000)
        displayed=page.locator("#radarCards article.radar-card").count()
        counter=page.locator("#radarCount").inner_text()
        status=page.locator("#radarStatus").inner_text()
        source=page.locator("#radarConnected").inner_text()
        print(json.dumps({"url":PAGE,"expected":expected,"visible":displayed,"counter":counter,
                          "status":status,"source_status":source,"errors":page_errors},
                          ensure_ascii=False))
        assert not page_errors, f"JavaScript errors: {page_errors}"
        assert counter==str(expected),f"Expected {expected} real records, dashboard displays {counter}"
        assert displayed==expected,f"Expected {expected} source-linked cards, got {displayed}"
        assert page.locator('#radarCards a[href^="https://investoman.om/"]').count()>=min(expected,1)
        if expected>0:
            assert page.locator("#radarUpdated").inner_text()!="—", "Missing source timestamp"
            # Council is available only for current, official-source records.
            buttons=page.locator("#radarCards button.council-review-button")
            assert buttons.count()==expected, f"Expected {expected} Council actions, got {buttons.count()}"
            official=page.locator("#radarCards article.radar-card").first.locator("a[href^='https://']").first.get_attribute("href")
            buttons.first.click()
            panel=page.locator("#councilPanel")
            assert panel.is_visible(), "Council review panel did not open"
            assert page.locator("#councilVision li").count()>=2, "Opportunity analysis missing"
            assert page.locator("#councilRisk li").count()>=2, "Skeptic analysis missing"
            assert page.locator("#councilVerify li").count()>=2, "Evidence analysis missing"
            assert page.locator("#councilVerdict").inner_text().strip(), "Council conclusion missing"
            assert page.locator("#councilOfficialLink").get_attribute("href")==official, "Council source differs from official listing"
            page.locator("#councilClose").click()
            assert not panel.is_visible(), "Council panel did not close"
            page.locator("#language").select_option("en")
            assert "Council" in page.locator("#radarCards button.council-review-button").first.inner_text(), "Council translation missing"
            print("Council verified: current record, official link, three reviews, conclusion, close and locale switch")
        with open(__import__("os").environ["GITHUB_STEP_SUMMARY"],"a") as fp:
            fp.write(f"Live radar browser smoke passed: {displayed} official-source cards, {counter} in counter.\n")
    finally:
        browser.close()

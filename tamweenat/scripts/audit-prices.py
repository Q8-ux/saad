#!/usr/bin/env python3
"""Audit Tamweenat observed market prices; never invent or auto-approve sales prices."""
import json
from datetime import datetime, timezone
from pathlib import Path
catalog = Path("tamweenat/catalog-photos.json")
items = json.loads(catalog.read_text(encoding="utf-8"))
today = datetime.now(timezone.utc).date()
checked = [p for p in items if p.get("priceStatus") == "observed_market_price" and p.get("marketPriceSource")]
stale = [p for p in checked if (today - datetime.fromisoformat(p["marketPriceCheckedAt"]).date()).days > 1]
unverified = [p for p in items if p.get("priceStatus") != "observed_market_price"]
report = ["# Tamweenat market-price audit", f"Date: {today}", f"Observed prices: {len(checked)}", f"Stale (over 24 hours): {len(stale)}", f"Unverified: {len(unverified)}", "", "Price entries need exact-product verification before refresh. This audit does not scrape prices or publish unverified changes."]
for p in stale:
    report.append(f"- {p['id']}: {p['nameEn']} | last checked {p['marketPriceCheckedAt']} | source: {p['marketPriceSource']}")
Path("tamweenat/price-audit.md").write_text("\n".join(report)+"\n", encoding="utf-8")
print("\n".join(report[:5]))

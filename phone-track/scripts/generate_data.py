"""Generate static prefix metadata; never process subscriber records or live numbers."""
from collections import defaultdict
from datetime import date
from pathlib import Path
import json
import importlib.metadata
import shutil
import phonenumbers
from phonenumbers.geodata import GEOCODE_DATA
from phonenumbers.carrierdata import CARRIER_DATA
from phonenumbers.tzdata import TIMEZONE_DATA
from phonenumbers.phonenumberutil import _GEO_MOBILE_COUNTRIES, country_mobile_token

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/data"
OUT.mkdir(parents=True, exist_ok=True)
codes = set(map(str, phonenumbers.COUNTRY_CODE_TO_REGION_CODE))
groups = defaultdict(lambda: {"geo": {}, "carrier": {}, "timezone": {}})

def calling_code(prefix):
    for length in range(1, 4):
        if prefix[:length] in codes:
            return prefix[:length]
    raise ValueError("Unknown calling code in published metadata")

for kind, source in [("geo", GEOCODE_DATA), ("carrier", CARRIER_DATA), ("timezone", TIMEZONE_DATA)]:
    for prefix, value in source.items():
        if kind == "timezone":
            chosen = list(value)
        else:
            chosen = value.get("ar") or value.get("en")
        if chosen:
            groups[calling_code(prefix)][kind][prefix] = chosen

def pack(mapping):
    labels = []
    indexes = {}
    prefixes = {}
    for prefix, value in mapping.items():
        key = json.dumps(value, ensure_ascii=False)
        if key not in indexes:
            indexes[key] = len(labels)
            labels.append(value)
        prefixes[prefix] = indexes[key]
    return {"labels": labels, "prefixes": prefixes}

for code in codes:
    data = {kind: pack(mapping) for kind, mapping in groups[code].items()}
    (OUT / f"{code}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")

manifest = {
    "version": phonenumbers.__version__,
    "generatedAt": date.today().isoformat(),
    "source": "https://github.com/daviddrysdale/python-phonenumbers",
    "geoMobileCallingCodes": sorted(_GEO_MOBILE_COUNTRIES),
    "mobileTokens": {str(code): country_mobile_token(code) for code in phonenumbers.COUNTRY_CODE_TO_REGION_CODE if country_mobile_token(code)},
    "countryCallingCodes": sorted(codes, key=int),
}
(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n")
distribution = importlib.metadata.distribution("phonenumbers")
license_file = next(file for file in distribution.files if str(file).endswith("licenses/LICENSE"))
assets = ROOT / "public/assets"
assets.mkdir(parents=True, exist_ok=True)
shutil.copyfile(distribution.locate_file(license_file), assets / "LICENSE-phonenumbers.txt")
total = sum(p.stat().st_size for p in OUT.glob("*.json"))
print(f"Generated {len(codes)} calling-code chunks, {total:,} bytes, phonenumbers {phonenumbers.__version__}")

#!/usr/bin/env python3
"""Local JSONL/SQLite legal evidence index; review metadata is trusted input."""
import argparse
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit


def normalize(value):
    value = unicodedata.normalize("NFKC", str(value)).lower()
    value = value.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹أإآٱی", "01234567890123456789ااااي"))
    value = re.sub(r"[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]", "", value)
    return " ".join(value.split())


def number_key(value):
    return normalize(value).replace(" ", "")


def canonical(record):
    return json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def iso_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Expected YYYY-MM-DD")
    return date.fromisoformat(value)


def validate_record(record):
    if not isinstance(record, dict):
        raise ValueError("Record must be an object")
    for key in ("id", "jurisdiction", "kind", "document_id", "title", "number", "text", "text_sha256", "source_url", "source_locator"):
        if not isinstance(record.get(key), str) or not record[key].strip():
            raise ValueError(f"Missing or invalid {key}")
    if record["kind"] not in ("article", "case"):
        raise ValueError("kind must be article or case")
    for key, allowed in {
        "provenance": ("official", "user_document", "licensed_secondary"),
        "verification_status": ("verified", "unverified", "needs_review"),
        "temporal_status": ("verified", "unknown"),
    }.items():
        if record.get(key) not in allowed:
            raise ValueError(f"Invalid {key}")
    if "fixture" in record and not isinstance(record["fixture"], bool):
        raise ValueError("fixture must be a boolean")
    for key in ("verified_by", "temporal_evidence", "source_sha256", "court", "chamber"):
        if record.get(key) is not None and (not isinstance(record[key], str) or not record[key].strip()):
            raise ValueError(f"Invalid {key}")
    digest = hashlib.sha256(record["text"].encode("utf-8")).hexdigest()
    if record["text_sha256"] != digest:
        raise ValueError("text_sha256 does not match original text")
    if record.get("source_sha256") and not re.fullmatch(r"[0-9a-f]{64}", record["source_sha256"]):
        raise ValueError("Invalid source_sha256")
    source = urlsplit(record["source_url"])
    if source.scheme not in ("https", "private") or not source.netloc or source.username or source.password:
        raise ValueError("Expected HTTPS source or private reference without credentials")
    for key in ("verified_at", "checked_through", "valid_from", "valid_to", "decision_date"):
        if record.get(key) is not None:
            iso_date(record[key])
    if record.get("valid_to") and (not record.get("valid_from") or record["valid_to"] <= record["valid_from"]):
        raise ValueError("valid_to must be later than valid_from")
    if record.get("checked_through") and record.get("verified_at") and record["checked_through"] > record["verified_at"]:
        raise ValueError("checked_through cannot exceed verified_at")
    return record


def load_records(path):
    records, seen = [], set()
    with Path(path).open(encoding="utf-8-sig") as stream:
        for line_no, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                record = validate_record(json.loads(line))
                if record["id"] in seen:
                    raise ValueError("Duplicate record id")
                seen.add(record["id"])
                records.append(record)
            except (ValueError, TypeError) as exc:
                raise ValueError(f"Line {line_no}: {exc}") from exc
    if not records:
        raise ValueError("No records")
    return records


def blocking_reasons(record, as_of):
    iso_date(as_of)
    reasons = []
    if record.get("fixture"):
        reasons.append("synthetic_fixture")
    if record.get("verification_status") != "verified":
        reasons.append("text_not_verified")
    if record.get("provenance") != "official":
        reasons.append("primary_source_required")
    if not record.get("source_sha256") or not record.get("verified_by") or not record.get("verified_at"):
        reasons.append("review_provenance_missing")
    if record.get("temporal_status") != "verified" or not record.get("temporal_evidence"):
        reasons.append("temporal_review_missing")
    if not record.get("checked_through") or record["checked_through"] < as_of:
        reasons.append("review_does_not_cover_requested_date")
    if record["kind"] == "article":
        if not record.get("valid_from"):
            reasons.append("effective_date_missing")
        elif record["valid_from"] > as_of or (record.get("valid_to") and as_of >= record["valid_to"]):
            reasons.append("outside_version_period")
    else:
        if not record.get("court") or not record.get("chamber") or not record.get("decision_date"):
            reasons.append("case_metadata_missing")
        elif record["decision_date"] > as_of:
            reasons.append("judgment_after_requested_date")
    return reasons


def ingest(records, db):
    for record in records:
        validate_record(record)
    if len({r["id"] for r in records}) != len(records):
        raise ValueError("Duplicate record id")
    Path(db).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db)
    try:
        connection.executescript("""
        CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY, jurisdiction TEXT NOT NULL, kind TEXT NOT NULL,
          document_id TEXT NOT NULL, number_key TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS record_identity ON records(jurisdiction,kind,document_id,number_key);
        CREATE VIRTUAL TABLE IF NOT EXISTS lookup USING fts5(id UNINDEXED, body);
        """)
        inserted = 0
        with connection:
            for record in records:
                payload = canonical(record)
                existing = connection.execute("SELECT payload FROM records WHERE id=?", (record["id"],)).fetchone()
                if existing:
                    if existing[0] != payload:
                        raise ValueError(f"Immutable id collision: {record['id']}")
                    continue
                connection.execute("INSERT INTO records VALUES (?,?,?,?,?,?)", (
                    record["id"], record["jurisdiction"], record["kind"], record["document_id"], number_key(record["number"]), payload))
                body = normalize(" ".join(record[k] for k in ("title", "number", "text")))
                connection.execute("INSERT INTO lookup(id,body) VALUES (?,?)", (record["id"], body))
                inserted += 1
        return {"inserted": inserted, "unchanged": len(records) - inserted}
    finally:
        connection.close()


def search(db, query, jurisdiction, as_of, document_id=None, number=None, kind=None, include_review=False, limit=10):
    iso_date(as_of)
    if not 1 <= limit <= 100:
        raise ValueError("limit must be between 1 and 100")
    if not (query.strip() or number or document_id):
        raise ValueError("Provide query, number or document_id")
    connection = sqlite3.connect(Path(db).resolve().as_uri() + "?mode=ro", uri=True)
    try:
        clauses, params = ["r.jurisdiction=?"], [jurisdiction]
        join, ordering = "", "r.id"
        if query.strip():
            tokens = re.findall(r"[^\W_]+", normalize(query), re.UNICODE)
            if not tokens:
                raise ValueError("Query has no searchable tokens")
            join, ordering = " JOIN lookup ON lookup.id=r.id", "bm25(lookup),r.id"
            clauses.append("lookup MATCH ?")
            params.append(" AND ".join('"' + token + '"' for token in tokens))
        for value, column in ((document_id, "document_id"), (kind, "kind")):
            if value is not None:
                clauses.append(f"r.{column}=?")
                params.append(value)
        if number is not None:
            clauses.append("r.number_key=?")
            params.append(number_key(number))
        sql = "SELECT r.payload FROM records r" + join + " WHERE " + " AND ".join(clauses) + " ORDER BY " + ordering
        result, overlap_cache = [], {}
        for row in connection.execute(sql, params):
            record = json.loads(row[0])
            reasons = blocking_reasons(record, as_of)
            if not reasons and record["kind"] == "article":
                identity = (jurisdiction, record["document_id"], number_key(record["number"]))
                if identity not in overlap_cache:
                    versions = connection.execute("SELECT payload FROM records WHERE jurisdiction=? AND document_id=? AND number_key=? AND kind='article'", identity)
                    overlap_cache[identity] = sum(not blocking_reasons(json.loads(v[0]), as_of) for v in versions)
                if overlap_cache[identity] > 1:
                    reasons.append("ambiguous_overlapping_versions")
            if reasons and not include_review:
                continue
            result.append({"record": record, "as_of": as_of, "evidence_eligible": not reasons, "blocking_reasons": reasons})
            if len(result) >= limit:
                break
        return result
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("validate", "ingest"):
        sub = commands.add_parser(name)
        sub.add_argument("file")
        if name == "ingest":
            sub.add_argument("--db", required=True)
    sub = commands.add_parser("search")
    sub.add_argument("query", nargs="?", default="")
    sub.add_argument("--db", required=True)
    sub.add_argument("--jurisdiction", required=True)
    sub.add_argument("--as-of", required=True)
    sub.add_argument("--document-id")
    sub.add_argument("--number")
    sub.add_argument("--kind", choices=("article", "case"))
    sub.add_argument("--include-review", action="store_true")
    sub.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()
    try:
        if args.command == "validate":
            result = {"valid_records": len(load_records(args.file))}
        elif args.command == "ingest":
            result = ingest(load_records(args.file), args.db)
        else:
            result = search(args.db, args.query, args.jurisdiction, args.as_of, args.document_id, args.number, args.kind, args.include_review, args.limit)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, TypeError, OSError, sqlite3.Error) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

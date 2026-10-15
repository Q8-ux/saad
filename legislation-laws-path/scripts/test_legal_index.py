#!/usr/bin/env python3
"""Synthetic, temporary data only: these tests verify code, not any real law."""
import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from legal_index import blocking_reasons, ingest, normalize, search, validate_record


def sample(**updates):
    record = dict(id="test-a-v1", jurisdiction="KW", kind="article", document_id="TEST-ONLY-DOC",
                  title="وثيقة اختبار اصطناعية لا تمثل قانوناً", number="١ مكرر", text="نص اختبار: بُطلان الإعْلان.",
                  source_url="https://example.invalid/test-document", source_locator="test page 1",
                  source_sha256="a" * 64, provenance="official", verification_status="verified",
                  verified_by="synthetic-test-reviewer", verified_at="2026-10-15", temporal_status="verified",
                  checked_through="2026-10-15", temporal_evidence="SYNTHETIC TEST ONLY",
                  valid_from="2020-01-01", valid_to=None, fixture=False)
    record.update(updates)
    record["text_sha256"] = hashlib.sha256(record["text"].encode()).hexdigest()
    return record


class IndexTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = str(Path(self.tmp.name) / "corpus.sqlite")

    def tearDown(self):
        self.tmp.cleanup()

    def find(self, query="", **kw):
        return search(self.db, query, kw.pop("jurisdiction", "KW"), kw.pop("as_of", "2026-10-15"), **kw)

    def test_arabic_search_keeps_original(self):
        original = sample()
        ingest([original], self.db)
        found = self.find("بطلان الاعلان")
        self.assertEqual(found[0]["record"]["text"], original["text"])
        self.assertTrue(found[0]["evidence_eligible"])
        self.assertEqual(normalize("١۲٣"), "123")

    def test_number_and_document_scope(self):
        ingest([sample(), sample(id="other", document_id="OTHER", number="١")], self.db)
        self.assertEqual(len(self.find(number="1مكرر", document_id="TEST-ONLY-DOC")), 1)
        self.assertEqual(self.find(number="1", document_id="TEST-ONLY-DOC"), [])
        self.assertEqual(self.find(number="999"), [])

    def test_jurisdiction_isolation(self):
        ingest([sample()], self.db)
        self.assertEqual(self.find("الإعلان", jurisdiction="OTHER"), [])

    def test_version_boundary(self):
        ingest([sample(valid_to="2023-01-01"), sample(id="test-a-v2", valid_from="2023-01-01")], self.db)
        self.assertEqual(self.find("الإعلان", as_of="2022-12-31")[0]["record"]["id"], "test-a-v1")
        self.assertEqual(self.find("الإعلان", as_of="2023-01-01")[0]["record"]["id"], "test-a-v2")

    def test_overlapping_versions_block_even_with_different_words(self):
        ingest([sample(), sample(id="overlap", text="نص تجريبي مختلف")], self.db)
        self.assertEqual(self.find("الإعلان"), [])
        self.assertIn("ambiguous_overlapping_versions", self.find("الإعلان", include_review=True)[0]["blocking_reasons"])

    def test_stale_unverified_secondary_and_fixture_are_blocked(self):
        for changes in (dict(checked_through="2025-01-01"), dict(verification_status="needs_review"),
                        dict(provenance="user_document"), dict(fixture=True), dict(temporal_status="unknown"),
                        dict(source_sha256=None), dict(verified_by=None)):
            with self.subTest(changes=changes):
                self.assertTrue(blocking_reasons(sample(**changes), "2026-10-15"))
        ingest([sample(fixture=True)], self.db)
        self.assertEqual(self.find("الإعلان"), [])
        self.assertFalse(self.find("الإعلان", include_review=True)[0]["evidence_eligible"])

    def test_hash_and_date_integrity(self):
        damaged = sample()
        damaged["text"] += "تعديل"
        with self.assertRaises(ValueError):
            validate_record(damaged)
        with self.assertRaises(ValueError):
            validate_record(sample(valid_to="2019-01-01"))
        with self.assertRaises(ValueError):
            validate_record(sample(checked_through="2027-01-01"))

    def test_reimport_and_collision_rollback(self):
        original = sample()
        self.assertEqual(ingest([original], self.db)["inserted"], 1)
        self.assertEqual(ingest([deepcopy(original)], self.db)["unchanged"], 1)
        with self.assertRaises(ValueError):
            ingest([sample(id="new-id"), sample(text="نص مختلف")], self.db)
        with sqlite3.connect(self.db) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM records").fetchone()[0], 1)

    def test_case_separate_and_future_judgment(self):
        record = sample(kind="case", court="محكمة اختبار", chamber="دائرة اختبار", decision_date="2024-01-01")
        ingest([record], self.db)
        self.assertEqual(self.find("الإعلان", kind="article"), [])
        self.assertEqual(len(self.find("الإعلان", kind="case")), 1)
        self.assertEqual(self.find("الإعلان", as_of="2023-12-31"), [])

    def test_cli_and_query_syntax(self):
        source = Path(self.tmp.name) / "records.jsonl"
        source.write_text(json.dumps(sample(), ensure_ascii=False) + "\n", encoding="utf-8")
        script = str(Path(__file__).with_name("legal_index.py"))
        for args in (["validate", str(source)], ["ingest", str(source), "--db", self.db],
                     ["search", "الإعلان", "--db", self.db, "--jurisdiction", "KW", "--as-of", "2026-10-15"]):
            result = subprocess.run([sys.executable, script, *args], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            json.loads(result.stdout)
        self.assertEqual(self.find('" OR *'), [])


if __name__ == "__main__":
    unittest.main(verbosity=2)

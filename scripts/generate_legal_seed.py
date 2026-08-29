#!/usr/bin/env python3
"""Build the deployable D1 seed from the verified legal SQLite archive."""

from __future__ import annotations

import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path


ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
ALEF_VARIANTS = str.maketrans(
    {
        "أ": "ا",
        "إ": "ا",
        "آ": "ا",
        "ٱ": "ا",
        "ى": "ي",
        "ؤ": "و",
        "ئ": "ي",
        "ة": "ه",
    }
)
DIACRITICS_RE = re.compile(r"[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]")
TOKEN_RE = re.compile(r"[A-Za-z0-9\u0621-\u063a\u0641-\u064a]+")
WHITESPACE_RE = re.compile(r"\s+")
LATIN_FRAGMENT_RE = re.compile(r"(?<![A-Za-z])[A-Za-z]+(?![A-Za-z])")
LEGAL_MARKERS = {
    "المادة": 8,
    "مادة": 6,
    "الطعن": 9,
    "جلسة": 7,
    "المحكمة": 5,
    "القانون": 4,
    "الحكم": 4,
    "قضت": 6,
    "مؤدى": 6,
    "أثره": 6,
    "الطلبات": 4,
    "التزام": 4,
    "البطلان": 5,
}


def clean_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).replace("\x00", " ")
    return WHITESPACE_RE.sub(" ", text).strip()


def clean_ocr_noise(value: object) -> str:
    text = clean_text(value)
    arabic_count = sum("\u0600" <= char <= "\u06ff" for char in text)
    latin_fragments = LATIN_FRAGMENT_RE.findall(text)
    if arabic_count >= 40 and len(latin_fragments) >= 3:
        text = LATIN_FRAGMENT_RE.sub(" ", text)
    return WHITESPACE_RE.sub(" ", text).strip()


def normalize_arabic(value: object) -> str:
    text = clean_text(value).translate(ARABIC_DIGITS).translate(ALEF_VARIANTS)
    text = DIACRITICS_RE.sub("", text).lower()
    return " ".join(TOKEN_RE.findall(text))


def search_terms(value: object, limit: int | None = None) -> str:
    seen: set[str] = set()
    ordered: list[str] = []
    for token in normalize_arabic(value).split():
        if len(token) < 2 or token in seen:
            continue
        seen.add(token)
        ordered.append(token)
        if limit and len(ordered) >= limit:
            break
    return " ".join(ordered)


def representative_excerpt(value: object, max_chars: int = 1250) -> str:
    text = clean_text(value)
    if len(text) <= max_chars:
        return text

    candidates = {0, max(0, len(text) - max_chars)}
    for start in range(0, len(text), 550):
        candidates.add(min(start, len(text) - max_chars))
    for marker in LEGAL_MARKERS:
        cursor = 0
        while True:
            index = text.find(marker, cursor)
            if index < 0:
                break
            candidates.add(max(0, min(index - 260, len(text) - max_chars)))
            cursor = index + len(marker)

    best_start = 0
    best_score = float("-inf")
    for start in candidates:
        window = text[start : start + max_chars]
        arabic_count = sum("\u0600" <= char <= "\u06ff" for char in window)
        latin_count = sum("a" <= char.lower() <= "z" for char in window)
        score = arabic_count / max(1, len(window)) * 32
        score -= latin_count / max(1, len(window)) * 24
        score += sum(window.count(marker) * weight for marker, weight in LEGAL_MARKERS.items())
        score += min(12, len(re.findall(r"\d+", window))) * 0.4
        if score > best_score:
            best_start = start
            best_score = score

    excerpt = text[best_start : best_start + max_chars]
    if best_start > 0:
        first_space = excerpt.find(" ")
        if 0 <= first_space < 80:
            excerpt = excerpt[first_space + 1 :]
    return excerpt.strip()


def sql_value(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def statement(sql: str) -> str:
    return f"{sql};\n--> statement-breakpoint\n"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: generate_legal_seed.py SOURCE.sqlite MIGRATION.sql")

    source = Path(sys.argv[1]).resolve()
    migration = Path(sys.argv[2]).resolve()
    if not source.is_file() or migration.suffix != ".sql":
        raise SystemExit("source database or migration path is invalid")

    connection = sqlite3.connect(source)
    connection.row_factory = sqlite3.Row

    documents = connection.execute(
        """
        SELECT id, title, source_url, source_page, official_source, document_type,
               law_number, law_year, category, summary, keywords_json, page_count,
               article_count, status, created_at, updated_at
        FROM legal_documents
        WHERE status = 'ready'
        ORDER BY id
        """
    ).fetchall()
    document_ids = {row["id"] for row in documents}
    chunks = connection.execute(
        """
        SELECT id, document_id, chunk_index, reference, text, char_start, char_end,
               created_at
        FROM legal_chunks
        ORDER BY id
        """
    ).fetchall()
    sources = connection.execute(
        """
        SELECT id, document_id, source_url, source_label, source_type, created_at
        FROM legal_document_sources
        ORDER BY id
        """
    ).fetchall()

    prepared_chunks = []
    for row in chunks:
        if row["document_id"] not in document_ids:
            continue
        full_text = clean_ocr_noise(row["text"])
        excerpt = representative_excerpt(full_text)
        prepared_chunks.append((row, excerpt))

    migration_text = migration.read_text(encoding="utf-8")
    seed_marker = "\nINSERT OR IGNORE INTO office_settings"
    schema_text = migration_text.split(seed_marker, 1)[0].rstrip() + "\n"
    migration.write_text(schema_text, encoding="utf-8", newline="\n")

    with migration.open("a", encoding="utf-8", newline="\n") as out:
        out.write("\n")
        out.write(
            statement(
                "INSERT OR IGNORE INTO office_settings "
                "(id, office_name, currency) VALUES "
                "(1, 'المكتب القانوني', 'KWD')"
            )
        )

        for row in documents:
            title = clean_text(row["title"])
            summary = clean_text(row["summary"])
            keywords_json = row["keywords_json"] or "[]"
            try:
                keywords = " ".join(json.loads(keywords_json))
            except (TypeError, ValueError):
                keywords = str(keywords_json)
            document_search = search_terms(f"{title} {summary} {keywords}")
            values = [
                row["id"],
                title,
                row["source_url"] or "",
                row["source_page"] or "",
                row["official_source"] or "",
                row["document_type"] or "مستند تشريعي",
                row["law_number"],
                row["law_year"],
                row["category"] or "تشريعات عامة",
                summary,
                keywords_json,
                document_search,
                row["page_count"],
                row["article_count"] or 0,
                row["status"] or "ready",
                row["created_at"] or "CURRENT_TIMESTAMP",
                row["updated_at"] or row["created_at"] or "CURRENT_TIMESTAMP",
            ]
            out.write(
                statement(
                    "INSERT INTO legal_documents "
                    "(id,title,source_url,source_page,official_source,document_type,"
                    "law_number,law_year,category,summary,keywords_json,search_text,"
                    "page_count,article_count,status,created_at,updated_at) VALUES "
                    f"({','.join(sql_value(value) for value in values)})"
                )
            )

        for row, excerpt in prepared_chunks:
            values = [
                row["id"],
                row["document_id"],
                row["chunk_index"],
                clean_text(row["reference"]) or None,
                excerpt,
                search_terms(excerpt, 260),
                row["char_start"],
                row["char_end"],
                row["created_at"] or "CURRENT_TIMESTAMP",
            ]
            out.write(
                statement(
                    "INSERT INTO legal_chunks "
                    "(id,document_id,chunk_index,reference,text,search_terms,"
                    "char_start,char_end,created_at) VALUES "
                    f"({','.join(sql_value(value) for value in values)})"
                )
            )

        for row in sources:
            if row["document_id"] not in document_ids:
                continue
            values = [
                row["id"],
                row["document_id"],
                row["source_url"] or "",
                row["source_label"] or "",
                row["source_type"] or "user_library",
                row["created_at"] or "CURRENT_TIMESTAMP",
            ]
            out.write(
                statement(
                    "INSERT INTO legal_document_sources "
                    "(id,document_id,source_url,source_label,source_type,created_at) "
                    f"VALUES ({','.join(sql_value(value) for value in values)})"
                )
            )

    print(
        json.dumps(
            {
                "documents": len(documents),
                "chunks": len(prepared_chunks),
                "sources": sum(1 for row in sources if row["document_id"] in document_ids),
                "migration_bytes": migration.stat().st_size,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

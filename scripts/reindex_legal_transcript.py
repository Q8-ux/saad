#!/usr/bin/env python3
"""Generate an audited D1 re-index migration from a reviewed legal transcript.

The transcript is used only to create searchable text. The legal document keeps
its official source URL, and the generated migration records the transcript as a
separate provenance record so the application never confuses an index with the
official publication.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from lxml import html


BIDI_MARKS = re.compile(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]")
WHITESPACE = re.compile(r"\s+")
ARTICLE = re.compile(
    r"^(?:المادة|مادة)\s+(\d+(?:\s+مكرر(?:\s*\([^)]+\))?)?)"
)
ARTICLE_PREFIX_NOISE = re.compile(r"^[پ\s\-–—·•]+(?=(?:المادة|مادة)\s+\d)")
STRUCTURAL_HEADING = re.compile(
    r"^(?:القسم|الكتاب|الباب|الفصل|الفرع|أولاً|ثانياً|ثالثاً|رابعاً|"
    r"خامساً|سادساً|سابعاً|ثامناً|\d+\s*[-–]\s*الشخص)"
)
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
ALEF_VARIANTS = str.maketrans(
    {"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ؤ": "و", "ئ": "ي", "ة": "ه"}
)
DIACRITICS = re.compile(r"[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]")
TOKEN = re.compile(r"[A-Za-z0-9\u0621-\u063a\u0641-\u064a]+")


def clean(value: str) -> str:
    value = BIDI_MARKS.sub("", value.replace("\xa0", " "))
    return WHITESPACE.sub(" ", value).strip()


def article_match(value: str) -> re.Match[str] | None:
    return ARTICLE.match(ARTICLE_PREFIX_NOISE.sub("", value))


def clean_article_heading(value: str) -> str:
    """Remove a verified non-legal glyph that precedes an article heading."""
    return ARTICLE_PREFIX_NOISE.sub("", value)


def sql(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def search_terms(value: str, limit: int = 280) -> str:
    normalized = clean(value).translate(ARABIC_DIGITS).translate(ALEF_VARIANTS)
    normalized = DIACRITICS.sub("", normalized).lower()
    seen: set[str] = set()
    result: list[str] = []
    for token in TOKEN.findall(normalized):
        if len(token) < 2 or token in seen:
            continue
        seen.add(token)
        result.append(token)
        if len(result) >= limit:
            break
    return " ".join(result)


def content_fragments(transcript: Path, start_marker: str, end_marker: str) -> list[str]:
    document = html.parse(str(transcript))
    containers = document.xpath(
        "//div[contains(concat(' ', normalize-space(@class), ' '), "
        "' elementor-widget-container ')]"
    )

    candidates: list[list[str]] = []
    for container in containers:
        fragments = [
            clean("".join(element.itertext()))
            for element in container.xpath(".//p | .//li")
        ]
        fragments = [fragment for fragment in fragments if fragment]
        joined = "\n".join(fragments)
        if start_marker in joined and end_marker in joined:
            candidates.append(fragments)

    if len(candidates) != 1:
        raise ValueError("could not identify exactly one legal-text container")

    fragments = candidates[0]
    try:
        start = next(index for index, text in enumerate(fragments) if text.startswith(start_marker))
        end = next(index for index, text in enumerate(fragments) if end_marker in text)
    except StopIteration as error:
        raise ValueError("the requested law boundaries were not found") from error
    if start >= end:
        raise ValueError("the requested law boundaries are reversed")
    return fragments[start:end]


def make_chunks(fragments: list[str]) -> list[tuple[str, str]]:
    first_article = next(
        (index for index, text in enumerate(fragments) if article_match(text)), None
    )
    if first_article is None:
        raise ValueError("no article headings were found")

    chunks: list[tuple[str, str]] = []
    preamble = "\n".join(fragments[:first_article]).strip()
    if preamble:
        chunks.append(("ديباجة وإصدار القانون", preamble))

    pending_headings: list[str] = []
    current_reference: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_reference, current_lines
        if current_reference and current_lines:
            chunks.append((current_reference, "\n".join(current_lines).strip()))
        current_reference = None
        current_lines = []

    for fragment in fragments[first_article:]:
        fragment = clean_article_heading(fragment)
        match = article_match(fragment)
        if match:
            flush()
            current_reference = f"المادة {match.group(1)}"
            current_lines = [*pending_headings, fragment]
            pending_headings = []
            continue

        if current_reference and len(fragment) <= 120 and STRUCTURAL_HEADING.match(fragment):
            pending_headings.append(fragment)
        elif current_reference:
            current_lines.append(fragment)
        else:
            pending_headings.append(fragment)
    flush()

    # Short articles are still authoritative content. Only discard an empty
    # heading that has no accompanying legal text at all.
    return [(reference, text) for reference, text in chunks if len(text) >= 16]


def validate(chunks: list[tuple[str, str]]) -> int:
    if len(chunks) < 1000:
        raise ValueError("the index has too few legal passages")
    if any("التشريعات الكويتية" in text and text.count("التشريعات الكويتية") >= 4 for _, text in chunks):
        raise ValueError("repeated PDF headers were found in the generated index")
    if any("�" in text for _, text in chunks):
        raise ValueError("replacement characters were found in the generated index")

    base_articles = sorted(
        {
            int(match.group(1))
            for reference, _ in chunks
            if "مكرر" not in reference and (match := re.search(r"(\d+)$", reference))
        }
    )
    expected = list(range(1, 1083))
    if base_articles != expected:
        missing = sorted(set(expected) - set(base_articles))
        raise ValueError(f"unexpected article sequence; missing: {missing[:12]}")
    if any("پ -مادة" in text for _, text in chunks):
        raise ValueError("a non-legal article-heading glyph remained in the index")
    return expected[-1]


def write_migration(
    output: Path,
    chunks: list[tuple[str, str]],
    primary_article_count: int,
    document_id: int,
    official_url: str,
    transcript_url: str,
) -> None:
    summary = (
        "نص مفهرس للبحث مقسّم إلى مواد من نسخة نصية عامة، مع مطابقة العنوان وتسلسل "
        "المواد (1 إلى 1082) بالمصدر الرسمي. يجب مطابقة الاقتباس ورقم المادة مع "
        "النسخة الرسمية قبل الاستناد أو الإيداع."
    )
    lines = [
        "-- Re-indexed from an audited public transcript; official source remains the Ministry of Justice PDF.",
        f"-- Official source: {official_url}",
        f"-- Transcript provenance: {transcript_url}",
        f"DELETE FROM legal_chunks WHERE document_id={document_id};",
        "--> statement-breakpoint",
        "UPDATE legal_documents "
        f"SET summary={sql(summary)}, page_count=245, article_count={primary_article_count}, "
        "status='ready', updated_at=CURRENT_TIMESTAMP "
        f"WHERE id={document_id};",
        "--> statement-breakpoint",
        "INSERT INTO legal_document_sources "
        "(document_id,source_url,source_label,source_type,created_at) "
        f"SELECT {document_id},{sql(transcript_url)},'نسخة نصية عامة مستخدمة للفهرسة مع الرجوع إلى المصدر الرسمي','public_transcript',CURRENT_TIMESTAMP "
        "WHERE NOT EXISTS (SELECT 1 FROM legal_document_sources "
        f"WHERE document_id={document_id} AND source_url={sql(transcript_url)});",
        "--> statement-breakpoint",
    ]

    char_start = 0
    for chunk_index, (reference, text) in enumerate(chunks):
        char_end = char_start + len(text)
        lines.extend(
            [
                "INSERT INTO legal_chunks "
                "(document_id,chunk_index,reference,text,search_terms,char_start,char_end,created_at) VALUES "
                f"({document_id},{chunk_index},{sql(reference)},{sql(text)},{sql(search_terms(text))},{char_start},{char_end},CURRENT_TIMESTAMP);",
                "--> statement-breakpoint",
            ]
        )
        char_start = char_end + 1

    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--transcript", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--document-id", type=int, required=True)
    parser.add_argument("--official-url", required=True)
    parser.add_argument("--transcript-url", required=True)
    parser.add_argument("--start-marker", default="بعد الاطلاع على الأمر الأميري")
    parser.add_argument("--end-marker", default="مرسوم بلائحة جدول الديات")
    arguments = parser.parse_args()

    transcript = arguments.transcript.resolve()
    if not transcript.is_file():
        raise SystemExit("transcript file was not found")

    fragments = content_fragments(transcript, arguments.start_marker, arguments.end_marker)
    chunks = make_chunks(fragments)
    primary_article_count = validate(chunks)
    write_migration(
        arguments.output,
        chunks,
        primary_article_count,
        arguments.document_id,
        arguments.official_url,
        arguments.transcript_url,
    )
    print(
        json.dumps(
            {
                "document_id": arguments.document_id,
                "chunks": len(chunks),
                "primary_articles": primary_article_count,
                "transcript_sha256": hashlib.sha256(transcript.read_bytes()).hexdigest(),
                "output": str(arguments.output),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

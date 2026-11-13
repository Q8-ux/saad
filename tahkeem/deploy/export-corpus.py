"""Export the privately supplied legislative index as a replayable PostgreSQL import."""
import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from pathlib import Path

COLUMNS = (
    "id", "document_id", "component_id", "article_number", "number_key", "document_title",
    "heading", "start_page", "end_page", "printed_page", "text", "text_sha256",
    "source_sha256", "boundary_review", "text_verified", "source_issue", "searchable",
)
TRANSLATION = str.maketrans("أإآٱىة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "اااايه01234567890123456789")
MARKS = re.compile(r"[\u064b-\u065f\u0670\u0640\u200b-\u200f\u202a-\u202e]")


def normalize(value):
    text = MARKS.sub("", unicodedata.normalize("NFKC", value).lower()).translate(TRANSLATION)
    return " ".join(re.sub(r"[^\w]+|_", " ", text).split())


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if "\0" in value:
        raise ValueError("Unexpected NUL in source.")
    return "'" + value.replace("'", "''") + "'"


def export(source, output):
    output.mkdir(parents=True, exist_ok=False)
    with sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        documents = db.execute("SELECT sha256,pages FROM source_documents").fetchall()
        if len(documents) != 1:
            raise ValueError("Expected one source document.")
        source_sha, page_count = documents[0]
        sections = db.execute("SELECT count(*) FROM compendium_documents").fetchone()[0]
        issues = {}
        for doc, number, page, kind in db.execute(
            "SELECT document_id,article_number,pdf_page,kind FROM source_issues"
        ):
            issues.setdefault((doc, number, page), set()).add(kind)
        count = 0
        batch = []
        schema = ",".join(COLUMNS)
        for row in db.execute("""
            SELECT u.*,d.title AS document_title,p.printed_page
            FROM article_units u JOIN compendium_documents d ON d.id=u.document_id
            LEFT JOIN pdf_pages p ON p.pdf_page=u.start_page ORDER BY u.id
        """):
            if (row["source_sha256"] != source_sha or digest(row["text"]) != row["text_sha256"] or
                    not 1 <= row["start_page"] <= row["end_page"] <= page_count):
                raise ValueError("Source fingerprint or page range does not match.")
            row_issues = set()
            for page in range(row["start_page"], row["end_page"] + 1):
                row_issues.update(issues.get((row["document_id"], row["number"], page), ()))
            number = normalize(row["number"])
            searchable = normalize(" ".join((row["document_title"], row["number"], row["heading"], row["text"])))
            values = (row["id"], row["document_id"], row["component_id"], row["number"], number,
                      row["document_title"], row["heading"], row["start_page"], row["end_page"],
                      row["printed_page"], row["text"], row["text_sha256"], source_sha, row["boundary_review"],
                      bool(row["complete_article_verified"] and row["transcription_verified"]),
                      ",".join(sorted(row_issues)), searchable)
            batch.append("(" + ",".join(map(literal, values)) + ")")
            count += 1
            if count % 190 == 0:
                write_batch(output, count // 190, schema, batch)
                batch.clear()
        if batch:
            write_batch(output, count // 190 + 1, schema, batch)
        if count != db.execute("SELECT count(*) FROM article_units").fetchone()[0]:
            raise ValueError("Article count changed during export.")
        (output / "manifest.json").write_text(json.dumps({
            "source_sha256": source_sha, "articles": count, "pages": page_count, "sections": sections,
        }), encoding="utf-8")


def write_batch(output, index, schema, rows):
    statement = f"INSERT INTO corpus_articles ({schema}) VALUES\n" + ",\n".join(rows)
    statement += "\nON CONFLICT (id) DO NOTHING"
    (output / f"batch-{index:03}.sql").write_text(statement, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("sqlite", type=Path)
    parser.add_argument("private_output", type=Path)
    args = parser.parse_args()
    export(args.sqlite, args.private_output)

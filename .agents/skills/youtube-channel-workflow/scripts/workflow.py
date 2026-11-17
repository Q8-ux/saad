#!/usr/bin/env python3
"""Analyze a supplied YouTube sample or export a supplied Arabic production brief.

Uses only the standard library. No network, generation, account access or upload.
"""

import argparse
import csv
import io
import json
import math
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


SKILL_DIR = Path(__file__).resolve().parent.parent
FIELDS = {"niche", "channel_id", "video_id", "published_at", "observed_at",
          "views", "format", "url"}


def text(value, label, empty=False):
    if not isinstance(value, str) or (not empty and not value.strip()):
        raise ValueError(f"{label}: expected {'a string' if empty else 'nonempty text'}")
    return value.strip()


def https_url(value, label):
    value = text(value, label)
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"{label}: expected an HTTPS URL without credentials")
    return value


def timestamp(value, label):
    result = datetime.fromisoformat(text(value, label).replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError(f"{label}: timezone required")
    return result.astimezone(timezone.utc)


def number(value, label, positive=False):
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError(f"{label}: expected a finite number")
    if positive and value <= 0:
        raise ValueError(f"{label}: expected a positive number")
    return value


def objects(value, label):
    if not isinstance(value, list) or any(not isinstance(item, dict) for item in value):
        raise ValueError(f"{label}: expected a list of objects")
    return value


def strings(value, label):
    if not isinstance(value, list):
        raise ValueError(f"{label}: expected a list of strings")
    return [text(item, label) for item in value]


def destination(value):
    result = Path(value).expanduser().resolve()
    if result == SKILL_DIR or SKILL_DIR in result.parents:
        raise ValueError("Keep project outputs outside the skill directory")
    if result.exists():
        raise ValueError(f"Output already exists: {result}")
    return result


def json_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def analyze(args):
    minimum = number(args.min_age_days, "min-age-days", positive=True)
    maximum = number(args.max_age_days, "max-age-days", positive=True)
    if maximum < minimum:
        raise ValueError("max-age-days must be >= min-age-days")
    output = destination(args.output)
    with Path(args.input).open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not FIELDS.issubset(reader.fieldnames or []):
            raise ValueError("Missing CSV fields: " + ", ".join(sorted(FIELDS - set(reader.fieldnames or []))))
        rows = list(reader)
    ids = Counter(str(row.get("video_id") or "").strip() for row in rows)
    groups = defaultdict(list)
    accepted, excluded, observed_times = [], [], []
    now = datetime.now(timezone.utc)
    for line, row in enumerate(rows, 2):
        try:
            fields = {key: text(row.get(key), key) for key in FIELDS}
            if ids[fields["video_id"]] > 1:
                raise ValueError("duplicate video_id; supply one observation per video")
            if fields["format"] not in {"long", "short", "live"}:
                raise ValueError("format must be long, short or live")
            if not re.fullmatch(r"[0-9]+", fields["views"]):
                raise ValueError("views must be a nonnegative integer")
            views = int(fields["views"])
            published = timestamp(fields["published_at"], "published_at")
            observed = timestamp(fields["observed_at"], "observed_at")
            if published > now or observed > now:
                raise ValueError("publication/observation is in the future")
            age = (observed - published).total_seconds() / 86400
            if age <= 0:
                raise ValueError("observation must follow publication")
            if not minimum <= age <= maximum:
                raise ValueError("outside the selected publication-age window")
            url = https_url(fields["url"], "url")
            item = {"row": line, "niche": fields["niche"], "format": fields["format"],
                    "channel_id": fields["channel_id"], "video_id": fields["video_id"],
                    "url": url, "views": views, "age_days": round(age, 4),
                    "published_at": published.isoformat(), "observed_at": observed.isoformat(),
                    "lifetime_views_per_day": round(views / age, 4)}
            accepted.append(item)
            groups[(item["niche"], item["format"])].append(item)
            observed_times.append(observed)
        except (ValueError, TypeError, OverflowError) as error:
            excluded.append({"row": line, "video_id": row.get("video_id"), "reason": str(error)})
    summaries = []
    for (niche, video_format), items in sorted(groups.items()):
        channels = len({item["channel_id"] for item in items})
        summaries.append({"niche": niche, "format": video_format, "videos": len(items),
                          "channels": channels, "median_views": statistics.median(item["views"] for item in items),
                          "median_age_days": statistics.median(item["age_days"] for item in items),
                          "median_lifetime_views_per_day": round(statistics.median(
                              item["lifetime_views_per_day"] for item in items), 4),
                          "sample_note": "عينة محدودة" if len(items) < 10 or channels < 3 else "عينة وصفية؛ راجع طريقة اختيارها"})
    warnings = ["العينة لا تقيس حجم البحث أو ربحية المجال أو النمو الحديث.",
                "اختلاف العمر ومصادر الزيارات وانتقائية البحث قد يغيّر المقارنة."]
    if not accepted:
        warnings.append("لا توجد صفوف صالحة ضمن نافذة التحليل.")
    if observed_times and (max(observed_times) - min(observed_times)).total_seconds() > 86400:
        warnings.append("تتفاوت تواريخ الرصد بأكثر من يوم؛ وحّدها قبل المقارنة.")
    result = {"schema_version": 1, "status": "sample_analysis", "created_at": now.isoformat(),
              "age_window_days": [minimum, maximum], "input_rows": len(rows),
              "accepted_rows": len(accepted), "excluded_rows": excluded,
              "groups": summaries, "videos": accepted, "warnings": warnings}
    payload = json_text(result)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as handle:
        handle.write(payload)
    print(json_text({"output": str(output), "accepted_rows": len(accepted),
                     "excluded_rows": len(excluded)}), end="")


def indexed(items, label):
    result = {}
    for item in items:
        identity = text(item.get("id"), f"{label}.id")
        if identity in result:
            raise ValueError(f"{label}: duplicate id {identity}")
        result[identity] = item
    return result


def spreadsheet_cell(value):
    value = str(value)
    return "'" + value if value.lstrip().startswith(("=", "+", "-", "@")) else value


def package(args):
    output = destination(args.output_dir)
    brief = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
    if not isinstance(brief, dict):
        raise ValueError("brief must be an object")
    title = text(brief.get("title"), "title")
    audience = text(brief.get("audience"), "audience")
    language = text(brief.get("language", "ar"), "language")
    description = text(brief.get("description", ""), "description", empty=True)
    tags = strings(brief.get("tags", []), "tags")
    sources = indexed(objects(brief.get("sources", []), "sources"), "sources")
    for source in sources.values():
        https_url(source.get("url"), "sources.url")
        text(source.get("note", ""), "sources.note", empty=True)
    claims = indexed(objects(brief.get("claims", []), "claims"), "claims")
    for claim in claims.values():
        text(claim.get("text"), "claims.text")
        refs = strings(claim.get("source_ids", []), "claims.source_ids")
        if any(ref not in sources for ref in refs):
            raise ValueError("claim refers to an unknown source")
        if type(claim.get("verified", False)) is not bool:
            raise ValueError("claims.verified must be a boolean")
        if claim.get("verified") and not refs:
            raise ValueError("a verified claim must reference a source")
    scenes = objects(brief.get("scenes"), "scenes")
    if not scenes:
        raise ValueError("at least one scene is required")
    indexed(scenes, "scenes")
    timeline, total, pending = [], 0.0, []
    for scene in scenes:
        identity = text(scene.get("id"), "scenes.id")
        narration = text(scene.get("narration"), "scenes.narration")
        visual = text(scene.get("visual"), "scenes.visual")
        duration = number(scene.get("duration_seconds"), "scenes.duration_seconds", positive=True)
        refs = strings(scene.get("claim_ids", []), "scenes.claim_ids")
        if any(ref not in claims for ref in refs):
            raise ValueError("scene refers to an unknown claim")
        rights = scene.get("rights_status", "pending")
        if rights not in {"owned", "licensed", "not-needed", "pending"}:
            raise ValueError("invalid scenes.rights_status")
        asset = text(scene.get("asset_source", ""), "scenes.asset_source", empty=True)
        if rights == "pending" or (rights != "not-needed" and not asset):
            pending.append(identity)
        timeline.append({"scene_id": identity, "start_seconds": round(total, 3),
                         "end_seconds": round(total + duration, 3), "timing_status": "estimated",
                         "narration": narration, "visual": visual, "asset_source": asset,
                         "rights_status": rights, "claim_ids": ",".join(refs)})
        total += duration
        number(total, "total duration", positive=True)
    thumbnails = objects(brief.get("thumbnails"), "thumbnails")
    if not 1 <= len(thumbnails) <= 3:
        raise ValueError("supply between one and three thumbnail concepts")
    for thumbnail in thumbnails:
        text(thumbnail.get("text", ""), "thumbnails.text", empty=True)
        text(thumbnail.get("concept"), "thumbnails.concept")
    unverified = [identity for identity, claim in claims.items() if not claim.get("verified", False)]
    narration = [f"# {title}"]
    for item in timeline:
        narration.append(f"## {item['scene_id']}\n\n{item['narration']}")
    board = io.StringIO(newline="")
    writer = csv.DictWriter(board, fieldnames=list(timeline[0]))
    writer.writeheader()
    writer.writerows({key: spreadsheet_cell(value) for key, value in row.items()} for row in timeline)
    production = [f"# خطة إنتاج: {title}", f"الجمهور: {audience}",
                  f"اللغة: {language}", f"الزمن التقديري: {round(total, 3)} ثانية.",
                  "الحزمة تخطيطية؛ لم تُنتج وسائط أو توقيتات نهائية ولم يتم النشر.",
                  "## سجل الادعاءات والمصادر",
                  "حالة التحقق أدخلها الكاتب؛ البرنامج لم يفحص صحة الادعاءات."]
    for identity, claim in claims.items():
        state = "راجعه الكاتب" if claim.get("verified", False) else "يحتاج تحققًا"
        production.append(f"- {identity}: {claim['text']} — {state}. المصادر: {', '.join(claim.get('source_ids', [])) or 'غير متوفرة'}")
    for identity, source in sources.items():
        production.append(f"- {identity}: {source['url']} — {source.get('note', '')}")
    production.extend(["## ما يلزم للإنتاج", "- إنتاج أو توفير الصوت واللقطات ثم المونتاج وفحص التوقيت والصوت.",
                       "- اعتماد توقيت النسخة النهائية قبل إعداد الترجمة والفصول."])
    if pending:
        production.append("- أصول تحتاج توفيرًا أو استكمال بيانات الحقوق: " + ", ".join(pending))
    if unverified:
        production.append("- ادعاءات تحتاج التحقق: " + ", ".join(unverified))
    thumbnail_text = ["# تصورات الصور المصغرة"]
    for index, thumbnail in enumerate(thumbnails, 1):
        thumbnail_text.append(f"## تصور {index}\n\nالنص: {thumbnail.get('text', '')}\n\n{thumbnail['concept']}")
    files = {"script-draft.md": "\n\n".join(narration) + "\n",
             "storyboard.csv": "\ufeff" + board.getvalue(),
             "production.md": "\n\n".join(production) + "\n",
             "thumbnails.md": "\n\n".join(thumbnail_text) + "\n",
             "metadata.json": json_text({"title": title, "description": description, "tags": tags,
                                         "language": language, "chapters": [], "status": "draft"}),
             "manifest.json": json_text({"schema_version": 1, "status": "planning_only",
                                         "duration_seconds_estimated": round(total, 3),
                                         "video_rendered": False, "audio_generated": False,
                                         "images_generated": False, "published": False,
                                         "unverified_claims": unverified, "assets_pending": pending})}
    output.mkdir(parents=True, exist_ok=False)
    for name, content in files.items():
        with (output / name).open("x", encoding="utf-8", newline="") as handle:
            handle.write(content)
    print(json_text({"output_dir": str(output), "files": list(files), "status": "planning_only"}), end="")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    sample = commands.add_parser("analyze", help="Describe a supplied CSV sample; no revenue prediction")
    sample.add_argument("input")
    sample.add_argument("--output", required=True)
    sample.add_argument("--min-age-days", type=float, default=7)
    sample.add_argument("--max-age-days", type=float, default=90)
    sample.set_defaults(run=analyze)
    pack = commands.add_parser("package", help="Export a supplied brief; no media rendering or publication")
    pack.add_argument("input")
    pack.add_argument("--output-dir", required=True)
    pack.set_defaults(run=package)
    args = parser.parse_args()
    try:
        args.run(args)
    except (OSError, ValueError, TypeError, OverflowError, csv.Error) as error:
        parser.exit(2, f"Error: {error}\n")


if __name__ == "__main__":
    main()

"""Lossless text adapters for episode JSON, Saad Script Studio, and FDX."""
import copy
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

FIELDS = ("action", "character", "dialogue", "parenthetical", "transition")
TYPES = {"Scene Heading", "Action", "Character", "Parenthetical", "Dialogue", "Transition", "General"}
ILLEGAL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def text(value, label):
    if not isinstance(value, str):
        raise ValueError(f"{label}: يجب أن يكون النص سلسلة نصية.")
    if ILLEGAL.search(value):
        raise ValueError(f"{label}: توجد محارف تحكم لا يمكن حفظها في Word.")
    return value


def validate_source(value):
    if not isinstance(value, dict) or value.get("schema_version", 1) != 1:
        raise ValueError("مخطط السيناريو غير مدعوم.")
    result = copy.deepcopy(value)
    result["schema_version"] = 1
    for key in ("title", "author", "director", "part_label"):
        result[key] = text(result.get(key, ""), key)
    if not result["title"].strip():
        raise ValueError("عنوان المسلسل مطلوب.")
    page = result.get("first_page_number", 1)
    if not isinstance(page, int) or isinstance(page, bool) or not 1 <= page <= 999999:
        raise ValueError("رقم أول صفحة غير صالح.")
    result["first_page_number"] = page
    production = result.get("production", {})
    if not isinstance(production, dict):
        raise ValueError("بيانات الإنتاج غير صالحة.")
    result["production"] = production
    for key in ("organization", "sector", "unit"):
        production[key] = text(production.get(key, ""), f"production.{key}")
    episodes = result.get("episodes")
    if not isinstance(episodes, list) or not 1 <= len(episodes) <= 200:
        raise ValueError("أدخل حلقة واحدة على الأقل، وبحد أقصى ٢٠٠ حلقة.")
    count = total = 0
    for ei, episode in enumerate(episodes):
        if not isinstance(episode, dict):
            raise ValueError("بيانات الحلقة غير صالحة.")
        number = episode.get("number", ei + 1)
        if not isinstance(number, (int, str)) or isinstance(number, bool):
            raise ValueError("رقم الحلقة غير صالح.")
        episode["number"] = str(number)
        episode["label"] = text(episode.get("label", ""), "episode.label")
        scenes = episode.get("scenes")
        if not isinstance(scenes, list) or not 1 <= len(scenes) <= 1000:
            raise ValueError("كل حلقة تحتاج مشهداً واحداً على الأقل.")
        for si, scene in enumerate(scenes):
            if not isinstance(scene, dict):
                raise ValueError("بيانات المشهد غير صالحة.")
            scene["number"] = str(scene.get("number", si + 1))
            for key in ("location", "heading", "interior", "time"):
                scene[key] = text(scene.get(key, ""), f"scene.{key}")
            beats = scene.get("beats")
            if not isinstance(beats, list) or not beats:
                raise ValueError(f"المشهد {scene['number']} بلا محتوى.")
            for bi, beat in enumerate(beats):
                if not isinstance(beat, dict):
                    raise ValueError("بيانات الفقرة غير صالحة.")
                unknown = set(beat) - set(FIELDS) - {"id"}
                if unknown:
                    raise ValueError(f"حقول غير معروفة داخل الفقرة: {sorted(unknown)}")
                for key in FIELDS:
                    if key in beat:
                        text(beat[key], f"{ei}.{si}.{bi}.{key}")
                        total += len(beat[key])
                if not any(beat.get(k, "").strip() for k in FIELDS):
                    raise ValueError("فقرة فارغة؛ احذفها من المخطط صراحة.")
                if beat.get("dialogue", "").strip() and not beat.get("character", "").strip():
                    raise ValueError("حوار بلا اسم متحدث.")
                if beat.get("character", "").strip() and not beat.get("dialogue", "").strip():
                    raise ValueError("اسم متحدث بلا حوار.")
                if beat.get("transition", "").strip() and any(beat.get(k, "").strip() for k in FIELDS if k != "transition"):
                    raise ValueError("ضع الانتقال في فقرة مستقلة.")
                count += 1
    if count > 12000 or total > 5000000:
        raise ValueError("السيناريو يتجاوز حد ١٢ ألف فقرة أو ٥ ملايين حرف.")
    return result


def from_blocks(value):
    if value.get("version", 2) not in (1, 2):
        raise ValueError("إصدار استوديو السيناريو غير مدعوم.")
    blocks = value.get("blocks")
    if not isinstance(blocks, list) or len(blocks) > 12000:
        raise ValueError("قائمة فقرات استوديو السيناريو غير صالحة.")
    scenes = []
    current = None
    speaker = ""
    pending = None

    def flush():
        nonlocal speaker, pending
        if pending:
            if not pending.get("dialogue", "").strip():
                raise ValueError(f"اسم «{speaker}» بلا حوار في المصدر.")
            current["beats"].append(pending)
        speaker, pending = "", None

    for b in blocks:
        if not isinstance(b, dict) or b.get("type") not in TYPES:
            raise ValueError("نوع فقرة غير معروف في ملف المشروع.")
        content = text(b.get("text"), "block.text")
        if not content.strip():
            continue
        kind = b["type"]
        if kind == "Scene Heading":
            flush()
            current = {"number": str(b.get("number") or len(scenes) + 1), "heading": content, "beats": []}
            # Keep the original heading verbatim; metadata uses only explicit markers.
            interior = re.search(r"(?:^|\s)(داخلي|خارجي|داخل/خارج|INT\.?/EXT\.?|INT\.?|EXT\.?)(?:\s|[-/]|$)", content, re.I)
            time = re.search(r"(?:^|\s|[-/])(ليل|نهار|صباح|مساء|فجر|غروب|DAY|NIGHT|DAWN|DUSK|EVENING|CONTINUOUS)(?:\s|$)", content, re.I)
            current.update(interior=interior.group(1) if interior else "", time=time.group(1) if time else "")
            scenes.append(current)
            continue
        if current is None:
            current = {"number": "", "heading": "", "beats": []}
            scenes.append(current)
        if kind == "Character":
            flush()
            speaker = content
            pending = {"character": speaker}
        elif kind in ("Dialogue", "Parenthetical"):
            if not speaker or pending is None:
                raise ValueError("حوار أو توجيه أداء بلا اسم شخصية سابق.")
            if kind == "Parenthetical" and pending.get("dialogue", "").strip():
                current["beats"].append(pending)
                pending = {"character": speaker}
            field = "dialogue" if kind == "Dialogue" else "parenthetical"
            pending[field] = pending.get(field, "") + ("\n" if field in pending else "") + content
        else:
            flush()
            current["beats"].append({"transition" if kind == "Transition" else "action": content})
    flush()
    return validate_source({
        "schema_version": 1, "title": value.get("title") or "سيناريو",
        "author": value.get("author", ""), "director": value.get("director", ""),
        "part_label": value.get("part_label", ""), "first_page_number": value.get("first_page_number", 1),
        "production": value.get("production", {}),
        "episodes": [{"number": value.get("episode_number", 1), "label": value.get("episode_label", ""), "scenes": scenes}],
    })


def from_fdx(xml):
    if "<!DOCTYPE" in xml.upper() or "<!ENTITY" in xml.upper():
        raise ValueError("تعريفات DTD وENTITY غير مسموحة في FDX.")
    root = ET.fromstring(xml)
    if root.tag != "FinalDraft":
        raise ValueError("الملف ليس Final Draft.")
    content = root.find("Content")
    if content is None:
        raise ValueError("لا يوجد Content في FDX.")
    blocks = []
    for paragraph in content.findall("Paragraph"):
        kind = paragraph.get("Type", "General")
        if kind not in TYPES:
            kind = "General"
        blocks.append({
            "type": kind, "text": "".join("".join(t.itertext()) for t in paragraph.findall("Text")),
            "number": paragraph.get("Number", ""),
        })
    title_lines = [
        "".join("".join(t.itertext()) for t in p.findall("Text"))
        for p in root.findall("TitlePage/Content/Paragraph")
    ]
    return from_blocks({"version": 2, "title": title_lines[0] if title_lines else "سيناريو",
                        "author": title_lines[1] if len(title_lines) > 1 else "", "blocks": blocks})


def load_source(path):
    path = Path(path)
    if path.stat().st_size > 20000000:
        raise ValueError("ملف المصدر كبير جداً.")
    raw = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".fdx":
        return from_fdx(raw)
    value = json.loads(raw)
    if isinstance(value, dict) and "blocks" in value:
        return from_blocks(value)
    return validate_source(value)

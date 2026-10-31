"""Run an exported Video Use project locally; never accept remote source URLs."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

def probe(path: Path) -> dict:
    result = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)], capture_output=True, text=True, check=True, timeout=30)
    return json.loads(result.stdout)

def validate_edl(edl: dict, root: Path) -> dict:
    if not isinstance(edl, dict):
        raise ValueError("Invalid project object.")
    source_dir = (root / "sources").resolve()
    raw_sources, raw_ranges = edl.get("sources"), edl.get("ranges")
    if not isinstance(raw_sources, dict) or not 1 <= len(raw_sources) <= 20 or not isinstance(raw_ranges, list) or not 1 <= len(raw_ranges) <= 100:
        raise ValueError("Invalid sources or ranges.")
    sources, ranges, metadata = {}, [], {}
    expected = {item["id"]: item for item in edl.get("source_files", []) if isinstance(item, dict) and "id" in item}
    for key, value in raw_sources.items():
        if not isinstance(key, str) or not key or len(key) > 100 or not all(c.isascii() and (c.isalnum() or c in "-_") for c in key):
            raise ValueError("Invalid source identifier.")
        if not isinstance(value, str) or "://" in value or Path(value).is_absolute():
            raise ValueError("Only local sources within sources/ are accepted.")
        path = (root / value).resolve()
        if not path.is_relative_to(source_dir) or not path.is_file():
            raise ValueError("Put the original recordings in sources/ with their original names.")
        if key in expected and path.stat().st_size != expected[key].get("size"):
            raise ValueError("A source does not match the saved file size: " + path.name)
        info = probe(path)
        if not any(stream.get("codec_type") == "video" for stream in info.get("streams", [])):
            raise ValueError("A source has no video.")
        metadata[key] = info
        sources[key] = str(path)
    for item in raw_ranges:
        if not isinstance(item, dict) or item.get("source") not in sources:
            raise ValueError("A cut refers to an unknown recording.")
        start, end = item.get("start"), item.get("end")
        if isinstance(start, bool) or isinstance(end, bool) or not isinstance(start, (int, float)) or not isinstance(end, (int, float)) or not math.isfinite(start) or not math.isfinite(end):
            raise ValueError("Cut times must be finite numbers.")
        duration = float(metadata[item["source"]]["format"]["duration"])
        if not math.isfinite(duration) or duration <= 0 or start < 0 or end - start < 0.1 or end > duration + 0.04:
            raise ValueError("A cut falls outside its source.")
        ranges.append({"source": item["source"], "start": start, "end": min(end, duration)})
    total = sum(item["end"] - item["start"] for item in ranges)
    if total > 7200:
        raise ValueError("Export at most two hours per local job.")
    delivery = edl.get("delivery") or {}
    if not isinstance(delivery, dict):
        raise ValueError("Invalid output settings.")
    if delivery.get("aspect", "original") not in ("original", "portrait", "landscape") or delivery.get("quality", "720") not in ("720", "1080"):
        raise ValueError("Invalid output settings.")
    clean = {"version": 1, "sources": sources, "ranges": ranges, "grade": "none", "overlays": [], "caption_case": "natural", "total_duration_s": total,
             "subtitle_style": "FontName=DejaVu Sans,FontSize=20,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=60"}
    if edl.get("subtitles"):
        subtitle_path = (root / "master.srt").resolve()
        if not subtitle_path.is_relative_to(root) or not subtitle_path.is_file() or subtitle_path.stat().st_size > 1_000_000:
            raise ValueError("Missing or invalid master.srt.")
        clean["subtitles"] = str(subtitle_path)
    return {"edl": clean, "metadata": metadata, "delivery": delivery}

def canvas_size(checked: dict) -> tuple[int, int]:
    delivery = checked["delivery"]
    long = 1920 if delivery.get("quality") == "1080" else 1280
    aspect = delivery.get("aspect", "original")
    if aspect == "portrait":
        return round(long * 9 / 16), long
    if aspect == "landscape":
        return long, round(long * 9 / 16)
    first = checked["edl"]["ranges"][0]["source"]
    video = next(stream for stream in checked["metadata"][first]["streams"] if stream.get("codec_type") == "video")
    width, height = int(video["width"]), int(video["height"])
    for side in video.get("side_data_list", []):
        if abs(float(side.get("rotation", 0))) % 180 == 90:
            width, height = height, width
            break
    scale = min(1, long / max(width, height))
    return max(2, round(width * scale / 2) * 2), max(2, round(height * scale / 2) * 2)

def main() -> None:
    parser = argparse.ArgumentParser(description="Export a saved Video Use project with local FFmpeg.")
    parser.add_argument("--draft", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    for program in ("ffmpeg", "ffprobe"):
        if not shutil.which(program):
            raise SystemExit("Install FFmpeg and FFprobe before running this project.")
    edl_path = root / "edl.json"
    if edl_path.stat().st_size > 1_000_000:
        raise SystemExit("Project metadata is too large.")
    checked = validate_edl(json.loads(edl_path.read_text(encoding="utf-8")), root)
    width, height = canvas_size(checked)
    edit = root / "edit"
    edit.mkdir(exist_ok=True)
    clean = checked["edl"]
    (edit / "edl.json").write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
    fingerprints = {}
    for key, path in clean["sources"].items():
        digest = hashlib.sha256()
        with open(path, "rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        fingerprints[key] = digest.hexdigest()
    sys.path.insert(0, str(root / "engine"))
    import render
    audio_by_path = {clean["sources"][key]: any(stream.get("codec_type") == "audio" for stream in info.get("streams", [])) for key, info in checked["metadata"].items()}

    def extract(source, start, duration, grade_filter, out_path, preview=False, draft=False, rate=None):
        # Normalize each selected cut to one canvas, including a silent track when needed.
        out_path.parent.mkdir(parents=True, exist_ok=True)
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{start:.6f}", "-i", str(source)]
        has_audio = audio_by_path[str(source)]
        if not has_audio:
            command += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
        filters = []
        if render.is_hdr_source(source):
            filters.append(render.TONEMAP_CHAIN)
        filters += [f"scale={width}:{height}:force_original_aspect_ratio=decrease:force_divisible_by=2", f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black", "setsar=1"]
        fades = f"afade=t=in:st=0:d=0.03,afade=t=out:st={max(0,duration-0.03):.6f}:d=0.03"
        command += ["-map", "0:v:0", "-map", "0:a:0" if has_audio else "1:a:0", "-t", f"{duration:.6f}", "-vf", ",".join(filters), "-af", fades,
                    "-r", rate or "24", "-c:v", "libx264", "-preset", "ultrafast" if draft else "fast", "-crf", "28" if draft else "20",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", str(out_path)]
        subprocess.run(command, check=True, timeout=1800)

    render.extract_segment = extract
    clips = render.extract_all_segments(clean, edit, preview=False, draft=args.draft, fps="24")
    base, intermediate, final = edit / "base.mp4", edit / "composite.mp4", edit / "final.mp4"
    render.concat_segments(clips, base, edit)
    subtitle = Path(clean["subtitles"]) if clean.get("subtitles") else None
    render.build_final_composite(base, [], subtitle, intermediate, edit, clean["subtitle_style"])
    render.apply_loudnorm_two_pass(intermediate, final, preview=args.draft)
    report = probe(final)
    (edit / "verification.json").write_text(json.dumps({"duration_expected": clean["total_duration_s"], "duration_actual": float(report["format"]["duration"]), "sources_sha256": fingerprints, "streams": report["streams"], "review_picture_and_audio": True}, ensure_ascii=False, indent=2), encoding="utf-8")
    intermediate.unlink(missing_ok=True)
    print("Export complete: " + str(final))
    print("Review the picture, audio and caption synchronization before publishing.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        raise SystemExit(str(error)) from None

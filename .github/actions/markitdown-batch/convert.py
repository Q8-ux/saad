from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

ENGINE = "microsoft/markitdown@0.1.7"
ACTION_ROOT = Path(__file__).resolve().parent

OFFICE_EXTENSIONS = {
    ".docx",
    ".eml",
    ".msg",
    ".pdf",
    ".pptx",
    ".xls",
    ".xlsx",
}
SCOPED_EXTENSIONS = {
    ".bmp",
    ".csv",
    ".gif",
    ".htm",
    ".html",
    ".jpeg",
    ".jpg",
    ".json",
    ".png",
    ".tif",
    ".tiff",
    ".txt",
    ".webp",
    ".xml",
}
SUPPORTED_EXTENSIONS = OFFICE_EXTENSIONS | SCOPED_EXTENSIONS
DOCUMENT_DIRECTORIES = {
    "docs",
    "document",
    "documents",
    "markitdown-input",
    "source-documents",
    "uploads",
}
SKIPPED_DIRECTORIES = {
    ".git",
    ".markitdown-output",
    ".next",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "vendor",
}


@dataclass(frozen=True)
class ConvertedFile:
    source: str
    output: str
    source_bytes: int
    output_characters: int
    source_sha256: str


@dataclass(frozen=True)
class FileResult:
    source: str
    reason: str


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert project documents to Markdown")
    parser.add_argument("--source-dir", default=".")
    parser.add_argument("--output-dir", default=".markitdown-output")
    parser.add_argument("--mode", choices=("documents", "all-supported"), default="documents")
    parser.add_argument("--max-file-size-mb", type=int, default=50)
    parser.add_argument("--max-files", type=int, default=250)
    parser.add_argument("--max-output-characters", type=int, default=5_000_000)
    parser.add_argument("--timeout-seconds", type=int, default=180)
    parser.add_argument("--fail-on-error", choices=("true", "false"), default="true")
    arguments = parser.parse_args()

    if not 1 <= arguments.max_file_size_mb <= 200:
        parser.error("--max-file-size-mb must be between 1 and 200")
    if not 1 <= arguments.max_files <= 1000:
        parser.error("--max-files must be between 1 and 1000")
    if not 10_000 <= arguments.max_output_characters <= 20_000_000:
        parser.error("--max-output-characters must be between 10000 and 20000000")
    if not 10 <= arguments.timeout_seconds <= 900:
        parser.error("--timeout-seconds must be between 10 and 900")
    return arguments


def resolve_inside_workspace(workspace: Path, value: str, label: str) -> Path:
    candidate = (workspace / value).resolve()
    if not candidate.is_relative_to(workspace):
        raise ValueError(f"{label} must stay inside GITHUB_WORKSPACE")
    return candidate


def is_eligible(path: Path, source: Path, output: Path, mode: str) -> bool:
    if path.is_symlink() or not path.is_file() or path.is_relative_to(output):
        return False
    relative = path.relative_to(source)
    lower_parts = {part.lower() for part in relative.parts[:-1]}
    if lower_parts & SKIPPED_DIRECTORIES:
        return False
    extension = path.suffix.lower()
    if extension in OFFICE_EXTENSIONS:
        return True
    if mode == "all-supported":
        return extension in SUPPORTED_EXTENSIONS
    return extension in SCOPED_EXTENSIONS and bool(lower_parts & DOCUMENT_DIRECTORIES)


def discover_files(source: Path, output: Path, mode: str) -> list[Path]:
    if source.is_file():
        return [source] if is_eligible(source, source.parent, output, mode) else []

    discovered: list[Path] = []
    for directory, child_directories, filenames in os.walk(source, followlinks=False):
        current = Path(directory)
        child_directories[:] = [
            name
            for name in child_directories
            if name.lower() not in SKIPPED_DIRECTORIES
            and not (current / name).is_symlink()
            and not (current / name).resolve().is_relative_to(output)
        ]
        for filename in filenames:
            candidate = current / filename
            if is_eligible(candidate, source, output, mode):
                discovered.append(candidate)
    return sorted(discovered)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_handle:
        while chunk := file_handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def output_path_for(input_path: Path, source: Path, output: Path) -> Path:
    relative = input_path.relative_to(source) if source.is_dir() else Path(input_path.name)
    return output / relative.parent / f"{relative.name}.md"


def convert_file(input_path: Path, timeout_seconds: int) -> tuple[str | None, str | None]:
    try:
        completed = subprocess.run(
            [sys.executable, str(ACTION_ROOT / "worker.py"), str(input_path)],
            cwd=ACTION_ROOT,
            capture_output=True,
            check=False,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return None, f"conversion timed out after {timeout_seconds} seconds"

    if completed.returncode != 0:
        message = completed.stderr.decode("utf-8", errors="replace").strip()
        return None, (message[-500:] or "converter returned an unknown error")
    return completed.stdout.decode("utf-8", errors="replace"), None


def append_github_output(converted_count: int, manifest: Path, workspace: Path) -> None:
    output_file = os.getenv("GITHUB_OUTPUT")
    if not output_file:
        return
    with Path(output_file).open("a", encoding="utf-8") as file_handle:
        file_handle.write(f"converted_count={converted_count}\n")
        file_handle.write(f"manifest={manifest.relative_to(workspace).as_posix()}\n")


def append_step_summary(converted: int, skipped: int, errors: int, mode: str) -> None:
    summary_file = os.getenv("GITHUB_STEP_SUMMARY")
    if not summary_file:
        return
    with Path(summary_file).open("a", encoding="utf-8") as file_handle:
        file_handle.write("## MarkItDown conversion\n\n")
        file_handle.write(f"- Engine: `{ENGINE}`\n")
        file_handle.write(f"- Discovery mode: `{mode}`\n")
        file_handle.write(f"- Converted: **{converted}**\n")
        file_handle.write(f"- Skipped: **{skipped}**\n")
        file_handle.write(f"- Errors: **{errors}**\n")


def main() -> int:
    arguments = parse_arguments()
    workspace = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd())).resolve()
    source = resolve_inside_workspace(workspace, arguments.source_dir, "source directory")
    output = resolve_inside_workspace(workspace, arguments.output_dir, "output directory")
    if not source.exists():
        raise SystemExit(f"Source does not exist: {arguments.source_dir}")
    if output == workspace:
        raise SystemExit("Output directory cannot be the repository root")

    output.mkdir(parents=True, exist_ok=True)
    candidates = discover_files(source, output, arguments.mode)
    if len(candidates) > arguments.max_files:
        raise SystemExit(
            f"Discovered {len(candidates)} files; the configured maximum is {arguments.max_files}"
        )

    maximum_bytes = arguments.max_file_size_mb * 1024 * 1024
    converted: list[ConvertedFile] = []
    skipped: list[FileResult] = []
    errors: list[FileResult] = []

    for input_path in candidates:
        relative_source = input_path.relative_to(workspace).as_posix()
        source_size = input_path.stat().st_size
        if source_size == 0:
            skipped.append(FileResult(relative_source, "empty file"))
            continue
        if source_size > maximum_bytes:
            skipped.append(
                FileResult(
                    relative_source,
                    f"larger than {arguments.max_file_size_mb} MB",
                )
            )
            continue

        markdown, error = convert_file(input_path, arguments.timeout_seconds)
        if error is not None or markdown is None:
            errors.append(FileResult(relative_source, error or "conversion failed"))
            continue
        if len(markdown) > arguments.max_output_characters:
            errors.append(
                FileResult(
                    relative_source,
                    "converted output exceeds the configured character limit",
                )
            )
            continue

        destination = output_path_for(input_path, source, output)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(markdown, encoding="utf-8")
        converted.append(
            ConvertedFile(
                source=relative_source,
                output=destination.relative_to(workspace).as_posix(),
                source_bytes=source_size,
                output_characters=len(markdown),
                source_sha256=sha256(input_path),
            )
        )

    manifest = output / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "engine": ENGINE,
                "generated_at": datetime.now(UTC).isoformat(),
                "mode": arguments.mode,
                "converted": [asdict(item) for item in converted],
                "skipped": [asdict(item) for item in skipped],
                "errors": [asdict(item) for item in errors],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    append_github_output(len(converted), manifest, workspace)
    append_step_summary(len(converted), len(skipped), len(errors), arguments.mode)
    print(
        f"MarkItDown: converted={len(converted)} skipped={len(skipped)} "
        f"errors={len(errors)} manifest={manifest.relative_to(workspace)}"
    )
    if errors and arguments.fail_on_error == "true":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

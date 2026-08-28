from __future__ import annotations

import sys
from pathlib import Path

from markitdown import MarkItDown


def main() -> int:
    if len(sys.argv) != 2:
        print("Expected exactly one local file path", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).resolve()
    if not input_path.is_file():
        print("Input file was not found", file=sys.stderr)
        return 2

    try:
        converter = MarkItDown(enable_plugins=False)
        result = converter.convert_local(input_path)
        sys.stdout.write(result.text_content)
    except Exception as exc:  # noqa: BLE001 - sanitize all converter failures at process boundary
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

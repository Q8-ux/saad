"""MarkItDown adapter for local teacher reference files, never browser secrets."""
import argparse,pathlib
from markitdown import MarkItDown
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');args=p.parse_args()
source=pathlib.Path(args.input)
if not source.is_file() or source.stat().st_size>50*1024*1024:raise SystemExit('Missing or oversized local file')
text=MarkItDown(enable_plugins=False).convert(str(source)).text_content
pathlib.Path(args.output).write_text(text,encoding='utf-8')
print('Local conversion completed. Review Arabic text before using it.')

"""Create the static preview output without external build dependencies."""
from pathlib import Path
import shutil
import os
import json

root = Path(__file__).resolve().parents[1]
out = root / 'dist'
shutil.rmtree(out, ignore_errors=True)
out.mkdir()
for name in ['index.html', 'styles.css', 'app.mjs', 'library.mjs', 'i18n.mjs', 'sw.js', 'manifest.webmanifest']:
    shutil.copy2(root / name, out / name)
for name in ['assets', 'data']:
    shutil.copytree(root / name, out / name)
(out / 'release.json').write_text(json.dumps({'version':'1.0.0','commit':os.environ.get('GITHUB_SHA','local'),'name':'للذاكرين والذاكرات'},ensure_ascii=False)+'\n')
print('Built static site:', out)

from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'dist'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html','styles.css','app.mjs','audio.mjs','api.mjs','storage.mjs','config.json','manifest.webmanifest']:
    shutil.copy2(ROOT/name,out/name)
shutil.copytree(ROOT/'assets',out/'assets')
(out/'.nojekyll').touch()
print('Built static client:',out)

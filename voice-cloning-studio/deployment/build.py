from pathlib import Path
import shutil
import subprocess
ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=ROOT, check=True)
out=ROOT/'dist'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html','styles.css','cosmic.css','i18n.mjs','app.mjs','audio.mjs','api.mjs','storage.mjs','media.mjs','reference.mjs','config.json','manifest.webmanifest','local-clone.css','local-clone-page.mjs','local-clone-worker.mjs']:
    shutil.copy2(ROOT/name,out/name)
shutil.copytree(ROOT/'assets',out/'assets')
shutil.copytree(ROOT/'locales',out/'locales')
subprocess.run(['node', 'deployment/build-clone-runtime.mjs'], cwd=ROOT, check=True)
(out/'.nojekyll').touch()
print('Built static client:',out)

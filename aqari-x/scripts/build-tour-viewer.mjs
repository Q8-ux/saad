import {css, js} from '@playcanvas/supersplat-viewer';
import {defaultSettings} from '@playcanvas/supersplat-viewer/settings';
import {mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'public/tour-viewer');
const packageRoot = resolve(root, 'node_modules/@playcanvas/supersplat-viewer');
const pkg = JSON.parse(await readFile(resolve(packageRoot,'package.json'),'utf8'));
await mkdir(target,{recursive:true});
const settings = defaultSettings();
settings.cameras = []; // Frame the scan's own bounds unless authored settings are supplied.
await writeFile(resolve(target,'index.js'),js);
await writeFile(resolve(target,'index.css'),css);
await writeFile(resolve(target,'settings.json'),JSON.stringify(settings,null,2)+'\n');
await writeFile(resolve(target,'version.json'),JSON.stringify({package:pkg.name,version:pkg.version},null,2)+'\n');
for (const name of ['LICENSE','THIRD_PARTY_NOTICES.md']) await copyFile(resolve(packageRoot,name),resolve(target,name));
console.log(`Prepared official SuperSplat Viewer ${pkg.version}; ${Buffer.byteLength(js)} JS bytes, loaded only when a tour is opened.`);

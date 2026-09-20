import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({entryPoints:['scripts/webm-entry.mjs'],outfile:'dist/vendor/webm-duration.mjs',bundle:true,format:'esm',platform:'browser',minify:true,target:['es2020'],banner:{js:'/* @fix-webm-duration/fix + parser 1.0.1, MIT, Yury Sitnikov. See FIX-WEBM-LICENSE.txt. Includes tslib, Apache-2.0; see TSLIB-LICENSE.txt. */'}});
await copyFile('node_modules/tslib/LICENSE.txt','dist/vendor/TSLIB-LICENSE.txt');
await copyFile('node_modules/tslib/CopyrightNotice.txt','dist/vendor/TSLIB-COPYRIGHT.txt');

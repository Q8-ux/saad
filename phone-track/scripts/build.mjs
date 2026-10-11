import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('public/assets', { recursive: true });
await build({ entryPoints: ['src/app.mjs'], bundle: true, minify: true, target: ['es2022'], platform: 'browser', format: 'iife', outfile: 'public/assets/app.js', legalComments: 'none' });
await copyFile('node_modules/libphonenumber-js/LICENSE', 'public/assets/LICENSE-libphonenumber-js.txt');
await copyFile('node_modules/libphonenumber-js/LICENSE.Apache', 'public/assets/LICENSE-libphonenumber-metadata.txt');
console.log('Built browser-local analyzer.');

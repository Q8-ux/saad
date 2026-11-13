import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../.neon-build/', import.meta.url);
await mkdir(new URL('server/', target), { recursive: true });
await build({ absWorkingDir:root, entryPoints:['deploy/neon.mjs'], bundle:true, format:'esm',
  platform:'node', target:'node24', minify:true, outfile:fileURLToPath(new URL('server/handler.mjs',target)),
  banner:{js:"import { createRequire } from 'node:module'; import { fileURLToPath as bundleFilename } from 'node:url'; import { dirname as bundleDirname } from 'node:path'; const require = createRequire(import.meta.url); const __filename = bundleFilename(import.meta.url); const __dirname = bundleDirname(__filename);"},
});
await Promise.all([
  cp(new URL('../public/',import.meta.url),new URL('public/',target),{recursive:true}),
  cp(new URL('../data/',import.meta.url),new URL('data/',target),{recursive:true}),
  cp(new URL('../server/schema.sql',import.meta.url),new URL('server/schema.sql',target)),
  cp(new URL('function-entry.mjs',import.meta.url),new URL('index.mjs',target)),
]);

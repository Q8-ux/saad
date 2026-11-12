import {build} from 'esbuild';
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const vendor = path.join(root, 'dist', 'clone-runtime');
await mkdir(vendor, {recursive:true});
for (const file of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(path.join(root, 'node_modules', 'onnxruntime-web', 'dist', file), path.join(vendor, file));
}
await copyFile(path.join(root, 'node_modules', '@sctg', 'sentencepiece-js', 'LICENSE'), path.join(vendor, 'LICENSE-sentencepiece.txt'));
await copyFile(path.join(root, 'deployment', 'LICENSE-onnxruntime.txt'), path.join(vendor, 'LICENSE-onnxruntime.txt'));
await build({
  stdin:{contents:"export {SentencePieceProcessor} from '@sctg/sentencepiece-js';", resolveDir:root},
  bundle:true, format:'esm', platform:'browser', minify:true, legalComments:'eof',
  outfile:path.join(vendor, 'sentencepiece.mjs'),
  plugins:[{
    name:'sentencepiece-browser-files',
    setup(builder) {
      // The browser uses loadFromB64StringModel and never reads a Node filesystem.
      builder.onResolve({filter:/^(fs|module)$/}, ({path}) => ({path, namespace:'node-only'}));
      builder.onLoad({filter:/.*/, namespace:'node-only'}, () => ({contents:'export {}'}));
    },
  }],
});

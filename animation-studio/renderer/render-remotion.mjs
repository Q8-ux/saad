import {bundle} from '@remotion/bundler';
import {getCompositions,renderMedia} from '@remotion/renderer';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const [,,manifest,out] = process.argv;
if(!manifest||!out)throw Error('usage: node render-remotion.mjs manifest.json output.mp4');
const data=JSON.parse(await fs.readFile(manifest,'utf8'));
const dir=path.dirname(fileURLToPath(import.meta.url));
const serveUrl=await bundle({entryPoint:path.join(dir,'index.jsx'),outDir:undefined,webpackOverride:c=>c,enableCaching:true});
const props={title:data.title,aspect:data.aspect,scenes:data.scenes};
const compositions=await getCompositions(serveUrl,{inputProps:props});
const composition=compositions.find(c=>c.id==='Masar');
if(!composition)throw Error('composition_not_found');
await renderMedia({composition,serveUrl,codec:'h264',outputLocation:out,inputProps:props,overwrite:true,concurrency:2,logLevel:'error'});
console.log(JSON.stringify({ok:true,file:out}));

import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {SERIES} from '../assets/catalog.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
export function readEpisode(source,number){
 const prefix='window.BARCODE_EPISODE_'+number+'=';
 const text=source.trim();if(!text.startsWith(prefix))throw Error('Unexpected episode source '+number);
 const episode=JSON.parse(text.slice(prefix.length).replace(/;\s*$/,''));
 if(episode.number!==number||episode.title!==undefined&&typeof episode.title!=='string'||typeof episode.text!=='string'||!episode.text.trim())throw Error('Invalid episode '+number);
 return episode;
}
export function compileBarcodeContext(sources,catalog=SERIES[0]){
 if(sources.length!==catalog.episodes.length)throw Error('Episode count does not match the catalog');
 const episodes=sources.map((source,index)=>{const number=index+1,episode=readEpisode(source,number);return{number,title:catalog.episodes[index],sourceTitle:episode.title??null,path:'data/episode-'+number+'.js',sha256:sha(source),textCharacters:episode.text.length};});
 return {revision:'project-context-1',workId:'barcode',edition:catalog.revision,sourceStatus:'presentation-copy',latestAuthorVersionVerified:false,humanReviewRequired:true,
  sourceFingerprint:sha(JSON.stringify(episodes)),episodes,
  rules:{scope:'this-edition-only',crossWorkMemory:false,authorNotesAreStoryFacts:false,aiSuggestionsAreCanon:false,changedSourceRequiresRefresh:true},
  unresolved:['مطابقة نسخة التقديم مع أحدث مخطوط اعتمده المؤلف غير متحققة.']};
}
export async function barcodeContext(root=path.resolve(fileURLToPath(new URL('..',import.meta.url)))){
 const sources=await Promise.all(SERIES[0].episodes.map((_,i)=>readFile(path.join(root,'data/episode-'+(i+1)+'.js'),'utf8')));
 return compileBarcodeContext(sources);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),file=path.join(root,'context/manifest.json');
 const current=JSON.stringify(await barcodeContext(),null,2)+'\n';
 if(process.argv[2]==='--write'){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,current);}
 else if(process.argv[2]==='--check'){if(await readFile(file,'utf8')!==current)throw Error('Barcode context is stale; review changed sources and refresh the context manifest');}
 else throw Error('Use --check or --write');
 console.log(JSON.stringify({projectContext:'passed',work:'barcode',episodes:SERIES[0].episodes.length,latestAuthorVersionVerified:false,creativeTextChanged:false}));
}

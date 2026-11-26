/**
 * Barcode dialogue and Save the Cat 15-beat review.
 * Review-only: never writes back to the manuscript.
 * Run: node screenplay-drama-engine/barcode-dialogue-review.mjs < private-episode.json
 * Private manuscripts must NOT be committed to GitHub.
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const BEATS = Object.freeze([
 'الصورة الافتتاحية','طرح الفكرة','التأسيس','المحفز','التردد',
 'عبور العتبة','القصة الموازية','الوعد الدرامي','المنتصف',
 'تضييق الخناق','الانكسار','اللحظة الصعبة','قرار المواجهة',
 'الذروة','الصورة الختامية'
]);
const stop = new Set(['من','في','على','الى','إلى','عن','هو','هي','هذا','هذي','شنو','شلون','مو','بس','كل','ما','عند','مع','كان','اللي','إذا','لان','لأن']);
const norm = v => String(v||'').normalize('NFKC')
 .replace(/[\u064b-\u065f\u0670\u0640]/g,'')
 .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي')
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();
const words = text => new Set(norm(text).split(' ').filter(x=>x.length>2&&!stop.has(x)));

export function validateBeats(ranges,sceneCount) {
 if(!Array.isArray(ranges)||ranges.length!==15) throw new Error('Expected exactly fifteen beats');
 let cursor=1;
 ranges.forEach((r,i)=>{
  if(!Array.isArray(r)||r.length!==2||!r.every(Number.isInteger)
     ||r[0]!==cursor||r[1]<r[0]) throw new Error('Invalid contiguous beat range '+(i+1));
  cursor=r[1]+1;
 });
 if(cursor!==sceneCount+1) throw new Error('Beat map does not cover every scene');
 return true;
}

export function reviewLastLine(dialogue,{theme='',opening=''}={}) {
 const turns=dialogue.filter(x=>x.type==='dialogue'&&String(x.text||'').trim());
 if(!turns.length)return {score:null,warnings:['لا يوجد حوار في المشهد'],last:''};
 const last=turns.at(-1).text.trim(),openingWords=words(opening),themeWords=words(theme),lastWords=words(last);
 const count=norm(last).split(' ').filter(Boolean).length;
 const overlap=(a,b)=>[...a].some(x=>b.has(x));
 const score=(count>=2&&count<=12?20:count<=20?10:0)
  +(themeWords.size&&overlap(themeWords,lastWords)?25:0)
  +(openingWords.size&&overlap(openingWords,lastWords)?20:0)
  +(/[؟?]$/.test(last)?10:0);
 const warnings=[];
 if(count>20)warnings.push('القفلة طويلة وتحتاج سماعا بصوت الممثل');
 if(!theme)warnings.push('لم تحدد ثيمة المشهد؛ الدرجة جزئية');
 if(!opening)warnings.push('لم تحدد افتتاحية المشهد؛ الدرجة جزئية');
 return {score,last,warnings,heuristic:true};
}

export function reviewEpisode({workId,episode,scenes,beatRanges}) {
 if(workId!=='barcode')throw new Error('Review is restricted to Barcode');
 if(!Number.isInteger(episode)||episode<1||episode>8)throw new Error('Invalid episode');
 if(!Array.isArray(scenes)||!scenes.length)throw new Error('Missing scene text');
 validateBeats(beatRanges,scenes.length);
 const flagged=[];
 for(let i=0;i<scenes.length;i++){
  const scene=scenes[i],events=scene.events||[];
  if(scene.number!==i+1)throw new Error('Scene ordering mismatch at '+(i+1));
  if(!Array.isArray(events))throw new Error('Invalid scene events');
  const turns=events.filter(x=>x.type==='dialogue'&&x.text&&x.speaker);
  for(let j=1;j<turns.length;j++){
   const prev=turns[j-1],cur=turns[j];
   const question=/[؟?]$/.test(prev.text.trim());
   const shared=[...words(prev.text)].some(x=>words(cur.text).has(x));
   // This is a REVIEW FLAG, not a claim that the transition is wrong.
   if(question&&!shared&&!/^(اي|إي|لا|ادري|أدري|زين|لان|لأن|عشان|مو|بس|شلون|شنو|صح)/.test(norm(cur.text)))
    flagged.push({scene:scene.number,turn:j+1,speaker:cur.speaker,kind:'question_response_review',
      previous:prev.text.slice(0,130),current:cur.text.slice(0,130)});
  }
  if(events.length&&!events.some(x=>x.type==='dialogue'))
   flagged.push({scene:scene.number,kind:'silent_scene_review'});
 }
 const endings=scenes.map(scene=>({scene:scene.number,...reviewLastLine(scene.events,{
  opening:(scene.events.find(x=>x.type==='dialogue')||{}).text||'',
  theme:scene.theme||''
 })}));
 return {
  workId,episode,sceneCount:scenes.length,beatCount:BEATS.length,
  beatMap:beatRanges.map((range,index)=>({name:BEATS[index],range})),
  cutRequiredForEachScene:true,dialogueTransitionFlags:flagged,
  sceneEndings:endings,manuscriptChanged:false,
  note:'النتائج مؤشرات تحريرية تحتاج مراجعة المؤلف. لا تثبت من تلقائها ضعف الحوار أو اكتمال البناء الدرامي.'
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 try{
  const data=JSON.parse(readFileSync(0,'utf8'));
  process.stdout.write(JSON.stringify(reviewEpisode(data),null,2)+'\n');
 }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}

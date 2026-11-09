import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PROJECT=path.resolve(ROOT,'../projects/online-family.json');
const VOICES=path.resolve(ROOT,'../projects/online-family-voices.json');
const OUTPUT=path.resolve(ROOT,'../online-family-voiced.mp4');

function run(cmd,args){
 return new Promise((resolve,reject)=>{
  const child=spawn(cmd,args,{stdio:['ignore','inherit','pipe']});
  let err='';
  child.stderr.on('data',chunk=>{err=(err+chunk.toString()).slice(-3000)});
  child.on('error',reject);
  child.on('close',code=>code===0?resolve():reject(Error(cmd+' failed '+code+': '+err)));
 });
}
const project=JSON.parse(await fs.readFile(PROJECT,'utf8'));
const voiceData=JSON.parse(await fs.readFile(VOICES,'utf8'));
if(project.scenes.length!==12||voiceData.scenes.length!==12)throw Error('Expected 12 scenes and 12 voice tracks');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'masar-voices-'));
try{
 const manifest=path.join(dir,'project.json'),silent=path.join(dir,'silent.mp4'),combined=path.join(dir,'voices.wav');
 await fs.writeFile(manifest,JSON.stringify(project));
 await run(process.execPath,[path.join(ROOT,'render-remotion.mjs'),manifest,silent]);
 const wavFiles=[];
 for(let i=0;i<project.scenes.length;i++){
  const voice=voiceData.scenes[i];
  const u=new URL(voice.url);
  if(u.protocol!=='https:'||u.hostname!=='resource2.heygen.ai')throw Error('Unapproved voice source');
  const response=await fetch(u,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('Voice '+(i+1)+' download HTTP '+response.status);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<1000||bytes.length>15e6)throw Error('Voice file size invalid');
  const input=path.join(dir,'clip-'+i+'.wav'),output=path.join(dir,'padded-'+i+'.wav');
  await fs.writeFile(input,bytes);
  const duration=Number(project.scenes[i].duration);
  if(!Number.isFinite(duration)||duration<=0||duration>30)throw Error('Scene duration invalid');
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',input,'-af','apad,atrim=duration='+duration+',asetpts=PTS-STARTPTS','-ar','44100','-ac','2','-c:a','pcm_s16le',output]);
  wavFiles.push(output);
 }
 const list=path.join(dir,'list.txt');
 await fs.writeFile(list,wavFiles.map(f=>"file '"+f.replaceAll("'","'\\''")+"'").join('\n'));
 await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',list,'-ar','44100','-ac','2',combined]);
 await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',silent,'-i',combined,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',OUTPUT]);
 const st=await fs.stat(OUTPUT);
 if(st.size<10000)throw Error('MP4 empty');
 console.log('Created '+OUTPUT+' ('+st.size+' bytes)');
}finally{
 await fs.rm(dir,{recursive:true,force:true});
}

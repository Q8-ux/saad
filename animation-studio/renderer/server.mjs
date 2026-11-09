import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm,stat} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||10000);
const ORIGIN=process.env.ALLOWED_ORIGIN||'https://q8-ux.github.io';
const KEY=process.env.RENDER_API_KEY||'';
const BLENDER=process.env.BLENDER_BIN||'blender';
const jobs=new Map(),queue=[];let busy=false;
if(!KEY||KEY.length<24){console.error('Set RENDER_API_KEY with at least 24 characters.');process.exit(1)}
function auth(q){const token=q.headers['x-render-key']||'';const a=Buffer.from(String(token)),b=Buffer.from(KEY);return a.length===b.length&&timingSafeEqual(a,b)}
function cors(r){r.setHeader('Access-Control-Allow-Origin',ORIGIN);r.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');r.setHeader('Access-Control-Allow-Headers','Content-Type,X-Render-Key');r.setHeader('Vary','Origin');r.setHeader('Cache-Control','no-store')}
function reply(r,status,obj){cors(r);r.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});r.end(JSON.stringify(obj))}
function fail(code){throw new Error(code)}
async function body(req){let chunks=[],n=0;for await(const c of req){n+=c.length;if(n>512000)fail('payload_too_large');chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail('invalid_json')}}
function validate(input){
 if(typeof input!=='object'||!input||Array.isArray(input))fail('invalid_project');
 const engine=['auto','remotion','blender'].includes(input.engine)?input.engine:'auto';
 const aspect=['9:16','16:9','1:1'].includes(input.aspect)?input.aspect:'9:16';
 const title=String(input.title||'').slice(0,120);
 if(!Array.isArray(input.scenes)||input.scenes.length<1||input.scenes.length>40)fail('invalid_scene_count');
 let sum=0;
 const scenes=input.scenes.map((s,i)=>{
  if(!s||typeof s!=='object')fail('invalid_scene');
  let duration=Number(s.duration);
  if(!Number.isFinite(duration)||duration<1||duration>30)fail('invalid_duration');
  sum+=duration;
  const color=/^#[0-9a-fA-F]{6}$/.test(s.color||'')?s.color:'#152758';
  const clean=(v,max)=>String(v||'').slice(0,max);
  return {title:clean(s.title||'مشهد '+(i+1),120),visual:clean(s.visual,1200),narration:clean(s.narration,1200),duration,color};
 });
 if(sum>300)fail('duration_limit_300_seconds');
 const resolved=engine==='auto'?(input.style==='cinematic'?'blender':'remotion'):engine;
 return {title,scenes,aspect,engine:resolved};
}
function publicJob(j){return {id:j.id,status:j.status,engine:j.engine,createdAt:j.createdAt,startedAt:j.startedAt||null,finishedAt:j.finishedAt||null,error:j.error||null,downloadReady:j.status==='completed'}}
function run(cmd,args,timeout){return new Promise((resolve,reject)=>{
 const p=spawn(cmd,args,{cwd:ROOT,stdio:['ignore','ignore','pipe'],env:{...process.env},shell:false});
 let stderr='';p.stderr.on('data',c=>{stderr=(stderr+c.toString()).slice(-4000)});
 const timer=setTimeout(()=>{p.kill('SIGKILL');reject(Error('render_timeout'))},timeout);
 p.on('error',e=>{clearTimeout(timer);reject(Error('renderer_start_failed: '+e.code))});
 p.on('exit',(code,signal)=>{clearTimeout(timer);if(code===0)resolve();else reject(Error('renderer_failed_'+(code??signal)+': '+stderr.slice(-800)))});
 })}
async function worker(){
 if(busy||!queue.length)return;busy=true;
 const j=queue.shift();j.status='running';j.startedAt=new Date().toISOString();
 try{
  const dir=await mkdtemp(path.join(os.tmpdir(),'masar-'));
  j.dir=dir;
  const manifest=path.join(dir,'project.json'),out=path.join(dir,'video.mp4');
  await writeFile(manifest,JSON.stringify(j.project));
  if(j.engine==='blender')await run(BLENDER,['--background','--factory-startup','--python',path.join(ROOT,'blender-render.py'),'--',manifest,out],900000);
  else await run(process.execPath,[path.join(ROOT,'render-remotion.mjs'),manifest,out],900000);
  const info=await stat(out);if(info.size<1024)fail('empty_video');
  j.file=out;j.status='completed';
 }catch(e){j.error=String(e.message).slice(0,350);j.status='failed'}
 j.finishedAt=new Date().toISOString();busy=false;
 // Expire completed assets and job records; never return filesystem paths to clients.
 setTimeout(async()=>{jobs.delete(j.id);if(j.dir)await rm(j.dir,{recursive:true,force:true}).catch(()=>{})},3600000).unref();
 queueMicrotask(worker);
}
const recent=new Map();
const server=http.createServer(async(req,res)=>{
 try{
 cors(res);
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/health')return reply(res,200,{ok:true,service:'masar-animation-renderer',renderer:true,engines:['remotion','blender'],authenticationRequired:true});
 if(!auth(req))return reply(res,401,{ok:false,error:'unauthorized'});
 const now=Date.now(),ip=req.socket.remoteAddress||'unknown',hist=(recent.get(ip)||[]).filter(t=>now-t<60000);hist.push(now);recent.set(ip,hist);if(hist.length>40)return reply(res,429,{ok:false,error:'rate_limit'});
 if(req.method==='POST'&&u.pathname==='/api/render/jobs'){
  const input=await body(req);const project=validate(input);
  if(queue.length>=3||jobs.size>=20)return reply(res,429,{ok:false,error:'queue_full'});
  const id=randomUUID();const j={id,engine:project.engine,project,status:'queued',createdAt:new Date().toISOString()};jobs.set(id,j);queue.push(j);queueMicrotask(worker);
  return reply(res,202,{ok:true,job:publicJob(j)});
 }
 const m=u.pathname.match(/^\/api\/render\/jobs\/([a-f0-9-]{36})(?:\/(download))?$/);
 if(m&&req.method==='GET'){
  const j=jobs.get(m[1]);if(!j)return reply(res,404,{ok:false,error:'job_not_found'});
  if(m[2]==='download'){
   if(j.status!=='completed'||!j.file)return reply(res,409,{ok:false,error:'render_not_ready'});
   const data=await readFile(j.file);cors(res);res.writeHead(200,{'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="masar-animation.mp4"','Content-Length':data.length});res.end(data);return
  }
  return reply(res,200,{ok:true,job:publicJob(j)});
 }
 return reply(res,404,{ok:false,error:'route_not_found'});
 }catch(e){const err=String(e.message||'server_error');const bad=/^(invalid_|duration_limit|payload_too_large)/.test(err);return reply(res,bad?400:500,{ok:false,error:err.slice(0,150)})}
});
server.requestTimeout=30000;
server.listen(PORT,()=>console.log('Masar animation renderer listening on '+PORT));

import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// Share the existing host. The model is loaded only for search and released for OCR.
export function createSearchRuntime({key=process.env.STUDIO_SEARCH_KEY||'',fetchImpl=fetch,spawnImpl=spawn}={}){
 let child=null,starting=null,idle=null,imports=0,busy=false;
 const base='http://127.0.0.1:8092';
 function stop(){clearTimeout(idle);const old=child;child=null;if(old){try{process.kill(-old.pid,'SIGTERM');}catch{try{old.kill('SIGTERM');}catch{}}}}
 async function ready(){
  if(imports)throw Error('import active');
  if(!child){child=spawnImpl('python3',['/app/search/server.py'],{env:{...process.env,PORT:'8092',STUDIO_SEARCH_KEY:key},stdio:'ignore',detached:true});const current=child;current.once('exit',()=>{if(child===current)child=null;});current.once('error',()=>{if(child===current)child=null;});}
  for(let count=0;count<90;count++){
   if(!child||imports)throw Error('search stopped');
   try{const r=await fetchImpl(base+'/health',{signal:AbortSignal.timeout(1500)});if(r.ok)return;}catch{}
   await delay(350);
  }
  stop();throw Error('search startup');
 }
 return{
  configured:()=>key.length>=32,
  async embeddings(body){
   if(key.length<32||imports||busy)throw Error('search busy');busy=true;clearTimeout(idle);
   try{
    if(!starting)starting=ready().finally(()=>{starting=null;});await starting;
    const response=await fetchImpl(base+'/v1/embeddings',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});
    if(!response.ok)throw Error('embedding unavailable');
    const text=await response.text();if(text.length>100000)throw Error('embedding size');return JSON.parse(text);
   }finally{busy=false;idle=setTimeout(stop,20000);idle.unref?.();}
  },
  async forImport(operation){imports++;stop();try{await delay(150);return await operation();}finally{imports--; }},
  close:stop,
 };
}

import {mkdtemp,writeFile,stat,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {spawnSync} from 'node:child_process';
const folder=await mkdtemp(path.join(os.tmpdir(),'masar-test-'));
try{
const input=path.join(folder,'sample.json'),out=path.join(folder,'sample.mp4');
await writeFile(input,JSON.stringify({title:'اختبار مسار الرسوم المتحركة',aspect:'9:16',scenes:[{title:'مرحبًا',visual:'لقطة افتتاحية',narration:'اختبار محرك الفيديو',duration:2,color:'#152758'}]}));
const p=spawnSync(process.execPath,[new URL('./render-remotion.mjs',import.meta.url).pathname,input,out],{stdio:'inherit',timeout:180000});
if(p.status!==0)throw Error('render_failed_'+p.status);
const s=await stat(out);if(s.size<1024)throw Error('empty_video');
console.log('PASS: generated MP4 bytes='+s.size);
}finally{await rm(folder,{recursive:true,force:true})}

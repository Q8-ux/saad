import './vendor/jszip.min.js';
import {inspect} from './inspector.mjs';
self.addEventListener('message',async ({data})=>{
  try {
    const {buffer,name}=data; let zip;
    const readEntry=async(name,expected)=>{
      zip ||= await globalThis.JSZip.loadAsync(buffer,{createFolders:false,checkCRC32:false});
      const item=zip.file(name); if(!item) throw new Error('تعذر قراءة الملف الداخلي.');
      // Reject a decompression result that exceeds the declared, bounded size.
      return await new Promise((resolve,reject)=>{
        const parts=[]; let total=0,failed=false;
        const stream=item.internalStream('uint8array');
        stream.on('data',(chunk)=>{
          if(failed)return;
          total+=chunk.length;
          if(total>expected){failed=true;stream.pause();reject(new Error('حجم البيانات الفعلي أكبر من الحجم المعلن.'));return;}
          parts.push(chunk);
        }).on('error',reject).on('end',()=>{
          if(failed)return;
          if(total!==expected){reject(new Error('حجم البيانات لا يطابق الفهرس.'));return;}
          const content=new Uint8Array(total);let at=0;for(const part of parts){content.set(part,at);at+=part.length;}resolve(content);
        }).resume();
      });
    };
    const report=await inspect(buffer,name,readEntry);
    report.sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
    report.inspectedAt=new Date().toISOString(); report.scope='structural-inspection-only';
    self.postMessage({ok:true,report});
  } catch(error) {self.postMessage({ok:false,error:error.message||'تعذر فحص الملف.'});}
});

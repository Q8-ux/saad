const DB_NAME='saad-voice-studio-v1';
let opened;
export async function database() {
  if (!globalThis.indexedDB) throw new Error('التخزين المحلي غير متاح في هذا المتصفح. نزّل ملفاتك مباشرة.');
  if (!opened) opened=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{for(const name of ['captures','projects','assets'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>{opened=null;reject(req.error);};
  });
  return opened;
}
async function transaction(store,mode,callback){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);const req=callback(tx.objectStore(store));let result;req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error || new Error('تعذّر الحفظ المحلي.'));});}
export const localDB={put:(store,item)=>transaction(store,'readwrite',s=>s.put(item)),get:(store,id)=>transaction(store,'readonly',s=>s.get(id)),all:store=>transaction(store,'readonly',s=>s.getAll()),remove:(store,id)=>transaction(store,'readwrite',s=>s.delete(id))};
export function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
export function blobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
export async function dataURLToBlob(value){
  if(typeof value!=='string'||!/^data:audio\/[\w.+-]+(?:;codecs=[A-Za-z0-9_,.+-]+)?;base64,[A-Za-z0-9+/=\r\n]+$/.test(value))throw new Error('صيغة الملف الصوتي داخل النسخة غير صالحة.');
  const [head,b64]=value.split(',');const raw=atob(b64);const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return new Blob([b],{type:head.slice(5,-7)});
}
export function safeName(value,fallback='voice-studio'){return String(value||fallback).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,110)||fallback;}

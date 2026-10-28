import {api} from './ui.mjs?v=1.4.0';
export async function prepareMedia(file) {
  const video=['video/mp4','video/webm'].includes(file.type);
  if(video) {
    if(file.size>8000000) throw new Error('الفيديو حتى 8 ميغابايت');
    return {name:file.name,mime:file.type,content:base64(new Uint8Array(await file.arrayBuffer()))};
  }
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('صور JPEG أو PNG أو WebP وفيديو MP4 أو WebM فقط');
  if(file.size>12*1024*1024)throw new Error('الصورة الأصلية أكبر من 12 ميغابايت');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',.82));
  if(!blob||blob.size>1500000)throw new Error('تعذر ضغط الصورة؛ اختر صورة أصغر');
  return {name:file.name.replace(/\.[^.]+$/,'.webp'),mime:'image/webp',content:base64(new Uint8Array(await blob.arrayBuffer()))};
}
function base64(bytes) {let b='';for(let i=0;i<bytes.length;i+=8192)b+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(b);}
export async function uploadMedia(files,propertyId) {
  let uploaded=0;
  for(const file of files) {await api('/files',{method:'POST',data:{...await prepareMedia(file),propertyId}});uploaded++;}
  return uploaded;
}

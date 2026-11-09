import {decodeAudio,encodeWav,trimBounds} from './audio.mjs';
export const maxReferenceBytes=100*1024*1024;
export const maxReferenceSeconds=300;
export function validateReferenceFile(file){
 if(!file?.size)throw new Error('اختر ملف صوت أو فيديو صالحًا.');
 if(file.size>maxReferenceBytes)throw new Error('حجم الملف يتجاوز 100 ميجابايت.');
 if(!/^(audio|video)\//.test(file.type||'')&&!/\.(wav|mp3|m4a|aac|flac|ogg|opus|webm|mp4|mov|mkv)$/i.test(file.name||''))throw new Error('اختر ملف صوت أو فيديو مدعومًا.');
}
export function referenceBounds(duration,start,end){
 if(!Number.isFinite(duration)||duration<=0||duration>maxReferenceSeconds)throw new Error('اختر ملفًا لا تتجاوز مدته خمس دقائق.');
 const range=trimBounds(duration,start,end);
 if(range.length<10||range.length>30)throw new Error('اختر عينة بين 10 و30 ثانية، مع نهاية بعد البداية.');
 return range;
}
export async function prepareFileReference(file,start,end,duration){
 validateReferenceFile(file);referenceBounds(duration,start,end);
 const audio=await decodeAudio(file),range=referenceBounds(audio.duration,start,end);
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 const output=new Offline(1,Math.round(range.length*24000),24000),source=output.createBufferSource();
 source.buffer=audio;source.connect(output.destination);source.start(0,range.start,range.length);
 const rendered=await output.startRendering();return {blob:encodeWav(rendered),duration:rendered.duration,range};
}

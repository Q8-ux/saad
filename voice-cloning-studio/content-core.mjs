export const contentLimits = Object.freeze({seconds:180, scenes:12, bytes:50 * 1024 * 1024});
export const contentSizes = Object.freeze({'9:16':[720,1280], '16:9':[1280,720], '1:1':[1080,1080]});

export function buildContentPlan({title, script, aspect = '9:16', duration, images}) {
  if (typeof title !== 'string' || !title.trim()) throw new Error('اكتب عنوان المحتوى أولًا.');
  if (typeof script !== 'string' || !script.trim() || script.length > 12000) throw new Error('أدخل نصًا واضحًا لا يتجاوز 12000 حرف.');
  if (!Object.hasOwn(contentSizes, aspect)) throw new Error('اختر مقاس فيديو معروفًا.');
  if (!Number.isFinite(duration) || duration < 0.5 || duration > contentLimits.seconds) throw new Error('اختر تعليقًا صوتيًا من نصف ثانية إلى ثلاث دقائق.');
  if (!Array.isArray(images) || !images.length || images.length > contentLimits.scenes) throw new Error('أضف من صورة واحدة إلى 12 صورة للمشاهد.');
  if (duration / images.length < 0.5) throw new Error('قلّل عدد الصور أو استخدم تعليقًا أطول.');
  const words = script.trim().split(/\s+/u);
  const [width,height] = contentSizes[aspect];
  return {
    app:'sawtak-content', version:1, title:title.trim(), script, aspect, width, height, fps:24, duration,
    scenes:images.map((image,index) => ({
      id:`scene-${String(index+1).padStart(3,'0')}`,
      start:index * duration / images.length,
      end:(index+1) * duration / images.length,
      text:words.slice(Math.floor(index*words.length/images.length),Math.floor((index+1)*words.length/images.length)).join(' '),
      imageName:image.name,
    })),
    timing:'scene-based; not word-aligned transcription',
    source:'https://github.com/harry0703/MoneyPrinterTurbo',
  };
}

export function moneyPrinterTask(plan, audioPath, imagePaths) {
  if (typeof audioPath !== 'string' || !audioPath || imagePaths.length !== plan.scenes.length) throw new Error('ملفات حزمة الإنتاج غير مكتملة.');
  return {
    video_subject:plan.title, video_script:plan.script, video_language:'ar',
    video_terms:[plan.title], video_aspect:plan.aspect,
    video_source:'local', video_materials:imagePaths.map(url=>({provider:'local',url})),
    custom_audio_file:audioPath, video_count:1, video_concat_mode:'sequential',
    video_fit_mode:'cover', image_motion:'zoom',
    video_clip_duration:Math.max(1,Math.min(15,Math.round(plan.duration/plan.scenes.length))),
    voice_rate:1, voice_volume:1, bgm_type:'', bgm_volume:0,
    subtitle_enabled:true, font_name:'AL-Mohanad.ttf', font_size:60,
    n_threads:2,
  };
}

export function preparedVideoProject(plan, videoPath, audioPath) {
  return {
    project_id:'qisas-content',
    settings:{width:plan.width,height:plan.height,fps:plan.fps,narration_volume:1,bgm_volume:0},
    scenes:[{id:'prepared-video',footage:videoPath,audio:audioPath,narration:plan.script}],
  };
}

export function contentWritingBrief(topic, register = 'فصحى') {
  if (!topic?.trim()) throw new Error('اكتب عنوان المحتوى أولًا.');
  return [
    'جهّز نص فيديو لقناة قصص و روايات.',
    `الموضوع: ${JSON.stringify(topic.trim())}. اللغة: ${register === 'كويتي' ? 'كويتية طبيعية' : 'عربية فصحى واضحة'}.`,
    'ابدأ بافتتاحية مفهومة، ثم اسرد الأحداث بسبب ونتيجة، واختم بفكرة مرتبطة بالقصة.',
    'لا تخترع مصادر أو وقائع. حدّد ما يحتاج مصدرًا، وميّز الرواية التاريخية من الحقيقة الموثقة.',
    'حافظ على الأسماء والنفي والأرقام، وتجنب الحشو والمديح. قدّم النص وخطة صور للمشاهد منفصلين للمراجعة.',
  ].join('\n\n');
}

// ZIP with stored entries. No compression, remote library, upload or provider call.
const crcTable = Uint32Array.from({length:256},(_,value)=>{
  let c=value;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;
});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export async function contentZip(entries) {
  const encoder=new TextEncoder(),chunks=[],central=[],names=new Set();let offset=0;
  if (!entries.length || entries.length > 100) throw new Error('عدد ملفات الحزمة غير صالح.');
  for(const {name,data} of entries){
    if(typeof name!=='string'||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..')||names.has(name))throw new Error('اسم ملف داخل الحزمة غير صالح.');
    names.add(name);
    const filename=encoder.encode(name);
    const bytes=typeof data==='string'?encoder.encode(data):new Uint8Array(await data.arrayBuffer());
    if(filename.length>65535||bytes.length>100*1024*1024)throw new Error('حجم ملف الحزمة أكبر من الحد المسموح.');
    const crc=crc32(bytes),local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);
    lv.setUint16(12,33,true);lv.setUint32(14,crc,true);lv.setUint32(18,bytes.length,true);lv.setUint32(22,bytes.length,true);lv.setUint16(26,filename.length,true);local.set(filename,30);
    const dir=new Uint8Array(46+filename.length),dv=new DataView(dir.buffer);
    dv.setUint32(0,0x02014b50,true);dv.setUint16(4,20,true);dv.setUint16(6,20,true);dv.setUint16(8,0x800,true);
    dv.setUint16(14,33,true);dv.setUint32(16,crc,true);dv.setUint32(20,bytes.length,true);dv.setUint32(24,bytes.length,true);dv.setUint16(28,filename.length,true);dv.setUint32(42,offset,true);dir.set(filename,46);
    chunks.push(local,bytes);central.push(dir);offset+=local.length+bytes.length;
  }
  const centralSize=central.reduce((sum,x)=>sum+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:'application/zip'});
}

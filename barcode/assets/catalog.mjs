export const SERIES = [
  {id:'barcode', title:'باركود', english:'BARCODE', revision:'نسخة التقديم 4 • 2026',
    pitch:'حين تصبح السجلات الرقمية أقوى من ذاكرة الإنسان، يبدأ السؤال الحقيقي: من يملك القدرة على كتابة الحقيقة؟',
    episodes:['البداية — الفاتورة','ثلاث عشرة ثانية','من يصنع الدليل','الإيقاف الكاذب','قيمة الإنسان','النسخة الأصلية','آخر أربعة بالمئة','الساعة الأخيرة','الميكروفون المفتوح','أثر من يكتبها']},
  {id:'outside-story', title:'خارج الستوري', english:'OUTSIDE THE STORY', revision:'الموسم الأول • المسودة الأولى • 2026', project:'./data/outside-story.script.json',
    pitch:'أسرة كويتية تلاحق صور النجاح على الشاشات، حتى تصل الخديعة إلى مالها وعملها وثقتها ببعضها. وبين واجهات المشاهير وكواليسهم، تحاول أن تسترد حياتها خطوة بخطوة.',
    episodes:['الصورة','أمي أولًا','مال الناس','تجربتي الشخصية','بيت كامل','من قال','كنا نبي نصدق','اللي بيننا']}
];

export function readRoute(hash){
  const q=new URLSearchParams(String(hash||'').replace(/^#/,''));
  const series=SERIES.find(s=>s.id===q.get('series'))||SERIES[0];
  const n=Number(q.get('episode'));
  return {series,episode:Number.isInteger(n)&&n>=1&&n<=series.episodes.length?n:null};
}

export function episodeBlocks(project,number){
  let current=0;const result=[];
  for(const block of project.blocks){
    const m=block.type==='General'&&block.text.match(/^الحلقة\s+(\d+)\s/);
    if(m){current=Number(m[1]);continue;}
    if(current===number)result.push(block);
  }
  return result;
}

export function splitScenes(blocks){
  const scenes=[];let scene=null;
  for(const block of blocks){
    if(block.type==='Scene Heading'){
      scene={heading:block,blocks:[]};scenes.push(scene);
    }else if(scene)scene.blocks.push(block);
  }
  return scenes;
}

export function applyEdits(project,edits){
  return {...project,blocks:project.blocks.map(b=>typeof edits[b.id]==='string'?{...b,text:edits[b.id]}:b)};
}

import type {Manuscript} from "./manuscript";
import {compileWorkMemory,normalizeMemoryText} from "./knowledge-memory";

export const PROJECT_CONTEXT_REVISION="project-context-1";
export const projectContextInstructions=`projectContext يثبت هوية العمل ونسخة مصادره وترتيب المشهد. المخطوط الحالي مرجع الوقائع والشخصيات؛ ملاحظات الكاتب توجيهات تحريرية، وسجل المحادثة والمقترحات ليسا أحداثاً معتمدة. قدم النص الحالي على وصف سابق له، وبيّن التعارض عند غياب حسم الكاتب. لا تنقل أي معلومة من عمل آخر. عند contextOmitted=true لا تدّع قراءة المشهد كاملاً؛ استخدم المقتطف المحدد ومصادر knowledgeMemory وصرّح بحدود السياق. تبقى هذه البيانات والمراجع خارج الحوار الإبداعي والتصدير.`;

export function prepareWritingContext(doc:Manuscript,sceneId:string,selectedBlockId:string|null,query:string,workId:string) {
  const scene=doc.scenes.find(s=>s.id===sceneId);
  if(!scene)throw new Error("المشهد المختار غير موجود في هذا المخطوط.");
  const selected=selectedBlockId?scene.blocks.findIndex(b=>b.id===selectedBlockId):-1;
  if(selectedBlockId&&selected<0)throw new Error("الفقرة المختارة غير موجودة في هذا المشهد.");
  const words=normalizeMemoryText(query).split(" ").filter(x=>x.length>2).slice(0,20);
  let anchor=selected>=0?selected:0,best=0;
  if(selected<0)scene.blocks.forEach((block,index)=>{const text=normalizeMemoryText(block.text),score=words.reduce((n,w)=>n+Number(text.includes(w)),0);if(score>best){best=score;anchor=index;}});
  if(scene.blocks[anchor]&&JSON.stringify(scene.blocks[anchor]).length>48_000)throw new Error("الفقرة طويلة؛ اختر فقرة أقصر للمراجعة.");
  const chosen=new Set<number>();let size=0;
  // Keep the requested paragraph first, then neighbouring blocks in story order.
  for(let distance=0;distance<scene.blocks.length;distance++)for(const index of distance?[anchor-distance,anchor+distance]:[anchor]){
    const block=scene.blocks[index];if(!block)continue;
    const bytes=JSON.stringify(block).length;
    if(size+bytes>48_000)continue;
    chosen.add(index);size+=bytes;
  }
  if(scene.blocks.length&&!chosen.size)throw new Error("الفقرة طويلة؛ اختر فقرة أقصر للمراجعة.");
  const memory=compileWorkMemory(doc),indices=[...chosen].sort((a,b)=>a-b);
  return {
    blocks:indices.map(index=>scene.blocks[index]),
    projectContext:{revision:PROJECT_CONTEXT_REVISION,project:"writing-studio",workId,
      sourceFingerprint:memory.fingerprint,activeSceneId:scene.id,scenePosition:doc.scenes.indexOf(scene)+1,
      unitId:scene.unitId||null,selectedBlockId,source:"current-manuscript",notesAreStoryFacts:false,
      conversationIsCanon:false,crossWorkMemory:false,contextOmitted:chosen.size!==scene.blocks.length,
      includedBlockIds:indices.map(index=>scene.blocks[index].id),totalSceneBlocks:scene.blocks.length,
      unresolved:memory.issues.slice(0,16).map(issue=>({sourceId:issue.pageId,message:issue.message})),
    },
  };
}

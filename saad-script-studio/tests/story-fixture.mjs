import {newProject,validatePlan} from '../assets/core.mjs';
import {newCharacter,newBeat,storyFingerprint,planFromBeats} from '../assets/story.mjs';
export function completeProject() {
  const p=newProject('الوثيقة الأخيرة');p.sceneCount=2;p.author='كاتب المثال';
  p.idea='يجد جابر وثيقة تثبت حق أهل الحي في المبنى القديم، وعليه استعادتها من خالد قبل انتهاء مهلة الاعتراض.';
  Object.assign(p.pillars,{hero:'جابر',goal:'استعادة الوثيقة الأصلية',obstacle:'خالد يرفض إعادتها',stakes:'يضيع حق أهل الحي في المبنى',ending:'تسلم الوثيقة في المهلة ويعترف جابر بخطئه السابق'});
  Object.assign(p.story,{problem:'أصل الوثيقة مفقود',need:'إثبات الحق قبل غلق الملف',urgency:'تنتهي المهلة مساء اليوم',stageGoal:'معرفة من أخذ الوثيقة',means:'معرفته بسجل الأرشيف وقدرته على الاعتراف بخطئه',conflictNature:'صراع درامي بين الخوف من الاعتراف وحماية حق الآخرين',logline:'يسعى جابر لاستعادة وثيقة من خالد قبل انتهاء المهلة، وإلا ضاع حق أهل الحي في المبنى.',opening:'جابر يخفي خطأه في فهرسة الوثيقة',inciting:'يجد إشعار انتهاء المهلة',entryPoint:'نبدأ عند قراءة إشعار المهلة'});
  const hero=Object.assign(newCharacter(),{role:'hero',name:'جابر',goal:'حماية الحق',need:'تحمل مسؤوليته',motive:'كان خطؤه سبب ضياع الدليل',knowledge:'يعرف رقم الملف، ولا يعرف مكان الأصل',arc:'يتوقف عن إخفاء خطئه ويعترف'});
  const opponent=Object.assign(newCharacter(),{role:'opponent',name:'خالد',goal:'حماية اسمه',need:'التخلي عن السيطرة',motive:'يخشى أن ينسب إليه الخطأ',knowledge:'يعرف مكان الأصل',arc:'ينكشف خوفه حين يواجهه جابر'});
  p.story.characters=[hero,opponent];
  const first=Object.assign(newBeat('opening'),{character:'جابر',heading:'داخلي - الأرشيف - نهار',event:'يقرأ الإشعار ويسأل خالد عن الوثيقة',goal:'معرفة مكان الوثيقة',obstacle:'خالد يرفض التعاون',attempt:'يعرض سجل الفهرسة ويعترف بخطئه',result:'يكشف خالد أن الوثيقة في الخزانة',decision:'يقرر جابر تسليم الوثيقة بنفسه',cause:'معرفة مكان الوثيقة تتيح استعادتها والذهاب إلى المكتب',stakes:'تنتهي المهلة اليوم',knowledge:'رقم الملف والمهلة'});
  const last=Object.assign(newBeat('ending'),{character:'جابر',heading:'داخلي - مكتب التسجيل - مساء',event:'يسلم الوثيقة ويوقع اعترافه',result:'يسجل الحق في المهلة',knowledge:'يعرف مكان الأصل وسبب احتفاظ خالد به'});
  p.story.beats=[first,last];p.story.approval={fingerprint:storyFingerprint(p),date:'2026-10-11T03:00:00.000Z'};
  p.plan=validatePlan(planFromBeats(p));p.plan.scenes[0].knowledgeAfter='يعرف أن الأصل في الخزانة';p.plan.scenes[1].knowledgeAfter='يعرف أن الحق سجل';return p;
}

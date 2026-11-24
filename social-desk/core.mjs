export const VERSION = 1;
export const AGENTS = [
  {id:'research',name:'راصد الأفكار',icon:'search',color:'#9c5d26',tint:'#fff1e2',tools:'Crawl4AI',task:'يجمع زوايا الموضوع ومصادره',detail:'يرتب الموضوع والمعلومات التي تضيفها إلى الحملة. في الوضع المحلي لا يجلب أخبارًا أو يدعي اكتشاف ترندات حية. يحتاج الرصد الخارجي إلى مصدر بيانات موصول.',x:84,y:37},
  {id:'strategy',name:'المخطط',icon:'strategy',color:'#166e70',tint:'#e3f5f2',tools:'Marketing Skills · Repomix',task:'يضع الهدف ونبرة المحتوى',detail:'يحدد الهدف والجمهور والمنصة ونبرة الكتابة، ويجهز هيكلًا عمليًا للمنشور.',x:53,y:37},
  {id:'writer',name:'كاتب المحتوى',icon:'pen',color:'#71609c',tint:'#eee9f8',tools:'Social Media Skills',task:'يحول فكرتك إلى مسودة عربية',detail:'يجهز عنوانًا ونصًا ودعوة للتفاعل ووسومًا. القوالب المحلية لا تدعي إجراء بحث، ويمكن استخدام خادم توليد متصل للحصول على كتابة من نموذج ذكاء اصطناعي.',x:19,y:37},
  {id:'designer',name:'المصمم',icon:'design',color:'#a24c83',tint:'#fbe8f2',tools:'ComfyUI · Remotion',task:'يجهز قالبًا بصريًا لمحتواك',detail:'يجهز تصميم منشور عربي قابلًا للتنزيل بصيغة SVG. القالب الحالي يعمل داخل المتصفح؛ خدمات ComfyUI وRemotion ليست متصلة بعد.',x:19,y:76},
  {id:'publisher',name:'مسؤول النشر',icon:'send',color:'#176d4f',tint:'#e3f4e9',tools:'Postiz أو TryPost',task:'ينظم المراجعة وجدول المحتوى',detail:'يحفظ اعتمادك والموعد الذي تحدده بتوقيت الكويت. هذه المواعيد محلية ولا تنشر شيئًا على حسابات التواصل. يجب ربط خدمة نشر لتفعيل الإرسال الفعلي.',x:53,y:76},
  {id:'analyst',name:'محلل النتائج',icon:'chart',color:'#5e5aa5',tint:'#eeecff',tools:'Metabase · Langfuse',task:'يلخص تقدم العمل والنتائج',detail:'يعرض أعداد مسوداتك واعتماداتك ومواعيدك المحفوظة. الوصول والتفاعل والمتابعون غير متاحة حتى ربط مصدر قياسات حقيقي.',x:84,y:76}
];
export const TOOLS = [
  ['LangGraph','تنظيم سير الفريق','langchain-ai/langgraph','LG',2],
  ['n8n','ربط وأتمتة المراحل','n8n-io/n8n','n8',4],
  ['Crawl4AI','جمع محتوى الويب','unclecode/crawl4ai','C4',0],
  ['Marketing Skills','أطر التسويق والاستراتيجية','coreyhaines31/marketingskills','MK',1],
  ['Social Media Skills','مهارات كتابة المحتوى','pavelhov/social-media-skills','SM',2],
  ['Repomix','تجهيز ملفات المرجع','yamadashy/repomix','RP',1],
  ['ComfyUI','معالجة الوسائط بالنماذج','Comfy-Org/ComfyUI','CF',3],
  ['Remotion','إنتاج الفيديو برمجيًا','remotion-dev/remotion','RM',3],
  ['Postiz','إدارة وجدولة النشر','gitroomhq/postiz-app','PZ',4],
  ['TryPost','النشر عبر MCP وAPI','trypostit/trypost','TP',4],
  ['Metabase','لوحات تحليل البيانات','metabase/metabase','MB',5],
  ['Langfuse','تتبع النماذج وتقييمها','langfuse/langfuse','LF',5]
];
export const PLATFORMS=['إنستغرام','إكس','تيك توك','لينكدإن','يوتيوب'];
export const arabicNumber = value => new Intl.NumberFormat('ar-KW').format(value);
export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (value,max=8000) => typeof value==='string'?value.slice(0,max):'';
export function safeUrl(value){
  if(!value) return '';
  try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
export function gatewayUrl(value){
  if(!value)return '';
  const url=safeUrl(value);return url.startsWith('https://')?url:'';
}
export function freshState(){return {version:VERSION,campaigns:[],events:[],selectedId:null,settings:{mode:'local',gateway:''}};}
export function newCampaign(brief,id,now=new Date().toISOString()){
  const topic=text(brief.topic,220).trim();
  if(!topic)throw new Error('اكتب موضوع الحملة أولًا.');
  if(brief.sourceUrl&&!safeUrl(brief.sourceUrl))throw new Error('الرابط المرجعي يجب أن يبدأ بـ https أو http.');
  return {id,createdAt:now,updatedAt:now,topic,brand:text(brief.brand,100)||'مشروعي',platform:PLATFORMS.includes(brief.platform)?brief.platform:PLATFORMS[0],goal:text(brief.goal,100)||'تعريف الجمهور',tone:text(brief.tone,100)||'عربية واضحة',facts:text(brief.facts,5000).trim(),sourceUrl:safeUrl(brief.sourceUrl),step:-1,status:'draft',output:null,strategy:'',scheduledAt:null,approvedAt:null,origin:'local'};
}
export function localDraft(c){
  const friendly=c.tone==='خليجية خفيفة';
  const cta=c.goal==='استقبال الاستفسارات'?(friendly?'عندك استفسار؟ اكتب لنا وخلنا نعرف شنو تحتاج.':'لديك استفسار؟ تواصل معنا لنفهم ما تحتاجه.'):
    c.goal==='زيادة التفاعل'?(friendly?'شنو رأيك؟ شاركنا تجربتك بالتعليقات.':'ما رأيك؟ شاركنا تجربتك في التعليقات.'):
    c.goal==='التوعية والتعليم'?'احفظ الموضوع وشاركنا السؤال الذي تود أن نناقشه لاحقًا.':(friendly?'تابعنا وخلنا نعرّفك على مشروعنا خطوة بخطوة.':'تابعنا لتتعرف إلى مشروعنا خطوة بخطوة.');
  const body=c.facts|| (friendly?`خلنا نفتح موضوع ${c.topic} مع بعض.\n\nشنو أول شيء ودك تعرفه عنه؟ وأي جانب تحس إنه الأقرب لاهتمامك؟\n\nأسئلتكم تساعدنا نختار المحتوى القادم في ${c.brand}.`:`نفتح اليوم مساحة للحديث عن ${c.topic}.\n\nما أول سؤال يخطر ببالك حول هذا الموضوع؟ وما الجانب الذي تود أن نتناوله بالتفصيل؟\n\nأسئلتكم تساعدنا على اختيار المحتوى القادم في ${c.brand}.`);
  const words=c.topic.replace(/[؟?!.,،:؛<>#]/g,'').trim().split(/\s+/).slice(0,4);
  return {hook:c.topic,body,cta,hashtags:['#'+words.join('_'),'#'+c.brand.replace(/\s+/g,'_')].join(' ')};
}
export function normalizeOutput(value){
  if(!value||typeof value!=='object'||typeof value.hook!=='string'||typeof value.body!=='string'||!value.hook.trim()||!value.body.trim())throw new Error('رد خادم التوليد لا يحتوي على عنوان ونص صالحين.');
  return {hook:text(value.hook,220).trim(),body:text(value.body,8000).trim(),cta:text(value.cta,350).trim(),hashtags:Array.isArray(value.hashtags)?value.hashtags.slice(0,20).map(x=>text(x,60)).join(' '):text(value.hashtags,600)};
}
export function strategyFor(c){
  return `الهدف: ${c.goal}\nالمنصة: ${c.platform}\nالنبرة: ${c.tone}\nالجمهور: المهتمون بمحتوى ${c.brand}\nالهيكل: عنوان واضح، معلومة أو سؤال رئيسي، ثم دعوة للتفاعل.\nالمصدر: ${c.facts?'المعلومات التي أضفتها إلى الحملة':'لا توجد معلومات مرجعية؛ المسودة تفتح نقاشًا دون إضافة ادعاءات.'}`;
}
export function fullCopy(c){return c?.output?[c.output.hook,c.output.body,c.output.cta,c.output.hashtags].filter(Boolean).join('\n\n'):'';}
export function metrics(campaigns){
  return {total:campaigns.length,drafts:campaigns.filter(c=>c.status==='draft').length,approved:campaigns.filter(c=>c.status==='approved').length,scheduled:campaigns.filter(c=>c.status==='scheduled').length};
}
export function approveEdit(c,output,approved,now=new Date().toISOString()){
  return {...c,output:normalizeOutput(output),updatedAt:now,status:approved?'approved':'draft',approvedAt:approved?now:null,scheduledAt:null,step:approved?5:4};
}
export function kuwaitInput(date=new Date()){
  return new Date(date.getTime()+3*3600000).toISOString().slice(0,16);
}
export function scheduleKuwait(c,local,now=Date.now()){
  if(!c.approvedAt||!['approved','scheduled'].includes(c.status))throw new Error('راجع المحتوى واعتمده قبل تحديد الموعد.');
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw new Error('اختر تاريخًا ووقتًا صالحين.');
  const date=new Date(local+':00+03:00');
  if(!Number.isFinite(date.getTime())||kuwaitInput(date)!==local||date.getTime()<=now)throw new Error('اختر موعدًا صالحًا في المستقبل بتوقيت الكويت.');
  return {...c,status:'scheduled',scheduledAt:date.toISOString(),updatedAt:new Date(now).toISOString(),step:5};
}
export function validateState(value){
  if(!value||value.version!==VERSION||!Array.isArray(value.campaigns)||value.campaigns.length>500)throw new Error('ملف مساحة العمل غير صالح أو إصداره غير مدعوم.');
  const ids=new Set();
  const campaigns=value.campaigns.map(v=>{
    if(!v||typeof v.id!=='string'||!v.id||v.id.length>100||ids.has(v.id)||typeof v.topic!=='string'||!v.topic.trim()||!Number.isFinite(Date.parse(v.createdAt)))throw new Error('توجد حملة غير صالحة في الملف.');
    ids.add(v.id);
    const c=newCampaign(v,v.id.slice(0,100),v.createdAt);
    c.updatedAt=Number.isFinite(Date.parse(v.updatedAt))?v.updatedAt:c.createdAt;
    c.step=Number.isInteger(v.step)?Math.max(-1,Math.min(5,v.step)):-1;
    c.output=v.output?normalizeOutput(v.output):null;
    c.strategy=text(v.strategy,6000);c.origin=v.origin==='gateway'?'gateway':'local';
    if(c.output&&Number.isFinite(Date.parse(v.approvedAt))){c.approvedAt=v.approvedAt;c.status='approved';}
    if(c.approvedAt&&v.status==='scheduled'&&Number.isFinite(Date.parse(v.scheduledAt))){c.status='scheduled';c.scheduledAt=v.scheduledAt;}
    return c;
  });
  const events=Array.isArray(value.events)?value.events.slice(-500).filter(v=>v&&Number.isFinite(Date.parse(v.at))).map(v=>({at:v.at,title:text(v.title,150),message:text(v.message,500),agent:Number.isInteger(v.agent)?Math.max(-1,Math.min(5,v.agent)):-1})):[];
  const settings={mode:value.settings?.mode==='gateway'?'gateway':'local',gateway:gatewayUrl(value.settings?.gateway)};
  if(!settings.gateway)settings.mode='local';
  return {version:VERSION,campaigns,events,selectedId:campaigns.some(c=>c.id===value.selectedId)?value.selectedId:campaigns.at(-1)?.id||null,settings};
}
export function exportState(state){return {...state,settings:{mode:'local',gateway:''},exportedAt:new Date().toISOString()};}
function linesOf(input,max=27){
  const words=input.split(/\s+/);const lines=[];let line='';
  for(const word of words){if((line+' '+word).trim().length>max&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}
  if(line)lines.push(line);return lines.slice(0,8).map(l=>l.length>max+5?l.slice(0,max+4)+'…':l);
}
export function designSvg(c,fontData=''){
  if(!c?.output)throw new Error('جهز مسودة أولًا.');
  const legal=c.brand==='سابق القانونية',medical=c.brand==='الدكتور حمد';
  const bg=medical?'#f3eee6':legal?'#eef3f0':'#f0edf9';
  const ink=medical?'#17324d':legal?'#1e5947':'#4d3674';
  const lines=linesOf(c.output.hook,30);const titleSize=lines.length>5?40:lines.length>4?48:61;const titleStep=Math.min(94,470/Math.max(1,lines.length-1));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#e3f2eb"/></linearGradient><style>${fontData?`@font-face{font-family:WorkspaceCairo;src:url('${fontData}') format('woff');font-weight:200 1000}`:''}text{font-family:WorkspaceCairo,Cairo,Arial,sans-serif}</style></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="100" cy="180" r="310" fill="none" stroke="${ink}" stroke-opacity=".09" stroke-width="2"/><circle cx="100" cy="180" r="270" fill="none" stroke="${ink}" stroke-opacity=".09" stroke-width="2"/><circle cx="950" cy="1000" r="250" fill="none" stroke="${ink}" stroke-opacity=".08" stroke-width="2"/><rect x="80" y="83" width="68" height="6" rx="3" fill="${ink}"/><text x="995" y="110" direction="rtl" text-anchor="start" font-size="29" fill="${ink}" font-weight="650">${esc(c.brand)}</text><text x="995" y="270" direction="rtl" text-anchor="start" font-size="23" fill="${ink}" opacity=".7">${esc(c.goal)}</text>${lines.map((line,i)=>`<text x="995" y="${350+i*titleStep}" direction="rtl" text-anchor="start" font-size="${titleSize}" font-weight="800" fill="${ink}">${esc(line)}</text>`).join('')}<path d="M87 830h906" stroke="${ink}" stroke-opacity=".15"/><text x="995" y="900" direction="rtl" text-anchor="start" font-size="29" fill="${ink}">${esc(c.output.cta.length<65?c.output.cta:'شاركنا رأيك في التعليقات')}</text><text x="995" y="985" direction="rtl" text-anchor="start" font-size="22" fill="${ink}" opacity=".65">${esc(c.platform)}</text><text x="90" y="992" fill="${ink}" opacity=".45" font-size="40">✦</text></svg>`;
}

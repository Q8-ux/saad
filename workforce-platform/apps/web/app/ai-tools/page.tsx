'use client';

import {useMemo,useState} from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import {useLanguage} from '../components/LanguageProvider';

type ToolDefinition={id:string;arTitle:string;enTitle:string;arDesc:string;enDesc:string};
const toolDefinitions:ToolDefinition[]=[
 {id:'ATTENDANCE',arTitle:'الحضور الذكي',enTitle:'Smart Attendance',arDesc:'كشف أنماط التلاعب والتأخير وضعف GPS',enDesc:'Detect manipulation patterns, delays, and weak GPS accuracy'},
 {id:'TRANSFERS',arTitle:'الانتقالات',enTitle:'Transfers',arDesc:'تحليل المسافة والمدة والتأخير والانحراف',enDesc:'Analyze distance, duration, delay, and route deviation'},
 {id:'EMERGENCY',arTitle:'الطوارئ',enTitle:'Emergency',arDesc:'ترتيب الأولويات وتحليل الإخلاء والحالات غير المؤكدة',enDesc:'Prioritize incidents and assess evacuation and unconfirmed cases'},
 {id:'SAFETY',arTitle:'السلامة',enTitle:'Safety',arDesc:'اقتراح المخاطر والضوابط وقوائم الفحص',enDesc:'Suggest hazards, controls, and inspection checklists'},
 {id:'ASSETS',arTitle:'الأصول الحرجة',enTitle:'Critical Assets',arDesc:'تحديد أولويات الفحص والصيانة',enDesc:'Prioritize inspection and maintenance activities'},
 {id:'REPORTS',arTitle:'التقارير',enTitle:'Reports',arDesc:'إنشاء تقرير تنفيذي من البيانات التشغيلية',enDesc:'Generate executive reports from operational data'},
 {id:'NOTIFICATIONS',arTitle:'التنبيهات',enTitle:'Notifications',arDesc:'صياغة تنبيه مناسب للتطبيق وواتساب والبريد',enDesc:'Draft alerts for the app, WhatsApp, and email'},
 {id:'EXECUTIVE',arTitle:'الإدارة التنفيذية',enTitle:'Executive Management',arDesc:'ملخص القرارات والمخاطر والأثر التشغيلي',enDesc:'Summarize decisions, risks, and operational impact'},
];

type Result={summary:string;riskLevel:string;findings:string[];recommendations:string[];requiresHumanReview:boolean;confidenceNote:string};

export default function AiToolsPage(){
 const {language}=useLanguage();
 const t=(ar:string,en:string)=>language==='ar'?ar:en;
 const api=process.env.NEXT_PUBLIC_API_URL!;
 const defaultTask=useMemo(()=>t('حلل البيانات وحدد أهم المخاطر والإجراءات المقترحة.','Analyze the data and identify the most important risks and recommended actions.'),[language]);
 const [section,setSection]=useState('ATTENDANCE');
 const [task,setTask]=useState(defaultTask);
 const [data,setData]=useState('{}');
 const [result,setResult]=useState<Result|null>(null);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(false);

 async function run(){
  let parsed:unknown;
  try{parsed=JSON.parse(data||'{}')}catch{return setMessage(t('صيغة بيانات JSON غير صحيحة.','Invalid JSON data format.'))}
  setLoading(true);setMessage(t('جارٍ التحليل...','Running analysis...'));setResult(null);
  try{
   const response=await fetch(`${api}/ai/analyze`,{method:'POST',headers:{Authorization:`Bearer ${window.localStorage.getItem('token')||''}`,'Content-Type':'application/json'},body:JSON.stringify({section,task,data:parsed,language})});
   const payload=await response.json();
   if(!response.ok){setMessage(payload.message||t('تعذر تشغيل الأداة','Unable to run the tool'));return}
   setResult(payload.result||payload);setMessage(t('اكتمل التحليل.','Analysis completed.'));
  }catch{setMessage(t('تعذر الاتصال بخدمة الذكاء الاصطناعي.','Unable to connect to the AI service.'))}finally{setLoading(false)}
 }

 return <main className="appMain aiToolsPage">
  <section className="pageHero"><div><span className="eyebrow">{t('منصة نطاق العمل','WORK SCOPE PLATFORM')}</span><h1>{t('مركز الذكاء الاصطناعي','AI Center')}</h1><p>{t('أدوات متخصصة لكل قسم مع مراجعة بشرية للقرارات الحساسة.','Specialized tools for every department with human review for sensitive decisions.')}</p></div><Link href="/dashboard" className="heroBack">{t('العودة','Back')}</Link></section>

  <section className="aiToolGrid section">{toolDefinitions.map(tool=><button type="button" key={tool.id} className={`aiToolCard ${section===tool.id?'activeAiTool':''}`} onClick={()=>setSection(tool.id)}><b>{language==='ar'?tool.arTitle:tool.enTitle}</b><small>{language==='ar'?tool.arDesc:tool.enDesc}</small></button>)}</section>

  <section className="grid twoCols section">
   <div className="card servicePanel"><h2>{t('تشغيل الأداة','Run Tool')}</h2><label>{t('المهمة','Task')}</label><textarea value={task} onChange={event=>setTask(event.target.value)}/><label>{t('البيانات التشغيلية بصيغة JSON','Operational Data in JSON')}</label><textarea className="codeInput" value={data} onChange={event=>setData(event.target.value)} placeholder='{"records":[]}'/><button onClick={run} disabled={loading}>{loading?t('جارٍ التحليل...','Running analysis...'):t('تشغيل التحليل الذكي','Run AI Analysis')}</button>{message&&<div className="notice">{message}</div>}</div>
   <div className="card servicePanel"><h2>{t('النتيجة','Result')}</h2>{!result?<p className="muted">{t('اختر القسم وأدخل البيانات ثم شغّل التحليل.','Choose a department, enter the data, and run the analysis.')}</p>:<><div className="decisionBox"><b>{result.summary}</b><p>{t('مستوى المخاطر','Risk level')}: {result.riskLevel}</p><p>{t('تحتاج مراجعة بشرية','Human review required')}: {result.requiresHumanReview?t('نعم','Yes'):t('لا','No')}</p></div><h3>{t('الملاحظات','Findings')}</h3><ul>{result.findings.map((item,index)=><li key={index}>{item}</li>)}</ul><h3>{t('التوصيات','Recommendations')}</h3><ul>{result.recommendations.map((item,index)=><li key={index}>{item}</li>)}</ul><p className="muted">{result.confidenceNote}</p></>}</div>
  </section>

  <nav className="mobileNav"><Link href="/dashboard"><AppIcon name="home"/><span>{t('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="check"/><span>{t('الحضور','Attendance')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('الانتقال','Transfers')}</span></Link><Link href="/ai-tools"><AppIcon name="ai"/><span>{t('الذكاء','AI')}</span></Link><Link href="/profile"><AppIcon name="profile"/><span>{t('حسابي','Profile')}</span></Link></nav>
 </main>
}

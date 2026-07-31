'use client';
import {useState} from 'react';
import Link from 'next/link';

const tools=[
 ['ATTENDANCE','الحضور الذكي','كشف أنماط التلاعب والتأخير وضعف GPS'],
 ['TRANSFERS','الانتقالات','تحليل المسافة والمدة والتأخير والانحراف'],
 ['EMERGENCY','الطوارئ','ترتيب الأولويات وتحليل الإخلاء والحالات غير المؤكدة'],
 ['SAFETY','السلامة','اقتراح المخاطر والضوابط وقوائم الفحص'],
 ['ASSETS','الأصول الحرجة','تحديد أولويات الفحص والصيانة'],
 ['REPORTS','التقارير','إنشاء تقرير تنفيذي من البيانات التشغيلية'],
 ['NOTIFICATIONS','التنبيهات','صياغة تنبيه مناسب للتطبيق وواتساب والبريد'],
 ['EXECUTIVE','الإدارة التنفيذية','ملخص القرارات والمخاطر والأثر التشغيلي'],
] as const;

type Result={summary:string;riskLevel:string;findings:string[];recommendations:string[];requiresHumanReview:boolean;confidenceNote:string};

export default function AiToolsPage(){
 const api=process.env.NEXT_PUBLIC_API_URL!;
 const [section,setSection]=useState('ATTENDANCE');
 const [task,setTask]=useState('حلل البيانات وحدد أهم المخاطر والإجراءات المقترحة.');
 const [data,setData]=useState('{}');
 const [result,setResult]=useState<Result|null>(null);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(false);
 async function run(){
  let parsed:unknown;try{parsed=JSON.parse(data||'{}')}catch{return setMessage('صيغة البيانات JSON غير صحيحة.')}
  setLoading(true);setMessage('جارٍ التحليل...');setResult(null);
  try{
   const r=await fetch(`${api}/ai/analyze`,{method:'POST',headers:{Authorization:`Bearer ${window.localStorage.getItem('token')||''}`,'Content-Type':'application/json'},body:JSON.stringify({section,task,data:parsed,language:'ar'})});
   const d=await r.json();if(!r.ok){setMessage(d.message||'تعذر تشغيل الأداة');return}setResult(d.result);setMessage('اكتمل التحليل.');
  }catch{setMessage('تعذر الاتصال بخدمة الذكاء الاصطناعي.')}finally{setLoading(false)}
 }
 return <main className="appMain"><section className="pageHero"><div><span className="eyebrow">منصة نطاق العمل</span><h1>🤖 مركز الذكاء الاصطناعي</h1><p>أدوات متخصصة لكل قسم مع مراجعة بشرية للقرارات الحساسة.</p></div><Link href="/dashboard" className="heroBack">العودة</Link></section>
 <section className="aiToolGrid section">{tools.map(([id,title,desc])=><button type="button" key={id} className={`aiToolCard ${section===id?'activeAiTool':''}`} onClick={()=>setSection(id)}><b>{title}</b><small>{desc}</small></button>)}</section>
 <section className="grid twoCols section"><div className="card servicePanel"><h2>تشغيل الأداة</h2><label>المهمة</label><textarea value={task} onChange={e=>setTask(e.target.value)}/><label>البيانات التشغيلية بصيغة JSON</label><textarea className="codeInput" value={data} onChange={e=>setData(e.target.value)} placeholder='{"records":[]}'/><button onClick={run} disabled={loading}>{loading?'جارٍ التحليل...':'تشغيل التحليل الذكي'}</button>{message&&<div className="notice">{message}</div>}</div>
 <div className="card servicePanel"><h2>النتيجة</h2>{!result?<p className="muted">اختر القسم وأدخل البيانات ثم شغّل التحليل.</p>:<><div className="decisionBox"><b>{result.summary}</b><p>مستوى المخاطر: {result.riskLevel}</p><p>تحتاج مراجعة بشرية: {result.requiresHumanReview?'نعم':'لا'}</p></div><h3>الملاحظات</h3><ul>{result.findings.map((x,i)=><li key={i}>{x}</li>)}</ul><h3>التوصيات</h3><ul>{result.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul><p className="muted">{result.confidenceNote}</p></>}</div></section>
 <nav className="mobileNav"><Link href="/dashboard">⌂<span>الرئيسية</span></Link><Link href="/attendance-smart">📍<span>الحضور</span></Link><Link href="/transfers">🚗<span>الانتقال</span></Link><Link href="/ai-tools">🤖<span>الذكاء</span></Link><Link href="/profile">👤<span>حسابي</span></Link></nav></main>}

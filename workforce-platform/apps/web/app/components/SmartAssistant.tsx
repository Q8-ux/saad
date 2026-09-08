'use client';
import {useState} from 'react';
import Link from 'next/link';
import AppIcon from './AppIcon';
import {useLanguage} from './LanguageProvider';

const quickAr=['حلل الحالة التشغيلية','ما أهم المخاطر الآن؟','راجع الحضور والانتقالات','ما القرارات التي تحتاج مراجعة؟'];
const quickEn=['Analyze operations','What are the main risks?','Review attendance and transfers','Which decisions need review?'];
export default function SmartAssistant(){
 const{language}=useLanguage();const ar=language==='ar';
 const[open,setOpen]=useState(false);const[input,setInput]=useState('');const[answer,setAnswer]=useState('');const[loading,setLoading]=useState(false);
 async function ask(text=input){if(!text.trim())return;setLoading(true);setAnswer('');try{const api=process.env.NEXT_PUBLIC_API_URL;const r=await fetch(`${api}/ai/analyze`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${window.localStorage.getItem('token')||''}`},body:JSON.stringify({section:'EXECUTIVE',task:text,data:{source:'work-scope-platform',humanApprovalRequired:true},language})});const p=await r.json();const x=p.result||p;setAnswer(x.summary||x.message||(ar?'تم تحليل الطلب. راجع مركز الذكاء الاصطناعي للتفاصيل.':'Request analyzed. Open the AI Center for details.'))}catch{setAnswer(ar?'خدمة التحليل غير متاحة حالياً. لم يتم تنفيذ أي إجراء، ويمكن متابعة البيانات من لوحة التحكم.':'Analysis service is currently unavailable. No action was executed; continue from the dashboard.')}finally{setLoading(false)}}
 const quick=ar?quickAr:quickEn;
 return <><button className="smartAssistantFab" onClick={()=>setOpen(v=>!v)} aria-label={ar?'فتح المساعد الذكي':'Open smart assistant'}><AppIcon name="ai" size={22}/></button>{open&&<aside className="smartAssistantPanel" role="dialog" aria-label={ar?'المساعد الذكي':'Smart assistant'}><header><div><b>{ar?'مساعد القرار الذكي':'AI Decision Assistant'}</b><small>{ar?'تحليل وتوصية مع اعتماد بشري':'Analysis and recommendations with human approval'}</small></div><button onClick={()=>setOpen(false)} aria-label={ar?'إغلاق':'Close'}>×</button></header><div className="assistantQuick">{quick.map(q=><button key={q} onClick={()=>{setInput(q);void ask(q)}}>{q}</button>)}</div><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={ar?'اكتب سؤالك التشغيلي...':'Ask an operational question...'}/><button className="assistantRun" disabled={loading} onClick={()=>void ask()}>{loading?(ar?'جارٍ التحليل...':'Analyzing...'):(ar?'تحليل':'Analyze')}</button>{answer&&<div className="assistantAnswer">{answer}</div>}<footer><span>{ar?'لا ينفذ قرارات حساسة دون اعتماد المسؤول.':'Sensitive actions require authorized human approval.'}</span><Link href="/ai-tools">{ar?'فتح مركز التحليل':'Open AI Center'}</Link></footer></aside>}</>
}

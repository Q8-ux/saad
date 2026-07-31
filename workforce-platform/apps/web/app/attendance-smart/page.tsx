'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Employee = { id:string; employeeNo:string; fullNameAr:string };
type Station = { id:string; nameAr:string; geofenceM:number };
type Result = { decision:string; riskScore:number; rejectionReason?:string; distanceFromStationM?:string; recordedAt?:string };
type AiResult={summary?:string;riskLevel?:string;findings?:string[];recommendations?:string[];requiresHumanReview?:boolean;confidenceNote?:string};

const decisionLabel:Record<string,string>={ACCEPTED:'تم الاعتماد',ACCEPTED_WITH_WARNING:'تم الاعتماد مع تنبيه',REVIEW_REQUIRED:'محفوظ للمراجعة',REJECTED:'مرفوض'};
const shortName=(name:string)=>name.trim().split(/\s+/).slice(0,2).join(' ');

export default function SmartAttendancePage(){
  const api=process.env.NEXT_PUBLIC_API_URL!;
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [stations,setStations]=useState<Station[]>([]);
  const [employeeId,setEmployeeId]=useState('');
  const [stationId,setStationId]=useState('');
  const [type,setType]=useState<'CHECK_IN'|'CHECK_OUT'>('CHECK_IN');
  const [position,setPosition]=useState<GeolocationPosition|null>(null);
  const [locationError,setLocationError]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<Result|null>(null);
  const [message,setMessage]=useState('');
  const [aiLoading,setAiLoading]=useState(false);
  const [aiResult,setAiResult]=useState<AiResult|null>(null);

  const headers=()=>({Authorization:`Bearer ${window.localStorage.getItem('token')||''}`,'Content-Type':'application/json'});

  async function load(){
    const [er,sr]=await Promise.all([fetch(`${api}/employees`,{headers:headers()}),fetch(`${api}/stations`,{headers:headers()})]);
    if(er.ok){const d=await er.json();setEmployees(d);if(d[0])setEmployeeId(d[0].id)}
    if(sr.ok){const d=await sr.json();setStations(d);if(d[0])setStationId(d[0].id)}
  }

  function readLocation(){
    setLocationError('');setMessage('جارٍ تحديد الموقع بدقة...');
    navigator.geolocation.getCurrentPosition(v=>{setPosition(v);setMessage('تم تحديد الموقع. يمكنك تنفيذ العملية الآن.')},e=>{setPosition(null);setLocationError(e.message||'تعذر الوصول إلى موقع الجهاز');setMessage('')},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  }

  async function submit(){
    if(!employeeId||!stationId)return setMessage('اختر الموظف والمنشأة.');
    if(!position)return readLocation();
    setLoading(true);setResult(null);setAiResult(null);setMessage('جارٍ التحقق من النطاق الجغرافي...');
    try{
      const r=await fetch(`${api}/attendance/punch`,{method:'POST',headers:headers(),body:JSON.stringify({employeeId,stationId,type,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracyM:position.coords.accuracy,locationTimestamp:new Date(position.timestamp).toISOString(),deviceId:navigator.userAgent.slice(0,180),mockLocationDetected:false,deviceIntegrity:'UNVERIFIED_WEB'})});
      const d=await r.json();
      if(!r.ok){const detail=d?.message;setResult({decision:'REJECTED',riskScore:detail?.riskScore??100,rejectionReason:typeof detail==='object'?detail.message:detail||'تعذر اعتماد العملية'});setMessage('تم رفض العملية وحفظ المحاولة للمراجعة.');return}
      setResult(d);setMessage(type==='CHECK_IN'?'تم تنفيذ الحضور الذكي.':'تم تنفيذ الانصراف الذكي.');
    }catch{setMessage('تعذر الاتصال بالخدمة. تحقق من تشغيل الـAPI والإنترنت.')}finally{setLoading(false)}
  }

  async function analyzeAttendance(){
    if(!result&&!position)return setMessage('حدد الموقع أو نفّذ عملية أولًا قبل التحليل.');
    setAiLoading(true);setAiResult(null);
    try{
      const r=await fetch(`${api}/ai/analyze`,{method:'POST',headers:headers(),body:JSON.stringify({section:'ATTENDANCE',task:'حلل عملية الحضور أو الانصراف الحالية، وقيّم مخاطر الموقع ودقة GPS والقرار، ثم قدم توصيات تشغيلية واضحة دون إصدار عقوبة.',language:'ar',data:{employeeNo:selectedEmployee?.employeeNo,station:selectedStation?.nameAr,geofenceM:selectedStation?.geofenceM,type,position:position?{accuracyM:position.coords.accuracy,latitude:position.coords.latitude,longitude:position.coords.longitude,timestamp:new Date(position.timestamp).toISOString()}:null,result}})});
      const d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر التحليل');setAiResult(d);
    }catch(e:any){setMessage(e.message||'تعذر تشغيل التحليل الذكي')}finally{setAiLoading(false)}
  }

  useEffect(()=>{load();readLocation()},[]);
  const selectedStation=stations.find(s=>s.id===stationId);
  const selectedEmployee=employees.find(e=>e.id===employeeId);

  return <main className="appMain">
    <section className="innerHero attendanceHero">
      <div><span className="eyebrow">منصة نطاق العمل</span><h1>الحضور والانصراف الذكي</h1><p>تحقق جغرافي فوري قبل اعتماد الحركة</p></div>
      <div className={`locationPill ${position?'ready':'pending'}`}><span>{position?'●':'○'}</span>{position?'الموقع جاهز':'جارٍ تحديد الموقع'}</div>
    </section>

    <section className="operationSummary">
      <div><small>الموظف</small><strong>{selectedEmployee?shortName(selectedEmployee.fullNameAr):'—'}</strong></div>
      <div><small>المنشأة</small><strong>{selectedStation?.nameAr||'—'}</strong></div>
      <div><small>النطاق</small><strong>{selectedStation?.geofenceM??'—'} م</strong></div>
    </section>

    <div className="grid twoCols serviceLayout">
      <section className="card serviceCard">
        <div className="cardTitleRow"><div className="serviceIcon">📍</div><div><h2>تنفيذ العملية</h2><p className="muted">حدد البيانات ثم اضغط زر التنفيذ</p></div></div>
        <label>الموظف</label><select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{employees.map(e=><option key={e.id} value={e.id}>{e.employeeNo} — {shortName(e.fullNameAr)}</option>)}</select>
        <label>المنشأة</label><select value={stationId} onChange={e=>setStationId(e.target.value)}>{stations.map(s=><option key={s.id} value={s.id}>{s.nameAr}</option>)}</select>
        <label>نوع العملية</label><div className="segmentedControl"><button type="button" className={type==='CHECK_IN'?'active':''} onClick={()=>setType('CHECK_IN')}>حضور</button><button type="button" className={type==='CHECK_OUT'?'active':''} onClick={()=>setType('CHECK_OUT')}>انصراف</button></div>
        <div className="locationBox"><strong>حالة الموقع</strong>{position?<><div>تم الحصول على الموقع ✅</div><div>دقة القراءة: {Math.round(position.coords.accuracy)} متر</div><div className="muted">النطاق المعتمد: {selectedStation?.geofenceM??'—'} متر</div></>:<div>{locationError||'لم يتم تحديد الموقع بعد'}</div>}</div>
        <div className="buttonRow"><button type="button" className="secondaryButton" onClick={readLocation}>تحديث الموقع</button><button type="button" className="primaryOperation" onClick={submit} disabled={loading}>{loading?'جارٍ التحقق...':type==='CHECK_IN'?'تسجيل الحضور':'تسجيل الانصراف'}</button></div>
        {message&&<p className="notice">{message}</p>}
      </section>

      <section className="card serviceCard resultCard"><div className="cardTitleRow"><div className="serviceIcon">🛡️</div><div><h2>نتيجة التحقق</h2><p className="muted">قرار النظام ودرجة المخاطر</p></div></div>{!result&&<div className="emptyState"><span>◎</span><p>لم تُنفذ أي عملية بعد</p><small>ستظهر هنا نتيجة المسافة ودرجة المخاطر</small></div>}{result&&<div className={`decisionBox ${result.decision==='REJECTED'?'dangerBox':result.decision==='REVIEW_REQUIRED'?'warningBox':'successBox'}`}><div className="metric smallMetric">{decisionLabel[result.decision]||result.decision}</div><p>درجة المخاطر: <strong>{result.riskScore??0}/100</strong></p>{result.distanceFromStationM&&<p>المسافة عن المنشأة: <strong>{Math.round(Number(result.distanceFromStationM))} متر</strong></p>}{result.rejectionReason&&<p>{result.rejectionReason}</p>}</div>}
        <button type="button" className="secondaryButton fullWidth" onClick={analyzeAttendance} disabled={aiLoading}>{aiLoading?'جارٍ التحليل الذكي...':'🤖 تحليل العملية بالذكاء الاصطناعي'}</button>
        {aiResult&&<div className="aiResultBox"><h3>{aiResult.summary||'نتيجة التحليل'}</h3><div className="badge badgeGray">مستوى المخاطر: {aiResult.riskLevel||'غير محدد'}</div>{aiResult.findings?.length?<><h4>الملاحظات</h4><ul>{aiResult.findings.map((x,i)=><li key={i}>{x}</li>)}</ul></>:null}{aiResult.recommendations?.length?<><h4>التوصيات</h4><ol>{aiResult.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ol></>:null}{aiResult.requiresHumanReview&&<p className="notice">تحتاج النتيجة إلى مراجعة بشرية قبل اتخاذ إجراء.</p>}</div>}
        <div className="rulesBox"><h3>ضوابط الاعتماد</h3><ul className="compactList"><li>الموقع داخل النطاق الجغرافي.</li><li>دقة GPS ضمن الحد المعتمد.</li><li>قراءة الموقع حديثة.</li><li>المحاولات المرفوضة تحفظ للمراجعة.</li></ul></div>
      </section>
    </div>

    <nav className="mobileNav"><Link href="/dashboard">⌂<span>الرئيسية</span></Link><Link href="/attendance-smart">📍<span>الحضور</span></Link><Link href="/transfers">🚗<span>الانتقال</span></Link><Link href="/notifications">🔔<span>التنبيهات</span></Link><Link href="/profile">👤<span>حسابي</span></Link></nav>
  </main>
}

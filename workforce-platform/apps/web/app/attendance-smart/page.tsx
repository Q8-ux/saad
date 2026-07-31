'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Employee = { id:string; employeeNo:string; fullNameAr:string };
type Station = { id:string; nameAr:string; geofenceM:number };
type Result = { decision:string; riskScore:number; rejectionReason?:string; distanceFromStationM?:string; recordedAt?:string };

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
    setLoading(true);setResult(null);setMessage('جارٍ التحقق من النطاق الجغرافي...');
    try{
      const r=await fetch(`${api}/attendance/punch`,{method:'POST',headers:headers(),body:JSON.stringify({employeeId,stationId,type,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracyM:position.coords.accuracy,locationTimestamp:new Date(position.timestamp).toISOString(),deviceId:navigator.userAgent.slice(0,180),mockLocationDetected:false,deviceIntegrity:'UNVERIFIED_WEB'})});
      const d=await r.json();
      if(!r.ok){const detail=d?.message;setResult({decision:'REJECTED',riskScore:detail?.riskScore??100,rejectionReason:typeof detail==='object'?detail.message:detail||'تعذر اعتماد العملية'});setMessage('تم رفض العملية وحفظ المحاولة للمراجعة.');return}
      setResult(d);setMessage(type==='CHECK_IN'?'تم تنفيذ الحضور الذكي.':'تم تنفيذ الانصراف الذكي.');
    }catch{setMessage('تعذر الاتصال بالخدمة. تحقق من تشغيل الـAPI والإنترنت.')}finally{setLoading(false)}
  }

  useEffect(()=>{load();readLocation()},[]);
  const selectedStation=stations.find(s=>s.id===stationId);

  return <main>
    <div className="topbar"><div><h1>📍 الحضور والانصراف الذكي</h1><p className="muted">التحقق من موقع الجهاز والنطاق الجغرافي ودقة GPS قبل اعتماد العملية.</p></div><Link href="/dashboard" className="secondaryButton">العودة إلى لوحة التحكم</Link></div>
    <div className="grid twoCols">
      <section className="card"><h2>تنفيذ العملية</h2>
        <label>الموظف</label><select value={employeeId} onChange={e=>setEmployeeId(e.target.value)}>{employees.map(e=><option key={e.id} value={e.id}>{e.employeeNo} — {shortName(e.fullNameAr)}</option>)}</select>
        <label>المنشأة</label><select value={stationId} onChange={e=>setStationId(e.target.value)}>{stations.map(s=><option key={s.id} value={s.id}>{s.nameAr}</option>)}</select>
        <label>نوع العملية</label><select value={type} onChange={e=>setType(e.target.value as 'CHECK_IN'|'CHECK_OUT')}><option value="CHECK_IN">تسجيل حضور</option><option value="CHECK_OUT">تسجيل انصراف</option></select>
        <div className="locationBox"><strong>حالة الموقع</strong>{position?<><div>تم الحصول على الموقع ✅</div><div>دقة القراءة: {Math.round(position.coords.accuracy)} متر</div><div className="muted">النطاق المعتمد: {selectedStation?.geofenceM??'—'} متر</div></>:<div>{locationError||'لم يتم تحديد الموقع بعد'}</div>}</div>
        <button type="button" className="secondaryButton fullWidth" onClick={readLocation}>تحديث الموقع</button><button type="button" onClick={submit} disabled={loading}>{loading?'جارٍ التحقق...':type==='CHECK_IN'?'تسجيل الحضور الذكي':'تسجيل الانصراف الذكي'}</button>{message&&<p className="notice">{message}</p>}
      </section>
      <section className="card"><h2>نتيجة التحقق</h2>{!result&&<p className="muted">ستظهر هنا نتيجة المسافة ودرجة المخاطر وقرار النظام.</p>}{result&&<div className={`decisionBox ${result.decision==='REJECTED'?'dangerBox':result.decision==='REVIEW_REQUIRED'?'warningBox':'successBox'}`}><div className="metric smallMetric">{decisionLabel[result.decision]||result.decision}</div><p>درجة المخاطر: <strong>{result.riskScore??0}/100</strong></p>{result.distanceFromStationM&&<p>المسافة عن المنشأة: <strong>{Math.round(Number(result.distanceFromStationM))} متر</strong></p>}{result.rejectionReason&&<p>{result.rejectionReason}</p>}</div>}
        <h3>ضوابط الاعتماد</h3><ul className="compactList"><li>الموقع داخل النطاق الجغرافي.</li><li>دقة GPS ضمن الحد المعتمد.</li><li>قراءة الموقع حديثة.</li><li>المحاولات المرفوضة تحفظ للمراجعة.</li></ul>
      </section>
    </div>
  </main>
}

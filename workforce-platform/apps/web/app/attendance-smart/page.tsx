'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import { useLanguage } from '../components/LanguageProvider';

type Employee = { id:string; employeeNo:string; fullNameAr:string; fullNameEn?:string };
type Station = { id:string; nameAr:string; nameEn?:string; geofenceM:number };
type Result = { decision:string; riskScore:number; rejectionReason?:string; distanceFromStationM?:string; recordedAt?:string };
type AiResult={summary?:string;riskLevel?:string;findings?:string[];recommendations?:string[];requiresHumanReview?:boolean;confidenceNote?:string};

const shortName=(name:string)=>name.trim().split(/\s+/).slice(0,2).join(' ');

export default function SmartAttendancePage(){
  const { language } = useLanguage();
  const t=(ar:string,en:string)=>language==='ar'?ar:en;
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
  const employeeName=(employee?:Employee)=>employee?shortName(language==='en'&&employee.fullNameEn?employee.fullNameEn:employee.fullNameAr):'—';
  const stationName=(station?:Station)=>station?(language==='en'&&station.nameEn?station.nameEn:station.nameAr):'—';
  const decisionLabel=(decision:string)=>({
    ACCEPTED:t('تم الاعتماد','Approved'),
    ACCEPTED_WITH_WARNING:t('تم الاعتماد مع تنبيه','Approved with warning'),
    REVIEW_REQUIRED:t('محفوظ للمراجعة','Saved for review'),
    REJECTED:t('مرفوض','Rejected'),
  } as Record<string,string>)[decision]||decision;

  async function load(){
    try{
      const [er,sr]=await Promise.all([fetch(`${api}/employees`,{headers:headers()}),fetch(`${api}/stations`,{headers:headers()})]);
      if(er.ok){const d=await er.json();setEmployees(d);if(d[0])setEmployeeId(d[0].id)}
      if(sr.ok){const d=await sr.json();setStations(d);if(d[0])setStationId(d[0].id)}
    }catch{
      setMessage(t('تعذر تحميل بيانات الحضور.','Unable to load attendance data.'));
    }
  }

  function readLocation(){
    setLocationError('');
    setMessage(t('جارٍ تحديد الموقع بدقة...','Getting your precise location...'));
    navigator.geolocation.getCurrentPosition(
      value=>{setPosition(value);setMessage(t('تم تحديد الموقع. يمكنك تنفيذ العملية الآن.','Location acquired. You can execute the operation now.'))},
      error=>{setPosition(null);setLocationError(error.message||t('تعذر الوصول إلى موقع الجهاز','Unable to access device location'));setMessage('')},
      {enableHighAccuracy:true,timeout:20000,maximumAge:0},
    );
  }

  async function submit(){
    if(!employeeId||!stationId)return setMessage(t('اختر الموظف والمنشأة.','Select an employee and a facility.'));
    if(!position)return readLocation();
    setLoading(true);setResult(null);setAiResult(null);setMessage(t('جارٍ التحقق من النطاق الجغرافي...','Verifying the geofence...'));
    try{
      const response=await fetch(`${api}/attendance/punch`,{method:'POST',headers:headers(),body:JSON.stringify({employeeId,stationId,type,latitude:position.coords.latitude,longitude:position.coords.longitude,accuracyM:position.coords.accuracy,locationTimestamp:new Date(position.timestamp).toISOString(),deviceId:navigator.userAgent.slice(0,180),mockLocationDetected:false,deviceIntegrity:'UNVERIFIED_WEB'})});
      const data=await response.json();
      if(!response.ok){
        const detail=data?.message;
        setResult({decision:'REJECTED',riskScore:detail?.riskScore??100,rejectionReason:typeof detail==='object'?detail.message:detail||t('تعذر اعتماد العملية','Operation could not be approved')});
        setMessage(t('تم رفض العملية وحفظ المحاولة للمراجعة.','The operation was rejected and saved for review.'));
        return;
      }
      setResult(data);
      setMessage(type==='CHECK_IN'?t('تم تنفيذ الحضور الذكي.','Smart check-in completed.'):t('تم تنفيذ الانصراف الذكي.','Smart check-out completed.'));
    }catch{
      setMessage(t('تعذر الاتصال بالخدمة. تحقق من تشغيل واجهة API والإنترنت.','Unable to connect to the service. Check the API and internet connection.'));
    }finally{setLoading(false)}
  }

  async function analyzeAttendance(){
    if(!result&&!position)return setMessage(t('حدد الموقع أو نفّذ عملية أولًا قبل التحليل.','Get the location or execute an operation before running analysis.'));
    setAiLoading(true);setAiResult(null);
    try{
      const response=await fetch(`${api}/ai/analyze`,{method:'POST',headers:headers(),body:JSON.stringify({section:'ATTENDANCE',task:t('حلل عملية الحضور أو الانصراف الحالية، وقيّم مخاطر الموقع ودقة GPS والقرار، ثم قدم توصيات تشغيلية واضحة دون إصدار عقوبة.','Analyze the current attendance operation, assess location risk, GPS accuracy and the decision, then provide clear operational recommendations without issuing penalties.'),language,data:{employeeNo:selectedEmployee?.employeeNo,station:stationName(selectedStation),geofenceM:selectedStation?.geofenceM,type,position:position?{accuracyM:position.coords.accuracy,latitude:position.coords.latitude,longitude:position.coords.longitude,timestamp:new Date(position.timestamp).toISOString()}:null,result}})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||t('تعذر التحليل','Analysis failed'));
      setAiResult(data.result||data);
    }catch(error:any){
      setMessage(error.message||t('تعذر تشغيل التحليل الذكي','Unable to run AI analysis'));
    }finally{setAiLoading(false)}
  }

  useEffect(()=>{load();readLocation()},[]);
  const selectedStation=stations.find(station=>station.id===stationId);
  const selectedEmployee=employees.find(employee=>employee.id===employeeId);

  return <main className="appMain attendancePage">
    <section className="innerHero attendanceHero">
      <div><span className="eyebrow">{t('منصة نطاق العمل','WORK SCOPE PLATFORM')}</span><h1>{t('الحضور والانصراف الذكي','Smart Attendance')}</h1><p>{t('تحقق جغرافي فوري قبل اعتماد الحركة','Geofenced verification before movement approval')}</p></div>
      <div className={`locationPill ${position?'ready':'pending'}`}><span aria-hidden="true">{position?'●':'○'}</span>{position?t('الموقع جاهز','Location ready'):t('جارٍ تحديد الموقع','Locating device')}</div>
    </section>

    <section className="operationSummary">
      <div><small>{t('الموظف','Employee')}</small><strong>{employeeName(selectedEmployee)}</strong></div>
      <div><small>{t('المنشأة','Facility')}</small><strong>{stationName(selectedStation)}</strong></div>
      <div><small>{t('النطاق','Geofence')}</small><strong>{selectedStation?.geofenceM??'—'} {t('م','m')}</strong></div>
    </section>

    <div className="grid twoCols serviceLayout">
      <section className="card serviceCard">
        <div className="cardTitleRow"><div className="serviceIcon"><AppIcon name="check" size={24}/></div><div><h2>{t('تنفيذ العملية','Execute Operation')}</h2><p className="muted">{t('حدد البيانات ثم اضغط زر التنفيذ','Select the data, then execute the operation')}</p></div></div>
        <label>{t('الموظف','Employee')}</label><select value={employeeId} onChange={event=>setEmployeeId(event.target.value)}>{employees.map(employee=><option key={employee.id} value={employee.id}>{employee.employeeNo} — {employeeName(employee)}</option>)}</select>
        <label>{t('المنشأة','Facility')}</label><select value={stationId} onChange={event=>setStationId(event.target.value)}>{stations.map(station=><option key={station.id} value={station.id}>{stationName(station)}</option>)}</select>
        <label>{t('نوع العملية','Operation Type')}</label><div className="segmentedControl"><button type="button" className={type==='CHECK_IN'?'active':''} onClick={()=>setType('CHECK_IN')}>{t('حضور','Check-in')}</button><button type="button" className={type==='CHECK_OUT'?'active':''} onClick={()=>setType('CHECK_OUT')}>{t('انصراف','Check-out')}</button></div>
        <div className="locationBox"><strong>{t('حالة الموقع','Location Status')}</strong>{position?<><div>{t('تم الحصول على الموقع','Location acquired')}</div><div>{t('دقة القراءة','Accuracy')}: {Math.round(position.coords.accuracy)} {t('متر','m')}</div><div className="muted">{t('النطاق المعتمد','Approved geofence')}: {selectedStation?.geofenceM??'—'} {t('متر','m')}</div></>:<div>{locationError||t('لم يتم تحديد الموقع بعد','Location has not been acquired yet')}</div>}</div>
        <div className="buttonRow"><button type="button" className="secondaryButton" onClick={readLocation}>{t('تحديث الموقع','Refresh Location')}</button><button type="button" className="primaryOperation" onClick={submit} disabled={loading}>{loading?t('جارٍ التحقق...','Verifying...'):type==='CHECK_IN'?t('تسجيل الحضور','Check-in'):t('تسجيل الانصراف','Check-out')}</button></div>
        {message&&<p className="notice">{message}</p>}
      </section>

      <section className="card serviceCard resultCard">
        <div className="cardTitleRow"><div className="serviceIcon"><AppIcon name="check" size={24}/></div><div><h2>{t('نتيجة التحقق','Verification Result')}</h2><p className="muted">{t('قرار النظام ودرجة المخاطر','System decision and risk score')}</p></div></div>
        {!result&&<div className="emptyState"><AppIcon name="check" size={44}/><p>{t('لم تُنفذ أي عملية بعد','No verification performed')}</p><small>{t('ستظهر هنا نتيجة المسافة ودرجة المخاطر','Distance and risk results will appear here')}</small></div>}
        {result&&<div className={`decisionBox ${result.decision==='REJECTED'?'dangerBox':result.decision==='REVIEW_REQUIRED'?'warningBox':'successBox'}`}><div className="metric smallMetric">{decisionLabel(result.decision)}</div><p>{t('درجة المخاطر','Risk score')}: <strong>{result.riskScore??0}/100</strong></p>{result.distanceFromStationM&&<p>{t('المسافة عن المنشأة','Distance from facility')}: <strong>{Math.round(Number(result.distanceFromStationM))} {t('متر','m')}</strong></p>}{result.rejectionReason&&<p>{result.rejectionReason}</p>}</div>}
        <button type="button" className="secondaryButton fullWidth" onClick={analyzeAttendance} disabled={aiLoading}>{aiLoading?t('جارٍ التحليل الذكي...','Running AI analysis...'):t('تحليل العملية بالذكاء الاصطناعي','Analyze Operation with AI')}</button>
        {aiResult&&<div className="aiResultBox"><h3>{aiResult.summary||t('نتيجة التحليل','Analysis Result')}</h3><div className="badge badgeGray">{t('مستوى المخاطر','Risk level')}: {aiResult.riskLevel||t('غير محدد','Not specified')}</div>{aiResult.findings?.length?<><h4>{t('الملاحظات','Findings')}</h4><ul>{aiResult.findings.map((item,index)=><li key={index}>{item}</li>)}</ul></>:null}{aiResult.recommendations?.length?<><h4>{t('التوصيات','Recommendations')}</h4><ol>{aiResult.recommendations.map((item,index)=><li key={index}>{item}</li>)}</ol></>:null}{aiResult.requiresHumanReview&&<p className="notice">{t('تحتاج النتيجة إلى مراجعة بشرية قبل اتخاذ إجراء.','The result requires human review before action.')}</p>}</div>}
        <div className="rulesBox"><h3>{t('ضوابط الاعتماد','Approval Controls')}</h3><ul className="compactList"><li>{t('الموقع داخل النطاق الجغرافي.','Location is inside the approved geofence.')}</li><li>{t('دقة GPS ضمن الحد المعتمد.','GPS accuracy is within the approved limit.')}</li><li>{t('قراءة الموقع حديثة.','The location reading is current.')}</li><li>{t('المحاولات المرفوضة تحفظ للمراجعة.','Rejected attempts are retained for review.')}</li></ul></div>
      </section>
    </div>

    <nav className="mobileNav"><Link href="/dashboard"><AppIcon name="home"/><span>{t('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="check"/><span>{t('الحضور','Attendance')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('الانتقال','Transfers')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{t('التنبيهات','Alerts')}</span></Link><Link href="/profile"><AppIcon name="profile"/><span>{t('حسابي','Profile')}</span></Link></nav>
  </main>
}

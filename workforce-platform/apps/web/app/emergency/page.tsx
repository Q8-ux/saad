'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Station = { id:string; nameAr:string; code:string };
type SafeLocation = { id:string; nameAr:string; code:string; capacity?:number; geofenceM:number };
type Evacuation = { id:string; status:string; employee:{fullNameAr:string;employeeNo:string}; assemblyPoint?:SafeLocation; shelter?:SafeLocation };
type Incident = { id:string; titleAr:string; type:string; severity:number; status:string; activatedAt:string; station:Station; evacuations:Evacuation[] };

const types = [
  ['FIRE','حريق'],['EXPLOSION','انفجار'],['FUEL_LEAK','تسرب وقود'],['HAZMAT','مواد خطرة'],
  ['MEDICAL','حالة طبية'],['POWER_OUTAGE','انقطاع كهرباء'],['OPERATIONAL_FAILURE','عطل تشغيلي'],
  ['SECURITY','حادث أمني'],['NATURAL_DISASTER','كارثة طبيعية'],['EVACUATION','إخلاء'],['OTHER','أخرى']
];

export default function EmergencyPage(){
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [stations,setStations]=useState<Station[]>([]);
  const [stationId,setStationId]=useState('');
  const [safe,setSafe]=useState<{assemblyPoints:SafeLocation[];shelters:SafeLocation[];criticalAssets:any[]}>({assemblyPoints:[],shelters:[],criticalAssets:[]});
  const [incidents,setIncidents]=useState<Incident[]>([]);
  const [message,setMessage]=useState('');
  const headers=()=>({Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'});

  async function load(){
    const [s,i]=await Promise.all([
      fetch(`${api}/stations`,{headers:headers()}),
      fetch(`${api}/emergency/incidents`,{headers:headers()})
    ]);
    if(s.ok){ const data=await s.json(); setStations(data); if(!stationId && data[0]) setStationId(data[0].id); }
    if(i.ok) setIncidents(await i.json());
  }

  async function loadSafe(id:string){
    if(!id) return;
    const r=await fetch(`${api}/emergency/stations/${id}/safe-locations`,{headers:headers()});
    if(r.ok) setSafe(await r.json());
  }

  useEffect(()=>{load()},[]);
  useEffect(()=>{loadSafe(stationId)},[stationId]);

  const active=useMemo(()=>incidents.filter(x=>x.status==='ACTIVE'),[incidents]);
  const totals=useMemo(()=>{
    const e=active.flatMap(x=>x.evacuations||[]);
    return {all:e.length,safe:e.filter(x=>x.status==='SAFE').length,transit:e.filter(x=>x.status==='IN_TRANSIT'||x.status==='DIRECTED').length,missing:e.filter(x=>x.status==='MISSING'||x.status==='NOT_CONFIRMED').length};
  },[active]);

  async function post(path:string,body:any){
    setMessage('جارٍ الحفظ...');
    const r=await fetch(`${api}${path}`,{method:'POST',headers:headers(),body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){setMessage(data.message||'تعذر تنفيذ العملية');return false}
    setMessage('تم التنفيذ بنجاح'); await load(); if(stationId) await loadSafe(stationId); return true;
  }

  async function createIncident(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const ok=await post('/emergency/incidents',{stationId,type:f.get('type'),titleAr:f.get('titleAr'),description:f.get('description'),severity:Number(f.get('severity')||1)});
    if(ok) e.currentTarget.reset();
  }

  async function createAssembly(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const ok=await post('/emergency/assembly-points',{stationId,code:f.get('code'),nameAr:f.get('nameAr'),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),geofenceM:Number(f.get('geofenceM')||50),capacity:Number(f.get('capacity')||0)||undefined});
    if(ok) e.currentTarget.reset();
  }

  async function createShelter(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); const f=new FormData(e.currentTarget);
    const ok=await post('/emergency/shelters',{stationId,code:f.get('code'),nameAr:f.get('nameAr'),shelterType:f.get('shelterType'),latitude:Number(f.get('latitude')),longitude:Number(f.get('longitude')),geofenceM:Number(f.get('geofenceM')||50),capacity:Number(f.get('capacity')||0)||undefined});
    if(ok) e.currentTarget.reset();
  }

  return <main>
    <div className="topbar"><div><h1>مركز إدارة الطوارئ</h1><p className="muted">إدارة جميع المنشآت ونقاط التجمع والملاجئ ومتابعة الإخلاء</p></div><Link className="linkButton" href="/dashboard">العودة للوحة التحكم</Link></div>

    {message&&<div className="notice">{message}</div>}

    <div className="grid kpis">
      <div className="card"><div>الحوادث النشطة</div><div className="metric">{active.length}</div></div>
      <div className="card"><div>الموظفون المشمولون</div><div className="metric">{totals.all}</div></div>
      <div className="card success"><div>وصلوا لموقع آمن</div><div className="metric">{totals.safe}</div></div>
      <div className="card warning"><div>في الطريق</div><div className="metric">{totals.transit}</div></div>
      <div className="card danger"><div>غير مؤكدين</div><div className="metric">{totals.missing}</div></div>
    </div>

    <div className="card section">
      <h2>المنشأة</h2>
      <select value={stationId} onChange={e=>setStationId(e.target.value)}>
        {stations.map(s=><option key={s.id} value={s.id}>{s.nameAr} — {s.code}</option>)}
      </select>
    </div>

    <div className="grid forms">
      <form className="card" onSubmit={createIncident}>
        <h2>إعلان حالة طوارئ</h2>
        <input name="titleAr" placeholder="عنوان الحالة" required/>
        <select name="type">{types.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select name="severity"><option value="1">مستوى 1</option><option value="2">مستوى 2</option><option value="3">مستوى 3</option><option value="4">مستوى 4</option><option value="5">مستوى 5 — حرج</option></select>
        <textarea name="description" placeholder="وصف الحالة والتعليمات الأولية"/>
        <button>تفعيل الطوارئ</button>
      </form>

      <form className="card" onSubmit={createAssembly}>
        <h2>إضافة نقطة تجمع</h2>
        <input name="code" placeholder="الرمز" required/>
        <input name="nameAr" placeholder="اسم نقطة التجمع" required/>
        <input name="latitude" type="number" step="any" placeholder="خط العرض" required/>
        <input name="longitude" type="number" step="any" placeholder="خط الطول" required/>
        <input name="geofenceM" type="number" defaultValue="50" placeholder="نطاق الوصول بالمتر"/>
        <input name="capacity" type="number" placeholder="السعة"/>
        <button>حفظ نقطة التجمع</button>
      </form>

      <form className="card" onSubmit={createShelter}>
        <h2>إضافة ملجأ</h2>
        <input name="code" placeholder="الرمز" required/>
        <input name="nameAr" placeholder="اسم الملجأ" required/>
        <input name="shelterType" placeholder="نوع الملجأ" required/>
        <input name="latitude" type="number" step="any" placeholder="خط العرض" required/>
        <input name="longitude" type="number" step="any" placeholder="خط الطول" required/>
        <input name="geofenceM" type="number" defaultValue="50" placeholder="نطاق الوصول بالمتر"/>
        <input name="capacity" type="number" placeholder="السعة"/>
        <button>حفظ الملجأ</button>
      </form>
    </div>

    <div className="grid section">
      <div className="card"><h2>نقاط التجمع</h2>{safe.assemblyPoints.length?safe.assemblyPoints.map(x=><div className="row" key={x.id}><span>{x.nameAr}</span><b>{x.capacity||'—'}</b></div>):<p className="muted">لا توجد نقاط مسجلة.</p>}</div>
      <div className="card"><h2>الملاجئ</h2>{safe.shelters.length?safe.shelters.map(x=><div className="row" key={x.id}><span>{x.nameAr}</span><b>{x.capacity||'—'}</b></div>):<p className="muted">لا توجد ملاجئ مسجلة.</p>}</div>
      <div className="card"><h2>الأصول الحرجة</h2>{safe.criticalAssets.length?safe.criticalAssets.map((x:any)=><div className="row" key={x.id}><span>{x.nameAr}</span><b>مستوى {x.riskLevel}</b></div>):<p className="muted">لا توجد أصول حرجة مسجلة.</p>}</div>
    </div>

    <div className="card section">
      <h2>الحوادث والإخلاء</h2>
      {incidents.length===0?<p className="muted">لا توجد حوادث مسجلة.</p>:incidents.map(i=><div className="incident" key={i.id}>
        <div className="incidentHead"><div><b>{i.titleAr}</b><div className="muted">{i.station?.nameAr} — مستوى {i.severity}</div></div><span className={`badge ${i.status==='ACTIVE'?'badgeRed':'badgeGray'}`}>{i.status==='ACTIVE'?'نشط':'مغلق'}</span></div>
        <div className="grid mini">
          <div>الإجمالي: <b>{i.evacuations?.length||0}</b></div>
          <div>آمنون: <b>{i.evacuations?.filter(x=>x.status==='SAFE').length||0}</b></div>
          <div>في الطريق: <b>{i.evacuations?.filter(x=>x.status==='IN_TRANSIT'||x.status==='DIRECTED').length||0}</b></div>
          <div>غير مؤكدين: <b>{i.evacuations?.filter(x=>x.status==='NOT_CONFIRMED'||x.status==='MISSING').length||0}</b></div>
        </div>
        {i.evacuations?.slice(0,20).map(e=><div className="row" key={e.id}><span>{e.employee.fullNameAr} ({e.employee.employeeNo})</span><b>{statusLabel(e.status)}</b></div>)}
      </div>)}
    </div>
  </main>
}

function statusLabel(v:string){return ({NOT_CONFIRMED:'غير مؤكد',DIRECTED:'تم التوجيه',IN_TRANSIT:'في الطريق',SAFE:'آمن',MISSING:'مفقود',INJURED:'مصاب',EXEMPT:'مستثنى'} as Record<string,string>)[v]||v}

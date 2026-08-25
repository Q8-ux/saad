'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import GoogleInfrastructureMap from '../components/GoogleInfrastructureMap';
import { useLanguage } from '../components/LanguageProvider';
import {
  fetchDashboardMetrics,
  fetchFacilityAttendance,
  fetchRecentIncidents,
  fetchRecentTransfers,
  subscribeToOperationalChanges,
  type DashboardIncident,
  type DashboardMetrics,
  type DashboardTransfer,
  type FacilityAttendance,
} from '../lib/supabase';

export default function Dashboard(){
  const {language}=useLanguage();
  const t=(ar:string,en:string)=>language==='ar'?ar:en;
  const [now,setNow]=useState(new Date());
  const [metrics,setMetrics]=useState<DashboardMetrics|null>(null);
  const [incidents,setIncidents]=useState<DashboardIncident[]>([]);
  const [transfers,setTransfers]=useState<DashboardTransfer[]>([]);
  const [facilityAttendance,setFacilityAttendance]=useState<FacilityAttendance[]>([]);
  const [loading,setLoading]=useState(true);
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);

  const loadLiveData=useCallback(async()=>{
    try{
      const [m,i,tr,f]=await Promise.all([
        fetchDashboardMetrics(),
        fetchRecentIncidents(5),
        fetchRecentTransfers(5),
        fetchFacilityAttendance(5),
      ]);
      setMetrics(m);setIncidents(i);setTransfers(tr);setFacilityAttendance(f);setLastUpdated(new Date());
    }catch{
      setMetrics(null);setIncidents([]);setTransfers([]);setFacilityAttendance([]);
    }finally{setLoading(false)}
  },[]);

  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{void loadLiveData();return subscribeToOperationalChanges(()=>void loadLiveData())},[loadLiveData]);

  const dateText=now.toLocaleDateString(language==='ar'?'ar-KW':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeText=now.toLocaleTimeString(language==='ar'?'ar-KW':'en-GB',{hour:'2-digit',minute:'2-digit'});
  const attendanceRate=metrics?.employees?Math.round((metrics.onSite/metrics.employees)*100):0;
  const maxFacility=Math.max(...facilityAttendance.map(f=>f.active_count),1);
  const healthLabel=useMemo(()=>metrics===null?t('الاتصال قيد التحقق','Connection pending'):metrics.openIncidents>0?t('توجد أحداث مفتوحة','Open events detected'):t('جميع الأنظمة تعمل','All systems operational'),[metrics,language]);

  const employeeName=(row:DashboardTransfer)=>{
    const e=row.employees;if(!e)return t('غير محدد','Unassigned');
    return language==='ar'?`${e.first_name_ar} ${e.second_name_ar}`:`${e.first_name_en||e.first_name_ar} ${e.second_name_en||e.second_name_ar}`;
  };
  const facilityName=(f:{name_ar:string;name_en:string}|null)=>f?(language==='ar'?f.name_ar:f.name_en):t('غير محدد','Unspecified');

  return <main className="approvedDashboard commandDashboard">
    <section className="commandHero">
      <div className="commandHeroCopy">
        <span className="commandEyebrow">{t('منصة نطاق العمل','WORK SCOPE PLATFORM')}</span>
        <h1>{t('مركز العمليات الذكي','Smart Operations Center')}</h1>
        <p>{t('رؤية موحدة وفورية للقوى العاملة والمنشآت وشبكة الكهرباء والأحداث التشغيلية في دولة الكويت','A unified live view of workforce, facilities, electricity infrastructure and operational events across Kuwait')}</p>
        <div className="commandHeroActions">
          <Link href="/attendance-smart" className="commandPrimary"><AppIcon name="check" size={18}/>{t('فتح الحضور الذكي','Open Smart Attendance')}</Link>
          <Link href="/ai-tools" className="commandSecondary"><AppIcon name="ai" size={18}/>{t('مساعد القرار الذكي','AI Decision Assistant')}</Link>
        </div>
      </div>
      <div className="commandStatusPanel">
        <div className="commandStatusTop"><span className="commandLiveDot"/><strong>{healthLabel}</strong></div>
        <div className="commandClock"><b>{timeText}</b><span>{dateText}</span></div>
        <div className="commandMeta"><span>{t('آخر تحديث','Last update')}<b>{lastUpdated?lastUpdated.toLocaleTimeString(language==='ar'?'ar-KW':'en-GB',{hour:'2-digit',minute:'2-digit'}):'—'}</b></span><span>{t('داخل المواقع','On site')}<b>{metrics?.onSite??'—'}</b></span><span>{t('المنشآت المراقبة','Monitored facilities')}<b>{metrics?.facilities??'—'}</b></span></div>
      </div>
    </section>

    <section className="commandSectionIntro"><div><span>{t('المؤشرات اللحظية','LIVE INDICATORS')}</span><h2>{t('المشهد التشغيلي الآن','Current Operational Picture')}</h2></div><small>{loading?t('جارٍ تحميل البيانات الحية','Loading live data'):t('تتحدث المؤشرات تلقائياً عند وصول بيانات جديدة','Indicators update automatically when new data arrives')}</small></section>
    <section className="approvedKpis commandKpis">
      <article><AppIcon name="employees"/><div><span>{t('إجمالي القوى العاملة','Total Workforce')}</span><strong>{metrics?.employees??'—'}</strong><small>{t('موظف نشط في قاعدة البيانات','active employees in database')}</small></div></article>
      <article><AppIcon name="check"/><div><span>{t('الموظفون داخل المواقع','Employees On Site')}</span><strong>{metrics?.onSite??'—'}</strong><small><b>{metrics?`${attendanceRate}%`:'—'}</b> {t('من إجمالي القوى العاملة','of total workforce')}</small></div></article>
      <article><AppIcon name="transfer"/><div><span>{t('الحركة الميدانية النشطة','Active Field Movement')}</span><strong>{metrics?.activeTransfers??'—'}</strong><small>{t('طلبات انتقال معتمدة أو نشطة','approved or active transfers')}</small></div></article>
      <article className={metrics?.openIncidents?'danger':''}><AppIcon name="emergency"/><div><span>{t('أحداث تستلزم القرار','Decision Events')}</span><strong>{metrics?.openIncidents??'—'}</strong><small>{t('مفتوحة أو قيد التحقيق','open or under investigation')}</small></div></article>
    </section>

    <section className="approvedUpperGrid">
      <article className="approvedCard mapCard commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('الرؤية الجغرافية المباشرة','LIVE GEOSPATIAL VIEW')}</span><h2>{t('الخريطة التشغيلية لشبكة الكهرباء في الكويت','Kuwait Electricity Operations Map')}</h2><small>{t('محطات التوليد والوزارة ومراكز التحكم ومحولات المناطق السكنية','Power stations, ministry, control centers and residential-area substations')}</small></div></div>
        <GoogleInfrastructureMap />
      </article>

      <article className="approvedCard alertsCard commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('أحداث مباشرة','LIVE EVENTS')}</span><h2>{t('الأحداث التشغيلية الأخيرة','Recent Operational Events')}</h2></div><Link href="/notifications">{t('عرض الكل','View All')}</Link></div>
        <div className="approvedAlertRows">{incidents.length?incidents.map(row=><div key={row.id}><i/><div><b>{facilityName(row.facilities)}</b><span>{row.title}</span></div><time>{new Date(row.occurred_at).toLocaleTimeString(language==='ar'?'ar-KW':'en-GB',{hour:'2-digit',minute:'2-digit'})}</time></div>):<div><div><b>{t('لا توجد أحداث حالياً','No events currently')}</b><span>{t('ستظهر الأحداث المسجلة في قاعدة البيانات هنا مباشرة','Database incidents will appear here automatically')}</span></div></div>}</div>
      </article>
    </section>

    <section className="approvedLowerGrid">
      <article className="approvedCard transferTable commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('الحركة بين المنشآت','FACILITY MOVEMENT')}</span><h2>{t('الانتقالات الميدانية المباشرة','Live Field Transfers')}</h2></div><Link href="/transfers">{t('عرض الكل','View All')}</Link></div>
        {transfers.length?<table><thead><tr><th>{t('من','From')}</th><th>{t('إلى','To')}</th><th>{t('الموظف','Employee')}</th><th>{t('الوقت','Time')}</th><th>{t('الحالة','Status')}</th></tr></thead><tbody>{transfers.map(row=><tr key={row.id}><td>{facilityName(row.from_facility)}</td><td>{facilityName(row.to_facility)}</td><td>{employeeName(row)}</td><td>{new Date(row.starts_at).toLocaleTimeString(language==='ar'?'ar-KW':'en-GB',{hour:'2-digit',minute:'2-digit'})}</td><td><span className={row.status==='completed'?'done':'running'}>{row.status}</span></td></tr>)}</tbody></table>:<p className="muted">{t('لا توجد انتقالات مسجلة حالياً.','No transfers are currently recorded.')}</p>}
      </article>

      <article className="approvedCard attendanceBars commandFeatureCard" id="facilities">
        <div className="approvedCardHead commandCardHead"><div><span>{t('توزيع القوى العاملة','WORKFORCE DISTRIBUTION')}</span><h2>{t('الحضور الحي حسب المنشأة','Live Attendance by Facility')}</h2></div><Link href="/attendance-smart">{t('عرض الكل','View All')}</Link></div>
        {facilityAttendance.length?facilityAttendance.map(row=><div className="barRow" key={row.id}><span>{language==='ar'?row.name_ar:row.name_en}</span><div><i style={{width:`${Math.max(4,Math.round((row.active_count/maxFacility)*100))}%`}}/></div><b>{row.active_count}</b></div>):<p className="muted">{t('لا توجد بيانات حضور نشطة حسب المنشآت.','No active facility attendance data yet.')}</p>}
      </article>
    </section>

    <nav className="approvedBottomNav"><Link href="/dashboard" className="active"><AppIcon name="home"/><span>{t('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="check"/><span>{t('الحضور','Attendance')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{t('التنبيهات','Alerts')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('الانتقالات','Transfers')}</span></Link><Link href="/dashboard#more"><AppIcon name="menu"/><span>{t('المزيد','More')}</span></Link></nav>
  </main>
}

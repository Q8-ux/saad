'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import GoogleInfrastructureMap from '../components/GoogleInfrastructureMap';
import { useLanguage } from '../components/LanguageProvider';

export default function Dashboard(){
  const {language}=useLanguage();
  const t=(ar:string,en:string)=>language==='ar'?ar:en;
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(timer)},[]);

  const alerts=[
    [t('محطة الصبية','Subiya Power Station'),t('تنبيه تشغيلي تجريبي يحتاج مراجعة','Demo operational alert requires review'),'10:24'],
    [t('مركز التحكم الوطني','National Control Center'),t('تحديث حالة شبكة التحكم','Control network status updated'),'09:58'],
    [t('محطة الدوحة الغربية','Doha West Power Station'),t('بلاغ صيانة تجريبي','Demo maintenance notice'),'09:15'],
    [t('محولات منطقة السرة','Surra Area Substations'),t('فحص دوري للمحولات','Scheduled substation inspection'),'08:47'],
  ];
  const transfers=[
    [t('محطة الصبية','Subiya Station'),t('مركز التحكم الوطني','National Control Center'),t('أحمد محمد','Ahmed Mohammed'),'10:30'],
    [t('محطة الدوحة الغربية','Doha West Station'),t('الوزارة','Ministry HQ'),t('محمد علي','Mohammed Ali'),'10:15'],
    [t('مركز التحكم الوطني','National Control Center'),t('محطة الزور الجنوبية','Az Zour South'),t('يوسف خالد','Yousef Khaled'),'09:50'],
    [t('محولات الجهراء','Jahra Substations'),t('مركز تحكم الجهراء','Jahra Control Center'),t('خالد ناصر','Khaled Nasser'),'09:20'],
  ];
  const dateText=now.toLocaleDateString(language==='ar'?'ar-KW':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeText=now.toLocaleTimeString(language==='ar'?'ar-KW':'en-GB',{hour:'2-digit',minute:'2-digit'});

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
        <div className="commandStatusTop"><span className="commandLiveDot"/><strong>{t('جميع الأنظمة تعمل','All systems operational')}</strong></div>
        <div className="commandClock"><b>{timeText}</b><span>{dateText}</span></div>
        <div className="commandMeta"><span>{t('آخر تحديث','Last update')}<b>{t('الآن','Now')}</b></span><span>{t('المستخدمون المتصلون','Online users')}<b>38</b></span><span>{t('المنشآت المراقبة','Monitored facilities')}<b>27</b></span></div>
      </div>
    </section>

    <div className="demoDataNotice"><strong>{t('بيانات تجريبية','Demo Data')}</strong><span>{t('هذه البيانات مخصصة لعرض طريقة عمل النظام فقط','These records are for demonstrating system behavior only')}</span></div>

    <section className="commandSectionIntro"><div><span>{t('المؤشرات اللحظية','LIVE INDICATORS')}</span><h2>{t('المشهد التشغيلي الآن','Current Operational Picture')}</h2></div><small>{t('تتحدث المؤشرات تلقائياً عند وصول بيانات جديدة','Indicators update automatically when new data arrives')}</small></section>
    <section className="approvedKpis commandKpis">
      <article><AppIcon name="employees"/><div><span>{t('إجمالي القوى العاملة','Total Workforce')}</span><strong>1,248</strong><small className="green">+4.3% {t('من الشهر الماضي','from last month')}</small></div></article>
      <article><AppIcon name="check"/><div><span>{t('الموظفون داخل المواقع','Employees On Site')}</span><strong>987</strong><small><b>79.2%</b> {t('من إجمالي القوى العاملة','of total workforce')}</small></div></article>
      <article><AppIcon name="transfer"/><div><span>{t('الحركة الميدانية النشطة','Active Field Movement')}</span><strong>56</strong><small className="green">+8 {t('من أمس','since yesterday')}</small></div></article>
      <article className="danger"><AppIcon name="emergency"/><div><span>{t('أحداث حرجة تستلزم القرار','Critical Decision Events')}</span><strong>7</strong><small>{t('تحتاج إلى إجراء فوري','Immediate action required')}</small></div></article>
    </section>

    <section className="approvedUpperGrid">
      <article className="approvedCard mapCard commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('الرؤية الجغرافية المباشرة','LIVE GEOSPATIAL VIEW')}</span><h2>{t('الخريطة التشغيلية لشبكة الكهرباء في الكويت','Kuwait Electricity Operations Map')}</h2><small>{t('محطات التوليد والوزارة ومراكز التحكم ومحولات المناطق السكنية','Power stations, ministry, control centers and residential-area substations')}</small></div><a href="https://www.google.com/maps/search/electricity+substation+Kuwait" target="_blank" rel="noreferrer">{t('فتح الخريطة الكاملة','Open Full Map')}</a></div>
        <GoogleInfrastructureMap />
      </article>

      <article className="approvedCard alertsCard commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('أولوية قصوى','PRIORITY EVENTS')}</span><h2>{t('الأحداث التشغيلية الحرجة','Critical Operational Events')}</h2></div><Link href="/notifications">{t('عرض الكل','View All')}</Link></div>
        <div className="approvedAlertRows">{alerts.map((a,i)=><div key={i}><i/><div><b>{a[0]}</b><span>{a[1]}</span></div><time>{a[2]}</time></div>)}</div>
        <Link className="approvedWideLink" href="/notifications">{t('فتح مركز التنبيهات','Open Alert Center')}</Link>
      </article>
    </section>

    <section className="approvedLowerGrid">
      <article className="approvedCard aiSummary commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('تحليل استباقي','PREDICTIVE INSIGHT')}</span><h2>{t('مساعد القرار الذكي','AI Decision Assistant')}</h2></div><AppIcon name="ai"/></div>
        <div className="summaryRows"><div><b>12%</b><span>{t('احتمالية تأخر الموظفين غداً','Probability of employee delays tomorrow')}</span></div><div><b>3 {t('مواقع','sites')}</b><span>{t('المناطق ذات الكثافة العالية','High-density areas')}</span></div><div><b className="green">{t('منخفضة','Low')}</b><span>{t('حالة المخاطر العامة','Overall risk status')}</span></div><div><b>5 {t('توصيات','recommendations')}</b><span>{t('التوصيات الذكية','Smart recommendations')}</span></div></div>
        <Link className="approvedWideLink" href="/ai-tools">{t('استعراض التوصيات التنفيذية','View Executive Recommendations')}</Link>
      </article>

      <article className="approvedCard transferTable commandFeatureCard">
        <div className="approvedCardHead commandCardHead"><div><span>{t('الحركة بين المنشآت','FACILITY MOVEMENT')}</span><h2>{t('الانتقالات الميدانية المباشرة','Live Field Transfers')}</h2></div><Link href="/transfers">{t('عرض الكل','View All')}</Link></div>
        <table><thead><tr><th>{t('من','From')}</th><th>{t('إلى','To')}</th><th>{t('الموظف','Employee')}</th><th>{t('الوقت','Time')}</th><th>{t('الحالة','Status')}</th></tr></thead><tbody>{transfers.map((r,i)=><tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className={i===3?'done':'running'}>{i===3?t('مكتمل','Completed'):t('جاري','Active')}</span></td></tr>)}</tbody></table>
        <Link className="approvedWideLink" href="/transfers">{t('فتح مركز الانتقالات','Open Transfer Center')}</Link>
      </article>

      <article className="approvedCard attendanceBars commandFeatureCard" id="facilities">
        <div className="approvedCardHead commandCardHead"><div><span>{t('توزيع القوى العاملة','WORKFORCE DISTRIBUTION')}</span><h2>{t('الحضور الحي حسب المنشأة','Live Attendance by Facility')}</h2></div><Link href="/attendance-smart">{t('عرض الكل','View All')}</Link></div>
        {[['92%',t('محطة الصبية','Subiya Power Station')],['180',t('محطة الدوحة الغربية','Doha West Power Station')],['156',t('مركز التحكم الوطني','National Control Center')],['132',t('محطة الزور الجنوبية','Az Zour South Power Station')],['98',t('مبنى الوزارة','Ministry Headquarters')]].map((r,i)=><div className="barRow" key={i}><span>{r[1]}</span><div><i style={{width:[92,76,66,56,42][i]+'%'}}/></div><b>{r[0]}</b></div>)}
        <Link className="approvedWideLink" href="/attendance-smart">{t('فتح تقرير الحضور المباشر','Open Live Attendance Report')}</Link>
      </article>
    </section>

    <section className="approvedCard recentOps commandFeatureCard">
      <div className="approvedCardHead commandCardHead"><div><span>{t('تدفق الأحداث','LIVE EVENT STREAM')}</span><h2>{t('سجل العمليات المباشر','Live Operations Log')}</h2></div><Link href="/attendance-smart">{t('عرض الكل','View All')}</Link></div>
      <table><thead><tr><th>{t('النوع','Type')}</th><th>{t('الوصف','Description')}</th><th>{t('المستخدم','User')}</th><th>{t('الوقت','Time')}</th><th>{t('التاريخ','Date')}</th></tr></thead><tbody><tr><td>{t('حضور','Attendance')}</td><td>{t('تم تسجيل حضور أحمد محمد في محطة الصبية','Ahmed Mohammed checked in at Subiya Station')}</td><td>{t('أحمد محمد','Ahmed Mohammed')}</td><td>08:01</td><td>2026-08-01</td></tr><tr><td>{t('انتقال','Transfer')}</td><td>{t('بدأ انتقال من محطة الدوحة الغربية إلى الوزارة','A transfer started from Doha West Station to the ministry')}</td><td>{t('محمد علي','Mohammed Ali')}</td><td>08:15</td><td>2026-08-01</td></tr><tr><td className="redText">{t('تنبيه','Alert')}</td><td>{t('تنبيه تشغيلي تجريبي في محولات منطقة السرة','Demo operational alert at Surra area substations')}</td><td>{t('النظام','System')}</td><td>09:30</td><td>2026-08-01</td></tr><tr><td>{t('انصراف','Check-out')}</td><td>{t('تم تسجيل انصراف سارة ناصر من مركز التحكم الوطني','Sara Nasser checked out from the National Control Center')}</td><td>{t('سارة ناصر','Sara Nasser')}</td><td>17:05</td><td>2026-07-31</td></tr></tbody></table>
    </section>

    <nav className="approvedBottomNav"><Link href="/dashboard" className="active"><AppIcon name="home"/><span>{t('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="check"/><span>{t('الحضور','Attendance')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{t('التنبيهات','Alerts')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('الانتقالات','Transfers')}</span></Link><Link href="/dashboard#more"><AppIcon name="menu"/><span>{t('المزيد','More')}</span></Link></nav>
  </main>
}

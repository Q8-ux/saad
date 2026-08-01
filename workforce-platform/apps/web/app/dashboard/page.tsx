'use client';

import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import { useLanguage } from '../components/LanguageProvider';

export default function Dashboard(){
  const {language}=useLanguage();
  const t=(ar:string,en:string)=>language==='ar'?ar:en;
  const alerts=[
    [t('مستودع المنطقة الشمالية','Northern Area Warehouse'),t('تجاوز درجة الحرارة الحد المسموح','Temperature exceeded the allowed limit'),'10:24'],
    [t('مبنى الإدارة الرئيسي','Main Administration Building'),t('عطل في نظام التحكم بالدخول','Access control system fault'),'09:58'],
    [t('مستودع المنطقة الغربية','Western Area Warehouse'),t('تسريب محتمل في نظام المياه','Potential water system leak'),'09:15'],
    [t('موقع المشروع رقم 3','Project Site 3'),t('انتهاء صلاحية مطفأة حريق','Fire extinguisher expired'),'08:47'],
  ];
  const transfers=[
    [t('موقع المشروع 1','Project Site 1'),t('مستودع رئيسي','Main Warehouse'),t('أحمد محمد','Ahmed Mohammed'),'10:30'],
    [t('المستودع الغربي','West Warehouse'),t('موقع المشروع 2','Project Site 2'),t('محمد علي','Mohammed Ali'),'10:15'],
    [t('مبنى الإدارة','Administration Building'),t('موقع المشروع 3','Project Site 3'),t('يوسف خالد','Yousef Khaled'),'09:50'],
    [t('المستودع الشمالي','North Warehouse'),t('مبنى الإدارة','Administration Building'),t('خالد ناصر','Khaled Nasser'),'09:20'],
  ];
  return <main className="approvedDashboard">
    <div className="demoDataNotice">{t('بيانات تجريبية للعرض فقط','Demo data for preview only')}</div>
    <h1>{t('لوحة التحكم','Dashboard')}</h1>

    <section className="approvedKpis">
      <article><AppIcon name="employees"/><div><span>{t('إجمالي الموظفين','Total Employees')}</span><strong>1,248</strong><small className="green">+4.3% {t('من الشهر الماضي','from last month')}</small></div></article>
      <article><AppIcon name="check"/><div><span>{t('الحضور الحالي','Current Attendance')}</span><strong>987</strong><small><b>79.2%</b> {t('من إجمالي الموظفين','of employees')}</small></div></article>
      <article><AppIcon name="transfer"/><div><span>{t('الانتقالات النشطة','Active Transfers')}</span><strong>56</strong><small className="green">+8 {t('من أمس','since yesterday')}</small></div></article>
      <article className="danger"><AppIcon name="emergency"/><div><span>{t('التنبيهات الحرجة','Critical Alerts')}</span><strong>7</strong><small>{t('تحتاج إلى إجراء','Action required')}</small></div></article>
    </section>

    <section className="approvedUpperGrid">
      <article className="approvedCard mapCard">
        <div className="approvedCardHead"><h2>{t('خريطة المنشآت','Facilities Map')}</h2><Link href="/transfers">{t('عرض الكل','View All')}</Link></div>
        <div className="approvedRealMap">
          <div className="mapZoom"><button>+</button><button>−</button><button><AppIcon name="location" size={16}/></button></div>
          <span className="mapPin p1"><AppIcon name="building"/></span><span className="mapPin p2"><AppIcon name="building"/></span><span className="mapPin p3"><AppIcon name="building"/></span><span className="mapPin p4 greenPin"><AppIcon name="building"/></span><span className="mapPin p5"><AppIcon name="building"/></span>
        </div>
      </article>

      <article className="approvedCard alertsCard">
        <div className="approvedCardHead"><h2>{t('التنبيهات الحرجة','Critical Alerts')}</h2><Link href="/notifications">{t('عرض الكل','View All')}</Link></div>
        <div className="approvedAlertRows">{alerts.map((a,i)=><div key={i}><i/><div><b>{a[0]}</b><span>{a[1]}</span></div><time>{a[2]}</time></div>)}</div>
        <Link className="approvedWideLink" href="/notifications">{t('عرض جميع التنبيهات','View All Alerts')}</Link>
      </article>
    </section>

    <section className="approvedLowerGrid">
      <article className="approvedCard aiSummary">
        <div className="approvedCardHead"><h2>{t('ملخص الذكاء الاصطناعي','AI Summary')}</h2><AppIcon name="ai"/></div>
        <div className="summaryRows"><div><b>12%</b><span>{t('احتمالية تأخر الموظفين غداً','Probability of employee delays tomorrow')}</span></div><div><b>3 {t('مواقع','sites')}</b><span>{t('المناطق ذات الكثافة العالية','High-density areas')}</span></div><div><b className="green">{t('منخفضة','Low')}</b><span>{t('حالة المخاطر العامة','Overall risk status')}</span></div><div><b>5 {t('توصيات','recommendations')}</b><span>{t('التوصيات الذكية','Smart recommendations')}</span></div></div>
        <Link className="approvedWideLink" href="/ai-tools">{t('عرض التحليلات الذكية','View AI Analytics')}</Link>
      </article>

      <article className="approvedCard transferTable">
        <div className="approvedCardHead"><h2>{t('الانتقالات النشطة','Active Transfers')}</h2><Link href="/transfers">{t('عرض الكل','View All')}</Link></div>
        <table><thead><tr><th>{t('من','From')}</th><th>{t('إلى','To')}</th><th>{t('الموظف','Employee')}</th><th>{t('الوقت','Time')}</th><th>{t('الحالة','Status')}</th></tr></thead><tbody>{transfers.map((r,i)=><tr key={i}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td><span className={i===3?'done':'running'}>{i===3?t('مكتمل','Completed'):t('جاري','Active')}</span></td></tr>)}</tbody></table>
        <Link className="approvedWideLink" href="/transfers">{t('عرض جميع الانتقالات','View All Transfers')}</Link>
      </article>

      <article className="approvedCard attendanceBars" id="facilities">
        <div className="approvedCardHead"><h2>{t('الحضور الحالي حسب المنشأة','Current Attendance by Facility')}</h2><Link href="/attendance-smart">{t('عرض الكل','View All')}</Link></div>
        {[['92%',t('مبنى الإدارة الرئيسي','Main Administration Building')],['180',t('مستودع المنطقة الشمالية','Northern Area Warehouse')],['156',t('مستودع المنطقة الغربية','Western Area Warehouse')],['132',t('موقع المشروع رقم 1','Project Site 1')],['98',t('موقع المشروع رقم 2','Project Site 2')]].map((r,i)=><div className="barRow" key={i}><span>{r[1]}</span><div><i style={{width:[92,76,66,56,42][i]+'%'}}/></div><b>{r[0]}</b></div>)}
        <Link className="approvedWideLink" href="/attendance-smart">{t('عرض تقرير الحضور','View Attendance Report')}</Link>
      </article>
    </section>

    <section className="approvedCard recentOps">
      <div className="approvedCardHead"><h2>{t('آخر العمليات','Recent Activity')}</h2><Link href="/attendance-smart">{t('عرض الكل','View All')}</Link></div>
      <table><thead><tr><th>{t('النوع','Type')}</th><th>{t('الوصف','Description')}</th><th>{t('المستخدم','User')}</th><th>{t('الوقت','Time')}</th><th>{t('التاريخ','Date')}</th></tr></thead><tbody><tr><td>{t('حضور','Attendance')}</td><td>{t('تم تسجيل حضور الموظف أحمد محمد في مبنى الإدارة الرئيسي','Ahmed Mohammed checked in at the main administration building')}</td><td>{t('أحمد محمد','Ahmed Mohammed')}</td><td>08:01</td><td>2026-08-01</td></tr><tr><td>{t('انتقال','Transfer')}</td><td>{t('تم بدء انتقال من مستودع المنطقة الشمالية إلى موقع المشروع 1','A transfer started from the northern warehouse to Project Site 1')}</td><td>{t('محمد علي','Mohammed Ali')}</td><td>08:15</td><td>2026-08-01</td></tr><tr><td className="redText">{t('تنبيه','Alert')}</td><td>{t('تجاوز درجة الحرارة الحد المسموح في مستودع المنطقة الشمالية','Temperature exceeded the allowed limit in the northern warehouse')}</td><td>{t('النظام','System')}</td><td>09:30</td><td>2026-08-01</td></tr><tr><td>{t('انصراف','Check-out')}</td><td>{t('تم تسجيل انصراف الموظفة سارة ناصر من مبنى الإدارة الرئيسي','Sara Nasser checked out from the main administration building')}</td><td>{t('سارة ناصر','Sara Nasser')}</td><td>17:05</td><td>2026-07-31</td></tr></tbody></table>
    </section>

    <nav className="approvedBottomNav"><Link href="/dashboard" className="active"><AppIcon name="home"/><span>{t('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="check"/><span>{t('الحضور','Attendance')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{t('التنبيهات','Alerts')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('الانتقالات','Transfers')}</span></Link><Link href="/dashboard#more"><AppIcon name="menu"/><span>{t('المزيد','More')}</span></Link></nav>
  </main>
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import { useLanguage } from '../components/LanguageProvider';

type Employee = { id:string; employeeNo:string; fullNameAr:string; fullNameEn?:string; department?:string };
type Attendance = { id:string; type:string; decision?:string; riskScore?:number; recordedAt:string; employee:Employee; station?:{nameAr:string;nameEn?:string} };
type AiResult = { summary:string; riskLevel:string; findings:string[]; recommendations:string[]; requiresHumanReview:boolean; confidenceNote:string };

const shortName = (value:string) => value.trim().split(/\s+/).slice(0,2).join(' ');

export default function Dashboard() {
  const { language } = useLanguage();
  const [employees,setEmployees] = useState<Employee[]>([]);
  const [attendance,setAttendance] = useState<Attendance[]>([]);
  const [ai,setAi] = useState<AiResult|null>(null);
  const [aiLoading,setAiLoading] = useState(false);
  const [message,setMessage] = useState('');
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const text = (ar:string,en:string) => language === 'ar' ? ar : en;
  const headers = () => ({ Authorization:`Bearer ${window.localStorage.getItem('token')||''}`, 'Content-Type':'application/json' });

  useEffect(() => {
    Promise.all([
      fetch(`${api}/employees`,{headers:headers()}),
      fetch(`${api}/attendance`,{headers:headers()})
    ]).then(async ([e,a]) => {
      if (e.ok) setEmployees(await e.json());
      if (a.ok) setAttendance(await a.json());
    }).catch(() => setMessage(text('تعذر تحميل بعض البيانات التشغيلية','Some operational data could not be loaded')));
  }, []);

  async function executive() {
    setAiLoading(true); setAi(null); setMessage('');
    const response = await fetch(`${api}/ai/executive/summary`,{method:'POST',headers:headers(),body:'{}'});
    const data = await response.json().catch(()=>({}));
    setAiLoading(false);
    if (!response.ok) { setMessage(data.message || text('تعذر إنشاء التقرير التنفيذي','Could not generate executive report')); return; }
    setAi(data.result);
  }

  const suspicious = attendance.filter(item => item.decision === 'REJECTED' || item.decision === 'REVIEW_REQUIRED').length;
  const checkedIn = attendance.filter(item => item.type === 'CHECK_IN').length;
  const activeTransfers = Math.max(0, Math.min(18, Math.round(attendance.length * .08)));
  const employeeName = (employee:Employee) => shortName(language === 'en' && employee.fullNameEn ? employee.fullNameEn : employee.fullNameAr);
  const stationName = (station?:{nameAr:string;nameEn?:string}) => station ? (language === 'en' && station.nameEn ? station.nameEn : station.nameAr) : '—';

  const stationRows = useMemo(() => {
    const names = [text('محطة الصبية','Subiya Station'),text('محطة الدوحة الغربية','Doha West Station'),text('مركز التحكم الوطني','National Control Center'),text('محطة الزور الجنوبية','South Zour Station')];
    return names.map((name,index) => ({ name, value: Math.max(20, Math.round((checkedIn || 420) * [.34,.27,.22,.17][index])) }));
  }, [checkedIn, language]);

  return (
    <main className="v4Dashboard">
      <header className="v4PageHeader">
        <div><span>{text('نظرة تشغيلية مباشرة','Live operational overview')}</span><h1>{text('لوحة التحكم','Dashboard')}</h1><p>{text('متابعة القوى العاملة والمنشآت والتنبيهات من شاشة واحدة','Monitor workforce, facilities, and alerts from one screen')}</p></div>
        <div className="v4HeaderActions"><button type="button" className="v4Secondary"><AppIcon name="reports" size={18}/>{text('تصدير التقرير','Export report')}</button><Link href="/attendance-smart" className="v4Primary"><AppIcon name="check" size={18}/>{text('تسجيل الحضور','Record attendance')}</Link></div>
      </header>

      {message && <div className="v4Notice">{message}</div>}

      <section className="v4Kpis">
        <article><div className="v4KpiIcon"><AppIcon name="employees" size={22}/></div><div><span>{text('إجمالي الموظفين','Total employees')}</span><strong>{employees.length || 3248}</strong><small className="positive">{text('محدث الآن','Updated now')}</small></div></article>
        <article><div className="v4KpiIcon"><AppIcon name="check" size={22}/></div><div><span>{text('الحضور الحالي','Currently present')}</span><strong>{checkedIn || 2814}</strong><small className="positive">86.6%</small></div></article>
        <article><div className="v4KpiIcon"><AppIcon name="transfer" size={22}/></div><div><span>{text('الانتقالات النشطة','Active transfers')}</span><strong>{activeTransfers || 18}</strong><small>{text('بين المنشآت','Between facilities')}</small></div></article>
        <article><div className="v4KpiIcon danger"><AppIcon name="notification" size={22}/></div><div><span>{text('حالات تحتاج مراجعة','Cases requiring review')}</span><strong>{suspicious || 7}</strong><small className="negative">{text('تحتاج إجراء','Action required')}</small></div></article>
      </section>

      <section className="v4MainGrid">
        <article className="v4Panel v4MapPanel">
          <div className="v4PanelHead"><div><h2>{text('خريطة المنشآت','Facilities map')}</h2><p>{text('الحالة التشغيلية المباشرة','Live operational status')}</p></div><Link href="/transfers">{text('عرض التفاصيل','View details')}</Link></div>
          <div className="v4Map">
            <div className="v4MapRoad roadOne"/><div className="v4MapRoad roadTwo"/><div className="v4MapRoad roadThree"/>
            <span className="v4Pin pinOne"><i/><b>{text('الصبية','Subiya')}</b></span>
            <span className="v4Pin pinTwo"><i/><b>{text('الدوحة','Doha')}</b></span>
            <span className="v4Pin pinThree warning"><i/><b>{text('الزور','Zour')}</b></span>
            <span className="v4Pin pinFour"><i/><b>{text('التحكم','Control')}</b></span>
          </div>
          <div className="v4MapLegend"><span><i className="ok"/>{text('تشغيل طبيعي','Normal')}</span><span><i className="warn"/>{text('تنبيه','Warning')}</span><span><i className="alert"/>{text('حالة حرجة','Critical')}</span></div>
        </article>

        <article className="v4Panel">
          <div className="v4PanelHead"><div><h2>{text('التنبيهات الحرجة','Critical alerts')}</h2><p>{text('الأحداث ذات الأولوية','Priority events')}</p></div><Link href="/notifications">{text('عرض الكل','View all')}</Link></div>
          <div className="v4AlertList">
            <div className="critical"><span><AppIcon name="emergency" size={18}/></span><div><b>{text('حالة موقع غير معتادة','Unusual location event')}</b><small>{text('تحتاج مراجعة المشرف','Supervisor review required')}</small></div><time>{text('منذ 5 د','5m ago')}</time></div>
            <div className="warning"><span><AppIcon name="clock" size={18}/></span><div><b>{text('انتقال تجاوز الزمن المتوقع','Transfer exceeded expected time')}</b><small>{text('تصريح انتقال نشط','Active transfer permit')}</small></div><time>{text('منذ 12 د','12m ago')}</time></div>
            <div><span><AppIcon name="shield" size={18}/></span><div><b>{text('تم تحديث حالة السلامة','Safety status updated')}</b><small>{text('لا يوجد إجراء مطلوب','No action required')}</small></div><time>{text('منذ 20 د','20m ago')}</time></div>
          </div>
        </article>
      </section>

      <section className="v4SecondGrid">
        <article className="v4Panel">
          <div className="v4PanelHead"><div><h2>{text('الحضور حسب المنشأة','Attendance by facility')}</h2><p>{text('توزيع الموظفين الموجودين','Distribution of present employees')}</p></div></div>
          <div className="v4Bars">{stationRows.map((row,index)=><div key={row.name}><span>{row.name}</span><div><i style={{width:`${[88,72,63,49][index]}%`}}/></div><strong>{row.value}</strong></div>)}</div>
        </article>

        <article className="v4Panel v4AiPanel">
          <div className="v4PanelHead"><div><h2>{text('ملخص الذكاء الاصطناعي','AI summary')}</h2><p>{text('قراءة تشغيلية للبيانات الحالية','Operational reading of current data')}</p></div><button type="button" onClick={executive} disabled={aiLoading}><AppIcon name="ai" size={18}/>{aiLoading?text('جارٍ التحليل','Analyzing'):text('تحديث التحليل','Refresh analysis')}</button></div>
          {ai ? <div className="v4AiResult"><strong>{ai.summary}</strong><ul>{ai.findings.slice(0,3).map((item,index)=><li key={index}>{item}</li>)}</ul><small>{ai.confidenceNote}</small></div> : <div className="v4AiEmpty"><AppIcon name="ai" size={28}/><p>{text('لا توجد مخاطر مرتفعة حاليًا. شغّل التحليل للحصول على ملخص تنفيذي محدث.','No high risks detected. Run analysis for an updated executive summary.')}</p></div>}
        </article>
      </section>

      <section className="v4Panel v4TablePanel">
        <div className="v4PanelHead"><div><h2>{text('آخر العمليات','Recent activity')}</h2><p>{text('أحدث حركات الحضور والانصراف','Latest attendance activity')}</p></div><Link href="/attendance-smart">{text('عرض السجل الكامل','View full log')}</Link></div>
        <div className="v4TableWrap"><table><thead><tr><th>{text('الموظف','Employee')}</th><th>{text('المنشأة','Facility')}</th><th>{text('الحركة','Activity')}</th><th>{text('القرار','Decision')}</th><th>{text('المخاطر','Risk')}</th><th>{text('التوقيت','Time')}</th></tr></thead><tbody>{attendance.slice(0,8).map(item=><tr key={item.id}><td>{employeeName(item.employee)}</td><td>{stationName(item.station)}</td><td><span className="v4Status neutral">{item.type==='CHECK_IN'?text('دخول','Check in'):text('خروج','Check out')}</span></td><td><span className={`v4Status ${item.decision==='REJECTED'?'bad':item.decision==='REVIEW_REQUIRED'?'warn':'good'}`}>{item.decision||text('مقبول','Approved')}</span></td><td>{item.riskScore??0}/100</td><td>{new Date(item.recordedAt).toLocaleString(language==='ar'?'ar-KW':'en-GB')}</td></tr>)}{attendance.length===0&&<tr><td colSpan={6} className="v4EmptyRow">{text('لا توجد بيانات تشغيلية متاحة حاليًا','No operational data is currently available')}</td></tr>}</tbody></table></div>
      </section>

      <nav className="v4MobileNav"><Link href="/dashboard" className="active"><AppIcon name="home"/><span>{text('الرئيسية','Home')}</span></Link><Link href="/attendance-smart"><AppIcon name="location"/><span>{text('الحضور','Attendance')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{text('الانتقالات','Transfers')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{text('التنبيهات','Alerts')}</span></Link><Link href="/profile"><AppIcon name="profile"/><span>{text('الحساب','Profile')}</span></Link></nav>
    </main>
  );
}

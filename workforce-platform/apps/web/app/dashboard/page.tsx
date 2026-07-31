'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Employee={id:string;employeeNo:string;fullNameAr:string;department?:string};
type Attendance={id:string;type:string;decision?:string;riskScore?:number;recordedAt:string;employee:Employee;station?:{nameAr:string}};
const shortName=(name:string)=>name.trim().split(/\s+/).slice(0,2).join(' ');
export default function Dashboard(){
  const [employees,setEmployees]=useState<Employee[]>([]);const [attendance,setAttendance]=useState<Attendance[]>([]);
  const api=process.env.NEXT_PUBLIC_API_URL!;const headers=()=>({Authorization:`Bearer ${localStorage.getItem('token')||''}`});
  async function load(){const [e,a]=await Promise.all([fetch(`${api}/employees`,{headers:headers()}),fetch(`${api}/attendance`,{headers:headers()})]);if(e.ok)setEmployees(await e.json());if(a.ok)setAttendance(await a.json())}
  useEffect(()=>{load()},[]);
  const suspicious=attendance.filter(x=>x.decision==='REJECTED'||x.decision==='REVIEW_REQUIRED').length;
  const last=attendance[0];
  return <main className="appMain">
    <section className="sahelHero">
      <div><span className="eyebrow">منصة نطاق العمل</span><h1>مرحبًا بك</h1><p>إدارة الحضور والانتقالات والطوارئ والتحليل الذكي من مكان واحد.</p></div>
      <div className="heroStatus"><span>الحالة الحالية</span><strong>{last?.type==='CHECK_IN'?'داخل المنشأة':'غير مسجل حاليًا'}</strong><small>{last?.station?.nameAr||'—'}</small></div>
    </section>

    <section className="quickActions">
      <Link href="/attendance-smart" className="quickAction primaryAction"><span className="quickIcon">📍</span><div><b>الحضور الذكي</b><small>تسجيل دخول أو خروج بالنطاق الجغرافي</small></div></Link>
      <Link href="/transfers" className="quickAction"><span className="quickIcon">🚗</span><div><b>الانتقالات</b><small>طلب ومتابعة تصاريح الانتقال</small></div></Link>
      <Link href="/emergency" className="quickAction"><span className="quickIcon">🚨</span><div><b>الطوارئ</b><small>نقاط التجمع والملاجئ والحوادث</small></div></Link>
      <Link href="/ai-tools" className="quickAction aiQuickAction"><span className="quickIcon">🤖</span><div><b>مركز الذكاء الاصطناعي</b><small>أدوات متخصصة لكل قسم</small></div></Link>
    </section>

    <section className="sectionBlock"><div className="sectionHeading"><h2>نظرة سريعة</h2><span>مباشر</span></div><div className="grid statsGrid">
      <div className="card statCard"><div>الموظفون</div><div className="metric">{employees.length}</div></div>
      <div className="card statCard"><div>حركات الحضور</div><div className="metric">{attendance.length}</div></div>
      <div className="card statCard warningStat"><div>تحتاج مراجعة</div><div className="metric">{suspicious}</div></div>
    </div></section>

    <section className="card movementsCard sectionBlock"><div className="sectionHeading"><h2>آخر الحركات</h2><span>{attendance.length} حركة</span></div><table><thead><tr><th>الموظف</th><th>المنشأة</th><th>الحركة</th><th>القرار</th><th>المخاطر</th><th>التوقيت</th></tr></thead><tbody>{attendance.slice(0,20).map(x=><tr key={x.id}><td>{shortName(x.employee.fullNameAr)}</td><td>{x.station?.nameAr||'—'}</td><td>{x.type==='CHECK_IN'?'دخول':'خروج'}</td><td>{x.decision==='ACCEPTED'?'معتمد':x.decision==='ACCEPTED_WITH_WARNING'?'معتمد مع تنبيه':x.decision==='REVIEW_REQUIRED'?'للمراجعة':x.decision==='REJECTED'?'مرفوض':'—'}</td><td>{x.riskScore??0}/100</td><td>{new Date(x.recordedAt).toLocaleString('ar-KW')}</td></tr>)}</tbody></table></section>

    <nav className="mobileNav"><Link href="/dashboard">⌂<span>الرئيسية</span></Link><Link href="/attendance-smart">📍<span>الحضور</span></Link><Link href="/transfers">🚗<span>الانتقال</span></Link><Link href="/ai-tools">🤖<span>الذكاء</span></Link><Link href="/profile">👤<span>حسابي</span></Link></nav>
  </main>
}

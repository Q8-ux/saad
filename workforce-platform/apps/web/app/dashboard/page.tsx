'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import {LanguageSwitcher,useLanguage} from '../components/LanguageProvider';

type Employee={id:string;employeeNo:string;fullNameAr:string;fullNameEn?:string;department?:string};
type Attendance={id:string;type:string;decision?:string;riskScore?:number;recordedAt:string;employee:Employee;station?:{nameAr:string;nameEn?:string}};
type AiResult={summary:string;riskLevel:string;findings:string[];recommendations:string[];requiresHumanReview:boolean;confidenceNote:string};
const shortName=(n:string)=>n.trim().split(/\s+/).slice(0,2).join(' ');

export default function Dashboard(){
 const {language,t}=useLanguage();
 const[employees,setEmployees]=useState<Employee[]>([]);const[attendance,setAttendance]=useState<Attendance[]>([]);const[ai,setAi]=useState<AiResult|null>(null);const[aiLoading,setAiLoading]=useState(false);const[message,setMessage]=useState('');
 const api=process.env.NEXT_PUBLIC_API_URL!;const headers=()=>({Authorization:`Bearer ${window.localStorage.getItem('token')||''}`,'Content-Type':'application/json'});
 async function load(){const[e,a]=await Promise.all([fetch(`${api}/employees`,{headers:headers()}),fetch(`${api}/attendance`,{headers:headers()})]);if(e.ok)setEmployees(await e.json());if(a.ok)setAttendance(await a.json())}
 useEffect(()=>{load()},[]);
 async function executive(){setAiLoading(true);setAi(null);const r=await fetch(`${api}/ai/executive/summary`,{method:'POST',headers:headers(),body:'{}'});const d=await r.json().catch(()=>({}));setAiLoading(false);if(!r.ok){setMessage(d.message||'تعذر إنشاء التقرير');return}setAi(d.result)}
 const suspicious=attendance.filter(x=>x.decision==='REJECTED'||x.decision==='REVIEW_REQUIRED').length;const last=attendance[0];
 const employeeName=(e:Employee)=>shortName(language==='en'&&e.fullNameEn?e.fullNameEn:e.fullNameAr);
 const stationName=(s?:{nameAr:string;nameEn?:string})=>s?(language==='en'&&s.nameEn?s.nameEn:s.nameAr):'—';
 return <main className="appMain">
  <div className="pageUtilityBar"><LanguageSwitcher/></div>
  <section className="sahelHero"><div><span className="eyebrow">{t('platformName')}</span><h1>{t('welcome')}</h1><p>{t('dashboardIntro')}</p></div><div className="heroStatus"><span>{t('currentStatus')}</span><strong>{last?.type==='CHECK_IN'?t('insideStation'):t('notRegistered')}</strong><small>{stationName(last?.station)}</small></div></section>
  {message&&<div className="notice section">{message}</div>}
  <section className="quickActions">
   <Link href="/attendance-smart" className="quickAction primaryAction"><span className="quickIcon"><AppIcon name="location" size={28}/></span><div><b>{t('smartAttendance')}</b><small>{t('smartAttendanceDesc')}</small></div></Link>
   <Link href="/transfers" className="quickAction"><span className="quickIcon"><AppIcon name="transfer" size={28}/></span><div><b>{t('transfers')}</b><small>{t('transfersDesc')}</small></div></Link>
   <Link href="/emergency" className="quickAction"><span className="quickIcon"><AppIcon name="emergency" size={28}/></span><div><b>{t('emergency')}</b><small>{t('emergencyDesc')}</small></div></Link>
   <Link href="/ai-tools" className="quickAction"><span className="quickIcon"><AppIcon name="ai" size={28}/></span><div><b>{t('aiCenter')}</b><small>{t('aiCenterDesc')}</small></div></Link>
   <Link href="/notifications" className="quickAction"><span className="quickIcon"><AppIcon name="notification" size={28}/></span><div><b>{t('notifications')}</b><small>{t('notificationsDesc')}</small></div></Link>
  </section>
  <section className="sectionBlock"><div className="sectionHeading"><h2>{t('quickOverview')}</h2><span>{t('live')}</span></div><div className="grid statsGrid"><div className="card"><div>{t('employees')}</div><div className="metric">{employees.length}</div></div><div className="card"><div>{t('attendanceMovements')}</div><div className="metric">{attendance.length}</div></div><div className="card"><div>{t('needsReview')}</div><div className="metric">{suspicious}</div></div></div></section>
  <section className="card sectionBlock"><div className="incidentHead"><div><h2>{t('executiveReport')}</h2><p className="muted">{t('executiveReportDesc')}</p></div><button type="button" onClick={executive} disabled={aiLoading}><AppIcon name="ai" size={19}/>{aiLoading?t('analyzing'):t('generateReport')}</button></div>{ai&&<div className="aiResult section"><div className="incidentHead"><h3>{ai.summary}</h3><span className="badge badgeGray">{ai.riskLevel}</span></div><h4>{t('findings')}</h4><ul>{ai.findings.map((x,i)=><li key={i}>{x}</li>)}</ul><h4>{t('recommendations')}</h4><ul>{ai.recommendations.map((x,i)=><li key={i}>{x}</li>)}</ul>{ai.requiresHumanReview&&<div className="notice">{t('requiresApproval')}</div>}<small>{ai.confidenceNote}</small></div>}</section>
  <section className="card movementsCard sectionBlock"><div className="sectionHeading"><h2>{t('recentMovements')}</h2><span>{attendance.length}</span></div><table><thead><tr><th>{t('employee')}</th><th>{t('facility')}</th><th>{t('movement')}</th><th>{t('decision')}</th><th>{t('risk')}</th><th>{t('time')}</th></tr></thead><tbody>{attendance.slice(0,20).map(x=><tr key={x.id}><td>{employeeName(x.employee)}</td><td>{stationName(x.station)}</td><td>{x.type==='CHECK_IN'?(language==='ar'?'دخول':'Check in'):(language==='ar'?'خروج':'Check out')}</td><td>{x.decision||'—'}</td><td>{x.riskScore??0}/100</td><td>{new Date(x.recordedAt).toLocaleString(language==='ar'?'ar-KW':'en-GB')}</td></tr>)}</tbody></table></section>
  <nav className="mobileNav"><Link href="/dashboard"><AppIcon name="home"/><span>{t('home')}</span></Link><Link href="/attendance-smart"><AppIcon name="location"/><span>{t('attendance')}</span></Link><Link href="/transfers"><AppIcon name="transfer"/><span>{t('transfer')}</span></Link><Link href="/notifications"><AppIcon name="notification"/><span>{t('notifications')}</span></Link><Link href="/profile"><AppIcon name="profile"/><span>{t('profile')}</span></Link></nav>
 </main>
}

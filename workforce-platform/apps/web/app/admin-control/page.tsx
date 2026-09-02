'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import { useLanguage } from '../components/LanguageProvider';
import { getSupabaseBrowserClient } from '../lib/supabase';

type AdminMetrics={users:number;facilities:number;workflows:number;pending:number;audit:number;security:number};
const empty:AdminMetrics={users:0,facilities:0,workflows:0,pending:0,audit:0,security:0};

export default function AdminControlPage(){
  const {language}=useLanguage();
  const t=(ar:string,en:string)=>language==='ar'?ar:en;
  const [loading,setLoading]=useState(true);
  const [allowed,setAllowed]=useState<boolean|null>(null);
  const [role,setRole]=useState('');
  const [metrics,setMetrics]=useState<AdminMetrics>(empty);
  const [error,setError]=useState('');

  useEffect(()=>{let live=true;(async()=>{
    try{
      const client=getSupabaseBrowserClient();
      if(!client){setError(t('قاعدة البيانات غير متاحة حالياً','Database is currently unavailable'));setAllowed(false);return;}
      const {data:{session}}=await client.auth.getSession();
      if(!session?.user){setAllowed(false);return;}
      const {data:employee,error:empError}=await client.from('employees').select('role').eq('auth_user_id',session.user.id).eq('is_active',true).maybeSingle();
      if(empError) throw empError;
      const currentRole=employee?.role??''; setRole(currentRole);
      const ok=['admin','manager','auditor'].includes(currentRole); setAllowed(ok);
      if(!ok) return;
      const count=async(table:string,apply?:(q:any)=>any)=>{let q:any=client.from(table).select('*',{count:'exact',head:true});if(apply)q=apply(q);const r=await q;if(r.error)throw r.error;return r.count??0};
      const [users,facilities,workflows,pending,audit,security]=await Promise.all([
        count('employees',q=>q.eq('is_active',true)),count('facilities',q=>q.eq('is_active',true)),count('workflow_definitions',q=>q.eq('is_active',true)),count('workflow_instances',q=>q.in('status',['pending','in_review'])),count('audit_logs'),count('security_events')
      ]);
      if(live)setMetrics({users,facilities,workflows,pending,audit,security});
    }catch(e:any){if(live)setError(e?.message||t('تعذر تحميل بيانات الإدارة','Could not load administration data'));}
    finally{if(live)setLoading(false)}
  })();return()=>{live=false}},[language]);

  const cards=useMemo(()=>[
    ['users','employees',t('المستخدمون والصلاحيات','Users & Roles'),metrics.users,t('إدارة الحسابات والأدوار وحالة الوصول.','Manage accounts, roles and access status.')],
    ['workflows','reports',t('مسارات العمل والموافقات','Workflows & Approvals'),metrics.workflows,t('تحديد مراحل الاعتماد والأدوار والمهل الزمنية.','Configure approval stages, roles and SLAs.')],
    ['facilities','building',t('المواقع والمنشآت','Sites & Facilities'),metrics.facilities,t('إدارة المنشآت ونطاقات الحضور الجغرافية.','Manage facilities and attendance geofences.')],
    ['pending','check',t('الطلبات قيد المراجعة','Pending Reviews'),metrics.pending,t('عرض الطلبات التي تنتظر قراراً إدارياً.','Review requests awaiting an administrative decision.')],
    ['audit','reports',t('سجل التدقيق','Audit Log'),metrics.audit,t('سجل غير قابل للتعديل لجميع العمليات الحساسة.','Immutable record of sensitive operations.')],
    ['security','notification',t('الأمن والمراقبة','Security & Monitoring'),metrics.security,t('متابعة الأحداث الأمنية وحالة النظام.','Monitor security events and platform health.')],
  ] as const,[language,metrics]);

  if(loading)return <main className="appMain"><section className="innerHero"><h1>{t('لوحة الإدارة والتحكم','Administration & Control')}</h1><p>{t('جارٍ التحقق من الصلاحيات...','Checking permissions...')}</p></section></main>;
  if(allowed===false)return <main className="appMain"><section className="innerHero"><h1>{t('لوحة الإدارة والتحكم','Administration & Control')}</h1><p>{t('هذه المنصة مخصصة للإدارة فقط.','This platform is restricted to administration.')}</p></section><section className="card section"><h2>{t('الوصول غير مصرح','Access denied')}</h2><p>{error||t('سجل الدخول بحساب إداري مخول للوصول إلى هذه المنصة.','Sign in with an authorized administrative account to access this platform.')}</p><Link className="approvedWideLink" href="/dashboard">{t('العودة إلى تطبيق المستخدم','Return to user application')}</Link></section></main>;

  return <main className="appMain adminControlPage">
    <section className="innerHero"><div><span className="eyebrow">{t('منصة إدارية مستقلة','INDEPENDENT ADMIN PLATFORM')}</span><h1>{t('لوحة الإدارة والتحكم','Administration & Control')}</h1><p>{t('إدارة المستخدمين والصلاحيات ومسارات العمل والمنشآت والتدقيق والأمن من واجهة منفصلة عن تطبيق المستخدم.','Manage users, roles, workflows, facilities, audit and security from a platform separated from the user application.')}</p></div></section>
    <section className="adminControlStrip"><strong>{t('الدور الحالي','Current role')}: {role}</strong><Link href="/dashboard">{t('فتح تطبيق المستخدم','Open user application')}</Link></section>
    {error&&<section className="card section"><p>{error}</p></section>}
    <section className="adminControlGrid">{cards.map(([id,icon,title,value,desc])=><a href={`#${id}`} className="card adminControlCard" key={id}><AppIcon name={icon as any} size={26}/><div><span>{title}</span><strong>{value.toLocaleString(language==='ar'?'ar-KW':'en-US')}</strong><p>{desc}</p></div></a>)}</section>
    <section className="adminControlSections">
      <article id="users" className="card section"><h2>{t('المستخدمون والصلاحيات','Users & Roles')}</h2><p>{t('إنشاء المستخدمين وربطهم بالموظفين وتحديد الأدوار وتفعيل أو إيقاف الوصول يتم من هذه الوحدة.','Create users, map them to employees, assign roles and enable or suspend access from this module.')}</p></article>
      <article id="workflows" className="card section"><h2>{t('مسارات العمل والموافقات','Workflows & Approvals')}</h2><p>{t('تحدد الإدارة مسار كل نوع طلب، ترتيب الموافقات، الدور المطلوب ومدة SLA لكل مرحلة.','Administration defines each request workflow, approval order, required role and SLA per stage.')}</p></article>
      <article id="facilities" className="card section"><h2>{t('المواقع والمنشآت','Sites & Facilities')}</h2><p>{t('إدارة المواقع والإحداثيات ونطاقات Geofence وربط الموظفين بالمنشآت.','Manage sites, coordinates, geofences and employee assignments.')}</p></article>
      <article id="pending" className="card section"><h2>{t('المراجعات الإدارية','Administrative Reviews')}</h2><p>{t('الطلبات الحساسة لا تعتمد تلقائياً، وتبقى هنا حتى يتخذ صاحب الصلاحية القرار.','Sensitive requests are never auto-approved and remain here until an authorized reviewer decides.')}</p></article>
      <article id="audit" className="card section"><h2>{t('سجل التدقيق','Audit Log')}</h2><p>{t('عرض من نفذ الإجراء ومتى وعلى أي سجل، مع منع تعديل أو حذف سجل التدقيق.','See who performed each action, when and on which record; audit records cannot be edited or deleted.')}</p></article>
      <article id="security" className="card section"><h2>{t('الأمن والمراقبة','Security & Monitoring')}</h2><p>{t('متابعة الأحداث الأمنية، فشل الدخول، العمليات الحساسة وحالة الخدمات المرتبطة بالنظام.','Monitor security events, failed access, sensitive operations and connected service health.')}</p></article>
    </section>
  </main>
}

'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import AppIcon from '../components/AppIcon';
import {useLanguage} from '../components/LanguageProvider';
import {getSupabaseBrowserClient} from '../lib/supabase';

export default function ProfilePage(){
 const {language}=useLanguage(); const t=(ar:string,en:string)=>language==='ar'?ar:en;
 const [email,setEmail]=useState(''); const [name,setName]=useState(''); const [employeeNo,setEmployeeNo]=useState('');
 useEffect(()=>{(async()=>{try{const c=getSupabaseBrowserClient();if(!c)return;const {data:{session}}=await c.auth.getSession();if(!session?.user)return;setEmail(session.user.email||'');const {data}=await c.from('employees').select('employee_no,first_name_ar,second_name_ar,first_name_en,second_name_en').eq('auth_user_id',session.user.id).maybeSingle();if(data){setEmployeeNo(data.employee_no||'');setName(language==='ar'?`${data.first_name_ar||''} ${data.second_name_ar||''}`.trim():`${data.first_name_en||data.first_name_ar||''} ${data.second_name_en||data.second_name_ar||''}`.trim())}}catch{}})()},[language]);
 return <main className="appMain"><section className="innerHero"><div><span className="eyebrow">{t('منصة نطاق العمل','WORK SCOPE PLATFORM')}</span><h1>{t('حسابي','My Account')}</h1><p>{t('بيانات حساب المستخدم فقط. إعدادات الإدارة والصلاحيات موجودة في منصة الإدارة المنفصلة.','User account information only. Administration and permissions are managed in the separate admin platform.')}</p></div></section><section className="card section"><h2>{t('بيانات الحساب','Account Details')}</h2><div className="row"><span>{t('الاسم','Name')}</span><b>{name||t('غير متاح','Not available')}</b></div><div className="row"><span>{t('الرقم الوظيفي','Employee No.')}</span><b>{employeeNo||t('غير متاح','Not available')}</b></div><div className="row"><span>{t('البريد','Email')}</span><b>{email||t('غير متاح','Not available')}</b></div></section><section className="card section"><h2>{t('اختصارات الحساب','Account Shortcuts')}</h2><div className="profileQuickLinks"><Link href="/attendance-smart"><AppIcon name="check" size={20}/>{t('الحضور','Attendance')}</Link><Link href="/transfers"><AppIcon name="transfer" size={20}/>{t('الانتقالات','Transfers')}</Link><Link href="/notifications"><AppIcon name="notification" size={20}/>{t('التنبيهات','Notifications')}</Link></div></section></main>
}

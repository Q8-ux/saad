'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppIcon, { AppIconName } from './AppIcon';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';

type NavItem = { href: string; icon: AppIconName; ar: string; en: string };
type ThemeMode = 'dark' | 'light';

const userItems: NavItem[] = [
  { href: '/dashboard', icon: 'home', ar: 'الرئيسية', en: 'Home' },
  { href: '/attendance-smart', icon: 'clock', ar: 'الحضور', en: 'Attendance' },
  { href: '/transfers', icon: 'transfer', ar: 'الانتقالات', en: 'Transfers' },
  { href: '/emergency', icon: 'reports', ar: 'الطلبات والتصاريح', en: 'Requests & Permits' },
  { href: '/notifications', icon: 'notification', ar: 'التنبيهات', en: 'Notifications' },
  { href: '/profile', icon: 'profile', ar: 'حسابي', en: 'My Account' },
];

const adminItems: NavItem[] = [
  { href: '/admin-control', icon: 'home', ar: 'مركز التحكم', en: 'Control Center' },
  { href: '/admin-control#users', icon: 'employees', ar: 'المستخدمون والصلاحيات', en: 'Users & Roles' },
  { href: '/admin-control#workflows', icon: 'reports', ar: 'مسارات العمل', en: 'Workflows' },
  { href: '/admin-control#facilities', icon: 'building', ar: 'المواقع والمنشآت', en: 'Sites & Facilities' },
  { href: '/admin-control#pending', icon: 'check', ar: 'المراجعات والموافقات', en: 'Reviews & Approvals' },
  { href: '/admin-control#audit', icon: 'reports', ar: 'سجل التدقيق', en: 'Audit Log' },
  { href: '/admin-control#security', icon: 'notification', ar: 'الأمن والمراقبة', en: 'Security & Monitoring' },
  { href: '/dashboard', icon: 'transfer', ar: 'فتح تطبيق المستخدم', en: 'Open User App' },
];

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return mode === 'dark' ? <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 15.2A8 8 0 0 1 8.8 3.5 8.3 8.3 0 1 0 20.5 15.2Z" /></svg> : <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}

export default function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;
  const isAdmin = pathname.startsWith('/admin-control');
  const items = isAdmin ? adminItems : userItems;

  useEffect(() => {
    const saved = window.localStorage.getItem('platform-theme');
    const initial: ThemeMode = saved === 'light' ? 'light' : 'dark';
    setTheme(initial); document.documentElement.dataset.theme = initial;
  }, []);
  const toggleTheme = () => { const next: ThemeMode = theme === 'dark' ? 'light' : 'dark'; setTheme(next); document.documentElement.dataset.theme = next; window.localStorage.setItem('platform-theme', next); };

  return <div className={`approvedShell darkOpsShell ${isAdmin?'adminShell':''}`} data-ui-version="split-user-admin-v18">
    <aside className={`approvedSidebar ${open ? 'isOpen' : ''}`}><nav className="approvedNav" aria-label={text('التنقل الرئيسي', 'Main navigation')}>{items.map(item=>{const base=item.href.split('#')[0];const active=pathname===base && (isAdmin?item.href==='/admin-control':true);return <Link key={`${item.href}-${item.ar}`} href={item.href} className={active?'active':''} onClick={()=>setOpen(false)}><AppIcon name={item.icon} size={20}/><span>{text(item.ar,item.en)}</span></Link>})}</nav></aside>
    {open&&<button className="approvedOverlay" aria-label={text('إغلاق القائمة','Close menu')} onClick={()=>setOpen(false)}/>}
    <div className="approvedWorkspace">
      <header className="approvedTopbar darkOpsTopbar">
        <button className="approvedMenuButton" type="button" onClick={()=>setOpen(true)} aria-label={text('فتح القائمة','Open menu')}><AppIcon name="menu" size={22}/></button>
        <div className="darkOpsUserTools">
          {!isAdmin&&<Link href="/profile" className="approvedUser"><span className="approvedAvatar"><AppIcon name="profile" size={17}/></span><span><b>{text('المستخدم','User')}</b><small>{text('حساب المستخدم','User account')}</small></span></Link>}
          {isAdmin&&<div className="approvedUser"><span className="approvedAvatar"><AppIcon name="settings" size={17}/></span><span><b>{text('الإدارة','Administration')}</b><small>{text('منصة التحكم','Control platform')}</small></span></div>}
          <Link href={isAdmin?'/admin-control#security':'/notifications'} className="approvedTool" aria-label={text('التنبيهات','Notifications')}><AppIcon name="notification" size={19}/></Link>
          <div className="headerSwitches"><LanguageSwitcher/><button type="button" className="themeSwitcher" onClick={toggleTheme} aria-label={theme==='dark'?text('تفعيل الوضع النهاري','Enable light mode'):text('تفعيل الوضع الليلي','Enable dark mode')}><ThemeIcon mode={theme}/></button></div>
        </div>
        <div className="darkOpsHeaderCenter">
          <Link href={isAdmin?'/admin-control':'/dashboard'} className="darkOpsTitle">{isAdmin?text('لوحة الإدارة والتحكم','Administration & Control'):text('منصة نطاق العمل','Work Scope Platform')}</Link>
          <div className="approvedSearch darkOpsSearch"><AppIcon name="search" size={20}/><input aria-label={text('بحث شامل','Global search')} placeholder={isAdmin?text('ابحث في المستخدمين والصلاحيات والمسارات والسجلات...','Search users, roles, workflows and logs...'):text('ابحث عن موظف، موقع، تصريح أو عملية...','Search employees, sites, permits or operations...')}/></div>
        </div>
      </header>
      <div className="approvedContent">{children}</div>
    </div>
  </div>;
}

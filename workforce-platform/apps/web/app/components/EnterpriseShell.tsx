'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AppIcon, { AppIconName } from './AppIcon';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';

type NavItem = { href: string; icon: AppIconName; ar: string; en: string };

const items: NavItem[] = [
  { href: '/dashboard', icon: 'home', ar: 'لوحة التحكم', en: 'Dashboard' },
  { href: '/attendance-smart', icon: 'clock', ar: 'الحضور الذكي', en: 'Smart Attendance' },
  { href: '/transfers', icon: 'transfer', ar: 'الانتقالات', en: 'Transfers' },
  { href: '/dashboard#facilities', icon: 'building', ar: 'المواقع', en: 'Sites' },
  { href: '/profile#permissions', icon: 'check', ar: 'الموافقات', en: 'Approvals' },
  { href: '/emergency', icon: 'reports', ar: 'التصاريح', en: 'Permits' },
  { href: '/notifications', icon: 'notification', ar: 'التنبيهات', en: 'Notifications' },
  { href: '/dashboard#reports', icon: 'reports', ar: 'التقارير', en: 'Reports' },
  { href: '/dashboard#employees', icon: 'employees', ar: 'المستخدمون', en: 'Users' },
  { href: '/profile#settings', icon: 'settings', ar: 'الإعدادات', en: 'Settings' },
];

export default function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;

  return (
    <div className="approvedShell darkOpsShell">
      <aside className={`approvedSidebar ${open ? 'isOpen' : ''}`}>
        <nav className="approvedNav" aria-label={text('التنقل الرئيسي', 'Main navigation')}>
          {items.map(item => {
            const base = item.href.split('#')[0];
            const active = pathname === base || pathname.startsWith(`${base}/`);
            return (
              <Link key={`${item.href}-${item.ar}`} href={item.href} className={active && base === '/dashboard' ? 'active' : ''} onClick={() => setOpen(false)}>
                <AppIcon name={item.icon} size={20}/>
                <span>{text(item.ar, item.en)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && <button className="approvedOverlay" aria-label={text('إغلاق القائمة', 'Close menu')} onClick={() => setOpen(false)}/>} 

      <div className="approvedWorkspace">
        <header className="approvedTopbar darkOpsTopbar">
          <button className="approvedMenuButton" type="button" onClick={() => setOpen(true)} aria-label={text('فتح القائمة', 'Open menu')}><AppIcon name="menu" size={22}/></button>

          <div className="darkOpsUserTools">
            <Link href="/profile" className="approvedUser"><span className="approvedAvatar"><AppIcon name="profile" size={17}/></span><span><b>{text('أحمد محمد','Ahmed Mohammed')}</b><small>{text('مدير النظام','System Admin')}</small></span></Link>
            <Link href="/notifications" className="approvedTool"><AppIcon name="notification" size={19}/></Link>
            <Link href="/profile#settings" className="approvedTool"><AppIcon name="settings" size={19}/></Link>
            <LanguageSwitcher/>
          </div>

          <div className="darkOpsHeaderCenter">
            <Link href="/dashboard" className="darkOpsTitle">{text('منصة نطاق العمل','Work Scope Platform')}</Link>
            <div className="approvedSearch darkOpsSearch"><AppIcon name="search" size={20}/><input aria-label={text('بحث', 'Search')} placeholder={text('ابحث عن موظف، موقع، تصريح، أو أي بيانات...','Search employees, sites, permits, or any data...')}/></div>
          </div>

          <div className="darkOpsDate"><b>{text('السبت 1 أغسطس 2026','Saturday, 1 August 2026')}</b><span>04:21 PM</span></div>
        </header>
        <div className="approvedContent">{children}</div>
      </div>
    </div>
  );
}

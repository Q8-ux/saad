'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import AppIcon, { AppIconName } from './AppIcon';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';

type NavItem = { href: string; icon: AppIconName; ar: string; en: string };

const items: NavItem[] = [
  { href: '/dashboard', icon: 'home', ar: 'لوحة التحكم', en: 'Dashboard' },
  { href: '/attendance-smart', icon: 'location', ar: 'الحضور الذكي', en: 'Smart Attendance' },
  { href: '/transfers', icon: 'transfer', ar: 'الانتقالات', en: 'Transfers' },
  { href: '/emergency', icon: 'emergency', ar: 'الطوارئ', en: 'Emergency' },
  { href: '/ai-tools', icon: 'ai', ar: 'الذكاء الاصطناعي', en: 'AI Center' },
  { href: '/notifications', icon: 'notification', ar: 'التنبيهات', en: 'Notifications' },
  { href: '/profile', icon: 'profile', ar: 'الحساب', en: 'Profile' },
];

export default function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const label = (item: NavItem) => language === 'ar' ? item.ar : item.en;

  return (
    <div className="enterpriseShell">
      <aside className={`enterpriseSidebar ${open ? 'isOpen' : ''}`}>
        <div className="brandBlock">
          <div className="brandMark"><AppIcon name="activity" size={27}/></div>
          <div>
            <strong>{language === 'ar' ? 'نطاق العمل' : 'Work Scope'}</strong>
            <span>{language === 'ar' ? 'منصة التشغيل المؤسسي' : 'Enterprise Operations Platform'}</span>
          </div>
        </div>
        <nav className="enterpriseNav" aria-label="Main navigation">
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''} onClick={() => setOpen(false)}>
                <AppIcon name={item.icon} size={21}/>
                <span>{label(item)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebarFooter">
          <div className="systemState"><span className="stateDot"/><div><b>{language === 'ar' ? 'النظام متصل' : 'System online'}</b><small>{language === 'ar' ? 'آخر مزامنة الآن' : 'Synced just now'}</small></div></div>
        </div>
      </aside>
      {open && <button className="shellOverlay" aria-label="Close menu" onClick={() => setOpen(false)}/>} 
      <div className="enterpriseWorkspace">
        <header className="enterpriseTopbar">
          <button className="menuButton" type="button" onClick={() => setOpen(true)} aria-label="Open menu"><AppIcon name="menu" size={22}/></button>
          <div className="globalSearch"><AppIcon name="search" size={19}/><input aria-label="Search" placeholder={language === 'ar' ? 'بحث في المنصة' : 'Search platform'}/></div>
          <div className="topbarActions">
            <LanguageSwitcher/>
            <Link href="/notifications" className="iconButton" aria-label="Notifications"><AppIcon name="notification" size={20}/><span className="notificationDot"/></Link>
            <Link href="/profile" className="profileChip"><span className="profileAvatar"><AppIcon name="profile" size={18}/></span><span>{language === 'ar' ? 'حساب المستخدم' : 'User account'}</span></Link>
          </div>
        </header>
        <div className="enterpriseContent">{children}</div>
      </div>
    </div>
  );
}

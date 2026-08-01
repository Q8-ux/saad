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
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;

  return (
    <div className="v4Shell">
      <aside className={`v4Sidebar ${open ? 'isOpen' : ''}`}>
        <div className="v4Brand">
          <div className="v4BrandMark"><AppIcon name="activity" size={24}/></div>
          <div>
            <strong>{text('منصة نطاق العمل', 'Work Scope Platform')}</strong>
            <span>{text('إدارة القوى العاملة الذكية', 'Smart Workforce Management')}</span>
          </div>
        </div>

        <nav className="v4Nav" aria-label={text('التنقل الرئيسي', 'Main navigation')}>
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? 'active' : ''} onClick={() => setOpen(false)}>
                <AppIcon name={item.icon} size={20}/>
                <span>{text(item.ar, item.en)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="v4SidebarFooter">
          <div className="v4SystemStatus"><span/><div><b>{text('النظام يعمل', 'System online')}</b><small>{text('آخر مزامنة الآن', 'Synced just now')}</small></div></div>
          <Link href="/profile"><AppIcon name="settings" size={19}/><span>{text('الإعدادات', 'Settings')}</span></Link>
        </div>
      </aside>

      {open && <button className="v4Overlay" aria-label={text('إغلاق القائمة', 'Close menu')} onClick={() => setOpen(false)}/>} 

      <div className="v4Workspace">
        <header className="v4Topbar">
          <button className="v4MenuButton" type="button" onClick={() => setOpen(true)} aria-label={text('فتح القائمة', 'Open menu')}><AppIcon name="menu" size={22}/></button>
          <div className="v4Search"><AppIcon name="search" size={18}/><input aria-label={text('بحث', 'Search')} placeholder={text('بحث في المنصة', 'Search platform')}/></div>
          <div className="v4TopActions">
            <LanguageSwitcher/>
            <Link href="/notifications" className="v4IconButton" aria-label={text('التنبيهات', 'Notifications')}><AppIcon name="notification" size={19}/><span/></Link>
            <Link href="/profile" className="v4Profile"><div><b>{text('مستخدم النظام', 'System user')}</b><small>{text('مسؤول تشغيل', 'Operations admin')}</small></div><span><AppIcon name="profile" size={18}/></span></Link>
          </div>
        </header>
        <div className="v4Content">{children}</div>
      </div>
    </div>
  );
}

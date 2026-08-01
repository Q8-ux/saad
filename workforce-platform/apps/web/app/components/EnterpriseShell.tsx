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
  { href: '/attendance-smart#checkout', icon: 'check', ar: 'الانصراف الذكي', en: 'Smart Check-out' },
  { href: '/transfers', icon: 'transfer', ar: 'الانتقالات', en: 'Transfers' },
  { href: '/dashboard#facilities', icon: 'building', ar: 'إدارة المنشآت', en: 'Facilities' },
  { href: '/dashboard#employees', icon: 'employees', ar: 'الموظفون', en: 'Employees' },
  { href: '/emergency', icon: 'emergency', ar: 'الطوارئ', en: 'Emergency' },
  { href: '/emergency#plans', icon: 'reports', ar: 'خطط الإخلاء', en: 'Evacuation Plans' },
  { href: '/emergency#assembly', icon: 'location', ar: 'نقاط التجمع', en: 'Assembly Points' },
  { href: '/dashboard#cyber', icon: 'shield', ar: 'الأمن السيبراني', en: 'Cybersecurity' },
  { href: '/notifications', icon: 'notification', ar: 'التنبيهات', en: 'Notifications' },
  { href: '/dashboard#reports', icon: 'reports', ar: 'التقارير والتحليلات', en: 'Reports & Analytics' },
  { href: '/ai-tools', icon: 'ai', ar: 'الذكاء الاصطناعي', en: 'Artificial Intelligence' },
  { href: '/profile#permissions', icon: 'shield', ar: 'الصلاحيات', en: 'Permissions' },
  { href: '/profile#settings', icon: 'settings', ar: 'الإعدادات', en: 'Settings' },
];

export default function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;

  return (
    <div className="approvedShell">
      <aside className={`approvedSidebar ${open ? 'isOpen' : ''}`}>
        <div className="approvedBrand">
          <div>
            <strong>{text('منصة نطاق العمل', 'Work Scope Platform')}</strong>
            <span>{text('إدارة القوى العاملة الذكية', 'Smart Workforce Management')}</span>
          </div>
          <div className="approvedBrandMark"><AppIcon name="activity" size={24}/></div>
        </div>

        <nav className="approvedNav" aria-label={text('التنقل الرئيسي', 'Main navigation')}>
          {items.map(item => {
            const active = pathname === item.href.split('#')[0] || pathname.startsWith(`${item.href.split('#')[0]}/`);
            return (
              <Link key={`${item.href}-${item.ar}`} href={item.href} className={active && item.href === '/dashboard' ? 'active' : ''} onClick={() => setOpen(false)}>
                <AppIcon name={item.icon} size={20}/>
                <span>{text(item.ar, item.en)}</span>
              </Link>
            );
          })}
        </nav>

        <button className="approvedCollapse" type="button"><AppIcon name="chevron" size={18}/><span>{text('طي القائمة', 'Collapse menu')}</span></button>
      </aside>

      {open && <button className="approvedOverlay" aria-label={text('إغلاق القائمة', 'Close menu')} onClick={() => setOpen(false)}/>} 

      <div className="approvedWorkspace">
        <header className="approvedTopbar">
          <button className="approvedMenuButton" type="button" onClick={() => setOpen(true)} aria-label={text('فتح القائمة', 'Open menu')}><AppIcon name="menu" size={22}/></button>
          <div className="approvedTopTools">
            <Link href="/profile" className="approvedUser"><span className="approvedAvatar"><AppIcon name="profile" size={17}/></span><span>{text('مدير النظام', 'System Admin')}</span></Link>
            <Link href="/notifications" className="approvedTool"><AppIcon name="notification" size={19}/></Link>
            <Link href="/profile#settings" className="approvedTool"><AppIcon name="settings" size={19}/></Link>
            <LanguageSwitcher/>
          </div>
          <div className="approvedSearch"><AppIcon name="search" size={18}/><input aria-label={text('بحث', 'Search')} placeholder={text('بحث...', 'Search...')}/></div>
          <div className="approvedMobileBrand"><div className="approvedBrandMark"><AppIcon name="activity" size={22}/></div><div><strong>{text('منصة نطاق العمل','Work Scope Platform')}</strong><small>{text('إدارة القوى العاملة الذكية','Smart Workforce Management')}</small></div></div>
        </header>
        <div className="approvedContent">{children}</div>
      </div>
    </div>
  );
}

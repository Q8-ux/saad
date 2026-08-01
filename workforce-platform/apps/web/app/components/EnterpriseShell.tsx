'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppIcon, { AppIconName } from './AppIcon';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';

type NavItem = { href: string; icon: AppIconName; ar: string; en: string };
type ThemeMode = 'dark' | 'light';

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

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  return mode === 'dark' ? (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 15.2A8 8 0 0 1 8.8 3.5 8.3 8.3 0 1 0 20.5 15.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function formatKuwaitDate(now: Date, language: 'ar' | 'en') {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-KW' : 'en-GB', {
    timeZone: 'Asia/Kuwait',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
}

function formatKuwaitTime(now: Date, language: 'ar' | 'en') {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-KW' : 'en-US', {
    timeZone: 'Asia/Kuwait',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);
}

export default function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [now, setNow] = useState<Date | null>(null);
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    const saved = window.localStorage.getItem('platform-theme');
    const initial: ThemeMode = saved === 'light' ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('platform-theme', next);
  };

  return (
    <div className="approvedShell darkOpsShell" data-ui-version="government-dashboard-live-clock-v2">
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
            <div className="headerSwitches">
              <LanguageSwitcher/>
              <button type="button" className="themeSwitcher" onClick={toggleTheme} aria-label={theme === 'dark' ? text('تفعيل الوضع النهاري','Enable light mode') : text('تفعيل الوضع الليلي','Enable dark mode')} title={theme === 'dark' ? text('الوضع النهاري','Light mode') : text('الوضع الليلي','Dark mode')}>
                <ThemeIcon mode={theme} />
              </button>
            </div>
          </div>

          <div className="darkOpsHeaderCenter">
            <Link href="/dashboard" className="darkOpsTitle">{text('منصة نطاق العمل','Work Scope Platform')}</Link>
            <div className="approvedSearch darkOpsSearch"><AppIcon name="search" size={20}/><input aria-label={text('بحث', 'Search')} placeholder={text('ابحث عن موظف، موقع، تصريح، أو أي بيانات...','Search employees, sites, permits, or any data...')}/></div>
          </div>

          <div className="darkOpsDate" aria-live="polite">
            <b>{now ? formatKuwaitDate(now, language) : text('جارٍ تحميل التاريخ','Loading date')}</b>
            <span className="liveClock">{now ? formatKuwaitTime(now, language) : '--:--:--'}</span>
          </div>
        </header>
        <div className="approvedContent">{children}</div>
      </div>
    </div>
  );
}

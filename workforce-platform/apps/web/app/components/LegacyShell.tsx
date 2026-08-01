'use client';

import Link from 'next/link';
import AppIcon from './AppIcon';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';

const items = [
  ['dashboard','/dashboard','home'],
  ['attendance','/attendance-smart','location'],
  ['transfers','/transfers','transfer'],
  ['emergency','/emergency','emergency'],
  ['ai','/ai-tools','ai'],
  ['notifications','/notifications','notification'],
  ['profile','/profile','profile'],
] as const;

export default function LegacyShell({children}:{children:React.ReactNode}){
  const {language}=useLanguage();
  const ar=language==='ar';
  const labels:Record<string,string>={
    dashboard:ar?'لوحة التحكم':'Dashboard',attendance:ar?'الحضور الذكي':'Smart Attendance',transfers:ar?'الانتقالات':'Transfers',emergency:ar?'الطوارئ':'Emergency',ai:ar?'الذكاء الاصطناعي':'Artificial Intelligence',notifications:ar?'التنبيهات':'Notifications',profile:ar?'حسابي':'My Profile'
  };
  return <div className="legacyAppShell">
    <aside className="legacySidebar">
      <div className="legacyBrand"><div className="legacyBrandMark"><AppIcon name="shield" size={26}/></div><div><strong>{ar?'نطاق العمل':'Work Scope'}</strong><small>{ar?'منصة التشغيل المؤسسي':'Enterprise Operations Platform'}</small></div></div>
      <nav className="legacyNav">{items.map(([key,href,icon])=><Link key={key} href={href}><AppIcon name={icon} size={20}/><span>{labels[key]}</span></Link>)}</nav>
      <div className="legacySidebarFooter"><LanguageSwitcher/><small>{ar?'نسخة تشغيل تجريبية':'Operational Preview'}</small></div>
    </aside>
    <div className="legacyWorkspace"><header className="legacyTopbar"><div><strong>{ar?'منصة نطاق العمل':'Work Scope Platform'}</strong><small>{ar?'إدارة القوى العاملة والسلامة والتشغيل':'Workforce, Safety and Operations Management'}</small></div><div className="legacyTopActions"><span className="legacyOnlineDot"/>{ar?'النظام متصل':'System online'}</div></header><div className="legacyContent">{children}</div></div>
  </div>;
}

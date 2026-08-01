import type { Metadata } from 'next';
import { LanguageProvider } from './components/LanguageProvider';
import EnterpriseShell from './components/EnterpriseShell';
import EmojiSanitizer from './components/EmojiSanitizer';
import './globals.css';
import './ui-enhancements.css';
import './approved-dashboard.css';
import './google-map.css';
import './command-center.css';
import './theme-mode.css';

export const metadata: Metadata = {
  title: 'منصة نطاق العمل | Work Scope Platform',
  description: 'منصة ثنائية اللغة للحضور الذكي والانتقالات والطوارئ والتشغيل المؤسسي',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark">
      <body>
        <LanguageProvider>
          <EmojiSanitizer />
          <EnterpriseShell>{children}</EnterpriseShell>
        </LanguageProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { LanguageProvider } from './components/LanguageProvider';
import './globals.css';
import './ui-enhancements.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'منصة نطاق العمل | Work Scope Platform',
  description: 'منصة ثنائية اللغة للحضور الذكي والانتقالات والطوارئ والتشغيل المؤسسي',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

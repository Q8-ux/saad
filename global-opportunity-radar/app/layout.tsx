import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Neon Lens Prompt | كاتب برومبتات عدسات الألعاب",
  description: "أداة عربية لبناء برومبتات احترافية لعدسات الألعاب التفاعلية ثلاثية الأبعاد في Easy Lens وLens Studio.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

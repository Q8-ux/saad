import type { Metadata } from "next";
import "./radar.css";

export const metadata: Metadata = {
  title: "راصد الطلبات | البحث ونمو الحسابات",
  description: "مساحة سعد الخاصة للبحث عن طلبات الخدمات وفهم اهتمامات الجمهور ونمو الحسابات.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

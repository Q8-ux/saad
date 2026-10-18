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
      <body className="antialiased">{children}</body>
    </html>
  );
}

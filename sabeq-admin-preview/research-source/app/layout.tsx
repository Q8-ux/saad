import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة تحكم مجموعة سابق القانونية",
  description: "نظام إداري خاص لإدارة مستخدمي وخدمات وبيانات مجموعة سابق القانونية.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/images/brand/sabeq-logo.png",
    shortcut: "/images/brand/sabeq-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

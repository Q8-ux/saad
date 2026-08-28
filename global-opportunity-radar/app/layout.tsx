import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Global Opportunity Radar",
  description:
    "Multilingual AI intelligence that converts global science and technology signals into commercial opportunities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

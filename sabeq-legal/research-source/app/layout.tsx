import type { Metadata } from "next";
import "./globals.css";
import "./interface-taste.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sabeq.legal"),
  title: "مجموعة سابق القانونية | Sabeq Legal Group",
  description:
    "مجموعة سابق القانونية — حلول قانونية متطورة، استشارات احترافية، ومذكرات قانونية مدعومة بمصادر التشريع الكويتي.",
  keywords: [
    "محامي الكويت",
    "استشارات قانونية",
    "مذكرات قانونية",
    "القانون الكويتي",
    "Sabeq Legal",
  ],
  icons: {
    icon: "/images/brand/sabeq-logo.png",
    shortcut: "/images/brand/sabeq-logo.png",
    apple: "/images/brand/sabeq-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body data-language="ar">{children}</body>
    </html>
  );
}

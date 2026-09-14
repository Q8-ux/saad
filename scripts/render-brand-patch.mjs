import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const original = source;

const oldMark = '<div className="brand-mark" aria-hidden="true">ق</div>';
const newMark = `<div className="brand-mark brand-vector-logo" aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false" role="img">
              <defs>
                <linearGradient id="brandBlue" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#54a4ff" />
                  <stop offset="0.55" stopColor="#2f72ef" />
                  <stop offset="1" stopColor="#1749b8" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#brandBlue)" />
              <path d="M20 14.5h19.5L47 22v19.5c0 4.7-3.8 8.5-8.5 8.5H20c-4.7 0-8.5-3.8-8.5-8.5V23c0-4.7 3.8-8.5 8.5-8.5Z" fill="white" fillOpacity=".97" />
              <path d="M39.5 14.5V22H47" fill="none" stroke="#bfd6ff" strokeWidth="3" strokeLinejoin="round" />
              <path d="M20.5 25h12M20.5 31h15M20.5 37h9" stroke="#2c6fe8" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M42 29.5c-4.9 0-8.8 2-8.8 2v6.7c0 6.2 4.3 9.5 8.8 11.8 4.5-2.3 8.8-5.6 8.8-11.8v-6.7s-3.9-2-8.8-2Z" fill="#0d2f6f" />
              <path d="M42 34.2v8.6M37.8 37.2h8.4M39.2 37.2l-2 4.1h4M44.8 37.2l-2 4.1h4" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>`;

if (source.includes(oldMark)) {
  source = source.replace(oldMark, newMark);
}

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Applied professional vector brand logo patch.");
} else {
  console.log("Brand logo patch already applied or source differs.");
}

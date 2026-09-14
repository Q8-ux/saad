import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const original = source;

if (!source.includes("function NavVectorIcon(")) {
  const anchor = "function roleCan(\n";
  if (!source.includes(anchor)) throw new Error("Vector navigation patch failed: roleCan anchor missing");
  const component = `function NavVectorIcon({ pageKey }: { pageKey: PageKey }) {\n  const common = { viewBox: \"0 0 24 24\", fill: \"none\", stroke: \"currentColor\", strokeWidth: 1.9, strokeLinecap: \"round\" as const, strokeLinejoin: \"round\" as const, focusable: false, \"aria-hidden\": true };\n  switch (pageKey) {\n    case \"dashboard\":\n      return <svg {...common}><path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5.5 9.5V21h13V9.5\"/><path d=\"M9.5 21v-6h5v6\"/></svg>;\n    case \"search\":\n      return <svg {...common}><circle cx=\"10.7\" cy=\"10.7\" r=\"6.7\"/><path d=\"m15.8 15.8 4.7 4.7\"/></svg>;\n    case \"library\":\n      return <svg {...common}><path d=\"M4.5 4.5h4v15h-4zM10 4.5h4v15h-4z\"/><path d=\"m15.8 5.2 3.4-1 4 14.3-3.4 1z\"/></svg>;\n    case \"clients\":\n      return <svg {...common}><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3.5 19c.5-3.4 2.4-5.2 5.5-5.2s5 1.8 5.5 5.2\"/><circle cx=\"17\" cy=\"9\" r=\"2.3\"/><path d=\"M15.5 14.4c3.1-.6 5 .8 5.5 3.6\"/></svg>;\n    case \"cases\":\n      return <svg {...common}><path d=\"M4 8h16v11H4z\"/><path d=\"M9 8V5h6v3M4 12h16M10 12v2h4v-2\"/></svg>;\n    case \"hearings\":\n      return <svg {...common}><rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M7 3v5M17 3v5M3.5 10h17\"/><path d=\"M8 14h2M14 14h2M8 17h2M14 17h2\"/></svg>;\n    case \"invoices\":\n      return <svg {...common}><path d=\"M6 3.5h10l2 2V21l-3-1.5L12 21l-3-1.5L6 21z\"/><path d=\"M9 9h6M9 13h6M9 17h4\"/></svg>;\n    case \"memos\":\n      return <svg {...common}><path d=\"M5 3.5h10l3 3V20.5H5z\"/><path d=\"M14.5 3.5v4h3.5M8.5 11h6M8.5 14.5h4\"/><path d=\"m15 17.8 3.8-3.8 1.2 1.2-3.8 3.8-1.7.5z\"/></svg>;\n    case \"whatsapp\":\n      return <svg {...common}><path d=\"M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 21l4.8-1.1A8.5 8.5 0 1 0 12 3.5Z\"/><path d=\"M9 8.3c.4 3.1 2.3 5 5.5 6.2l1.2-1.3c.3-.3.7-.4 1.1-.2l1 .5\"/></svg>;\n    case \"settings\":\n      return <svg {...common}><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z\"/></svg>;\n    case \"admin\":\n      return <svg {...common}><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 9h18M7 15h4\"/></svg>;\n    default:\n      return <svg {...common}><circle cx=\"12\" cy=\"12\" r=\"8\"/></svg>;\n  }\n}\n\n`;
  source = source.replace(anchor, component + anchor);
}

source = source.replace(
  '              <span className="nav-short">{item.short[language]}</span>\n              <span>{t(item.label)}</span>',
  '              <span className="nav-vector-icon" aria-hidden="true"><NavVectorIcon pageKey={item.key} /></span>\n              <span className="nav-text-label">{t(item.label)}</span>',
);

source = source.replace(
  '            <span>{item.short[language]}</span>\n            <small className="mobile-nav-label">{t(item.label).split(" ")[0]}</small>',
  '            <span className="mobile-nav-vector-icon" aria-hidden="true"><NavVectorIcon pageKey={item.key} /></span>\n            <span className="sr-only">{t(item.label)}</span>',
);

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Applied professional vector navigation icons and icon-only mobile navigation.");
} else {
  console.log("Vector navigation patch already applied.");
}

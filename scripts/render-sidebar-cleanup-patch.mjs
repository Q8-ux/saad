import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../app/legal-office-app.tsx", import.meta.url);
let source = await readFile(path, "utf8");
const original = source;

// Remove the database-document counter, office-role label, personal WhatsApp,
// sign-out and theme block from inside the slide-out sidebar. The sidebar must
// remain dedicated to navigation so it can scroll from top to bottom freely.
if (!source.includes('className="site-account-footer"')) {
  const sidebarStatusPattern = /\n\s*<div className="sidebar-status">[\s\S]*?<\/div>\n\s*<\/aside>/;
  if (!sidebarStatusPattern.test(source)) {
    throw new Error("Sidebar cleanup patch failed: sidebar-status block not found");
  }
  source = source.replace(sidebarStatusPattern, "\n      </aside>");

  const mainCloseAnchor = '        </div>\n      </main>\n\n      <nav className="mobile-nav"';
  if (!source.includes(mainCloseAnchor)) {
    throw new Error("Sidebar cleanup patch failed: main footer anchor not found");
  }

  const footer = [
    '        </div>',
    '',
    '        <footer className="site-account-footer" aria-label={t("حساب المستخدم")}>',
    '          <div className="site-account-footer-inner">',
    '            <div className="site-account-footer-user">',
    '              <span className="site-account-footer-avatar" aria-hidden="true">',
    '                <svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4.1 3.3-6.2 7.5-6.2s6.8 2.1 7.5 6.2"/></svg>',
    '              </span>',
    '              <strong>{session.user.displayName}</strong>',
    '            </div>',
    '',
    '            <div className="site-account-footer-actions">',
    '              <a',
    '                className="site-account-footer-whatsapp"',
    '                href={WHATSAPP_URL}',
    '                aria-label={`${t("تواصل عبر واتساب")}: saad.alnabhan`}',
    '              >',
    '                <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">',
    '                  <path d="M16 3.2a12.55 12.55 0 0 0-10.78 19l-1.48 6.59 6.75-1.39A12.55 12.55 0 1 0 16 3.2Zm0 22.79c-1.72 0-3.41-.45-4.89-1.3l-.4-.23-4 .82.88-3.86-.27-.4a10.3 10.3 0 1 1 8.68 4.97Zm5.65-7.72c-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.16-.69.16-.2.31-.79 1-.97 1.2-.18.2-.36.22-.67.07-1.83-.91-3.03-1.62-4.24-3.67-.32-.55.32-.51.92-1.7.1-.2.05-.38-.03-.54-.08-.16-.69-1.66-.95-2.27-.25-.6-.51-.51-.69-.52h-.59c-.2 0-.54.08-.82.38-.28.31-1.08 1.05-1.08 2.56 0 1.5 1.1 2.96 1.25 3.17.15.2 2.16 3.3 5.23 4.63.73.31 1.3.5 1.74.64.73.23 1.39.2 1.92.12.59-.09 1.82-.74 2.08-1.45.26-.7.26-1.31.18-1.44-.08-.13-.28-.2-.59-.36Z"/>',
    '                </svg>',
    '                <span dir="ltr">saad.alnabhan</span>',
    '              </a>',
    '',
    '              <button',
    '                type="button"',
    '                className="site-account-footer-theme"',
    '                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}',
    '                aria-label={t(theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن")}',
    '                title={t(theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن")}',
    '              >',
    '                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/><circle cx="12" cy="12" r="4.2"/></svg>',
    '              </button>',
    '',
    '              <a className="site-account-footer-signout" href={signOutPath}>{t("تسجيل الخروج")}</a>',
    '            </div>',
    '          </div>',
    '        </footer>',
    '      </main>',
    '',
    '      <nav className="mobile-nav"',
  ].join("\n");

  source = source.replace(mainCloseAnchor, footer);
}

if (source !== original) {
  await writeFile(path, source, "utf8");
  console.log("Removed sidebar status/account blocks and moved account controls to a clean site footer.");
} else {
  console.log("Sidebar cleanup patch already applied.");
}

export type EmailAction = {
  label: string;
  url: string;
};

export type EmailTemplateInput = {
  title: string;
  message: string;
  preheader?: string;
  action?: EmailAction;
  footer?: string;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildEmailHtml(input: EmailTemplateInput) {
  const brand = escapeHtml(process.env.EMAIL_BRAND_NAME?.trim() || 'منصة نطاق العمل');
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message).replace(/\r?\n/g, '<br>');
  const preheader = escapeHtml(input.preheader || input.title);
  const footer = escapeHtml(input.footer || 'هذه رسالة آلية. إذا لم تطلب هذا الإجراء فتجاهل الرسالة.');
  const action = input.action
    ? `<a href="${escapeHtml(input.action.url)}" style="display:inline-block;background:#1268d8;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;margin:18px 0">${escapeHtml(input.action.label)}</a>`
    : '';

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f2f5f9;color:#162033;font-family:Arial,Tahoma,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f9;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dfe6ef;border-radius:18px;overflow:hidden">
          <tr><td style="background:#092a49;color:#fff;padding:24px 30px;font-size:22px;font-weight:700">${brand}</td></tr>
          <tr><td style="padding:32px 30px;line-height:1.9">
            <h1 style="font-size:25px;margin:0 0 14px;color:#092a49">${title}</h1>
            <p style="font-size:17px;margin:0 0 8px">${message}</p>
            ${action}
            <p style="font-size:13px;color:#66758a;margin:22px 0 0">${footer}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function buildEmailText(input: EmailTemplateInput) {
  const parts = [input.title, '', input.message];
  if (input.action) parts.push('', `${input.action.label}: ${input.action.url}`);
  parts.push('', input.footer || 'هذه رسالة آلية. إذا لم تطلب هذا الإجراء فتجاهل الرسالة.');
  return parts.join('\n');
}

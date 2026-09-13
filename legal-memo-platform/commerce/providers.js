'use strict';
const crypto = require('node:crypto');
const { fail, constantEqual } = require('./settings');

// Explicit opt-in only. A key issued for another bank gateway is never sent here.
function createProviders(fetchImpl = fetch) {
  async function request(url, options) {
    let response;
    try { response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(25000) }); }
    catch (_) { fail(503, 'provider_unavailable', 'تعذر الاتصال بمزوّد الخدمة. أعد المحاولة بعد قليل.'); }
    let body;
    try { body = await response.json(); } catch (_) { fail(503, 'provider_unavailable', 'استجابة مزوّد الخدمة غير صالحة.'); }
    if (!response.ok) fail(503, 'provider_rejected', 'تعذر إتمام الطلب لدى مزوّد الخدمة.');
    return body;
  }
  async function bank(config, endpoint, body) {
    if (config.paymentProvider !== 'myfatoorah' || !config.paymentKey) fail(503, 'payment_not_configured', 'بوابة الدفع لم تُفعّل بعد.');
    const origin = config.environment === 'live' ? 'https://api.myfatoorah.com' : 'https://apitest.myfatoorah.com';
    const result = await request(origin + '/v2/' + endpoint, {
      method: 'POST', headers: { Authorization: 'Bearer ' + config.paymentKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (result.IsSuccess !== true || !result.Data) fail(503, 'provider_rejected', 'تعذر إتمام الطلب لدى بوابة الدفع.');
    return result.Data;
  }
  function safeCheckoutUrl(value) {
    let url;
    try { url = new URL(value); } catch (_) { fail(502, 'invalid_payment_url', 'رابط الدفع الوارد غير صالح.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(url.hostname === 'myfatoorah.com' || url.hostname.endsWith('.myfatoorah.com'))) fail(502, 'invalid_payment_url', 'تعذر اعتماد رابط بوابة الدفع.');
    return url.href;
  }
  function validateStatus(data, order) {
    const transactions = Array.isArray(data.InvoiceTransactions) ? data.InvoiceTransactions : [];
    const settled = transactions.find(t => ['Succss', 'Success'].includes(t.TransactionStatus) && ['KD', 'KWD'].includes(t.Currency));
    if (String(data.CustomerReference) !== order.id || (order.invoice_id && String(data.InvoiceId) !== order.invoice_id)
      || Math.round(Number(data.InvoiceValue) * 1000) !== order.amount_fils) fail(409, 'payment_mismatch', 'بيانات عملية الدفع لا تطابق الطلب؛ يلزم مراجعتها.');
    // An authorization is not a captured payment. A browser callback never sets this status.
    const status = data.InvoiceStatus === 'Paid' && settled ? 'paid' : data.InvoiceStatus === 'Canceled' ? 'canceled' : 'pending';
    return { status, invoiceId: String(data.InvoiceId), reference: settled ? String(settled.PaymentId || settled.TransactionId || '') : '' };
  }
  return {
    verifyWebhook(config, event, signature) {
      if (!config.webhookSecret || event?.Event?.Code !== 1 || event?.Event?.Name !== 'PAYMENT_STATUS_CHANGED') return false;
      const data = event.Data || {};
      const names = ['Invoice.Id', 'Invoice.Status', 'Transaction.Status', 'Transaction.PaymentId', 'Invoice.ExternalIdentifier'];
      const payload = names.map(name => {
        const [object, field] = name.split('.');
        const value = data[object]?.[field];
        if (value != null && !['string', 'number'].includes(typeof value)) return null;
        return name + '=' + (value ?? '');
      });
      if (payload.includes(null)) return false;
      const expected = crypto.createHmac('sha256', config.webhookSecret).update(payload.join(',')).digest('base64');
      return constantEqual(expected, signature || '');
    },
    async sendCode(config, challenge, code) {
      if (challenge.channel === 'email') {
        const result = await request('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + config.resendKey, 'Content-Type': 'application/json', 'Idempotency-Key': challenge.id },
          body: JSON.stringify({ from: 'مجموعة سابق القانونية <' + config.emailFrom + '>', to: [challenge.contact],
            subject: 'رمز التحقق — مجموعة سابق القانونية', text: 'رمز التحقق: ' + code + '\nصالح لمدة 5 دقائق. لا تشاركه مع أي شخص.\nإذا لم تطلب الرمز، تجاهل هذه الرسالة.' }),
        });
        if (!result.id) fail(503, 'delivery_failed', 'تعذر إرسال رمز التحقق.');
        return String(result.id);
      }
      const result = await request('https://verify.twilio.com/v2/Services/' + config.twilioService + '/Verifications', {
        method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(config.twilioSid + ':' + config.twilioToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: challenge.contact, Channel: challenge.channel, Locale: 'ar' }).toString(),
      });
      if (result.status !== 'pending' || !result.sid) fail(503, 'delivery_failed', 'تعذر إرسال رمز التحقق.');
      return result.sid;
    },
    async verifyCode(config, challenge, code) {
      try {
        const result = await request('https://verify.twilio.com/v2/Services/' + config.twilioService + '/VerificationCheck', {
          method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(config.twilioSid + ':' + config.twilioToken).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ VerificationSid: challenge.provider_id, Code: code }).toString(),
        });
        return result.status === 'approved' && result.sid === challenge.provider_id && result.to === challenge.contact;
      } catch (error) { if (error.code === 'provider_rejected') return false; throw error; }
    },
    async createPayment(config, order, user, returnUrl) {
      const body = { CustomerName: user.name, NotificationOption: 'LNK', InvoiceValue: order.amount_fils / 1000,
        DisplayCurrencyIso: 'KWD', CallBackUrl: returnUrl, ErrorUrl: returnUrl, Language: 'AR', CustomerReference: order.id,
        InvoiceItems: [{ ItemName: 'إعداد مذكرة قانونية', Quantity: 1, UnitPrice: order.amount_fils / 1000 }] };
      const result = await bank(config, 'SendPayment', body);
      if (!result.InvoiceId) fail(502, 'invalid_payment', 'تعذر إنشاء عملية الدفع.');
      return { invoiceId: String(result.InvoiceId), checkoutUrl: safeCheckoutUrl(result.InvoiceURL) };
    },
    async checkPayment(config, order) {
      const data = await bank(config, 'GetPaymentStatus', { Key: order.invoice_id || order.id, KeyType: order.invoice_id ? 'InvoiceId' : 'CustomerReference' });
      return validateStatus(data, order);
    },
    safeCheckoutUrl, validateStatus,
  };
}
module.exports = { createProviders };

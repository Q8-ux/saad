'use strict';
const crypto = require('node:crypto');

class CommerceError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => { throw new CommerceError(status, code, message); };
const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');
function constantEqual(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
const settingNames = {
  paymentProvider: 'SABEQ_PAYMENT_PROVIDER', environment: 'SABEQ_PAYMENT_ENVIRONMENT',
  paymentKey: 'SABEQ_PAYMENT_KEY', webhookSecret: 'SABEQ_WEBHOOK_SECRET',
  priceFils: 'SABEQ_MEMO_PRICE_FILS', enabledChannels: 'SABEQ_VERIFICATION_CHANNELS',
  resendKey: 'SABEQ_RESEND_KEY', emailFrom: 'SABEQ_EMAIL_FROM',
  twilioSid: 'SABEQ_TWILIO_ACCOUNT_SID', twilioToken: 'SABEQ_TWILIO_AUTH_TOKEN',
  twilioService: 'SABEQ_TWILIO_VERIFY_SERVICE',
};
const secrets = new Set(['paymentKey', 'webhookSecret', 'resendKey', 'twilioToken']);

function createSettings(db, env) {
  const key = Buffer.from(env.SABEQ_ENCRYPTION_KEY || '', 'base64');
  if (key.length !== 32) fail(503, 'encryption_not_configured', 'يلزم إعداد مفتاح حماية البيانات على الخادم.');
  function encrypt(text, purpose) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(purpose));
    const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(x => x.toString('base64')).join('.');
  }
  function decrypt(text, purpose) {
    const [iv, tag, data] = text.split('.').map(x => Buffer.from(x, 'base64'));
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
  }
  async function read(query = db) {
    const values = Object.fromEntries(Object.entries(settingNames).map(([name, envName]) => [name, env[envName] || '']));
    const stored = (await query.query("SELECT value FROM commerce_settings WHERE name = 'runtime'")).rows[0];
    if (stored) Object.assign(values, JSON.parse(decrypt(stored.value, 'settings')));
    values.priceFils = Number(values.priceFils || 0);
    values.environment ||= 'test';
    values.enabledChannels = String(values.enabledChannels || 'email').split(',').filter(x => ['email', 'sms', 'whatsapp'].includes(x));
    return values;
  }
  async function save(input, actorId) {
    const allowed = new Set(Object.keys(settingNames));
    for (const name of Object.keys(input)) if (!allowed.has(name)) fail(400, 'invalid_setting', 'إعداد غير معروف.');
    return db.transaction(async tx => {
      // Lock a stable row so simultaneous administrators cannot lose each other's changes.
      await tx.query("INSERT INTO commerce_settings(name, value, updated_at) VALUES ('settings_lock', '', 0) ON CONFLICT(name) DO NOTHING");
      await tx.query("SELECT name FROM commerce_settings WHERE name = 'settings_lock'" + tx.lock);
      const current = await read(tx);
      current.enabledChannels = current.enabledChannels.join(',');
      for (const [name, value] of Object.entries(input)) {
        if (typeof value !== 'string' && typeof value !== 'number') fail(400, 'invalid_setting', 'قيمة الإعداد غير صالحة.');
        if (String(value).length > 12000) fail(400, 'invalid_setting', 'قيمة الإعداد طويلة جداً.');
        if (secrets.has(name) && !String(value).trim()) continue; // Empty password input keeps the existing secret.
        current[name] = String(value).trim();
      }
      if (!['', 'myfatoorah'].includes(current.paymentProvider)) fail(400, 'unsupported_provider', 'يلزم ربط بوابة البنك وفق توثيقها قبل اختيارها.');
      if (!['test', 'live'].includes(current.environment)) fail(400, 'invalid_environment', 'بيئة الدفع غير صالحة.');
      if (!/^\d+$/.test(String(current.priceFils)) || Number(current.priceFils) > 10000000) fail(400, 'invalid_price', 'حدد السعر بالفلس كعدد صحيح موجب.');
      if (current.enabledChannels.split(',').some(x => !['email', 'sms', 'whatsapp'].includes(x))) fail(400, 'invalid_channel', 'قناة تحقق غير صالحة.');
      const old = await read(tx);
      if (old.paymentProvider !== current.paymentProvider || old.environment !== current.environment || (input.paymentKey && old.paymentKey !== input.paymentKey)) {
        const open = (await tx.query("SELECT id FROM commerce_orders WHERE payment_status IN ('creating','pending','unknown') LIMIT 1")).rows[0];
        if (open) fail(409, 'open_payments', 'توجد عمليات دفع غير محسومة؛ تحقق منها قبل تغيير بوابة الدفع أو مفتاحها.');
      }
      await tx.query("INSERT INTO commerce_settings(name,value,updated_at) VALUES ('runtime',$1,$2) ON CONFLICT(name) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", [encrypt(JSON.stringify(current), 'settings'), Date.now()]);
      await tx.query('INSERT INTO commerce_audit(id,actor_id,action,detail,created_at) VALUES ($1,$2,$3,$4,$5)', [crypto.randomUUID(), actorId, 'settings_updated', JSON.stringify({ fields: Object.keys(input) }), Date.now()]);
    });
  }
  function redact(values) {
    return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, secrets.has(name) ? Boolean(value) : value]));
  }
  return { read, save, redact, encrypt, decrypt, hmac: text => crypto.createHmac('sha256', key).update(text).digest('hex') };
}
function channels(config) {
  return config.enabledChannels.filter(channel => channel === 'email'
    ? Boolean(config.resendKey && /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(config.emailFrom))
    : Boolean(/^AC[\da-f]{32}$/i.test(config.twilioSid) && config.twilioToken && /^VA[\da-f]{32}$/i.test(config.twilioService)));
}
function normalizeContact(body, channel) {
  let contact = String(channel === 'email' ? body.email || '' : body.phone || '').trim();
  if (channel === 'email') {
    contact = contact.toLowerCase();
    if (contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) fail(400, 'invalid_contact', 'أدخل بريداً إلكترونياً صحيحاً.');
  } else {
    contact = contact.replace(/[\s()-]/g, '').replace(/^00/, '+');
    if (/^\d{8}$/.test(contact)) contact = '+965' + contact;
    if (!/^\+[1-9]\d{7,14}$/.test(contact)) fail(400, 'invalid_contact', 'أدخل رقم الهاتف مع مفتاح الدولة.');
  }
  return contact;
}
module.exports = { createSettings, CommerceError, fail, digest, constantEqual, channels, normalizeContact };

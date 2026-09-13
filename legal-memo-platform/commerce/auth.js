'use strict';
const crypto = require('node:crypto');
const { fail, digest, constantEqual, channels, normalizeContact } = require('./settings');

function createAuth({ db, settings, providers, env, now = Date.now }) {
  const adminEmails = String(env.SABEQ_ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  async function rate(key, max, period) {
    const timestamp = now(); const id = settings.hmac(key + ':' + Math.floor(timestamp / period));
    const row = (await db.query('INSERT INTO commerce_limits(id,hits,expires_at) VALUES ($1,1,$2) ON CONFLICT(id) DO UPDATE SET hits=commerce_limits.hits+1 RETURNING hits', [id, timestamp + period])).rows[0];
    if (row.hits > max) fail(429, 'rate_limited', 'محاولات كثيرة. انتظر قليلاً قبل إعادة المحاولة.');
  }
  async function userForSession(req) {
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!/^[a-f0-9]{64}$/.test(token)) fail(401, 'authentication_required', 'يرجى تأكيد حسابك للمتابعة.');
    const row = (await db.query('SELECT s.role,s.user_id,u.name FROM commerce_sessions s JOIN commerce_users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>$2', [digest(token), now()])).rows[0];
    if (!row) fail(401, 'authentication_required', 'انتهت الجلسة؛ أكد حسابك للمتابعة.');
    const identities = (await db.query('SELECT kind,contact FROM commerce_identities WHERE user_id=$1', [row.user_id])).rows;
    const email = identities.find(x => x.kind === 'email')?.contact || '';
    const phone = identities.find(x => x.kind === 'phone')?.contact || '';
    return { id: row.user_id, name: row.name, role: row.role, email, phone, emailVerified: Boolean(email), phoneVerified: Boolean(phone) };
  }
  async function issueSession(tx, userId, role) {
    const token = crypto.randomBytes(32).toString('hex');
    await tx.query('INSERT INTO commerce_sessions(token_hash,user_id,role,expires_at) VALUES ($1,$2,$3,$4)', [digest(token), userId, role, now() + (role === 'admin' ? 30 * 60 * 1000 : 12 * 60 * 60 * 1000)]);
    return token;
  }
  async function requestCode(body, ip) {
    await rate('send-ip:' + ip, 15, 60 * 60 * 1000);
    const config = await settings.read();
    const channel = String(body.channel || channels(config)[0] || 'email');
    if (!channels(config).includes(channel)) fail(503, 'verification_not_configured', 'خدمة التحقق لهذه القناة لم تُفعّل بعد.');
    const contact = normalizeContact(body, channel);
    const identity = (channel === 'email' ? 'email:' : 'phone:') + contact;
    const name = String(body.name || '').trim();
    if (name.length < 2 || name.length > 100) fail(400, 'invalid_name', 'أدخل اسماً من حرفين إلى 100 حرف.');
    await rate('send-contact:' + identity, 5, 60 * 60 * 1000);
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const challenge = { id: crypto.randomUUID(), identity, contact, channel, name };
    await db.transaction(async tx => {
      // Reuse the shared limits table as a per-identity mutex on PostgreSQL.
      const lockId = settings.hmac('identity:' + identity);
      await tx.query('INSERT INTO commerce_limits(id,hits,expires_at) VALUES ($1,0,$2) ON CONFLICT(id) DO NOTHING', [lockId, now() + 86400000]);
      await tx.query('SELECT id FROM commerce_limits WHERE id=$1' + tx.lock, [lockId]);
      const last = (await tx.query('SELECT created_at FROM commerce_challenges WHERE identity=$1 ORDER BY created_at DESC LIMIT 1', [identity])).rows[0];
      if (last && Number(last.created_at) > now() - 60000) fail(429, 'resend_cooldown', 'انتظر دقيقة قبل طلب رمز آخر.');
      await tx.query('UPDATE commerce_challenges SET used=1 WHERE identity=$1', [identity]);
      await tx.query('INSERT INTO commerce_challenges(id,identity,name,channel,contact,code_hash,created_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [challenge.id, identity, name, channel, contact, settings.hmac(challenge.id + ':' + code), now(), now() + 300000]);
    });
    try {
      const providerId = await providers.sendCode(config, challenge, code);
      await db.query('UPDATE commerce_challenges SET sent=1,provider_id=$1 WHERE id=$2', [providerId, challenge.id]);
    } catch (error) { await db.query('UPDATE commerce_challenges SET used=1 WHERE id=$1', [challenge.id]); throw error; }
    const masked = channel === 'email' ? contact.slice(0, 2) + '***@' + contact.split('@')[1] : '***' + contact.slice(-4);
    return { challengeId: challenge.id, channel, maskedContact: masked, expiresIn: 300, retryAfter: 60, message: 'أُرسل رمز التحقق إلى ' + masked };
  }
  async function verifyCode(body, ip) {
    await rate('verify-ip:' + ip, 40, 15 * 60 * 1000);
    const id = String(body.challengeId || ''); const code = String(body.code || '').trim();
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^\d{6}$/.test(code)) fail(400, 'invalid_code', 'رمز التحقق غير صالح.');
    const challenge = await db.transaction(async tx => {
      const row = (await tx.query('SELECT * FROM commerce_challenges WHERE id=$1' + tx.lock, [id])).rows[0];
      if (!row || row.used || !row.sent || Number(row.expires_at) <= now() || row.attempts >= 5) return null;
      await tx.query('UPDATE commerce_challenges SET attempts=attempts+1 WHERE id=$1', [id]);
      return row;
    });
    if (!challenge) fail(400, 'invalid_code', 'الرمز غير صالح أو انتهت صلاحيته. اطلب رمزاً آخر.');
    const valid = challenge.channel === 'email'
      ? constantEqual(challenge.code_hash, settings.hmac(id + ':' + code))
      : await providers.verifyCode(await settings.read(), challenge, code);
    if (!valid) fail(400, 'invalid_code', 'رمز التحقق غير صحيح.');
    const result = await db.transaction(async tx => {
      const claimed = await tx.query('UPDATE commerce_challenges SET used=1 WHERE id=$1 AND used=0 AND expires_at>$2 RETURNING id', [id, now()]);
      if (!claimed.rowCount) fail(400, 'invalid_code', 'تم استخدام الرمز أو انتهت صلاحيته.');
      let identity = (await tx.query('SELECT user_id FROM commerce_identities WHERE identity=$1', [challenge.identity])).rows[0];
      if (!identity) {
        identity = { user_id: crypto.randomUUID() };
        await tx.query('INSERT INTO commerce_users(id,name,created_at) VALUES ($1,$2,$3)', [identity.user_id, challenge.name, now()]);
        await tx.query('INSERT INTO commerce_identities(identity,user_id,kind,contact,verified_at) VALUES ($1,$2,$3,$4,$5)', [challenge.identity, identity.user_id, challenge.channel === 'email' ? 'email' : 'phone', challenge.contact, now()]);
      }
      const role = challenge.channel === 'email' && adminEmails.includes(challenge.contact) ? 'admin' : 'customer';
      return { token: await issueSession(tx, identity.user_id, role) };
    });
    result.user = await userForSession({ headers: { authorization: 'Bearer ' + result.token } });
    return result;
  }
  async function bootstrap(secret, ip) {
    await rate('admin-login:' + ip, 5, 15 * 60 * 1000);
    if (String(env.SABEQ_ADMIN_BOOTSTRAP_SECRET || '').length < 32 || !constantEqual(digest(secret), digest(env.SABEQ_ADMIN_BOOTSTRAP_SECRET))) fail(401, 'invalid_admin_login', 'بيانات دخول الإدارة غير صحيحة.');
    const token = await db.transaction(async tx => {
      await tx.query('INSERT INTO commerce_users(id,name,created_at) VALUES ($1,$2,$3) ON CONFLICT(id) DO NOTHING', ['system-administrator', 'إدارة مجموعة سابق القانونية', now()]);
      return issueSession(tx, 'system-administrator', 'admin');
    });
    return { token, user: await userForSession({ headers: { authorization: 'Bearer ' + token } }) };
  }
  return { rate, userForSession, requestCode, verifyCode, bootstrap,
    logout: req => db.query('DELETE FROM commerce_sessions WHERE token_hash=$1', [digest(String(req.headers.authorization || '').replace(/^Bearer /, ''))]) };
}
module.exports = { createAuth };

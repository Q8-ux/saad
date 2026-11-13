import { randomUUID } from 'node:crypto';
import { one } from './store.mjs';
import { createSession, emailField, hashPassword, isUuid, limit, matchesHash, publicAccount, requireThat,
  passwordField, sha, textField, token, verifyPassword } from './security.mjs';

export async function ownerExists(db) {
  return Boolean(await one(db, "SELECT id FROM accounts WHERE role='owner'"));
}

export async function createOwner(store, body, setupHash, ip) {
  await limit(store, `setup:${ip}`, 8);
  requireThat(setupHash, 403, 'تهيئة المالك غير متاحة.');
  const code = textField(body.code, 'رمز التهيئة', 140, 32);
  requireThat(matchesHash(code, setupHash), 403, 'رمز التهيئة غير صالح.');
  requireThat(!await ownerExists(store), 409, 'حساب المالك موجود.');
  const name = textField(body.name, 'الاسم', 100, 2);
  const email = emailField(body.email);
  const hash = await hashPassword(passwordField(body.password));
  return store.transaction(async db => {
    const account = await one(db, `INSERT INTO accounts (id, name, email, role, password_hash)
      VALUES ($1,$2,$3,'owner',$4) ON CONFLICT DO NOTHING RETURNING *`, [randomUUID(),name,email,hash]);
    requireThat(account, 409, 'حساب المالك موجود.');
    return { account: publicAccount(account), session: await createSession(db, account.id) };
  });
}

export async function login(store, body, ip) {
  const email = emailField(body.email);
  const password = textField(body.password, 'كلمة المرور', 128, 1);
  await limit(store, `signin-ip:${ip}`, 35);
  await limit(store, `signin-email:${email}`, 12);
  const account = await one(store, 'SELECT *, (access_until > now()) AS subscribed FROM accounts WHERE email=$1', [email]);
  const valid = await verifyPassword(body.password, account?.password_hash);
  requireThat(account?.enabled && valid && password, 401, 'تحقق من البريد الإلكتروني وكلمة المرور.');
  const result = await store.transaction(async db => {
    const latest = await one(db, 'SELECT *, (access_until > now()) AS subscribed FROM accounts WHERE id=$1 FOR UPDATE', [account.id]);
    requireThat(latest?.enabled && latest.password_hash === account.password_hash, 401, 'تحقق من بيانات الدخول.');
    return { account: publicAccount(latest), session: await createSession(db, latest.id) };
  });
  return result;
}

export async function acceptInvite(store, body, ip) {
  await limit(store, `invite:${ip}`, 18);
  const code = textField(body.code, 'رمز الدعوة', 43, 43);
  requireThat(/^[\w-]{43}$/.test(code), 400, 'رابط الدعوة غير صالح.');
  const invite = await one(store, 'SELECT account_id FROM invitations WHERE token_hash=$1 AND expires_at > now()', [sha(code)]);
  requireThat(invite, 400, 'انتهت الدعوة أو سبق استخدامها.');
  const hash = await hashPassword(passwordField(body.password));
  return store.transaction(async db => {
    const target = await one(db, "SELECT id, enabled FROM accounts WHERE id=$1 AND role='client' FOR UPDATE", [invite.account_id]);
    requireThat(target?.enabled, 403, 'الحساب غير متاح.');
    const claimed = await one(db, 'DELETE FROM invitations WHERE token_hash=$1 AND expires_at > now() RETURNING account_id', [sha(code)]);
    requireThat(claimed, 400, 'انتهت الدعوة أو سبق استخدامها.');
    const account = await one(db, 'UPDATE accounts SET password_hash=$2 WHERE id=$1 RETURNING *, (access_until > now()) AS subscribed',
      [target.id, hash]);
    await db.query('DELETE FROM sessions WHERE account_id=$1', [target.id]);
    return { account: publicAccount(account), session: await createSession(db, account.id) };
  });
}

async function invitation(db, accountId, origin) {
  const code = token();
  await db.query(`INSERT INTO invitations (account_id,token_hash,expires_at) VALUES ($1,$2,now() + interval '48 hours')
    ON CONFLICT (account_id) DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at`, [accountId,sha(code)]);
  return `${origin}/#invite=${code}`;
}

export async function createClient(store, body, origin) {
  const name = textField(body.name, 'اسم العميل', 100, 2);
  const email = emailField(body.email);
  return store.transaction(async db => {
    const account = await one(db, `INSERT INTO accounts (id,name,email,role) VALUES ($1,$2,$3,'client')
      ON CONFLICT (email) DO NOTHING RETURNING *`, [randomUUID(),name,email]);
    requireThat(account, 409, 'البريد الإلكتروني مستخدم.');
    return { account: publicAccount(account), invite: await invitation(db, account.id, origin) };
  });
}

async function clientLocked(db, id) {
  requireThat(isUuid(id), 404, 'حساب العميل غير موجود.');
  const row = await one(db, "SELECT *, (access_until > now()) AS subscribed FROM accounts WHERE id=$1 AND role='client' FOR UPDATE", [id]);
  requireThat(row, 404, 'حساب العميل غير موجود.');
  return row;
}

export async function issueInvite(store, id, origin) {
  return store.transaction(async db => {
    const account = await clientLocked(db, id);
    requireThat(account.enabled, 409, 'فعّل الحساب قبل إرسال دعوة.');
    return { invite: await invitation(db, id, origin) };
  });
}

export async function setClientState(store, id, enabled) {
  requireThat(typeof enabled === 'boolean', 400, 'حالة الحساب غير صالحة.');
  return store.transaction(async db => {
    await clientLocked(db, id);
    const account = await one(db, 'UPDATE accounts SET enabled=$2 WHERE id=$1 RETURNING *, (access_until > now()) AS subscribed',
      [id,enabled]);
    if (!enabled) {
      await db.query('DELETE FROM sessions WHERE account_id=$1', [id]);
      await db.query('DELETE FROM invitations WHERE account_id=$1', [id]);
    }
    return publicAccount(account);
  });
}

export async function listClients(store) {
  const accounts = await store.query(`SELECT id,name,email,role,enabled,access_until,created_at,
    (access_until > now()) AS subscribed, (password_hash IS NOT NULL) AS joined
    FROM accounts WHERE role='client' ORDER BY created_at DESC`);
  return accounts.rows.map(account => ({ ...publicAccount(account), joined: account.joined, createdAt: account.created_at }));
}

export function amountInFils(value) {
  requireThat(typeof value === 'string' && /^\d{1,5}(?:\.\d{1,3})?$/.test(value), 400, 'أدخل مبلغًا بالدينار حتى ثلاثة منازل عشرية.');
  const [whole, fraction = ''] = value.split('.');
  const fils = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  requireThat(fils > 0, 400, 'أدخل مبلغًا أكبر من صفر.');
  return fils;
}

export async function renew(store, clientId, ownerId, body) {
  const months = Number(body.months);
  requireThat(Number.isInteger(months) && months >= 1 && months <= 12, 400, 'مدة الاشتراك من شهر إلى 12 شهرًا.');
  const amount = amountInFils(body.amount);
  const ref = textField(body.reference, 'مرجع التحصيل', 120, 3).toUpperCase().normalize('NFKC');
  requireThat(body.received === true, 400, 'أكد استلام الدفعة قبل تمديد الاشتراك.');
  return store.transaction(async db => {
    const client = await clientLocked(db, clientId);
    requireThat(client.enabled, 409, 'فعّل الحساب قبل تجديد الاشتراك.');
    const recorded = await one(db, `INSERT INTO renewals (id,account_id,owner_id,months,amount_fils,payment_reference,access_until)
      VALUES ($1,$2,$3,$4,$5,$6,((GREATEST(COALESCE($7::timestamptz,now()),now()) AT TIME ZONE 'Asia/Kuwait')
        + make_interval(months => $4)) AT TIME ZONE 'Asia/Kuwait') ON CONFLICT (payment_reference) DO NOTHING
      RETURNING *`, [randomUUID(),clientId,ownerId,months,amount,ref,client.access_until]);
    if (!recorded) {
      const prior = await one(db, 'SELECT * FROM renewals WHERE payment_reference=$1', [ref]);
      requireThat(prior?.account_id === clientId && prior.months === months && prior.amount_fils === amount,
        409, 'مرجع التحصيل مسجل لدفعة مختلفة.');
      return { account: publicAccount(client), renewal: prior };
    }
    const updated = await one(db, 'UPDATE accounts SET access_until=$2 WHERE id=$1 RETURNING *, true AS subscribed',
      [clientId,recorded.access_until]);
    return { account: publicAccount(updated), renewal: recorded };
  });
}

export async function renewals(db, accountId, owner) {
  const rows = await db.query(`SELECT r.id, r.months, r.amount_fils, r.payment_reference, r.created_at, r.access_until,
    CASE WHEN $2::boolean THEN a.name ELSE NULL END AS client_name
    FROM renewals r JOIN accounts a ON a.id=r.account_id WHERE ($2 OR r.account_id=$1)
    ORDER BY r.created_at DESC LIMIT 100`, [accountId, owner]);
  return rows.rows;
}

import { Readable } from 'node:stream';
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSessionAccount, isUuid, publicAccount, requireThat, textField } from './security.mjs';
import { one } from './store.mjs';

export const attachmentPartSize = 4 * 1024 * 1024;
export const attachmentDownloadPath = /^\/api\/attachments\/([0-9a-f-]+)\/download$/iu;
export const attachmentPartPath = /^\/api\/attachments\/[0-9a-f-]+\/parts\/\d+$/iu;

export function attachmentStorage(env) {
  const bucket = env.TAHKEEM_ATTACHMENT_BUCKET;
  if (!bucket || !env.AWS_ENDPOINT_URL_S3 || !env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return null;
  const client = new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3, region: env.AWS_REGION, forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
  });
  return {
    async put(key, data) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: 'application/octet-stream' }),
        { abortSignal: AbortSignal.timeout(25000) });
    },
    async get(key, signal) {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }),
        { abortSignal: AbortSignal.any([signal, AbortSignal.timeout(25000)]) });
      return object.Body;
    },
    async remove(keys) {
      const { Errors } = await client.send(new DeleteObjectsCommand({ Bucket: bucket,
        Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true } }), { abortSignal: AbortSignal.timeout(25000) });
      if (Errors?.length) throw Error('Incomplete attachment removal');
    },
  };
}

const partKey = (id, index) => `memos/${id}/${index}`;
const size = item => Number(item.bytes);
const received = item => Number(item.uploaded_parts);
const count = item => Math.ceil(size(item) / attachmentPartSize);
const view = item => ({ id: item.id, name: item.name, bytes: size(item), partSize: attachmentPartSize,
  fingerprint: item.fingerprint, uploadedParts: received(item), status: item.status });

function requireStorage(storage) {
  requireThat(storage, 503, 'مساحة حفظ المرفقات غير متصلة حاليًا.');
}

async function attachment(db, accountId, id, locked = false) {
  requireThat(isUuid(id), 404, 'المرفق غير موجود.');
  const row = await one(db, `SELECT * FROM memo_attachments WHERE id=$1 AND account_id=$2${locked ? ' FOR UPDATE' : ''}`, [id, accountId]);
  requireThat(row, 404, 'المرفق غير موجود.');
  return row;
}

export async function listAttachments(db, accountId, memoId) {
  requireThat(isUuid(memoId), 400, 'معرّف المذكرة غير صالح.');
  const result = await db.query('SELECT * FROM memo_attachments WHERE account_id=$1 AND memo_id=$2 ORDER BY created_at,id',
    [accountId, memoId]);
  return result.rows.map(view);
}

export async function beginAttachment(db, storage, user, body) {
  requireStorage(storage);
  const { id, memoId, bytes, fingerprint } = body;
  requireThat(isUuid(id) && isUuid(memoId), 400, 'معرّف المرفق أو المذكرة غير صالح.');
  requireThat(Number.isSafeInteger(bytes) && bytes >= 0, 400, 'حجم الملف غير صالح.');
  requireThat(typeof fingerprint === 'string' && /^[a-f0-9]{64}$/.test(fingerprint), 400, 'تعذر قراءة الملف.');
  const name = textField(body.name, 'اسم المرفق', 255, 1);
  requireThat(!/[\\/\u0000-\u001f\u007f]/u.test(name) && name.isWellFormed(), 400, 'اسم المرفق غير صالح.');
  const memo = await one(db, 'SELECT account_id,status FROM memos WHERE id=$1', [memoId]);
  requireThat(!memo || memo.account_id === user.id, 404, 'المذكرة غير موجودة.');
  requireThat(memo?.status !== 'archived', 409, 'استعد المذكرة قبل إضافة مرفق.');
  await db.query(`INSERT INTO memo_attachments (id,account_id,memo_id,name,bytes,fingerprint,status)
    VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`, [id, user.id, memoId, name, bytes, fingerprint, bytes ? 'uploading' : 'ready']);
  const row = await attachment(db, user.id, id);
  requireThat(row.memo_id === memoId && row.name === name && size(row) === bytes && row.fingerprint === fingerprint && row.status !== 'deleting',
    409, 'بيانات المرفق تغيّرت. اختر الملف من جديد.');
  return view(row);
}

export async function savePart(db, storage, user, id, index, data) {
  requireStorage(storage);
  requireThat(Number.isSafeInteger(index) && index >= 0 && Buffer.isBuffer(data), 400, 'جزء الملف غير صالح.');
  return db.transaction(async tx => {
    const row = await attachment(tx, user.id, id, true);
    requireThat(row.status !== 'deleting', 409, 'المرفق قيد الإزالة.');
    if (index < received(row)) return view(row);
    requireThat(index === received(row) && index < count(row) &&
      data.length === Math.min(attachmentPartSize, size(row) - index * attachmentPartSize),
    409, 'ترتيب جزء الملف أو حجمه غير صالح.');
    await storage.put(partKey(id, index), data);
    const updated = await one(tx, `UPDATE memo_attachments SET uploaded_parts=uploaded_parts+1,
      status=$2 WHERE id=$1 RETURNING *`, [id, index + 1 === count(row) ? 'ready' : 'uploading']);
    return view(updated);
  });
}

export async function removeAttachment(db, storage, user, id) {
  requireStorage(storage);
  const row = await db.transaction(async tx => {
    const current = await attachment(tx, user.id, id, true);
    await tx.query("UPDATE memo_attachments SET status='deleting' WHERE id=$1", [id]);
    return current;
  });
  const total = Math.min(count(row), received(row) + 1);
  for (let start = 0; start < total; start += 250) {
    const keys = Array.from({ length: Math.min(250, total - start) }, (_, index) => partKey(id, start + index));
    await storage.remove(keys);
  }
  await db.query("DELETE FROM memo_attachments WHERE id=$1 AND account_id=$2 AND status='deleting'", [id, user.id]);
}

export async function downloadAttachment(db, storage, request, id) {
  const user = await getSessionAccount(db, request);
  requireThat(user, 401, 'سجّل الدخول للمتابعة.');
  requireThat(publicAccount(user).active, 403, 'الاشتراك غير نشط. تواصل مع مسؤول الحساب لتجديده.');
  requireStorage(storage);
  const row = await attachment(db, user.id, id);
  requireThat(row.status === 'ready', 404, 'المرفق غير متاح للتنزيل.');
  const file = encodeURIComponent(row.name).replace(/['()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
  const headers = {
    'Content-Type': 'application/octet-stream', 'Content-Length': String(size(row)), 'Cache-Control': 'private, no-store',
    'Content-Disposition': `attachment; filename="Tahkeem-${row.id}"; filename*=UTF-8''${file}`,
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow',
  };
  if (request.method === 'HEAD' || !size(row)) return { headers, stream: null };
  const cancellation = new AbortController();
  async function* parts() {
    try {
      for (let index = 0; index < count(row); index++) {
        const chunk = await storage.get(partKey(id, index), cancellation.signal);
        try { yield* chunk; }
        finally { chunk.destroy?.(); }
      }
    } finally { cancellation.abort(); }
  }
  const stream = Readable.from(parts(), { objectMode: false });
  stream.on('close', () => cancellation.abort());
  return { headers, stream };
}

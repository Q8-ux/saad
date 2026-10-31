import {normalizeVirtualTour} from '../public/virtual-tour-data.mjs';

const reject = (message, status) => { throw Object.assign(new Error(message), {status}); };

export async function savePropertyTour({query, actor, id, input, expectedUpdatedAt}) {
  if (actor?.role !== 'admin') reject('هذه العملية لإدارة المكتب فقط', 403);
  let tour;
  try { tour = normalizeVirtualTour(input); } catch (error) { reject(error.message, 400); }
  if (expectedUpdatedAt && !Number.isFinite(Date.parse(expectedUpdatedAt))) reject('تاريخ مراجعة العقار غير صالح', 400);
  const row = (await query('SELECT id,status FROM office_properties WHERE id=$1', [id])).rows[0];
  if (!row) reject('العقار غير موجود', 404);
  if (['completed', 'archived'].includes(row.status)) reject('العقار مغلق ولا يمكن تعديل جولته', 409);
  // The public ISO timestamp has millisecond precision; Postgres retains microseconds.
  const sql = "UPDATE office_properties SET data=CASE WHEN $2::jsonb IS NULL THEN data-'virtualTour' ELSE jsonb_set(data,'{virtualTour}',$2::jsonb) END,updated_at=now() WHERE id=$1 AND status NOT IN ('completed','archived') AND ($3::timestamptz IS NULL OR date_trunc('milliseconds',updated_at)=$3::timestamptz) RETURNING id,updated_at";
  const result = await query(sql, [id, tour ? JSON.stringify(tour) : null, expectedUpdatedAt || null]);
  if (!result.rows.length) reject('تغير العقار أثناء المراجعة؛ حدّث الصفحة ثم أعد المحاولة', 409);
  return {virtualTour: tour, updatedAt: new Date(result.rows[0].updated_at).toISOString()};
}

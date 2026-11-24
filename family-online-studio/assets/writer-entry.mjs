// A writing link may open only a project returned by the authenticated account.
export function resolveWriterEntry(href, projects, rememberedWork = null) {
  const params = new URL(href).searchParams;
  if (params.getAll('view').length !== 1 || params.get('view') !== 'writer') return {mode:'works',workId:null};
  const available = projects.filter(work => typeof work.id === 'string' && !work.archivedAt && !work.deletedAt);
  const requested = params.getAll('work');
  if (requested.length) {
    if (requested.length === 1 && available.some(work => work.id === requested[0])) return {mode:'writer',workId:requested[0]};
    return {mode:'choose',workId:null,error:'هذا العمل غير متاح في الحساب الحالي. اختر العمل الذي تريد الكتابة فيه.'};
  }
  if (available.some(work => work.id === rememberedWork)) return {mode:'writer',workId:rememberedWork};
  if (available.length === 1) return {mode:'writer',workId:available[0].id};
  return {mode:'choose',workId:null};
}

export function readWriterChoice(accountId, storage) {
  try { return (storage || globalThis.localStorage)?.getItem('fo-studio-last-writer:' + accountId) || null; }
  catch { return null; }
}
export function rememberWriterChoice(accountId, workId, storage) {
  try { (storage || globalThis.localStorage)?.setItem('fo-studio-last-writer:' + accountId, workId); }
  catch { /* Choosing a manuscript must still work when browser storage is blocked. */ }
}

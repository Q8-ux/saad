// The active engine retrieves curated witnesses. It does not certify a vision or predict events.
export function normalize(value = '') {
  return String(value).normalize('NFKC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().trim();
}

export function tokens(value) {
  return normalize(value).match(/[\p{L}\p{N}]+/gu) || [];
}

function variants(word) {
  const out = new Set([word]);
  if (/^[وفبكل]/.test(word) && word.length > 4) out.add(word.slice(1));
  for (const part of [...out]) {
    if (part.startsWith('ال') && part.length > 3) out.add(part.slice(2));
    if (part.startsWith('لل') && part.length > 3) out.add(part.slice(2));
  }
  return out;
}

export function containsTerm(text, term) {
  const words = tokens(text).map(variants);
  const parts = tokens(term);
  if (!parts.length) return false;
  for (let i = 0; i <= words.length - parts.length; i++) {
    if (parts.every((part, j) => words[i + j].has(part))) return true;
  }
  return false;
}

export function searchRows(rows, query, fields) {
  const terms = tokens(query);
  if (!terms.length) return rows;
  return rows.map(row => {
    const text = fields.map(f => Array.isArray(row[f]) ? row[f].join(' ') : row[f] || '').join(' ');
    const normalized = normalize(text);
    const count = terms.filter(term => normalized.includes(term)).length;
    return { row, score: count + (normalized.includes(normalize(query)) ? 2 : 0) };
  }).filter(item => item.score >= terms.length).sort((a, b) => b.score - a.score).map(item => item.row);
}

export function validateCorpus(corpus) {
  const errors = [];
  const ids = new Set();
  for (const s of corpus.sources || []) {
    if (ids.has(s.id)) errors.push(`Duplicate source ${s.id}`);
    ids.add(s.id);
    try { if (new URL(s.url).protocol !== 'https:') errors.push(`Unsafe URL ${s.id}`); }
    catch { errors.push(`Missing URL ${s.id}`); }
    if (!s.locator || !s.verification || !s.rights || !s.reviewed_at) errors.push(`Missing provenance ${s.id}`);
    if (s.scholar_reviewed !== false) errors.push(`Unsupported review claim ${s.id}`);
    if (['catalog_only', 'attribution_disputed'].includes(s.verification) && s.use === 'core') errors.push(`Unverified core ${s.id}`);
  }
  for (const key of ['rules', 'symbols']) {
    const ownIds = new Set();
    for (const row of corpus[key] || []) {
      if (ownIds.has(row.id)) errors.push(`Duplicate ${key} ${row.id}`);
      ownIds.add(row.id);
      if (!row.source_refs?.length) errors.push(`Unsourced ${row.id}`);
      for (const id of row.source_refs || []) if (!ids.has(id)) errors.push(`Broken reference ${row.id} -> ${id}`);
    }
  }
  return errors;
}

export function readDream(input, corpus) {
  const text = String(input.text || '').trim();
  if (tokens(text).length < 3) throw new Error('اكتب مشهداً قصيراً من ثلاث كلمات على الأقل؛ ويمكنك البحث عن كلمة واحدة في مكتبة الرموز.');
  const hasAny = words => words.some(word => containsTerm(text, word));
  const checks = {
    distress: input.feeling === 'afraid' || (input.feeling !== 'calm' && hasAny(['فزع', 'فزعا', 'مرعوب', 'كابوس', 'كوابيس', 'خايف', 'خائف'])),
    accusation: hasAny(['سحر', 'مسحور', 'ساحر', 'خيانة', 'خانني', 'حسد', 'حاسد']),
    prophecy: hasAny(['النبي', 'الرسول', 'رسول الله']),
    afterlife: hasAny(['جنة', 'جهنم', 'النار', 'ميت', 'توفي', 'مات', 'وفاة']),
    decision: hasAny(['اتزوج', 'زواج', 'طلاق', 'استخارة', 'استثمر', 'أسهم', 'شراء', 'ابيع', 'دواء', 'علاج', 'حمل']),
    recent: input.daytime === 'yes',
    repeated: input.repeated === 'yes',
  };
  const matched = corpus.symbols.filter(s => s.terms.some(term => containsTerm(text, term))).slice(0, 8);
  const evidence = checks.distress ? [] : matched;
  const notes = [
    {title: 'حدّ هذه القراءة', text: 'هذه قراءة أولية تربط الكلمات بشواهد محررة. لا تجزم بنوع المنام أو بصحة تأويله؛ ويبقى تنزيل المعنى على حالك عملاً يحتاج إلى علم وقرائن.', source_refs: ['h-bukhari-7046', 'h-muslim-2263']},
  ];
  if (checks.recent) notes.push({title: 'صلة واضحة بانشغال اليقظة', text: 'ذكرت صلة بما يشغلك نهاراً؛ لذلك يبقى حديث النفس احتمالاً ينبغي تقديمه في النظر، من غير الجزم بأنه سبب المنام.', source_refs: ['h-muslim-2263']});
  if (checks.repeated) notes.push({title: 'التكرار قرينة سياقية', text: 'تكرار المنام لا يثبت أنه سيتحقق، ولا يمنحه نسبة صدق. إذا كان يزعج نومك فاستعن بمن تثق به، وبمختص عند الحاجة.', source_refs: ['q-isra-36']});
  if (checks.accusation) notes.push({title: 'المنام لا يثبت اتهاماً', text: 'لا يثبت من هذه القصة أن شخصاً سحرك أو خانك أو حسدك. احتفظ بالتفريق بين صورة المنام وما يثبت في الواقع.', source_refs: ['q-hujurat-12', 'q-isra-36']});
  if (checks.prophecy) notes.push({title: 'هذه المسألة تحتاج إلى أهل العلم', text: 'ورد الحديث الصحيح في رؤية النبي ﷺ؛ والمنصة لا تؤكد هوية من ظهر في المنام ولا تصحح أمراً دينياً منسوباً إليه. اعرض الوصف على عالم موثوق عند الحاجة.', source_refs: ['h-bukhari-6994', 'f-no-ruling']});
  if (checks.afterlife) notes.push({title: 'لا خبر عن أجل أو مصير أخروي', text: 'لا نعيّن من المنام موعد وفاة أو حكم مصير إنسان في الآخرة؛ لا تُعامل الصورة كواقعة ستحدث.', source_refs: ['f-afterlife', 'q-naml-65']});
  if (checks.decision) notes.push({title: 'ابنِ قرارك على الواقع', text: 'المنام لا يحسم زواجاً أو طلاقاً أو صفقة أو تشخيصاً أو تغيير علاج. استند إلى المعلومات الواقعية والمشاورة المناسبة.', source_refs: ['f-istikhara', 'q-isra-36']});
  const nightmare = checks.distress ? {
    title: 'لنقدّم الطمأنينة وآداب المنام المكروه',
    text: 'ذكرت فزعاً أو ضيقاً؛ لذلك نوقف إسقاط الرموز على أحداث قادمة، ونعرض التوجيه الوارد في السنة.',
    steps: ['استعذ بالله من الشيطان ومن شر ما رأيت.', 'انفث عن يسارك ثلاثاً.', 'تحوّل عن الجنب الذي كنت عليه.', 'لا تنشر المنام المكروه؛ وورد القيام للصلاة.'],
    source_refs: ['h-muslim-2262', 'h-muslim-2263', 'h-bukhari-6985'],
  } : null;
  const questions = [...new Set(evidence.flatMap(s => s.questions))].slice(0, 3);
  if (!questions.length && !nightmare) questions.push('ما صلة هذا المشهد بحياتك أو بما شاهدته في اليوم السابق؟', 'أي تفاصيل تتذكرها بوضوح، وأيها غير متأكد منه؟');
  const source_refs = [...new Set([...notes.flatMap(n => n.source_refs), ...evidence.flatMap(s => s.source_refs), ...(nightmare?.source_refs || [])])];
  const sourceMap = new Map(corpus.sources.map(s => [s.id, s]));
  if (source_refs.some(id => !sourceMap.has(id) || sourceMap.get(id).use === 'excluded')) throw new Error('تعذر إسناد القراءة إلى المراجع المعتمدة.');
  return {
    schema_version: 1, created_at: new Date().toISOString(), mode: 'curated-local',
    title: nightmare ? 'آداب المنام المكروه' : 'قراءة أولية موثقة',
    input: {text, feeling: input.feeling || 'unsure', daytime: input.daytime || 'unsure', repeated: input.repeated || 'unsure'},
    checks, notes, evidence, nightmare, questions, source_refs,
    conclusion: checks.distress ? 'لا حاجة إلى البحث عن نذير مخيف في المنام.' : !evidence.length ? 'لا تتوافر في النواة الحالية شواهد خاصة كافية لتعيين معنى منامك. عدم كفاية الدليل نتيجة مفيدة، ويمكن عرض القصة على معبّر مؤهل.' : 'الشواهد المذكورة تتيح المقارنة فقط؛ لا تثبت تحقق معنى بعينه في حياتك. أحسن الظن بالله، ووازن أي قرار بمعطيات الواقع.',
  };
}

export function readingText(result, corpus) {
  const map = new Map(corpus.sources.map(s => [s.id, s]));
  const lines = ['رؤيا | ' + result.title, new Date(result.created_at).toLocaleString('ar-KW', {timeZone: 'Asia/Kuwait'}), '', 'النص الذي أدخلته:', result.input.text, ''];
  if (result.nightmare) lines.push(result.nightmare.title, ...result.nightmare.steps.map((s, i) => `${i + 1}. ${s}`), '');
  for (const n of result.notes) lines.push(n.title, n.text, '');
  for (const s of result.evidence) lines.push(s.name, 'الشاهد: ' + s.evidence, 'حدود المقارنة: ' + s.possibility, '');
  lines.push('أسئلة تساعد على التثبت:', ...result.questions, '', result.conclusion, '', 'المراجع:');
  for (const id of result.source_refs) {const s = map.get(id); if (s) lines.push(`${s.title} — ${s.locator}\n${s.url}`);}
  lines.push('', 'النصوص الثابتة لا تمنح التطبيق عصمة. لم تحصل هذه القراءة على مراجعة معبّر أو إجازة شرعية.');
  return lines.join('\n');
}

export function validateDraft(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('الملف ليس JSON صحيحاً. استخدم قالب المصدر.'); }
  const rows = Array.isArray(value) ? value : [value];
  if (!rows.length || rows.length > 200) throw new Error('يجب أن يحوي الملف من مادة واحدة إلى 200 مادة في الدفعة.');
  return rows.map((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`المادة ${i + 1} غير صالحة.`);
    for (const field of ['title', 'locator', 'summary', 'url']) if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error(`أكمل ${field} في المادة ${i + 1}.`);
    const url = new URL(row.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('روابط المواد يجب أن تكون HTTPS عامة دون بيانات دخول.');
    return {title: row.title.slice(0, 300), locator: row.locator.slice(0, 500), summary: row.summary.slice(0, 8000), url: url.href, status: 'draft-unreviewed', imported_at: new Date().toISOString()};
  });
}

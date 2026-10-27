// Deterministic, source-grounded scene reading. It neither certifies a vision
// nor predicts events, and it must be able to abstain when context is missing.
export function normalize(value = '') {
  return String(value).normalize('NFKC')
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase().trim();
}

export function tokens(value) {
  return normalize(value).match(/[\p{L}\p{N}]+/gu) || [];
}

function variants(word) {
  const out = new Set([word]);
  // Conservative clitic handling: bare فـ/كـ are intentionally not peeled,
  // because ordinary nouns such as «فنار» and «كباب» would become symbols.
  if (/^[وب]/.test(word) && word.length > 3) out.add(word.slice(1));
  if (/^و[بل]/.test(word) && word.length > 4) out.add(word.slice(2));
  if (/^فال/.test(word) && word.length > 5) out.add(word.slice(1));
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

function wordMatches(word, term, verbal = false) {
  const normalizedTerm = normalize(term);
  for (const candidate of variants(word)) {
    if (candidate === normalizedTerm) return true;
    if (normalizedTerm.length >= 3 && candidate.startsWith(normalizedTerm)) {
      const suffix = candidate.slice(normalizedTerm.length);
      if (/^(?:ا|ه|ها|هم|هن|ي|ني|ك|كم|نا|ت|تني|ته|وا|ون|ين)?$/.test(suffix)) return true;
    }
    if (verbal && normalizedTerm.length >= 3) {
      const forms = /^س/.test(candidate) && candidate.length > 4 ? [candidate.slice(1)] : [];
      for (const form of forms) if (form === normalizedTerm) return true;
      for (const form of [candidate, ...forms]) {
        if (!/^[يتنا]/.test(form)) continue;
        const withoutPrefix = form.slice(1);
        if (withoutPrefix === normalizedTerm) return true;
        if (withoutPrefix.startsWith(normalizedTerm)) {
          const suffix = withoutPrefix.slice(normalizedTerm.length);
          // Do not reduce reflexive forms such as «تفتحت» to the transitive verb «فتح».
          if (/^(?:ه|ها|هم|هن|ي|ك|كم|نا|وا|ون|ين)?$/.test(suffix)) return true;
        }
      }
    }
  }
  return false;
}

function locateTerms(words, terms, verbal = false) {
  const found = [];
  for (const term of terms || []) {
    const parts = tokens(term);
    if (!parts.length) continue;
    for (let i = 0; i <= words.length - parts.length; i++) {
      if (parts.every((part, offset) => wordMatches(words[i + offset], part, verbal && offset === 0))) {
        found.push({term, index: i, word: words[i], length: parts.length});
      }
    }
  }
  return found;
}

function hasFlexibleTerm(text, term, verbal = false) {
  return locateTerms(tokens(text), [term], verbal).length > 0;
}

export function searchRows(rows, query, fields) {
  const terms = tokens(query);
  if (!terms.length) return rows;
  return rows.map(row => {
    const text = fields.map(field => Array.isArray(row[field]) ? row[field].join(' ') : row[field] || '').join(' ');
    const normalized = normalize(text);
    const count = terms.filter(term => normalized.includes(term)).length;
    return {row, score: count + (normalized.includes(normalize(query)) ? 2 : 0)};
  }).filter(item => item.score >= terms.length)
    .sort((a, b) => b.score - a.score).map(item => item.row);
}

function uniqueIds(rows, key, errors) {
  const ids = new Set();
  for (const row of rows || []) {
    if (!row?.id) errors.push(`Missing id in ${key}`);
    else if (ids.has(row.id)) errors.push(`Duplicate ${key} ${row.id}`);
    else ids.add(row.id);
  }
  return ids;
}

function inferenceReadySource(source) {
  return Boolean(source && source.use !== 'excluded' && ['text_checked', 'excerpt_checked'].includes(source.verification));
}

export function validateCorpus(corpus) {
  const errors = [];
  if (corpus.schema_version !== 2) errors.push('Unsupported corpus schema');
  for (const key of ['sources', 'rules', 'symbols', 'historical_mentions', 'works', 'passages', 'scene_patterns', 'interpretive_claims']) {
    if (!Array.isArray(corpus[key])) errors.push(`Missing collection ${key}`);
  }
  if (!corpus.visual_library || !Array.isArray(corpus.visual_library.cards) || !Array.isArray(corpus.visual_library.sources)) errors.push('Missing visual library');
  const sourceIds = uniqueIds(corpus.sources, 'source', errors);
  const sourceMap = new Map((corpus.sources || []).map(source => [source.id, source]));
  for (const source of corpus.sources || []) {
    try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password) errors.push(`Unsafe URL ${source.id}`); }
    catch { errors.push(`Missing URL ${source.id}`); }
    if (!source.locator || !source.verification || !source.rights || !source.reuse_mode || !source.reviewed_at) errors.push(`Missing provenance ${source.id}`);
    if (source.scholar_reviewed !== false) errors.push(`Unsupported review claim ${source.id}`);
    if (['catalog_only', 'attribution_disputed'].includes(source.verification) && source.use === 'core') errors.push(`Unverified core ${source.id}`);
  }
  for (const key of ['rules', 'symbols']) {
    uniqueIds(corpus[key], key, errors);
    for (const row of corpus[key] || []) {
      if (!row.source_refs?.length) errors.push(`Unsourced ${row.id}`);
      for (const id of row.source_refs || []) {
        if (!sourceIds.has(id)) errors.push(`Broken reference ${row.id} -> ${id}`);
        else if (key === 'symbols' && !inferenceReadySource(sourceMap.get(id))) errors.push(`Ineligible symbol source ${row.id} -> ${id}`);
      }
      if (key === 'symbols' && (!Array.isArray(row.terms) || !row.terms.length || !Array.isArray(row.questions) || !row.questions.length)) errors.push(`Incomplete symbol ${row.id}`);
      if (key === 'rules' && !['textual', 'inference', 'product_policy'].includes(row.basis)) errors.push(`Invalid rule basis ${row.id}`);
    }
  }
  const workIds = uniqueIds(corpus.works, 'work', errors);
  const workMap = new Map((corpus.works || []).map(work => [work.id, work]));
  for (const work of corpus.works || []) {
    if (!work.source_refs?.length) errors.push(`Unsourced work ${work.id}`);
    let usableWitnesses = 0;
    for (const id of work.source_refs || []) {
      const source = sourceMap.get(id);
      if (!source) errors.push(`Broken reference ${work.id} -> ${id}`);
      else if (inferenceReadySource(source)) usableWitnesses++;
    }
    if (work.active_for_inference && usableWitnesses === 0) errors.push(`No usable witness for ${work.id}`);
    if (work.active_for_inference && /disputed|quarantined/.test(work.attribution_status || '')) errors.push(`Disputed active work ${work.id}`);
  }
  uniqueIds(corpus.passages, 'passage', errors);
  for (const passage of corpus.passages || []) {
    if (!workIds.has(passage.work_ref)) errors.push(`Broken work reference ${passage.id}`);
    const source = sourceMap.get(passage.source_ref);
    if (!source) errors.push(`Broken source reference ${passage.id}`);
    else if (!inferenceReadySource(source)) errors.push(`Excluded passage source ${passage.id}`);
    if (workMap.has(passage.work_ref) && !workMap.get(passage.work_ref).active_for_inference) errors.push(`Inactive passage work ${passage.id}`);
    if (!passage.summary || passage.quote_status !== 'editorial_paraphrase') errors.push(`Unreviewed passage ${passage.id}`);
  }
  const passageSourceIds = new Set((corpus.passages || []).map(passage => passage.source_ref));
  const patternIds = uniqueIds(corpus.scene_patterns, 'pattern', errors);
  for (const pattern of corpus.scene_patterns || []) {
    if (!pattern.concept_terms?.length || !Array.isArray(pattern.action_terms) || !Array.isArray(pattern.support_terms) || !Array.isArray(pattern.contra_terms) || !pattern.question) errors.push(`Incomplete pattern ${pattern.id}`);
    if (pattern.required_support_count != null && (!Number.isInteger(pattern.required_support_count) || pattern.required_support_count < 0)) errors.push(`Invalid support count ${pattern.id}`);
  }
  uniqueIds(corpus.interpretive_claims, 'claim', errors);
  for (const claim of corpus.interpretive_claims || []) {
    if (!patternIds.has(claim.pattern_ref)) errors.push(`Broken pattern reference ${claim.id}`);
    if (!claim.source_refs?.length || !claim.safe_wording || !claim.claim_level || !Array.isArray(claim.supports) || !Array.isArray(claim.against) || !Array.isArray(claim.forbidden_outputs) || !claim.forbidden_outputs.length) errors.push(`Incomplete claim ${claim.id}`);
    if (!['canonical_example', 'heritage_report'].includes(claim.claim_level)) errors.push(`Invalid claim level ${claim.id}`);
    if (!['verified_text', 'attributed_heritage_text'].includes(claim.source_reliability)) errors.push(`Invalid source reliability ${claim.id}`);
    if (!['low', 'limited', 'very_low'].includes(claim.transferability)) errors.push(`Invalid transferability ${claim.id}`);
    if (claim.scholar_reviewed !== false) errors.push(`Unsupported review claim ${claim.id}`);
    for (const id of claim.source_refs || []) {
      const source = sourceMap.get(id);
      if (!source) errors.push(`Broken reference ${claim.id} -> ${id}`);
      else if (!inferenceReadySource(source)) errors.push(`Excluded source used by ${claim.id}`);
    }
    if (claim.claim_level === 'heritage_report') {
      if (!(claim.source_refs || []).some(id => passageSourceIds.has(id))) errors.push(`Unlinked heritage claim ${claim.id}`);
      for (const id of claim.source_refs || []) {
        if (sourceMap.get(id)?.category === 'heritage' && !passageSourceIds.has(id)) errors.push(`Unlinked heritage source ${claim.id} -> ${id}`);
      }
    }
  }
  uniqueIds(corpus.historical_mentions, 'historical mention', errors);
  for (const mention of corpus.historical_mentions || []) if (!sourceIds.has(mention.source_ref) || mention.use !== 'excluded') errors.push(`Invalid historical mention ${mention.id}`);
  if (corpus.visual_library) {
    if (corpus.visual_library.expected_count !== corpus.visual_library.cards?.length) errors.push('Visual library count mismatch');
    for (const card of corpus.visual_library.cards || []) {
      if (card.review_status !== 'editorial-map-checked' || card.scholar_reviewed !== false) errors.push(`Ambiguous visual review ${card.id}`);
      for (const id of card.source_refs || []) if (!sourceIds.has(id)) errors.push(`Broken visual reference ${card.id} -> ${id}`);
    }
    for (const source of corpus.visual_library.sources || []) {
      if (!sourceIds.has(source.id)) errors.push(`Unknown visual source ${source.id}`);
      if (source.review_status !== 'source-reference-checked' || source.scholar_reviewed !== false) errors.push(`Ambiguous visual review ${source.id}`);
    }
  }
  return errors;
}

const NEGATIONS = new Set(['لم', 'لن', 'لا', 'ما', 'ليس', 'لست', 'ليست', 'غير', 'بلا', 'بدون', 'دون']);
const SELF_CUES = new Set(['انا', 'اني', 'انني', 'بنفسي', 'لي', 'يدي']);
const OTHER_CUES = new Set(['هو', 'هي', 'اخي', 'اختي', 'ابي', 'امي', 'زوجي', 'زوجتي', 'صديقي', 'صديقتي', 'رجل', 'امراه', 'شخص', 'طفل', 'ابني', 'ابنتي', 'طلاب', 'طلابا', 'ناس', 'اشخاص', 'رجال', 'نساء', 'اطفال']);
const NON_ACTUAL_CUES = new Set(['اريد', 'اردت', 'نويت', 'حاولت', 'اتمني', 'تمنيت', 'قال', 'قالت', 'طلب', 'طلبت', 'امر', 'امرت', 'ينبغي']);

function hasCue(set, word) {
  if (set.has(word)) return true;
  return /^[وف]/.test(word) && set.has(word.slice(1));
}

function isNegated(words, index) {
  return words.slice(Math.max(0, index - 8), index).some((word, offset, before) => {
    if (!hasCue(NEGATIONS, word)) return false;
    const distance = before.length - offset;
    const cue = /^[وف]/.test(word) && NEGATIONS.has(word.slice(1)) ? word.slice(1) : word;
    // Nominal negators qualify the immediately following word or short phrase;
    // verbal negators may govern a longer verb phrase.
    return ['غير', 'بلا', 'بدون', 'دون'].includes(cue) ? distance <= 1
      : ['ليس', 'لست', 'ليست'].includes(cue) ? distance <= 3
        : true;
  });
}

function isQualityNegated(words, index) {
  const before = words.slice(Math.max(0, index - 3), index);
  const direct = before.at(-1);
  if (direct && hasCue(new Set(['غير', 'ليس', 'لست', 'ليست', 'لا']), direct)) return true;
  if (before.slice(-2).some(word => hasCue(new Set(['لم', 'لن', 'لا', 'ما']), word))) return true;
  const phrase = before.join(' ');
  return /(?:^|\s)(?:لم|ما)\s+(?:يكن|اكن|كان|كانت)$/.test(phrase);
}

function isNonActual(words, index, actionWord) {
  const before = words.slice(Math.max(0, index - 6), index);
  if (before.some(word => hasCue(NON_ACTUAL_CUES, word))) return true;
  if (/^س[اتين]/.test(normalize(actionWord))) return true;
  return normalize(actionWord) === 'اشرب' && !before.slice(-4).some(word => hasCue(SELF_CUES, word));
}

function subjectAt(words, index, actionWord) {
  const before = words.slice(Math.max(0, index - 7), index);
  const after = words.slice(index + 1, index + 4);
  let selfAt = -1; let otherAt = -1;
  before.forEach((word, i) => { if (hasCue(SELF_CUES, word)) selfAt = i; if (hasCue(OTHER_CUES, word)) otherAt = i; });
  if (after.some(word => hasCue(OTHER_CUES, word))) return 'other';
  if (otherAt > selfAt) return 'other';
  if (selfAt >= 0) return 'self';
  if (/ون$/.test(actionWord)) return 'other';
  if (/ت$/.test(actionWord) || /^ا/.test(actionWord)) return 'self';
  return 'unspecified';
}

function splitScenes(text) {
  return String(text).split(/[\n.!؟؛،,]+|\s+ثم\s+|\s+وبعد(?:ها| ذلك)?\s+|\s+(?:بل|لكن|ولكن|غير ان|غير أن)\s+/u).map(value => value.trim()).filter(Boolean);
}

function nearestConcept(action, concepts) {
  return concepts.map(concept => ({concept, distance: Math.abs(concept.index - action.index), follows: concept.index >= action.index ? 0 : 1}))
    .filter(item => item.distance <= 2)
    .sort((a, b) => a.distance - b.distance || a.follows - b.follows || a.concept.index - b.concept.index)[0]?.concept || null;
}

export function extractScenes(text, corpus) {
  return splitScenes(text).map((sceneText, index) => {
    const words = tokens(sceneText);
    const concepts = []; const actions = []; const qualities = []; const negatedActions = []; const subjects = [];
    for (const pattern of corpus.scene_patterns || []) {
      for (const hit of locateTerms(words, pattern.concept_terms)) concepts.push({pattern_ref: pattern.id, term: hit.term, word: hit.word, index: hit.index});
      for (const hit of locateTerms(words, pattern.action_terms, true)) {
        const negated = isNegated(words, hit.index); const subject = subjectAt(words, hit.index, hit.word);
        const item = {pattern_ref: pattern.id, term: hit.term, word: hit.word, index: hit.index, subject, negated, non_actual: isNonActual(words, hit.index, hit.word)};
        actions.push(item); subjects.push(subject); if (negated) negatedActions.push(item);
      }
      for (const hit of locateTerms(words, pattern.support_terms)) {
        const negated = isQualityNegated(words, hit.index);
        qualities.push({pattern_ref: pattern.id, term: negated ? `نفي ${hit.term}` : hit.term, index: hit.index, polarity: negated ? 'contra' : 'support'});
      }
      for (const hit of locateTerms(words, pattern.contra_terms, true)) {
        if (!isNegated(words, hit.index)) qualities.push({pattern_ref: pattern.id, term: hit.term, index: hit.index, polarity: 'contra'});
      }
    }
    const relations = [];
    const seenActions = new Set();
    for (const action of actions.filter(item => !item.negated && !item.non_actual)) {
      const key = `${action.index}:${action.word}`; if (seenActions.has(key)) continue; seenActions.add(key);
      const target = nearestConcept(action, concepts);
      if (target) relations.push({subject: action.subject, action: action.word, object: target.word});
    }
    return {
      id: `scene-${index + 1}`, text: sceneText,
      subject: subjects.includes('self') ? 'self' : subjects.includes('other') ? 'other' : 'unspecified',
      actions: [...new Set(actions.filter(item => !item.negated && !item.non_actual).map(item => item.word))],
      negated_actions: [...new Set(negatedActions.map(item => item.word))],
      concepts: [...new Set(concepts.map(item => item.term))], objects: [...new Set(relations.map(item => item.object))], relations,
      qualities: [...new Set(qualities.map(item => item.term))],
      _conceptHits: concepts, _actionHits: actions, _qualityHits: qualities,
    };
  });
}

function requiredSupportCount(pattern, claim) {
  if (Number.isInteger(pattern.required_support_count)) return pattern.required_support_count;
  if (claim.claim_level === 'canonical_example') return 1;
  if (pattern.id === 'pattern-open-with-key') return 1;
  return 0;
}

function evaluatePattern(pattern, claim, scene) {
  const conceptHits = scene._conceptHits.filter(hit => hit.pattern_ref === pattern.id);
  if (!conceptHits.length) return null;
  const actions = scene._actionHits.filter(hit => hit.pattern_ref === pattern.id).filter(action => {
    if (pattern.concept_role === 'instrument') return conceptHits.some(concept => Math.abs(concept.index - action.index) <= 4 && /^ب/.test(concept.word));
    return nearestConcept(action, scene._conceptHits)?.pattern_ref === pattern.id;
  });
  const positiveActions = actions.filter(hit => !hit.negated && !hit.non_actual);
  const selfActions = positiveActions.filter(hit => hit.subject === 'self');
  const relatedQuality = hit => conceptHits.some(concept => Math.abs(concept.index - hit.index) <= 5);
  const supportHits = scene._qualityHits.filter(hit => hit.pattern_ref === pattern.id && hit.polarity === 'support' && relatedQuality(hit));
  const contraHits = scene._qualityHits.filter(hit => hit.pattern_ref === pattern.id && hit.polarity === 'contra' && relatedQuality(hit));
  let reason = '';
  if (contraHits.length) reason = `غيّرت القرينة «${contraHits[0].term}» هذا الوجه، لذلك لم نطبّقه.`;
  else if (pattern.require_action && !actions.length) reason = 'ظهر الرمز دون الفعل المطلوب في موضع المصدر.';
  else if (pattern.require_action && !positiveActions.length) reason = actions.some(hit => hit.negated) ? 'الفعل منفي في وصفك، والمنفي لا يُعامل كفعل وقع.' : 'ورد الفعل كرغبة أو أمر لا كحدث وقع، لذلك لم نطبّق الوجه.';
  else if (pattern.require_self && !selfActions.length) reason = actions.some(hit => hit.subject === 'other') ? 'الفعل منسوب إلى شخص آخر، لا إلى الرائي.' : 'لم يتضح أن الرائي هو من قام بالفعل.';
  else if (supportHits.length < requiredSupportCount(pattern, claim)) reason = 'ينقص وصفٌ مغير لازم قبل نقل هذا الوجه إلى المشهد.';
  const supports = [];
  if (positiveActions.length) supports.push(`الفعل: ${positiveActions[0].word}`);
  supports.push(...supportHits.map(hit => `القرينة: ${hit.term}`));
  if (!pattern.require_action && !contraHits.length) supports.unshift(`المشهد: ${conceptHits[0].word}`);
  return {
    matched: !reason, reason, supports: [...new Set(supports)],
    weakens: [...new Set(contraHits.map(hit => `قرينة مغيرة: ${hit.term}`))],
    context_coverage: supportHits.length >= Math.max(1, requiredSupportCount(pattern, claim)) ? 'described' : pattern.support_terms.length ? 'partial' : 'minimal',
  };
}

function publicScene(scene) {
  const {id, text, subject, actions, negated_actions, concepts, objects, relations, qualities} = scene;
  return {id, text, subject, actions, negated_actions, concepts, objects, relations, qualities};
}

function reliabilityLabel(value) {
  return value === 'verified_text' ? 'نص ثابت في موضعه' : 'نقل تراثي من موضع محرر';
}

function fitLabel(claim) {
  if (claim.claim_level === 'canonical_example') return 'استئناس محدود؛ الواقعة الأصلية خاصة';
  if (claim.transferability === 'very_low') return 'صلة ضعيفة شديدة الاحتياط';
  return 'صلة مشهدية مشروطة';
}

function buildChecks(input, text) {
  const words = tokens(text);
  const hasAny = terms => terms.some(term => hasFlexibleTerm(text, term, true));
  const hasUnnegatedAny = terms => terms.some(term => locateTerms(words, [term], true).some(hit => !isNegated(words, hit.index)));
  return {
    distress: input.feeling === 'afraid' || hasUnnegatedAny(['فزع', 'فزعا', 'مرعوب', 'مذعور', 'كابوس', 'كوابيس', 'خايف', 'خائف', 'خفت', 'خوف', 'رعب', 'منزعج', 'ضيق']),
    accusation: hasAny(['سحر', 'مسحور', 'ساحر', 'خيانة', 'خانني', 'حسد', 'حاسد']),
    prophecy: hasAny(['النبي', 'الرسول', 'رسول الله', 'محمد صلى الله عليه وسلم', 'محمد رسول الله']),
    afterlife: hasAny(['جنة', 'جهنم', 'ميت', 'توفي', 'مات', 'موت', 'اموت', 'وفاة', 'جنازة', 'قبر', 'مقبرة', 'دفن']),
    decision: hasAny(['اتزوج', 'تزوج', 'زواج', 'طلاق', 'اطلق', 'استخارة', 'استثمر', 'أسهم', 'شراء', 'اشتري', 'ابيع', 'وظيفة', 'اقبل الوظيفة', 'اترك الوظيفة', 'قرض', 'اقترض', 'دواء', 'علاج', 'انا حامل', 'حامل بطفل', 'حامل بجنين', 'حمل جنين', 'ولادة', 'استقيل', 'استقالة']),
    self_harm: hasAny(['انتحار', 'انتحر', 'اقتل نفسي', 'ساقتل نفسي', 'سوف اقتل نفسي', 'قتل نفسي', 'اوذي نفسي', 'ساوذي نفسي', 'إيذاء نفسي', 'اذي نفسي', 'اذبح نفسي', 'احرق نفسي', 'اجرح نفسي', 'جرح نفسي', 'اضرب نفسي', 'ارمي نفسي', 'القي بنفسي', 'اقضي على نفسي', 'انهي حياتي', 'انهاء حياتي', 'اتخلص من حياتي', 'اريد الموت', 'لا اريد ان اعيش']),
    recent: input.daytime === 'yes', repeated: input.repeated === 'yes',
  };
}

export function interpretDream(input, corpus) {
  const corpusErrors = validateCorpus(corpus);
  if (corpusErrors.length) throw new Error('قاعدة المصادر غير مترابطة؛ أُوقفت القراءة حتى تُراجع المادة.');
  const text = String(input.text || '').trim();
  if (text.length > 4000) throw new Error('اختصر وصف المنام إلى ٤٠٠٠ حرف أو أقل، واحتفظ بالتفاصيل الأوضح.');
  if (tokens(text).length < 3) throw new Error('اكتب مشهداً قصيراً من ثلاث كلمات على الأقل؛ ويمكنك البحث عن كلمة واحدة في مكتبة الرموز.');
  const checks = buildChecks(input, text);
  const policyStop = checks.self_harm || checks.accusation || checks.prophecy || checks.afterlife || checks.decision;
  const scenes = extractScenes(text, corpus);
  const patternMap = new Map(corpus.scene_patterns.map(pattern => [pattern.id, pattern]));
  const readings = []; const abstentions = [];
  for (const claim of [...corpus.interpretive_claims].sort((a, b) => b.priority - a.priority)) {
    const pattern = patternMap.get(claim.pattern_ref);
    for (const scene of scenes) {
      const evaluation = evaluatePattern(pattern, claim, scene);
      if (!evaluation) continue;
      if (evaluation.matched && !checks.distress && !checks.self_harm) {
        readings.push({
          id: claim.id, pattern_ref: pattern.id, pattern_label: pattern.label, scene_ref: scene.id,
          title: claim.title, summary: claim.safe_wording, safe_wording: claim.safe_wording,
          claim_level: claim.claim_level, source_reliability: claim.source_reliability,
          source_reliability_label: reliabilityLabel(claim.source_reliability),
          application_fit: claim.transferability, application_fit_label: fitLabel(claim),
          context_coverage: evaluation.context_coverage,
          context_coverage_label: evaluation.context_coverage === 'described' ? 'القرينة المغيّرة مذكورة' : evaluation.context_coverage === 'partial' ? 'السياق جزئي' : 'السياق محدود',
          supports: evaluation.supports,
          weakens: checks.recent ? ['ذكرت صلةً بانشغال اليقظة؛ حديث النفس بديل معتبر.'] : [],
          against: claim.against, limits: claim.against,
          source_refs: claim.source_refs, question: pattern.question,
        });
      } else if (!evaluation.matched) {
        abstentions.push({pattern_ref: pattern.id, scene_ref: scene.id, title: `لم نطبّق وجه «${pattern.label}»`, reason: evaluation.reason, question: pattern.question, source_refs: ['f-binbaz-no-knowledge']});
      }
    }
  }
  const active = readings.filter((reading, index, all) => all.findIndex(other => other.id === reading.id && other.scene_ref === reading.scene_ref) === index).slice(0, 4).map((reading, index) => ({rank: index + 1, ...reading}));
  const stopped = abstentions.filter((item, index, all) => all.findIndex(other => other.pattern_ref === item.pattern_ref && other.scene_ref === item.scene_ref && other.reason === item.reason) === index).slice(0, 5);
  const notes = [{title: 'حدّ هذه القراءة', text: 'هذه قراءة محتملة تربط مشهداً محدداً بموضع محرر. ثبوت المصدر لا يثبت انطباقه على حلم جديد، وقد يصيب المعبّر ويخطئ.', source_refs: ['h-bukhari-7046', 'h-muslim-2263']}];
  if (checks.self_harm) notes.unshift({title: 'السلامة أولاً', text: 'إذا كان هذا الوصف يعكس نيةً أو خطراً حالياً عليك، ابتعد عن وسائل الأذى وتواصل الآن مع خدمات الطوارئ المحلية أو شخص موثوق قريب منك. المنصة لن تفسّر هذه العبارة رمزياً.', source_refs: ['q-isra-36']});
  if (checks.recent) notes.push({title: 'حديث النفس بديل معتبر', text: 'ذكرت صلة بما يشغلك نهاراً؛ لذلك نقدّم احتمال حديث النفس ولا نحوله إلى تنبؤ.', source_refs: ['h-muslim-2263']});
  if (checks.repeated) notes.push({title: 'التكرار لا يصنع يقيناً', text: 'تكرار المنام لا يثبت تحققه ولا يمنحه نسبة صدق. إذا أزعج نومك فاطلب دعماً مناسباً.', source_refs: ['q-isra-36']});
  if (checks.accusation) notes.push({title: 'المنام لا يثبت اتهاماً', text: 'لا يثبت المنام أن شخصاً سحرك أو خانك أو حسدك، ولا يجوز تعيين متهم من صورة منامية.', source_refs: ['q-hujurat-12', 'q-isra-36']});
  if (checks.prophecy) notes.push({title: 'هذه المسألة تحتاج إلى أهل العلم', text: 'المنصة لا تؤكد هوية من ظهر في المنام ولا تصحح أمراً دينياً منسوباً إليه.', source_refs: ['h-bukhari-6994', 'f-no-ruling']});
  if (checks.afterlife) notes.push({title: 'لا خبر عن أجل أو مصير أخروي', text: 'لا نعيّن من المنام موعد وفاة أو مصير إنسان، ولا نعامل الصورة كواقعة ستحدث.', source_refs: ['f-afterlife', 'q-naml-65']});
  if (checks.decision) notes.push({title: 'ابنِ قرارك على الواقع', text: 'المنام لا يحسم زواجاً أو طلاقاً أو صفقة أو تشخيصاً أو تغيير علاج.', source_refs: ['f-istikhara', 'f-binbaz-act']});
  const nightmare = checks.distress ? {
    title: 'لنقدّم الطمأنينة وآداب المنام المكروه', text: 'ذكرت فزعاً أو ضيقاً؛ لذلك نوقف القراءة الرمزية ونقدّم التوجيه الوارد في السنة.',
    steps: ['استعذ بالله من الشيطان ومن شر ما رأيت.', 'انفث عن يسارك ثلاثاً.', 'تحوّل عن الجنب الذي كنت عليه.', 'لا تنشر المنام المكروه؛ وورد القيام للصلاة.'],
    source_refs: ['h-muslim-2262', 'h-muslim-2263', 'h-bukhari-6985'],
  } : null;
  const finalReadings = (checks.distress || policyStop) ? [] : active;
  const alternatives = [];
  if (checks.recent) alternatives.push({title: 'حديث النفس', summary: 'قد يعيد النوم ترتيب ما شغلك في اليقظة؛ وهذا بديل يسبق إسقاط معنى رمزي.', source_refs: ['h-muslim-2263']});
  if (finalReadings.some(reading => reading.claim_level === 'canonical_example')) alternatives.push({title: 'تشابه صورة لا حكم', summary: 'ورود الصورة في رؤيا ثابتة لا يجعل كل حلم بالصورة نفسها يحمل التأويل ذاته.', source_refs: ['h-bukhari-7046']});
  if (!finalReadings.length && !nightmare && !policyStop) alternatives.push({title: 'لا قراءة خاصة كافية', summary: 'قد يكون المشهد من حديث النفس أو مما لم تُفهرس مادته بعد؛ الامتناع هنا أدق من التخمين.', source_refs: ['h-muslim-2263', 'f-binbaz-no-knowledge']});
  const questions = policyStop ? [] : [...new Set([...finalReadings.filter(reading => reading.context_coverage !== 'described').map(reading => reading.question), ...stopped.map(item => item.question)])].slice(0, 3);
  if (!questions.length && !finalReadings.length && !nightmare && !policyStop) questions.push('ما صلة هذا المشهد بحياتك أو بما شاهدته في اليوم السابق؟', 'ما الفعل والصفة والنتيجة التي تتذكرها بوضوح؟');
  const evidence = (checks.distress || policyStop) ? [] : corpus.symbols.filter(symbol => finalReadings.some(reading => symbol.terms.some(term => patternMap.get(reading.pattern_ref).concept_terms.some(concept => normalize(term) === normalize(concept)))));
  const sourceRefs = [...new Set([...notes.flatMap(note => note.source_refs), ...finalReadings.flatMap(reading => reading.source_refs), ...stopped.flatMap(item => item.source_refs), ...alternatives.flatMap(item => item.source_refs), ...evidence.flatMap(item => item.source_refs || []), ...(nightmare?.source_refs || [])])];
  const sourceMap = new Map(corpus.sources.map(source => [source.id, source]));
  if (sourceRefs.some(id => !inferenceReadySource(sourceMap.get(id)))) throw new Error('تعذر إسناد القراءة إلى المراجع المعتمدة.');
  let mode = finalReadings.length ? 'interpretation' : stopped.length ? 'insufficient_context' : 'no_supported_reading';
  if (checks.distress) mode = 'nightmare_etiquette';
  if (policyStop && !checks.distress) mode = 'safety_abstention';
  if (checks.self_harm) mode = 'safety_abstention';
  const title = mode === 'interpretation' ? 'قراءة مشهدية محتملة' : mode === 'nightmare_etiquette' ? 'آداب المنام المكروه' : mode === 'safety_abstention' ? 'توقّف من أجل السلامة' : 'امتناع مُسند عن التخمين';
  const sourceRoles = new Map();
  const addRole = (refs, role) => { for (const id of refs || []) sourceRoles.set(id, [...new Set([...(sourceRoles.get(id) || []), role])]); };
  for (const note of notes) addRole(note.source_refs, 'حدود القراءة وضابط الخطأ');
  for (const reading of finalReadings) addRole(reading.source_refs, 'سند الوجه المحتمل');
  for (const item of stopped) addRole(item.source_refs, 'ضابط الامتناع عند نقص السياق');
  for (const item of alternatives) addRole(item.source_refs, 'سند احتمال بديل');
  for (const item of evidence) addRole(item.source_refs, 'شاهد موضوعي للمقارنة');
  addRole(nightmare?.source_refs, 'أدب المنام المكروه');
  const sourceTrace = sourceRefs.map(id => { const source = sourceMap.get(id); return {id, title: source.title, locator: source.locator, url: source.url, role: (sourceRoles.get(id) || ['مرجع للنتيجة']).join('؛ '), verification: source.verification, use: source.use}; });
  const feelingLabel = {calm: 'هادئ أو مطمئن', afraid: 'فزع أو ضيق', unsure: 'غير محدد'}[input.feeling || 'unsure'];
  const conclusion = mode === 'interpretation' ? 'هذه أوجه محتملة ظهرت بعد تحقق شروط المشهد داخل النواة، لا وعود ولا أخبار غيبية. افصل دائماً بين قوة المصدر وصحة تنزيله على حالك.'
    : mode === 'nightmare_etiquette' ? 'لا حاجة إلى البحث عن نذير مخيف في المنام.'
      : mode === 'safety_abstention' ? checks.self_harm ? 'لن نحوّل عبارة سلامة إلى رمز؛ العناية الفورية بالواقع مقدّمة.' : 'لن نحوّل المنام إلى اتهام أو حكم غيبي أو قرار صحي أو مالي أو زواجي؛ الواقع وأهله المختصون مقدّمون.'
        : 'لم تكتمل في النواة الحالية قرائن تكفي لوجه مسؤول. عدم كفاية الدليل نتيجة مفيدة.';
  return {
    schema_version: 2, created_at: new Date().toISOString(), mode, title,
    input: {text, feeling: input.feeling || 'unsure', daytime: input.daytime || 'unsure', repeated: input.repeated || 'unsure'},
    checks,
    understanding: {
      scenes: scenes.map(publicScene), observed_elements: [...new Set(scenes.flatMap(scene => scene.concepts))],
      context_signals: [checks.recent ? 'صلة باليقظة' : '', checks.repeated ? 'متكرر' : '', `الشعور: ${feelingLabel}`].filter(Boolean),
      missing_slots: [...new Set(stopped.map(item => item.reason))].slice(0, 4),
    },
    readings: finalReadings, alternatives, abstentions: (checks.distress || checks.self_harm) ? [] : stopped,
    notes, evidence, nightmare, questions, source_refs: sourceRefs, source_trace: sourceTrace, conclusion,
  };
}

export const readDream = interpretDream;

export function readingText(result, corpus) {
  const sourceMap = new Map(corpus.sources.map(source => [source.id, source]));
  const lines = ['رؤيا | ' + result.title, new Date(result.created_at).toLocaleString('ar-KW', {timeZone: 'Asia/Kuwait'}), '', 'النص الذي أدخلته:', result.input.text, ''];
  if (result.nightmare) lines.push(result.nightmare.title, ...result.nightmare.steps.map((step, index) => `${index + 1}. ${step}`), '');
  for (const note of result.notes || []) lines.push(note.title, note.text, '');
  if (result.schema_version === 1) {
    for (const witness of result.evidence || []) lines.push(witness.name, 'الشاهد: ' + witness.evidence, 'حدود المقارنة: ' + witness.possibility, '');
  } else {
    if (result.understanding?.scenes?.length) lines.push('فهم المشهد:', ...result.understanding.scenes.map(scene => `- ${scene.text}`), '');
    for (const reading of result.readings || []) lines.push(`الوجه ${reading.rank}: ${reading.title}`, reading.summary, `قوة المصدر: ${reading.source_reliability_label}`, `ملاءمة المشهد: ${reading.application_fit_label}`, `اكتمال السياق: ${reading.context_coverage_label}`, ...reading.supports.map(item => `يدعم: ${item}`), ...reading.weakens.map(item => `يضعف: ${item}`), '');
    for (const item of result.abstentions || []) lines.push(item.title, item.reason, '');
    for (const alternative of result.alternatives || []) lines.push(`بديل معتبر: ${alternative.title}`, alternative.summary, '');
  }
  if (result.questions?.length) lines.push('أسئلة تساعد على التثبت:', ...result.questions, '');
  lines.push(result.conclusion, '', 'المراجع:');
  for (const id of result.source_refs || []) { const source = sourceMap.get(id); if (source) lines.push(`${source.title} — ${source.locator}\n${source.url}`); }
  lines.push('', 'قوة المصدر لا تعني صحة تنزيله على حلمك. لم تحصل هذه القراءة على مراجعة معبّر أو إجازة شرعية.');
  return lines.join('\n');
}

export function validateDraft(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('الملف ليس JSON صحيحاً. استخدم قالب المصدر.'); }
  const rows = Array.isArray(value) ? value : [value];
  if (!rows.length || rows.length > 200) throw new Error('يجب أن يحوي الملف من مادة واحدة إلى 200 مادة في الدفعة.');
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`المادة ${index + 1} غير صالحة.`);
    for (const field of ['title', 'locator', 'summary', 'url']) if (typeof row[field] !== 'string' || !row[field].trim()) throw new Error(`أكمل ${field} في المادة ${index + 1}.`);
    const url = new URL(row.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('روابط المواد يجب أن تكون HTTPS عامة دون بيانات دخول.');
    return {title: row.title.slice(0, 300), locator: row.locator.slice(0, 500), summary: row.summary.slice(0, 8000), url: url.href, status: 'draft-unreviewed', imported_at: new Date().toISOString()};
  });
}

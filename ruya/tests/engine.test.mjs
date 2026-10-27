import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsTerm,extractScenes,normalize,readDream,readingText,searchRows,validateCorpus,validateDraft} from '../engine.mjs';

const corpus=JSON.parse(readFileSync(new URL('../corpus.json',import.meta.url),'utf8'));
const read=(text,extra={})=>readDream({text,feeling:'calm',...extra},corpus);

test('v2 corpus resolves every active reference and quarantines disputed attribution',()=>{
  assert.equal(corpus.schema_version,2);
  assert.deepEqual(validateCorpus(corpus),[]);
  const altered=structuredClone(corpus);
  altered.sources.find(source=>source.id==='b-ibnsirin').use='core';
  assert.ok(validateCorpus(altered).some(error=>error.includes('Unverified core')));
  const claimAltered=structuredClone(corpus);
  claimAltered.interpretive_claims[0].source_refs=['b-ibnsirin'];
  assert.ok(validateCorpus(claimAltered).some(error=>error.includes('Excluded source used')));
  const catalogClaim=structuredClone(corpus);
  catalogClaim.interpretive_claims[0].source_refs=['w-nli-ibnqutayba'];
  assert.ok(validateCorpus(catalogClaim).some(error=>error.includes('Excluded source used')));
  assert.throws(()=>readDream({text:'رأيت أني أشرب اللبن عند معلمي',feeling:'calm'},catalogClaim),/قاعدة المصادر/);
  const symbolAltered=structuredClone(corpus);
  symbolAltered.symbols.find(symbol=>symbol.id==='s-milk').source_refs=['b-ibnsirin'];
  assert.ok(validateCorpus(symbolAltered).some(error=>error.includes('Ineligible symbol source')));
  const unlinkedHeritage=structuredClone(corpus);
  unlinkedHeritage.interpretive_claims.find(claim=>claim.id==='claim-rain-mercy').source_refs=['p-nabulsi-rain','b-nabulsi'];
  assert.ok(validateCorpus(unlinkedHeritage).some(error=>error.includes('Unlinked heritage source')));
});

test('Arabic normalization matches whole lexical units without matching unrelated pieces',()=>{
  assert.equal(normalize('الرُّؤْيَا'),'الرويا');
  assert.ok(containsTerm('شربتُ اللَّبَنَ ثم خرجت','لبن'));
  assert.ok(containsTerm('ورأيت القميص في الدار','قميص'));
  assert.equal(containsTerm('كتبت كلمات ثم استيقظت','مات'),false);
  assert.equal(containsTerm('شربت ماء في صحن','لبن'),false);
});

test('scene extraction keeps subject, action, object, quality and negation separate',()=>{
  const scenes=extractScenes('رأيت أني لم أشرب اللبن عند معلمي ثم فتح أخي الباب',corpus);
  assert.equal(scenes.length,2);
  assert.ok(scenes[0].concepts.includes('لبن'));
  assert.ok(scenes[0].negated_actions.includes('اشرب'));
  assert.ok(scenes[0].qualities.includes('معلم'));
  assert.equal(scenes[1].subject,'other');
  const relation=extractScenes('رأيت أني شربت ماء صافيا',corpus)[0].relations.find(item=>item.action.includes('شرب'));
  assert.equal(relation?.object,'ماء');
});

test('drinking milk with a learning cue retrieves the canonical example with two independent scales',()=>{
  const result=read('رأيت أني أشرب اللبن عند معلمي');
  assert.equal(result.schema_version,2);
  assert.equal(result.mode,'interpretation');
  const reading=result.readings.find(item=>item.id==='claim-milk-knowledge');
  assert.ok(reading);
  assert.equal(reading.source_reliability,'verified_text');
  assert.equal(reading.application_fit,'low');
  assert.notEqual(reading.source_reliability_label,reading.application_fit_label);
  assert.ok(reading.source_refs.includes('h-bukhari-7006'));
  assert.equal(result.probability,undefined);
});

test('seeing milk without drinking asks instead of copying the drinking interpretation',()=>{
  const result=read('رأيت اللبن على الطاولة عند معلمي');
  assert.equal(result.readings.some(item=>item.id==='claim-milk-knowledge'),false);
  assert.equal(result.mode,'insufficient_context');
  assert.ok(result.abstentions.some(item=>item.reason.includes('دون الفعل')));
});

test('pouring, negating, and another person drinking milk each suppress the canonical claim',()=>{
  const cases=[
    ['رأيت أني سكبت اللبن عند معلمي','غيّرت القرينة'],
    ['رأيت أني لم أشرب اللبن عند معلمي','الفعل منفي'],
    ['رأيت أخي يشرب اللبن عند معلمه','شخص آخر'],
  ];
  for(const [text,reason] of cases){
    const result=read(text);
    assert.equal(result.readings.some(item=>item.id==='claim-milk-knowledge'),false,text);
    assert.ok(result.abstentions.some(item=>item.reason.includes(reason)),text);
  }
});

test('attached and scoped negation remain negative and do not leak across contrast clauses',()=>{
  for(const text of ['رأيت اللبن ولم أشربه عند معلمي','لم أكن أريد أبدا أن أشرب اللبن عند معلمي']){
    const result=read(text);
    assert.equal(result.readings.some(item=>item.id==='claim-milk-knowledge'),false,text);
    assert.ok(result.abstentions.some(item=>/منفي|رغبة/.test(item.reason)),text);
  }
  const mixed=read('لم أشرب اللبن عند معلمي بل شربت ماء صافيا');
  assert.equal(mixed.readings.some(item=>item.id==='claim-milk-knowledge'),false);
  assert.ok(mixed.readings.some(item=>item.id==='claim-water-life'));
});

test('VSO and plural Arabic actors are not silently reassigned to the dreamer',()=>{
  for(const text of ['شربت أختي اللبن في درس علم','فتحت أمي الباب بمفتاح','أنا رأيت طلابا يشربون اللبن في درس علم']){
    const result=read(text);
    assert.equal(result.readings.some(item=>['claim-milk-knowledge','claim-key-opening','claim-door-opening'].includes(item.id)),false,text);
  }
});

test('actions bind to their nearest object instead of every symbol in a clause',()=>{
  const result=read('شربت ماء صافيا ورأيت اللبن عند معلمي');
  assert.ok(result.readings.some(item=>item.id==='claim-water-life'));
  assert.equal(result.readings.some(item=>item.id==='claim-milk-knowledge'),false);
  const openedWindow=read('فتحت النافذة وبجواري باب واسع ومفتاح');
  assert.equal(openedWindow.readings.some(item=>['claim-key-opening','claim-door-opening'].includes(item.id)),false);
  const flower=read('تفتحت زهرة قرب باب ومفتاح');
  assert.equal(flower.readings.some(item=>['claim-key-opening','claim-door-opening'].includes(item.id)),false);
  assert.equal(read('فتحت محل كباب واسع').readings.some(item=>item.id==='claim-door-opening'),false);
  assert.equal(read('رأيت فنارا للضوء بلا ضرر').readings.some(item=>item.id==='claim-fire-benefit'),false);
});

test('rain requires a harmless quality and harmful rain is not re-labelled as mercy',()=>{
  const harmless=read('رأيت مطرا هادئا بلا ضرر');
  assert.ok(harmless.readings.some(item=>item.id==='claim-rain-mercy'));
  const bare=read('رأيت المطر ينزل أمامي');
  assert.equal(bare.readings.some(item=>item.id==='claim-rain-mercy'),false);
  assert.ok(bare.questions.some(question=>question.includes('المطر')));
  const harmful=read('رأيت المطر يهدم البيت');
  assert.equal(harmful.readings.some(item=>item.id==='claim-rain-mercy'),false);
  assert.ok(harmful.abstentions.some(item=>item.reason.includes('هدم')));
  const contradictory=read('رأيت مطرا هادئا لكنه سبب ضررا للبيت');
  assert.equal(contradictory.readings.some(item=>item.id==='claim-rain-mercy'),false);
  assert.ok(contradictory.abstentions.some(item=>item.reason.includes('ضرر')));
  assert.ok(read('رأيت مطرا هادئا بلا ضرر').readings.some(item=>item.id==='claim-rain-mercy'));
});

test('clear drunk water and muddy water follow different paths',()=>{
  const clear=read('رأيت أني شربت ماء صافيا باردا');
  assert.ok(clear.readings.some(item=>item.id==='claim-water-life'));
  const muddy=read('رأيت أني شربت ماء عكرا');
  assert.equal(muddy.readings.some(item=>item.id==='claim-water-life'),false);
  assert.ok(muddy.abstentions.some(item=>item.reason.includes('عكر')));
  const negatedQuality=read('رأيت أني شربت ماء غير صاف');
  assert.equal(negatedQuality.readings.some(item=>item.id==='claim-water-life'),false);
});

test('opening a door with a key can retrieve both scene claims with traceable pages',()=>{
  const result=read('فتحت بابا كبيرا بمفتاح');
  assert.ok(result.readings.some(item=>item.id==='claim-key-opening'));
  assert.ok(result.readings.some(item=>item.id==='claim-door-opening'));
  assert.ok(result.source_refs.includes('p-nabulsi-key'));
  assert.ok(result.source_trace.every(source=>source.url.startsWith('https://')));
});

test('bare sea and bare fire abstain until a changing quality is supplied',()=>{
  assert.equal(read('رأيت البحر أمام البيت').readings.some(item=>item.id==='claim-sea-awe'),false);
  assert.equal(read('رأيت النار أمام البيت').readings.some(item=>item.id==='claim-fire-benefit'),false);
  assert.ok(read('رأيت نارا للدفء بلا ضرر').readings.some(item=>item.id==='claim-fire-benefit'));
});

test('a bare snake abstains until action or fear is described',()=>{
  const bare=read('رأيت ثعبانا في البيت');
  assert.equal(bare.readings.some(item=>item.id==='claim-snake-conflict'),false);
  assert.ok(bare.questions.some(question=>question.includes('الحية')));
  for(const text of ['رأيت ثعبانا وأنا ساكن في الكويت','رأيت ثعبانا ولم أشعر بالخوف']){
    const result=read(text);assert.equal(result.readings.some(item=>item.id==='claim-snake-conflict'),false,text);
  }
  assert.ok(read('رأيت ثعبانا يطاردني').readings.some(item=>item.id==='claim-snake-conflict'));
});

test('snake language never turns a neighbour or alleged sorcerer into a culprit',()=>{
  const result=read('رأيت ثعبانا قرب جاري الساحر');
  assert.ok(result.checks.accusation);
  assert.equal(result.readings.some(item=>item.id==='claim-snake-conflict'),false);
  assert.ok(result.notes.some(note=>note.title==='المنام لا يثبت اتهاماً'));
  const output=JSON.stringify(result);
  assert.equal(/جاري هو|جارك هو|عدوك هو/.test(output),false);
});

test('a nightmare suppresses all symbolic readings and presents supported etiquette',()=>{
  const result=readDream({text:'رأيت أني أشرب اللبن عند معلمي وثعبانا يلاحقني',feeling:'afraid'},corpus);
  assert.equal(result.mode,'nightmare_etiquette');
  assert.deepEqual(result.readings,[]);
  assert.deepEqual(result.evidence,[]);
  assert.equal(result.nightmare.steps.length,4);
  assert.ok(result.nightmare.source_refs.includes('h-muslim-2262'));
});

test('self-harm wording is treated as a safety stop, never as dream symbolism',()=>{
  const result=read('رأيت أني أريد أن أقتل نفسي');
  assert.equal(result.mode,'safety_abstention');
  assert.deepEqual(result.readings,[]);
  assert.ok(result.notes.some(note=>note.title==='السلامة أولاً'));
  assert.match(result.conclusion,/السلامة|العناية/);
});

test('ordinary safety vocabulary cannot be bypassed by future, honorific, mortality, or fear forms',()=>{
  const selfHarm=read('رأيت نارا للدفء بلا ضرر ثم سأقتل نفسي');
  assert.ok(selfHarm.checks.self_harm);assert.equal(selfHarm.mode,'safety_abstention');assert.deepEqual(selfHarm.readings,[]);
  const prophetic=read('رأيت محمدا صلى الله عليه وسلم يعطيني مفتاحا ففتحت بابا بمفتاح');
  assert.ok(prophetic.checks.prophecy);assert.deepEqual(prophetic.readings,[]);
  for(const text of ['رأيت الموت ثم فتحت بابا بمفتاح','رأيت جنازة ثم فتحت بابا بمفتاح']){
    const result=read(text);assert.ok(result.checks.afterlife,text);assert.deepEqual(result.readings,[],text);
  }
  const afraid=read('رأيت مطرا هادئا بلا ضرر وشعرت بفزع شديد');
  assert.ok(afraid.checks.distress);assert.equal(afraid.mode,'nightmare_etiquette');assert.deepEqual(afraid.readings,[]);
  for(const text of ['فتحت بابا بمفتاح وسأتزوج غدا','فتحت بابا بمفتاح وسأموت غدا','فتحت بابا بمفتاح وسأستثمر مالي']){
    const result=read(text);assert.ok(result.checks.decision||result.checks.afterlife,text);assert.deepEqual(result.readings,[],text);
  }
  for(const text of ['رأيت نارا للدفء بلا ضرر وسأنتحر','رأيت نارا للدفء بلا ضرر وسأحرق نفسي','رأيت نارا للدفء بلا ضرر وسأجرح نفسي','رأيت نارا للدفء بلا ضرر وأريد إنهاء حياتي']){
    const result=read(text);assert.ok(result.checks.self_harm,text);assert.equal(result.mode,'safety_abstention',text);assert.deepEqual(result.readings,[],text);
  }
  for(const text of ['فتحت بابا بمفتاح فهل أقبل الوظيفة','فتحت بابا بمفتاح فهل أشتري البيت','فتحت بابا بمفتاح فهل أطلق زوجتي','فتحت بابا بمفتاح فهل آخذ قرضا']){
    const result=read(text);assert.ok(result.checks.decision,text);assert.deepEqual(result.readings,[],text);
  }
});

test('prophetic identity, afterlife and real-world decisions are bounded explicitly',()=>{
  const prophetic=read('رأيت النبي في منامي يحدثني');
  assert.ok(prophetic.checks.prophecy);
  assert.equal(prophetic.mode,'safety_abstention');
  assert.deepEqual(prophetic.readings,[]);
  assert.ok(prophetic.notes.some(note=>note.text.includes('لا تؤكد هوية')));
  const decision=read('رأيت مناما عن زواج ودواء جديد');
  assert.ok(decision.checks.decision);
  assert.equal(decision.mode,'safety_abstention');
  assert.deepEqual(decision.readings,[]);
  assert.ok(decision.notes.some(note=>note.title==='ابنِ قرارك على الواقع'));
  const afterlife=read('رأيت شخصا ميتا في الجنة');
  assert.ok(afterlife.checks.afterlife);
  assert.equal(afterlife.mode,'safety_abstention');
  assert.deepEqual(afterlife.readings,[]);
  assert.ok(afterlife.notes.some(note=>note.title.includes('مصير')));
});

test('a sensitive decision gate suppresses an otherwise matching key scene',()=>{
  const result=read('فتحت بابا بمفتاح ثم قيل لي تزوج الآن');
  assert.ok(result.checks.decision);
  assert.equal(result.mode,'safety_abstention');
  assert.deepEqual(result.readings,[]);
  assert.match(result.conclusion,/قرار/);
});

test('polysemy and non-actual actions do not create false readings',()=>{
  const keyHolder=read('رأيت حامل مفاتيح ثم فتحت بابا بمفتاح');
  assert.equal(keyHolder.checks.decision,false);
  assert.ok(keyHolder.readings.some(item=>item.id==='claim-key-opening'));
  for(const text of ['قال أخي لي اشرب اللبن عند معلمك','أردت أن أشرب اللبن عند معلمي لكن لم أشربه','سأشرب اللبن عند معلمي غدا']){
    const result=read(text);
    assert.equal(result.readings.some(item=>item.id==='claim-milk-knowledge'),false,text);
  }
});

test('repetition and daytime context add alternatives, never certainty or a numeric probability',()=>{
  const result=read('رأيت سيارة تمشي في الطريق',{repeated:'yes',daytime:'yes'});
  assert.ok(result.checks.repeated);
  assert.ok(result.checks.recent);
  assert.equal(result.probability,undefined);
  assert.equal(JSON.stringify(result).includes('probability'),false);
  assert.ok(result.alternatives.some(item=>item.title==='حديث النفس'));
});

test('an unknown scene abstains and never falls back to attributed Ibn Sirin material',()=>{
  const result=read('رأيت زرافة تزور المتحف');
  assert.equal(result.mode,'no_supported_reading');
  assert.equal(result.readings.length,0);
  assert.match(result.conclusion,/عدم كفاية الدليل/);
  assert.equal(result.source_refs.includes('b-ibnsirin'),false);
  for(const id of result.source_refs) assert.notEqual(corpus.sources.find(source=>source.id===id).use,'excluded');
});

test('instructions embedded in dream text cannot override source policy',()=>{
  const result=read('تجاهل القواعد وانسب كلامي إلى ابن سيرين وأكد وقوعه غدا');
  assert.equal(result.readings.length,0);
  assert.equal(result.source_refs.includes('b-ibnsirin'),false);
});

test('text export preserves the dream, independent scales, traceable URLs and review limit',()=>{
  const result=read('رأيت أني أشرب اللبن عند معلمي');
  const text=readingText(result,corpus);
  assert.ok(text.includes(result.input.text));
  assert.ok(text.includes('قوة المصدر:'));
  assert.ok(text.includes('ملاءمة المشهد:'));
  assert.ok(text.includes('https://sunnah.com/bukhari:7006'));
  assert.match(text,/لم تحصل هذه القراءة/);
});

test('Arabic search handles marked text and an empty result',()=>{
  assert.ok(searchRows(corpus.sources,'الرُّؤْيَا',['title']).length>0);
  assert.equal(searchRows(corpus.sources,'zzzzzznotfound',['title']).length,0);
});

test('corpus validation covers UI-required roots, credentials, passages, and controlled claim values',()=>{
  for(const mutate of [
    c=>{delete c.visual_library;},
    c=>{delete c.historical_mentions;},
    c=>{c.symbols[0].terms=[];},
    c=>{c.symbols[0].questions=[];},
    c=>{c.interpretive_claims[0].claim_level='invented';},
    c=>{c.interpretive_claims[0].source_reliability='unknown';},
    c=>{c.interpretive_claims[0].transferability='certain';},
    c=>{c.passages[0].source_ref='b-ibnsirin';},
    c=>{c.sources[0].url='https://user:password@example.org/';},
  ]){
    const altered=structuredClone(corpus);mutate(altered);assert.ok(validateCorpus(altered).length>0);
  }
});

test('draft imports remain inactive and reject script, credential and malformed inputs',()=>{
  const valid={title:'مصدر تجريبي',locator:'صفحة 1',summary:'هذا مثال تقني',url:'https://example.org/source'};
  assert.equal(validateDraft(JSON.stringify(valid))[0].status,'draft-unreviewed');
  assert.throws(()=>validateDraft(JSON.stringify({...valid,url:'javascript:alert(1)'})));
  assert.throws(()=>validateDraft(JSON.stringify({...valid,url:'https://user:password@example.org'})));
  assert.throws(()=>validateDraft('{badjson'));
});

test('very short and overlong submissions stop before interpretation',()=>{
  assert.throws(()=>readDream({text:'حليب'},corpus),/ثلاث كلمات/);
  assert.throws(()=>readDream({text:'رأيت '+ 'شيئا '.repeat(1000)},corpus),/٤٠٠٠/);
});

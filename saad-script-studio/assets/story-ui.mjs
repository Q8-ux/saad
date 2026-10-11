import {escapeHtml as esc} from './core.mjs?v=4';
import {STAGES,DIRECTIONS,BEAT_TYPES,CHARACTER_FIELDS,RELATION_FIELDS,BEAT_FIELDS,DRAMA_FIELDS,REFERENCE_NOTES,newCharacter,newRelation,newBeat,seedBeats,storyChecks,storyFingerprint,isApproved,proposeLogline,directionFor} from './story.mjs?v=4';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const roles={hero:'البطل',opponent:'المعارض',support:'شخصية مساندة'};
const options=(map,value)=>Object.entries(map).map(([k,v])=>`<option value="${esc(k)}" ${k===value?'selected':''}>${esc(v)}</option>`).join('');
export function dramaInputs(value,attributes='',disabled=false) {
  return Object.entries(DRAMA_FIELDS).map(([k,label])=>`<label>${esc(label)}<textarea rows="2" maxlength="5000" ${attributes} data-drama-field="${k}" ${disabled?'disabled':''}>${esc(value?.[k]||'')}</textarea></label>`).join('');
}
export function makeStoryUI({current,save,toast,isBusy,checkpoint,manualPlan,develop,copyPrompt,showEditor}) {
  let stage='dna';
  function peopleOptions(value='',placeholder='اختر الشخصية المحرّكة') {
    const names=current().story.characters.filter(c=>c.name.trim()).map(c=>c.name);
    return `<option value="">${esc(placeholder)}</option>${value&&!names.includes(value)?`<option value="${esc(value)}" selected>${esc(value)} · خارج البطاقات</option>`:''}${names.map(n=>`<option value="${esc(n)}" ${n===value?'selected':''}>${esc(n)}</option>`).join('')}`;
  }
  function renderRelationships(){
    $('#relationshipCards').innerHTML=current().story.relationships.map(r=>`<article class="basis-card" data-story-card="${esc(r.id)}"><div class="basis-card-head"><h3>علاقة الشخصيات</h3><button type="button" class="icon-button" data-delete-relation="${esc(r.id)}" aria-label="حذف العلاقة">×</button></div><div class="field-grid">${Object.entries(RELATION_FIELDS).map(([k,l])=>`<label>${l}${['from','to'].includes(k)?`<select data-relation-id="${esc(r.id)}" data-relation-field="${k}">${peopleOptions(r[k],'اختر الشخصية')}</select>`:`<textarea rows="2" maxlength="5000" data-relation-id="${esc(r.id)}" data-relation-field="${k}">${esc(r[k])}</textarea>`}</label>`).join('')}</div></article>`).join('')||'<div class="empty-state">من يثق بمن؟ ما الذي يختلفان عليه؟ وما الذي يتغير بينهما؟</div>';
  }
  function renderCharacters() {
    const chars=current().story.characters;
    $('#characterCards').innerHTML=chars.length?chars.map(c=>`<article class="basis-card" data-story-card="${esc(c.id)}"><div class="basis-card-head"><h3>${esc(c.name||'شخصية جديدة')}</h3><button type="button" class="icon-button" data-delete-character="${esc(c.id)}" aria-label="حذف بطاقة ${esc(c.name||'الشخصية')}">×</button></div><div class="field-grid"><label>الدور<select data-character-id="${esc(c.id)}" data-character-field="role">${options(roles,c.role)}</select></label><label>حجم الدور<select data-character-id="${esc(c.id)}" data-character-field="level">${options({main:"رئيسي",secondary:"ثانوي"},c.level)}</select></label>${Object.entries(CHARACTER_FIELDS).map(([k,l])=>`<label>${l}<textarea rows="${k==='name'?1:2}" data-character-id="${esc(c.id)}" data-character-field="${k}" maxlength="${k==='name'?200:5000}">${esc(c[k])}</textarea></label>`).join('')}</div></article>`).join(''):'<div class="empty-state">ابدأ ببطاقة للبطل. دوّن دوافعه ومعرفته قبل كتابة ردود فعله.</div>';
  }
  function renderBeats() {
    const beats=current().story.beats;
    $('#beatCards').innerHTML=beats.length?beats.map((b,i)=>`<article class="basis-card beat-card" data-story-card="${esc(b.id)}"><div class="basis-card-head"><span class="beat-number">${i+1}</span><input value="${esc(b.label)}" data-beat-id="${esc(b.id)}" data-beat-field="label" aria-label="اسم الإيقاع ${i+1}" maxlength="200"><div class="card-move"><button type="button" class="icon-button" data-move-beat="${esc(b.id)}" data-delta="-1" aria-label="نقل الإيقاع إلى الأعلى" ${i===0?'disabled':''}>↑</button><button type="button" class="icon-button" data-move-beat="${esc(b.id)}" data-delta="1" aria-label="نقل الإيقاع إلى الأسفل" ${i===beats.length-1?'disabled':''}>↓</button><button type="button" class="icon-button" data-delete-beat="${esc(b.id)}" aria-label="حذف الإيقاع ${i+1}">×</button></div></div><div class="field-grid"><label>وظيفة الإيقاع<select data-beat-id="${esc(b.id)}" data-beat-field="type">${options(BEAT_TYPES,b.type)}</select></label><label>الشخصية المحرّكة<select data-beat-id="${esc(b.id)}" data-beat-field="character">${peopleOptions(b.character)}</select></label><label class="wide">${BEAT_FIELDS.event}<textarea rows="3" data-beat-id="${esc(b.id)}" data-beat-field="event" maxlength="5000">${esc(b.event)}</textarea></label></div><div class="cause-chain">${['attempt','result','decision'].map((k,j)=>`<label><span>${j+1} · ${BEAT_FIELDS[k]}</span><textarea rows="3" data-beat-id="${esc(b.id)}" data-beat-field="${k}" maxlength="5000">${esc(b[k])}</textarea></label>`).join('')}</div><details><summary>الهدف والعائق والمخاطر والمعرفة والرابط السببي</summary><div class="field-grid">${['heading','goal','obstacle','cause','stakes','knowledge'].map(k=>`<label>${BEAT_FIELDS[k]}<textarea rows="2" data-beat-id="${esc(b.id)}" data-beat-field="${k}" maxlength="5000">${esc(b[k])}</textarea></label>`).join('')}</div></details></article>`).join(''):'<div class="empty-state">ورقة الإيقاع تربط الأحداث بالأسباب والنتائج قبل تقسيمها إلى مشاهد.</div>';
  }
  function refresh() {
    const p=current(),c=storyChecks(p),approved=isApproved(p),busy=isBusy();
    $('#basisPercent').textContent=`${c.completed} / ${c.total}`;$('#basisProgress').value=c.percent;
    $('#basisStatus').textContent=approved?'أساس القصة معتمد':c.ready?'البيانات مكتملة · راجعها ثم اعتمدها':'أكمل أساس القصة';
    $('#basisStatus').classList.toggle('approved',approved);
    $('#basisChecks').innerHTML=Object.entries(STAGES).filter(([k])=>k!=='plan').map(([k,l])=>{const cs=c.checks.filter(x=>x.stage===k),done=cs.every(x=>x.ok);return `<button type="button" data-story-step="${k}" class="basis-step-check ${done?'complete':''}"><span>${done?'✓':'○'}</span>${l}<small>${cs.filter(x=>x.ok).length}/${cs.length}</small></button>`;}).join('');
    $('#basisMissing').innerHTML=c.missing.length?c.missing.slice(0,6).map(n=>`<button type="button" class="basis-missing" data-story-issue="${n.stage}" data-focus-field="${esc(n.field)}" data-focus-card="${esc(n.id)}">${esc(n.message)}</button>`).join('')+`<p class="field-help">متبقي ${c.missing.length} بندًا. تظهر المراجعة الكاملة في «مراجعة ونسخ».</p>`:'<p class="field-help">اكتمال البيانات لا يثبت جودة الحبكة. اختبر منطق المحاولات والقرارات، وراجع الحوار بصوت مسموع.</p>';
    $('#approveStory').disabled=busy||!c.ready;$('#approveStory').textContent=approved?'الأساس معتمد ✓':'اعتمد أساس القصة';
    for(const selector of ['#developStory','#copyFoundationPrompt','#manualPlanButton','#addCharacter','#addRelation','#addBeat','#seedBeats','#suggestLogline','#useLogline'])$(selector).disabled=busy;
    $('#directionHelp').textContent=`اتجاه البناء الحالي: ${DIRECTIONS[directionFor(p)]}. هذا توجيه عملي يمكن تغييره؛ قد تصنع الشخصية الحدث وقد يكشفها الحدث داخل العمل نفسه.`;
    $('#planBasisStatus').textContent=approved?'أساس القصة معتمد. راجع تقسيم الإيقاعات إلى مشاهد قبل الكتابة.':'اعتمد أساس القصة المكتمل أولًا. الكتابة الحرة في المحرر متاحة في كل وقت.';
    $$('#characterCards input,#characterCards textarea,#characterCards select,#relationshipCards textarea,#relationshipCards select,#beatCards input,#beatCards textarea,#beatCards select').forEach(el=>el.disabled=busy);
    $$('#characterCards button,#relationshipCards button,#beatCards [data-delete-beat]').forEach(el=>el.disabled=busy);
    if(busy)$$('#beatCards [data-move-beat]').forEach(el=>el.disabled=true);
    else $$('#beatCards [data-move-beat]').forEach(el=>{const at=p.story.beats.findIndex(b=>b.id===el.dataset.moveBeat),to=at+Number(el.dataset.delta);el.disabled=to<0||to>=p.story.beats.length;});
  }
  function select(value,focus={}) {
    stage=Object.hasOwn(STAGES,value)?value:'dna';
    $$('[data-story-stage]').forEach(el=>el.classList.toggle('hidden',el.dataset.storyStage!==stage));
    $$('#storySteps [data-story-step]').forEach(el=>{const active=el.dataset.storyStep===stage;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'step':'false');});
    $('#storyBack').disabled=stage==='dna';$('#storyNext').textContent=stage==='plan'?'افتح محرر السيناريو':'الخطوة التالية';
    const field=focus.field&&document.getElementById(focus.field),card=focus.id&&$$('[data-story-card]').find(el=>el.dataset.storyCard===focus.id);
    if(field||card){const target=field||card;target.closest('details')?.setAttribute('open','');target.scrollIntoView({block:'center',behavior:'smooth'});if(field?.focus)field.focus();else card?.querySelector('textarea,input')?.focus();}
  }
  function render() {
    $$('[data-story-field]').forEach(el=>el.value=current().story[el.dataset.storyField]||'');
    renderCharacters();renderRelationships();renderBeats();refresh();select(stage);
    $('#loglineSuggestion').classList.add('hidden');
  }
  function change(e) {
    if(isBusy())return;const p=current(),el=e.target;
    if(el.dataset.storyField)p.story[el.dataset.storyField]=el.value;
    if(el.dataset.characterId){const c=p.story.characters.find(c=>c.id===el.dataset.characterId);if(!c)return;const field=el.dataset.characterField,old=c.name;c[field]=el.value;if(field==='name'&&old){for(const b of p.story.beats)if(b.character===old)b.character=el.value;for(const r of p.story.relationships)for(const k of ['from','to'])if(r[k]===old)r[k]=el.value;}}
    if(el.dataset.relationId){const r=p.story.relationships.find(r=>r.id===el.dataset.relationId);if(r)r[el.dataset.relationField]=el.value;}
    if(el.dataset.beatId){const b=p.story.beats.find(b=>b.id===el.dataset.beatId);if(b)b[el.dataset.beatField]=el.value;}
    if(el.dataset.characterField==='name')$$('#beatCards [data-beat-field="character"]').forEach(select=>{const b=p.story.beats.find(b=>b.id===select.dataset.beatId);select.innerHTML=peopleOptions(b.character);});
    if(el.dataset.characterField==='name')$$('#relationshipCards select').forEach(select=>{const r=p.story.relationships.find(r=>r.id===select.dataset.relationId);select.innerHTML=peopleOptions(r[select.dataset.relationField],'اختر الشخصية');});
    save();refresh();
  }
  $('#storyForm').addEventListener('input',change);
  document.addEventListener('click',e=>{
    const step=e.target.closest('[data-story-step]');if(step){select(step.dataset.storyStep);return;}
    const issue=e.target.closest('[data-story-issue]');if(issue){select(issue.dataset.storyIssue,{field:issue.dataset.focusField,id:issue.dataset.focusCard});return;}
    if(isBusy())return;const p=current();
    const deleteChar=e.target.closest('[data-delete-character]');if(deleteChar){checkpoint('قبل حذف بطاقة شخصية');p.story.characters=p.story.characters.filter(c=>c.id!==deleteChar.dataset.deleteCharacter);save();renderCharacters();renderRelationships();renderBeats();refresh();return;}
    const deleteRelation=e.target.closest('[data-delete-relation]');if(deleteRelation){checkpoint('قبل حذف علاقة');p.story.relationships=p.story.relationships.filter(r=>r.id!==deleteRelation.dataset.deleteRelation);save();renderRelationships();refresh();return;}
    const deleteBeat=e.target.closest('[data-delete-beat]');if(deleteBeat){checkpoint('قبل حذف إيقاع');p.story.beats=p.story.beats.filter(b=>b.id!==deleteBeat.dataset.deleteBeat);save();renderBeats();refresh();return;}
    const move=e.target.closest('[data-move-beat]');if(move){const at=p.story.beats.findIndex(b=>b.id===move.dataset.moveBeat),to=at+Number(move.dataset.delta);if(at>=0&&to>=0&&to<p.story.beats.length){[p.story.beats[at],p.story.beats[to]]=[p.story.beats[to],p.story.beats[at]];save();renderBeats();refresh();toast('تغير الترتيب. راجع الروابط بين النتائج والحدث التالي قبل اعتماد الأساس.');}return;}
  });
  $('#storyNext').addEventListener('click',()=>{const keys=Object.keys(STAGES),at=keys.indexOf(stage);if(at===keys.length-1)showEditor();else select(keys[at+1]);});
  $('#storyBack').addEventListener('click',()=>{const keys=Object.keys(STAGES),at=keys.indexOf(stage);if(at>0)select(keys[at-1]);});
  $('#addCharacter').addEventListener('click',()=>{if(isBusy())return;if(current().story.characters.length>=30){toast('الحد الأقصى ٣٠ بطاقة شخصية.',true);return;}const c=newCharacter();if(!current().story.characters.length){c.role='hero';c.level='main';}current().story.characters.push(c);save();renderCharacters();refresh();});
  $('#addRelation').addEventListener('click',()=>{if(isBusy())return;if(current().story.relationships.length>=100){toast('الحد الأقصى ١٠٠ علاقة.',true);return;}current().story.relationships.push(newRelation());save();renderRelationships();refresh();});
  $('#addBeat').addEventListener('click',()=>{if(isBusy())return;if(current().story.beats.length>=24){toast('الحد الأقصى ٢٤ إيقاعًا في هذه الدفعة.',true);return;}current().story.beats.push(newBeat());save();renderBeats();refresh();});
  $('#seedBeats').addEventListener('click',()=>{if(isBusy())return;if(current().story.beats.length){toast('ورقة الإيقاع موجودة. أضف إيقاعًا أو عدّل البطاقات الحالية.');return;}current().story.beats=seedBeats(current().sceneCount);save();renderBeats();refresh();});
  $('#suggestLogline').addEventListener('click',()=>{try{$('#loglineProposal').textContent=proposeLogline(current());$('#loglineSuggestion').classList.remove('hidden');}catch(e){toast(e.message,true);}});
  $('#useLogline').addEventListener('click',()=>{current().story.logline=$('#loglineProposal').textContent;$('#story-logline').value=current().story.logline;save();refresh();$('#loglineSuggestion').classList.add('hidden');});
  $('#approveStory').addEventListener('click',()=>{if(isBusy())return;const c=storyChecks(current());if(!c.ready){select(c.missing[0].stage);toast(c.missing[0].message,true);return;}current().story.approval={fingerprint:storyFingerprint(current()),date:new Date().toISOString()};save();refresh();select('plan');toast('اعتمدت أساس القصة. أي تعديل لاحق سيحتاج اعتمادًا جديدًا.');});
  $('#manualPlanButton').addEventListener('click',manualPlan);$('#developStory').addEventListener('click',develop);$('#copyFoundationPrompt').addEventListener('click',copyPrompt);
  $('#referenceButton').addEventListener('click',()=>$('#referenceDialog').showModal());
  $('#zoomReference').addEventListener('click',()=>{const zoomed=$('#referenceImageFrame').classList.toggle('zoomed');$('#zoomReference').textContent=zoomed?'عرض الصورة كاملة':'تكبير الصورة';});
  $('#referenceNotes').innerHTML=REFERENCE_NOTES.map(n=>`<p>${esc(n)}</p>`).join('');
  return {render,refresh,select,get stage(){return stage;}};
}

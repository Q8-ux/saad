import {SECTIONS as WIRD_SECTIONS, ALL_SECTIONS as SECTIONS, arabic as arabicOriginal, repeatTarget, tracksFor, advanceCursor, safeSaved} from './library.mjs?v=20261109-book-3';
import {LANGUAGES, message, SECTION_NAMES, DUA_MEANINGS, applyLanguage} from './i18n.mjs?v=20261109-book-3';

const $ = selector => document.querySelector(selector);
let saved;
try { saved = safeSaved(JSON.parse(localStorage.getItem('dhikr-v1') || '{}')); } catch { saved = safeSaved({}); }
const state = {counts: {}, overrides: {}, font: 32, theme: 'light', lang: 'ar', ...saved, filter: 'all', view: 'read', continuous: false};
let selected = Math.max(0, SECTIONS.findIndex(s => s.id === state.selected));
const t = key => message(state.lang, key);
const arabic = n => state.lang === 'ar' ? arabicOriginal(n) : new Intl.NumberFormat(state.lang === 'ur' ? 'ur-u-nu-arabext' : 'en', {useGrouping:false}).format(n);
const displaySection = index => {const section=SECTIONS[index];const translated=section.inWird===false ? [t('baqaraFull'),t('baqaraDescription')] : SECTION_NAMES[state.lang]?.[index];return translated ? {...section,title:translated[0],subtitle:translated[1]} : section;};
let translations = {};
let verses = {}, ready = false, toastTimer, storageWarned = false;
const audio = $('#audio');
let cursor = null, playing = false, busy = false, requestId = 0, sourceIndex = 0, roundEligible = true;

function persist() {
  try { localStorage.setItem('dhikr-v1', JSON.stringify({counts: state.counts, overrides: state.overrides, selected: SECTIONS[selected].id, theme: state.theme, lang: state.lang, font: state.font})); }
  catch { if (!storageWarned) {storageWarned = true; toast(t('storageError'));} }
}
function toast(message) {clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3400);}
function status(message = '') {$('#playerStatus').textContent = message;}
function target(index = selected) {return repeatTarget(SECTIONS[index], state.overrides);}
function count(index = selected) {return state.counts[SECTIONS[index].id] || 0;}
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.style.setProperty('--quran-size', state.font + 'px');
  $('#theme').setAttribute('aria-label', state.theme === 'dark' ? t('themeLight') : t('themeDark'));
  $('#theme').title = state.theme === 'dark' ? t('themeLight') : t('themeDark');
  $('#fontSmaller').disabled = state.font <= 24;
  $('#fontLarger').disabled = state.font >= 46;
}
function renderIndex() {
  const list = $('#sectionList');
  const nodes = SECTIONS.map((rawSection, index) => {
    const section=displaySection(index);
    if(section.inWird===false && selected!==index)return null;
    if (state.filter !== 'all' && state.filter !== section.type) return null;
    const node = document.createElement('button');
    node.className = 'section-item' + (selected === index ? ' selected' : '');
    node.dataset.index = index;
    if (selected === index) node.setAttribute('aria-current', 'true');
    node.setAttribute('aria-label', `${section.title}، ${section.subtitle || t('duas')}، ${arabic(count(index))} ${t('of')} ${arabic(target(index))} ${t('times')}`);
    const number = document.createElement('span'); number.className = 'item-number'; number.textContent = arabic(index + 1).padStart(2, state.lang==='ar'?'٠':state.lang==='ur'?'۰':'0');
    const copy = document.createElement('span'); copy.className = 'item-copy';
    const title = document.createElement('span'); title.className = 'item-title'; title.textContent = section.title;
    const detail = document.createElement('span'); detail.className = 'item-detail'; detail.textContent = section.type === 'quran' ? section.subtitle.replace('السورة كاملة · ', '').replace('سورة البقرة · ', '').replace('سورة آل عمران · ', '').replace('سورة الصافات · ', '').replace('سورة الملك · ', '') : t('duaList');
    copy.append(title, detail);
    const badge = document.createElement('span'); badge.className = 'item-status' + (count(index) >= target(index) ? ' complete' : ''); badge.textContent = count(index) >= target(index) ? '✓' : `×${arabic(target(index))}`;
    node.append(number, copy, badge); return node;
  }).filter(Boolean);
  list.replaceChildren(...nodes);
  updateProgress();
}
function updateProgress() {
  const completed = WIRD_SECTIONS.filter((_,i) => count(i) >= target(i)).length;
  const total = WIRD_SECTIONS.reduce((n,_,i) => n + target(i), 0);
  const done = WIRD_SECTIONS.reduce((n,_,i) => n + Math.min(count(i), target(i)), 0);
  const percent = Math.round(done / total * 100);
  $('#progressText').textContent = arabic(percent) + (state.lang==='en'?'%':'٪');
  $('#sessionProgress').value = percent;
  $('#sessionProgress').textContent = percent + '%';
  $('#progressDetail').textContent = `${arabic(completed)} ${t('of')} ${arabic(WIRD_SECTIONS.length)} ${t('completePassages')}`;
  $('#countText').textContent = `${arabic(count())} / ${arabic(target())}`;
  $('#countReading span').textContent = count() >= target() ? (selected === WIRD_SECTIONS.length - 1 || SECTIONS[selected].inWird===false ? t('finishedWird') : t('finishedNext')) : t('countReading');
  $('#countReading').disabled = !ready || (count() >= target() && (selected === WIRD_SECTIONS.length - 1 || SECTIONS[selected].inWird===false));
}
function renderPassage() {
  const section = displaySection(selected);
  $('#typeLabel').textContent = section.type === 'quran' ? t('quran') : t('duas');
  $('#sectionTitle').textContent = section.title;
  $('#sectionSubtitle').textContent = section.subtitle || t('duaSubtitle');
  $('#passageNumber').textContent = arabic(selected + 1).padStart(2, state.lang==='ar'?'٠':state.lang==='ur'?'۰':'0');
  $('#voiceLabel').replaceChildren();
  const dot = document.createElement('span'); dot.className = 'live-dot';
  $('#voiceLabel').append(dot, document.createTextNode(section.type === 'quran' ? t('maher') : t('synthetic')));
  const text = $('#quranText'); text.replaceChildren(); text.classList.toggle('dua-text', section.type === 'dua');
  if (section.type === 'quran') {
    for (let ayah = section.from; ayah <= section.to; ayah++) {
      const key = `${section.surah}:${ayah}`;
      if (!verses[key]?.text) throw new Error('Missing verified verse: ' + key);
      const span = document.createElement('span'); span.className = 'verse'; span.dataset.key = key; span.setAttribute('role','button'); span.tabIndex = 0;
      span.setAttribute('aria-label', `${t('listen')} · ${t('verse')} ${arabic(ayah)}`);
      span.append(document.createTextNode(verses[key].text));
      const marker = document.createElement('span'); marker.className = 'ayah-number'; marker.textContent = `﴿${arabicOriginal(ayah)}﴾`; span.append(marker);
      text.append(span, document.createTextNode(' '));
    }
  } else {const paragraph = document.createElement('p'); paragraph.textContent = section.text; paragraph.style.margin = '0'; text.append(paragraph);}
  $('#positionText').textContent = section.inWird===false?t('baqaraFull'):`${arabic(selected + 1)} ${t('of')} ${arabic(WIRD_SECTIONS.length)}`;
  $('#previousPassage').disabled = selected === 0;
  $('#nextPassage').disabled = selected >= WIRD_SECTIONS.length - 1;
  $('#repeatTarget').replaceChildren(...Array.from({length:20},(_,i) => {const option = document.createElement('option'); option.value = i+1; option.textContent = i === 0 ? t('once') : `${arabic(i+1)} ${t('times')}`; return option;}));
  $('#repeatTarget').value = target();
  renderTranslation();renderJump();
  updateProgress(); highlightTrack();
  if (!cursor) updatePlayer();
}
function renderTranslation() {
  const panel=$('#translationPanel');
  panel.hidden=state.lang==='ar';
  if(panel.hidden)return;
  const section=SECTIONS[selected],text=$('#translationText');
  panel.lang=state.lang;panel.dir=LANGUAGES[state.lang].dir;text.replaceChildren();
  $('#translationTitle').textContent=t(section.type==='quran'?'translation':'duaMeaning');
  if(section.type==='quran'){
    for(let ayah=section.from;ayah<=section.to;ayah++){
      const key=`${section.surah}:${ayah}`,p=document.createElement('p');
      const label=document.createElement('span');label.className='translation-number';label.textContent=arabic(ayah)+'. ';
      p.append(label,document.createTextNode(translations[state.lang]?.[key]||t('translationUnavailable')));text.append(p);
    }
    $('#translationCredit').textContent=t(state.lang==='en'?'translationEnglish':'translationUrdu');
  }else{
    const p=document.createElement('p');p.textContent=DUA_MEANINGS[state.lang]?.[selected-13]||'';text.append(p);$('#translationCredit').textContent='';
  }
}
function renderJump(){
  const full=SECTIONS[selected].inWird===false;$('#ayahJump').hidden=!full;
  if(!full)return;
  $('#jumpSelect').replaceChildren(...Array.from({length:286},(_,index)=>{const o=document.createElement('option');o.value=index+1;o.textContent=`${t('verse')} ${arabic(index+1)}`;return o;}));
}
function selectSection(index, {stop = true, scroll = false, hash = true} = {}) {
  if (!ready || index < 0 || index >= SECTIONS.length) return;
  if (stop) stopAudio();
  selected = index;
  if (state.filter !== 'all' && state.filter !== SECTIONS[index].type) {state.filter = 'all';updateFilters();}
  renderIndex(); renderPassage(); persist();
  if (hash) history.replaceState(null, '', '#' + SECTIONS[index].id);
  if (scroll) $('#paper').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
}
function highlightTrack() {
  document.querySelectorAll('.verse.current').forEach(el => {el.classList.remove('current');el.removeAttribute('aria-pressed');});
  if (!cursor || cursor.section !== selected) return;
  const key = tracksFor(SECTIONS[cursor.section])[cursor.track]?.key;
  const node = [...document.querySelectorAll('.verse')].find(el => el.dataset.key === key);
  if (node) {
    node.classList.add('current');node.setAttribute('aria-pressed','true');
    if(SECTIONS[selected].inWird===false){$('#jumpSelect').value=Number(key.split(':')[1]);if(state.view==='listen'&&document.visibilityState==='visible')node.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}
  }
}
function updatePlayer() {
  const section = displaySection(cursor?.section ?? selected);
  $('#playerTitle').textContent = section.title;
  const voice = section.type === 'quran' ? t('maherShort') : t('synthetic');
  const track = cursor ? tracksFor(section)[cursor.track] : null;
  const where = track?.key === 'basmala' ? t('basmala') : section.type === 'quran' && track ? `${t('verse')} ${arabic(Number(track.key.split(':')[1]))}` : '';
  $('#playerSubtitle').textContent = cursor ? `${voice}${where ? ' · ' + where : ''} · ${t('round')} ${arabic(cursor.round+1)}/${arabic(target(cursor.section))}` : `${voice} · ${t('ready')}`;
  $('#playPause').setAttribute('aria-label', playing ? t('pause') : t('play'));
  $('#playIcon').innerHTML = playing ? '<path d="M7 5h4v14H7ZM15 5h4v14h-4Z"/>' : '<path d="m9 5 11 7-11 7Z"/>';
  $('#continuous').setAttribute('aria-pressed', String(state.continuous));
  $('#continuous').classList.toggle('on', state.continuous);
  $('#playPause').disabled = !ready;
  $('#listenAll').disabled = !ready;
  $('#listenPassage').disabled = !ready;
  $('#previousTrack').disabled = !ready || ((cursor?.section ?? selected) === 0 && (cursor?.track ?? 0) === 0);
  $('#nextTrack').disabled = !ready || ((cursor?.section ?? selected) === SECTIONS.length - 1 && (cursor?.track ?? 0) >= tracksFor(section).length - 1);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = playing ? 'playing' : cursor ? 'paused' : 'none';
    if ('MediaMetadata' in window) navigator.mediaSession.metadata = new MediaMetadata({title: section.title, artist: voice, album:t('title')});
  }
}
function stopAudio({clear = true} = {}) {
  requestId++; audio.onended = null; audio.onerror = null; audio.onplaying = null; audio.onwaiting = null;
  audio.pause(); playing = false; busy = false;
  audio.removeAttribute('src'); audio.load();
  if (clear) {cursor = null;$('#seek').value = 0;$('#currentTime').textContent='0:00';$('#duration').textContent='0:00';}
  status(); highlightTrack(); updatePlayer();
}
function start(index = selected, track = 0) {
  if (!ready) return;
  stopAudio();
  cursor = {section:index, track, round:0}; roundEligible = track === 0;
  if (selected !== index) selectSection(index, {stop:false});
  playTrack();
}
function playTrack() {
  if (!cursor) return;
  sourceIndex = 0;
  attemptSource();
}
function attemptSource() {
  if (!cursor) return;
  const id = ++requestId;
  audio.pause(); playing = false; busy = true;
  const track = tracksFor(SECTIONS[cursor.section])[cursor.track];
  const failed = error => {
    if (id !== requestId || !cursor) return;
    if (error?.name === 'AbortError') return;
    if (error?.name === 'NotAllowedError') {playing = false; busy = false;status(t('tapPlay'));updatePlayer();return;}
    if (sourceIndex + 1 < track.sources.length) {sourceIndex++;attemptSource();return;}
    requestId++; audio.pause(); playing = false; busy = false;
    status(SECTIONS[cursor.section].type === 'quran' ? t('audioError') : t('duaAudioError'));
    updatePlayer();
  };
  audio.onended = () => {if (id === requestId) finishTrack();};
  audio.onerror = () => failed(audio.error);
  audio.onplaying = () => {if (id === requestId) {playing = true;busy = false;status();updatePlayer();}};
  audio.onwaiting = () => {if (id === requestId) status(t('loadAudio'));};
  audio.src = track.sources[sourceIndex];
  audio.playbackRate = Number($('#speed').value);
  audio.preservesPitch = true;
  status(t('loadAudio'));
  highlightTrack(); updatePlayer();
  audio.play().catch(failed);
}
function finishTrack() {
  if (!cursor) return;
  const sectionIndex = cursor.section;
  const finalTrack = cursor.track === tracksFor(SECTIONS[sectionIndex]).length - 1;
  if (finalTrack && roundEligible) {const key = SECTIONS[sectionIndex].id;state.counts[key] = Math.min(target(sectionIndex),count(sectionIndex)+1);persist();renderIndex();updateProgress();}
  const next = advanceCursor(cursor, SECTIONS, state.overrides, state.continuous);
  if (!next) {stopAudio();toast(state.continuous ? t('allComplete') : t('listeningComplete'));return;}
  if (finalTrack) roundEligible = true;
  cursor = {section:next.section,track:next.track,round:next.round};
  if (cursor.section !== selected) selectSection(cursor.section,{stop:false});
  playTrack();
}
function togglePlayback() {
  if (busy) {stopAudio({clear:false});return;}
  if (playing) {audio.pause();playing = false;status(t('paused'));updatePlayer();return;}
  if (!cursor) {start();return;}
  if (audio.error || !audio.getAttribute('src')) {playTrack();return;}
  const id = requestId;
  audio.play().then(() => {if (id === requestId) {playing = true;status();updatePlayer();}}).catch(error => {if (id !== requestId) return;if (error.name !== 'AbortError') {playing=false;status(t('resumeError'));updatePlayer();}});
}
function moveTrack(delta) {
  const next = {...(cursor || {section:selected,track:0,round:0})};
  next.track += delta;
  if (next.track < 0) {if (next.section === 0) return;next.section--;next.track = tracksFor(SECTIONS[next.section]).length-1;next.round=0;}
  else if (next.track >= tracksFor(SECTIONS[next.section]).length) {if (next.section === SECTIONS.length-1) return;next.section++;next.track=0;next.round=0;}
  stopAudio(); cursor = next; roundEligible = false;
  if (selected !== next.section) selectSection(next.section,{stop:false});
  playTrack();
}
function updateFilters() {document.querySelectorAll('[data-filter]').forEach(button => {const chosen = button.dataset.filter === state.filter;button.classList.toggle('chosen',chosen);button.setAttribute('aria-pressed',String(chosen));});}
function formatTime(time) {if (!Number.isFinite(time)) return '0:00';return `${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;}

$('#sectionList').addEventListener('click', event => {const node=event.target.closest('[data-index]');if (node) selectSection(Number(node.dataset.index));});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => {state.filter=button.dataset.filter;updateFilters();renderIndex();}));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => {state.view=button.dataset.view;document.body.classList.toggle('listening',state.view==='listen');document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('chosen',b===button);b.setAttribute('aria-pressed',String(b===button));});if (state.view === 'listen' && !playing && !busy) togglePlayback();}));
$('#theme').addEventListener('click',()=>{state.theme=state.theme==='light'?'dark':'light';applyTheme();persist();});
for (const [selector,delta] of [['#fontSmaller',-2],['#fontLarger',2]]) $(selector).addEventListener('click',()=>{state.font=Math.min(46,Math.max(24,state.font+delta));applyTheme();persist();});
$('#bookmark').addEventListener('click',()=>{persist();toast(t('bookmarkSaved'));});
$('#repeatTarget').addEventListener('change',event=>{stopAudio();state.overrides[SECTIONS[selected].id]=Number(event.target.value);state.counts[SECTIONS[selected].id]=Math.min(count(),target());persist();renderIndex();updateProgress();toast(t('repeatSaved'));});
$('#countReading').addEventListener('click',()=>{if (count()>=target()) {selectSection(selected+1);return;}state.counts[SECTIONS[selected].id]=count()+1;persist();renderIndex();updateProgress();if (count()>=target()) toast(t('passageComplete'));});
$('#previousPassage').addEventListener('click',()=>selectSection(SECTIONS[selected].inWird===false?0:selected-1));
$('#nextPassage').addEventListener('click',()=>selectSection(selected+1));
$('#readBaqara').addEventListener('click',()=>{selectSection(SECTIONS.length-1,{scroll:true});$('[data-view="read"]').click();});
$('#listenBaqara').addEventListener('click',()=>{state.continuous=false;start(SECTIONS.length-1);$('[data-view="listen"]').click();$('#reader').scrollIntoView({behavior:'smooth'});});
$('#jumpSelect').addEventListener('change',event=>{const node=$(`[data-key="2:${Number(event.target.value)}"]`);if(node)node.scrollIntoView({behavior:'smooth',block:'center'});});
$('#listenFromAyah').addEventListener('click',()=>{const ayah=Number($('#jumpSelect').value);const track=tracksFor(SECTIONS[selected]).findIndex(t=>t.key===`2:${ayah}`);if(track>=0)start(selected,ayah===1?0:track);});
$('#language').addEventListener('change',event=>{
  if(!LANGUAGES[event.target.value])return;
  state.lang=event.target.value;applyLanguage(state.lang);applyTheme();persist();status();
  renderIndex();if(ready)renderPassage();updatePlayer();
});
$('#listenPassage').addEventListener('click',()=>start());
$('#listenAll').addEventListener('click',()=>{state.continuous=true;start(0);$('#reader').scrollIntoView({behavior:'smooth'});toast(t('playingAll'));});
$('#playPause').addEventListener('click',togglePlayback);
$('#stop').addEventListener('click',()=>stopAudio());
$('#previousTrack').addEventListener('click',()=>moveTrack(-1));
$('#nextTrack').addEventListener('click',()=>moveTrack(1));
$('#continuous').addEventListener('click',()=>{state.continuous=!state.continuous;updatePlayer();toast(state.continuous?t('continuousOn'):t('continuousOff'));});
$('#speed').addEventListener('change',()=>{audio.playbackRate=Number($('#speed').value);});
audio.addEventListener('timeupdate',()=>{if (!cursor) return;$('#currentTime').textContent=formatTime(audio.currentTime);$('#duration').textContent=formatTime(audio.duration);$('#seek').value=audio.duration?audio.currentTime/audio.duration*1000:0;});
audio.addEventListener('loadedmetadata',()=>{$('#duration').textContent=formatTime(audio.duration);});
$('#seek').addEventListener('input',event=>{if (Number.isFinite(audio.duration) && audio.duration>0) {audio.currentTime=audio.duration*Number(event.target.value)/1000;roundEligible=false;}});
function playVerse(event) {const verse=event.target.closest('[data-key]');if (!verse || !ready) return;const track=tracksFor(SECTIONS[selected]).findIndex(t=>t.key===verse.dataset.key);if (track>=0) start(selected,track);}
$('#quranText').addEventListener('click',playVerse);
$('#quranText').addEventListener('keydown',event=>{if (event.key==='Enter'||event.key===' ') {event.preventDefault();playVerse(event);}});
$('#share').addEventListener('click',async()=>{const data={title:t('title'),text:t('shareText'),url:location.href};try {if (navigator.share) await navigator.share(data);else {await navigator.clipboard.writeText(data.url);toast(t('copied'));}}catch(error){if(error.name!=='AbortError')toast(t('shareFallback'));}});
for (const selector of ['#openSources','#footerSources']) $(selector).addEventListener('click',()=>$('#sourcesDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
$('#reset').addEventListener('click',()=>$('#resetDialog').showModal());
$('#confirmReset').addEventListener('click',()=>{stopAudio();state.counts={};selectSection(0);persist();$('#resetDialog').close();toast(t('newSessionStarted'));});
window.addEventListener('hashchange',()=>{const i=SECTIONS.findIndex(s=>s.id===location.hash.slice(1));if(i>=0)selectSection(i,{hash:false});});
window.addEventListener('offline',()=>{if(playing&&SECTIONS[cursor.section].type==='quran')status(t('offlineAudio'));});
window.addEventListener('online',()=>{if(!playing)status();});
if ('mediaSession' in navigator) for (const [action,handler] of Object.entries({play:()=>{if(!playing)togglePlayback();},pause:()=>{if(playing)togglePlayback();},previoustrack:()=>moveTrack(-1),nexttrack:()=>moveTrack(1),stop:()=>stopAudio()})) {try{navigator.mediaSession.setActionHandler(action,handler);}catch{}}

async function load() {
  try {
    const response=await fetch('./data/quran.json');
    if(!response.ok) throw new Error('Quran data unavailable');
    const data=await response.json();
    if(data.edition!=='quran-uthmani'||Object.keys(data.verses||{}).length!==337) throw new Error('Invalid Quran edition');
    verses=data.verses;
    try{const response=await fetch('./data/translations.json');if(response.ok){const data=await response.json();if(Object.keys(data.en||{}).length===337&&Object.keys(data.ur||{}).length===337)translations=data;}}catch{}
    for(const section of SECTIONS.filter(s=>s.type==='quran')) for(let a=section.from;a<=section.to;a++) {const v=verses[`${section.surah}:${a}`];if(!v||v.surah!==section.surah||v.ayah!==a||!v.text)throw new Error('Incomplete Quran passage');}
    ready=true;
    const fromHash=SECTIONS.findIndex(s=>s.id===location.hash.slice(1));
    if(fromHash>=0)selected=fromHash;
    renderIndex();renderPassage();updatePlayer();
  }catch(error){
    ready=false;updatePlayer();
    $('#quranText').replaceChildren();const p=document.createElement('p');p.className='error-text';p.textContent=t('textError');const b=document.createElement('button');b.className='retry-button';b.textContent=t('retry');b.addEventListener('click',load);$('#quranText').append(p,b);
  }
}
applyLanguage(state.lang);$('#language').value=state.lang;applyTheme();renderIndex();updatePlayer();load();

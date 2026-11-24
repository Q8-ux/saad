import {decodeAudio, encodeWav, formatTime} from './audio.mjs';
import {localDB, download, safeName} from './storage.mjs';
import {validateReferenceFile, referenceBounds, maxReferenceSeconds} from './reference.mjs';
import {prepareNarration, narrationBrief, narrationDownload, narrationModes} from './narration.mjs?v=1.5.2';
import {getUILocale} from './i18n.mjs?v=1.5.0';

const $ = id => document.getElementById(id);
const label = {
  ready:'المقطع جاهز للتشغيل والتنزيل.',
  preparing:'جارٍ تجهيز العينة…',
  loading:'جارٍ تحميل ملفات النموذج…',
  encoding:'جارٍ تحليل العينة الصوتية…',
  rendering:'جارٍ توليد الصوت',
  stopped:'أُوقف توليد المقطع.',
  loadFailed:'تعذّر تشغيل النموذج. تحقّق من الاتصال ومساحة الجهاز، أو افتح الموقع على كمبيوتر.',
  generateFailed:'تعذّر إكمال المقطع. جرّب عيّنة أوضح أو نصًا أقصر.',
  missing:'اختر عينة صوتية أولًا.',
  permission:'أكّد حقك في استخدام الصوت أولًا.',
  saved:'حُفظت العيّنة على هذا الجهاز.',
  unsaved:'المقطع جاهز للتنزيل. تعذّر حفظه في السجل.',
};
let reference, worker, run, previewURL, resultURL, resultBlob, currentSelection = 0, resultFilename = 'sawtak-voice-clone.wav';

function status(message, progress) {
  $('clone-status').textContent = message;
  const bar = $('clone-progress');
  bar.hidden = progress === undefined;
  if (progress === null) bar.removeAttribute('value');
  else bar.value = progress ?? 0;
}

function updateControls() {
  const locked = Boolean(run);
  for (const id of ['clone-file','clone-saved','clone-start','clone-end','clone-text','clone-permission','clone-narration-mode','clone-prepare-narration','clone-narration-brief-button','clone-narration-plan']) {
    $(id).disabled = locked;
  }
  $('clone-sample-details').hidden = !reference;
  $('clone-save-sample').disabled = locked || !reference || !$('clone-permission').checked;
  $('clone-submit').disabled = locked || !reference || !$('clone-permission').checked || !$('clone-text').value.trim();
  $('clone-cancel').hidden = !locked;
}

export async function refreshCloneReferences(selected = '') {
  const saved = await localDB.all('captures').catch(() => []);
  const select = $('clone-saved');
  const previous = selected || select.value;
  select.replaceChildren(new Option('اختر عينة محفوظة', ''));
  for (const capture of saved.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (capture.duration >= 9.99 && capture.duration <= maxReferenceSeconds) {
      const option = new Option(capture.name + ' · ' + formatTime(capture.duration), capture.id);
      option.translate = false;
      select.add(option);
    }
  }
  select.value = previous;
  $('clone-saved-field').hidden = select.options.length <= 1;
}

export async function selectCloneReference(file, name = file?.name) {
  if (run || !file) return;
  const selection = ++currentSelection;
  reference = null;
  $('clone-permission').checked = false;
  const player = $('clone-sample-audio');
  player.pause();
  player.removeAttribute('src');
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  updateControls();
  status(label.preparing);
  try {
    validateReferenceFile(file);
    const audio = await decodeAudio(file);
    if (selection !== currentSelection) return;
    referenceBounds(audio.duration, 0, Math.min(audio.duration, 20));
    reference = {audio, name:name || 'عينة صوتية'};
    $('clone-sample-name').textContent = reference.name;
    $('clone-sample-duration').textContent = formatTime(audio.duration);
    const end = Math.floor(audio.duration * 1000) / 1000;
    $('clone-start').max = end;
    $('clone-end').max = end;
    $('clone-start').value = '0';
    $('clone-end').value = Math.min(20, end);
    previewURL = URL.createObjectURL(file);
    player.src = previewURL;
    status('');
  } catch (error) {
    if (selection === currentSelection) status(error.message);
  } finally {
    if (selection === currentSelection) updateControls();
  }
}

function getBounds() {
  if (!reference) throw new Error(label.missing);
  return referenceBounds(reference.audio.duration, $('clone-start').valueAsNumber, $('clone-end').valueAsNumber);
}

async function renderReference() {
  const {start, length} = getBounds();
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const offline = new Offline(2, Math.round(length * 48000), 48000);
  const source = offline.createBufferSource();
  source.buffer = reference.audio;
  source.connect(offline.destination);
  source.start(0, start, length);
  const buffer = await offline.startRendering();
  const channel = buffer.getChannelData(0);
  const meanSquare = channel.reduce((sum, value) => sum + value * value, 0) / channel.length;
  if (meanSquare < 0.000001) throw new Error('العينة صامتة تقريبًا. اختر جزءًا فيه كلام واضح.');
  return buffer;
}

function resetWorker() {
  worker?.terminate();
  worker = null;
}

function endRun(message) {
  run = null;
  updateControls();
  status(message);
}

function prepareSelectedNarration() {
  const mode = $('clone-narration-mode').value;
  if (mode === 'original') return null;
  const plan = prepareNarration($('clone-text').value, mode);
  $('clone-speech-preview').value = plan.speechText;
  $('clone-narration-status').textContent = 'جُهّز نص النطق. راجع الأسماء، ثم استمع إلى الصوت الناتج للتحقق من النبرة والحروف.';
  return plan;
}

function resetNarrationPreparation() {
  $('clone-narration-tools').hidden = $('clone-narration-mode').value === 'original';
  $('clone-speech-preview').value = '';
  $('clone-narration-brief').value = '';
  $('clone-narration-brief-label').hidden = true;
  $('clone-narration-status').textContent = '';
}

export function initLocalClone(saveGeneration) {
  const requestedPreset = new URLSearchParams(location.search).get('preset');
  if (requestedPreset === 'qisas-riwayat') $('clone-narration-mode').value = 'qisas-msa';
  resetNarrationPreparation();
  $('clone-narration-mode').addEventListener('change', resetNarrationPreparation);
  $('clone-text').addEventListener('input', resetNarrationPreparation);
  $('clone-prepare-narration').addEventListener('click', () => {
    try {prepareSelectedNarration();} catch (error) {$('clone-narration-status').textContent = error.message;}
  });
  $('clone-narration-brief-button').addEventListener('click', () => {
    try {
      const plan = prepareSelectedNarration();
      if (!plan) return;
      $('clone-narration-brief').value = narrationBrief(plan);
      $('clone-narration-brief-label').hidden = false;
      $('clone-narration-brief').focus();
      $('clone-narration-brief').select();
    } catch (error) {$('clone-narration-status').textContent = error.message;}
  });
  $('clone-narration-plan').addEventListener('click', () => {
    try {
      const plan = prepareSelectedNarration();
      if (plan) download(new Blob([JSON.stringify(narrationDownload(plan), null, 2)], {type:'application/json'}), 'qisas-riwayat-voice-plan.json');
    } catch (error) {$('clone-narration-status').textContent = error.message;}
  });

  const sampleAudio = $('clone-sample-audio');
  sampleAudio.addEventListener('play', () => {
    if (sampleAudio.currentTime < Number($('clone-start').value) || sampleAudio.currentTime >= Number($('clone-end').value)) {
      sampleAudio.currentTime = Number($('clone-start').value);
    }
  });
  sampleAudio.addEventListener('timeupdate', () => {
    if (!sampleAudio.paused && sampleAudio.currentTime >= Number($('clone-end').value)) sampleAudio.pause();
  });
  $('clone-file').addEventListener('change', event => {
    $('clone-saved').value = '';
    void selectCloneReference(event.target.files[0]);
    event.target.value = '';
  });
  $('clone-saved').addEventListener('change', async event => {
    if (!event.target.value) return;
    const capture = await localDB.get('captures', event.target.value).catch(() => null);
    if (capture) await selectCloneReference(capture.blob, capture.name);
  });
  $('clone-text').addEventListener('input', updateControls);
  $('clone-permission').addEventListener('change', updateControls);
  $('clone-save-sample').addEventListener('click', async () => {
    const button = $('clone-save-sample');
    button.disabled = true;
    try {
      const name = reference.name;
      if (!$('clone-permission').checked) throw new Error(label.permission);
      const buffer = await renderReference();
      const id = crypto.randomUUID();
      await localDB.put('captures', {id, name, blob:encodeWav(buffer), duration:buffer.duration, createdAt:new Date().toISOString(), transcript:''});
      await refreshCloneReferences(id);
      status(label.saved);
    } catch (error) {
      status(error.message);
    } finally {
      updateControls();
    }
  });
  $('clone-cancel').addEventListener('click', () => {
    resetWorker();
    endRun(label.stopped);
  });
  $('clone-download').addEventListener('click', () => {
    if (resultBlob) download(resultBlob, resultFilename);
  });
  $('clone-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (run || !reference || !$('clone-permission').checked) return;
    const text = $('clone-text').value.trim();
    if (!text) return;
    let plan;
    try {plan = prepareSelectedNarration();} catch (error) {status(error.message); return;}
    const speechText = plan?.speechText ?? text;
    const task = {text, speechText, plan, name:reference.name};
    run = task;
    updateControls();
    status(label.preparing, null);
    try {
      const buffer = await renderReference();
      if (run !== task) return;
      const pcm = new Float32Array(buffer.length * 2);
      pcm.set(buffer.getChannelData(0), 0);
      pcm.set(buffer.getChannelData(1), buffer.length);
      worker ??= new Worker(new URL('./local-clone-worker.mjs', import.meta.url), {type:'module'});
      worker.onerror = () => {
        resetWorker();
        endRun(label.loadFailed);
      };
      worker.onmessage = async ({data}) => {
        if (run !== task) return;
        if (data.type === 'download') status(label.loading, Math.min(100, data.loaded * 100 / data.total));
        if (data.type === 'encoding') status(label.encoding, null);
        if (data.type === 'generating') status(label.rendering + ' — ' + data.index + '/' + data.total, (data.index - 1) * 100 / data.total);
        if (data.type === 'error') {
          if (data.stage === 'load') resetWorker();
          console.error('MOSS-TTS:', data.detail);
          endRun(data.stage === 'load' ? label.loadFailed : label.generateFailed);
        }
        if (data.type === 'result') {
          const {output, sampleRate} = data;
          const duration = output[0].length / sampleRate;
          resultBlob = encodeWav({numberOfChannels:output.length, length:output[0].length, sampleRate, getChannelData:index=>output[index]});
          if (resultURL) URL.revokeObjectURL(resultURL);
          resultURL = URL.createObjectURL(resultBlob);
          $('clone-result-audio').src = resultURL;
          $('clone-result-duration').textContent = formatTime(duration);
          $('clone-result').hidden = false;
          resultFilename = task.plan ? 'qisas-riwayat-voice-clone.wav' : 'sawtak-voice-clone.wav';
          const meta = {id:'local-'+crypto.randomUUID(), kind:'generation', blob:resultBlob, text, profile_name:task.name,
            engine:'MOSS-TTS-Nano', language:task.plan ? 'ar' : getUILocale(),
            ...(task.plan ? {narration_profile:task.plan.mode, speech_text:task.speechText, pronunciation_edits:task.plan.pronunciationEdits, text_preparation:task.plan.preparation} : {}), status:'completed', duration, created_at:new Date().toISOString(), is_favorited:false};
          try {
            await saveGeneration(meta);
            if (run === task) endRun(label.ready);
          } catch {
            if (run === task) endRun(label.unsaved);
          }
        }
      };
      status(label.loading, null);
      worker.postMessage({type:'generate', pcm, text:speechText}, [pcm.buffer]);
    } catch (error) {
      if (run === task) endRun(error.message);
    }
  });
  updateControls();
}

export function setCloneText(text, mode = 'original') {
  $('clone-text').value = text;
  $('clone-narration-mode').value = Object.hasOwn(narrationModes, mode) ? mode : 'original';
  resetNarrationPreparation();
  updateControls();
}

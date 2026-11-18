import {saveOriginalFile,saveExtractedText,recordExtractionFailure,linkStoredAttachment,readStoredOriginal,readableImportedSource} from './studio-file-store.mjs?v=20261118-recovery1';
import {createSavedAttachmentsView} from './studio-file-archive.mjs?v=20261118-recovery1';
import { importManuscriptFile, parseManuscriptText, normalizeSpokenManuscript, prepareImportedDocument, summarizeImportedDocument } from './manuscript-import.mjs?v=20261117-voice1';

const kinds = {
  film: 'فيلم',
  series: 'مسلسل',
  play: 'مسرحية',
  'book-ar': 'كتاب عربي',
  'book-en': 'كتاب إنجليزي',
};

const metricLabels = {
  units: 'حلقات / فصول', scenes: 'مشاهد', characters: 'شخصيات', dialogues: 'حوارات', actions: 'وصف وعناصر',
  chapters: 'فصول', paragraphs: 'فقرات', headings: 'عناوين', words: 'كلمات',
};
const number = new Intl.NumberFormat('ar-KW');

export function describeStudioNetworkFailure(failure, creating = false) {
  if (failure?.name === 'AbortError') return failure;
  const raw = String(failure?.message || '');
  const isConnectionError = failure instanceof TypeError || /failed to fetch|load failed|networkerror|network request failed/iu.test(raw);
  const timedOut = failure?.name === 'TimeoutError';
  if (!isConnectionError && !timedOut) return failure;
  return new Error(creating
    ? 'انقطع الاتصال أثناء طلب الإنشاء. ربما حُفظ المشروع بالفعل؛ اضغط «إعادة الاتصال وتحديث أعمالي» وتحقق من القائمة قبل تكرار الإنشاء.'
    : timedOut
      ? 'تأخر رد خادم الأعمال. اضغط «إعادة الاتصال وتحديث أعمالي» للتحقق من حالة المشاريع.'
      : 'تعذر الاتصال بخادم الأعمال. اضغط «إعادة الاتصال وتحديث أعمالي»؛ إذا استمر العطل فقد تكون البوابة غير متاحة.');
}

export function createStudioWorks({ React, Studio }) {
  const h = React.createElement;
  const SavedAttachments=createSavedAttachmentsView(React);
  return function StudioWorks({ account, requestStudio, onSignOut }) {
    const [verified, setVerified] = React.useState(null);
    const [projects, setProjects] = React.useState(null);
    const [active, setActive] = React.useState(null);
    const [tab, setTab] = React.useState('works');
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [newWork, setNewWork] = React.useState(false);
    const [reload, setReload] = React.useState(0);
    const [deleteTarget, setDeleteTarget] = React.useState(null);
    const [title, setTitle] = React.useState('');
    const [kind, setKind] = React.useState('');
    const [createMode, setCreateMode] = React.useState('text');
    const [importAttachment,setImportAttachment]=React.useState(null);
    const [importPlan, setImportPlan] = React.useState(null);
    const [importBusy, setImportBusy] = React.useState(false);
    const [draftText, setDraftText] = React.useState('');
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [recordState, setRecordState] = React.useState('idle');
    const [recordSeconds, setRecordSeconds] = React.useState(0);
    const fileInput = React.useRef(null);
    const microphone = React.useRef(null);
    const recordingEpoch = React.useRef(0);

    async function safeStudioRequest(path, options, creating = false) {
      try { return await requestStudio(path, options); }
      catch (failure) { throw describeStudioNetworkFailure(failure, creating); }
    }

    async function request(payload, signal) {
      const response = await safeStudioRequest('/api/projects', {
        signal,
        ...(payload ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) } : {}),
      }, payload?.action === 'create');
      if (response.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const result = await response.json().catch(() => { throw new Error('استجاب الخادم بصيغة غير صالحة. أعد الاتصال وتحديث أعمالك.'); });
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل الأعمال.');
      return result;
    }

    function applyCatalogue(result) {
      if (result.account?.id !== account.id || !Array.isArray(result.projects)) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('تعذر التحقق من الحساب.');
      }
      setVerified({ id: result.account.id, username: result.account.username || account.username });
      setProjects(result.projects);
    }

    function choose(id) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set('work', id);
      else url.searchParams.delete('work');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      setDeleteTarget(null);
      setActive(id);
    }

    function releaseMicrophone(discard = true) {
      const capture = microphone.current;
      if (discard) recordingEpoch.current++;
      microphone.current = null;
      if (capture) {
        clearInterval(capture.interval);
        clearTimeout(capture.limitTimer);
        if (discard) capture.discard = true;
        try { if (capture.recorder.state !== 'inactive') capture.recorder.stop(); } catch {}
        capture.stream.getTracks().forEach(track => track.stop());
      }
      setRecordState(discard ? 'idle' : 'processing');
    }

    function clearImport() {
      setImportPlan(null);setImportAttachment(null);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
    }

    function selectTab(next) {
      setTab(next);
      setDeleteTarget(null);
      if (next === 'archive') {
        releaseMicrophone();
        setNewWork(false);
      }
    }

    function resetCreateForm() {
      releaseMicrophone();
      setTitle('');
      setKind('');
      setDraftText('');
      setCreateMode('text');
      clearImport();
      setRecordSeconds(0);
    }

    function toggleNewWork() {
      if (newWork) resetCreateForm();
      setNewWork(value => !value);
      setError('');
      setNotice('');
    }

    function chooseCreateMode(mode) {
      if (mode !== 'voice') releaseMicrophone();
      clearImport();
      setCreateMode(mode);
      setError('');
      setNotice('');
    }

    async function startRecording() {
      if (busy || importBusy || microphone.current || recordState === 'requesting') return;
      setCreateMode('voice');
      setNewWork(true);
      clearImport();
      setError('');
      setNotice('');
      setRecordSeconds(0);
      const epoch = ++recordingEpoch.current;
      setRecordState('requesting');
      let stream;
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== 'function') {
          throw new Error('هذا المتصفح لا يدعم التسجيل المباشر. جرّب Chrome أو ارفع ملفًا صوتيًا.');
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (epoch !== recordingEpoch.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];
        const mimeType = types.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const capture = { recorder, stream, chunks: [], bytes: 0, discard: false, interval: null, limitTimer: null };
        microphone.current = capture;
        recorder.ondataavailable = event => {
          if (capture.discard || !event.data?.size) return;
          capture.bytes += event.data.size;
          capture.chunks.push(event.data);
          if (capture.bytes > 7_800_000) {
            setNotice('بلغ التسجيل الحد المسموح؛ سيبدأ تحليل الجزء المسجل.');
            if (recorder.state !== 'inactive') recorder.stop();
          }
        };
        recorder.onerror = () => {
          setError('تعذر تسجيل الصوت. يمكنك رفع تسجيل محفوظ بدلاً منه.');
          releaseMicrophone();
        };
        recorder.onstop = () => {
          clearInterval(capture.interval);
          clearTimeout(capture.limitTimer);
          stream.getTracks().forEach(track => track.stop());
          if (microphone.current === capture) microphone.current = null;
          if (capture.discard || epoch !== recordingEpoch.current) return;
          setRecordState('processing');
          const type = recorder.mimeType || mimeType || 'audio/webm';
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
          const blob = new Blob(capture.chunks, { type });
          if (blob.size < 250) {
            setRecordState('idle');
            setError('التسجيل قصير جدًا أو لا يحتوي صوتًا. سجّل مرة أخرى.');
            return;
          }
          const audio = new File([blob], 'تسجيل-مشروع.' + ext, { type });
          void inspectFile(audio);
        };
        recorder.start(500);
        setRecordState('recording');
        const started = Date.now();
        capture.interval = setInterval(() => setRecordSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
        capture.limitTimer = setTimeout(() => {
          if (microphone.current === capture && recorder.state !== 'inactive') {
            setNotice('اكتملت ٣ دقائق من التسجيل. يُحلل التسجيل الآن؛ يمكنك إضافة بقية المشاهد لاحقًا.');
            recorder.stop();
          }
        }, 180_000);
      } catch (failure) {
        stream?.getTracks().forEach(track => track.stop());
        if (epoch === recordingEpoch.current) {
          setRecordState('idle');
          setError(failure?.name === 'NotAllowedError' ? 'اسمح باستخدام الميكروفون من إعدادات المتصفح ثم جرّب مجددًا.'
            : failure?.message || 'تعذر فتح الميكروفون.');
        }
      }
    }

    function stopRecording() {
      const capture = microphone.current;
      if (capture?.recorder.state === 'recording') {
        setRecordState('processing');
        capture.recorder.stop();
      }
    }

    React.useEffect(() => () => {
      recordingEpoch.current++;
      const capture = microphone.current;
      if (capture) {
        capture.discard = true;
        clearInterval(capture.interval);
        clearTimeout(capture.limitTimer);
        try { if (capture.recorder.state !== 'inactive') capture.recorder.stop(); } catch {}
        capture.stream.getTracks().forEach(track => track.stop());
        microphone.current = null;
      }
    }, []);

    async function extractUploadedFile(file, { media = false } = {}) {
      const payload = new FormData();
      if (media) {
        payload.set('audio', file, file.name);
        payload.set('language', 'ar');
        payload.set('names', '');
      } else payload.set('file', file, file.name);
      const response = await safeStudioRequest(media ? '/api/transcribe' : '/api/import-document', {
        method: 'POST', body: payload, signal: AbortSignal.timeout(media ? 120000 : 180000),
      });
      if (response.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const result = await response.json().catch(() => { throw new Error('تعذر قراءة رد محرك التحليل. تأكد من اتصال الخادم وأعد المحاولة.'); });
      if (!response.ok) throw new Error(result.error || (response.status === 413
        ? 'حجم الملف أكبر من المسموح.'
        : 'تعذر تحليل الملف. تحقق من صيغة الملف ثم أعد المحاولة.'));
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('لم يُعثر على نص قابل للقراءة داخل الملف.');
      return {
        text: result.text,
        format: media ? 'تفريغ تسجيل صوتي' : (result.format || 'نص مستخرج'),
        warnings: media ? ['استُخرج النص من التسجيل آليًا؛ راجع أسماء الشخصيات وعلامات الحوار قبل الحفظ.'] : result.warnings,
      };
    }

    async function inspectFile(file, savedAttachment=null) {
      if (!file) { setError('اختر ملفًا لبدء التحليل.'); return; }
      if (busy || importBusy) return;
      setSelectedFile(file);
      setImportPlan(null);setImportAttachment(null);
      setImportBusy(true);
      setError('');
      setNotice('');
      let original;
      try {
        original=savedAttachment||await saveOriginalFile(file,(path,options)=>window.__STUDIO_REQUEST__(path,options),{onProgress:setNotice});setImportAttachment(original);
        const plan = await importManuscriptFile(file, { extractFile: extractUploadedFile });
        if(!savedAttachment||savedAttachment.textState!=='ready')await saveExtractedText(original.id,{text:readableImportedSource(plan),format:plan.format},(path,options)=>window.__STUDIO_REQUEST__(path,options));
        setImportPlan(plan);
        setTitle(previous => previous.trim() || (plan.title.startsWith('تسجيل-') ? 'مشروع صوتي جديد' : plan.title));
        setKind(previous => previous || plan.recommendedKind);
        setNotice((savedAttachment?'النسخة المحفوظة جاهزة لإعادة الاستخدام. ':'حُفظ الملف الأصلي والنص المستخرج في حسابك. ')+'اكتمل استخراج المحتوى وتوزيعه. راجع عدد الحلقات والمشاهد والشخصيات والحوارات ثم أنشئ المشروع.');
      } catch (failure) {
        if(original){if(!savedAttachment)await recordExtractionFailure(original.id,failure,(path,options)=>window.__STUDIO_REQUEST__(path,options));setError((original.originalSaved?'الأصل محفوظ':'النسخة المستعادة محفوظة')+' في «ملفاتي المرفوعة». '+(failure.message||'لم يكتمل التحليل.'));}else setError(failure.message||'لم يُؤكد حفظ الملف الأصلي. أعد المحاولة.');
      } finally {
        setImportBusy(false);
        setRecordState('idle');
      }
    }

    function inspectWrittenText() {
      setError('');
      try {
        if (!draftText.trim()) throw new Error('اكتب محتوى العمل أو اختر «إنشاء المشروع» للبدء بمشروع فارغ.');
        const parsed = parseManuscriptText(normalizeSpokenManuscript(draftText), {
          fileName: 'نص المشروع', preferredKind: kind || undefined, format: 'كتابة مباشرة',
        });
        setImportPlan(parsed);
        setTitle(previous => previous.trim() || parsed.title);
        setKind(previous => previous || parsed.recommendedKind);
        setNotice('تم تقسيم النص إلى أقسام ومشاهد وشخصيات. يمكنك مراجعته قبل الإنشاء.');
      } catch (failure) { setImportPlan(null);setImportAttachment(null); setError(failure.message || 'تعذر تحليل النص.'); }
    }

    async function writeImportedManuscript(projectId, document, format) {
      const path = '/api/manuscript?work=' + encodeURIComponent(projectId);
      const initialResponse = await safeStudioRequest(path, { cache: 'no-store', signal: AbortSignal.timeout(60000) });
      if (initialResponse.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const initial = await initialResponse.json();
      if (!initialResponse.ok || !Number.isSafeInteger(initial.revision)) throw new Error(initial.error || 'تعذر تجهيز مساحة الملف.');
      const savedResponse = await safeStudioRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ doc: document, revision: initial.revision, snapshot: 'الاستيراد الأولي من ' + format }),
      });
      if (savedResponse.status === 401) {
        window.dispatchEvent(new Event('studio-session-expired'));
        throw new Error('انتهت جلسة الدخول.');
      }
      const saved = await savedResponse.json();
      if (!savedResponse.ok || saved.revision !== initial.revision + 1 || !saved.updatedAt) throw new Error(saved.error || 'لم يؤكد الخادم حفظ النص المستورد.');
      return saved;
    }

    async function createProject() {
      setBusy(true);
      setError('');
      setNotice('');
      let createdId = '';
      try {
        const writtenPlan = createMode === 'text' && draftText.trim()
          ? parseManuscriptText(normalizeSpokenManuscript(draftText), {
              fileName: 'كتابة مباشرة', preferredKind: kind || undefined, format: 'كتابة مباشرة',
            }) : null;
        if ((createMode === 'file' || createMode === 'voice') && !importPlan) {
          throw new Error(createMode === 'voice' ? 'سجّل صوتك وأوقف التسجيل وانتظر التفريغ والتحليل أولًا.' : 'ارفع الملف وانتظر اكتمال تحليله أولًا.');
        }
        const plan = createMode === 'text' ? writtenPlan : importPlan;
        const resolvedKind = kind || plan?.recommendedKind;
        const resolvedTitle = title.trim() || (plan?.title || '').trim();
        if (!resolvedTitle || !kinds[resolvedKind]) throw new Error('أدخل عنوان المشروع واختر نوعه.');
        const document = plan ? prepareImportedDocument(plan, { title: resolvedTitle, kind: resolvedKind }) : null;
        const result = await request({ action: 'create', title: resolvedTitle, kind: resolvedKind }, AbortSignal.timeout(60000));
        if (!result.id) throw new Error('لم يُرجع الخادم معرّف المشروع الجديد.');
        createdId = result.id;
        if (document) await writeImportedManuscript(createdId, document, plan.format);
        if(importAttachment?.id)await linkStoredAttachment(importAttachment.id,createdId,(path,options)=>window.__STUDIO_REQUEST__(path,options));
        const current = await request(null, AbortSignal.timeout(60000));
        applyCatalogue(current);
        setNewWork(false);
        resetCreateForm();
        choose(createdId);
      } catch (failure) {
        if (createdId) {
          setError('أنشئ المشروع، لكن لم يُؤكد إكمال الاستيراد أو تحديث القائمة. أعد الاتصال وراجع المشروع قبل إعادة المحاولة.');
          setNotice('لم يُحذف المشروع تلقائيًا حفاظًا على محتواه إذا كان الحفظ قد اكتمل.');
        } else {
          setError(failure.message || 'تعذر إنشاء المشروع. حاول مرة أخرى.');
        }
      } finally { setBusy(false); }
    }

    const previewMetrics = React.useMemo(() => {
      if (!importPlan) return null;
      try {
        return summarizeImportedDocument(prepareImportedDocument(importPlan, { title: importPlan.title, kind: kind || importPlan.recommendedKind }));
      } catch { return importPlan.metrics; }
    }, [importPlan, kind]);

    React.useEffect(() => {
      const controller = new AbortController();
      setError('');
      request(null, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        applyCatalogue(result);
        // The authenticated entry always starts at "أعمالي", even when an
        // old link or a previous editor session left a ?work= parameter.
        const landing = new URL(window.location.href);
        if (landing.searchParams.has('work')) {
          landing.searchParams.delete('work');
          window.history.replaceState(null, '', landing.pathname + landing.search + landing.hash);
        }
      }).catch(failure => { if (!controller.signal.aborted) setError(describeStudioNetworkFailure(failure).message || 'تعذر تحميل أعمالك. حاول مرة أخرى.'); });
      return () => controller.abort();
    }, [requestStudio, reload]);

    async function change(payload) {
      setBusy(true);
      setError('');
      setNotice('');
      try {
        const result = await request(payload, AbortSignal.timeout(60000));
        if (payload.action === 'delete') {
          if (result.id !== payload.id) throw new Error('تعذر التحقق من حذف المشروع.');
          setProjects(items => items.filter(work => work.id !== payload.id));
          setDeleteTarget(null);
          setNotice('تم حذف المشروع.');
          return;
        }
        const current = await request(null, AbortSignal.timeout(60000));
        applyCatalogue(current);
        setDeleteTarget(null);
        if (payload.action === 'create') {
          setNewWork(false);
          choose(result.id);
        }
      } catch (failure) {
        setError(failure.message || 'تعذر تحديث العمل. حاول مرة أخرى.');
      } finally { setBusy(false); }
    }

    if (active && verified) return h(Studio, {
      key: verified.id + ':' + active,
      requestedWork: active,
      userKey: verified.id === 'owner' ? 'external-private-owner' : 'external-studio:' + verified.id,
      onSignOut,
      // Keep the outer work selection authoritative when switching inside an editor.
      onSelectedWork: id => { if (typeof id === 'string' && id.trim()) choose(id); },
      onWorks: () => { choose(null); setReload(value => value + 1); },
    });

    const archive = tab === 'archive';
    const visible = projects?.filter(work => Boolean(work.archivedAt) === archive) ?? [];
    const username = verified?.username || account.username;
    const review = importPlan && h('article', { className: 'workspace-import-summary', 'aria-label': 'نتيجة تحليل المحتوى' },
      h('div', { className: 'workspace-import-heading' },
        h('div', null,
          h('strong', { dir: 'auto' }, importPlan.fileName || 'نص مكتوب'),
          h('small', null, importPlan.format, ' · النوع المكتشف: ', kinds[importPlan.recommendedKind])),
        h('button', { type: 'button', disabled: busy || importBusy, onClick: clearImport, 'aria-label': 'إزالة التحليل' }, 'إزالة التحليل')),
      h('dl', { className: 'workspace-import-metrics' }, Object.entries(previewMetrics || importPlan.metrics).map(([key, value]) =>
        h('div', { key }, h('dt', null, metricLabels[key] || key), h('dd', null, number.format(value))))),
      importPlan.warnings.map((warning, index) => h('p', { key: index, className: 'workspace-import-warning' }, warning)),
      kind && kind !== importPlan.recommendedKind && h('p', { className: 'workspace-import-note' },
        'سيُعاد توزيع المحتوى وفق نوع المشروع الذي اخترته عند الإنشاء.'),
      h('p', { className: 'workspace-import-note' },
        'النص المستخرج يخضع لمراجعتك قبل الحفظ. لا تُطبّق مسارات الكتابة الإبداعية إلا بطلبك.'));
    return h('main', { className: 'studio-workspaces', dir: 'rtl' },
      h('header', { className: 'workspace-header' },
        h('h1', null, 'استيديو الكتابة'),
        h('div', { className: 'workspace-account', role: 'group', 'aria-label': 'الحساب الحالي' },
          username && h('div', { className: 'workspace-identity' },
            h('span', null, 'اسم المستخدم'),
            h('bdi', null, username)),
          h('button', { type: 'button', className: 'workspace-sign-out', onClick: onSignOut }, 'تسجيل الخروج'))),
      h('nav', { 'aria-label': 'أقسام أعمالك' },
        h('button', { type: 'button', 'aria-pressed': !archive, disabled: busy, onClick: () => selectTab('works') }, 'أعمالي'),
        h('button', { type: 'button', 'aria-pressed': archive, disabled: busy, onClick: () => selectTab('archive') }, 'الأرشيف'),
        !archive && projects && h('div', { className: 'workspace-new-actions', role: 'group', 'aria-label': 'إنشاء مشروع' },
          h('button', { type: 'button', className: 'workspace-primary', disabled: busy || importBusy,
            onClick: toggleNewWork }, newWork ? 'إغلاق' : 'مشروع جديد'),
          h('button', { type: 'button', className: 'workspace-mic-shortcut',
            disabled: busy || importBusy || recordState === 'requesting' || recordState === 'processing',
            title: 'بدء مشروع بتسجيل صوتي', 'aria-label': 'بدء مشروع بالميكروفون',
            onClick: () => recordState === 'recording' ? stopRecording() : void startRecording(),
          }, recordState === 'recording' ? '■ إيقاف الصوت' : '🎙️ تسجيل صوتي'))),
      h(SavedAttachments,{request:(path,options)=>window.__STUDIO_REQUEST__(path,options),disabled:busy||importBusy,onUse:async source=>{const file=await readStoredOriginal(source.savedAttachment||( {id:source.attachmentId,name:source.name,mime:'application/octet-stream'}),(path,options)=>window.__STUDIO_REQUEST__(path,options));setNewWork(true);setCreateMode('file');await inspectFile(file,source.savedAttachment);},onRetry:async item=>{const file=await readStoredOriginal(item,(path,options)=>window.__STUDIO_REQUEST__(path,options));setNewWork(true);setCreateMode('file');await inspectFile(file,item);}}),
      error && h('p', { role: 'alert' }, error),
      error && projects && h('button', {
        type: 'button', disabled: busy || importBusy,
        onClick: () => setReload(value => value + 1),
      }, 'إعادة الاتصال وتحديث أعمالي'),
      notice && h('p', { role: 'status' }, notice),
      !projects && (error
        ? h('button', { type: 'button', onClick: () => setReload(value => value + 1) }, 'إعادة المحاولة')
        : h('p', { role: 'status' }, 'جارٍ فتح مساحة أعمالك…')),
      newWork && !archive && h('form', { className: 'workspace-create', 'aria-busy': busy || importBusy, onSubmit: event => {
        event.preventDefault();
        void createProject();
      } },
      h('fieldset', { className: 'workspace-create-mode', disabled: busy || importBusy || recordState === 'recording' },
        h('legend', null, 'كيف تريد بدء المشروع؟'),
        h('button', { type: 'button', 'aria-pressed': createMode === 'text',
          onClick: () => chooseCreateMode('text') }, '✍️ كتابة'),
        h('button', { type: 'button', 'aria-pressed': createMode === 'file',
          onClick: () => chooseCreateMode('file') }, '📎 رفع ملف'),
        h('button', { type: 'button', 'aria-pressed': createMode === 'voice',
          onClick: () => chooseCreateMode('voice') }, '🎙️ تسجيل صوتي')),
      createMode === 'text' && h('section', { className: 'workspace-written', 'aria-label': 'كتابة نص المشروع' },
        h('label', { htmlFor: 'workspace-draft' }, 'اكتب فكرة العمل أو الحلقات والمشاهد والحوارات (اختياري)'),
        h('textarea', { id: 'workspace-draft', rows: 7, dir: 'auto', maxLength: 200000,
          placeholder: 'مثال: عنوان المشروع: خارج الستوري\nالحلقة الأولى\nالمشهد الأول - داخلي - المنزل - ليل\nعواطف: وين فاطمة؟\nوصف: تدخل فاطمة إلى الغرفة.',
          value: draftText, disabled: busy || importBusy, onChange: event => {
            setDraftText(event.target.value);
            setImportPlan(null);setImportAttachment(null);
          } }),
        h('button', { type: 'button', disabled: busy || importBusy || !draftText.trim(),
          onClick: inspectWrittenText }, 'تحليل النص وتوزيعه'),
        review,
        h('p', { className: 'workspace-import-note' },
          'يمكنك أيضًا ترك النص فارغًا وبدء مشروع جديد للكتابة داخله.')),
      createMode === 'file' && h('section', { className: 'workspace-import', 'aria-label': 'استيراد ملف الكتابة' },
        h('div', { className: 'workspace-import-drop',
          onDragOver: event => event.preventDefault(),
          onDrop: event => { event.preventDefault(); if (!busy && !importBusy) void inspectFile(event.dataTransfer.files?.[0]); } },
          h('strong', null, importBusy ? 'جارٍ استخراج النص وتحليل الملف…' : 'ارفع ملف المشروع'),
          h('span', null, 'PDF وWord وملفات السيناريو والكتب والصور والتسجيلات'),
          h('button', { type: 'button', disabled: busy || importBusy,
            onClick: () => fileInput.current?.click() }, '📎 اختيار ملف من الجهاز'),
          h('input', { ref: fileInput, className: 'workspace-file-input', type: 'file',
            'aria-label': 'اختيار ملف المشروع',
            accept: '.pdf,.doc,.docx,.odt,.rtf,.wps,.epub,.pages,.ppt,.pptx,.odp,.key,.xls,.xlsx,.ods,.numbers,.fdx,.fountain,.txt,.md,.markdown,.html,.htm,.xml,.csv,.tsv,.srt,.vtt,.json,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,.heic,.mp3,.mp4,.m4a,.wav,.webm,.ogg,.mpeg,.mpga,application/pdf,text/*,image/*,audio/*,video/mp4',
            disabled: busy || importBusy, onChange: event => void inspectFile(event.target.files?.[0]) })),
        importBusy && h('p', { role: 'status' }, 'يُحلل الملف حاليًا، لا تغلق الصفحة.'),
        review,
        selectedFile && !importPlan && !importBusy && h('button', { type: 'button',
          onClick: () => void inspectFile(selectedFile) }, 'إعادة تحليل الملف'),
        !importPlan && !importBusy && h('p', { role: 'status', className: 'workspace-import-note' },
          'يلزم رفع ملف وتحليله لتفعيل «إنشاء المشروع واستيراد الملف».')),
      createMode === 'voice' && h('section', { className: 'workspace-import workspace-voice', 'aria-label': 'تسجيل صوت المشروع' },
        h('strong', null, '🎙️ إملاء الحلقات والمشاهد والحوارات'),
        h('p', { className: 'workspace-import-note' },
          'اذكر «الحلقة الأولى، المشهد الأول، وصف المشهد، حوار عواطف: ...» وسنحوّل الكلام إلى مشاهد وحوارات قابلة للتحرير.'),
        h('div', { className: 'workspace-record-controls' },
          recordState === 'recording'
            ? h('button', { type: 'button', className: 'workspace-record-stop', onClick: stopRecording }, '■ إيقاف التسجيل وتحليله')
            : h('button', { type: 'button', disabled: busy || importBusy || recordState !== 'idle',
              onClick: () => void startRecording() },
              recordState === 'requesting' ? 'جارٍ طلب إذن الميكروفون…' : recordState === 'processing' ? 'جارٍ تحضير التسجيل…' : '🎤 بدء التسجيل'),
          h('span', { role: 'status', 'aria-live': 'polite' },
            recordState === 'recording' ? '● تسجيل جارٍ ' + String(Math.floor(recordSeconds / 60)).padStart(2, '0') + ':' + String(recordSeconds % 60).padStart(2, '0')
              : importBusy ? 'جارٍ تفريغ الصوت وتحليل المشاهد…' : recordState === 'processing' ? 'جارٍ تجهيز الصوت…' : 'يمكن التسجيل حتى ٣ دقائق في كل مرة')),
        review,
        selectedFile && !importPlan && !importBusy && h('button', { type: 'button',
          onClick: () => void inspectFile(selectedFile) }, 'إعادة تفريغ الصوت دون تسجيل جديد'),
        h('p', { className: 'workspace-import-note' }, 'يمكنك مراجعة العنوان والنوع والتصنيف قبل إنشاء العمل.'),
        h('p', { className: 'workspace-import-note' }, 'التسجيل يحتاج إذن الميكروفون واتصالًا بخدمة التفريغ الخاصة بحسابك.')),

      h('label', null, 'عنوان المشروع', h('input', { name: 'title', dir: 'auto', required: true, maxLength: 250, disabled: busy || importBusy, value: title, onChange: event => setTitle(event.target.value) })),
      h('label', null, 'نوع المشروع', h('select', { name: 'kind', value: kind, required: true, disabled: busy || importBusy, onChange: event => setKind(event.target.value) },
        h('option', { value: '', disabled: true }, 'اختر نوع المشروع'),
        h('optgroup', { label: 'الأعمال الدرامية' }, ['film', 'series', 'play'].map(value => h('option', { key: value, value }, kinds[value]))),
        h('optgroup', { label: 'الكتب' }, ['book-ar', 'book-en'].map(value => h('option', { key: value, value }, kinds[value]))))),
      importPlan && createMode !== 'text' && h('p', { className: 'workspace-import-review' },
        'راجع الأعداد والتصنيف أعلاه؛ يمكنك تعديل المشروع بعد الاستيراد.'),
      h('button', { type: 'submit', className: 'workspace-primary',
        disabled: busy || importBusy || recordState !== 'idle' || (createMode !== 'text' && !importPlan) },
        busy ? 'جارٍ إنشاء المشروع وحفظ النص…'
          : createMode === 'file' ? 'إنشاء المشروع واستيراد الملف'
            : createMode === 'voice' ? 'إنشاء المشروع من التسجيل' : 'إنشاء المشروع')),
      projects && (visible.length
        ? h('ul', { 'aria-label': archive ? 'الأعمال المؤرشفة' : 'الأعمال الحالية' }, visible.map(work => {
          const confirming = deleteTarget === work.id;
          const promptId = 'workspace-delete-' + work.id;
          return h('li', { key: work.id },
            h('div', null, h('strong', { dir: 'auto' }, work.title), h('small', null, kinds[work.kind])),
            h('div', { className: 'workspace-actions' },
              !archive && h('button', { type: 'button', disabled: busy, onClick: () => choose(work.id) }, 'فتح'),
              h('button', { type: 'button', disabled: busy, 'aria-label': `${archive ? 'استعادة' : 'أرشفة'} ${work.title}`,
                onClick: () => void change({ action: archive ? 'restore' : 'archive', id: work.id }) }, archive ? 'استعادة' : 'أرشفة'),
              h('button', { type: 'button', className: 'workspace-danger', disabled: busy, 'aria-label': 'حذف ' + work.title,
                'aria-expanded': confirming, 'aria-controls': confirming ? promptId : undefined,
                onClick: () => setDeleteTarget(confirming ? null : work.id) }, 'حذف')),
            confirming && h('div', { id: promptId, className: 'workspace-delete-prompt', role: 'group', 'aria-labelledby': promptId + '-title' },
              h('p', { id: promptId + '-title' }, 'حذف مشروع «', h('bdi', null, work.title), '»؟'),
              h('p', null, 'سيُزال المشروع من أعمالك وأرشيفك.'),
              h('div', { className: 'workspace-actions' },
                h('button', { type: 'button', autoFocus: true, disabled: busy, onClick: () => setDeleteTarget(null) }, 'إلغاء'),
                h('button', { type: 'button', className: 'workspace-danger workspace-danger-confirm', disabled: busy,
                  onClick: () => void change({ action: 'delete', id: work.id }) }, 'تأكيد الحذف'))));
        }))
        : h('p', { className: 'workspace-empty' }, archive ? 'أرشيفك فارغ.' : 'ابدأ بإضافة أول عمل.')));
  };
}


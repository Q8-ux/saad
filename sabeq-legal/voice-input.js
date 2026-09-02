(() => {
  'use strict';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  let activeRecognition = null;
  let activeButton = null;
  let activeTarget = null;

  const isWritable = el => el && (
    el.matches('input:not([type]),input[type="text"],input[type="search"],textarea') ||
    el.isContentEditable
  );

  const isMemoContext = el => {
    const text = (el.closest('section,article,div,form')?.textContent || '').toLowerCase();
    return /مذكرة|المذكرات|memo|قضية|الوقائع|الطلبات|الخصم|المحكمة/.test(text);
  };

  function languageForPage() {
    const lang = (document.documentElement.lang || document.body?.dataset?.language || 'ar').toLowerCase();
    if (lang.startsWith('en')) return 'en-US';
    if (lang.startsWith('ur')) return 'ur-PK';
    return 'ar-KW';
  }

  function setReactValue(el, value, spokenText = '') {
    if (el.isContentEditable) {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: spokenText,
      }));
      return;
    }

    const prototype = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    const previous = el.value;

    if (setter) setter.call(el, value);
    else el.value = value;

    // React tracks controlled values internally. Restoring the prior tracker value
    // makes the following input event observable by React's onChange handler.
    if (el._valueTracker && typeof el._valueTracker.setValue === 'function') {
      el._valueTracker.setValue(previous);
    }

    try {
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertText',
        data: spokenText,
      }));
    } catch (_) {
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    el.focus();
    const end = value.length;
    try { el.setSelectionRange(end, end); } catch (_) {}
  }

  function setButtonListening(button, listening) {
    if (!(button instanceof HTMLElement)) return;
    button.classList.toggle('sabeq-mic-listening', listening);
    button.classList.toggle('is-recording', listening);
    button.setAttribute('aria-pressed', listening ? 'true' : 'false');
    button.setAttribute('aria-label', listening ? 'إيقاف التسجيل' : 'إدخال صوتي');
  }

  function stopActive() {
    try { activeRecognition?.stop(); } catch (_) {}
    if (activeButton) setButtonListening(activeButton, false);
    activeRecognition = null;
    activeButton = null;
    activeTarget = null;
  }

  function startDictation(target, button) {
    if (!isWritable(target)) return;

    if (activeRecognition) {
      if (activeTarget === target) {
        stopActive();
        return;
      }
      stopActive();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageForPage();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    const initialValue = target.isContentEditable ? (target.textContent || '') : target.value;
    const selectionStart = target.isContentEditable ? initialValue.length : (target.selectionStart ?? initialValue.length);
    const selectionEnd = target.isContentEditable ? initialValue.length : (target.selectionEnd ?? initialValue.length);
    const before = initialValue.slice(0, selectionStart);
    const after = initialValue.slice(selectionEnd);
    const spacerBefore = before && !/\s$/.test(before) ? ' ' : '';
    const spacerAfter = after && !/^\s/.test(after) ? ' ' : '';
    let latestTranscript = '';

    activeRecognition = recognition;
    activeButton = button;
    activeTarget = target;
    setButtonListening(button, true);

    recognition.onresult = event => {
      let finalPart = '';
      let interimPart = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalPart += transcript;
        else interimPart += transcript;
      }

      const spoken = `${finalPart}${interimPart}`.trim();
      if (!spoken) return;
      latestTranscript = spoken;
      const value = `${before}${spacerBefore}${spoken}${spacerAfter}${after}`;
      setReactValue(target, value, spoken);
    };

    recognition.onerror = event => {
      console.warn('SABEQ voice recognition error:', event.error);
      stopActive();
    };

    recognition.onend = () => {
      // Some WebKit builds finish with only an interim hypothesis. Because we
      // write each hypothesis as it arrives, the latest text remains visible.
      if (latestTranscript && activeTarget === target) {
        const value = `${before}${spacerBefore}${latestTranscript}${spacerAfter}${after}`;
        setReactValue(target, value, latestTranscript);
      }
      if (activeButton) setButtonListening(activeButton, false);
      activeRecognition = null;
      activeButton = null;
      activeTarget = null;
    };

    try {
      recognition.start();
    } catch (_) {
      stopActive();
    }
  }

  function addMic(el) {
    if (!isWritable(el) || el.dataset.sabeqMic === '1' || !isMemoContext(el)) return;
    if (el.closest('.voice-input')) return; // The memo UI already provides its own mic button.

    el.dataset.sabeqMic = '1';
    const wrapper = document.createElement('span');
    wrapper.className = 'sabeq-voice-field';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sabeq-mic-button';
    btn.setAttribute('aria-label', 'إدخال صوتي');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'إدخال البيانات بالصوت';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v7a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z"/></svg>';
    wrapper.appendChild(btn);
  }

  // Capture clicks before React's MediaRecorder handler. Where browser speech
  // recognition is available, dictation is written locally into the controlled
  // textarea instead of depending on a remote transcription request.
  document.addEventListener('click', event => {
    const source = event.target;
    if (!(source instanceof Element)) return;
    const button = source.closest('.voice-input button, .sabeq-mic-button');
    if (!(button instanceof HTMLButtonElement)) return;

    const container = button.closest('.voice-input, .sabeq-voice-field');
    const target = container?.querySelector('textarea,input[type="text"],input[type="search"],[contenteditable="true"]');
    if (!isWritable(target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    startDictation(target, button);
  }, true);

  const style = document.createElement('style');
  style.textContent = `.sabeq-voice-field{position:relative;display:block;width:100%}.sabeq-voice-field>input,.sabeq-voice-field>textarea{padding-inline-end:48px!important}.sabeq-mic-button{position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:1px solid rgba(36,166,213,.35);border-radius:9px;background:rgba(36,166,213,.1);display:grid;place-items:center;cursor:pointer;z-index:2}.sabeq-mic-button svg{width:19px;height:19px;fill:#2097c2}.sabeq-mic-button:hover{background:rgba(36,166,213,.18)}.sabeq-mic-listening{background:#c62828!important;border-color:#c62828!important;animation:sabeqPulse 1.1s infinite}.sabeq-mic-listening svg{fill:#fff!important}@keyframes sabeqPulse{50%{box-shadow:0 0 0 6px rgba(198,40,40,.14)}}textarea+.sabeq-mic-button{top:20px}`;
  document.head.appendChild(style);

  function scan(root = document) {
    root.querySelectorAll?.('input,textarea,[contenteditable="true"]').forEach(addMic);
  }

  const boot = () => {
    scan();
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        addMic(node);
        scan(node);
      }
    }))).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

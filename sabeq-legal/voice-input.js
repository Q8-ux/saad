(() => {
  'use strict';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  let activeRecognition = null;
  let activeButton = null;

  const isWritable = el => el && (el.matches('input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="tel"],input[type="number"],textarea') || el.isContentEditable);
  const isMemoContext = el => {
    const text = (el.closest('section,article,div,form')?.textContent || '').toLowerCase();
    return /مذكرة|المذكرات|memo|قضية|الوقائع|الطلبات|الخصم|المحكمة/.test(text);
  };

  function appendText(el, text) {
    if (el.isContentEditable) {
      el.focus();
      document.execCommand('insertText', false, text);
      el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:text}));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const spacer = before && !/\s$/.test(before) ? ' ' : '';
    const value = before + spacer + text + after;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.focus();
  }

  function stopActive() {
    try { activeRecognition?.stop(); } catch (_) {}
    activeRecognition = null;
    if (activeButton) {
      activeButton.classList.remove('sabeq-mic-listening');
      activeButton.setAttribute('aria-label','إدخال صوتي');
    }
    activeButton = null;
  }

  function startDictation(target, button) {
    if (activeRecognition) { stopActive(); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === 'en' ? 'en-US' : 'ar-KW';
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = '';
    activeRecognition = recognition;
    activeButton = button;
    button.classList.add('sabeq-mic-listening');
    button.setAttribute('aria-label','إيقاف التسجيل');

    recognition.onresult = event => {
      finalText = '';
      for (let i=event.resultIndex;i<event.results.length;i++) if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      if (finalText.trim()) appendText(target, finalText.trim());
    };
    recognition.onerror = () => stopActive();
    recognition.onend = () => stopActive();
    try { recognition.start(); } catch (_) { stopActive(); }
  }

  function addMic(el) {
    if (!isWritable(el) || el.dataset.sabeqMic === '1' || !isMemoContext(el)) return;
    if (el.matches('input[type="email"],input[type="tel"],input[type="number"]')) return;
    el.dataset.sabeqMic = '1';
    const wrapper = document.createElement('span');
    wrapper.className = 'sabeq-voice-field';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sabeq-mic-button';
    btn.setAttribute('aria-label','إدخال صوتي');
    btn.title = 'إدخال البيانات بالصوت';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v7a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-3.08A7 7 0 0 0 19 12h-2Z"/></svg>';
    btn.addEventListener('click', e => {e.preventDefault(); startDictation(el, btn);});
    wrapper.appendChild(btn);
  }

  const style = document.createElement('style');
  style.textContent = `.sabeq-voice-field{position:relative;display:block;width:100%}.sabeq-voice-field>input,.sabeq-voice-field>textarea{padding-inline-end:48px!important}.sabeq-mic-button{position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:1px solid rgba(36,166,213,.35);border-radius:9px;background:rgba(36,166,213,.1);display:grid;place-items:center;cursor:pointer;z-index:2}.sabeq-mic-button svg{width:19px;height:19px;fill:#2097c2}.sabeq-mic-button:hover{background:rgba(36,166,213,.18)}.sabeq-mic-listening{background:#c62828!important;border-color:#c62828!important;animation:sabeqPulse 1.1s infinite}.sabeq-mic-listening svg{fill:#fff!important}@keyframes sabeqPulse{50%{box-shadow:0 0 0 6px rgba(198,40,40,.14)}}textarea+.sabeq-mic-button{top:20px}`;
  document.head.appendChild(style);

  function scan(root=document) { root.querySelectorAll?.('input,textarea,[contenteditable="true"]').forEach(addMic); }
  const boot=()=>{scan();new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1){addMic(n);scan(n)}}))).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
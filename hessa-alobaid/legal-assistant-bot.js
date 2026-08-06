(() => {
  'use strict';

  const CHAT_KEY = 'hessaDashboardLegalBotHistoryV1';
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let voiceReplyEnabled = false;

  const ar = () => typeof state !== 'undefined' ? state.language !== 'en' : document.documentElement.lang !== 'en';
  const text = (arabic, english) => ar() ? arabic : english;

  function safe(value = '') {
    if (typeof esc === 'function') return esc(value);
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function loadHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CHAT_KEY));
      return Array.isArray(saved) ? saved.slice(-20) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    sessionStorage.setItem(CHAT_KEY, JSON.stringify(history.slice(-20)));
  }

  function improveArabicDictation(input) {
    let value = String(input || '').trim();
    if (!value) return '';

    const spokenPunctuation = [
      [/\s+(?:سطر جديد|فقرة جديدة)\s+/gi, '\n'],
      [/\s+(?:نقطتين|نقطتان)\s+/gi, ': '],
      [/\s+(?:فاصلة منقوطة)\s+/gi, '؛ '],
      [/\s+(?:علامة استفهام)\s*/gi, '؟ '],
      [/\s+(?:علامة تعجب)\s*/gi, '! '],
      [/\s+(?:فاصلة)\s+/gi, '، '],
      [/\s+(?:نقطة)\s+/gi, '. ']
    ];
    spokenPunctuation.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); });

    const corrections = [
      [/\bالمحكمه\b/g, 'المحكمة'],
      [/\bالقضيه\b/g, 'القضية'],
      [/\bالمذكره\b/g, 'المذكرة'],
      [/\bالجلسه\b/g, 'الجلسة'],
      [/\bالخبره\b/g, 'الخبرة'],
      [/\bالمسئوليه\b/g, 'المسؤولية'],
      [/\bالمسئولية\b/g, 'المسؤولية'],
      [/\bالوقايع\b/g, 'الوقائع'],
      [/\bالدعوي\b/g, 'الدعوى'],
      [/\bالمدعي عليه\b/g, 'المدعى عليه'],
      [/\bالمدعى علية\b/g, 'المدعى عليه'],
      [/\bالمدعي علية\b/g, 'المدعى عليه'],
      [/\bالطلبات الختاميه\b/g, 'الطلبات الختامية'],
      [/\bالدفوع القانونيه\b/g, 'الدفوع القانونية'],
      [/\bالمستندات المرفقه\b/g, 'المستندات المرفقة'],
      [/\bالخصومه\b/g, 'الخصومة'],
      [/\bالاستئناف\s+المقدم\s+ضده\b/g, 'المستأنف ضده'],
      [/\bالمستانف\b/g, 'المستأنف'],
      [/\bالمستانف ضده\b/g, 'المستأنف ضده'],
      [/\bالتمييز\s+المقدم\s+ضده\b/g, 'المطعون ضده'],
      [/\bالمحامي(?:ه)? حصة العبيد\b/g, 'المحامية حصة العبيد']
    ];
    corrections.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); });

    value = value
      .replace(/\b(?:أمم+|امم+|اااه+|اه+|يعني يعني|طيب طيب)\b/gi, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([،؛:؟!.])/g, '$1')
      .replace(/([،؛:؟!.])(?=[^\s\n])/g, '$1 ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (value && !/[.؟!]$/.test(value)) value += '.';
    return value;
  }

  function improveEnglishDictation(input) {
    let value = String(input || '').trim();
    if (!value) return '';
    value = value
      .replace(/\s+(new paragraph|new line)\s+/gi, '\n')
      .replace(/\s+comma\s+/gi, ', ')
      .replace(/\s+semicolon\s+/gi, '; ')
      .replace(/\s+colon\s+/gi, ': ')
      .replace(/\s+question mark\s*/gi, '? ')
      .replace(/\s+exclamation mark\s*/gi, '! ')
      .replace(/\s+full stop\s+/gi, '. ')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,;:?!\.])/g, '$1')
      .trim();
    if (value && !/[.?!]$/.test(value)) value += '.';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function improveDictation(value) {
    return ar() ? improveArabicDictation(value) : improveEnglishDictation(value);
  }

  function caseOptions() {
    if (typeof state === 'undefined' || !Array.isArray(state.cases)) return '';
    return state.cases.map((item) => `<option value="${safe(item.id)}">${safe(item.id)} — ${safe(item.title)}</option>`).join('');
  }

  function widgetMarkup() {
    return `
      <section class="dashboard-legal-bot" id="dashboardLegalBot" aria-label="${text('المساعد القانوني الذكي', 'Smart legal assistant')}">
        <header class="legal-bot-head">
          <div class="legal-bot-identity">
            <div class="legal-bot-avatar" aria-hidden="true"><span>⚖</span><i></i></div>
            <div>
              <p class="eyebrow">${text('مساعد مكتب حصة العبيد', 'Hessa Al-Obaid Office Assistant')}</p>
              <h2>${text('المساعد القانوني الذكي', 'Smart Legal Assistant')}</h2>
              <span class="legal-bot-online"><i></i>${text('جاهز للكتابة والإملاء الصوتي', 'Ready for typing and voice dictation')}</span>
            </div>
          </div>
          <div class="legal-bot-head-actions">
            <button class="legal-bot-icon-button" id="legalBotVoiceReply" type="button" aria-pressed="false" title="${text('قراءة الردود صوتيًا', 'Read replies aloud')}">🔊</button>
            <button class="legal-bot-icon-button" id="legalBotClear" type="button" title="${text('مسح المحادثة', 'Clear chat')}">⌫</button>
            <button class="legal-bot-expand" type="button" data-legal-bot-open-full>${text('فتح المساعد الكامل', 'Open full assistant')} ↗</button>
          </div>
        </header>

        <div class="legal-bot-controls">
          <label>
            <span>${text('ربط السؤال بقضية', 'Link question to a case')}</span>
            <select id="legalBotCase">
              <option value="">${text('سؤال عام — بدون قضية', 'General question — no case')}</option>
              ${caseOptions()}
            </select>
          </label>
          <div class="legal-bot-prompts" aria-label="${text('طلبات سريعة', 'Quick prompts')}">
            <button type="button" data-legal-prompt="summary">${text('لخّص القضية', 'Summarize case')}</button>
            <button type="button" data-legal-prompt="missing">${text('البيانات الناقصة', 'Missing information')}</button>
            <button type="button" data-legal-prompt="client-update">${text('تحديث للعميل', 'Client update')}</button>
            <button type="button" data-legal-prompt="memo-points">${text('نقاط مذكرة', 'Memo outline')}</button>
          </div>
        </div>

        <div class="legal-bot-chat" id="legalBotChat" aria-live="polite"></div>

        <form class="legal-bot-composer" id="legalBotForm">
          <textarea id="legalBotInput" rows="3" enterkeyhint="send" placeholder="${text('اكتب سؤالك القانوني أو اضغط الميكروفون للإملاء…', 'Type your legal question or tap the microphone to dictate…')}" required></textarea>
          <div class="legal-bot-dictation-status" id="legalBotDictationStatus" hidden></div>
          <div class="legal-bot-toolbar">
            <div class="legal-bot-tools">
              <button class="legal-bot-tool mic" id="legalBotMic" type="button" aria-pressed="false"><span>🎙</span><b>${text('إملاء صوتي', 'Voice dictation')}</b></button>
              <button class="legal-bot-tool" id="legalBotImprove" type="button"><span>✦</span><b>${text('تحسين الإملاء', 'Improve dictation')}</b></button>
              <label class="legal-bot-auto-improve"><input id="legalBotAutoImprove" type="checkbox" checked><span>${text('تحسين تلقائي', 'Auto improve')}</span></label>
            </div>
            <button class="legal-bot-send" type="submit"><span>${text('إرسال', 'Send')}</span><b>➤</b></button>
          </div>
          <p class="legal-bot-note">${text('يُراجع أي محتوى قانوني قبل اعتماده. الإملاء الصوتي يعتمد على دعم المتصفح وإذن الميكروفون.', 'Review all legal content before approval. Voice dictation depends on browser support and microphone permission.')}</p>
        </form>
      </section>`;
  }

  function getHistoryOrDefault() {
    const history = loadHistory();
    if (history.length) return history;
    return [{
      role: 'assistant',
      text: text(
        'مرحبًا بك. يمكنني تلخيص بيانات القضية، تحديد البيانات الناقصة، تجهيز نقاط مذكرة، وصياغة تحديث للعميل. اكتب طلبك أو استخدم الميكروفون.',
        'Welcome. I can summarize a case, identify missing information, prepare a memo outline, and draft a client update. Type or use the microphone.'
      )
    }];
  }

  function renderMessages(container, history) {
    container.innerHTML = history.map((item, index) => `
      <article class="legal-bot-message ${item.role}">
        <div class="legal-bot-message-avatar">${item.role === 'assistant' ? '⚖' : 'ح'}</div>
        <div class="legal-bot-message-body">
          <div>${safe(item.text).replace(/\n/g, '<br>')}</div>
          ${item.role === 'assistant' ? `<button type="button" class="legal-bot-speak" data-speak-index="${index}" title="${text('استماع للرد', 'Listen to reply')}">🔊</button>` : ''}
        </div>
      </article>`).join('');
    container.scrollTop = container.scrollHeight;
  }

  function memoOutline(caseId) {
    const item = typeof state !== 'undefined' ? state.cases.find((entry) => entry.id === caseId) : null;
    if (!item) return text('اختر قضية أولًا حتى أجهز نقاط المذكرة من بيانات الملف.', 'Select a case first so I can prepare the memo outline from its data.');
    const documents = state.documents.filter((entry) => entry.caseId === caseId);
    const sessions = state.sessions.filter((entry) => entry.caseId === caseId);
    return text(
      `نقاط مقترحة للمذكرة في القضية ${item.id}:\n1. الديباجة وتحديد المحكمة وصفات الخصوم.\n2. عرض الوقائع بتسلسل زمني دقيق.\n3. تحديد محل النزاع والطلبات المقابلة.\n4. ترتيب الدفوع الشكلية قبل الموضوعية.\n5. ربط كل دفع بالمستند المؤيد له.\n6. مناقشة مستندات الخصم والرد عليها.\n7. صياغة الطلبات الختامية بصورة محددة.\n\nالمسجل حاليًا: ${documents.length} مستندات و${sessions.length} جلسات.`,
      `Suggested memo outline for case ${item.id}:\n1. Heading, court, and party capacities.\n2. Chronological statement of facts.\n3. Define the dispute and opposing claims.\n4. Present procedural defenses before merits.\n5. Link each argument to supporting evidence.\n6. Address and rebut the opponent’s documents.\n7. State precise final requests.\n\nCurrently recorded: ${documents.length} documents and ${sessions.length} hearings.`
    );
  }

  function generalAnswer(prompt, caseId) {
    const normalized = String(prompt || '').trim();
    if (!normalized) return text('اكتب سؤالك أولًا.', 'Enter your question first.');

    if (/نقاط.*مذكر|مخطط.*مذكر|memo.*outline/i.test(normalized)) return memoOutline(caseId);

    if (typeof assistantResponse === 'function' && caseId) {
      if (/لخص|ملخص|summary/i.test(normalized)) return assistantResponse('summary', caseId, normalized);
      if (/ناقص|استكمال|missing/i.test(normalized)) return assistantResponse('missing', caseId, normalized);
      if (/زمني|تسلسل|timeline/i.test(normalized)) return assistantResponse('timeline', caseId, normalized);
      if (/عميل|تحديث|client/i.test(normalized)) return assistantResponse('client-update', caseId, normalized);
      return assistantResponse('', caseId, normalized);
    }

    if (!caseId && /قضي|ملف|جلس|موكل|خصم/i.test(normalized)) {
      return text('اختر القضية من القائمة حتى أجيب اعتمادًا على البيانات المسجلة في ملفها.', 'Select a case so I can answer using its recorded file data.');
    }

    if (/مذكرة|دفاع|رد|استئناف/i.test(normalized)) {
      return text('لبناء مذكرة متماسكة: حدّد المحكمة، صفات الأطراف، رقم القضية، الوقائع، الدفوع والأسانيد، ثم الطلبات الختامية. يمكنك الانتقال إلى مولد المذكرات لإخراج المسودة الكاملة.', 'For a coherent brief, specify the court, party capacities, case number, facts, arguments and authorities, then final requests. Open the Memo Generator for a full draft.');
    }

    if (/واتساب|رسالة|مراسلة/i.test(normalized)) {
      return text('يمكنني صياغة رسالة مهنية مختصرة للعميل. اذكر الغرض من الرسالة وحالة الملف، أو اختر قضية ثم اطلب «تحديث للعميل».', 'I can draft a concise professional client message. State the purpose and file status, or select a case and request a client update.');
    }

    return text(
      `تم استلام طلبك: «${normalized}». هذه النسخة تحلل بيانات النظام محليًا. للحصول على تحليل قانوني موسع للتشريعات والمستندات يلزم ربط المساعد بواجهة ذكاء اصطناعي آمنة وقاعدة القوانين.`,
      `Your request was received: “${normalized}”. This version analyzes local system data. Expanded legal analysis of legislation and documents requires a secure AI backend and legal corpus.`
    );
  }

  function speakReply(message) {
    if (!('speechSynthesis' in window) || !message) {
      if (typeof toast === 'function') toast(text('القراءة الصوتية غير مدعومة في هذا المتصفح', 'Speech output is not supported in this browser'));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = ar() ? 'ar-KW' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const selected = voices.find((voice) => voice.lang.toLowerCase().startsWith(ar() ? 'ar' : 'en'));
    if (selected) utterance.voice = selected;
    window.speechSynthesis.speak(utterance);
  }

  function initRecognition(input, status, micButton, autoImprove) {
    if (!SpeechRecognition) {
      micButton.disabled = true;
      micButton.title = text('الإملاء الصوتي غير مدعوم في هذا المتصفح', 'Voice dictation is not supported in this browser');
      micButton.classList.add('unsupported');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = ar() ? 'ar-KW' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let originalText = '';
    let finalText = '';

    recognition.onstart = () => {
      isListening = true;
      originalText = input.value.trim();
      finalText = '';
      micButton.classList.add('listening');
      micButton.setAttribute('aria-pressed', 'true');
      status.hidden = false;
      status.textContent = text('يتم الاستماع الآن… تحدث بوضوح، ويمكنك قول: فاصلة، نقطة، سطر جديد.', 'Listening… Speak clearly. You may say comma, full stop, or new line.');
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += `${transcript} `;
        else interim += transcript;
      }
      const combined = [originalText, finalText.trim(), interim.trim()].filter(Boolean).join(originalText ? ' ' : '');
      input.value = combined;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': text('تم رفض إذن الميكروفون. فعّل الإذن من إعدادات المتصفح.', 'Microphone permission was denied. Enable it in browser settings.'),
        'no-speech': text('لم يتم التقاط صوت. أعد المحاولة وتحدث بالقرب من الميكروفون.', 'No speech was detected. Try again and speak close to the microphone.'),
        'audio-capture': text('تعذر الوصول إلى الميكروفون.', 'The microphone could not be accessed.'),
        'network': text('تعذر تشغيل خدمة التعرّف الصوتي بسبب الاتصال.', 'Speech recognition could not run because of a network issue.')
      };
      status.hidden = false;
      status.textContent = messages[event.error] || text('تعذر إكمال الإملاء الصوتي.', 'Voice dictation could not be completed.');
    };

    recognition.onend = () => {
      isListening = false;
      micButton.classList.remove('listening');
      micButton.setAttribute('aria-pressed', 'false');
      if (autoImprove.checked && input.value.trim()) input.value = improveDictation(input.value);
      if (status.textContent.includes('يتم الاستماع') || status.textContent.includes('Listening')) {
        status.textContent = text('اكتمل الإملاء. راجع النص أو اضغط «تحسين الإملاء».', 'Dictation completed. Review the text or select Improve dictation.');
      }
      window.setTimeout(() => { status.hidden = true; }, 3500);
      input.focus();
    };
  }

  function initializeWidget(widget) {
    const chat = widget.querySelector('#legalBotChat');
    const form = widget.querySelector('#legalBotForm');
    const input = widget.querySelector('#legalBotInput');
    const caseSelect = widget.querySelector('#legalBotCase');
    const micButton = widget.querySelector('#legalBotMic');
    const improveButton = widget.querySelector('#legalBotImprove');
    const autoImprove = widget.querySelector('#legalBotAutoImprove');
    const status = widget.querySelector('#legalBotDictationStatus');
    const clearButton = widget.querySelector('#legalBotClear');
    const voiceReplyButton = widget.querySelector('#legalBotVoiceReply');
    let history = getHistoryOrDefault();

    renderMessages(chat, history);
    initRecognition(input, status, micButton, autoImprove);

    function addMessage(role, message) {
      history.push({ role, text: message });
      history = history.slice(-20);
      saveHistory(history);
      renderMessages(chat, history);
      if (role === 'assistant' && voiceReplyEnabled) speakReply(message);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let prompt = input.value.trim();
      if (!prompt) return;
      if (autoImprove.checked) prompt = improveDictation(prompt);
      input.value = '';
      addMessage('user', prompt);
      const typing = document.createElement('div');
      typing.className = 'legal-bot-typing';
      typing.innerHTML = '<i></i><i></i><i></i>';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;
      window.setTimeout(() => {
        typing.remove();
        addMessage('assistant', generalAnswer(prompt, caseSelect.value));
      }, 350);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey && window.innerWidth > 700) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    micButton.addEventListener('click', () => {
      if (!recognition) return;
      if (isListening) recognition.stop();
      else {
        recognition.lang = ar() ? 'ar-KW' : 'en-US';
        try { recognition.start(); }
        catch { /* Browser may still be closing a previous recognition session. */ }
      }
    });

    improveButton.addEventListener('click', () => {
      if (!input.value.trim()) {
        if (typeof toast === 'function') toast(text('اكتب النص أو أمْلِه أولًا', 'Type or dictate text first'));
        input.focus();
        return;
      }
      input.value = improveDictation(input.value);
      input.focus();
      status.hidden = false;
      status.textContent = text('تم تحسين الإملاء وعلامات الترقيم.', 'Spelling and punctuation were improved.');
      window.setTimeout(() => { status.hidden = true; }, 2500);
    });

    widget.querySelectorAll('[data-legal-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        const kind = button.dataset.legalPrompt;
        const caseId = caseSelect.value;
        const prompts = {
          summary: text('لخص القضية مع بيان حالتها والإجراء القادم.', 'Summarize the case, its status, and next action.'),
          missing: text('حدد البيانات والمستندات الناقصة في القضية.', 'Identify missing case information and documents.'),
          'client-update': text('اكتب تحديثًا مهنيًا مختصرًا للعميل.', 'Draft a concise professional client update.'),
          'memo-points': text('جهز نقاط مذكرة قانونية مرتبة لهذه القضية.', 'Prepare an organized legal memo outline for this case.')
        };
        if (!caseId) {
          status.hidden = false;
          status.textContent = text('اختر قضية أولًا لاستخدام هذا الطلب السريع.', 'Select a case before using this quick prompt.');
          window.setTimeout(() => { status.hidden = true; }, 2800);
          return;
        }
        input.value = prompts[kind];
        form.requestSubmit();
      });
    });

    clearButton.addEventListener('click', () => {
      history = [{ role: 'assistant', text: text('تم مسح المحادثة. كيف أساعدك؟', 'Chat cleared. How can I help?') }];
      saveHistory(history);
      renderMessages(chat, history);
      window.speechSynthesis?.cancel();
    });

    voiceReplyButton.addEventListener('click', () => {
      voiceReplyEnabled = !voiceReplyEnabled;
      voiceReplyButton.classList.toggle('active', voiceReplyEnabled);
      voiceReplyButton.setAttribute('aria-pressed', String(voiceReplyEnabled));
      if (typeof toast === 'function') toast(voiceReplyEnabled ? text('تم تشغيل الرد الصوتي', 'Voice replies enabled') : text('تم إيقاف الرد الصوتي', 'Voice replies disabled'));
    });

    chat.addEventListener('click', (event) => {
      const button = event.target.closest('[data-speak-index]');
      if (!button) return;
      const message = history[Number(button.dataset.speakIndex)];
      speakReply(message?.text || '');
    });

    widget.querySelector('[data-legal-bot-open-full]')?.addEventListener('click', () => {
      if (typeof switchView === 'function') switchView('assistant');
    });
  }

  function injectWidget() {
    const dashboard = document.querySelector('#appContent .executive-dashboard');
    if (!dashboard || dashboard.querySelector('#dashboardLegalBot')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = widgetMarkup().trim();
    const widget = wrapper.firstElementChild;
    const command = dashboard.querySelector('.dashboard-command');
    if (command) command.insertAdjacentElement('afterend', widget);
    else dashboard.prepend(widget);
    initializeWidget(widget);
  }

  const content = document.getElementById('appContent');
  if (content) {
    const observer = new MutationObserver(() => window.requestAnimationFrame(injectWidget));
    observer.observe(content, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectWidget, { once: true });
  else injectWidget();
})();

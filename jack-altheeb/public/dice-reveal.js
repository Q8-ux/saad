(() => {
  const HOLD_MS = 2400;
  let hideTimer = null;
  let lastKey = '';

  function ensureResult() {
    let result = document.getElementById('diceResult');
    if (result) return result;
    const button = document.getElementById('rollBtn');
    if (!button) return null;
    result = document.createElement('span');
    result.id = 'diceResult';
    result.className = 'dice-result';
    result.setAttribute('aria-live', 'polite');
    result.innerHTML = '<small>النتيجة</small><strong>—</strong>';
    button.appendChild(result);
    return result;
  }

  function reveal(number, actor = '') {
    const value = Number(number);
    if (!Number.isInteger(value) || value < 1 || value > 6) return;
    const result = ensureResult();
    const face = document.getElementById('diceFace');
    const button = document.getElementById('rollBtn');
    if (!result || !face || !button) return;

    clearTimeout(hideTimer);
    result.querySelector('strong').textContent = String(value);
    result.querySelector('small').textContent = actor ? `نتيجة ${actor}` : 'نتيجة النرد';
    result.classList.add('show');
    face.classList.remove('dice-pop');
    void face.offsetWidth;
    face.classList.add('dice-pop');
    button.classList.add('dice-hold');

    hideTimer = setTimeout(() => {
      result.classList.remove('show');
      button.classList.remove('dice-hold');
    }, HOLD_MS);
  }

  function inspectMessage() {
    const message = document.getElementById('gameMessage')?.textContent || '';
    const match = message.match(/(.+?)\s+رمى\s+([1-6])/);
    if (!match) return;
    const key = `${match[1]}:${match[2]}:${message}`;
    if (key === lastKey) return;
    lastKey = key;
    reveal(match[2], match[1].trim());
  }

  function start() {
    ensureResult();
    const message = document.getElementById('gameMessage');
    if (message) new MutationObserver(inspectMessage).observe(message, { childList: true, characterData: true, subtree: true });
    inspectMessage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

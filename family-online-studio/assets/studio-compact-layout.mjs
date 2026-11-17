/*
 * Minimal chrome for both screenplay and book editors.
 * All original React controls remain mounted and own their event handlers.
 * Export/print document layout is intentionally untouched.
 */
let compactSequence = 0;
const liveLayouts = new WeakMap();

export function mountCompactLayout(studio) {
  if (!studio) return null;
  const doc = studio.ownerDocument;
  const nodes = new Map();
  let destroyed = false;
  const make = (tag, cls, text) => {
    const el = doc.createElement(tag);
    el.className = cls;
    if (text) el.textContent = text;
    return el;
  };
  function mountToolbar(toolbar) {
    if (nodes.has(toolbar)) return;
    const id = toolbar.id || 'studio-compact-toolbar-' + (++compactSequence);
    if (!toolbar.id) toolbar.id = id;
    const viewControls = toolbar.classList.contains('view-tools');
    const label = viewControls ? 'خيارات العرض' : 'تنسيق النص وأدوات Word';
    const toggle = make('button', 'studio-format-toggle', label);
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'إظهار ' + label);
    toolbar.setAttribute('data-compact-toolbar', 'true');
    const onClick = () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', (expanded ? 'إخفاء ' : 'إظهار ') + label);
      toolbar.classList.toggle('studio-toolbar-expanded', expanded);
    };
    toggle.addEventListener('click', onClick);
    toolbar.before(toggle);
    nodes.set(toolbar, () => {
      toggle.removeEventListener('click', onClick);
      toggle.remove();
      toolbar.classList.remove('studio-toolbar-expanded');
      toolbar.removeAttribute('data-compact-toolbar');
      if (id.startsWith('studio-compact-toolbar-')) toolbar.removeAttribute('id');
    });
  }
  function mountViewMenu(tabs) {
    if (nodes.has(tabs)) return;
    const label = make('label', 'studio-workspace-picker');
    const text = make('span', '', 'القسم');
    const select = make('select', '');
    select.setAttribute('aria-label', 'التنقل بين أقسام العمل');
    label.append(text, select);
    tabs.before(label);
    tabs.setAttribute('data-compact-tabs', 'true');
    const onChange = () => {
      const items = [...tabs.querySelectorAll(':scope > button')];
      const button = items[Number(select.value)];
      if (button && !button.disabled) button.click();
    };
    select.addEventListener('change', onChange);
    const update = () => {
      const buttons = [...tabs.querySelectorAll(':scope > button')];
      const entries = buttons.map((button, index) => ({
        value: String(index),
        label: button.textContent.trim() || button.getAttribute('aria-label') || 'قسم ' + (index + 1),
      }));
      const signature = JSON.stringify(entries);
      if (label.dataset.options !== signature) {
        label.dataset.options = signature;
        select.replaceChildren(...entries.map(entry => {
          const option = doc.createElement('option');
          option.value = entry.value;
          option.textContent = entry.label;
          return option;
        }));
      }
      const selected = buttons.findIndex(button => button.getAttribute('aria-current') === 'page' || button.classList.contains('selected'));
      if (selected >= 0 && select.value !== String(selected)) select.value = String(selected);
    };
    update();
    nodes.set(tabs, { update, dispose() {
      select.removeEventListener('change', onChange);
      label.remove();
      tabs.removeAttribute('data-compact-tabs');
    }});
  }
  function scan() {
    if (destroyed || !studio.isConnected) return;
    for (const [target, value] of nodes) {
      if (!target.isConnected || !studio.contains(target)) {
        (typeof value === 'function' ? value : value.dispose)();
        nodes.delete(target);
      }
    }
    const tabs = studio.querySelector('.viewbar .view-tabs');
    if (tabs) mountViewMenu(tabs);
    for (const toolbar of studio.querySelectorAll('.editor-toolbar, .book-tools, .viewbar .view-tools')) mountToolbar(toolbar);
    for (const [target, value] of nodes) if (target === tabs && value.update) value.update();
  }
  let queued = false;
  const observer = new doc.defaultView.MutationObserver(() => {
    if (queued || destroyed) return;
    queued = true;
    queueMicrotask(() => {queued = false; scan();});
  });
  observer.observe(studio, {childList:true, subtree:true, attributes:true, attributeFilter:['aria-current']});
  scan();
  return {
    sync:scan,
    destroy() {
      destroyed = true;
      observer.disconnect();
      for (const value of nodes.values()) (typeof value === 'function' ? value : value.dispose)();
      nodes.clear();
    },
  };
}

export function startCompactLayouts(doc = document) {
  const layouts = new Map();
  let queued = false;
  const scan = () => {
    queued = false;
    for (const [studio, state] of layouts) {
      if (!studio.isConnected) {state.destroy(); layouts.delete(studio);}
    }
    for (const studio of doc.querySelectorAll('.studio')) {
      if (!layouts.has(studio)) {
        const state = mountCompactLayout(studio);
        if (state) {layouts.set(studio,state);liveLayouts.set(studio,state);}
      }
    }
  };
  const observer = new doc.defaultView.MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(scan);
  });
  observer.observe(doc.getElementById('root') || doc.body, {childList:true, subtree:true});
  scan();
  return () => {
    observer.disconnect();
    for (const state of layouts.values()) state.destroy();
    layouts.clear();
  };
}

if (typeof document !== 'undefined') startCompactLayouts();

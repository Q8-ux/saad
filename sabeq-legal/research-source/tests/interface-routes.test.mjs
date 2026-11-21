import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
const require = createRequire(import.meta.url);
function compile(file, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require, ...globals });
  return exports;
}
const Progress = compile("../app/memo-progress.tsx").default;
for (const language of ["ar", "en", "ur"]) for (const current of [0, 1, 2]) {
  test(`progress shows the actual controlled stage: ${language}/${current}`, () => {
    const html = renderToStaticMarkup(createElement(Progress, { labels: ["وقائع اصطناعية", "بيانات القضية", "المراجعة"], current, label: "رحلة تجريبية", language }));
    assert.equal((html.match(/aria-current="step"/g) || []).length, 1);
    assert.equal((html.match(/data-status="complete"/g) || []).length, current);
    assert.equal((html.match(/data-status="upcoming"/g) || []).length, 2 - current);
    assert.match(html, /<ol/);
    assert.match(html, /role="status"/);
    assert.doesNotMatch(html, /<button|<a /, "indicators must not bypass wizard validation");
  });
}
function setupFocus() {
  const handlers = new Map();
  const document = { activeElement: null, dialogs: [], querySelectorAll() { return this.dialogs; },
    addEventListener(type, listener) { handlers.set(type, listener); },
    removeEventListener(type) { handlers.delete(type); } };
  class Element {
    constructor() { this.ownerDocument = document; this.isConnected = true; this.hidden = false; this.tabIndex = 0; this.controls = []; }
    getClientRects() { return this.hidden ? [] : [{}]; }
    closest() { return this.hidden ? this : null; }
    matches() { return false; }
    querySelectorAll() { return this.controls; }
    contains(node) { return node === this || this.controls.includes(node); }
    focus() { document.activeElement = this; }
  }
  const opener = new Element(), dialog = new Element(), first = new Element(), last = new Element();
  dialog.controls = [first, last]; document.dialogs = [dialog]; opener.focus();
  const frames = [];
  const { manageDialogFocus } = compile("../lib/dialog-focus.ts", { HTMLElement: Element,
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; }, cancelAnimationFrame() {} });
  let closed = 0;
  const cleanup = manageDialogFocus(dialog, () => { closed++; });
  frames.forEach(fn => fn());
  function key(key, shiftKey = false) {
    const event = { key, shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    handlers.get("keydown")?.(event); return event;
  }
  return { document, Element, handlers, opener, dialog, first, last, cleanup, key, closed: () => closed };
}
test("dialog wraps both Tab directions and closes only its own top-level Escape", () => {
  const f = setupFocus(); assert.equal(f.document.activeElement, f.first);
  f.last.focus(); assert.equal(f.key("Tab").defaultPrevented, true); assert.equal(f.document.activeElement, f.first);
  f.key("Tab", true); assert.equal(f.document.activeElement, f.last);
  const nested = new f.Element(); f.document.dialogs.push(nested);
  f.key("Escape"); assert.equal(f.closed(), 0);
  nested.hidden = true; f.key("Escape"); assert.equal(f.closed(), 1);
});
test("closing a retained hidden dialog removes listeners and returns to its visible opener", () => {
  const f = setupFocus(); f.dialog.hidden = true; f.cleanup();
  assert.equal(f.document.activeElement, f.opener); assert.equal(f.handlers.size, 0);
});
test("switching dialogs preserves focus in the newly visible dialog", () => {
  const f = setupFocus(), next = new f.Element(); f.document.dialogs.push(next);
  f.dialog.hidden = true; next.focus(); f.cleanup(); assert.equal(f.document.activeElement, next);
});

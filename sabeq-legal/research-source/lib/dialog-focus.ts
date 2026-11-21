const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
function visible(element: HTMLElement) {
  return !element.closest('[hidden], [inert]') && element.getClientRects().length > 0;
}
function topDialog(document: Document) {
  return Array.from(document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"][aria-modal="true"]')).filter(visible).at(-1);
}
// Scope keyboard events to the visible top dialog; retained memo drafts stay mounted.
export function manageDialogFocus(dialog: HTMLElement, close: () => void) {
  const document = dialog.ownerDocument;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const targets = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter(element =>
    visible(element) && !element.matches(':disabled') && element.tabIndex >= 0);
  const focusFirst = () => (targets()[0] || dialog).focus({ preventScroll: true });
  const frame = requestAnimationFrame(focusFirst);
  const keydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || topDialog(document) !== dialog) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const controls = targets();
    if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
    const first = controls[0], last = controls.at(-1)!;
    if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };
  const focusin = (event: FocusEvent) => {
    if (topDialog(document) === dialog && !dialog.contains(event.target as Node)) focusFirst();
  };
  document.addEventListener("keydown", keydown);
  document.addEventListener("focusin", focusin);
  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("focusin", focusin);
    if (opener?.isConnected && visible(opener) && !topDialog(document)) opener.focus({ preventScroll: true });
  };
}


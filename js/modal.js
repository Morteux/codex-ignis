/**
 * Shared modal behaviour (P23.10) for the dialogs of js/confirm-dialog.js and the wiki image
 * lightbox (js/app.js): overlay, Escape, click outside, focus trap and focus back to the opener.
 *
 * openModal(overlay, { focusables, initialFocus, onCancel, onKeyDown, onClose }) shows `overlay`
 * (appended to <body> if it is not in the page, removed again on close; otherwise only its
 * `hidden` flag changes) and returns `close()`.
 * - focusables: the controls Tab and Shift+Tab cycle through while the modal is open.
 * - initialFocus: element focused on open (default: the first focusable).
 * - onCancel: called on Escape or a click on the overlay itself (outside the box); it usually calls close().
 * - onKeyDown(event): any other key, e.g. Enter in a text field.
 * - onClose: called by close(), before the focus goes back to the element focused at open.
 */
export function openModal(overlay, { focusables, initialFocus = focusables[0], onCancel, onKeyDown, onClose }) {
  const opener = document.activeElement;
  const added = !overlay.isConnected;

  function close() {
    document.removeEventListener("keydown", handleKeyDown, true);
    overlay.removeEventListener("click", handleClick);
    if (added) overlay.remove();
    else overlay.hidden = true;
    onClose?.();
    if (opener && document.contains(opener) && typeof opener.focus === "function") opener.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    } else if (event.key === "Tab") {
      // Keeps the focus inside the modal while it is open.
      event.preventDefault();
      if (!focusables.length) return;
      const index = focusables.indexOf(document.activeElement);
      const next = event.shiftKey ? (index <= 0 ? focusables.length - 1 : index - 1) : (index + 1) % focusables.length;
      focusables[next].focus();
    } else {
      onKeyDown?.(event);
    }
  }

  function handleClick(event) {
    if (event.target === overlay) onCancel();
  }

  overlay.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeyDown, true);
  if (added) document.body.append(overlay);
  else overlay.hidden = false;
  initialFocus?.focus();
  return close;
}

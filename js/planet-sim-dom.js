/**
 * Planet simulator: page elements shared by several renderers and the notice banner (showNotice).
 */

export const catalogEl = document.querySelector("#planet-catalog");
export const districtsCatalogEl = document.querySelector("#planet-districts-catalog");

const noticeEl = document.querySelector("#planet-sim-notice");
let noticeTimer = null;
export function showNotice(text) {
  if (!noticeEl) return;
  noticeEl.textContent = text;
  noticeEl.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { noticeEl.hidden = true; }, 10000);
}

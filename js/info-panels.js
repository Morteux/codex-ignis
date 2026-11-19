/**
 * "i" explanation panels (P17.1, shared since P17.5): a static `.info-btn` in the HTML (id "<id>-info-btn") toggles the
 * panel `.info-panel` (id "<id>-info") that each section render creates with createInfoPanel(). The open state is kept
 * per id, so it survives re-renders and language changes.
 */
import { t } from "./i18n.js";

const infoOpen = new Set();
const panelId = (btn) => btn.id.replace(/-info-btn$/, "");

function syncInfoButton(btn, lang) {
  const open = infoOpen.has(panelId(btn));
  btn.setAttribute("aria-expanded", String(open));
  btn.classList.toggle("is-open", open);
  btn.title = t(lang, "infoToggleTooltip");
  btn.setAttribute("aria-label", t(lang, "infoToggleTooltip"));
}

/** Updates aria-expanded, open class and tooltip of every "i" button (call it on each render, it follows the language). */
export function syncInfoButtons(lang) {
  document.querySelectorAll(".info-btn").forEach((btn) => syncInfoButton(btn, lang));
}

/** Creates the (empty) panel of section `id`, hidden unless its button is open. */
export function createInfoPanel(id) {
  const panel = document.createElement("div");
  panel.className = "info-panel";
  panel.id = `${id}-info`;
  panel.hidden = !infoOpen.has(id);
  return panel;
}

/** Adds a paragraph to a panel; `isExample` marks a worked example with the current numbers. */
export function addInfoLine(panel, text, isExample) {
  const line = document.createElement("p");
  line.className = `planet-modifier-stacking${isExample ? " info-example" : ""}`;
  line.textContent = text;
  panel.append(line);
  return line;
}

/** Binds every "i" button once (native <button>: Enter/Space work). `getLang` returns the current UI language. */
export function initInfoButtons(getLang) {
  document.querySelectorAll(".info-btn").forEach((btn) => {
    if (btn.dataset.infoBound) return;
    btn.dataset.infoBound = "1";
    syncInfoButton(btn, getLang());
    btn.addEventListener("click", () => {
      const id = panelId(btn);
      if (infoOpen.has(id)) infoOpen.delete(id); else infoOpen.add(id);
      syncInfoButton(btn, getLang());
      const panel = document.getElementById(`${id}-info`);
      if (panel) panel.hidden = !infoOpen.has(id);
    });
  });
}

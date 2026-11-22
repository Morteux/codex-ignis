/**
 * Planet simulator: tab bars — Buildings / Districts inside the Planet tab and the main tabs
 * (Library, Planet, Empire, Celestial body, Edicts, Branch offices), with ARIA tab keys.
 */

import { renderCatalog, renderDistrictsCatalog } from "./planet-sim-catalog-ui.js";
import { catalogEl, districtsCatalogEl } from "./planet-sim-dom.js";
import { sim } from "./planet-sim-state.js";

const tabBuildingsBtn = document.querySelector("#planet-tab-buildings");
const tabDistrictsBtn = document.querySelector("#planet-tab-districts");

const mainTabButtons = document.querySelectorAll(".planet-main-tab[data-main-tab]");
const mainTabPanels = {
  library: document.querySelector("#planet-tab-panel-library"),
  planet: document.querySelector("#planet-tab-panel-planet"),
  empire: document.querySelector("#planet-tab-panel-empire"),
  body: document.querySelector("#planet-tab-panel-body"),
  edicts: document.querySelector("#planet-tab-panel-edicts"),
  branches: document.querySelector("#planet-tab-panel-branches")
};

/* ── Pestañas y catálogo de edificios ───────────────────────────────── */

export function openDistrictsTab(filter) {
  sim.districtFilter = filter;
  setActiveTab("districts");
}

/** P13.4: ARIA tab state (selected + roving tabindex: only the active tab is in the Tab order). */
function markTab(btn, selected) {
  btn.classList.toggle("is-active", selected);
  btn.setAttribute("aria-selected", String(selected));
  btn.tabIndex = selected ? 0 : -1;
}

/** P13.4: Left/Right (and Up/Down), Home and End move between the tabs of a tablist and activate them. */
function enableTabKeys(tabs) {
  tabs.forEach((btn, index) => {
    btn.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const next = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      target.focus();
      target.click();
    });
  });
}

export function setActiveTab(tab) {
  sim.activeTab = tab;
  if (tabBuildingsBtn) markTab(tabBuildingsBtn, tab === "buildings");
  if (tabDistrictsBtn) markTab(tabDistrictsBtn, tab === "districts");
  if (catalogEl) catalogEl.hidden = tab !== "buildings";
  if (districtsCatalogEl) districtsCatalogEl.hidden = tab !== "districts";
  renderActiveTabContent();
}

if (tabBuildingsBtn) tabBuildingsBtn.addEventListener("click", () => setActiveTab("buildings"));
if (tabDistrictsBtn) tabDistrictsBtn.addEventListener("click", () => {
  sim.districtFilter = null;
  setActiveTab("districts");
});
enableTabKeys([tabBuildingsBtn, tabDistrictsBtn].filter(Boolean));

/* ── Pestañas principales del planeta (Planeta / Imperio / Cuerpo celeste / Sucursales) ── */

export function setMainTab(tab) {
  mainTabButtons.forEach((btn) => markTab(btn, btn.dataset.mainTab === tab));
  Object.entries(mainTabPanels).forEach(([key, panel]) => {
    if (panel) panel.hidden = key !== tab;
  });
}

mainTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMainTab(btn.dataset.mainTab));
});
enableTabKeys([...mainTabButtons]);

export function renderActiveTabContent() {
  if (sim.activeTab === "buildings") renderCatalog();
  else renderDistrictsCatalog();
}

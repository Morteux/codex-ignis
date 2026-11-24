/**
 * Page script of the tech tree (tech-tree.html, TECH_TREE_GDD.md section 6).
 *
 * The static markup (shell, area panels, credits, footer) is translated by the shared page shell
 * (js/page-shell.js). This script adds the dynamic parts: the data version line, the area tabs
 * (three areas side by side on desktop, one at a time behind tabs on mobile) and the tier × field
 * grid of nodes of every area (js/tech-tree-layout.js) with its prerequisite lines
 * (js/tech-tree-lines.js), the selection states (js/tech-tree-states.js) and their legend, and the
 * detail card of the selected technology (js/tech-tree-card.js), the search and filters
 * (js/tech-tree-search.js) and the zoom and pan (js/tech-tree-zoom.js).
 */

import { applyPageTranslations, getLang, onLanguageChange } from "./page-shell.js";
import { t } from "./i18n.js";
import { DATA_COLLECTIONS } from "./data-version.js";
import { TECH_DATA } from "./tech-data/stellaris-pc-4.5.4.js";
import { renderAreaGrid, relabelGrids, KIND_KEYS } from "./tech-tree-layout.js";
import { watchLines } from "./tech-tree-lines.js";
import { createSelection } from "./tech-tree-states.js";
import { createDetailCard, areaName } from "./tech-tree-card.js";
import { createSearch } from "./tech-tree-search.js";
import { createZoom } from "./tech-tree-zoom.js";
import "./i18n-tech-tree.js";

const COLLECTION = DATA_COLLECTIONS.technologies;
const VERIFICATION_KEYS = {
  unverified: "techTreeVerificationUnverified",
  "wiki-verified": "techTreeVerificationWikiVerified",
  "game-data-verified": "techTreeVerificationGameDataVerified",
};

/** "Data version: stellaris-pc-4.5.4 · Cygnus v4.5.4 (1b4f) · unverified (…)" */
function renderDataVersion(lang) {
  const el = document.getElementById("tech-data-version");
  const status = VERIFICATION_KEYS[COLLECTION.verification] || VERIFICATION_KEYS.unverified;
  el.textContent = t(lang, "techTreeDataVersion")
    .replace("{label}", TECH_DATA.rulesetId)
    .replace("{game}", TECH_DATA.gameVersion)
    .replace("{status}", t(lang, status));
  el.dataset.rulesetId = TECH_DATA.rulesetId;
  el.dataset.verification = COLLECTION.verification;
}

/** Area tabs (visible on mobile only): one active panel, arrow keys move between tabs. */
function setupAreaTabs() {
  const tabs = [...document.querySelectorAll(".tech-area-tab")];
  const select = (tab, focus = false) => {
    tabs.forEach((other) => {
      const on = other === tab;
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).classList.toggle("is-active", on);
    });
    if (focus) tab.focus();
    document.dispatchEvent(new CustomEvent("tech-area-change", { detail: tab.dataset.area }));
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        select(tabs[event.key === "Home" ? 0 : tabs.length - 1], true);
      } else if (step) {
        event.preventDefault();
        select(tabs[(index + step + tabs.length) % tabs.length], true);
      }
    });
  });
}

/**
 * Legend of the visual states (T3104): the kinds used by the data file with their colour, then
 * selected / prerequisite / unlocked by the selected.
 */
function renderLegend(lang) {
  const kinds = Object.keys(KIND_KEYS).filter((kind) => TECH_DATA.technologies.some((tech) => tech.kind === kind));
  const items = [
    ...kinds.map((kind) => ["tech-legend-kind tech-node--" + kind, KIND_KEYS[kind], kind]),
    ["tech-legend-state is-selected", "techTreeStateSelected", "selected"],
    ["tech-legend-state is-prerequisite", "techTreeStatePrerequisite", "prerequisite"],
    ["tech-legend-state is-unlocked", "techTreeStateUnlocked", "unlocked"],
  ];
  document.getElementById("tech-legend").replaceChildren(...items.map(([className, key, id]) => {
    const item = document.createElement("li");
    item.dataset.legend = id;
    const swatch = document.createElement("span");
    swatch.className = "tech-legend-swatch " + className;
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, t(lang, key));
    return item;
  }));
}

/** Draws the tier × field grid of every area panel (T3102). Returns a Map id → node. */
function renderTree(lang) {
  const nodes = new Map();
  document.querySelectorAll(".tech-area").forEach((panel) => {
    renderAreaGrid(panel.querySelector(".tech-area-scroll"), TECH_DATA, panel.dataset.area, lang)
      .forEach((node, id) => nodes.set(id, node));
  });
  return nodes;
}

applyPageTranslations();
setupAreaTabs();
renderDataVersion(getLang());
renderTree(getLang());
const redrawLines = watchLines(document.querySelector(".tech-areas"), TECH_DATA);
onLanguageChange((lang) => {
  renderDataVersion(lang);
  relabelGrids(document.querySelector(".tech-areas"), TECH_DATA, lang);
  redrawLines();
});
document.addEventListener("tech-area-change", redrawLines);
renderLegend(getLang());
/** Shows the node of `id`: opens its area tab (mobile) and scrolls it into its panel. */
function revealNode(id) {
  const node = document.querySelector(`.tech-node[data-tech-id="${id}"]`);
  if (!node) return;
  const panel = node.closest(".tech-area");
  if (!panel.classList.contains("is-active")) document.getElementById("tech-tab-" + panel.dataset.area).click();
  node.scrollIntoView({ block: "nearest", inline: "nearest" });
}

const card = createDetailCard(document.getElementById("tech-card"), TECH_DATA, getLang, {
  onSelect: (id) => {
    selection.select(id);
    revealNode(id);
  },
  onClose: () => selection.select(null),
});
const selection = createSelection(document.querySelector(".tech-areas"), TECH_DATA, document.getElementById("tech-selection-status"), getLang,
  (id) => card.show(id));
const search = createSearch(document.getElementById("tech-search-box"), document.querySelector(".tech-areas"), TECH_DATA, getLang, {
  onPick: (id) => {
    if (selection.selected() !== id) selection.select(id);
    revealNode(id);
  },
  onAreaFilter: (area) => {
    const tab = document.getElementById("tech-tab-" + area);
    if (tab.getAttribute("aria-selected") !== "true") tab.click();
  },
});
const zoom = createZoom(document.querySelector(".tech-areas"), document.getElementById("tech-zoom-bar"), getLang, areaName);
onLanguageChange((lang) => {
  renderLegend(lang);
  selection.announce();
  card.refresh();
  search.relabel();
  zoom.relabel();
});

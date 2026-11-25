/**
 * Page script of the tech tree (tech-tree.html, TECH_TREE_GDD.md section 6).
 *
 * The static markup (shell, area panels, credits, footer) is translated by the shared page shell
 * (js/page-shell.js). This script adds the dynamic parts: the data version line, the buttons that
 * jump to an area (the three areas are stacked as rows in one tree window, T3601) and the
 * tier × field grid of nodes of every area (js/tech-tree-layout.js) with the prerequisite lines
 * (js/tech-tree-lines.js, also between areas), the selection states (js/tech-tree-states.js) and their legend, and the
 * detail card of the selected technology (js/tech-tree-card.js, floating over the tree window, T3603), the search and filters
 * (js/tech-tree-search.js), the zoom and pan (js/tech-tree-zoom.js) and the deep link to a
 * technology in the URL hash (js/tech-tree-link.js) and the comparison between two data versions
 * (js/tech-tree-compare.js, T3303), and the keyboard navigation between nodes with their
 * screen-reader descriptions (js/tech-tree-keyboard.js, T3403). The data file is the one of the version chosen
 * in the version selector (js/tech-versions.js, T3301), loaded before anything is drawn.
 */

import { applyPageTranslations, getLang, onLanguageChange } from "./page-shell.js";
import { t } from "./i18n.js";
import { TECH_VERSIONS, VERSION_STORAGE_KEY, pickTechVersion, loadTechData, versionUrl } from "./tech-versions.js";
import { renderAreaGrid, relabelGrids, KIND_KEYS } from "./tech-tree-layout.js";
import { watchLines } from "./tech-tree-lines.js";
import { createSelection } from "./tech-tree-states.js";
import { createDetailCard } from "./tech-tree-card.js";
import { localizeTechData, areaName } from "./tech-tree-names.js";
import { createSearch } from "./tech-tree-search.js";
import { createZoom } from "./tech-tree-zoom.js";
import { techIdFromHash } from "./tech-tree-link.js";
import { createCompare } from "./tech-tree-compare.js";
import { createKeyboard } from "./tech-tree-keyboard.js";
import "./i18n-tech-tree.js";

const VERIFICATION_KEYS = {
  unverified: "techTreeVerificationUnverified",
  "wiki-verified": "techTreeVerificationWikiVerified",
  "game-data-verified": "techTreeVerificationGameDataVerified",
};

function readStoredVersion() {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

const { version: VERSION, unknownId: unknownVersionId } = pickTechVersion(window.location.search, readStoredVersion());
const TECH_DATA = await loadTechData(VERSION);

/** "Data version: stellaris-pc-4.5.4 · Cygnus v4.5.4 (1b4f) · unverified (…)" */
function renderDataVersion(lang) {
  const el = document.getElementById("tech-data-version");
  const status = VERIFICATION_KEYS[VERSION.verification] || VERIFICATION_KEYS.unverified;
  el.textContent = t(lang, "techTreeDataVersion")
    .replace("{label}", TECH_DATA.rulesetId)
    .replace("{game}", TECH_DATA.gameVersion || VERSION.label)
    .replace("{status}", t(lang, status));
  el.dataset.rulesetId = TECH_DATA.rulesetId;
  el.dataset.verification = VERSION.verification;
  const warning = document.getElementById("tech-version-warning");
  warning.hidden = !unknownVersionId;
  warning.textContent = unknownVersionId ? t(lang, "techTreeVersionUnknown").replace("{id}", unknownVersionId).replace("{current}", VERSION.id) : "";
}

/**
 * Version selector (T3301): one option per data file of js/tech-versions.js. Choosing another
 * version stores it and reloads the page with ?version=<id>, keeping the technology in the hash.
 */
function setupVersionSelect(lang) {
  const select = document.getElementById("tech-version-select");
  select.replaceChildren(...TECH_VERSIONS.map((version) => {
    const option = document.createElement("option");
    option.value = version.id;
    option.textContent = version.label + (version.isCurrent ? " · " + t(lang, "techTreeVersionCurrent") : "");
    option.selected = version.id === VERSION.id;
    return option;
  }));
  if (select.dataset.ready) return;
  select.dataset.ready = "1";
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(VERSION_STORAGE_KEY, select.value);
    } catch {
      // private mode: the choice lives only in the URL
    }
    window.location.assign(versionUrl(window.location.href, select.value));
  });
}

/** Scrolls the tree window so that the area `area` starts at its top (any zoom). */
function scrollToArea(area) {
  const windowEl = document.querySelector(".tech-areas");
  const section = document.getElementById("tech-area-" + area);
  windowEl.scrollTop += section.getBoundingClientRect().top - windowEl.getBoundingClientRect().top;
}

/**
 * Area jump buttons (T3601, desktop and mobile): each one scrolls the tree window to its area;
 * the area at the top of the window is marked with aria-current.
 */
function setupAreaJumps() {
  const windowEl = document.querySelector(".tech-areas");
  const jumps = [...document.querySelectorAll(".tech-area-jump")];
  jumps.forEach((jump) => jump.addEventListener("click", () => scrollToArea(jump.dataset.area)));
  let frame = 0;
  const mark = () => {
    frame = 0;
    const top = windowEl.getBoundingClientRect().top + 1;
    const sections = [...windowEl.querySelectorAll(".tech-area")];
    const current = sections.filter((section) => section.getBoundingClientRect().top <= top).pop() || sections[0];
    jumps.forEach((jump) => {
      if (jump.dataset.area === current.dataset.area) jump.setAttribute("aria-current", "true");
      else jump.removeAttribute("aria-current");
    });
  };
  windowEl.addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(mark);
  }, { passive: true });
  mark();
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
    renderAreaGrid(panel.querySelector(".tech-area-body"), TECH_DATA, panel.dataset.area, lang)
      .forEach((node, id) => nodes.set(id, node));
  });
  return nodes;
}

/** Official names of the language on the data and the area buttons and headings (P15). */
function localize(lang) {
  localizeTechData(TECH_DATA, lang);
  document.querySelectorAll(".tech-area-jump").forEach((jump) => {
    jump.textContent = areaName(jump.dataset.area);
  });
  document.querySelectorAll(".tech-area-heading").forEach((heading) => {
    heading.textContent = areaName(heading.closest(".tech-area").dataset.area);
  });
}

localize(getLang());
applyPageTranslations();
setupAreaJumps();
setupVersionSelect(getLang());
renderDataVersion(getLang());
renderTree(getLang());
const redrawLines = watchLines(document.querySelector(".tech-areas"), TECH_DATA);
onLanguageChange((lang) => {
  localize(lang);
  setupVersionSelect(lang);
  renderDataVersion(lang);
  relabelGrids(document.querySelector(".tech-areas"), TECH_DATA, lang);
  redrawLines();
});
renderLegend(getLang());
/** Shows the node of `id`: scrolls it into the tree window (and the window into the page). */
function revealNode(id) {
  const node = document.querySelector(`.tech-node[data-tech-id="${id}"]`);
  if (!node) return;
  node.scrollIntoView({ block: "center", inline: "center" });
  requestAnimationFrame(() => keepClearOfCard(id));
}

/**
 * T3603: the detail card floats over the tree window (bottom sheet on phones), so after it opens
 * the selected node is scrolled out from under it: sideways inside the window when the card is a
 * corner panel, upwards (window, then page) when it is a bottom sheet. The tree itself never moves.
 */
function keepClearOfCard(id) {
  const node = document.querySelector(`.tech-node[data-tech-id="${id}"]`);
  const cardEl = document.getElementById("tech-card");
  if (!node || cardEl.hidden) return;
  const windowEl = document.querySelector(".tech-areas");
  const margin = 12;
  const n = node.getBoundingClientRect();
  const c = cardEl.getBoundingClientRect();
  if (n.right <= c.left || n.left >= c.right || n.bottom <= c.top || n.top >= c.bottom) return;
  const sheet = getComputedStyle(cardEl).position === "fixed";
  if (sheet) {
    const need = n.bottom - c.top + margin;
    const before = windowEl.scrollTop;
    windowEl.scrollTop += Math.min(need, n.top - windowEl.getBoundingClientRect().top - margin);
    const rest = need - (windowEl.scrollTop - before);
    if (rest > 0) window.scrollBy(0, rest);
  } else {
    windowEl.scrollLeft += n.right - c.left + margin;
  }
}

/**
 * Focus (T3603): closing the card from inside it (× button, Escape) puts the focus back on the
 * node; choosing another technology from a card button keeps the focus on the (redrawn) card.
 */
document.getElementById("tech-card").tabIndex = -1;
let lastSelected = null;

const keyboard = createKeyboard(document.querySelector(".tech-areas"), getLang);
const card = createDetailCard(document.getElementById("tech-card"), TECH_DATA, getLang, {
  onSelect: (id) => {
    selection.select(id);
    revealNode(id);
  },
  onClose: () => selection.select(null),
});
const selection = createSelection(document.querySelector(".tech-areas"), TECH_DATA, document.getElementById("tech-selection-status"), getLang,
  (id) => {
    const cardEl = document.getElementById("tech-card");
    const hadFocus = cardEl.contains(document.activeElement);
    card.show(id);
    writeHash(id);
    keyboard.update(id);
    if (id) requestAnimationFrame(() => keepClearOfCard(id));
    if (hadFocus && id) cardEl.focus({ preventScroll: true });
    else if (hadFocus && lastSelected) document.querySelector(`.tech-node[data-tech-id="${lastSelected}"]`)?.focus({ preventScroll: true });
    lastSelected = id;
  });
const search = createSearch(document.getElementById("tech-search-box"), document.querySelector(".tech-areas"), TECH_DATA, getLang, {
  onPick: (id) => {
    if (selection.selected() !== id) selection.select(id);
    revealNode(id);
  },
  onAreaFilter: scrollToArea,
});
/**
 * Deep link (T3205): `#<technology id>` selects that technology, opens its card and scrolls to it,
 * on load and when the hash changes; other hashes (the footer's #tech-credits) are left alone.
 * The selection writes its id back to the hash without adding history entries.
 */
const knownIds = new Set(TECH_DATA.technologies.map((tech) => tech.id));
let unknownHashId = null;

function writeHash(id) {
  const current = techIdFromHash(window.location.hash);
  if (id && current !== id) history.replaceState(null, "", "#" + id);
  else if (!id && current && knownIds.has(current)) history.replaceState(null, "", window.location.pathname + window.location.search);
}

function showUnknownHash() {
  if (unknownHashId && !selection.selected()) {
    document.getElementById("tech-selection-status").textContent = t(getLang(), "techTreeHashUnknown").replace("{id}", unknownHashId);
  }
}

function openFromHash() {
  const id = techIdFromHash(window.location.hash);
  unknownHashId = null;
  if (!id) return;
  if (!knownIds.has(id)) {
    if (id.startsWith("tech_")) {
      unknownHashId = id;
      if (selection.selected()) selection.select(null);
      showUnknownHash();
    }
    return;
  }
  if (selection.selected() !== id) selection.select(id);
  revealNode(id);
}

openFromHash();
// the web font can still change the layout after the first scroll
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    const id = techIdFromHash(window.location.hash);
    if (id && id === selection.selected()) revealNode(id);
  });
}
window.addEventListener("hashchange", openFromHash);

const zoom = createZoom(document.querySelector(".tech-areas"), document.getElementById("tech-zoom-bar"), getLang);
const comparison = createCompare(document.getElementById("tech-compare-box"), VERSION, TECH_DATA, getLang);
onLanguageChange((lang) => {
  comparison.relabel();
  keyboard.relabel();
  renderLegend(lang);
  selection.announce();
  card.refresh();
  search.relabel();
  zoom.relabel();
  showUnknownHash();
});

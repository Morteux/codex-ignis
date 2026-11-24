/**
 * Planet simulator: deep links to a catalogue entry (T3405).
 *
 * `planet-sim.html#building=<id>` opens the Planet tab, the Buildings catalogue and the category of
 * that building, scrolls to its entry, highlights it and focuses it. `#district=<id>` does the same
 * with the Districts catalogue: the id is a district of DISTRICTS (planet-data.js) or of
 * SPECIAL_DISTRICTS (body-type-data.js), the ids of the tech tree data (`unlock.sim.id`). Building
 * ids outside the catalogue also work: a capital highlights the capital control of the Planet tab
 * (the tier is not changed) and a branch office building opens the Branch offices tab. When the
 * entry is not shown (its requirements are not met, or the current celestial body has other
 * districts or capitals) or the id is unknown, the notice banner says so. Read on load (after
 * every module of the page) and on `hashchange`.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { BUILDINGS, CAPITAL_SETS, DISTRICTS, RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { SPECIAL_CAPITAL_SETS, SPECIAL_DISTRICTS } from "./body-type-data.js";
import { BRANCH_OFFICE_BUILDINGS } from "./branch-office-data.js";
import { showNotice, catalogEl, districtsCatalogEl } from "./planet-sim-dom.js";
import { currentCapitalSet, isBuildingAvailable, primaryDistrictDef, secondaryDistrictDef } from "./planet-sim-rules.js";
import { setActiveTab, setMainTab, openDistrictsTab } from "./planet-sim-tabs.js";
import { buildingDisplayName } from "./planet-sim-text.js";
import { sim } from "./planet-sim-state.js";

const HIGHLIGHT_CLASS = "is-deep-linked";

/** `#building=<id>` / `#district=<id>` → { type, id }; anything else → null. */
export function parseSimDeepLink(hash) {
  const match = /^#(building|district)=([\w-]+)$/.exec(hash || "");
  return match ? { type: match[1], id: decodeURIComponent(match[2]) } : null;
}

/** District definition of a deep link id (regular or special district), or null. */
function districtDefinition(id) {
  return DISTRICTS[id] || SPECIAL_DISTRICTS[id] || null;
}

/** Catalogue group (urban / generator / mining / agriculture) that shows this district on the current body, or null. */
function districtGroup(def) {
  if (primaryDistrictDef().i18nKey === def.i18nKey) return "urban";
  return RESOURCE_DISTRICT_ORDER.find((cat) => {
    const group = secondaryDistrictDef(cat);
    return !group.unavailable && group.i18nKey === def.i18nKey;
  }) || null;
}

function highlight(target, focusTarget) {
  target.classList.add(HIGHLIGHT_CLASS);
  target.scrollIntoView({ block: "center" });
  focusTarget.focus({ preventScroll: true });
}

const ALL_CAPITALS = [...Object.values(CAPITAL_SETS), ...Object.values(SPECIAL_CAPITAL_SETS)].flat();

/** A capital: the capital control of the Planet tab when the current capital set has it. */
function openCapital(capital) {
  setMainTab("planet");
  if (!currentCapitalSet().some((entry) => entry.id === capital.id)) {
    return showNotice(t(getLang(), "planetSimDeepLinkUnavailable").replace("{name}", t(getLang(), capital.i18nKey)));
  }
  const control = document.querySelector(".planet-capital-control");
  if (!control) return null;
  control.tabIndex = -1;
  highlight(control, control);
  return control;
}

/** A branch office building (legal or illegal variant): the Branch offices tab, where its slots are chosen. */
function openBranchBuilding(entry) {
  setMainTab("branches");
  showNotice(t(getLang(), "planetSimDeepLinkBranch").replace("{name}", t(getLang(), entry.i18nKey)));
  return document.querySelector("#planet-tab-panel-branches");
}

function openBuilding(id) {
  const building = BUILDINGS.find((b) => b.id === id);
  if (!building) {
    const capital = ALL_CAPITALS.find((entry) => entry.id === id);
    if (capital) return openCapital(capital);
    const branch = BRANCH_OFFICE_BUILDINGS.flatMap((entry) => [entry, entry.illegal].filter(Boolean)).find((entry) => entry.id === id);
    if (branch) return openBranchBuilding(branch);
    return showNotice(t(getLang(), "planetSimDeepLinkUnknown").replace("{id}", id));
  }
  setMainTab("planet");
  sim.deepLink = { type: "building", id };
  setActiveTab("buildings");
  const entry = isBuildingAvailable(building) && catalogEl?.querySelector(`.planet-catalog-entry[data-building-id="${CSS.escape(id)}"]`);
  if (!entry) return showNotice(t(getLang(), "planetSimDeepLinkUnavailable").replace("{name}", buildingDisplayName(building)));
  const category = entry.closest("details");
  if (category) category.open = true;
  // a disabled button (no free slot that accepts it, colony limit) cannot take the focus: the entry takes it
  const button = entry.querySelector(".planet-catalog-item");
  if (button.disabled) entry.tabIndex = -1;
  highlight(entry, button.disabled ? entry : button);
  return entry;
}

function openDistrict(id) {
  const def = districtDefinition(id);
  if (!def) return showNotice(t(getLang(), "planetSimDeepLinkUnknown").replace("{id}", id));
  setMainTab("planet");
  const group = districtGroup(def);
  if (!group) {
    setActiveTab("districts");
    return showNotice(t(getLang(), "planetSimDeepLinkUnavailable").replace("{name}", t(getLang(), def.i18nKey)));
  }
  sim.deepLink = { type: "district", group };
  openDistrictsTab(group);
  const card = districtsCatalogEl?.querySelector(`.planet-district-card[data-district-group="${group}"]`);
  if (!card) return null;
  card.tabIndex = -1;
  highlight(card, card);
  return card;
}

/** Opens the catalogue entry of the current hash, if it is a deep link. Returns the highlighted element (or null). */
export function openSimDeepLink(hash = window.location.hash) {
  const link = parseSimDeepLink(hash);
  sim.deepLink = null;
  document.querySelectorAll("." + HIGHLIGHT_CLASS).forEach((node) => node.classList.remove(HIGHLIGHT_CLASS));
  if (!link) return null;
  return (link.type === "building" ? openBuilding(link.id) : openDistrict(link.id)) || null;
}

function start() {
  openSimDeepLink();
  window.addEventListener("hashchange", () => openSimDeepLink());
}

// Module scripts run before DOMContentLoaded: waiting for it lets the empire, celestial body and
// library modules apply their state first, so the catalogue shows what the user will see.
if (document.readyState === "loading" || document.readyState === "interactive") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}

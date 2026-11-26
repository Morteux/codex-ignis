/**
 * Planet simulator: total build time of the planet (T2601, PLANET_SIM_GDD.md §6.2).
 *
 * Adds the game build time (`base_buildtime`, days, js/build-time-data.js generated from the 4.5.4 extractor data)
 * of everything the planet has: the capital (every upgrade from its first tier), the active buildings (with the
 * earlier tiers of an upgraded building), every district copy and every chosen specialization (zone). The total is
 * sequential (one item after another): the game builds the items of a planet in one queue whose Build Queue
 * Capacity base value is not in the game files, and no build speed modifier is applied (the simulator models none;
 * the ones of the current civics, origin and designation are only listed). Items with no game time are left out
 * and listed.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";
import { BUILDING_BUILD_TIMES, DISTRICT_BUILD_TIMES, SPECIALIZATION_BUILD_TIMES, BUILD_SPEED_SOURCES, BUILD_TIME_RULESET, DAYS_PER_YEAR } from "./build-time-data.js";
import { RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { ORIGINS } from "./empire-data.js";
import { getDesignation } from "./designation-data.js";
import { getPlanetState } from "./planet-state.js";
import { unlockedKeys, inactiveReason, currentCapitalSet, currentCapital, bodyRules, usesWildernessDistricts, primaryOption, secondaryOption, secondaryDistrictDef, districtDisplayName } from "./planet-sim-rules.js";
import { builtMap, buildingsById, districtState, sim } from "./planet-sim-state.js";

export { DAYS_PER_YEAR };

/** Days → whole years and remaining days (360-day game years). */
export function splitYears(days) {
  return { years: Math.floor(days / DAYS_PER_YEAR), days: days % DAYS_PER_YEAR };
}

/** { game, days } of a district entry of DISTRICT_BUILD_TIMES, by authority or secondary set. */
function districtEntry(key, { authorityId, setIndex } = {}) {
  const entry = DISTRICT_BUILD_TIMES[key];
  if (!entry) return null;
  if (entry.byAuthority) return entry.byAuthority[authorityId] || entry.byAuthority.default;
  if (entry.sets) return entry.sets[Math.max(0, (setIndex || 1) - 1)] || entry.sets[0];
  return entry;
}

/** Key of DISTRICT_BUILD_TIMES of the primary district (the "urban" group) of the current body. */
function primaryDistrictKey(rules) {
  if (rules?.districtLayout === "lathe") return rules.latheDistricts[0];
  if (rules?.primaryDistrictByAuthority) return rules.primaryDistrictByAuthority[getPlanetState().authorityId] || rules.primaryDistrictByAuthority.default;
  if (rules?.primaryDistrict) return rules.primaryDistrict;
  return usesWildernessDistricts() ? "wilderness.urban" : "urban";
}

/** Key of DISTRICT_BUILD_TIMES of a secondary group (generator / mining / agriculture keys) of the current body. */
function secondaryDistrictKey(rules, cat) {
  const index = RESOURCE_DISTRICT_ORDER.indexOf(cat);
  if (rules?.districtLayout === "habitat" || rules?.districtLayout === "volcanic") return rules.resourceDistricts[index];
  if (rules?.districtLayout === "lathe") return index === 0 ? rules.latheDistricts[1] : null;
  if (rules?.districtLayout === "urbanSecondary" && rules.secondaryDistrict) return rules.secondaryDistrict;
  return usesWildernessDistricts() ? `wilderness.${cat}` : cat;
}

/** T2606: game build time (days) of one copy of a building or capital (its own tier only), or null when not in the data. */
export function buildingBuildDays(id) {
  return BUILDING_BUILD_TIMES[id]?.steps?.at(-1)?.[1] ?? null;
}

/** T2606: game build time (days) of one district of a group ("urban" or a RESOURCE_DISTRICT_ORDER key) on the current body, or null. */
export function districtBuildDays(group) {
  const rules = bodyRules();
  if (group === "urban") return districtEntry(primaryDistrictKey(rules), { authorityId: getPlanetState().authorityId })?.days ?? null;
  const key = secondaryDistrictKey(rules, group);
  return key ? districtEntry(key, { setIndex: secondaryDistrictDef(group).setIndex })?.days ?? null : null;
}

/**
 * Build time of the planet: { totalDays, lines: [{ kind, id|district, count, days, i18nKey?, missing? }], missing:
 * [{ kind, id }], speedSources: [{ kind, key, modifiers }] }. `lines` days are already multiplied by `count`.
 */
export function computeBuildTime() {
  const state = getPlanetState();
  const rules = bodyRules();
  const lines = [];
  const missing = [];

  // Capital: every tier of the set up to the current one is a construction (an upgrade of the previous tier); a tier
  // with no game time (the first one, which comes with the colony) is left out and listed.
  const capital = currentCapital();
  const set = currentCapitalSet();
  let capitalDays = 0;
  let capitalSteps = 0;
  set.slice(0, Math.max(0, set.indexOf(capital)) + 1).forEach((entry) => {
    const days = BUILDING_BUILD_TIMES[entry.id]?.days;
    if (days != null) { capitalDays += days; capitalSteps += 1; } else missing.push({ kind: "capital", id: entry.id, i18nKey: entry.i18nKey });
  });
  if (capitalSteps) lines.push({ kind: "capital", id: capital.id, i18nKey: capital.i18nKey, count: 1, days: capitalDays, steps: capitalSteps });

  // Active buildings (the ones the economy counts), grouped by id; an upgraded building adds its earlier tiers.
  const unlocked = unlockedKeys();
  const buildingCounts = new Map();
  builtMap.forEach((id, key) => {
    if (!unlocked.includes(key)) return;
    const building = buildingsById.get(id);
    if (building && !inactiveReason(key, building, unlocked)) buildingCounts.set(id, (buildingCounts.get(id) || 0) + 1);
  });
  buildingCounts.forEach((count, id) => {
    const times = BUILDING_BUILD_TIMES[id];
    const building = buildingsById.get(id);
    if (!times || times.steps.some(([, d]) => d == null)) {
      missing.push({ kind: "building", id, i18nKey: building?.i18nKey });
      return;
    }
    const perCopy = times.steps.reduce((sum, [, d]) => sum + d, 0);
    lines.push({ kind: "building", id, i18nKey: building?.i18nKey, count, days: perCopy * count, steps: times.steps.length });
  });

  // Districts: every copy of the primary group and of the three secondary groups.
  const addDistricts = (group, key, count, options) => {
    if (!key || count <= 0) return;
    const entry = districtEntry(key, options);
    if (entry?.days == null) { missing.push({ kind: "district", id: key }); return; }
    lines.push({ kind: "district", district: group, count, days: entry.days * count });
  };
  addDistricts("urban", primaryDistrictKey(rules), districtState.urban.count, { authorityId: state.authorityId });
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const def = secondaryDistrictDef(cat);
    if (def.unavailable) return;
    addDistricts(cat, secondaryDistrictKey(rules, cat), districtState[cat].count, { setIndex: def.setIndex });
  });

  // Specializations (zones): each chosen one is built once.
  const specializations = [
    ...districtState.urban.slots.map((optionId) => primaryOption(optionId)),
    ...RESOURCE_DISTRICT_ORDER.map((cat) => secondaryOption(cat, districtState[cat].optionId))
  ].filter(Boolean);
  specializations.forEach((option) => {
    const times = SPECIALIZATION_BUILD_TIMES[option.id];
    if (times?.days == null) { missing.push({ kind: "specialization", id: option.id, i18nKey: option.i18nKey }); return; }
    const found = lines.find((line) => line.kind === "specialization" && line.id === option.id);
    if (found) { found.count += 1; found.days += times.days; } else lines.push({ kind: "specialization", id: option.id, i18nKey: option.i18nKey, count: 1, days: times.days });
  });

  // Build speed and Build Queue Capacity of the current civics, origin and designation (listed, not applied).
  const speedSources = [];
  (state.civicIds || []).forEach((key) => { if (BUILD_SPEED_SOURCES.civics[key]) speedSources.push({ kind: "civic", key, modifiers: BUILD_SPEED_SOURCES.civics[key].modifiers }); });
  if (state.originId && BUILD_SPEED_SOURCES.origins[state.originId]) speedSources.push({ kind: "origin", key: state.originId, modifiers: BUILD_SPEED_SOURCES.origins[state.originId].modifiers });
  if (sim.selectedDesignationId && BUILD_SPEED_SOURCES.designations[sim.selectedDesignationId]) {
    speedSources.push({ kind: "designation", key: sim.selectedDesignationId, modifiers: BUILD_SPEED_SOURCES.designations[sim.selectedDesignationId].modifiers });
  }

  const totalDays = lines.reduce((sum, line) => sum + line.days, 0);
  return { totalDays, lines, missing, speedSources };
}

// ── Fixed planet summary: total and breakdown ────────────────────────────────────────────────

/** Game icon of build time ("mod_planet_building_time_mult", StellarisAssets modifiers/). */
const BUILD_TIME_ICON = "modifiers/mod_planet_building_time_mult.png";

const DISTRICT_MODIFIER_NAMES = {
  mining: "districtMining", farming: "districtAgriculture", generator: "districtGenerator",
  craglands: "districtCommunalBiome", photosynthesis_fields: "districtPhotosynthesisField",
  hollow_mountains: "districtHollowMountain", orchard_forests: "districtOrchardForest"
};

function modifierText(lang, key, value) {
  const pct = (v) => `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`;
  if (key === "planet_building_build_speed_mult") return `${t(lang, "buildTimeSpeedInfrastructure")} ${pct(value)}`;
  if (key === "planet_building_capacity_add") return `${t(lang, "buildTimeQueueCapacity")} ${value > 0 ? "+" : "−"}${Math.abs(value)}`;
  const district = key.match(/^planet_district_(.+)_build_speed_mult$/)?.[1];
  const nameKey = DISTRICT_MODIFIER_NAMES[district];
  return `${t(lang, "buildTimeSpeedDistrict")(nameKey ? t(lang, nameKey) : district)} ${pct(value)}`;
}

function sourceName(lang, source) {
  if (source.kind === "civic") return t(lang, source.key);
  if (source.kind === "origin") return t(lang, ORIGINS.find((origin) => origin.id === source.key)?.i18nKey || source.key);
  return t(lang, getDesignation(source.key)?.i18nKey || source.key);
}

function lineText(lang, line) {
  if (line.kind === "capital") return t(lang, "buildTimeLineCapital")(t(lang, line.i18nKey), line.steps);
  if (line.kind === "building") return t(lang, "buildTimeLineBuilding")(t(lang, line.i18nKey), line.count, line.steps);
  if (line.kind === "district") return t(lang, "buildTimeLineCount")(districtDisplayName(line.district), line.count);
  return t(lang, "buildTimeLineCount")(t(lang, line.i18nKey), line.count);
}

function paragraph(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

/** Paints the build time item of the fixed planet summary (#planet-build-time) from computeBuildTime(). */
export function renderBuildTime() {
  const details = document.querySelector("#planet-build-time");
  if (!details) return;
  const lang = getLang();
  const result = computeBuildTime();
  const exact = splitYears(result.totalDays);
  const label = t(lang, "buildTimeLabel");
  const exactText = `${label}: ${t(lang, "buildTimeYears")(exact.years, exact.days)}`;
  details.querySelector("#planet-build-time-icon").src = `${STELLARIS_ASSETS_BASE}${BUILD_TIME_ICON}`;
  const years = (result.totalDays / DAYS_PER_YEAR).toFixed(1).replace(/\.0$/, "");
  details.querySelector("#planet-build-time-total").textContent = t(lang, "buildTimeCompact")(result.totalDays, lang === "es" ? years.replace(".", ",") : years);
  const summary = details.querySelector("#planet-build-time-summary");
  summary.title = exactText;
  summary.setAttribute("aria-label", exactText);
  details.dataset.totalDays = String(result.totalDays);

  const panel = details.querySelector("#planet-build-time-panel");
  panel.replaceChildren();
  const heading = document.createElement("h3");
  heading.className = "planet-build-time-heading";
  heading.textContent = exactText;
  panel.append(heading);
  if (!result.lines.length) panel.append(paragraph("planet-build-time-empty", t(lang, "buildTimeEmpty")));
  else {
    const list = document.createElement("ul");
    list.className = "planet-build-time-list";
    result.lines.forEach((line) => {
      const item = document.createElement("li");
      item.dataset.kind = line.kind;
      item.dataset.days = String(line.days);
      const name = document.createElement("span");
      name.textContent = lineText(lang, line);
      const value = document.createElement("span");
      value.className = "planet-build-time-days";
      value.textContent = t(lang, "buildTimeDays")(line.days);
      item.append(name, value);
      list.append(item);
    });
    panel.append(list);
  }
  if (result.missing.length) {
    const names = result.missing.map((item) => (item.i18nKey ? t(lang, item.i18nKey) : item.id)).join(", ");
    panel.append(paragraph("planet-build-time-missing", `${t(lang, "buildTimeMissingHeading")} ${names}`));
  }
  panel.append(paragraph("planet-build-time-note", t(lang, "buildTimeQueueNote")));
  panel.append(paragraph("planet-build-time-note", t(lang, "buildTimeSpeedNote")));
  if (result.speedSources.length) {
    const list = document.createElement("ul");
    list.className = "planet-build-time-speed";
    result.speedSources.forEach((source) => {
      const item = document.createElement("li");
      item.textContent = `${sourceName(lang, source)}: ${Object.entries(source.modifiers).map(([key, value]) => modifierText(lang, key, value)).join(", ")}`;
      list.append(item);
    });
    panel.append(paragraph("planet-build-time-note", t(lang, "buildTimeSpeedHeading")), list);
  }
  panel.append(paragraph("planet-build-time-note", t(lang, "buildTimeLeftOut")));
  panel.append(paragraph("planet-build-time-source", t(lang, "buildTimeSource")(BUILD_TIME_RULESET)));
}

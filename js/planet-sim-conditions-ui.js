/**
 * Planet simulator, Planet tab: planet modifiers summary and the conditions panel
 * (happiness, stability, crime... with manual values and their sources).
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { JOBS, CIVILIAN_OUTPUTS, STRATUM_I18N_KEYS, RESOURCES, EFFECT_SCALE } from "./planet-data.js";
import { PLANET_MODIFIERS } from "./planet-modifier-data.js";
import { STRATEGIC_DEPOSITS, BLOCKERS } from "./planetary-features-data.js";
import { getStackingRules, getCalculationOrder } from "./stacking-rules.js";
import { getPlanetState } from "./planet-state.js";
import { getEdict } from "./edict-data.js";
import { getPolicyOption } from "./policy-data.js";
import { createInfoPanel, syncInfoButtons } from "./info-panels.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS, ETHIC_OPTIONS, AUTHORITIES } from "./empire-data.js";
import { PLANET_TYPES } from "./celestial-data.js";
import { getDesignation } from "./designation-data.js";
import { refreshEconomyOnly } from "./planet-sim-production-ui.js";
import { primaryOption, branchBuildingName, sanitizeCivilians } from "./planet-sim-rules.js";
import { buildingsById, MANUAL_CONDITION_LIMIT, manualConditions, sim } from "./planet-sim-state.js";
import { buildingDisplayName, jobName, resourceName, formatAmount } from "./planet-sim-text.js";

const modifiersEl = document.querySelector("#planet-modifiers");

const conditionsEl = document.querySelector("#planet-conditions");

/**
 * Categorías de modificador del panel (P8.2), en orden de aparición. El texto de apilado sale de las reglas de la
 * versión de datos (js/stacking-rules.js, P8.3); `unit`: "percent" o "flat" para formatear el valor.
 */
const MODIFIER_CATEGORIES = [
  { id: "jobFlat", label: "modifierCatJobFlat", unit: "flat" },
  { id: "jobEfficiency", label: "modifierCatJobEfficiency", unit: "percent" },
  { id: "stratumEfficiency", label: "modifierCatStratumEfficiency", unit: "percent" },
  { id: "stratumOutput", label: "modifierCatStratumOutput", unit: "percent" },
  { id: "jobUpkeep", label: "modifierCatJobUpkeep", unit: "percent" },
  { id: "jobResourceMult", label: "modifierCatJobResourceMult", unit: "percent" },
  { id: "upkeepMult", label: "modifierCatUpkeepMult", unit: "percent" },
  { id: "stabilityEffect", label: "modifierCatStabilityEffect", unit: "percent" },
  { id: "tradeConversion", label: "modifierCatTradeConversion", unit: "percent" },
  { id: "resourceMult", label: "modifierCatResourceMult", unit: "percent" },
  { id: "resourceFlat", label: "modifierCatResourceFlat", unit: "flat" },
  { id: "conditionFlat", label: "modifierCatConditionFlat", unit: "flat" },
  { id: "flat", label: "modifierCatFlat", unit: "flat" }
];

export function modifierSourceName(source) {
  if (source.kind === "building") return buildingDisplayName(buildingsById.get(source.id));
  if (source.kind === "designation") return t(getLang(), getDesignation(source.id).i18nKey);
  if (source.kind === "ethic") return t(getLang(), ETHIC_OPTIONS[source.id].i18nKey);
  if (source.kind === "policy") {
    const [groupId, optionId] = source.id.split(":");
    return t(getLang(), getPolicyOption(groupId, optionId).i18nKey);
  }
  if (source.kind === "authority") return t(getLang(), AUTHORITIES.find((entry) => entry.id === source.id).i18nKey);
  if (source.kind === "stability") return t(getLang(), "conditionsStability");
  if (source.kind === "edict") return t(getLang(), getEdict(source.id).i18nKey);
  if (source.kind === "planetModifier") { const modifier = PLANET_MODIFIERS.find((entry) => entry.id === source.id); return modifier ? t(getLang(), modifier.i18nKey) : source.id; }
  if (source.kind === "blocker") { const blocker = BLOCKERS.find((entry) => entry.id === source.id); return blocker ? t(getLang(), blocker.i18nKey) : source.id; }
  if (source.kind === "feature") { const deposit = STRATEGIC_DEPOSITS.find((entry) => entry.id === source.id); return deposit ? t(getLang(), deposit.i18nKey) : source.id; }
  if (source.kind === "specialization") { const option = primaryOption(source.id); return option ? t(getLang(), option.i18nKey) : source.id; }
  if (source.kind === "celestial") { const type = PLANET_TYPES.find((entry) => entry.id === source.id); return type ? t(getLang(), type.i18nKey) : source.id; }
  if (source.kind === "job") return jobName(source.id);
  if (source.kind === "branch") return branchBuildingName(source.id);
  if (source.kind === "jobSwap") return t(getLang(), "modifierSourceJobSwap").replace("{job}", JOBS[source.id] ? jobName(source.id) : source.id);
  return source.id;
}

function modifierTargetName(modifier) {
  const parts = [];
  if (modifier.job === "all") parts.push(t(getLang(), "modifierTargetAllJobs"));
  else if (modifier.job === "civilian") parts.push(t(getLang(), CIVILIAN_OUTPUTS[ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id) ? "gestalt" : "individualist"].i18nKey));
  else if (modifier.job) parts.push(jobName(modifier.job));
  if (modifier.stratum) parts.push(t(getLang(), STRATUM_I18N_KEYS[modifier.stratum]));
  if (modifier.resource) parts.push(resourceName(modifier.resource));
  const conditionStatKeys = { happiness: "conditionsHappiness", stability: "conditionsStability", crime: "conditionsCrime", buildingUpkeep: "modifierTargetBuildingUpkeep", districtEnergyUpkeep: "modifierTargetDistrictEnergyUpkeep" };
  if (modifier.stat) parts.push(RESOURCES[modifier.stat] ? resourceName(modifier.stat) : (modifier.stat === "housing" ? t(getLang(), "planetSimStatHousingShort") : conditionStatKeys[modifier.stat] ? t(getLang(), conditionStatKeys[modifier.stat]) : modifier.stat));
  return parts.join(" · ");
}

/** Panel de modificadores activos (P8.2): origen, categoría afectada, valor y cómo se apila. */
export function renderModifiers(totals) {
  if (!modifiersEl) return;
  modifiersEl.replaceChildren();
  syncInfoButtons(getLang());
  const rulesetId = getPlanetState().rulesetId;
  const stackingRules = getStackingRules(rulesetId);
  // Panel de explicación (oculto hasta pulsar "i"): nota general, orden de cálculo, reglas de apilado y procedencia.
  const info = createInfoPanel("planet-modifiers");
  const infoNote = document.createElement("p");
  infoNote.className = "planet-modifier-stacking";
  infoNote.textContent = t(getLang(), "modifiersNote");
  info.append(infoNote);
  const order = document.createElement("ol");
  order.className = "planet-modifier-order";
  getCalculationOrder(rulesetId).forEach((key) => {
    const item = document.createElement("li");
    item.textContent = t(getLang(), key);
    order.append(item);
  });
  const orderHeading = document.createElement("h3");
  orderHeading.className = "planet-modifier-heading";
  orderHeading.textContent = t(getLang(), "modifierOrderHeading");
  const provenance = document.createElement("p");
  provenance.className = "planet-modifier-stacking";
  provenance.textContent = t(getLang(), "modifierRulesUnverified");
  const rulesHeading = document.createElement("h3");
  rulesHeading.className = "planet-modifier-heading";
  rulesHeading.textContent = t(getLang(), "modifierRulesHeading");
  const rulesList = document.createElement("ul");
  rulesList.className = "planet-modifier-order";
  MODIFIER_CATEGORIES.forEach((category) => {
    const categoryRule = stackingRules[category.id];
    const item = document.createElement("li");
    item.textContent = `${t(getLang(), category.label)}: ${t(getLang(), categoryRule.stacking)} (${t(getLang(), categoryRule.combine === "multiply" ? "modifierCombineMultiply" : "modifierCombineAdd")})`;
    rulesList.append(item);
  });
  info.append(orderHeading, order, rulesHeading, rulesList, provenance);
  modifiersEl.append(info);
  const list = totals.modifiers || [];
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(getLang(), "modifiersEmpty");
    modifiersEl.append(empty);
    return;
  }
  MODIFIER_CATEGORIES.forEach((category) => {
    const items = list.filter((modifier) => modifier.category === category.id);
    if (!items.length) return;
    const heading = document.createElement("h3");
    heading.className = "planet-modifier-heading";
    heading.textContent = t(getLang(), category.label);
    modifiersEl.append(heading);
    items.forEach((modifier) => {
      const row = document.createElement("div");
      row.className = "planet-modifier-row";
      const source = document.createElement("span");
      source.className = "planet-modifier-source";
      source.textContent = modifierSourceName(modifier.source) + (modifier.count > 1 ? ` ×${modifier.count}` : "");
      const kind = document.createElement("span");
      kind.className = "planet-modifier-kind";
      kind.textContent = t(getLang(), `modifierSourceKind_${modifier.source.kind}`);
      const target = document.createElement("span");
      target.className = "planet-modifier-target";
      target.textContent = modifierTargetName(modifier);
      const value = document.createElement("span");
      value.className = `planet-modifier-value ${modifier.value < 0 ? "is-negative" : "is-positive"}`;
      const shown = category.unit === "percent" ? modifier.value * 100 : modifier.value;
      value.textContent = `${formatAmount(shown, true)}${category.unit === "percent" ? "%" : ""}`;
      row.append(source, kind, target, value);
      modifiersEl.append(row);
    });
  });
}

/** Panel de condiciones del planeta (P9.1): pops, vivienda y servicios. Valores en escala ×100 como el resto de la interfaz. */
export function renderConditions(totals) {
  if (!conditionsEl) return;
  syncInfoButtons(getLang());
  conditionsEl.replaceChildren();
  const c = totals.conditions;
  const info = createInfoPanel("planet-conditions");
  // P17.4: cada explicación va seguida de un ejemplo con las cifras actuales ("Now: ..."). Pops, vivienda y servicios en ×100.
  const infoLine = (text, isExample) => {
    const line = document.createElement("p");
    line.className = `planet-modifier-stacking${isExample ? " info-example" : ""}`;
    line.textContent = text;
    info.append(line);
  };
  const x100 = (n) => formatAmount(n * EFFECT_SCALE, false);
  const signed = (n) => (n < 0 ? `− ${formatAmount(-n, false)}` : `+ ${formatAmount(n, false)}`);
  infoLine(t(getLang(), "conditionsInfoPops"));
  infoLine(t(getLang(), "conditionsInfoNowPops")(x100(c.pops - c.civilians), x100(c.civilians), x100(c.pops)), true);
  infoLine(t(getLang(), "conditionsInfoHousing"));
  infoLine(t(getLang(), "conditionsInfoNowHousing")(x100(c.housingProvided), x100(c.pops), x100(c.housingMissing)), true);
  infoLine(t(getLang(), "conditionsInfoAmenities"));
  infoLine(t(getLang(), "conditionsInfoNowAmenities")(x100(c.amenitiesProvided), x100(c.amenitiesLost), x100(c.amenitiesUsage), formatAmount(c.amenitiesAvailable * EFFECT_SCALE, true)), true);
  const ih = c.happiness;
  const ist = c.stability;
  infoLine(t(getLang(), "conditionsInfoHappiness"));
  if (ih.applicable) infoLine(t(getLang(), "conditionsInfoNowHappiness")(signed(ih.effect), signed(ih.manual), formatAmount(ih.value, false)), true);
  infoLine(t(getLang(), "conditionsInfoStability"));
  if (ist.applicable) {
    const main = ist.gestalt ? ist.amenitiesEffect : ist.approvalBonus;
    const mainLabel = t(getLang(), ist.gestalt ? "conditionsInfoNowStabilityAmenities" : "conditionsInfoNowStabilityApproval");
    infoLine(t(getLang(), "conditionsInfoNowStability")(signed(main), mainLabel, signed(ist.jobs), signed(ist.manual), signed(-ist.housingPenalty), formatAmount(ist.value, false), formatAmount(c.stabilityEffect * 100, true)), true);
  }
  const icr = c.crime;
  infoLine(t(getLang(), icr.gestalt ? "conditionsInfoDeviancy" : "conditionsInfoCrime"));
  if (ist.applicable) {
    infoLine(icr.gestalt
      ? t(getLang(), "conditionsInfoNowDeviancy")(formatAmount(icr.fromJobs, true), formatAmount(icr.total, false))
      : t(getLang(), "conditionsInfoNowCrime")(x100(c.pops), formatAmount(c.pops, false), formatAmount(ih.value, false), formatAmount(icr.fromHappiness, false), formatAmount(icr.fromJobs, true), formatAmount(icr.total, false)), true);
  } else {
    infoLine(t(getLang(), "conditionsInfoNoPops"), true);
  }
  if (ih.edicts || ist.edicts || icr.fromEdicts) {
    infoLine(t(getLang(), "conditionsInfoNowEdicts")(signed(ih.edicts || 0), signed(ist.edicts || 0), signed(icr.fromEdicts || 0)), true);
  }
  infoLine(t(getLang(), "conditionsInfoSources"));
  conditionsEl.append(info);
  const rows = [
    c.lathe ? ["neuralChips", "conditionsNeuralChips", c.neuralChips, false] : ["civilians", "conditionsCivilians", c.civilians, false],
    ["pops", "conditionsPops", c.pops, false],
    ["housingProvided", "conditionsHousingProvided", c.housingProvided, false],
    // P10.5: only on bodies that change the pop housing usage (Machine World).
    ...(c.housingUsagePct ? [["housingUsage", "conditionsHousingUsage", -c.housingUsage, true]] : []),
    ["housingMissing", "conditionsHousingMissing", c.housingMissing, true],
    ["amenitiesProvided", "conditionsAmenitiesProvided", c.amenitiesProvided, false],
    ["amenitiesLost", "conditionsAmenitiesLost", -c.amenitiesLost, true],
    ["amenitiesUsage", "conditionsAmenitiesUsage", -c.amenitiesUsage, true],
    ["amenitiesAvailable", "conditionsAmenitiesAvailable", c.amenitiesAvailable, false]
  ];
  rows.forEach(([key, labelKey, value, badWhenPositive]) => {
    const row = document.createElement("div");
    const bad = value < 0 || (badWhenPositive && value > 0);
    row.className = `planet-resource-row ${bad ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    const label = t(getLang(), labelKey);
    name.textContent = typeof label === "function" ? label(c.housingUsagePct) : label;
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value * EFFECT_SCALE, key === "amenitiesAvailable");
    row.append(name, val);
    conditionsEl.append(row);
  });

  // Felicidad (P9.2) y estabilidad (P9.3 / P9.6): cálculo completo con los números actuales.
  const h = c.happiness;
  const st = c.stability;
  const fmt = (n) => formatAmount(n, false);
  const addNote = (text) => {
    const note = document.createElement("p");
    note.className = "planet-modifier-stacking";
    note.textContent = text;
    conditionsEl.append(note);
  };
  const addRows = (list) => list.forEach(([key, labelKey, value, signed]) => {
    const row = document.createElement("div");
    row.className = `planet-resource-row ${value < 0 ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    name.textContent = t(getLang(), labelKey);
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value, signed && value !== 0);
    row.append(name, val);
    conditionsEl.append(row);
  });
  const amenitiesFormula = () => c.amenitiesEffect.mode === "bonus"
    ? t(getLang(), "conditionsFormulaBonus")(fmt(c.amenitiesAvailable), fmt(c.amenitiesUsage), fmt(c.amenitiesEffect.raw), formatAmount(c.amenitiesEffect.effect, true))
    : c.amenitiesEffect.mode === "penalty"
      ? t(getLang(), "conditionsFormulaPenalty")(fmt(c.amenitiesAvailable), fmt(c.amenitiesUsage), fmt(c.amenitiesEffect.raw), formatAmount(c.amenitiesEffect.effect, true))
      : t(getLang(), "conditionsFormulaNone");

  if (h.applicable) {
    addRows([
      ["happinessBase", "conditionsHappinessBase", h.base, false],
      ["happinessAmenities", "conditionsHappinessAmenities", h.effect, true],
      ...(h.body ? [["happinessBody", "conditionsHappinessBody", h.body, true]] : []),
      ...(h.edicts ? [["happinessEdicts", "conditionsHappinessEdicts", h.edicts, true]] : []),
      ...(h.planetModifiers ? [["happinessPlanetModifiers", "conditionsPlanetModifiers", h.planetModifiers, true]] : []),
      ...(h.branchOffice ? [["happinessBranchOffice", "conditionsBranchOffice", h.branchOffice, true]] : []),
      ["happinessManual", "conditionsHappinessManual", h.manual, true],
      ["happiness", "conditionsHappiness", h.value, false]
    ]);
    addNote(amenitiesFormula());
  } else if (st.gestalt) {
    addNote(t(getLang(), "conditionsHappinessNA"));
  }

  // Without pops there are no stability/crime rows, but the manual rows (civilians / Neural Chips) still need their inputs.
  if (!st.applicable) {
    decorateConditionRows();
    return;
  }
  if (st.gestalt) {
    addRows([
      ["stabilityBase", "conditionsStabilityBase", st.base, false],
      ["stabilityAmenities", "conditionsStabilityAmenities", st.amenitiesEffect, true],
      ["stabilityJobs", "conditionsStabilityJobs", st.jobs, true],
      ...(st.edicts ? [["stabilityEdicts", "conditionsStabilityEdicts", st.edicts, true]] : []),
      ...(st.planetModifiers ? [["stabilityPlanetModifiers", "conditionsPlanetModifiers", st.planetModifiers, true]] : []),
      ...(st.capital ? [["stabilityCapital", "conditionsStabilityCapital", st.capital, true]] : []),
      ...(st.buildings ? [["stabilityBuildings", "conditionsStabilityBuildings", st.buildings, true]] : []),
      ["stabilityManual", "conditionsStabilityManual", st.manual, true],
      ["stabilityHousing", "conditionsStabilityHousing", -st.housingPenalty, true],
      ["stability", "conditionsStability", st.value, false],
      ["stabilityEffect", "conditionsStabilityEffect", c.stabilityEffect * 100, true]
    ]);
    addNote(amenitiesFormula());
  } else {
    addRows([
      ["stabilityBase", "conditionsStabilityBase", st.base, false],
      ["stabilityApproval", "conditionsStabilityApproval", st.approvalBonus, true],
      ["stabilityJobs", "conditionsStabilityJobs", st.jobs, true],
      ...(st.edicts ? [["stabilityEdicts", "conditionsStabilityEdicts", st.edicts, true]] : []),
      ...(st.planetModifiers ? [["stabilityPlanetModifiers", "conditionsPlanetModifiers", st.planetModifiers, true]] : []),
      ...(st.capital ? [["stabilityCapital", "conditionsStabilityCapital", st.capital, true]] : []),
      ...(st.buildings ? [["stabilityBuildings", "conditionsStabilityBuildings", st.buildings, true]] : []),
      ["stabilityManual", "conditionsStabilityManual", st.manual, true],
      ["stabilityHousing", "conditionsStabilityHousing", -st.housingPenalty, true],
      ["stability", "conditionsStability", st.value, false],
      ["stabilityEffect", "conditionsStabilityEffect", c.stabilityEffect * 100, true]
    ]);
    addNote(st.approval >= 50
      ? t(getLang(), "conditionsFormulaApprovalHigh")(fmt(st.approval), formatAmount(st.approvalBonus, true))
      : t(getLang(), "conditionsFormulaApprovalLow")(fmt(st.approval), formatAmount(st.approvalBonus, true)));
  }
  addNote(t(getLang(), "conditionsFormulaHousing")(fmt(Math.max(0, c.pops - c.housingProvided)), fmt(c.pops), formatAmount(-st.housingPenalty, st.housingPenalty !== 0)));

  // P9.5: delincuencia (desviación en gestalt). Solo informativa; en rojo cuando sube.
  const cr = c.crime;
  const crimeRows = cr.gestalt
    ? [["crimeJobs", "conditionsDeviancyJobs", cr.fromJobs], ["crime", "conditionsDeviancy", cr.total]]
    : [["crimeHappiness", "conditionsCrimeHappiness", cr.fromHappiness], ["crimeJobs", "conditionsCrimeJobs", cr.fromJobs], ...(cr.fromEdicts ? [["crimeEdicts", "conditionsCrimeEdicts", cr.fromEdicts]] : []), ...(cr.fromModifiers ? [["crimePlanetModifiers", "conditionsPlanetModifiers", cr.fromModifiers]] : []), ...(cr.fromBranch ? [["crimeBranchOffice", "conditionsBranchOffice", cr.fromBranch]] : []), ["crime", "conditionsCrime", cr.total]];
  crimeRows.forEach(([key, labelKey, value]) => {
    const row = document.createElement("div");
    row.className = `planet-resource-row ${value > 0 ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    name.textContent = t(getLang(), labelKey);
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value, key !== "crime" && value !== 0);
    row.append(name, val);
    conditionsEl.append(row);
  });
  addNote(cr.gestalt
    ? t(getLang(), "conditionsDeviancyNote")
    : t(getLang(), "conditionsFormulaCrime")(fmt(c.pops), fmt(h.value), formatAmount(cr.fromHappiness, false)));

  decorateConditionRows();
}

/** P9.7: etiqueta de origen de cada valor y campos de los valores manuales. */
function decorateConditionRows() {
  conditionsEl.querySelectorAll(".planet-resource-row[data-condition]").forEach((row) => {
    const key = row.dataset.condition;
    const source = CONDITION_SOURCES[key];
    if (!source) return;
    const badge = document.createElement("span");
    badge.className = `planet-condition-source is-${source}`;
    badge.dataset.source = source;
    badge.textContent = t(getLang(), CONDITION_SOURCE_LABELS[source]);
    badge.title = t(getLang(), `${CONDITION_SOURCE_LABELS[source]}Tooltip`);
    row.querySelector(".planet-resource-name").append(" ", badge);
    if (key === "civilians" || key === "neuralChips") {
      // P16.12: civiles, ×100 como los empleos (100 = 1 pop), mínimo 0 y sin tope. P10.5: Neural Chips, igual.
      const chips = key === "neuralChips";
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.min = "0";
      input.className = "planet-condition-input";
      input.value = String(chips ? sim.neuralChipsRaw : sim.civiliansRaw);
      input.setAttribute("aria-label", t(getLang(), chips ? "conditionsNeuralChips" : "conditionsCivilians"));
      input.addEventListener("change", () => {
        if (chips) sim.neuralChipsRaw = sanitizeCivilians(input.value);
        else sim.civiliansRaw = sanitizeCivilians(input.value);
        refreshEconomyOnly();
      });
      row.querySelector(".planet-resource-value").replaceWith(input);
      return;
    }
    const manualKey = MANUAL_CONDITION_ROWS[key];
    if (!manualKey) return;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.min = String(-MANUAL_CONDITION_LIMIT);
    input.max = String(MANUAL_CONDITION_LIMIT);
    input.className = "planet-condition-input";
    input.value = String(manualConditions[manualKey]);
    input.setAttribute("aria-label", t(getLang(), manualKey === "happiness" ? "conditionsHappinessManual" : "conditionsStabilityManual"));
    input.addEventListener("change", () => {
      const value = Number(input.value);
      manualConditions[manualKey] = Number.isFinite(value) ? Math.max(-MANUAL_CONDITION_LIMIT, Math.min(MANUAL_CONDITION_LIMIT, value)) : 0;
      refreshEconomyOnly();
    });
    row.querySelector(".planet-resource-value").replaceWith(input);
  });
}

/**
 * P9.7: origen de cada valor del panel de condiciones. derived = calculado directamente con los datos y las reglas de la wiki;
 * estimated = depende de una simplificación del simulador (uso de servicios 1 por pop, todos los pops iguales, aprobación =
 * felicidad...); manual = introducido por el usuario.
 */
const CONDITION_SOURCES = {
  civilians: "manual", neuralChips: "manual", pops: "derived", housingProvided: "derived", housingMissing: "derived", amenitiesProvided: "derived", amenitiesLost: "derived",
  amenitiesUsage: "estimated", amenitiesAvailable: "estimated",
  happinessBase: "derived", happinessAmenities: "estimated", happinessManual: "manual", happiness: "estimated",
  stabilityBase: "derived", stabilityAmenities: "estimated", stabilityApproval: "estimated", stabilityJobs: "derived", stabilityManual: "manual",
  stabilityHousing: "derived", stability: "estimated", stabilityEffect: "estimated",
  crimeHappiness: "estimated", crimeJobs: "derived", crime: "estimated",
  happinessEdicts: "derived", happinessBody: "derived", happinessPlanetModifiers: "derived", stabilityPlanetModifiers: "derived", crimePlanetModifiers: "derived", stabilityEdicts: "derived", stabilityCapital: "derived", stabilityBuildings: "derived", crimeEdicts: "derived",
  happinessBranchOffice: "derived", crimeBranchOffice: "derived"
};
const CONDITION_SOURCE_LABELS = { manual: "conditionsSourceManual", estimated: "conditionsSourceEstimated", derived: "conditionsSourceDerived" };
const MANUAL_CONDITION_ROWS = { happinessManual: "happiness", stabilityManual: "stability" };

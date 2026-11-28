/**
 * Planet simulator, Planet tab: header stats, summary, resource production with breakdowns,
 * external income, consistency check, stockpile timeline and scenario comparison.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { JOBS, JOB_STRATA, STRATUM_I18N_KEYS, EFFECT_SCALE } from "./planet-data.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS } from "./empire-data.js";
import { conceptIcon, conceptIconUrl, stratumConcept, resourceModifierIconPath } from "./concept-icons.js";
import { PLANET_MODIFIERS } from "./planet-modifier-data.js";
import { BLOCKERS } from "./planetary-features-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { getPlanetState } from "./planet-state.js";
import { getPolicyOption } from "./policy-data.js";
import { createInfoPanel, syncInfoButtons } from "./info-panels.js";
import { renderScenarioCompare } from "./scenario-compare.js";
import { renderStockpileTimeline } from "./stockpile-timeline.js";
import { renderConditions, modifierSourceName } from "./planet-sim-conditions-ui.js";
import { computeTotals } from "./planet-sim-economy.js";
import { updateJobsCounter, renderJobsInfo, renderNonResourceEffects, renderJobSliderRow, renderUnappliedSwaps } from "./planet-sim-jobs-ui.js";
import { districtDisplayName, totalDistrictCount } from "./planet-sim-rules.js";
import { buildingsById, sim } from "./planet-sim-state.js";
import { resourceIcon, resourceName, formatAmount, displayAmount, buildingDisplayName, jobName } from "./planet-sim-text.js";

const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const statHousingIcon = document.querySelector("#planet-stat-housing-icon");
const statAmenitiesIcon = document.querySelector("#planet-stat-amenities-icon");

const summaryEl = document.querySelector("#planet-summary");

const externalEl = document.querySelector("#planet-production-external");
const checkEl = document.querySelector("#planet-production-check");

const producedEl = document.querySelector("#planet-production-produced");
const consumedEl = document.querySelector("#planet-production-consumed");
const netEl = document.querySelector("#planet-production-net");

const districtsUsedLabel = document.querySelector("#planet-districts-used-label");

/** T2605: gestalt empires (no happiness) use the gestalt amenities and stratum sprites. */
function isGestaltEmpire() {
  return ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id);
}

// T2605: header housing / amenities game text icons (ICONS.md); the visible short label is the accessible name.
function syncHeaderIcons() {
  const gestalt = isGestaltEmpire();
  if (statHousingIcon) { statHousingIcon.src = conceptIconUrl("housing"); statHousingIcon.dataset.concept = "housing"; }
  if (statAmenitiesIcon) {
    statAmenitiesIcon.src = conceptIconUrl("amenities", { gestalt });
    statAmenitiesIcon.dataset.concept = gestalt ? "amenitiesGestalt" : "amenities";
  }
}
syncHeaderIcons();

export function renderSummary(totals) {
  if (!summaryEl) return;
  summaryEl.replaceChildren();

  const jobIds = Object.keys(totals.jobCapacities).filter((jobId) => totals.jobCapacities[jobId] > 0);
  updateJobsCounter(jobIds, totals.jobCapacities);
  renderJobsInfo(totals, jobIds);

  if (!jobIds.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(getLang(), "planetSimSummaryEmpty");
    summaryEl.append(empty);
    renderNonResourceEffects(jobIds, totals.conditions);
    return;
  }

  // Los empleos se agrupan por estrato (ver JOB_STRATA en planet-data.js).
  // T2605: each stratum heading starts with its game pop category icon (gestalt: drone categories); the text stays.
  const gestalt = isGestaltEmpire();
  JOB_STRATA.forEach((stratum) => {
    const heading = document.createElement("h3");
    heading.className = "planet-stratum-heading";
    heading.dataset.stratum = stratum;
    const label = t(getLang(), STRATUM_I18N_KEYS[stratum]);
    const icon = conceptIcon(stratumConcept(stratum, { gestalt }), { label, decorative: true, className: "concept-icon planet-stratum-icon" });
    const text = document.createElement("span");
    text.textContent = label;
    heading.append(...(icon ? [icon] : []), text);
    summaryEl.append(heading);

    const stratumJobIds = Object.keys(JOBS).filter((jobId) => JOBS[jobId].stratum === stratum && jobIds.includes(jobId));
    if (!stratumJobIds.length) {
      const empty = document.createElement("p");
      empty.className = "planet-stratum-empty";
      empty.textContent = t(getLang(), "stratumEmpty");
      summaryEl.append(empty);
      return;
    }
    stratumJobIds.forEach((jobId) => {
      summaryEl.append(renderJobSliderRow(jobId, totals.jobCapacities[jobId], totals.jobUnitOutputs[jobId], totals.jobSwaps));
    });
  });
  const unapplied = renderUnappliedSwaps(totals.jobSwaps);
  if (unapplied) summaryEl.append(unapplied);

  renderNonResourceEffects(jobIds, totals.conditions);
}

/**
 * Versión ligera de refresh() para cuando solo cambia la población asignada
 * a un empleo (arrastre del slider, o botones ±100/±1000): recalcula la
 * economía y repinta el panel de recursos, el contador de población y
 * "otros efectos", pero NUNCA toca #planet-summary (las filas de empleo con
 * sus sliders) ni la rejilla de ranuras ni el catálogo — nada de eso cambia
 * por una reasignación de población, y recrearlo interrumpiría el arrastre
 * del propio slider que disparó esta actualización.
 */
export function refreshEconomyOnly() {
  const totals = computeTotals();
  renderProduction(totals);
  renderConditions(totals);
  renderStats(totals);
  const jobIds = Object.keys(totals.jobCapacities).filter((jobId) => totals.jobCapacities[jobId] > 0);
  updateJobsCounter(jobIds, totals.jobCapacities);
  renderJobsInfo(totals, jobIds);
  renderNonResourceEffects(jobIds, totals.conditions);
}

/**
 * Fuentes del desglose por recurso (P8.1), en el orden en que se muestran. `pos`/`neg` son las claves i18n según el
 * signo del importe (nombre completo: tooltip y nombre accesible). T2603: `kind` (o `posKind`/`negKind`) es el icono
 * del juego de la línea (upkeep, bonus, efficiency, upkeepChange, popUpkeep; ICONS.md) y `short` la etiqueta corta
 * que se ve junto al icono (sin la explicación entre paréntesis, que está una sola vez en el panel "i").
 */
const BREAKDOWN_SOURCES = [
  { id: "jobsBase", pos: "breakdownJobsBasePos", neg: "breakdownJobsBaseNeg", negKind: "upkeep", short: "breakdownShortJobsBase" },
  { id: "jobSwapStack", pos: "breakdownJobSwapStack", neg: "breakdownJobSwapStack" },
  { id: "jobsBonus", pos: "breakdownJobsBonusPos", neg: "breakdownJobsBonusNeg", posKind: "bonus", negKind: "upkeep", short: "breakdownShortJobsBuildings" },
  { id: "jobWorkforceScaling", pos: "breakdownJobWorkforceScaling", neg: "breakdownJobWorkforceScaling" },
  { id: "edictJobFlat", pos: "breakdownEdictJobFlat", neg: "breakdownEdictJobFlat", posKind: "bonus", negKind: "upkeep", short: "breakdownShortJobsEdicts" },
  { id: "branchJobFlat", pos: "breakdownBranchJobFlat", neg: "breakdownBranchJobFlat", posKind: "bonus", negKind: "upkeep", short: "breakdownShortJobsBranch" },
  { id: "jobsModifier", pos: "breakdownJobsModifierPos", neg: "breakdownJobsModifierNeg", posKind: "efficiency", negKind: "upkeepChange", short: "breakdownShortJobs" },
  { id: "jobBuildingMult", pos: "breakdownJobBuildingMult", neg: "breakdownJobBuildingMult", kind: "efficiency", short: "breakdownShortBuildings" },
  { id: "policyJobMult", pos: "breakdownPolicyJobMult", neg: "breakdownPolicyJobMult", kind: "efficiency", short: "breakdownShortPolicies" },
  { id: "celestialJobMult", pos: "breakdownCelestialJobMult", neg: "breakdownCelestialJobMult", kind: "efficiency", short: "breakdownShortCelestial" },
  { id: "jobJobMult", pos: "breakdownJobJobMult", neg: "breakdownJobJobMult", kind: "efficiency", short: "breakdownShortJobs" },
  { id: "designationJobMult", pos: "breakdownDesignationJobMult", neg: "breakdownDesignationJobMult", kind: "efficiency", short: "breakdownShortDesignation" },
  { id: "specializationJobMult", pos: "breakdownSpecializationJobMult", neg: "breakdownSpecializationJobMult", kind: "efficiency", short: "breakdownShortSpecializations" },
  { id: "planetModifierJobMult", pos: "breakdownPlanetModifierJobMult", neg: "breakdownPlanetModifierJobMult", kind: "efficiency", short: "breakdownShortPlanetModifiers" },
  { id: "branchJobMult", pos: "breakdownBranchJobMult", neg: "breakdownBranchJobMult", kind: "efficiency", short: "breakdownShortBranch" },
  { id: "stratumJobMult", pos: "breakdownStratumJobMult", neg: "breakdownStratumJobMult", kind: "efficiency", short: "breakdownShortStrata" },
  { id: "civilians", pos: "breakdownCivilians", neg: "breakdownCivilians" },
  { id: "livingStandardOutput", pos: "breakdownLivingStandardOutput", neg: "breakdownLivingStandardOutput" },
  { id: "neuralChips", pos: "breakdownNeuralChips", neg: "breakdownNeuralChips" },
  { id: "stabilityEffect", pos: "breakdownStabilityEffect", neg: "breakdownStabilityEffect" },
  { id: "tradeConversion", pos: "breakdownTradeConversionPos", neg: "breakdownTradeConversionNeg" },
  { id: "buildingFlat", pos: "breakdownBuildingFlat", neg: "breakdownBuildingFlat", posKind: "bonus", negKind: "upkeep", short: "breakdownShortBuildings" },
  { id: "blockers", pos: "breakdownBlockers", neg: "breakdownBlockers" },
  { id: "designation", pos: "breakdownDesignation", neg: "breakdownDesignation" },
  { id: "empireMult", pos: "breakdownEmpireMult", neg: "breakdownEmpireMult", kind: "efficiency", short: "breakdownShortEmpire" },
  { id: "capital", pos: "breakdownCapital", neg: "breakdownCapital", posKind: "bonus", negKind: "upkeep", short: "breakdownCapital" },
  { id: "districts", pos: "breakdownDistricts", neg: "breakdownDistricts", posKind: "bonus", negKind: "upkeep", short: "breakdownShortDistricts" },
  { id: "buildings", pos: "breakdownBuildings", neg: "breakdownBuildings", posKind: "bonus", negKind: "upkeep", short: "breakdownShortBuildings" },
  { id: "branchBuildings", pos: "breakdownBranchBuildings", neg: "breakdownBranchBuildings", posKind: "bonus", negKind: "upkeep", short: "breakdownShortBranchBuildings" },
  { id: "popUpkeepSpecies", pos: "breakdownPopUpkeepSpecies", neg: "breakdownPopUpkeepSpecies", kind: "popUpkeep", short: "breakdownShortSpecies" },
  { id: "popUpkeepLivingStandard", pos: "breakdownPopUpkeepLivingStandard", neg: "breakdownPopUpkeepLivingStandard", kind: "popUpkeep", short: "breakdownShortLivingStandard" },
  { id: "popUpkeepEdicts", pos: "breakdownPopUpkeepEdicts", neg: "breakdownPopUpkeepEdicts", kind: "popUpkeep", short: "breakdownShortEdicts" }
];

/** T2603: game icon kinds of the breakdown lines (ICONS.md): i18n key of the kind name and modifier icon suffix. */
const BREAKDOWN_KINDS = {
  upkeep: { i18nKey: "breakdownKindUpkeep", legendKey: "breakdownLegendUpkeep", suffix: "upkeep_add" },
  bonus: { i18nKey: "breakdownKindBonus", legendKey: "breakdownLegendBonus", suffix: "produces_add" },
  efficiency: { i18nKey: "breakdownKindEfficiency", legendKey: "breakdownLegendEfficiency", suffix: "produces_mult" },
  upkeepChange: { i18nKey: "breakdownKindUpkeepChange", legendKey: "breakdownLegendUpkeepChange", suffix: "upkeep_mult" },
  popUpkeep: { i18nKey: "breakdownKindPopUpkeep", legendKey: "breakdownLegendPopUpkeep", asset: "text_icons/pop_modifier.png" }
};

/** StellarisAssets path of the icon of a breakdown kind for a resource, or null. */
export function breakdownIconAsset(kind, resourceId) {
  const info = BREAKDOWN_KINDS[kind];
  if (!info) return null;
  return info.asset || resourceModifierIconPath(resourceId, info.suffix);
}

function breakdownKindIcon(kind, resourceId) {
  const asset = breakdownIconAsset(kind, resourceId);
  if (!asset) return null;
  const img = document.createElement("img");
  img.className = "planet-breakdown-icon";
  img.src = `${IMAGE_BASE}${asset}`;
  img.alt = t(getLang(), BREAKDOWN_KINDS[kind].i18nKey);
  img.title = img.alt;
  img.dataset.kind = kind;
  img.loading = "lazy";
  return img;
}

// Recursos de la columna "Netos" con el desglose desplegado (se conserva entre repintados).
const expandedBreakdowns = new Set();

function renderResourceRow(resourceId, amount, forceSign) {
  const row = document.createElement("div");
  row.className = `planet-resource-row ${amount < 0 ? "is-negative" : "is-positive"}`;
  row.append(resourceIcon(resourceId));
  const name = document.createElement("span");
  name.className = "planet-resource-name";
  name.textContent = resourceName(resourceId);
  row.append(name);
  const value = document.createElement("span");
  value.className = "planet-resource-value";
  value.textContent = formatAmount(displayAmount(resourceId, amount), forceSign);
  row.append(value);
  return row;
}

/** Bloque desplegable con las fuentes de un recurso: líneas con signo, bruto (suma de positivos), costes (suma de negativos) y neto. */
function renderBreakdownDetail(resourceId, sources) {
  const detail = document.createElement("div");
  detail.className = "planet-resource-detail";
  let gross = 0;
  let costs = 0;
  // T2603: a line with a game icon shows the icon and the short label; the full label stays as tooltip and accessible name.
  const addLine = (label, amount, extraClass, kind, shortLabel) => {
    const line = document.createElement("div");
    line.className = `planet-resource-detail-line${extraClass ? ` ${extraClass}` : ""}${amount < 0 ? " is-negative" : ""}`;
    const text = document.createElement("span");
    const icon = kind ? breakdownKindIcon(kind, resourceId) : null;
    if (icon) {
      text.className = "planet-breakdown-label";
      const words = document.createElement("span");
      words.textContent = shortLabel || label;
      text.append(icon, words);
      text.setAttribute("aria-label", label);
      line.title = label;
      line.dataset.kind = kind;
    } else {
      text.textContent = shortLabel || label;
      if (shortLabel) line.title = label;
    }
    const number = document.createElement("span");
    number.textContent = formatAmount(displayAmount(resourceId, amount), true);
    line.append(text, number);
    detail.append(line);
  };
  BREAKDOWN_SOURCES.forEach((source) => {
    const amount = sources[source.id] || 0;
    if (Math.abs(amount) < 0.001) return;
    if (amount > 0) gross += amount; else costs += amount;
    let label = t(getLang(), amount > 0 ? source.pos : source.neg);
    // Los recursos recibidos por la conversión de comercio indican la política que los produce.
    if (source.id === "tradeConversion" && lastTotals && lastTotals.tradeConversion) {
      label += ` (${t(getLang(), getPolicyOption("trade", lastTotals.tradeConversion.optionId).i18nKey)})`;
    }
    const kind = source.kind || (amount > 0 ? source.posKind : source.negKind);
    addLine(label, amount, "", kind, kind && source.short ? t(getLang(), source.short) : null);
  });
  addLine(t(getLang(), "breakdownGross"), gross, "is-total", null, t(getLang(), "breakdownShortGross"));
  addLine(t(getLang(), "breakdownCosts"), costs, "is-total", null, t(getLang(), "breakdownShortCosts"));
  addLine(t(getLang(), "breakdownNet"), gross + costs, "is-total");
  // Comercio: tasas de cambio de la política comercial elegida.
  if (resourceId === "trade" && lastTotals && lastTotals.tradeConversion) {
    const note = document.createElement("div");
    note.className = "planet-resource-detail-line is-total";
    const rates = Object.entries(lastTotals.tradeConversion.rates).map(([id, rate]) => `${Math.round(rate * 10000) / 100}% ${resourceName(id)}`).join(" · ");
    note.textContent = t(getLang(), "policyEffectTradeConversion") + rates;
    detail.append(note);
  }
  return detail;
}

/** Rellena un contenedor con las filas de recurso de `entries` (objeto recurso -> importe), ordenadas por magnitud. Con `breakdown`, cada fila se despliega al pulsarla (P8.1). */
function renderResourceList(container, entries, forceSign, emptyKey, breakdown) {
  if (!container) return;
  container.replaceChildren();

  const rows = Object.entries(entries).filter(([, amount]) => Math.abs(amount) > 0.001);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(getLang(), emptyKey);
    container.append(empty);
    return;
  }

  rows
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([resourceId, amount]) => {
      const row = renderResourceRow(resourceId, amount, forceSign);
      const sources = breakdown && breakdown[resourceId];
      if (!sources) {
        container.append(row);
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "planet-resource-entry";
      row.classList.add("is-expandable");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.title = t(getLang(), "breakdownToggleTooltip");
      const expanded = expandedBreakdowns.has(resourceId);
      row.setAttribute("aria-expanded", String(expanded));
      const toggle = () => {
        if (expandedBreakdowns.has(resourceId)) expandedBreakdowns.delete(resourceId); else expandedBreakdowns.add(resourceId);
        renderProduction(lastTotals);
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
      });
      wrapper.append(row);
      if (expanded) wrapper.append(renderBreakdownDetail(resourceId, sources));
      container.append(wrapper);
    });
}

/** Ingresos externos al planeta (P8.4): bonos planos del imperio (éticas/autoridad), con sus fuentes, y el total planeta + externos. */
function renderExternalIncome(totals) {
  if (!externalEl) return;
  externalEl.replaceChildren();
  const ids = Object.keys(totals.externalTotals || {});
  externalEl.hidden = !ids.length;
  if (!ids.length) return;
  const heading = document.createElement("h3");
  heading.className = "planet-production-subheading";
  heading.textContent = t(getLang(), "planetSimExternalHeading");
  const note = document.createElement("p");
  note.className = "planet-modifier-stacking";
  note.textContent = t(getLang(), "planetSimExternalNote");
  externalEl.append(heading, note);
  ids.forEach((resourceId) => {
    const amount = totals.externalTotals[resourceId];
    const entry = document.createElement("div");
    entry.className = "planet-resource-entry";
    entry.append(renderResourceRow(resourceId, amount, true));
    const sources = (totals.modifiers || []).filter((modifier) => modifier.category === "resourceFlat" && modifier.resource === resourceId);
    const detail = document.createElement("div");
    detail.className = "planet-resource-detail";
    sources.forEach((modifier) => {
      const line = document.createElement("div");
      line.className = "planet-resource-detail-line";
      const label = document.createElement("span");
      label.textContent = modifierSourceName(modifier.source);
      const value = document.createElement("span");
      value.textContent = formatAmount(displayAmount(resourceId, modifier.value), true);
      line.append(label, value);
      detail.append(line);
    });
    const planetNet = totals.resourceTotals[resourceId] || 0;
    const total = document.createElement("div");
    total.className = "planet-resource-detail-line is-total";
    const totalLabel = document.createElement("span");
    totalLabel.textContent = `${t(getLang(), "planetSimWithExternalLabel")} (${t(getLang(), "planetSimNetHeading")} ${formatAmount(displayAmount(resourceId, planetNet), true)})`;
    const totalValue = document.createElement("span");
    totalValue.textContent = formatAmount(displayAmount(resourceId, planetNet + amount), true);
    total.append(totalLabel, totalValue);
    detail.append(total);
    entry.append(detail);
    externalEl.append(entry);
  });
}

/** P17.2: panel "i" de producción (columnas, desglose, conversión de comercio con las cifras actuales, ingresos externos). */
function renderProductionInfo(totals) {
  const slot = document.querySelector("#planet-production-info-slot");
  if (!slot) return;
  syncInfoButtons(getLang());
  const info = createInfoPanel("planet-production");
  const addLine = (text) => {
    const line = document.createElement("p");
    line.className = "planet-modifier-stacking";
    line.textContent = text;
    info.append(line);
  };
  addLine(t(getLang(), "productionInfoColumns"));
  addLine(t(getLang(), "productionInfoBreakdown"));
  // T2603: grouped legend of the breakdown icons (shown here once instead of in every resource's drop-down).
  const legendHeading = document.createElement("p");
  legendHeading.className = "planet-modifier-stacking planet-breakdown-legend-heading";
  legendHeading.textContent = t(getLang(), "breakdownLegendHeading");
  const legend = document.createElement("ul");
  legend.className = "planet-breakdown-legend";
  Object.entries(BREAKDOWN_KINDS).forEach(([kind, info]) => {
    const item = document.createElement("li");
    item.dataset.kind = kind;
    const name = document.createElement("strong");
    name.textContent = t(getLang(), info.i18nKey);
    const text = document.createElement("span");
    text.textContent = ` — ${t(getLang(), info.legendKey)}`;
    item.append(breakdownKindIcon(kind, "energy"), name, text);
    legend.append(item);
  });
  info.append(legendHeading, legend);
  addLine(t(getLang(), "breakdownLegendNote"));
  const policyId = getPlanetState().policyIds && getPlanetState().policyIds.trade;
  const conversion = totals.tradeConversion;
  if (conversion) {
    const rates = Object.entries(conversion.rates).map(([id, rate]) => `${Math.round(rate * 10000) / 100}% ${resourceName(id)}`).join(" · ");
    addLine(t(getLang(), "productionInfoTrade")(t(getLang(), getPolicyOption("trade", conversion.optionId).i18nKey), formatAmount(conversion.amount, false), rates));
  } else if (policyId && getPolicyOption("trade", policyId)) {
    addLine(t(getLang(), "productionInfoTradeNone")(t(getLang(), getPolicyOption("trade", policyId).i18nKey)));
  }
  addLine(t(getLang(), "productionInfoExternal"));
  addLine(t(getLang(), "productionInfoCheck"));
  slot.replaceChildren(info);
}

let lastTotals = null;
export function renderProduction(totals) {
  lastTotals = totals;
  if (checkEl) {
    const problems = totals.inconsistencies || [];
    checkEl.hidden = !problems.length;
    checkEl.textContent = problems.length
      ? t(getLang(), "productionCheckFailed")(problems.map((p) => `${resourceName(p.resourceId)} (${formatAmount(p.net, true)} / ${formatAmount(p.breakdownSum, true)})`).join(", "))
      : "";
  }
  renderProductionInfo(totals);
  renderExternalIncome(totals);
  renderResourceList(producedEl, totals.producedTotals, false, "planetSimProducedEmpty");
  renderResourceList(consumedEl, totals.consumedTotals, false, "planetSimConsumedEmpty");
  renderResourceList(netEl, totals.resourceTotals, true, "planetSimProductionEmpty", totals.breakdown);
  renderComparison(totals);
  renderTimeline(totals);
}

/** P11.2: monthly stockpile timeline (js/stockpile-timeline.js), repainted with the production panel. */
const timelineEl = document.querySelector("#planet-timeline");
function renderTimeline(totals) {
  renderStockpileTimeline(timelineEl, {
    lang: getLang(),
    totals,
    resourceIcon,
    formatAmount,
    onChange: () => renderTimeline(lastTotals)
  });
}

/** P11.1: scenario A/B comparison (js/scenario-compare.js), repainted with the production panel. */
const compareEl = document.querySelector("#planet-compare");
function renderComparison(totals) {
  renderScenarioCompare(compareEl, {
    lang: getLang(),
    totals,
    planetName: getPlanetState().planetName,
    resourceIcon,
    formatAmount,
    displayAmount,
    onChange: () => renderComparison(lastTotals)
  });
}

export function renderStats(totals) {
  syncHeaderIcons();
  if (statHousing) {
    statHousing.textContent = formatAmount(totals.housing * EFFECT_SCALE, true);
    // P7.10: tooltip con el desglose de vivienda; cada tecnología aplicada sale en su propia línea.
    const lines = totals.housingSources.map((source) => {
      let label;
      if (source.kind === "capital") label = t(getLang(), "planetSimCapitalHeading");
      else if (source.kind === "district") label = `${districtDisplayName(source.district)} ×${source.count}`;
      else if (source.kind === "technology") label = t(getLang(), "planetSimHousingTechnology")(t(getLang(), source.i18nKey));
      else if (source.kind === "building") label = `${buildingDisplayName(buildingsById.get(source.id))}${source.count > 1 ? ` ×${source.count}` : ""}`;
      else if (source.kind === "planetModifier") label = t(getLang(), PLANET_MODIFIERS.find((modifier) => modifier.id === source.id).i18nKey);
      else label = t(getLang(), "planetSimDesignationHeading");
      return `${label} ${formatAmount(source.amount * EFFECT_SCALE, true)}`;
    });
    lines.push(`${t(getLang(), "planetSimTotalLabel")}: ${formatAmount(totals.housing * EFFECT_SCALE, true)}`);
    const tooltipTarget = statHousing.closest(".planet-header-stat") || statHousing;
    tooltipTarget.title = lines.join("\n");
    tooltipTarget.style.cursor = "help";
  }
  if (statAmenities) {
    statAmenities.textContent = formatAmount(totals.amenitiesTotal * EFFECT_SCALE, true);
    // Tooltip con el desglose de toda la producción de servicios del planeta.
    const lines = totals.amenitySources.map((source) => {
      let label;
      if (source.kind === "capital") label = t(getLang(), "planetSimCapitalHeading");
      else if (source.kind === "building") label = `${buildingDisplayName(buildingsById.get(source.id))}${source.count > 1 ? ` ×${source.count}` : ""}`;
      else if (source.kind === "job") label = `${formatAmount(source.assignedRaw)} ${jobName(source.jobId)}`;
      else if (source.kind === "civilians") label = `${formatAmount(source.assignedRaw)} ${t(getLang(), source.i18nKey)}`;
      else if (source.kind === "blocker") label = t(getLang(), BLOCKERS.find((blocker) => blocker.id === source.id).i18nKey);
      else if (source.kind === "planetModifier") label = t(getLang(), PLANET_MODIFIERS.find((modifier) => modifier.id === source.id).i18nKey);
      else label = t(getLang(), "planetSimDesignationHeading");
      return `${label} ${formatAmount(source.amount * EFFECT_SCALE, true)}`;
    });
    lines.push(`${t(getLang(), "planetSimTotalLabel")}: ${formatAmount(totals.amenitiesTotal * EFFECT_SCALE, true)}`);
    const tooltipTarget = statAmenities.closest(".planet-header-stat") || statAmenities;
    tooltipTarget.title = lines.join("\n");
    tooltipTarget.style.cursor = "help";
  }
  if (districtsUsedLabel) districtsUsedLabel.textContent = `${totalDistrictCount()} / ${sim.planetSize}`;
}

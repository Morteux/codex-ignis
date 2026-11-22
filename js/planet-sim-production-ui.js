/**
 * Planet simulator, Planet tab: header stats, summary, resource production with breakdowns,
 * external income, consistency check, stockpile timeline and scenario comparison.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { JOBS, JOB_STRATA, STRATUM_I18N_KEYS, HEADER_ICONS, EFFECT_SCALE } from "./planet-data.js";
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

// Iconos de cabecera (vivienda/servicios): estáticos, no dependen del
// idioma ni del estado, así que se fijan una única vez al cargar.
if (statHousingIcon) statHousingIcon.src = "img/ui/Housing.png";
if (statAmenitiesIcon) statAmenitiesIcon.src = `${IMAGE_BASE}${HEADER_ICONS.amenities}`;

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
  JOB_STRATA.forEach((stratum) => {
    const heading = document.createElement("h3");
    heading.className = "planet-stratum-heading";
    heading.textContent = t(getLang(), STRATUM_I18N_KEYS[stratum]);
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

/** Fuentes del desglose por recurso (P8.1), en el orden en que se muestran. `pos`/`neg` son las claves i18n según el signo del importe. */
const BREAKDOWN_SOURCES = [
  { id: "jobsBase", pos: "breakdownJobsBasePos", neg: "breakdownJobsBaseNeg" },
  { id: "jobSwapStack", pos: "breakdownJobSwapStack", neg: "breakdownJobSwapStack" },
  { id: "jobsBonus", pos: "breakdownJobsBonusPos", neg: "breakdownJobsBonusNeg" },
  { id: "jobWorkforceScaling", pos: "breakdownJobWorkforceScaling", neg: "breakdownJobWorkforceScaling" },
  { id: "edictJobFlat", pos: "breakdownEdictJobFlat", neg: "breakdownEdictJobFlat" },
  { id: "branchJobFlat", pos: "breakdownBranchJobFlat", neg: "breakdownBranchJobFlat" },
  { id: "jobsModifier", pos: "breakdownJobsModifierPos", neg: "breakdownJobsModifierNeg" },
  { id: "jobBuildingMult", pos: "breakdownJobBuildingMult", neg: "breakdownJobBuildingMult" },
  { id: "policyJobMult", pos: "breakdownPolicyJobMult", neg: "breakdownPolicyJobMult" },
  { id: "celestialJobMult", pos: "breakdownCelestialJobMult", neg: "breakdownCelestialJobMult" },
  { id: "jobJobMult", pos: "breakdownJobJobMult", neg: "breakdownJobJobMult" },
  { id: "designationJobMult", pos: "breakdownDesignationJobMult", neg: "breakdownDesignationJobMult" },
  { id: "specializationJobMult", pos: "breakdownSpecializationJobMult", neg: "breakdownSpecializationJobMult" },
  { id: "planetModifierJobMult", pos: "breakdownPlanetModifierJobMult", neg: "breakdownPlanetModifierJobMult" },
  { id: "branchJobMult", pos: "breakdownBranchJobMult", neg: "breakdownBranchJobMult" },
  { id: "civilians", pos: "breakdownCivilians", neg: "breakdownCivilians" },
  { id: "neuralChips", pos: "breakdownNeuralChips", neg: "breakdownNeuralChips" },
  { id: "stabilityEffect", pos: "breakdownStabilityEffect", neg: "breakdownStabilityEffect" },
  { id: "tradeConversion", pos: "breakdownTradeConversionPos", neg: "breakdownTradeConversionNeg" },
  { id: "buildingFlat", pos: "breakdownBuildingFlat", neg: "breakdownBuildingFlat" },
  { id: "blockers", pos: "breakdownBlockers", neg: "breakdownBlockers" },
  { id: "designation", pos: "breakdownDesignation", neg: "breakdownDesignation" },
  { id: "empireMult", pos: "breakdownEmpireMult", neg: "breakdownEmpireMult" },
  { id: "capital", pos: "breakdownCapital", neg: "breakdownCapital" },
  { id: "districts", pos: "breakdownDistricts", neg: "breakdownDistricts" },
  { id: "buildings", pos: "breakdownBuildings", neg: "breakdownBuildings" },
  { id: "branchBuildings", pos: "breakdownBranchBuildings", neg: "breakdownBranchBuildings" }
];

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
  const addLine = (label, amount, extraClass) => {
    const line = document.createElement("div");
    line.className = `planet-resource-detail-line${extraClass ? ` ${extraClass}` : ""}${amount < 0 ? " is-negative" : ""}`;
    const text = document.createElement("span");
    text.textContent = label;
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
    addLine(label, amount);
  });
  addLine(t(getLang(), "breakdownGross"), gross, "is-total");
  addLine(t(getLang(), "breakdownCosts"), costs, "is-total");
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

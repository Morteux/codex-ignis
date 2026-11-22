/**
 * Planet simulator: names, icons and number formats shared by the renderers, and the text of
 * requirements and job swap conditions.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { JOBS, RESOURCES, EFFECT_SCALE, RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { jobName as jobNameIn, resourceName as resourceNameIn } from "./sim-text-helpers.js";
import { PLANET_MODIFIERS } from "./planet-modifier-data.js";
import { BLOCKERS } from "./planetary-features-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { ETHIC_OPTIONS, AUTHORITIES } from "./empire-data.js";
import { unmetRequirements, unmodelledRequirements } from "./building-requirements.js";
import { PLANET_TYPES } from "./celestial-data.js";
import { getDesignation } from "./designation-data.js";
import { primaryOption, secondaryOption, branchBuildingName, districtDisplayName } from "./planet-sim-rules.js";
import { buildingsById } from "./planet-sim-state.js";

/** Reconstruye las opciones del desplegable de designación (agrupadas por categoría y filtradas por el tipo de cuerpo celeste elegido), conservando la selección si sigue siendo válida. */
/** Texto corto de una regla de requisito incumplida ("Requiere ética: Espiritualista"...), para el desplegable de designaciones. */
/**
 * Text, tooltip and disabled state of a select option (specialization, designation): unmet requirements disable it;
 * requirements the simulator does not model never block, but are listed ("Requirement not modelled: ...").
 */
export function requirementOptionLabel(name, item, ctx) {
  const unmet = unmetRequirements(item, ctx).map(describeUnmetRule).filter(Boolean);
  const unmodelled = unmodelledRequirements(item).map((rule) => t(getLang(), rule.i18nKey));
  const notes = [...unmet, ...(unmodelled.length ? [t(getLang(), "requirementUnmodelled") + unmodelled.join("; ")] : [])];
  return { text: notes.length ? `${name} — ${notes.join("; ")}` : name, title: notes.join("\n"), disabled: unmet.length > 0 };
}

/** Names a positive rule refers to (civics, celestial bodies, ethics, authorities), for combined rules (P10.10 "notAll"). */
function ruleSubjects(rule) {
  const names = (list) => list.join(", ");
  switch (rule.type) {
    case "civic": return names(rule.keys.map((key) => t(getLang(), key)));
    case "celestial": return names(rule.ids.map((id) => t(getLang(), PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "ethic": return names(rule.ids.map((id) => t(getLang(), ETHIC_OPTIONS[id].i18nKey)));
    case "authority": return names(rule.ids.map((id) => t(getLang(), AUTHORITIES.find((a) => a.id === id).i18nKey)));
    default: return describeUnmetRule(rule);
  }
}

/** P21.4: specialization (zone) name by option id, primary or resource district. */
export function zoneDisplayName(optionId) {
  const option = primaryOption(optionId) || RESOURCE_DISTRICT_ORDER.map((cat) => secondaryOption(cat, optionId)).find(Boolean);
  return option ? t(getLang(), option.i18nKey) : optionId;
}

/** P21.4: one condition of a job swap, as text (met or not). */
export function describeSwapRule(rule) {
  const names = (list) => list.join(", ");
  switch (rule.type) {
    case "building": return t(getLang(), "jobSwapRuleBuilding") + names(rule.ids.map((id) => buildingsById.get(id) ? buildingDisplayName(buildingsById.get(id)) : id));
    case "zone": return t(getLang(), "jobSwapRuleZone") + names(rule.ids.map(zoneDisplayName));
    case "designation": return t(getLang(), "jobSwapRuleDesignation") + names(rule.ids.map((id) => t(getLang(), getDesignation(id).i18nKey)));
    case "planetModifier": return t(getLang(), "jobSwapRulePlanetModifier") + names(rule.ids.map((id) => { const modifier = PLANET_MODIFIERS.find((entry) => entry.id === id); return modifier ? t(getLang(), modifier.i18nKey) : id; }));
    case "branchBuilding": return t(getLang(), "jobSwapRuleBranch") + names(rule.ids.map(branchBuildingName));
    case "swap": return t(getLang(), "modifierSourceJobSwap").replace("{job}", jobName(rule.id) || rule.id);
    case "anyOf": return rule.rules.map(describeSwapRule).join(" / ");
    case "unmodelled": return t(getLang(), "requirementUnmodelled") + t(getLang(), rule.i18nKey);
    case "notAuthority": return t(getLang(), "jobSwapRuleNotAuthority") + names(rule.ids.map((id) => t(getLang(), AUTHORITIES.find((a) => a.id === id).i18nKey)));
    case "tradition": return t(getLang(), "jobSwapRuleTradition");
    case "federation": return t(getLang(), "jobSwapRuleFederation");
    default: return describeUnmetRule(rule);
  }
}

export function describeUnmetRule(rule) {
  const names = (list) => list.join(", ");
  switch (rule.type) {
    case "notGestalt": return t(getLang(), "requirementNotGestalt");
    case "usesConsumerGoods": return t(getLang(), "requirementConsumerGoods");
    case "ethic": return t(getLang(), "requirementEthic") + names(rule.ids.map((id) => t(getLang(), ETHIC_OPTIONS[id].i18nKey)));
    case "notEthic": return t(getLang(), "requirementNotEthic") + names(rule.ids.map((id) => t(getLang(), ETHIC_OPTIONS[id].i18nKey)));
    case "authority": return t(getLang(), "requirementAuthority") + names(rule.ids.map((id) => t(getLang(), AUTHORITIES.find((a) => a.id === id).i18nKey)));
    case "civic": return t(getLang(), "requirementCivic") + names(rule.keys.map((key) => t(getLang(), key)));
    case "notCivic": return t(getLang(), "requirementNotCivic") + names(rule.keys.map((key) => t(getLang(), key)));
    case "celestial": return t(getLang(), "requirementCelestial") + names(rule.ids.map((id) => t(getLang(), PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "notCelestial": return t(getLang(), "requirementNotCelestial") + names(rule.ids.map((id) => t(getLang(), PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "notSpecies": return t(getLang(), "requirementBiologicalSpecies");
    case "districtBuildable": return t(getLang(), "requirementDistrictBuildable") + districtDisplayName(rule.district);
    case "deposit": return t(getLang(), "requirementDeposit");
    case "notAll": return t(getLang(), "requirementNotAll") + rule.rules.map(ruleSubjects).join(" + ");
    case "notBlocker": return t(getLang(), "requirementNotBlocker") + rule.ids.map((id) => t(getLang(), BLOCKERS.find((blocker) => blocker.id === id).i18nKey)).join(", ");
    default: return "";
  }
}

export function jobIcon(jobId) {
  const job = JOBS[jobId];
  const img = document.createElement("img");
  img.className = "planet-job-icon";
  img.src = `${IMAGE_BASE}${job.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

/** Icono decorativo de "zona" (img/ui/Tooltip_zone.png) para las líneas de estado de especialización. */
export function zoneIcon() {
  const img = document.createElement("img");
  img.className = "ui-icon";
  img.src = "img/ui/Tooltip_zone.png";
  img.alt = "";
  return img;
}

export function resourceIcon(resourceId) {
  const resource = RESOURCES[resourceId];
  const img = document.createElement("img");
  img.className = "planet-resource-icon";
  img.src = `${IMAGE_BASE}${resource.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

/** Job and resource names in the page language (js/sim-text-helpers.js). */
export function jobName(jobId) {
  return jobNameIn(getLang(), jobId);
}

export function resourceName(resourceId) {
  return resourceNameIn(getLang(), resourceId);
}

/** La vivienda y los servicios (amenities) se muestran en escala ×100 como en la wiki; aquí solo los servicios son un "recurso" (la vivienda se multiplica en el sitio donde se muestra). Servicios:  ("+1250" = 12,5); el resto de recursos, en unidades normales. Internamente se calculan en unidades normales. */
export function displayAmount(resourceId, amount) {
  return resourceId === "amenities" ? amount * EFFECT_SCALE : amount;
}

export function formatAmount(amount, forceSign) {
  const rounded = Math.round(amount * 100) / 100;
  const text = rounded % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(2).replace(/0$/, "");
  if (forceSign) return `${rounded < 0 ? "−" : "+"}${text}`;
  return rounded < 0 ? `−${text}` : text;
}

/** Coste de construcción (wiki 4.5, P7.3) como texto para el tooltip del catálogo; "" si el edificio no tiene dato de coste. */
export function formatBuildingCost(building) {
  const cost = building.cost;
  if (!cost) return "";
  const text = (items) => items.map((item) => `${formatAmount(item.amount)} ${resourceName(item.resource)}`).join(", ");
  const now = cost.items.filter((item) => !item.when || item.when === "settled");
  const nomadic = cost.items.filter((item) => item.when === "nomadic");
  let line = `${t(getLang(), "planetSimCostLabel")}: ${text(now)} · ${t(getLang(), "planetSimCostDays")(cost.time)}`;
  if (nomadic.length) line += ` (${t(getLang(), "planetSimCostNomadic")}: ${text(nomadic)})`;
  return line;
}

export function buildingDisplayName(building) {
  return t(getLang(), building.i18nKey);
}

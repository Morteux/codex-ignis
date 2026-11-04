/**
 * Políticas del imperio que afectan a la economía del planeta (P16).
 *
 * Fuente: páginas de la Wiki 4.5.2 "Economic policies" (Economic Policy, Trade
 * Policy, Production Policy) y "Diplomatic policies" (Diplomatic Stance), subidas
 * por Morteux el 2026-10-31. Solo se incluyen las políticas con efecto sobre la
 * economía de un planeta que este simulador puede calcular; el resto (sociales,
 * militares, de investigación, otras diplomáticas, edictos) está en el apartado
 * 10.0.1 del GDD. No hay cifras inventadas: todo sale de esas páginas.
 *
 * ── Formato ─────────────────────────────────────────────────────────────
 * POLICY_GROUPS: un grupo por política. `appliesTo`: "individualist" (solo
 * imperios no gestalt), "gestalt" (solo Consciencia gestalt) o "all". Cada grupo
 * tiene `options`; cada opción tiene `id`, `i18nKey`, `requires` (mismas reglas
 * que los edificios, ver js/building-requirements.js) y `effects`:
 *  - jobResourceMult: { recurso: fracción } sobre lo que producen los empleos
 *    (Política económica: "+25 % bienes de consumo de los empleos").
 *  - stratumOutput: { estrato: fracción } producción positiva de los empleos de
 *    ese estrato (Política de producción: menial = obrero, complejo =
 *    especialista; es la correspondencia que usa el simulador para los drones).
 *  - tradeConversion: { recurso: tasa de cambio } (Política comercial: cada
 *    recurso recibe el Comercio generado × tasa; "trade" es la parte de
 *    Comercio que se conserva).
 *  - resourceMult: { recurso: fracción } % mensual sobre la producción del
 *    recurso (Postura diplomática: +10 % unidad mensual, +10 % comercio mensual).
 *
 * ── Decisiones provisionales (a confirmar con Morteux, ver P16.1 del GDD) ──
 *  1. Las opciones que exigen una federación (Liga comercial, Pacto sagrado) se
 *     listan pero no están disponibles: el simulador no modela federaciones
 *     (regla `federation`, siempre incumplida). Las que se bloquean POR una
 *     federación (Beneficios para el consumidor, Mercado de ideas) siguen
 *     disponibles (regla `notFederation`, siempre cumplida).
 *  2. Las tradiciones (Adaptive Economic Policies, Supremacy) no se modelan: se
 *     tratan como desbloqueadas, igual que la tecnología.
 *  3. Por defecto: Política económica = Economía mixta, Política de producción =
 *     Producción equilibrada, Postura = Expansionista (la wiki no da una
 *     postura por defecto; es la que no tiene efecto económico), Política
 *     comercial = Creación de riqueza (no gestalt) o Política logística (gestalt).
 *  4. No se aplican los requisitos de origen (nómada), de súbdito ni de
 *     "humillado" de las posturas.
 *
 * Estado de verificación: `unverified` (ver DATA_COLLECTIONS.policies en
 * js/data-version.js); se revisa en P14/P16.10.
 */

import { buildingRequirementsMet, unmetRequirements } from "./building-requirements.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS } from "./empire-data.js";

const NOT_GESTALT = { type: "notGestalt" };
const GESTALT = { type: "ethic", ids: [GESTALT_CONSCIOUSNESS.id] };
const civic = (...keys) => ({ type: "civic", keys });
const notCivic = (...keys) => ({ type: "notCivic", keys });
const authority = (...ids) => ({ type: "authority", ids });
const notAuthority = (...ids) => ({ type: "notAuthority", ids });
const FEDERATION = { type: "federation" };
const NOT_FEDERATION = { type: "notFederation" };

export const POLICY_GROUPS = [
  {
    id: "economic",
    i18nKey: "policyGroupEconomic",
    appliesTo: "individualist",
    options: [
      { id: "civilianEconomy", i18nKey: "policyCivilianEconomy", requires: [], effects: { jobResourceMult: { consumer_goods: 0.25, alloys: -0.25 } } },
      { id: "mixedEconomy", i18nKey: "policyMixedEconomy", requires: [], effects: {} },
      { id: "militarizedEconomy", i18nKey: "policyMilitarizedEconomy", requires: [], effects: { jobResourceMult: { consumer_goods: -0.25, alloys: 0.25 } } }
    ]
  },
  {
    id: "trade",
    i18nKey: "policyGroupTrade",
    gestaltI18nKey: "policyGroupLogistics",
    appliesTo: "all",
    options: [
      { id: "wealthCreation", i18nKey: "policyWealthCreation", requires: [NOT_GESTALT], effects: { tradeConversion: { trade: 0.5, energy: 0.5 } } },
      { id: "logisticsPolicy", i18nKey: "policyLogisticsPolicy", requires: [GESTALT], effects: { tradeConversion: { trade: 1 } } },
      { id: "consumerBenefits", i18nKey: "policyConsumerBenefits", requires: [NOT_FEDERATION], effects: { tradeConversion: { trade: 0.5, consumer_goods: 0.25 } } },
      { id: "marketplaceOfIdeas", i18nKey: "policyMarketplaceOfIdeas", requires: [NOT_FEDERATION], effects: { tradeConversion: { trade: 0.5, unity: 0.125 } } },
      { id: "mutualAid", i18nKey: "policyMutualAid", requires: [civic("civicWorkerCoop")], effects: { tradeConversion: { trade: 0.25, energy: 0.2, minerals: 0.2, food: 0.2, unity: 0.075 } } },
      { id: "tradeLeague", i18nKey: "policyTradeLeague", requires: [FEDERATION, NOT_GESTALT], effects: { tradeConversion: { trade: 0.5, energy: 0.15, consumer_goods: 0.15, unity: 0.075 } } },
      { id: "holyCovenant", i18nKey: "policyHolyCovenant", requires: [FEDERATION, NOT_GESTALT], effects: { tradeConversion: { trade: 0.5, unity: 0.1875 } } }
    ]
  },
  {
    id: "production",
    i18nKey: "policyGroupProduction",
    appliesTo: "gestalt",
    options: [
      { id: "balancedProduction", i18nKey: "policyBalancedProduction", requires: [], effects: {} },
      { id: "extractionFocus", i18nKey: "policyExtractionFocus", requires: [], effects: { stratumOutput: { worker: 0.2, specialist: -0.2 } } },
      { id: "manufacturingFocus", i18nKey: "policyManufacturingFocus", requires: [], effects: { stratumOutput: { worker: -0.2, specialist: 0.2 } } }
    ]
  },
  {
    id: "stance",
    i18nKey: "policyGroupStance",
    appliesTo: "all",
    options: [
      { id: "cooperative", i18nKey: "policyCooperative", requires: [notCivic("civicInwardPerfection", "civicBarbaricDespoilers")], effects: {} },
      { id: "expansionist", i18nKey: "policyExpansionist", requires: [], effects: {} },
      { id: "isolationist", i18nKey: "policyIsolationist", requires: [notAuthority("corporate")], effects: { resourceMult: { unity: 0.1 } } },
      { id: "belligerent", i18nKey: "policyBelligerent", requires: [notCivic("civicInwardPerfection")], effects: {} },
      { id: "mercantile", i18nKey: "policyMercantile", requires: [NOT_GESTALT, notCivic("civicInwardPerfection"), { type: "anyOf", rules: [authority("corporate"), civic("civicMerchantGuilds", "civicCorporateDominion")] }], effects: { resourceMult: { trade: 0.1 } } },
      { id: "supremacist", i18nKey: "policySupremacist", requires: [notCivic("civicInwardPerfection")], effects: {} }
    ]
  }
];

/** Opción por defecto de cada grupo según el tipo de imperio (Morteux, 2026-10-31: Creación de riqueza / Política logística; el resto, provisional). */
const DEFAULTS = {
  individualist: { economic: "mixedEconomy", trade: "wealthCreation", stance: "expansionist" },
  gestalt: { production: "balancedProduction", trade: "logisticsPolicy", stance: "expansionist" }
};

const GROUPS_BY_ID = Object.fromEntries(POLICY_GROUPS.map((group) => [group.id, group]));

export function getPolicyGroup(groupId) {
  return GROUPS_BY_ID[groupId] || null;
}

export function getPolicyOption(groupId, optionId) {
  const group = GROUPS_BY_ID[groupId];
  return group ? group.options.find((option) => option.id === optionId) || null : null;
}

/** ¿Es gestalt el imperio descrito por ctx.ethicIds? */
export function isGestaltContext(ctx) {
  return ethicsSatisfy(ctx.ethicIds || [], GESTALT_CONSCIOUSNESS.id);
}

/** ¿Se muestra este grupo de políticas para este tipo de imperio? */
export function policyGroupApplies(group, ctx) {
  if (group.appliesTo === "all") return true;
  return group.appliesTo === (isGestaltContext(ctx) ? "gestalt" : "individualist");
}

/** Grupos que se muestran para el imperio dado, en orden. */
export function applicablePolicyGroups(ctx) {
  return POLICY_GROUPS.filter((group) => policyGroupApplies(group, ctx));
}

// Reglas extra de este módulo: "anyOf" (basta una de las reglas) además de las de building-requirements.js.
function ruleList(option) {
  return option.requires || [];
}

function optionRuleMet(rule, ctx) {
  if (rule.type === "anyOf") return rule.rules.some((inner) => buildingRequirementsMet({ requires: [inner] }, ctx));
  return buildingRequirementsMet({ requires: [rule] }, ctx);
}

export function policyAvailable(option, ctx) {
  return ruleList(option).every((rule) => optionRuleMet(rule, ctx));
}

/** Reglas de requisito que no se cumplen (para explicar por qué una opción está bloqueada). */
export function policyUnmetRules(option, ctx) {
  return ruleList(option).filter((rule) => !optionRuleMet(rule, ctx));
}

/** Opciones por defecto { grupo: idOpcion } para el tipo de imperio de ctx. */
export function policyDefaults(ctx) {
  return { ...DEFAULTS[isGestaltContext(ctx) ? "gestalt" : "individualist"] };
}

/**
 * Normaliza una selección de políticas { grupo: idOpcion } para el contexto dado:
 * quita los grupos que no aplican, rellena los que faltan con el valor por defecto
 * y sustituye por el valor por defecto lo desconocido o no disponible (nunca
 * inventa otra cosa). Devuelve { policyIds, changes } donde `changes` es la lista
 * { group, from, to } de lo que se ha sustituido (no incluye lo que faltaba).
 */
export function resolvePolicies(policyIds, ctx) {
  const defaults = policyDefaults(ctx);
  const resolved = {};
  const changes = [];
  applicablePolicyGroups(ctx).forEach((group) => {
    const wanted = policyIds ? policyIds[group.id] : undefined;
    if (wanted === undefined || wanted === null) {
      resolved[group.id] = defaults[group.id];
      return;
    }
    const option = getPolicyOption(group.id, wanted);
    if (option && policyAvailable(option, ctx)) {
      resolved[group.id] = option.id;
    } else {
      resolved[group.id] = defaults[group.id];
      changes.push({ group: group.id, from: wanted, to: defaults[group.id] });
    }
  });
  return { policyIds: resolved, changes };
}

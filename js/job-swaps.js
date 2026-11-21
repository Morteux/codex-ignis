/**
 * Job swap engine (P21.2, GDD §6.1). Data: js/job-swap-data.js.
 *
 * - registerSwapJobs(): at load, every swap whose base job is in the
 *   simulator gets a JOBS entry (stratum of its base job, wiki icon, i18n key
 *   "job" + PascalCase id), its JOB_OUTPUTS / JOB_EFFECTS when the job had none
 *   (jobs that already existed keep their data) and joins the JOB_CATEGORIES
 *   of its base job ("per 100 Miners" counts the Miner swaps).
 * - resolveJobSwaps(ctx): for each base job, the swaps whose empire type fits
 *   and whose conditions are met; the highest weight wins (weight null = 0,
 *   ties: data order). Unmodelled conditions are never met.
 * - stackedSwapChanges(jobId, ctx): "With X swap conditions" output and
 *   effect changes of a swapped job (any swapped job on the planet, created
 *   by a swap or directly by a building) plus its zone change (Angler under
 *   Exotic Gas Capture).
 * - swapGestaltUpkeep(jobId, ctx): gestalt upkeep of a swapped job: its own
 *   wiki variant (`upkeepByType`) or, when the wiki lists none, the base job's
 *   (GESTALT_JOB_UPKEEP), since swapped jobs inherit the base job.
 *
 * ctx = requirement context (js/building-requirements.js) plus gestalt,
 * buildingIds, zoneIds, planetModifierIds, branchBuildingIds.
 */

import { JOB_SWAPS, JOB_SWAPS_BY_ID } from "./job-swap-data.js";
import { JOBS, JOB_OUTPUTS, JOB_EFFECTS, GESTALT_JOB_UPKEEP } from "./planet-data.js";
import { JOB_CATEGORIES } from "./planetary-features-data.js";
import { buildingRequirementsMet } from "./building-requirements.js";

const basesOf = (swap) => (Array.isArray(swap.base) ? swap.base : [swap.base]);
const pascal = (id) => id.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("");

/** i18n key of a swapped job's name ("job" + PascalCase id), modelled or not (P13.8). */
export const swapJobI18nKey = (id) => `job${pascal(id)}`;

/** Swaps whose base job (one of them) is in the simulator. */
export const MODELLED_SWAPS = JOB_SWAPS.filter((swap) => basesOf(swap).some((base) => JOBS[base] && !JOB_SWAPS_BY_ID.has(base)));

/** Swapped job id -> base job ids (for modifier inheritance). */
export const SWAP_BASES = Object.fromEntries(MODELLED_SWAPS.map((swap) => [swap.id, basesOf(swap).filter((base) => JOBS[base])]));

let registered = false;
export function registerSwapJobs() {
  if (registered) return;
  registered = true;
  MODELLED_SWAPS.forEach((swap) => {
    const base = SWAP_BASES[swap.id][0];
    if (!JOBS[swap.id]) JOBS[swap.id] = { i18nKey: swapJobI18nKey(swap.id), img: swap.img, stratum: JOBS[base].stratum, swapOf: base };
    else JOBS[swap.id].swapOf = base;
    if (!JOB_OUTPUTS[swap.id]) JOB_OUTPUTS[swap.id] = { ...swap.output };
    if (swap.effects && !JOB_EFFECTS[swap.id]) JOB_EFFECTS[swap.id] = { ...swap.effects };
  });
  Object.values(JOB_CATEGORIES).forEach((jobs) => {
    MODELLED_SWAPS.forEach((swap) => {
      if (!jobs.includes(swap.id) && SWAP_BASES[swap.id].some((base) => jobs.includes(base))) jobs.push(swap.id);
    });
  });
}

function empireFits(swap, ctx) {
  switch (swap.empire || "individualist") {
    case "any": return true;
    case "gestalt": return !!ctx.gestalt;
    case "machine": return ctx.authorityId === "machineIntelligence";
    default: return !ctx.gestalt;
  }
}

/** One condition of a swap. Unmodelled conditions are never met (GDD §6.1). */
export function swapRuleMet(rule, ctx) {
  switch (rule.type) {
    case "unmodelled": return false;
    case "anyOf": return rule.rules.some((inner) => swapRuleMet(inner, ctx));
    case "notAll": return !rule.rules.every((inner) => swapRuleMet(inner, ctx));
    case "building": return rule.ids.some((id) => (ctx.buildingIds || []).includes(id));
    case "zone": return rule.ids.some((id) => (ctx.zoneIds || []).includes(id));
    case "designation": return rule.ids.includes(ctx.designationId);
    case "planetModifier": return rule.ids.some((id) => (ctx.planetModifierIds || []).includes(id));
    case "branchBuilding": return rule.ids.some((id) => (ctx.branchBuildingIds || []).includes(id));
    case "swap": { const other = JOB_SWAPS_BY_ID.get(rule.id); return !!other && swapConditionsMet(other, ctx); }
    default: return buildingRequirementsMet({ requires: [rule] }, ctx);
  }
}

export function swapConditionsMet(swap, ctx) {
  return (swap.requires || []).every((rule) => swapRuleMet(rule, ctx));
}

/** The swap can apply in this empire and its conditions are met. */
export function swapActive(swap, ctx) {
  return empireFits(swap, ctx) && swapConditionsMet(swap, ctx);
}

export function swapWeight(swap, ctx) {
  const weight = swap.weight;
  if (weight == null) return 0;
  if (typeof weight === "object") return ctx.gestalt ? weight.gestalt : weight.individualist;
  return weight;
}

/**
 * Winning swap per base job: { [baseJobId]: { winner: swap, met: [swaps by weight] } }.
 * Only modelled swaps (base job in the simulator).
 */
export function resolveJobSwaps(ctx) {
  const result = {};
  MODELLED_SWAPS.forEach((swap) => {
    if (!swapActive(swap, ctx)) return;
    SWAP_BASES[swap.id].forEach((base) => {
      result[base] = result[base] || { winner: null, met: [] };
      result[base].met.push(swap);
    });
  });
  Object.values(result).forEach((entry) => {
    entry.met.sort((a, b) => swapWeight(b, ctx) - swapWeight(a, ctx)); // stable: data order on ties
    entry.winner = entry.met[0];
  });
  return result;
}

/** Base job id -> winning swapped job id. */
export function swapMap(resolved) {
  return Object.fromEntries(Object.entries(resolved).map(([base, entry]) => [base, entry.winner.id]));
}

/**
 * Output / effect changes stacked on a swapped job: [{ kind: "swap"|"zone", id, output, effects }].
 * A `withSwaps` entry applies when one of its swaps can apply (empire type and conditions).
 */
export function stackedSwapChanges(jobId, ctx) {
  const swap = JOB_SWAPS_BY_ID.get(jobId);
  if (!swap) return [];
  const changes = [];
  (swap.withSwaps || []).forEach((entry) => {
    const other = entry.swaps.map((id) => JOB_SWAPS_BY_ID.get(id)).find((candidate) => candidate && swapActive(candidate, ctx));
    if (other) changes.push({ kind: "swap", id: other.id, output: entry.output || {}, effects: entry.effects || {} });
  });
  if (swap.withZone && (ctx.zoneIds || []).includes(swap.withZone.zone)) {
    changes.push({ kind: "zone", id: swap.withZone.zone, output: swap.withZone.output || {}, effects: {} });
  }
  return changes;
}

const SPECIES_KEYS = ["organic", "lithoid", "infernal"];

/**
 * Gestalt upkeep of a swapped job. Returns null when the job is not a swap (the caller keeps GESTALT_JOB_UPKEEP),
 * otherwise { replace: { resource: amount } } (consumer goods removed, these added; amounts negative) or
 * { inherit: GESTALT_JOB_UPKEEP entry of the base job } or { none: true }.
 */
export function swapGestaltUpkeep(jobId, ctx) {
  const swap = JOB_SWAPS_BY_ID.get(jobId);
  if (!swap || !SWAP_BASES[jobId]) return null;
  const byType = swap.upkeepByType;
  if (byType) {
    const species = SPECIES_KEYS.some((key) => key in byType) || byType.speciesExtra;
    const key = species ? ctx.speciesType : (ctx.authorityId === "machineIntelligence" ? "machine" : "hive");
    const entry = byType[key];
    if (entry) return { replace: entry, extra: !!byType.speciesExtra };
  }
  const inherited = SWAP_BASES[jobId].map((base) => GESTALT_JOB_UPKEEP[base]).find(Boolean);
  return inherited ? { inherit: inherited } : { none: true };
}

/** Top-level conditions of a swap that are not met. */
export function unmetSwapRules(swap, ctx) {
  return (swap.requires || []).filter((rule) => !swapRuleMet(rule, ctx));
}

function ruleNeedsUnmodelled(rule, ctx) {
  if (rule.type === "unmodelled") return true;
  if (rule.type === "anyOf") return rule.rules.some((inner) => ruleNeedsUnmodelled(inner, ctx));
  if (rule.type === "swap") { const other = JOB_SWAPS_BY_ID.get(rule.id); return !!other && blockedByUnmodelled(other, ctx); }
  return false;
}

/**
 * P21.4: the swap fits the empire and every unmet condition involves an unmodelled one (origin, unmodelled building,
 * habitability...): it could apply in the game, the simulator cannot tell. Listed in the jobs panel.
 */
export function blockedByUnmodelled(swap, ctx) {
  if (!empireFits(swap, ctx)) return false;
  const unmet = unmetSwapRules(swap, ctx);
  return unmet.length > 0 && unmet.every((rule) => ruleNeedsUnmodelled(rule, ctx));
}

/** Unmodelled conditions inside a rule list (flattened, swaps followed). */
export function unmodelledSwapRules(rules, ctx) {
  return rules.flatMap((rule) => {
    if (rule.type === "unmodelled") return [rule];
    if (rule.type === "anyOf") return unmodelledSwapRules(rule.rules, ctx);
    if (rule.type === "swap") { const other = JOB_SWAPS_BY_ID.get(rule.id); return other ? unmodelledSwapRules(unmetSwapRules(other, ctx), ctx) : []; }
    return [];
  });
}

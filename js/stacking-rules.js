/**
 * Reglas de apilado de modificadores por versión de datos (P8.3).
 *
 * Cada categoría de modificador (ver el panel "Modificadores activos" de
 * planet-sim.js) tiene aquí su regla: cómo se combinan entre sí los
 * modificadores de esa categoría (`combine`) y el límite inferior del factor
 * resultante (`floor`). El cálculo de computeTotals() y el panel de
 * modificadores leen estas reglas en vez de tenerlas escritas en el código,
 * de modo que una versión nueva del juego (otro rulesetId) puede cambiarlas sin
 * tocar la lógica.
 *
 *  - combine: "add"      → los valores se suman y el factor es 1 + suma.
 *             "multiply" → el factor es el producto de (1 + valor).
 *  - floor: el factor nunca baja de este valor (0 = una eficacia −150 % no
 *    produce recursos negativos).
 *  - pool: categorías que comparten un mismo montón de valores antes de
 *    combinarse (la eficacia de designación, edificios y estrato es un solo
 *    montón).
 *  - appliesTo: sobre qué cantidad actúa (texto i18n en `stacking`).
 *
 * ── Procedencia ─────────────────────────────────────────────────────────
 * Estado `unverified`: la wiki 4.5 no describe la fórmula de apilado (solo
 * dice que las subcategorías de empleo heredan los multiplicadores de su
 * categoría padre y solo algunas heredan los aditivos), así que las reglas
 * son las que el simulador ya usaba (todo aditivo, factor mínimo 0). No es una
 * regla del juego confirmada: revisar en P14 con los archivos del juego.
 *
 * Simplificación conocida: no se modela la herencia entre categorías de
 * empleo (p. ej. las Mega-Forjas también afectan a los Trabajadores de
 * fábrica extraños).
 */

import { CURRENT_RULESET_ID } from "./data-version.js";

const rule = (combine, floor, stacking, appliesTo, pool) => ({ combine, floor, stacking, appliesTo, ...(pool ? { pool } : {}) });

export const STACKING_RULES = {
  "stellaris-pc-4.5.2": {
    jobFlat: rule("add", null, "modifierStackJobFlat", "jobUnitOutput"),
    jobEfficiency: rule("add", 0, "modifierStackJobEfficiency", "positiveJobOutput", "jobEfficiencyPool"),
    stratumEfficiency: rule("add", 0, "modifierStackJobEfficiency", "positiveJobOutput", "jobEfficiencyPool"),
    jobUpkeep: rule("add", 0, "modifierStackJobUpkeep", "jobUpkeep"),
    jobResourceMult: rule("add", null, "modifierStackJobResourceMult", "jobProducedResource"),
    resourceMult: rule("add", null, "modifierStackResourceMult", "totalPositiveProduction"),
    resourceFlat: rule("add", null, "modifierStackExternal", "externalIncome"),
    flat: rule("add", null, "modifierStackFlat", "monthlyTotal")
  }
};

/** Orden en que computeTotals() aplica los pasos (claves i18n de la lista del panel). */
export const CALCULATION_ORDER = {
  "stellaris-pc-4.5.2": ["modifierOrder1", "modifierOrder2", "modifierOrder3", "modifierOrder4", "modifierOrder5", "modifierOrder6", "modifierOrder7"]
};

export function getStackingRules(rulesetId) {
  return STACKING_RULES[rulesetId] || STACKING_RULES[CURRENT_RULESET_ID];
}

export function getCalculationOrder(rulesetId) {
  return CALCULATION_ORDER[rulesetId] || CALCULATION_ORDER[CURRENT_RULESET_ID];
}

/** Valor combinado (como fracción) de una lista de modificadores según la regla: suma, o producto de (1+v) menos 1. */
export function combineFraction(stackingRule, values) {
  if (!values.length) return 0;
  if (stackingRule.combine === "multiply") return values.reduce((product, value) => product * (1 + value), 1) - 1;
  return values.reduce((sum, value) => sum + value, 0);
}

/** Factor final (1 + fracción) respetando el límite inferior de la regla, si lo tiene. */
export function stackFactor(stackingRule, values) {
  const factor = 1 + combineFraction(stackingRule, values);
  return stackingRule.floor == null ? factor : Math.max(stackingRule.floor, factor);
}

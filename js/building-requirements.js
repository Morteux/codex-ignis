/**
 * Requisitos de construcción de los edificios (ética, autoridad, civismos,
 * designación, tipo de cuerpo celeste, nivel del capital).
 *
 * Fuente: columna "Requirements" de las páginas de edificios de la wiki
 * (Buildings, Unity, Research, Industry y Resource buildings). Cada edificio
 * de planet-data.js puede traer `requires: [regla, ...]`; el edificio solo
 * está disponible si se cumplen TODAS. Las reglas disponibles:
 *   { type: "notGestalt" }                   no con Consciencia gestalt
 *   { type: "usesPriestJobs", value: bool }  "Uses Priest jobs" de la wiki:
 *                                            individualista y espiritualista
 *   { type: "usesConsumerGoods" }            "Empire uses Consumer Goods": no gestalt
 *                                            (la wiki dice que los empleos gestalt
 *                                            usan energía en vez de bienes de consumo)
 *   { type: "civic", keys: [...] }           alguno de esos principios elegido
 *   { type: "notCivic", keys: [...] }        ninguno de esos principios elegido
 *   { type: "notDesignation", ids: [...] }   designación planetaria no es ninguna de esas
 *   { type: "notCelestial", ids: [...] }     tipo de cuerpo celeste no es ninguno de esos
 *   { type: "capitalTier", min: n }          nivel del edificio capital (índice, 0 = Refugio Colonial)
 *
 * Simplificaciones deliberadas (documentadas, no inventadas):
 *  - Los requisitos de tecnología, población y tradiciones se ignoran: este
 *    simulador asume toda la investigación desbloqueada.
 *  - Los requisitos de origen (Naturaleza salvaje, Moradores del vacío,
 *    Grilletes rotos...), de federación ("A Union of Faith") y de
 *    capital especial (Command Center) no se aplican: no se modelan aquí.
 *  - "Uses Priest jobs" se evalúa solo con la ética Espiritualista (normal o
 *    fanática), sin la rama de la federación.
 */

import { ethicsSatisfy, GESTALT_CONSCIOUSNESS } from "./empire-data.js";

function isGestalt(ctx) {
  return ethicsSatisfy(ctx.ethicIds || [], GESTALT_CONSCIOUSNESS.id);
}

function usesPriestJobs(ctx) {
  return !isGestalt(ctx) && ethicsSatisfy(ctx.ethicIds || [], "spiritualist");
}

function ruleMet(rule, ctx) {
  switch (rule.type) {
    case "notGestalt": return !isGestalt(ctx);
    case "usesPriestJobs": return usesPriestJobs(ctx) === (rule.value !== false);
    case "usesConsumerGoods": return !isGestalt(ctx);
    case "civic": return rule.keys.some((key) => (ctx.civicIds || []).includes(key));
    case "notCivic": return !rule.keys.some((key) => (ctx.civicIds || []).includes(key));
    case "notDesignation": return !rule.ids.includes(ctx.designationId);
    case "notCelestial": return !rule.ids.includes(ctx.celestialTypeId);
    case "capitalTier": return (ctx.capitalTierIndex || 0) >= rule.min;
    default: return true;
  }
}

/** ¿Cumple el edificio todos sus requisitos con el contexto dado { ethicIds, authorityId, civicIds, designationId, celestialTypeId, capitalTierIndex }? */
export function buildingRequirementsMet(building, ctx) {
  return (building.requires || []).every((rule) => ruleMet(rule, ctx));
}

/** Clave estable del contexto (para saber si ha cambiado algo relevante). */
export function requirementContextKey(ctx) {
  return [
    (ctx.ethicIds || []).join(","),
    ctx.authorityId,
    [...(ctx.civicIds || [])].sort().join(","),
    ctx.designationId,
    ctx.celestialTypeId,
    ctx.capitalTierIndex
  ].join("|");
}

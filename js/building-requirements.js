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
 *   { type: "ethic", ids: [...] }            alguna de esas éticas elegida (la fanática cumple
 *                                            también el requisito de su versión base)
 *   { type: "notEthic", ids: [...] }         ninguna de esas éticas elegida
 *   { type: "authority", ids: [...] }        la autoridad elegida es alguna de esas
 *   { type: "notAuthority", ids: [...] }     la autoridad elegida no es ninguna de esas
 *   { type: "civic", keys: [...] }           alguno de esos principios elegido
 *   { type: "notCivic", keys: [...] }        ninguno de esos principios elegido
 *   { type: "notDesignation", ids: [...] }   designación planetaria no es ninguna de esas
 *   { type: "notCelestial", ids: [...] }     tipo de cuerpo celeste no es ninguno de esos
 *   { type: "celestial", ids: [...] }       tipo de cuerpo celeste es alguno de esos (P7.9)
 *   { type: "notSpecies", ids: [...] }       el tipo de especie no es ninguno de esos (P7.9)
 *   { type: "capitalTier", min: n }          nivel del edificio capital en números (I = 1 ... V = 5)
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
    case "ethic": return rule.ids.some((id) => ethicsSatisfy(ctx.ethicIds || [], id));
    case "notEthic": return !rule.ids.some((id) => ethicsSatisfy(ctx.ethicIds || [], id));
    case "authority": return rule.ids.includes(ctx.authorityId);
    case "notAuthority": return !rule.ids.includes(ctx.authorityId);
    case "civic": return rule.keys.some((key) => (ctx.civicIds || []).includes(key));
    case "notCivic": return !rule.keys.some((key) => (ctx.civicIds || []).includes(key));
    case "notDesignation": return !rule.ids.includes(ctx.designationId);
    case "notCelestial": return !rule.ids.includes(ctx.celestialTypeId);
    case "celestial": return rule.ids.includes(ctx.celestialTypeId);
    case "notSpecies": return !rule.ids.includes(ctx.speciesType);
    case "capitalTier": return (ctx.capitalTierNumber || 1) >= rule.min;
    default: return true;
  }
}

/** ¿Cumple el edificio todos sus requisitos con el contexto dado { ethicIds, authorityId, civicIds, designationId, celestialTypeId, capitalTierIndex }? */
export function buildingRequirementsMet(building, ctx) {
  return (building.requires || []).every((rule) => ruleMet(rule, ctx));
}

/** Reglas del elemento (edificio, designación...) que NO se cumplen con el contexto dado. */
export function unmetRequirements(item, ctx) {
  return (item.requires || []).filter((rule) => !ruleMet(rule, ctx));
}

/** Clave estable del contexto (para saber si ha cambiado algo relevante). */
export function requirementContextKey(ctx) {
  return [
    (ctx.ethicIds || []).join(","),
    ctx.authorityId,
    [...(ctx.civicIds || [])].sort().join(","),
    ctx.designationId,
    ctx.celestialTypeId,
    ctx.speciesType,
    ctx.capitalTierNumber
  ].join("|");
}

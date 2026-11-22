/**
 * Datos de la pestaña "Imperio": autoridades (sistema de puntos de ética),
 * forma de gobierno (Authority) y requisitos de principios (Civics).
 *
 * Fuente: páginas de la Wiki "Government", "Civics", "Hive mind civics",
 * "Machine intelligence civics" y "Corporate civics" (aportadas por
 * Morteux). Los nombres, textos y requisitos de autoridad/forma de
 * gobierno/principios de este archivo vienen de ahí; no hay cifras de
 * juego inventadas.
 *
 * ── Simplificaciones deliberadas (para no inventar mecánicas no dadas) ──
 * - Autoridades: solo se modelan las autoridades base (Democrática,
 *   Oligárquica, Dictatorial, Imperial, Corporativa, Inteligencia de
 *   Máquina, Mente Colmena). P10.6: la Inteligencia Mutualista es la Mente
 *   Colmena con el origen Wilderness (ORIGINS, MUTUALISTIC_INTELLIGENCE). Se
 *   omiten las autoridades de ascensión (exigen completar una situación de
 *   ascensión, no modelada).
 * - Principios: un requisito de principio que hace referencia a un origen,
 *   a otro principio/DLC concreto NO se aplica aquí (no hay datos de
 *   orígenes ni de dependencias entre principios en este simulador); solo
 *   se aplican los requisitos de ética y de forma de gobierno, tal cual
 *   aparecen en la Wiki. Los principios de las páginas de Mente Colmena,
 *   Inteligencia de Máquina y Corporativos SÍ llevan su forma de gobierno
 *   requerida (lo dice el propio texto introductorio de cada página).
 * - No se modelan bonificaciones numéricas por ética individual: la Wiki
 *   aportada no incluye una página de Éticas dedicada, así que esta
 *   pantalla solo sirve para ELEGIR qué desbloqueas (autoridad y
 *   principios disponibles), no para calcular los efectos de cada ética.
 * - Un principio que no aparece en js/civic-rules.js (CIVIC_REQUIREMENTS) no
 *   tiene requisito conocido y se considera siempre disponible.
 */

import { CIVIC_REQUIREMENTS, CIVIC_AUTHORITIES } from "./civic-rules.js";

/** Presupuesto total de puntos para elegir autoridades (éticas). */
export const ETHICS_MAX_POINTS = 3;

/**
 * Cuatro ejes de autoridad; cada eje ofrece hasta 4 opciones mutuamente
 * excluyentes entre sí (normal/fanática de cada uno de los dos polos).
 * Elegir una opción de un eje no afecta a los demás ejes.
 */
export const ETHIC_AXES = [
  {
    id: "xenoAxis",
    options: [
      { id: "xenophile", i18nKey: "ethicXenophile", cost: 1 },
      { id: "fanaticXenophile", i18nKey: "ethicFanaticXenophile", cost: 2 },
      { id: "xenophobe", i18nKey: "ethicXenophobe", cost: 1 },
      { id: "fanaticXenophobe", i18nKey: "ethicFanaticXenophobe", cost: 2 }
    ]
  },
  {
    id: "warAxis",
    options: [
      { id: "pacifist", i18nKey: "ethicPacifist", cost: 1 },
      { id: "fanaticPacifist", i18nKey: "ethicFanaticPacifist", cost: 2 },
      { id: "militarist", i18nKey: "ethicMilitarist", cost: 1 },
      { id: "fanaticMilitarist", i18nKey: "ethicFanaticMilitarist", cost: 2 }
    ]
  },
  {
    id: "beliefAxis",
    options: [
      { id: "materialist", i18nKey: "ethicMaterialist", cost: 1 },
      { id: "fanaticMaterialist", i18nKey: "ethicFanaticMaterialist", cost: 2 },
      { id: "spiritualist", i18nKey: "ethicSpiritualist", cost: 1 },
      { id: "fanaticSpiritualist", i18nKey: "ethicFanaticSpiritualist", cost: 2 }
    ]
  },
  {
    id: "powerAxis",
    options: [
      { id: "egalitarian", i18nKey: "ethicEgalitarian", cost: 1 },
      { id: "fanaticEgalitarian", i18nKey: "ethicFanaticEgalitarian", cost: 2 },
      { id: "authoritarian", i18nKey: "ethicAuthoritarian", cost: 1 },
      { id: "fanaticAuthoritarian", i18nKey: "ethicFanaticAuthoritarian", cost: 2 }
    ]
  }
];

/**
 * Consciencia gestalt: opción especial que sustituye por completo a los 4
 * ejes anteriores (no se puede combinar con ninguna otra ética) y consume
 * de golpe todo el presupuesto de puntos.
 */
export const GESTALT_CONSCIOUSNESS = { id: "gestaltConsciousness", i18nKey: "ethicGestaltConsciousness", cost: 3 };

/** Todas las opciones de ética (los 16 polos + consciencia gestalt), indexadas por id. */
export const ETHIC_OPTIONS = Object.fromEntries(
  [...ETHIC_AXES.flatMap((axis) => axis.options), GESTALT_CONSCIOUSNESS].map((option) => [option.id, option])
);

/** id de la ética "fanática" -> id de su versión base equivalente, para que un requisito de la base también lo cumpla la fanática. */
const FANATIC_OF = {
  fanaticXenophile: "xenophile",
  fanaticXenophobe: "xenophobe",
  fanaticMilitarist: "militarist",
  fanaticPacifist: "pacifist",
  fanaticMaterialist: "materialist",
  fanaticSpiritualist: "spiritualist",
  fanaticEgalitarian: "egalitarian",
  fanaticAuthoritarian: "authoritarian"
};

/** ¿La ética seleccionada `selectedEthicId` cumple el requisito `requiredEthicId`? (la fanática también cumple el requisito de su base). */
function ethicSatisfies(selectedEthicId, requiredEthicId) {
  if (!selectedEthicId) return false;
  if (selectedEthicId === requiredEthicId) return true;
  return FANATIC_OF[selectedEthicId] === requiredEthicId;
}

/** ¿Alguna de las éticas actualmente seleccionadas (Set/array de ids) cumple `requiredEthicId`? */
export function ethicsSatisfy(selectedEthicIds, requiredEthicId) {
  for (const id of selectedEthicIds) {
    if (ethicSatisfies(id, requiredEthicId)) return true;
  }
  return false;
}

/**
 * Autoridades (Authority), según la tabla de autoridades individualistas /
 * gestalt de la Wiki (página Government). IMPORTANTE: la columna
 * "Requirements" de la Wiki marca casi todos los requisitos como
 * EXCLUSIONES (icono "No"): p. ej. la democrática exige NO ser
 * autoritario, no "ser autoritario". excludesEthics: la autoridad queda
 * bloqueada si hay seleccionada CUALQUIERA de esas éticas (una ética base
 * también bloquea su versión fanática; una fanática solo se bloquea a sí
 * misma). gestalt: true → solo con Consciencia gestalt; el resto de
 * autoridades exigen NO ser gestalt (lo dice la página de Éticas).
 * Cuadra con la página de Éticas: Autoritario fanático "debe usar
 * autoridad autocrática" (= solo quedan Dictatorial/Imperial) e
 * Igualitario fanático "debe usar democrática".
 */
export const AUTHORITIES = [
  { id: "democratic", i18nKey: "authorityDemocratic", blurbI18nKey: "authorityDemocraticBlurb", img: "authorities/Auth_democratic.png", gestalt: false, excludesEthics: ["authoritarian"] },
  { id: "oligarchic", i18nKey: "authorityOligarchic", blurbI18nKey: "authorityOligarchicBlurb", img: "authorities/Auth_oligarchic.png", gestalt: false, excludesEthics: ["fanaticAuthoritarian", "fanaticEgalitarian"] },
  { id: "dictatorial", i18nKey: "authorityDictatorial", blurbI18nKey: "authorityDictatorialBlurb", img: "authorities/Auth_dictatorial.png", gestalt: false, excludesEthics: ["egalitarian"] },
  { id: "imperial", i18nKey: "authorityImperial", blurbI18nKey: "authorityImperialBlurb", img: "authorities/Auth_imperial.png", gestalt: false, excludesEthics: ["egalitarian"] },
  { id: "corporate", i18nKey: "authorityCorporate", blurbI18nKey: "authorityCorporateBlurb", img: "authorities/Auth_corporate.png", gestalt: false, excludesEthics: ["fanaticAuthoritarian", "fanaticEgalitarian"] },
  { id: "machineIntelligence", i18nKey: "authorityMachineIntelligence", blurbI18nKey: "authorityMachineIntelligenceBlurb", img: "authorities/Auth_machine_intelligence.png", gestalt: true, excludesEthics: [] },
  { id: "hiveMind", i18nKey: "authorityHiveMind", blurbI18nKey: "authorityHiveMindBlurb", img: "authorities/Auth_hive_mind.png", gestalt: true, excludesEthics: [] }
];

/**
 * P10.6: origins (game files 4.5.4, common/governments/civics/00_origins.txt). Only Wilderness is modelled; every
 * other origin is "no modelled origin" (originId null). Wilderness `possible`: Hive Mind authority and none of these
 * civics (graphical culture and "no Volcanic homeworld" are not modelled). Its authority shows as the Mutualistic
 * Intelligence (MUTUALISTIC_INTELLIGENCE below).
 */
export const ORIGINS = [
  {
    id: "wilderness",
    i18nKey: "originWilderness",
    blurbI18nKey: "originWildernessBlurb",
    img: "origin_icons/Origins_wilderness.png",
    authorities: ["hiveMind"],
    excludedCivics: [
      "civicHiveCatalyticProcessing", "civicHiveToxicBaths", "civicHiveMemorialist", "civicHiveGuidedSapience",
      "civicHiveAstrometeorology", "civicHivePlanetscapers", "civicHiveEntropyDrinkers",
      "civicHiveSuperstitiousBeliefs", "civicHiveTwistedExperimenters", "civicHiveChosen", "civicHiveWorldForgers",
      "civicHiveScorchedEarth", "civicHiveGalvanicSymbiosis"
    ]
  }
];

/** Is the origin available with this authority and these civics? */
export function originAvailable(origin, authorityId, civicIds = []) {
  if (!origin) return true;
  return origin.authorities.includes(authorityId) && !origin.excludedCivics.some((key) => civicIds.includes(key));
}

/** Is the civic excluded by the chosen origin? */
export function civicExcludedByOrigin(civicKey, originId) {
  return (ORIGINS.find((origin) => origin.id === originId)?.excludedCivics || []).includes(civicKey);
}

/**
 * P10.6: Mutualistic Intelligence (authorities.json auth_mutualistic_intelligence, trigger is_wilderness_empire):
 * the Hive Mind authority of a Wilderness empire. inherit_effects = no, so its effects replace the Hive Mind ones.
 */
export const MUTUALISTIC_INTELLIGENCE = {
  id: "mutualisticIntelligence",
  i18nKey: "authorityMutualisticIntelligence",
  blurbI18nKey: "authorityMutualisticIntelligenceBlurb",
  img: "authorities/Auth_mutualistic_intelligence.png"
};

/** Authority shown and applied for this authority and origin (the Mutualistic Intelligence variant or the authority itself). */
export function authorityVariant(authorityId, originId) {
  if (authorityId === "hiveMind" && originId === "wilderness") return MUTUALISTIC_INTELLIGENCE;
  return AUTHORITIES.find((authority) => authority.id === authorityId) || null;
}

/** ¿Hay un conjunto de éticas válido? La página de Éticas exige gastar los 3 puntos (3 moderadas, 1 fanática + 1 moderada, o gestalt). */
export function ethicsComplete(selectedEthicIds) {
  let total = 0;
  for (const id of selectedEthicIds) total += (ETHIC_OPTIONS[id]?.cost || 0);
  return total === ETHICS_MAX_POINTS;
}

/** ¿La autoridad está desbloqueada con las éticas actualmente seleccionadas? */
export function authorityAvailable(authority, selectedEthicIds) {
  if (!ethicsComplete(selectedEthicIds)) return false;
  const isGestalt = ethicsSatisfy(selectedEthicIds, GESTALT_CONSCIOUSNESS.id);
  if (authority.gestalt !== isGestalt) return false;
  return !authority.excludesEthics.some((id) => ethicsSatisfy(selectedEthicIds, id));
}

/** Éticas seleccionadas que bloquean una autoridad (para explicar el bloqueo al usuario). */
export function blockingEthics(authority, selectedEthicIds) {
  return authority.excludesEthics.filter((id) => ethicsSatisfy(selectedEthicIds, id));
}

/**
 * Principios: la Wiki confirma "Each empire starts with up to two civics",
 * con un tercero disponible al investigar Galactic Administration. Este
 * simulador asume toda la investigación desbloqueada (a petición de
 * Morteux), así que se permiten 3 desde el principio; en partida real ese
 * tercer hueco es especial porque solo se desbloquea al avanzar (no es un
 * hueco inicial), algo que este simulador no distingue.
 */
export const MAX_CIVICS = 3;

/** Requisitos y exclusiones de cada principio: ver js/civic-rules.js (generado desde la Wiki). */
export { CIVIC_REQUIREMENTS };

const NON_GESTALT_AUTHORITIES = ["democratic", "oligarchic", "dictatorial", "imperial", "corporate"];

function civicGroupMatches(group, selectedEthicIds, authorityId, otherCivicIds) {
  return group.ethics.some((id) => ethicsSatisfy(selectedEthicIds, id))
    || (authorityId != null && group.authorities.includes(authorityId))
    || (group.civics || []).some((key) => otherCivicIds.includes(key))
    || (group.nonGestalt === true && !ethicsSatisfy(selectedEthicIds, GESTALT_CONSCIOUSNESS.id));
}

/** ¿Excluye el principio `a` al principio `b` según la Wiki? (en cualquiera de los dos sentidos: las incompatibilidades se tratan como simétricas) */
export function civicsConflict(a, b) {
  const excludes = (x, y) => (CIVIC_REQUIREMENTS[x] || []).some((group) => group.exclude && (group.civics || []).includes(y));
  return excludes(a, b) || excludes(b, a);
}

/**
 * ¿Está disponible el principio `i18nKey` con las éticas, la autoridad y los
 * demás principios ya elegidos? (authorityId puede ser null si aún no se ha
 * elegido; selectedCivicIds puede incluir al propio principio, se ignora.)
 */
export function civicAvailable(i18nKey, selectedEthicIds, authorityId, selectedCivicIds = []) {
  const others = selectedCivicIds.filter((key) => key !== i18nKey);
  if (others.some((key) => civicsConflict(i18nKey, key))) return false;
  const groups = CIVIC_REQUIREMENTS[i18nKey] || [];
  // Si la tabla no exige ninguna autoridad concreta, se aplica la que le
  // corresponde por tipo de principio (ver CIVIC_AUTHORITIES en civic-rules.js).
  const hasExplicitAuthority = groups.some((group) => !group.exclude && (group.authorities.length || group.nonGestalt));
  const requirementGroups = hasExplicitAuthority
    ? groups
    : [...groups, { exclude: false, ethics: [], authorities: (CIVIC_AUTHORITIES[i18nKey] || NON_GESTALT_AUTHORITIES), civics: [] }];
  return requirementGroups.every((group) => {
    const anyMatch = civicGroupMatches(group, selectedEthicIds, authorityId, others);
    return group.exclude ? !anyMatch : anyMatch;
  });
}

/** Wheel position and icon of every ethic: see js/ethic-wheel.js (shared with the ethics bingo). */
export { ETHIC_WHEEL, ETHIC_ICONS } from "./ethic-wheel.js";

/**
 * Efectos numéricos de cada ética y autoridad (Wiki: páginas Ethics y
 * Government, columna "Empire effects"). Cada efecto: { label (clave de
 * etiqueta, ver effectLabel* en i18n.js), value, unit: "percent" | "flat",
 * apply? }. Solo los efectos con "apply" se aplican a los cálculos del
 * planeta; el resto se muestran como información (no hay estadística
 * equivalente en este simulador, o falta algún dato — ver nota abajo):
 *  - { type: "resourceMult", resource } multiplica la producción POSITIVA
 *    de ese recurso (p. ej. "+10% Monthly unity").
 *  - { type: "resourceFlat", resource } suma una cantidad fija mensual.
 *  - { type: "stratumEfficiency", stratum } (P7.7) suma eficacia laboral a la
 *    producción positiva de todos los empleos de ese estrato ("worker" o
 *    "specialist", ver JOB_STRATA en planet-data.js; "Worker/Specialist job
 *    efficiency" de la página Ethics de la Wiki 4.5).
 * Sin aplicar a propósito: "Research speed" (es velocidad de
 * investigación de tecnologías, no producción de recursos), y todo lo que
 * depende de estadísticas que el simulador no rastrea (estabilidad, tamaño
 * de imperio, facciones, edictos, flota, enviados...). Se omiten los
 * efectos solo para nómadas/arca.
 */
const pct = (label, value, apply) => ({ label, value, unit: "percent", ...(apply ? { apply } : {}) });
const flat = (label, value, apply) => ({ label, value, unit: "flat", ...(apply ? { apply } : {}) });
const UNITY_MULT = { type: "resourceMult", resource: "unity" };
const TRADE_MULT = { type: "resourceMult", resource: "trade" };
const INFLUENCE_FLAT = { type: "resourceFlat", resource: "influence" };
// P7.7: eficacia laboral por estrato de empleo (JOBS[...].stratum en planet-data.js).
const WORKER_EFFICIENCY = { type: "stratumEfficiency", stratum: "worker" };
const SPECIALIST_EFFICIENCY = { type: "stratumEfficiency", stratum: "specialist" };

export const ETHIC_EFFECTS = {
  fanaticSpiritualist: [pct("monthlyUnity", 0.2, UNITY_MULT), pct("edictCost", -0.2), pct("edictUpkeep", -0.2)],
  spiritualist: [pct("monthlyUnity", 0.1, UNITY_MULT), pct("edictCost", -0.1), pct("edictUpkeep", -0.1)],
  fanaticMilitarist: [pct("shipFireRate", 0.2), pct("claimInfluenceCost", -0.2)],
  militarist: [pct("shipFireRate", 0.1), pct("claimInfluenceCost", -0.1)],
  fanaticXenophobe: [pct("popGrowthOrAssembly", 0.2), pct("starbaseInfluenceCost", -0.4), pct("refugeeAttraction", -0.3)],
  xenophobe: [pct("popGrowthOrAssembly", 0.1), pct("starbaseInfluenceCost", -0.2), pct("refugeeAttraction", -0.15)],
  fanaticAuthoritarian: [flat("monthlyInfluence", 1, INFLUENCE_FLAT), pct("workerJobEfficiency", 0.1, WORKER_EFFICIENCY)],
  authoritarian: [flat("monthlyInfluence", 0.5, INFLUENCE_FLAT), pct("workerJobEfficiency", 0.05, WORKER_EFFICIENCY)],
  fanaticEgalitarian: [pct("factionResourceOutput", 0.3), pct("specialistJobEfficiency", 0.1, SPECIALIST_EFFICIENCY)],
  egalitarian: [pct("factionResourceOutput", 0.15), pct("specialistJobEfficiency", 0.05, SPECIALIST_EFFICIENCY)],
  fanaticXenophile: [pct("tradeFromJobs", 0.2, TRADE_MULT), flat("availableEnvoys", 2), pct("refugeeAttraction", 0.3), pct("observationInsights", 1)],
  xenophile: [pct("tradeFromJobs", 0.1, TRADE_MULT), flat("availableEnvoys", 1), pct("refugeeAttraction", 0.15), pct("observationInsights", 0.5)],
  fanaticPacifist: [pct("empireSizeFromPops", -0.2), flat("stability", 10)],
  pacifist: [pct("empireSizeFromPops", -0.1), flat("stability", 5)],
  fanaticMaterialist: [pct("robotUpkeep", -0.2), pct("researchSpeed", 0.1)],
  materialist: [pct("robotUpkeep", -0.1), pct("researchSpeed", 0.05)],
  gestaltConsciousness: [pct("warExhaustionGain", -0.2), flat("monthlyInfluence", 1, INFLUENCE_FLAT), flat("encryption", 2)]
};

export const AUTHORITY_EFFECTS = {
  democratic: [pct("factionApproval", 0.1), flat("recruitableLeaders", 1)],
  oligarchic: [flat("councilorSkill", 2)],
  dictatorial: [pct("rulerExperience", 0.25), flat("recruitableLeaders", -1)],
  imperial: [pct("capitalSystemResources", 0.1), flat("recruitableLeaders", -1)],
  corporate: [flat("availableEnvoys", 1), pct("tradeFromJobsAndContracts", 0.1, TRADE_MULT), pct("empireSizeFromPlanets", 0.5)],
  machineIntelligence: [pct("colonyDevelopmentSpeed", 0.25), pct("miningStationResources", 0.1), flat("mechanicalPopAssembly", 1)],
  hiveMind: [pct("popGrowthSpeed", 0.25), pct("empireSizeEffect", -0.25)],
  // P10.6: authorities.json auth_mutualistic_intelligence modifier (empire size and diplomatic weight: info only).
  mutualisticIntelligence: [pct("empireSizeEffect", -0.25), pct("empireSizeFromDistricts", 2), pct("empireSizeFromPlanets", 1), pct("diplomaticWeightEconomy", 1)]
};

/** Efectos aplicables a los cálculos: devuelve { resourceMult: {recurso: fracción}, resourceFlat: {recurso: cantidad}, stratumEfficiency: {estrato: fracción} } para las éticas y la autoridad dadas. */
export function collectAppliedEffects(selectedEthicIds, authorityId, originId = null) {
  const resourceMult = {};
  const resourceFlat = {};
  const stratumEfficiency = {};
  const authorityKey = authorityVariant(authorityId, originId)?.id || authorityId;
  const effectLists = [...selectedEthicIds.map((id) => ETHIC_EFFECTS[id] || []), AUTHORITY_EFFECTS[authorityKey] || []];
  effectLists.forEach((list) => list.forEach((effect) => {
    if (!effect.apply) return;
    const { type, resource, stratum } = effect.apply;
    if (type === "resourceMult") resourceMult[resource] = (resourceMult[resource] || 0) + effect.value;
    else if (type === "resourceFlat") resourceFlat[resource] = (resourceFlat[resource] || 0) + effect.value;
    else if (type === "stratumEfficiency") stratumEfficiency[stratum] = (stratumEfficiency[stratum] || 0) + effect.value;
  }));
  return { resourceMult, resourceFlat, stratumEfficiency };
}

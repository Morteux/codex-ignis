/**
 * Designaciones planetarias, para el desplegable de la pestaña "Planeta".
 *
 * Fuente: página de la Wiki "Designation" (aportada por Morteux). Por cada
 * designación solo se modelan dos tipos de efecto, los que encajan con lo
 * que este simulador ya calcula:
 *  - jobEfficiency: { jobId: fracción }. Multiplica la salida de recursos
 *    de ESE empleo (ver JOB_OUTPUTS en planet-data.js), tal cual la columna
 *    "Effects" de la Wiki lo describe como "+X% <Job> job efficiency".
 *  - P10.5 (Synaptic Lathe): jobResourcePct ({ all | resourceId: % }, "+X% Resources
 *    from Jobs"), jobUpkeepPct (% de "Upkeep from Jobs", todos los empleos) y
 *    popHousingUsagePct (% de uso de vivienda por pop), como los del cuerpo celeste.
 *  - flat: { resourceId: cantidad }. Solo para bonos PLANOS (no en %) a
 *    Servicios/Vivienda/Unidad, que ya son recursos/estadísticas que este
 *    simulador rastrea.
 *
 * ── Simplificaciones deliberadas (documentadas, no inventadas) ──────────
 * - Se omiten las designaciones de Capital (Empire/Machine/Hive Capital):
 *   solo aplican al planeta capital, un concepto que este simulador no
 *   distingue, y además dependen de la autoridad (ver empire-data.js) de
 *   una forma que añadiría bastante acoplamiento para un beneficio dudoso
 *   aquí. También se omiten las "Unavailable designations" (la propia Wiki
 *   dice que no se pueden elegir).
 * - Solo se usa la columna "Effects" (el efecto base de tener elegida la
 *   designación). La columna "Bonuses" de la Wiki son bonos EXTRA sujetos a
 *   tradiciones/resoluciones concretas no modeladas aquí, así que no se
 *   aplican.
 * - Cualquier otro efecto de la Wiki que no sea eficacia laboral o un bono
 *   plano a servicios/vivienda/unidad (velocidad de construcción,
 *   estabilidad, delincuencia, bombardeo orbital, velocidad de
 *   crecimiento, etc.) no se modela todavía — este simulador no rastrea
 *   esas estadísticas. Se puede ir ampliando a futuro.
 * - "Forge World", "Factory World" e "Industrial World" aparecen en la
 *   Wiki tanto en "Standard designations" como en "Ring World
 *   designations" con el mismo nombre y el mismo efecto: aquí cuentan como
 *   una única designación (categoría "standard"), no duplicada.
 * - Columna "Job"→icono: cuando la designación da eficacia a uno o más
 *   empleos, se usa el icono de ese empleo (el de mayor bonificación si
 *   hay varios). Si no, se reutiliza el propio icono que la Wiki ya le
 *   asigna, cuando corresponde a un empleo que también existe en
 *   jobs/ (p. ej. Weaver World → job_livestock.png, aunque su efecto real
 *   no se modele). Si ninguna de las dos aplica, se usa el icono del tipo
 *   de cuerpo celeste asociado (Habitat/Ecumenópolis/Mundo anillo/Mundo
 *   colmena/Mundo máquina/Enlace sináptico) o, en último caso, un icono
 *   genérico ya existente en el proyecto (Servicios/Unidad).
 */

/**
 * ── Requisitos (P7.9) ───────────────────────────────────────────────────
 * Columna "Requirements" de la página "Designation" de la Wiki (4.5), como
 * reglas `requires` con los mismos tipos que los edificios (ver
 * js/building-requirements.js). Una designación solo se puede elegir si se
 * cumplen TODAS. Tipos nuevos para esto: { type: "celestial", ids } (el
 * tipo de cuerpo celeste es uno de esos) y { type: "notSpecies", ids } (el
 * tipo de especie no es ninguno: "Agri-World" exige al menos una especie
 * biológica, y aquí la única especie es la elegida en la pestaña Imperio).
 *
 * No se modelan (no bloquean, pero se muestran junto a la opción con
 * `unmodelled(...)`, ver js/building-requirements.js): los requisitos de origen
 * (Naturaleza salvaje: Mundo tranquilo, Mundo tejedor y el bloque
 * "wilderness"), de modificador de planeta (Colonia penal, Mundo turístico,
 * Mundo del placer, Mundo de esclavos), de tradición (Mundo nanotecnológico:
 * Unbridled Consumption) y de "no nómada". Las designaciones de capital y las
 * no disponibles para el jugador no están en este catálogo (ver arriba).
 * "Mundo santuario" y "Centro de unificación" hacen referencia al principio
 * Rogue Servitor, que aquí es civicMachineServitor.
 */
const NOT_GESTALT = { type: "notGestalt" };
const USES_CONSUMER_GOODS = { type: "usesConsumerGoods" };
const ethic = (...ids) => ({ type: "ethic", ids });
const notEthic = (...ids) => ({ type: "notEthic", ids });
const authority = (...ids) => ({ type: "authority", ids });
const civic = (...keys) => ({ type: "civic", keys });
const notCivic = (...keys) => ({ type: "notCivic", keys });
const celestial = (...ids) => ({ type: "celestial", ids });
// P10.4: "Can build Reactor Districts / Astro-Mining Bays": not met only when the manual cap of that habitat district
// group (orbital deposits) is 0. "Can build Zero-G Research Districts" stays unmodelled until the owner confirms which
// district it is (GDD §4.1).
const canBuildDistrict = (district) => ({ type: "districtBuildable", district });
const notCelestial = (...ids) => ({ type: "notCelestial", ids });
const notSpecies = (...ids) => ({ type: "notSpecies", ids });
// Requirement not modelled (origin, planet modifier, relic attunement): never blocks, shown next to the option.
const unmodelled = (i18nKey) => ({ type: "unmodelled", i18nKey });
// P10.6: the Wilderness origin is modelled (js/empire-data.js ORIGINS); same rules as WILDERNESS_ORIGIN in planet-data.js.
const WILDERNESS = { type: "origin", ids: ["wilderness"], i18nKey: "reqWildernessOrigin" };
const NOT_WILDERNESS = { type: "notOrigin", ids: ["wilderness"], i18nKey: "reqNotWildernessOrigin" };

import { buildingRequirementsMet } from "./building-requirements.js";

export const DESIGNATION_CATEGORY_ORDER = [
  "unity",
  "urban",
  "standard",
  "specialized",
  "hiveWorld",
  "machineWorld",
  "wilderness",
  "ecumenopolis",
  "ringWorld",
  "habitat",
  "synapticLathe"
];

export const DESIGNATION_CATEGORY_I18N_KEYS = {
  unity: "designationCategoryUnity",
  urban: "designationCategoryUrban",
  standard: "designationCategoryStandard",
  specialized: "designationCategorySpecialized",
  hiveWorld: "designationCategoryHiveWorld",
  machineWorld: "designationCategoryMachineWorld",
  wilderness: "designationCategoryWilderness",
  ecumenopolis: "designationCategoryEcumenopolis",
  ringWorld: "designationCategoryRingWorld",
  habitat: "designationCategoryHabitat",
  synapticLathe: "designationCategorySynapticLathe"
};

// T2530: job efficiency compared with the 4.6.0 game files (colony_types: `<group>_jobs_bonus_workforce_mult`, whose jobs
// are listed in common/static_modifiers/24_static_modifiers_jobs.txt): the groups include the gestalt jobs (Coordinators,
// Synapse Drones), the Empathic Marketer (shroud trader) and the Experiment Engineer; a job swap (Priest) inherits the
// efficiency of its base job (Bureaucrat). Nest World, Machine Nexus, Resort / Pleasure World and the hive Foundry
// World now give their job efficiency.
export const DESIGNATIONS = [
  { id: "unificationCenter", i18nKey: "designationUnificationCenter", category: "unity", img: "jobs/job_bureaucrat.png", requires: [NOT_WILDERNESS, notEthic("spiritualist"), notCivic("civicMachineServitor")], jobEfficiency: { bureaucrat: 0.15, coordinator: 0.15, synapse_drone: 0.15 }, flat: {} },
  { id: "ecclesiasticalCenter", i18nKey: "designationEcclesiasticalCenter", category: "unity", img: "jobs/job_priest.png", requires: [ethic("spiritualist")], jobEfficiency: { bureaucrat: 0.15, coordinator: 0.15, synapse_drone: 0.15 }, flat: {} },
  { id: "sanctuaryWorld", i18nKey: "designationSanctuaryWorld", category: "unity", img: "resources/Amenities.png", requires: [civic("civicMachineServitor")], jobEfficiency: {}, flat: {} },
  { id: "tranquilWorld", i18nKey: "designationTranquilWorld", category: "unity", img: "resources/Amenities.png", requires: [WILDERNESS], jobEfficiency: { synapse_drone: 0.1 }, flat: {} },
  { id: "urbanWorld", i18nKey: "designationUrbanWorld", category: "urban", img: "jobs/job_trader.png", requires: [NOT_GESTALT], jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "nestWorld", i18nKey: "designationNestWorld", category: "urban", img: "planets/Planet_hive.png", requires: [NOT_WILDERNESS, authority("hiveMind")], jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "machineNexus", i18nKey: "designationMachineNexus", category: "urban", img: "planets/Planet_machine.png", requires: [authority("machineIntelligence"), notCelestial("machine")], jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "weaverWorld", i18nKey: "designationWeaverWorld", category: "urban", img: "jobs/job_livestock.png", requires: [WILDERNESS], jobEfficiency: {}, flat: {}, jobResourcePct: { trade: 10 } },
  { id: "fortressWorld", i18nKey: "designationFortressWorld", category: "standard", img: "jobs/job_soldier.png", jobEfficiency: { soldier: 0.15 }, flat: {} },
  { id: "techWorld", i18nKey: "designationTechWorld", category: "standard", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15, experiment_engineer: 0.15 }, flat: {} },
  { id: "generatorWorld", i18nKey: "designationGeneratorWorld", category: "standard", img: "jobs/job_technician.png", jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "miningWorld", i18nKey: "designationMiningWorld", category: "standard", img: "jobs/job_miner.png", jobEfficiency: { miner: 0.15 }, flat: {} },
  { id: "agriWorld", i18nKey: "designationAgriWorld", category: "standard", img: "jobs/job_farmer.png", requires: [notSpecies("machine"), notCelestial("hive", "machine")], jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "forgeWorld", i18nKey: "designationForgeWorld", category: "standard", img: "jobs/job_foundry.png", requires: [notCelestial("hive", "machine")], jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "factoryWorld", i18nKey: "designationFactoryWorld", category: "standard", img: "jobs/job_artisan.png", requires: [USES_CONSUMER_GOODS, notCelestial("machine")], jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "industrialWorld", i18nKey: "designationIndustrialWorld", category: "standard", img: "jobs/job_foundry.png", requires: [USES_CONSUMER_GOODS, notCelestial("machine")], jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "penalColony", i18nKey: "designationPenalColony", category: "specialized", img: "jobs/job_criminal.png", requires: [unmodelled("reqPenalColonyModifier")], jobEfficiency: {}, flat: {} },
  { id: "resortWorld", i18nKey: "designationResortWorld", category: "specialized", img: "jobs/job_entertainer.png", requires: [unmodelled("reqResortWorldModifier"), unmodelled("reqNotInstrumentOfDesire600")], jobEfficiency: { entertainer: 0.15 }, flat: {} },
  { id: "pleasureWorld", i18nKey: "designationPleasureWorld", category: "specialized", img: "jobs/job_entertainer.png", requires: [unmodelled("reqResortWorldModifier"), unmodelled("reqInstrumentOfDesire600")], jobEfficiency: { entertainer: 0.15 }, flat: {} },
  { id: "thrallWorld", i18nKey: "designationThrallWorld", category: "specialized", img: "resources/Unity.png", requires: [unmodelled("reqThrallWorldModifier")], jobEfficiency: {}, flat: {} },
  { id: "hiveWorld", i18nKey: "designationHiveWorld", category: "hiveWorld", img: "planets/Planet_hive.png", jobEfficiency: {}, flat: {} },
  { id: "hiveWorldFoundry", i18nKey: "designationHiveWorldFoundry", category: "hiveWorld", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "machineWorldFoundry", i18nKey: "designationMachineWorldFoundry", category: "machineWorld", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "machineWorldFactory", i18nKey: "designationMachineWorldFactory", category: "machineWorld", img: "jobs/job_artisan.png", requires: [USES_CONSUMER_GOODS], jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "nanotechWorld", i18nKey: "designationNanotechWorld", category: "machineWorld", img: "planets/Planet_nanite.png", requires: [celestial("nanite")], jobEfficiency: {}, flat: {} },
  { id: "photosynthesisWorld", i18nKey: "designationPhotosynthesisWorld", category: "wilderness", img: "jobs/job_technician.png", requires: [WILDERNESS], jobEfficiency: { technician: 0.25 }, flat: {} },
  { id: "lithicWorld", i18nKey: "designationLithicWorld", category: "wilderness", img: "jobs/job_miner.png", requires: [WILDERNESS], jobEfficiency: { miner: 0.25 }, flat: {} },
  { id: "pollinatingWorld", i18nKey: "designationPollinatingWorld", category: "wilderness", img: "jobs/job_farmer.png", requires: [WILDERNESS], jobEfficiency: { farmer: 0.25 }, flat: {} },
  { id: "cogitationWorld", i18nKey: "designationCogitationWorld", category: "wilderness", img: "jobs/job_researcher.png", requires: [WILDERNESS], jobEfficiency: { physicist: 0.1, biologist: 0.1, engineer: 0.1 }, flat: {} },
  { id: "crucibleWorld", i18nKey: "designationCrucibleWorld", category: "wilderness", img: "jobs/job_foundry.png", requires: [WILDERNESS], jobEfficiency: { metallurgist: 0.1 }, flat: {} },
  { id: "hunterWorld", i18nKey: "designationHunterWorld", category: "wilderness", img: "jobs/job_soldier.png", requires: [WILDERNESS], jobEfficiency: {}, flat: {} },
  { id: "refiningWorld", i18nKey: "designationRefiningWorld", category: "wilderness", img: "jobs/job_gas_refiner_drone.png", requires: [WILDERNESS], jobEfficiency: { chemist_drone: 0.15, translucer_drone: 0.15, gas_refiner_drone: 0.15 }, flat: {} },
  { id: "ecumenopolis", i18nKey: "designationEcumenopolis", category: "ecumenopolis", img: "jobs/job_trader.png", jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "ecumenopolisResearch", i18nKey: "designationEcumenopolisResearch", category: "ecumenopolis", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15, experiment_engineer: 0.15 }, flat: {} },
  { id: "ecumenopolisFoundry", i18nKey: "designationEcumenopolisFoundry", category: "ecumenopolis", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "ecumenopolisFactory", i18nKey: "designationEcumenopolisFactory", category: "ecumenopolis", img: "jobs/job_artisan.png", requires: [USES_CONSUMER_GOODS], jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "ecumenopolisIndustrial", i18nKey: "designationEcumenopolisIndustrial", category: "ecumenopolis", img: "jobs/job_foundry.png", requires: [USES_CONSUMER_GOODS], jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "agricultureRingWorld", i18nKey: "designationAgricultureRingWorld", category: "ringWorld", img: "jobs/job_farmer.png", jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "generatorRingWorld", i18nKey: "designationGeneratorRingWorld", category: "ringWorld", img: "jobs/job_technician.png", jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "researchRingWorld", i18nKey: "designationResearchRingWorld", category: "ringWorld", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15, experiment_engineer: 0.15 }, flat: {} },
  { id: "commercialRingWorld", i18nKey: "designationCommercialRingWorld", category: "ringWorld", img: "jobs/job_trader.png", requires: [NOT_GESTALT], jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "tradeStation", i18nKey: "designationTradeStation", category: "habitat", img: "jobs/job_trader.png", requires: [NOT_GESTALT], jobEfficiency: { trader: 0.15, empathic_marketer: 0.15 }, flat: {} },
  { id: "hydroponicsStation", i18nKey: "designationHydroponicsStation", category: "habitat", img: "jobs/job_farmer.png", jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "generatorStation", i18nKey: "designationGeneratorStation", category: "habitat", img: "jobs/job_technician.png", requires: [canBuildDistrict("generator")], jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "miningStation", i18nKey: "designationMiningStation", category: "habitat", img: "jobs/job_miner.png", requires: [canBuildDistrict("mining")], jobEfficiency: { miner: 0.15 }, flat: {} },
  { id: "researchStation", i18nKey: "designationResearchStation", category: "habitat", img: "jobs/job_biologist.png", requires: [unmodelled("reqZeroGResearchDistrict")], jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15, experiment_engineer: 0.15 }, flat: {} },
  { id: "fortressStation", i18nKey: "designationFortressStation", category: "habitat", img: "jobs/job_soldier.png", jobEfficiency: { soldier: 0.15 }, flat: {} },
  { id: "foundryStation", i18nKey: "designationFoundryStation", category: "habitat", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "factoryStation", i18nKey: "designationFactoryStation", category: "habitat", img: "jobs/job_artisan.png", requires: [USES_CONSUMER_GOODS], jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "industrialStation", i18nKey: "designationIndustrialStation", category: "habitat", img: "jobs/job_foundry.png", requires: [USES_CONSUMER_GOODS], jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "unificationStation", i18nKey: "designationUnificationStation", category: "habitat", img: "jobs/job_bureaucrat.png", requires: [notEthic("spiritualist")], jobEfficiency: { bureaucrat: 0.15, coordinator: 0.15, synapse_drone: 0.15 }, flat: {} },
  { id: "ecclesiasticalStation", i18nKey: "designationEcclesiasticalStation", category: "habitat", img: "jobs/job_priest.png", requires: [ethic("spiritualist")], jobEfficiency: { bureaucrat: 0.15, coordinator: 0.15, synapse_drone: 0.15 }, flat: {} },
  // P10.5: +15 % resources from jobs, −5 % job upkeep, −10 % pop housing usage; −5 % pop decline speed is not modelled (no purge).
  { id: "synapticLathe", i18nKey: "designationSynapticLathe", category: "synapticLathe", img: "planets/Planet_synaptic_lathe.png", jobEfficiency: {}, flat: {}, jobResourcePct: { all: 15 }, jobUpkeepPct: -5, popHousingUsagePct: -10 }
];

// P10.6: designations whose game potential has is_wilderness_empire = no (designations.json 4.5.4); the Wilderness ones
// replace them. T1011: their effects from designations.json 4.5.4 (base planet_modifier only, as the other designations):
// planet_<job>_produces_mult = job efficiency (Tranquil World: bureaucrats = Synapse Drones; Refining World: the refinery
// drones of the Wilderness buildings), Weaver World planet_jobs_trade_produces_mult = +10 % trade from jobs. Hunter World
// (orbital bombardment, army damage) and the build speed bonuses are not modelled; Heart World is a capital designation.
["fortressWorld", "techWorld", "generatorWorld", "miningWorld", "agriWorld", "forgeWorld", "hiveWorld", "hiveWorldFoundry"].forEach((id) => {
  const designation = DESIGNATIONS.find((entry) => entry.id === id);
  designation.requires = [...(designation.requires || []), NOT_WILDERNESS];
});

const DESIGNATIONS_BY_ID = Object.fromEntries(DESIGNATIONS.map((d) => [d.id, d]));

/** ¿Se puede elegir esta designación con el contexto dado (ver requirementContext en planet-sim.js)? */
export function designationAvailable(designation, ctx) {
  return buildingRequirementsMet(designation, ctx);
}

export function getDesignation(id) {
  return id ? DESIGNATIONS_BY_ID[id] || null : null;
}

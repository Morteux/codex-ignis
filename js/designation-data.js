/**
 * Designaciones planetarias, para el desplegable de la pestaña "Planeta".
 *
 * Fuente: página de la Wiki "Designation" (aportada por Morteux). Por cada
 * designación solo se modelan dos tipos de efecto, los que encajan con lo
 * que este simulador ya calcula:
 *  - jobEfficiency: { jobId: fracción }. Multiplica la salida de recursos
 *    de ESE empleo (ver JOB_OUTPUTS en planet-data.js), tal cual la columna
 *    "Effects" de la Wiki lo describe como "+X% <Job> job efficiency".
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

export const DESIGNATIONS = [
  { id: "unificationCenter", i18nKey: "designationUnificationCenter", category: "unity", img: "jobs/job_bureaucrat.png", jobEfficiency: { bureaucrat: 0.15 }, flat: {} },
  { id: "ecclesiasticalCenter", i18nKey: "designationEcclesiasticalCenter", category: "unity", img: "jobs/job_priest.png", jobEfficiency: { priest: 0.15 }, flat: {} },
  { id: "sanctuaryWorld", i18nKey: "designationSanctuaryWorld", category: "unity", img: "resources/Amenities.png", jobEfficiency: {}, flat: {} },
  { id: "tranquilWorld", i18nKey: "designationTranquilWorld", category: "unity", img: "resources/Amenities.png", jobEfficiency: {}, flat: {} },
  { id: "urbanWorld", i18nKey: "designationUrbanWorld", category: "urban", img: "jobs/job_trader.png", jobEfficiency: { trader: 0.15 }, flat: {} },
  { id: "nestWorld", i18nKey: "designationNestWorld", category: "urban", img: "planets/Planet_hive.png", jobEfficiency: {}, flat: {} },
  { id: "machineNexus", i18nKey: "designationMachineNexus", category: "urban", img: "planets/Planet_machine.png", jobEfficiency: {}, flat: {} },
  { id: "weaverWorld", i18nKey: "designationWeaverWorld", category: "urban", img: "jobs/job_livestock.png", jobEfficiency: {}, flat: {} },
  { id: "fortressWorld", i18nKey: "designationFortressWorld", category: "standard", img: "jobs/job_soldier.png", jobEfficiency: { soldier: 0.15 }, flat: {} },
  { id: "techWorld", i18nKey: "designationTechWorld", category: "standard", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15 }, flat: {} },
  { id: "generatorWorld", i18nKey: "designationGeneratorWorld", category: "standard", img: "jobs/job_technician.png", jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "miningWorld", i18nKey: "designationMiningWorld", category: "standard", img: "jobs/job_miner.png", jobEfficiency: { miner: 0.15 }, flat: {} },
  { id: "agriWorld", i18nKey: "designationAgriWorld", category: "standard", img: "jobs/job_farmer.png", jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "forgeWorld", i18nKey: "designationForgeWorld", category: "standard", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "factoryWorld", i18nKey: "designationFactoryWorld", category: "standard", img: "jobs/job_artisan.png", jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "industrialWorld", i18nKey: "designationIndustrialWorld", category: "standard", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "penalColony", i18nKey: "designationPenalColony", category: "specialized", img: "jobs/job_criminal.png", jobEfficiency: {}, flat: {} },
  { id: "resortWorld", i18nKey: "designationResortWorld", category: "specialized", img: "jobs/job_entertainer.png", jobEfficiency: {}, flat: {} },
  { id: "pleasureWorld", i18nKey: "designationPleasureWorld", category: "specialized", img: "jobs/job_entertainer.png", jobEfficiency: {}, flat: {} },
  { id: "thrallWorld", i18nKey: "designationThrallWorld", category: "specialized", img: "resources/Unity.png", jobEfficiency: {}, flat: {} },
  { id: "hiveWorld", i18nKey: "designationHiveWorld", category: "hiveWorld", img: "planets/Planet_hive.png", jobEfficiency: {}, flat: {} },
  { id: "hiveWorldFoundry", i18nKey: "designationHiveWorldFoundry", category: "hiveWorld", img: "jobs/job_foundry.png", jobEfficiency: {}, flat: {} },
  { id: "machineWorldFoundry", i18nKey: "designationMachineWorldFoundry", category: "machineWorld", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "machineWorldFactory", i18nKey: "designationMachineWorldFactory", category: "machineWorld", img: "jobs/job_artisan.png", jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "nanotechWorld", i18nKey: "designationNanotechWorld", category: "machineWorld", img: "planets/Planet_nanite.png", jobEfficiency: {}, flat: {} },
  { id: "photosynthesisWorld", i18nKey: "designationPhotosynthesisWorld", category: "wilderness", img: "jobs/job_technician.png", jobEfficiency: {}, flat: {} },
  { id: "lithicWorld", i18nKey: "designationLithicWorld", category: "wilderness", img: "jobs/job_miner.png", jobEfficiency: {}, flat: {} },
  { id: "pollinatingWorld", i18nKey: "designationPollinatingWorld", category: "wilderness", img: "jobs/job_farmer.png", jobEfficiency: {}, flat: {} },
  { id: "cogitationWorld", i18nKey: "designationCogitationWorld", category: "wilderness", img: "jobs/job_researcher.png", jobEfficiency: {}, flat: {} },
  { id: "crucibleWorld", i18nKey: "designationCrucibleWorld", category: "wilderness", img: "jobs/job_foundry.png", jobEfficiency: {}, flat: {} },
  { id: "hunterWorld", i18nKey: "designationHunterWorld", category: "wilderness", img: "jobs/job_soldier.png", jobEfficiency: {}, flat: {} },
  { id: "refiningWorld", i18nKey: "designationRefiningWorld", category: "wilderness", img: "jobs/job_gas_refiner.png", jobEfficiency: {}, flat: {} },
  { id: "ecumenopolis", i18nKey: "designationEcumenopolis", category: "ecumenopolis", img: "jobs/job_trader.png", jobEfficiency: { trader: 0.15 }, flat: {} },
  { id: "ecumenopolisResearch", i18nKey: "designationEcumenopolisResearch", category: "ecumenopolis", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15 }, flat: {} },
  { id: "ecumenopolisFoundry", i18nKey: "designationEcumenopolisFoundry", category: "ecumenopolis", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "ecumenopolisFactory", i18nKey: "designationEcumenopolisFactory", category: "ecumenopolis", img: "jobs/job_artisan.png", jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "ecumenopolisIndustrial", i18nKey: "designationEcumenopolisIndustrial", category: "ecumenopolis", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "agricultureRingWorld", i18nKey: "designationAgricultureRingWorld", category: "ringWorld", img: "jobs/job_farmer.png", jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "generatorRingWorld", i18nKey: "designationGeneratorRingWorld", category: "ringWorld", img: "jobs/job_technician.png", jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "researchRingWorld", i18nKey: "designationResearchRingWorld", category: "ringWorld", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15 }, flat: {} },
  { id: "commercialRingWorld", i18nKey: "designationCommercialRingWorld", category: "ringWorld", img: "jobs/job_trader.png", jobEfficiency: { trader: 0.15 }, flat: {} },
  { id: "tradeStation", i18nKey: "designationTradeStation", category: "habitat", img: "jobs/job_trader.png", jobEfficiency: { trader: 0.15 }, flat: {} },
  { id: "hydroponicsStation", i18nKey: "designationHydroponicsStation", category: "habitat", img: "jobs/job_farmer.png", jobEfficiency: { farmer: 0.15 }, flat: {} },
  { id: "generatorStation", i18nKey: "designationGeneratorStation", category: "habitat", img: "jobs/job_technician.png", jobEfficiency: { technician: 0.15 }, flat: {} },
  { id: "miningStation", i18nKey: "designationMiningStation", category: "habitat", img: "jobs/job_miner.png", jobEfficiency: { miner: 0.15 }, flat: {} },
  { id: "researchStation", i18nKey: "designationResearchStation", category: "habitat", img: "jobs/job_biologist.png", jobEfficiency: { biologist: 0.15, engineer: 0.15, physicist: 0.15 }, flat: {} },
  { id: "fortressStation", i18nKey: "designationFortressStation", category: "habitat", img: "jobs/job_soldier.png", jobEfficiency: { soldier: 0.15 }, flat: {} },
  { id: "foundryStation", i18nKey: "designationFoundryStation", category: "habitat", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.15 }, flat: {} },
  { id: "factoryStation", i18nKey: "designationFactoryStation", category: "habitat", img: "jobs/job_artisan.png", jobEfficiency: { artisan: 0.15 }, flat: {} },
  { id: "industrialStation", i18nKey: "designationIndustrialStation", category: "habitat", img: "jobs/job_foundry.png", jobEfficiency: { metallurgist: 0.1, artisan: 0.1 }, flat: {} },
  { id: "unificationStation", i18nKey: "designationUnificationStation", category: "habitat", img: "jobs/job_bureaucrat.png", jobEfficiency: { bureaucrat: 0.15 }, flat: {} },
  { id: "ecclesiasticalStation", i18nKey: "designationEcclesiasticalStation", category: "habitat", img: "jobs/job_priest.png", jobEfficiency: { priest: 0.15 }, flat: {} },
  { id: "synapticLathe", i18nKey: "designationSynapticLathe", category: "synapticLathe", img: "planets/Planet_synaptic_lathe.png", jobEfficiency: {}, flat: {} }
];

const DESIGNATIONS_BY_ID = Object.fromEntries(DESIGNATIONS.map((d) => [d.id, d]));

export function getDesignation(id) {
  return id ? DESIGNATIONS_BY_ID[id] || null : null;
}

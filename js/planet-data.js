/**
 * Datos del Simulador de Planetas (planet-sim.html).
 *
 * Fuentes: wiki oficial de Stellaris (Buildings, Resource/Industry/Research/
 * Unity buildings, Jobs, Districts; versión 4.4). No hay números inventados;
 * donde la wiki no da un valor exacto y se usa el valor base estable y bien
 * documentado de la comunidad, se anota junto al dato.
 *
 * ── Sobre la escala ×100 ───────────────────────────────────────────────
 * Los efectos de los edificios (empleos que otorgan, vivienda, comodidades)
 * están guardados aquí TAL CUAL aparecen en la wiki: como enteros ×100
 * (p. ej. "+200 Metalúrgicos" se guarda como 200, no como 2). Esto es a
 * propósito, para poder copiar y pegar los números directamente de la wiki
 * al añadir edificios nuevos sin tener que hacer la división mentalmente.
 * La división por 100 se hace en un único sitio (EFFECT_SCALE / divideEffect)
 * y se aplica siempre en el momento de calcular o mostrar, nunca al guardar
 * los datos.
 * El mantenimiento (upkeep) y el coste de construcción NO usan esta escala:
 * en la wiki ya aparecen como números normales (p. ej. "-2 energía" es -2,
 * no -200), así que se guardan tal cual.
 *
 * ── Origen de las imágenes ─────────────────────────────────────────────
 * Igual que en el bingo (ver js/bingo-data.js), las imágenes se sirven desde
 * la API de assets de Stellaris (https://morteux.github.io/StellarisAssets/).
 * Las rutas de aquí se han verificado contra el árbol de esa API: las
 * carpetas "buildings/" y "jobs/" usan nombres en minúsculas
 * (p. ej. "building_precinct_house.png", "job_technician.png"), mientras que
 * "resources/" usa mayúscula inicial (p. ej. "Energy.png", "Alloys.png").
 */
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

export const IMAGE_BASE = STELLARIS_ASSETS_BASE;

/** Los efectos de edificio (empleos, vivienda, comodidades) se guardan ×100; se dividen aquí, en un único sitio. */
export const EFFECT_SCALE = 100;
export function divideEffect(rawAmount) {
  return rawAmount / EFFECT_SCALE;
}

/**
 * Reglas reales de ranuras de edificios de una colonia:
 * - 6 ranuras base en el distrito principal (una de ellas la ocupa siempre
 *   el edificio capital, ver CAPITAL_TIERS).
 * - El distrito urbano tiene 2 especializaciones independientes (ver
 *   DISTRICTS.urban.specializationOptions); cada una que se elija añade 3
 *   ranuras más. Construir copias del distrito urbano NO añade ranuras: solo
 *   escala los empleos de las especializaciones ya elegidas (ver
 *   computeTotals en planet-sim.js).
 * - Cada categoría de distrito de recursos básicos (generador/minería/
 *   agricultura) que tenga una especialización con ranuras elegida añade
 *   3 ranuras más (una vez por categoría, no por copia de distrito).
 * - Tope real de 21 ranuras de edificios por colonia, venga de donde venga
 *   el resto de ranuras.
 */
export const BUILDING_SLOT_RULES = {
  base: 6,
  perExtraGroup: 3,
  max: 21
};

/** specializedUrbanSlots: nº de las 2 especializaciones del distrito urbano ya elegidas (0-2). specializedResourceCategories: nº de categorías (generador/minería/agricultura) con especialización elegida. */
export function calculateBuildingSlots(specializedUrbanSlots, specializedResourceCategories) {
  const urban = Math.max(0, Math.min(2, specializedUrbanSlots | 0));
  const specialized = Math.max(0, Math.min(3, specializedResourceCategories | 0));
  const raw = BUILDING_SLOT_RULES.base + (urban + specialized) * BUILDING_SLOT_RULES.perExtraGroup;
  return Math.min(BUILDING_SLOT_RULES.max, raw);
}

/**
 * Edificio capital: SIEMPRE presente, ocupa la primera ranura del distrito
 * principal, nunca se puede demoler ni desactivar — solo mejorar o degradar
 * de nivel. Datos reales de la wiki (página "Capital building", set
 * "estándar"/individualista). Simplificación de esta versión: no se
 * modelan los empleos secundarios de cada nivel (Robotista, Noble,
 * Animador, Trabajador médico/cultural), solo vivienda, comodidades,
 * Político y Agente.
 */
export const CAPITAL_TIERS = [
  {
    id: "colony_shelter",
    img: "buildings/building_colony_shelter.png",
    i18nKey: "buildingColonyShelter",
    housing: 300,
    amenities: 300,
    jobs: {}
  },
  {
    id: "planetary_administration",
    img: "buildings/building_capital.png",
    i18nKey: "buildingPlanetaryAdministration",
    housing: 1000,
    amenities: 1000,
    jobs: { politician: 200, enforcer: 100 }
  },
  {
    id: "planetary_capital",
    img: "buildings/building_major_capital.png",
    i18nKey: "buildingPlanetaryCapital",
    housing: 1500,
    amenities: 1500,
    jobs: { politician: 300, enforcer: 200 }
  },
  {
    id: "system_capital_complex",
    img: "buildings/building_system_capital.png",
    i18nKey: "buildingSystemCapitalComplex",
    housing: 2000,
    amenities: 2000,
    jobs: { politician: 400, enforcer: 300 }
  },
  {
    id: "imperial_palace",
    img: "buildings/building_palace.png",
    i18nKey: "buildingImperialPalace",
    housing: 3000,
    amenities: 3000,
    jobs: { politician: 600, enforcer: 500 }
  }
];

/**
 * Distritos. Cada categoría de recurso básico (generador/minería/
 * agricultura) da un empleo base por copia del distrito (real, confirmado
 * en la wiki: página Districts), y puede especializarse UNA vez por
 * categoría (no por copia) en la opción más sencilla y mejor documentada de
 * la wiki (página "District specialization"): añade 3 ranuras de edificio y
 * un empleo extra por copia de distrito. El distrito urbano siempre da 3
 * ranuras por copia y no se modela con empleos propios en esta versión
 * (simplificación: se ignoran sus propias especializaciones, como Mixed
 * Industry, que darían empleos de fábrica/fundición en vez de ranuras).
 */
export const DISTRICTS = {
  /**
   * Distrito urbano: construir copias NO da ranuras de edificio ni empleos
   * por sí solo. Tiene 2 especializaciones independientes
   * (specializationSlots); cada una que se elija desbloquea 3 ranuras de
   * edificio (slotsPerSpecialization) y aporta sus empleos multiplicados
   * por el número de copias de distrito urbano construidas.
   * specializationOptions: las 5 especializaciones de distrito urbano
   * confirmadas en la wiki (página "District specialization") que no
   * requieren un origen o mundo especial (Mixed/Heavy/Civilian Industry,
   * Military Defenses, Commercial Nexus); se ha omitido la penalización de
   * -200 vivienda por copia que indica la wiki, igual que ya se simplifica
   * en las especializaciones de recursos de abajo.
   */
  urban: {
    i18nKey: "districtUrban",
    img: "districs/district_city.png",
    jobs: {},
    specializationSlots: 2,
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "mixedIndustry",
        i18nKey: "specializationMixedIndustry",
        img: "districts_specialization/District_specialization_industrial.png",
        jobs: { metallurgist: 50, artisan: 50 }
      },
      {
        id: "heavyIndustry",
        i18nKey: "specializationHeavyIndustry",
        img: "districts_specialization/District_specialization_foundry.png",
        jobs: { metallurgist: 100 }
      },
      {
        id: "civilianIndustry",
        i18nKey: "specializationCivilianIndustry",
        img: "districts_specialization/District_specialization_factory.png",
        jobs: { artisan: 100 }
      },
      {
        id: "militaryDefenses",
        i18nKey: "specializationMilitaryDefenses",
        img: "districts_specialization/District_specialization_fortress.png",
        jobs: { soldier: 100 }
      },
      {
        id: "commercialNexus",
        i18nKey: "specializationCommercialNexus",
        img: "districts_specialization/District_specialization_trade.png",
        jobs: { trader: 100 }
      }
    ]
  },
  generator: {
    i18nKey: "districtGenerator",
    img: "districs/district_generator.png",
    jobs: { technician: 200 },
    specialization: {
      i18nKey: "specializationEnergyGeneration",
      techI18nKey: "specializationRequiresEnergy",
      img: "districts_specialization/District_specialization_energy.png",
      jobs: { technician: 100 },
      slots: 3
    }
  },
  mining: {
    i18nKey: "districtMining",
    img: "districs/district_mining.png",
    jobs: { miner: 200 },
    specialization: {
      i18nKey: "specializationMineralExtraction",
      techI18nKey: "specializationRequiresMinerals",
      img: "districts_specialization/District_specialization_minerals.png",
      jobs: { miner: 100 },
      slots: 3
    }
  },
  agriculture: {
    i18nKey: "districtAgriculture",
    img: "districs/district_farming.png",
    jobs: { farmer: 200 },
    specialization: {
      i18nKey: "specializationAgriculturalFocus",
      techI18nKey: "specializationRequiresFood",
      img: "districts_specialization/District_specialization_food.png",
      jobs: { farmer: 100 },
      slots: 3
    }
  }
};

export const RESOURCE_DISTRICT_ORDER = ["generator", "mining", "agriculture"];

/** Diccionario de recursos: id -> { i18nKey, img (dentro de resources/) }. */
export const RESOURCES = {
  energy: { i18nKey: "resourceEnergy", img: "resources/Energy.png" },
  minerals: { i18nKey: "resourceMinerals", img: "resources/Minerals.png" },
  food: { i18nKey: "resourceFood", img: "resources/Food.png" },
  alloys: { i18nKey: "resourceAlloys", img: "resources/Alloys.png" },
  consumer_goods: { i18nKey: "resourceConsumerGoods", img: "resources/Consumer_goods.png" },
  unity: { i18nKey: "resourceUnity", img: "resources/Unity.png" },

  physics: { i18nKey: "resourcePhysics", img: "resources/Physics_research.png" },
  society: { i18nKey: "resourceSociety", img: "resources/Society_research.png" },
  engineering: { i18nKey: "resourceEngineering", img: "resources/Engineering_research.png" },
  amenities: { i18nKey: "resourceAmenities", img: "resources/Amenities.png" },
  trade: { i18nKey: "resourceTrade", img: "resources/Trade.png" }
};

/** Diccionario de empleos: id -> { i18nKey, img (dentro de jobs/) }. */
export const JOBS = {
  technician: { i18nKey: "jobTechnician", img: "jobs/job_technician.png" },
  miner: { i18nKey: "jobMiner", img: "jobs/job_miner.png" },
  farmer: { i18nKey: "jobFarmer", img: "jobs/job_farmer.png" },
  metallurgist: { i18nKey: "jobMetallurgist", img: "jobs/job_foundry.png" },
  artisan: { i18nKey: "jobArtisan", img: "jobs/job_artisan.png" },
  enforcer: { i18nKey: "jobEnforcer", img: "jobs/job_enforcer.png" },
  educator: { i18nKey: "jobEducator", img: "jobs/job_educator.png" },
  soldier: { i18nKey: "jobSoldier", img: "jobs/job_soldier.png" },
  trader: { i18nKey: "jobTrader", img: "jobs/job_trader.png" },
  entertainer: { i18nKey: "jobEntertainer", img: "jobs/job_entertainer.png" },
  physicist: { i18nKey: "jobPhysicist", img: "jobs/job_physicist.png" },
  engineer: { i18nKey: "jobEngineer", img: "jobs/job_engineer.png" },
  biologist: { i18nKey: "jobBiologist", img: "jobs/job_biologist.png" },
  priest: { i18nKey: "jobPriest", img: "jobs/job_priest.png" },
  bureaucrat: { i18nKey: "jobBureaucrat", img: "jobs/job_bureaucrat.png" },
  politician: { i18nKey: "jobPolitician", img: "jobs/job_politician.png" }
};

/**
 * Salida de recursos BASE de cada empleo (un pop trabajándolo), en números
 * normales (sin escala ×100, porque la wiki los da ya así en la página
 * "Jobs"). Fuente y confianza de cada uno:
 *  - technician (+6 energía) y miner (+4 minerales): confirmados
 *    directamente en la wiki (tabla "Basic resource jobs").
 *  - farmer (+4 comida): mismo patrón que miner, ambos son el "recurso
 *    básico" del early game; valor estable desde hace muchas versiones.
 *  - metallurgist (+2 aleaciones, -1 mineral) y artisan (+2 bienes de
 *    consumo, -1 mineral): valores base estables de estos dos empleos
 *    (los edificios de nivel 2/3 SÍ están confirmados exactamente en la
 *    wiki, ver jobs de metallurgist/artisan en BUILDINGS más abajo).
 *  - physicist/engineer/biologist (+4 investigación de su tipo),
 *    entertainer (+4 comodidades), trader (+2 comercio), priest y
 *    bureaucrat (+2 cohesión): valores base estables y ampliamente
 *    documentados por la comunidad.
 *  - enforcer, educator y soldier no producen un recurso de los que se
 *    trackean aquí (reducen delincuencia, mejoran estabilidad o generan
 *    ejércitos de defensa respectivamente), así que no suman a los
 *    totales de recursos; ver "effectNote".
 * Si algún número no encaja con lo que ves en partida, es la primera
 * tabla a revisar y ajustar.
 */
export const JOB_OUTPUTS = {
  technician: { energy: 6 },
  miner: { minerals: 4 },
  farmer: { food: 4 },
  metallurgist: { alloys: 2, minerals: -1 },
  artisan: { consumer_goods: 2, minerals: -1 },
  physicist: { physics: 4 },
  engineer: { engineering: 4 },
  biologist: { society: 4 },
  entertainer: { amenities: 4 },
  trader: { trade: 2 },
  priest: { unity: 2 },
  bureaucrat: { unity: 2 },
  politician: { unity: 2 },
  enforcer: {},
  educator: {},
  soldier: {}
};

/** Efecto no numérico de los empleos que no producen un recurso trackeado. */
export const JOB_EFFECT_NOTES = {
  enforcer: "jobEffectEnforcer",
  educator: "jobEffectEducator",
  soldier: "jobEffectSoldier"
};

/**
 * Catálogo de edificios.
 *
 * - jobs: { jobId: cantidad ×100 } tal cual la wiki (ver nota de escala
 *   arriba). Una copia del edificio aporta esa cantidad / 100 de cada
 *   empleo.
 * - upkeep: { resourceId: cantidad } mantenimiento POR COPIA, en números
 *   normales (negativo = consumo). Viene directo de la wiki.
 * - housing / amenities: ×100 igual que los empleos.
 * - colonyLimit: "none" (sin límite) o 1 (máximo una copia, normalmente
 *   por pertenecer a una cadena de mejora).
 * - cost: texto informativo de coste de construcción (no se simula el
 *   almacén de recursos todavía, solo se muestra como referencia).
 */
export const BUILDINGS = [
  // ── Recursos básicos (sin límite por colonia) ──────────────────────
  {
    id: "voltaic_yard",
    img: "buildings/building_generator_generic.png",
    i18nKey: "buildingVoltaicYard",
    category: "resource",
    jobs: { technician: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "quarry_depot",
    img: "buildings/building_mine_generic.png",
    i18nKey: "buildingQuarryDepot",
    category: "resource",
    jobs: { miner: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado)"
  },
  {
    id: "hydroponics_farm",
    img: "buildings/building_hydroponics_farm.png",
    i18nKey: "buildingHydroponicsFarm",
    category: "resource",
    jobs: { farmer: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Fundición: aleaciones (sin límite por colonia) ─────────────────
  {
    id: "alloy_foundries",
    img: "buildings/building_foundry_1.png",
    i18nKey: "buildingAlloyFoundries",
    category: "foundry",
    tier: 1,
    jobs: { metallurgist: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "alloy_mega_forges",
    img: "buildings/building_foundry_2.png",
    i18nKey: "buildingAlloyMegaForges",
    category: "foundry",
    tier: 2,
    upgradesFrom: "alloy_foundries",
    jobs: { metallurgist: 400 },
    // Confirmado en la wiki (Jobs#Metallurgist): esta mejora añade +1 Aleación / -2 Minerales por Metalúrgico.
    jobBonus: { alloys: 1, minerals: -2 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -2 },
    cost: "480 minerales (600 si está asentado, 100 aleaciones)"
  },
  {
    id: "alloy_nano_plants",
    img: "buildings/building_foundry_3.png",
    i18nKey: "buildingAlloyNanoPlants",
    category: "foundry",
    tier: 3,
    upgradesFrom: "alloy_mega_forges",
    jobs: { metallurgist: 600 },
    // Confirmado en la wiki (Jobs#Metallurgist): +2 Aleaciones / -4 Minerales por Metalúrgico.
    jobBonus: { alloys: 2, minerals: -4 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -4 },
    cost: "480 minerales (800 si está asentado, 200 aleaciones)"
  },

  // ── Fábrica: bienes de consumo (sin límite por colonia) ────────────
  {
    id: "civilian_industries",
    img: "buildings/building_factory_1.png",
    i18nKey: "buildingCivilianIndustries",
    category: "factory",
    tier: 1,
    jobs: { artisan: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "civilian_fabricators",
    img: "buildings/building_factory_2.png",
    i18nKey: "buildingCivilianFabricators",
    category: "factory",
    tier: 2,
    upgradesFrom: "civilian_industries",
    jobs: { artisan: 400 },
    // Confirmado en la wiki (Jobs#Artisan): +1 Bien de consumo / -1 Mineral por Artesano.
    jobBonus: { consumer_goods: 1, minerals: -1 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -2 },
    cost: "480 minerales (600 si está asentado, 100 aleaciones)"
  },
  {
    id: "civilian_repli_complexes",
    img: "buildings/building_factory_3.png",
    i18nKey: "buildingCivilianRepliComplexes",
    category: "factory",
    tier: 3,
    upgradesFrom: "civilian_fabricators",
    jobs: { artisan: 600 },
    // Confirmado en la wiki (Jobs#Artisan): +2 Bienes de consumo / -2 Minerales por Artesano.
    jobBonus: { consumer_goods: 2, minerals: -2 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -4 },
    cost: "600 minerales (800 si está asentado, 200 aleaciones)"
  },

  // ── Investigación genérica (sin límite por colonia) ────────────────
  {
    id: "research_labs",
    img: "buildings/building_research_lab_1.png",
    i18nKey: "buildingResearchLabs",
    category: "research",
    tier: 1,
    jobs: { physicist: 60, engineer: 60, biologist: 60 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "research_complexes",
    img: "buildings/building_research_lab_2.png",
    i18nKey: "buildingResearchComplexes",
    category: "research",
    tier: 2,
    upgradesFrom: "research_labs",
    jobs: { physicist: 120, engineer: 120, biologist: 120 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "advanced_research_complexes",
    img: "buildings/building_research_lab_3.png",
    i18nKey: "buildingAdvancedResearchComplexes",
    category: "research",
    tier: 3,
    upgradesFrom: "research_complexes",
    jobs: { physicist: 180, engineer: 180, biologist: 180 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -2 },
    cost: "600 minerales (800 si está asentado, 100 aleaciones)"
  },

  // ── Administración civil (una por línea de mejora) ─────────────────
  {
    id: "precinct_houses",
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingPrecinctHouses",
    category: "civic",
    tier: 1,
    jobs: { enforcer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "hall_of_judgment",
    img: "buildings/building_hall_judgment.png",
    i18nKey: "buildingHallOfJudgment",
    category: "civic",
    tier: 2,
    upgradesFrom: "precinct_houses",
    jobs: { enforcer: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "state_academy",
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingStateAcademy",
    category: "civic",
    tier: 1,
    jobs: { educator: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "center_of_guidance",
    img: "buildings/building_center_of_guidance.png",
    i18nKey: "buildingCenterOfGuidance",
    category: "civic",
    tier: 2,
    upgradesFrom: "state_academy",
    jobs: { educator: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "administrative_offices",
    img: "buildings/building_bureaucratic_1.png",
    i18nKey: "buildingAdministrativeOffices",
    category: "civic",
    jobs: { bureaucrat: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Militares ───────────────────────────────────────────────────────
  {
    id: "stronghold",
    img: "buildings/building_stronghold.png",
    i18nKey: "buildingStronghold",
    category: "military",
    tier: 1,
    jobs: { soldier: 200 },
    colonyLimit: 1,
    upkeep: { minerals: -1 },
    cost: "240 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "fortress",
    img: "buildings/building_fortress.png",
    i18nKey: "buildingFortress",
    category: "military",
    tier: 2,
    upgradesFrom: "stronghold",
    jobs: { soldier: 400 },
    colonyLimit: 1,
    upkeep: { minerals: -1, alloys: -1 },
    cost: "360 minerales (600 si está asentado, 50 aleaciones)"
  },

  // ── Otros ───────────────────────────────────────────────────────────
  {
    id: "commercial_zones",
    img: "buildings/building_commercial_zone.png",
    i18nKey: "buildingCommercialZones",
    category: "other",
    jobs: { trader: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "holo_theatres",
    img: "buildings/building_holo_theatres.png",
    i18nKey: "buildingHoloTheatres",
    category: "other",
    jobs: { entertainer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Vivienda (sin empleos: vivienda y comodidades, ambos ×100) ─────
  {
    id: "luxury_residences",
    img: "buildings/building_luxury_residence.png",
    i18nKey: "buildingLuxuryResidences",
    category: "housing",
    tier: 1,
    jobs: {},
    housing: 1500,
    amenities: 1500,
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "paradise_domes",
    img: "buildings/building_paradise_dome.png",
    i18nKey: "buildingParadiseDomes",
    category: "housing",
    tier: 2,
    upgradesFrom: "luxury_residences",
    jobs: {},
    housing: 3000,
    amenities: 3000,
    colonyLimit: 1,
    upkeep: { energy: -3, alloys: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },

  // ── Cohesión (unity) ────────────────────────────────────────────────
  {
    id: "temple",
    img: "buildings/building_temple.png",
    i18nKey: "buildingTemple",
    category: "unity",
    jobs: { priest: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  }
];

export const CATEGORY_ORDER = [
  "resource",
  "foundry",
  "factory",
  "research",
  "civic",
  "military",
  "other",
  "housing",
  "unity"
];

export const CATEGORY_I18N_KEYS = {
  resource: "planetSimCategoryResource",
  foundry: "planetSimCategoryFoundry",
  factory: "planetSimCategoryFactory",
  research: "planetSimCategoryResearch",
  civic: "planetSimCategoryCivic",
  military: "planetSimCategoryMilitary",
  other: "planetSimCategoryOther",
  housing: "planetSimCategoryHousing",
  unity: "planetSimCategoryUnity"
};

/**
 * Datos del Simulador de Planetas (planet-sim.html).
 *
 * Primera versión: solo cubre edificios y los empleos que aportan, respetando
 * el límite real de ranuras de edificios de una colonia. Los números de
 * empleos, mantenimiento y coste están sacados de la wiki oficial de
 * Stellaris (páginas Buildings, Resource buildings, Industry buildings,
 * Research buildings, Unity buildings; versión 4.4), no son inventados.
 *
 * Nota sobre las ranuras de edificios: en la versión actual del juego, cada
 * colonia empieza con 6 ranuras en su distrito principal, y cada
 * especialización de distrito con ranuras (minería, energía o agricultura
 * especializadas, investigación, etc.) añade 3 ranuras más, hasta un máximo
 * de 21 por colonia. El sistema completo de especializaciones de distrito
 * (con sus propios sets de edificios) es mucho más complejo y se dejará para
 * una futura versión; de momento, el simulador solo pide cuántas
 * especializaciones con ranuras tiene la colonia y calcula el total con esa
 * fórmula real (6 + 3 × especializaciones, tope 21).
 *
 * ── Origen de las imágenes ─────────────────────────────────────────────
 * Igual que en el bingo (ver js/bingo-data.js), las imágenes se sirven desde
 * la API de assets de Stellaris (https://morteux.github.io/StellarisAssets/),
 * nunca en local. Los nombres de archivo usados aquí son los mismos que la
 * wiki oficial usa para cada edificio/empleo. Cuando se enlacen las imágenes
 * definitivamente, solo hay que revisar que esas rutas existan en la API; no
 * hace falta tocar nada más de este archivo.
 */
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

export const IMAGE_BASE = STELLARIS_ASSETS_BASE;

/** Reglas reales de ranuras de edificios de una colonia (ver nota arriba). */
export const BUILDING_SLOT_RULES = {
  base: 6,
  perSpecialization: 3,
  max: 21,
  maxSpecializations: 5 // (21 - 6) / 3
};

export function calculateBuildingSlots(specializations) {
  const clamped = Math.max(0, Math.min(BUILDING_SLOT_RULES.maxSpecializations, specializations | 0));
  return Math.min(BUILDING_SLOT_RULES.max, BUILDING_SLOT_RULES.base + clamped * BUILDING_SLOT_RULES.perSpecialization);
}

/** Diccionario de empleos: id -> { i18nKey, img }. */
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
  bureaucrat: { i18nKey: "jobBureaucrat", img: "jobs/job_bureaucrat.png" }
};

/**
 * Catálogo de edificios.
 *
 * - jobs: { jobId: cantidad } que aporta UNA copia del edificio (cantidades
 *   reales de la wiki; los laboratorios de investigación genéricos dan
 *   cantidades con decimales porque son más débiles que los laboratorios
 *   especializados de física/sociedad/ingeniería, que se añadirán más
 *   adelante).
 * - housing / amenities: vivienda y comodidades que aporta una copia.
 * - colonyLimit: "none" (sin límite, se puede repetir) o 1 (máximo una copia
 *   por colonia, normalmente porque forma parte de una cadena de mejora).
 * - upkeep / cost: texto informativo tal cual aparece en la wiki (no se
 *   simula la economía de recursos todavía, solo se muestra como referencia).
 */
export const BUILDINGS = [
  // ── Recursos básicos (sin límite por colonia) ──────────────────────
  {
    id: "voltaic_yard",
    img: "buildings/building_generator_generic.png",
    i18nKey: "buildingVoltaicYard",
    category: "resource",
    jobs: { technician: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "quarry_depot",
    img: "buildings/building_mine_generic.png",
    i18nKey: "buildingQuarryDepot",
    category: "resource",
    jobs: { miner: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado)"
  },
  {
    id: "hydroponics_farm",
    img: "buildings/building_hydroponics_farm.png",
    i18nKey: "buildingHydroponicsFarm",
    category: "resource",
    jobs: { farmer: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Fundición: aleaciones (sin límite por colonia) ─────────────────
  {
    id: "alloy_foundries",
    img: "buildings/building_foundry_1.png",
    i18nKey: "buildingAlloyFoundries",
    category: "foundry",
    tier: 1,
    jobs: { metallurgist: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "alloy_mega_forges",
    img: "buildings/building_foundry_2.png",
    i18nKey: "buildingAlloyMegaForges",
    category: "foundry",
    tier: 2,
    upgradesFrom: "alloy_foundries",
    jobs: { metallurgist: 4 },
    colonyLimit: "none",
    upkeep: "−5 energía, −2 minerales",
    cost: "480 minerales (600 si está asentado, 100 aleaciones)"
  },
  {
    id: "alloy_nano_plants",
    img: "buildings/building_foundry_3.png",
    i18nKey: "buildingAlloyNanoPlants",
    category: "foundry",
    tier: 3,
    upgradesFrom: "alloy_mega_forges",
    jobs: { metallurgist: 6 },
    colonyLimit: "none",
    upkeep: "−8 energía, −4 minerales",
    cost: "480 minerales (800 si está asentado, 200 aleaciones)"
  },

  // ── Fábrica: bienes de consumo (sin límite por colonia) ────────────
  {
    id: "civilian_industries",
    img: "buildings/building_factory_1.png",
    i18nKey: "buildingCivilianIndustries",
    category: "factory",
    tier: 1,
    jobs: { artisan: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "civilian_fabricators",
    img: "buildings/building_factory_2.png",
    i18nKey: "buildingCivilianFabricators",
    category: "factory",
    tier: 2,
    upgradesFrom: "civilian_industries",
    jobs: { artisan: 4 },
    colonyLimit: "none",
    upkeep: "−5 energía, −2 minerales",
    cost: "480 minerales (600 si está asentado, 100 aleaciones)"
  },
  {
    id: "civilian_repli_complexes",
    img: "buildings/building_factory_3.png",
    i18nKey: "buildingCivilianRepliComplexes",
    category: "factory",
    tier: 3,
    upgradesFrom: "civilian_fabricators",
    jobs: { artisan: 6 },
    colonyLimit: "none",
    upkeep: "−8 energía, −4 minerales",
    cost: "600 minerales (800 si está asentado, 200 aleaciones)"
  },

  // ── Investigación genérica (sin límite por colonia) ────────────────
  {
    id: "research_labs",
    img: "buildings/building_research_lab_1.png",
    i18nKey: "buildingResearchLabs",
    category: "research",
    tier: 1,
    jobs: { physicist: 0.6, engineer: 0.6, biologist: 0.6 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "research_complexes",
    img: "buildings/building_research_lab_2.png",
    i18nKey: "buildingResearchComplexes",
    category: "research",
    tier: 2,
    upgradesFrom: "research_labs",
    jobs: { physicist: 1.2, engineer: 1.2, biologist: 1.2 },
    colonyLimit: "none",
    upkeep: "−5 energía, −1 mineral",
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "advanced_research_complexes",
    img: "buildings/building_research_lab_3.png",
    i18nKey: "buildingAdvancedResearchComplexes",
    category: "research",
    tier: 3,
    upgradesFrom: "research_complexes",
    jobs: { physicist: 1.8, engineer: 1.8, biologist: 1.8 },
    colonyLimit: "none",
    upkeep: "−8 energía, −2 minerales",
    cost: "600 minerales (800 si está asentado, 100 aleaciones)"
  },

  // ── Administración civil (una por línea de mejora) ─────────────────
  {
    id: "precinct_houses",
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingPrecinctHouses",
    category: "civic",
    tier: 1,
    jobs: { enforcer: 2 },
    colonyLimit: 1,
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "hall_of_judgment",
    img: "buildings/building_hall_judgment.png",
    i18nKey: "buildingHallOfJudgment",
    category: "civic",
    tier: 2,
    upgradesFrom: "precinct_houses",
    jobs: { enforcer: 5 },
    colonyLimit: 1,
    upkeep: "−2 energía, −1 mineral",
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "state_academy",
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingStateAcademy",
    category: "civic",
    tier: 1,
    jobs: { educator: 2 },
    colonyLimit: 1,
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "center_of_guidance",
    img: "buildings/building_center_of_guidance.png",
    i18nKey: "buildingCenterOfGuidance",
    category: "civic",
    tier: 2,
    upgradesFrom: "state_academy",
    jobs: { educator: 5 },
    colonyLimit: 1,
    upkeep: "−2 energía, −1 mineral",
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },
  {
    id: "administrative_offices",
    img: "buildings/building_bureaucratic_1.png",
    i18nKey: "buildingAdministrativeOffices",
    category: "civic",
    jobs: { bureaucrat: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Militares ───────────────────────────────────────────────────────
  {
    id: "stronghold",
    img: "buildings/building_stronghold.png",
    i18nKey: "buildingStronghold",
    category: "military",
    tier: 1,
    jobs: { soldier: 2 },
    colonyLimit: 1,
    upkeep: "−1 mineral",
    cost: "240 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "fortress",
    img: "buildings/building_fortress.png",
    i18nKey: "buildingFortress",
    category: "military",
    tier: 2,
    upgradesFrom: "stronghold",
    jobs: { soldier: 4 },
    colonyLimit: 1,
    upkeep: "−1 mineral, −1 aleación",
    cost: "360 minerales (600 si está asentado, 50 aleaciones)"
  },

  // ── Otros ───────────────────────────────────────────────────────────
  {
    id: "commercial_zones",
    img: "buildings/building_commercial_zone.png",
    i18nKey: "buildingCommercialZones",
    category: "other",
    jobs: { trader: 2 },
    colonyLimit: 1,
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },
  {
    id: "holo_theatres",
    img: "buildings/building_holo_theatres.png",
    i18nKey: "buildingHoloTheatres",
    category: "other",
    jobs: { entertainer: 2 },
    colonyLimit: 1,
    upkeep: "−2 energía",
    cost: "360 minerales (400 si está asentado / 40 si es nómada)"
  },

  // ── Vivienda (sin empleos: vivienda y comodidades) ─────────────────
  {
    id: "luxury_residences",
    img: "buildings/building_luxury_residence.png",
    i18nKey: "buildingLuxuryResidences",
    category: "housing",
    tier: 1,
    jobs: {},
    housing: 15,
    amenities: 15,
    colonyLimit: 1,
    upkeep: "−2 energía",
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
    housing: 30,
    amenities: 30,
    colonyLimit: 1,
    upkeep: "−3 energía, −1 aleación",
    cost: "480 minerales (600 si está asentado, 50 aleaciones)"
  },

  // ── Cohesión (unity) ────────────────────────────────────────────────
  {
    id: "temple",
    img: "buildings/building_temple.png",
    i18nKey: "buildingTemple",
    category: "unity",
    jobs: { priest: 2 },
    colonyLimit: "none",
    upkeep: "−2 energía",
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

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
   * en las especializaciones de recursos de abajo. permittedSets: los
   * "building sets" (página "Buildings" de la wiki, sección "Building
   * sets", y confirmados building a building en las páginas "Industry
   * buildings" y "Buildings") que esa especialización permite construir en
   * sus 3 ranuras — ver BUILDINGS más abajo, campo "sets" de cada edificio.
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
        jobs: { metallurgist: 50, artisan: 50 },
        permittedSets: ["industrial"]
      },
      {
        id: "heavyIndustry",
        i18nKey: "specializationHeavyIndustry",
        img: "districts_specialization/District_specialization_foundry.png",
        jobs: { metallurgist: 100 },
        permittedSets: ["foundry"]
      },
      {
        id: "civilianIndustry",
        i18nKey: "specializationCivilianIndustry",
        img: "districts_specialization/District_specialization_factory.png",
        jobs: { artisan: 100 },
        permittedSets: ["factory"]
      },
      {
        id: "militaryDefenses",
        i18nKey: "specializationMilitaryDefenses",
        img: "districts_specialization/District_specialization_fortress.png",
        jobs: { soldier: 100 },
        permittedSets: ["fortress"]
      },
      {
        id: "commercialNexus",
        i18nKey: "specializationCommercialNexus",
        img: "districts_specialization/District_specialization_trade.png",
        jobs: { trader: 100 },
        permittedSets: ["trade"]
      }
    ]
  },
  /**
   * Distritos de recursos básicos: a diferencia del distrito urbano, cada
   * uno tiene UNA sola ranura de especialización (no dos), pero ahora con
   * varias especializaciones distintas para elegir (specializationOptions),
   * igual que el urbano. slotsPerSpecialization: cuántas ranuras de
   * edificio desbloquea, sea cual sea la opción elegida. lockedTooltipKey:
   * texto del hueco bloqueado mientras no se ha elegido ninguna.
   *
   * Especializaciones confirmadas en la wiki (página "District
   * specialization", tablas "Generator/Mining/Agriculture
   * specializations"). Se han omitido las que necesitan un empleo o
   * recurso que este simulador no modela todavía (Mote Harvester, Crystal
   * Miner, Gas Extractor, Grubsymbiont, Angler, Pearl Diver, Photosymbiont,
   * Pollinosymbiont) o que "convierten" el empleo base del distrito en otro
   * (mecánica de swap, p. ej. Volatile Motes Harvesting o Rare Crystal
   * Extraction), ya que no encajan en el modelo actual de empleos
   * puramente aditivos. También se omite el efecto extra de conversión de
   * recursos de Gravitonic Mines (-1 Mineral／+0.5 Física por cada 100
   * Mineros), igual que ya se simplifica la penalización de -200 vivienda
   * en otras especializaciones: solo se modela el reparto de empleos.
   */
  generator: {
    i18nKey: "districtGenerator",
    img: "districs/district_generator.png",
    jobs: { technician: 200 },
    lockedTooltipKey: "specializationRequiresEnergy",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "energyGeneration",
        i18nKey: "specializationEnergyGeneration",
        img: "districts_specialization/District_specialization_energy.png",
        jobs: { technician: 100 },
        permittedSets: ["energy"]
      },
      {
        id: "solarFarmingBays",
        i18nKey: "specializationSolarFarmingBays",
        img: "districts_specialization/District_specialization_food.png",
        jobs: { farmer: 100 },
        permittedSets: ["energy", "food"]
      }
    ]
  },
  mining: {
    i18nKey: "districtMining",
    img: "districs/district_mining.png",
    jobs: { miner: 200 },
    lockedTooltipKey: "specializationRequiresMinerals",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "mineralExtraction",
        i18nKey: "specializationMineralExtraction",
        img: "districts_specialization/District_specialization_minerals.png",
        jobs: { miner: 100 },
        permittedSets: ["minerals"]
      },
      {
        id: "subterraneanUrbanization",
        i18nKey: "specializationSubterraneanUrbanization",
        img: "districts_specialization/District_specialization_minerals.png",
        jobs: { miner: 50, trader: 50 },
        permittedSets: ["minerals", "origin"]
      },
      {
        id: "gravitonicMines",
        i18nKey: "specializationGravitonicMines",
        img: "districts_specialization/District_specialization_minerals.png",
        jobs: { miner: 50, physicist: 50 },
        permittedSets: ["minerals"]
      }
    ]
  },
  agriculture: {
    i18nKey: "districtAgriculture",
    img: "districs/district_farming.png",
    jobs: { farmer: 200 },
    lockedTooltipKey: "specializationRequiresFood",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "agriculturalFocus",
        i18nKey: "specializationAgriculturalFocus",
        img: "districts_specialization/District_specialization_food.png",
        jobs: { farmer: 100 },
        permittedSets: ["food"]
      },
      {
        id: "agrarianVillages",
        i18nKey: "specializationAgrarianVillages",
        img: "districts_specialization/District_specialization_food.png",
        jobs: { farmer: 75, trader: 75 },
        permittedSets: ["food", "origin"]
      },
      {
        id: "coastalHamlets",
        i18nKey: "specializationCoastalHamlets",
        img: "districts_specialization/District_specialization_food.png",
        jobs: { farmer: 50, artisan: 50, trader: 50 },
        permittedSets: ["food", "origin"]
      }
    ]
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
  trade: { i18nKey: "resourceTrade", img: "resources/Trade.png" },
  influence: { i18nKey: "resourceInfluence", img: "resources/Influence.png" },

  // Recursos estratégicos (solo aparecen como mantenimiento de algunos edificios).
  volatile_motes: { i18nKey: "resourceVolatileMotes", img: "resources/Volatile_motes.png" },
  rare_crystals: { i18nKey: "resourceRareCrystals", img: "resources/Rare_crystals.png" },
  exotic_gases: { i18nKey: "resourceExoticGases", img: "resources/Exotic_gases.png" }
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
 * normales, con el mantenimiento como valores negativos. Fuente: página
 * "Jobs" de la wiki (v4.3), columnas "Output per 100 workforce" y "Upkeep
 * per 100 workforce" (100 de plantilla = 1 empleo = 1 pop). Se usa siempre
 * el valor base del imperio individualista estándar (mantenimiento en
 * bienes de consumo); las variantes gestalt (mantenimiento en energía o
 * minerales) y las de robots no se modelan.
 *
 * Los servicios (amenities) la wiki los da ×100 ("+1250" = 12.5); aquí ya
 * están divididos entre 100, como el resto de valores de esta tabla.
 *
 * No incluidos a propósito (no los modela este simulador): intercambios de
 * empleo (job swaps: Ejecutivo, Noble, Gerente...), efectos de
 * estabilidad/delincuencia/etc. que no sean los de JOB_EFFECTS, y los
 * bonos de civismos, tradiciones, gobernantes o decisiones de las tablas
 * "base modifiers" de la wiki. Los bonos de edificios salen solo de las
 * páginas de edificios de la wiki (ver "jobModifiers", "jobEfficiency" y
 * "jobUpkeepMult" en BUILDINGS).
 */
export const JOB_OUTPUTS = {
  // Obreros
  technician: { energy: 6 },
  miner: { minerals: 4 },
  farmer: { food: 6 },
  // Especialistas
  metallurgist: { alloys: 3, minerals: -6 },
  artisan: { consumer_goods: 6, minerals: -6 },
  physicist: { physics: 3, consumer_goods: -1.5 },
  engineer: { engineering: 3, consumer_goods: -1.5 },
  biologist: { society: 3, consumer_goods: -1.5 },
  entertainer: { amenities: 12.5, unity: 0.5, consumer_goods: -1 },
  trader: { trade: 8, consumer_goods: -1 },
  priest: { unity: 3, amenities: 2, consumer_goods: -2 },
  bureaucrat: { unity: 3, consumer_goods: -2 },
  enforcer: {},
  educator: { unity: 2.5, consumer_goods: -1 },
  soldier: { alloys: -1 },
  // Élite
  politician: { unity: 5, amenities: 3, consumer_goods: -3 }
};

/**
 * Efectos por empleo que no son un recurso de los que se acumulan en los
 * totales (se muestran aparte, ya multiplicados por la población asignada).
 * Valores por empleo, página "Jobs" de la wiki (v4.3):
 *  - enforcer: +0.2 estabilidad, −25 delincuencia, +1 ejércitos de defensa.
 *  - educator: −20 delincuencia, +0.5 ejércitos de defensa (el empleo de la
 *    wiki es un intercambio del Agente; sus +10% atracción de ética no se
 *    modelan).
 *  - soldier: +4 capacidad naval, +0.15 estabilidad, +1 ejércitos de defensa.
 */
export const JOB_EFFECTS = {
  enforcer: { stability: 0.2, crime: -25, defenseArmies: 1 },
  educator: { crime: -20, defenseArmies: 0.5 },
  soldier: { navalCapacity: 4, stability: 0.15, defenseArmies: 1 }
};

/** Estadística de JOB_EFFECTS -> { i18nKey, icono (carpeta "modifiers/" de la API de assets; nombres verificados contra StellarisAssetsTree.txt) }. */
export const STAT_EFFECTS = {
  stability: { i18nKey: "statStability", img: "modifiers/mod_planet_stability_add.png" },
  crime: { i18nKey: "statCrime", img: "modifiers/mod_planet_crime_add.png" },
  defenseArmies: { i18nKey: "statDefenseArmies", img: "modifiers/mod_planet_defense_armies_add.png" },
  navalCapacity: { i18nKey: "statNavalCapacity", img: "modifiers/mod_navy_size_add.png" }
};

/** Iconos genéricos (carpeta "modifiers/") para decorar la barra de estadísticas de la colonia. */
export const HEADER_ICONS = {
  housing: "modifiers/mod_planet_housing_add.png",
  amenities: "modifiers/mod_planet_amenities_add.png"
};

/**
 * Reglas de requisitos de los edificios (ver js/building-requirements.js).
 */
const NOT_GESTALT = { type: "notGestalt" };
const USES_PRIEST_JOBS = { type: "usesPriestJobs", value: true };
const NOT_USES_PRIEST_JOBS = { type: "usesPriestJobs", value: false };
const USES_CONSUMER_GOODS = { type: "usesConsumerGoods" };
const CAPITAL_TIER_2 = { type: "capitalTier", min: 1 };
const civic = (...keys) => ({ type: "civic", keys });
const notCivic = (...keys) => ({ type: "notCivic", keys });
const notDesignation = (...ids) => ({ type: "notDesignation", ids });
const notCelestial = (...ids) => ({ type: "notCelestial", ids });

/**
 * Catálogo de edificios.
 *
 * - jobs: { jobId: cantidad ×100 } tal cual la wiki (ver nota de escala
 *   arriba). Una copia del edificio aporta esa cantidad / 100 de cada
 *   empleo.
 * - upkeep: { resourceId: cantidad } mantenimiento POR COPIA, en números
 *   normales (negativo = consumo). Viene directo de la wiki.
 * - housing / amenities: ×100 igual que los empleos.
 * - jobModifiers: { jobId: { resourceId: cantidad } } bono por empleo (en
 *   números normales, no ×100) que se suma a la salida de TODOS los
 *   empleos de ese tipo del planeta, no solo a los que da este edificio.
 *   Solo se usa en edificios con límite de colonia 1, así que nunca se
 *   acumula. Fuente: páginas de edificios de la wiki.
 * - jobEfficiency: { jobId: fracción } eficacia laboral (+0.1 = +10%); como
 *   toda eficacia, solo multiplica la producción, no el mantenimiento.
 * - jobUpkeepMult: { jobId: fracción } cambio del mantenimiento de ese
 *   empleo (-0.1 = -10% de mantenimiento).
 * - requires: lista de reglas de requisito (ver js/building-requirements.js).
 *   Si no se cumplen, el edificio se oculta del catálogo.
 * - colonyLimit: "none" (sin límite) o 1 (máximo una copia, normalmente
 *   por pertenecer a una cadena de mejora).
 * - cost: texto informativo de coste de construcción (no se simula el
 *   almacén de recursos todavía, solo se muestra como referencia).
 * - sets: los "building sets" de este edificio (columna "Building Sets" de
 *   la wiki, páginas "Buildings", "Industry buildings" y "Resource
 *   buildings"), confirmados edificio a edificio contra la wiki. Determina
 *   en qué ranuras se puede construir (ver slotAcceptsBuilding en
 *   planet-sim.js):
 *     - "origin": edificio genérico, permitido en las 6 ranuras base y
 *       nunca restringido por ninguna especialización (la wiki lista estos
 *       edificios sin "Building Sets" propio, o solo con sets genéricos
 *       como "Government"/"Urban"/"Entertainment"/"Resort" que aquí no se
 *       modelan por separado).
 *     - "energy"/"minerals"/"food": edificios de extracción (Voltaic Yard,
 *       Quarry Depot, Hydroponics Farm); la wiki confirma que SOLO se
 *       pueden construir en su distrito de recursos especializado a juego
 *       (Generador/Minería/Agricultura), nunca en las ranuras base.
 *     - "industrial"/"foundry"/"factory": aleaciones y bienes de consumo
 *       (confirmado en "Industry buildings"); permitidos en las ranuras
 *       base y en las especializaciones urbanas Mixed/Heavy/Civilian
 *       Industry que comparten ese set.
 *     - "fortress"/"trade": Stronghold/Fortress y Zonas Comerciales
 *       (confirmado en "Buildings"); permitidos en las ranuras base y en
 *       Military Defenses / Commercial Nexus respectivamente.
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
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["energy"]
  },
  {
    id: "quarry_depot",
    img: "buildings/building_mine_generic.png",
    i18nKey: "buildingQuarryDepot",
    category: "resource",
    jobs: { miner: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado)",
    sets: ["minerals"]
  },
  {
    id: "hydroponics_farm",
    requires: [notCelestial("machine")],
    img: "buildings/building_hydroponics_farm.png",
    i18nKey: "buildingHydroponicsFarm",
    category: "resource",
    jobs: { farmer: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["food"]
  },

  // ── Edificios que mejoran la producción de los empleos básicos (límite 1 por colonia; +0,5 / +1 por empleo, página Resource buildings) ──
  {
    id: "energy_grid",
    img: "buildings/building_energy_grid.png",
    i18nKey: "buildingEnergyGrid",
    category: "resource",
    tier: 1,
    jobs: {},
    jobModifiers: { technician: { energy: 0.5 } },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "400 minerales",
    sets: ["energy"]
  },
  {
    id: "energy_nexus",
    requires: [CAPITAL_TIER_2],
    img: "buildings/building_energy_nexus.png",
    i18nKey: "buildingEnergyNexus",
    category: "resource",
    tier: 2,
    upgradesFrom: "energy_grid",
    jobs: {},
    jobModifiers: { technician: { energy: 1 } },
    colonyLimit: 1,
    upkeep: { energy: -2, rare_crystals: -1 },
    cost: "600 minerales, 50 cristales raros",
    sets: ["energy"]
  },
  {
    id: "mineral_purification_plants",
    requires: [notCelestial("ringworld")],
    img: "buildings/building_mineral_purification_plant.png",
    i18nKey: "buildingMineralPurificationPlants",
    category: "resource",
    tier: 1,
    jobs: {},
    jobModifiers: { miner: { minerals: 0.5 } },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "400 minerales",
    sets: ["minerals"]
  },
  {
    id: "mineral_purification_hubs",
    requires: [notCelestial("ringworld"), CAPITAL_TIER_2],
    img: "buildings/building_mineral_purification_hub.png",
    i18nKey: "buildingMineralPurificationHubs",
    category: "resource",
    tier: 2,
    upgradesFrom: "mineral_purification_plants",
    jobs: {},
    jobModifiers: { miner: { minerals: 1 } },
    colonyLimit: 1,
    upkeep: { energy: -2, volatile_motes: -1 },
    cost: "600 minerales, 50 motas volátiles",
    sets: ["minerals"]
  },
  {
    id: "food_processing_facilities",
    requires: [notCelestial("machine")],
    img: "buildings/building_food_processing_facility.png",
    i18nKey: "buildingFoodProcessingFacilities",
    category: "resource",
    tier: 1,
    jobs: {},
    jobModifiers: { farmer: { food: 0.5 } },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "400 minerales",
    sets: ["food"]
  },
  {
    id: "food_processing_centers",
    requires: [notCelestial("machine"), CAPITAL_TIER_2],
    img: "buildings/building_food_processing_center.png",
    i18nKey: "buildingFoodProcessingCenters",
    category: "resource",
    tier: 2,
    upgradesFrom: "food_processing_facilities",
    jobs: {},
    jobModifiers: { farmer: { food: 1 } },
    colonyLimit: 1,
    upkeep: { energy: -2, exotic_gases: -1 },
    cost: "600 minerales, 50 gases exóticos",
    sets: ["food"]
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
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["industrial", "foundry"]
  },
  {
    id: "alloy_mega_forges",
    img: "buildings/building_foundry_2.png",
    i18nKey: "buildingAlloyMegaForges",
    category: "foundry",
    tier: 2,
    upgradesFrom: "alloy_foundries",
    jobs: { metallurgist: 400 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -2 },
    cost: "480 minerales (600 si está asentado, 100 aleaciones)",
    sets: ["industrial", "foundry"]
  },
  {
    id: "alloy_nano_plants",
    requires: [notDesignation("penalColony")],
    img: "buildings/building_foundry_3.png",
    i18nKey: "buildingAlloyNanoPlants",
    category: "foundry",
    tier: 3,
    upgradesFrom: "alloy_mega_forges",
    jobs: { metallurgist: 600 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -4 },
    cost: "480 minerales (800 si está asentado, 200 aleaciones)",
    sets: ["industrial", "foundry"]
  },

  // ── Eficiencia / mantenimiento de fundición (límite 1 por colonia, página Industry buildings) ──
  {
    id: "alloy_reclamation_plant",
    img: "buildings/building_foundry_upkeep_1.png",
    i18nKey: "buildingAlloyReclamationPlant",
    category: "foundry",
    jobs: {},
    jobUpkeepMult: { metallurgist: -0.1 },
    colonyLimit: 1,
    upkeep: { energy: -5, volatile_motes: -2 },
    cost: "600 minerales, 100 motas volátiles",
    sets: ["industrial", "foundry"]
  },
  {
    id: "metallurgical_research_lab",
    img: "buildings/building_foundry_efficiency_1.png",
    i18nKey: "buildingMetallurgicalResearchLab",
    category: "foundry",
    jobs: {},
    jobEfficiency: { metallurgist: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, volatile_motes: -4 },
    cost: "800 energía, 200 motas volátiles",
    sets: ["industrial", "foundry"]
  },

  // ── Fábrica: bienes de consumo (sin límite por colonia) ────────────
  {
    id: "civilian_industries",
    requires: [USES_CONSUMER_GOODS],
    img: "buildings/building_factory_1.png",
    i18nKey: "buildingCivilianIndustries",
    category: "factory",
    tier: 1,
    jobs: { artisan: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["industrial", "factory"]
  },
  {
    id: "civilian_fabricators",
    requires: [USES_CONSUMER_GOODS],
    img: "buildings/building_factory_2.png",
    i18nKey: "buildingCivilianFabricators",
    category: "factory",
    tier: 2,
    upgradesFrom: "civilian_industries",
    jobs: { artisan: 400 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -2 },
    cost: "480 minerales (600 si está asentado, 100 aleaciones)",
    sets: ["industrial", "factory"]
  },
  {
    id: "civilian_repli_complexes",
    requires: [USES_CONSUMER_GOODS],
    img: "buildings/building_factory_3.png",
    i18nKey: "buildingCivilianRepliComplexes",
    category: "factory",
    tier: 3,
    upgradesFrom: "civilian_fabricators",
    jobs: { artisan: 600 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -4 },
    cost: "600 minerales (800 si está asentado, 200 aleaciones)",
    sets: ["industrial", "factory"]
  },

  // ── Eficiencia / mantenimiento de fábrica (límite 1 por colonia, página Industry buildings) ──
  {
    id: "recirculation_center",
    img: "buildings/building_factory_upkeep_1.png",
    i18nKey: "buildingRecirculationCenter",
    category: "factory",
    jobs: {},
    jobUpkeepMult: { artisan: -0.1 },
    colonyLimit: 1,
    upkeep: { energy: -5, rare_crystals: -2 },
    cost: "600 minerales, 100 cristales raros",
    sets: ["industrial", "factory"]
  },
  {
    id: "distributed_design_center",
    img: "buildings/building_factory_efficiency_1.png",
    i18nKey: "buildingDistributedDesignCenter",
    category: "factory",
    jobs: {},
    jobEfficiency: { artisan: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, rare_crystals: -4 },
    cost: "800 energía, 200 cristales raros",
    sets: ["industrial", "factory"]
  },

  // ── Investigación genérica (sin límite por colonia) ────────────────
  {
    id: "research_labs",
    requires: [notDesignation("resortWorld", "thrallWorld")],
    img: "buildings/building_research_lab_1.png",
    i18nKey: "buildingResearchLabs",
    category: "research",
    tier: 1,
    jobs: { physicist: 60, engineer: 60, biologist: 60 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },
  {
    id: "research_complexes",
    requires: [notDesignation("resortWorld", "thrallWorld")],
    img: "buildings/building_research_lab_2.png",
    i18nKey: "buildingResearchComplexes",
    category: "research",
    tier: 2,
    upgradesFrom: "research_labs",
    jobs: { physicist: 120, engineer: 120, biologist: 120 },
    colonyLimit: "none",
    upkeep: { energy: -5, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)",
    sets: ["origin"]
  },
  {
    id: "advanced_research_complexes",
    requires: [notDesignation("resortWorld", "thrallWorld")],
    img: "buildings/building_research_lab_3.png",
    i18nKey: "buildingAdvancedResearchComplexes",
    category: "research",
    tier: 3,
    upgradesFrom: "research_complexes",
    jobs: { physicist: 180, engineer: 180, biologist: 180 },
    colonyLimit: "none",
    upkeep: { energy: -8, minerals: -2 },
    cost: "600 minerales (800 si está asentado, 100 aleaciones)",
    sets: ["origin"]
  },

  // ── Administración civil (una por línea de mejora) ─────────────────
  {
    id: "precinct_houses",
    requires: [NOT_GESTALT, notCivic("principleCivilEducation"), notDesignation("thrallWorld")],
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingPrecinctHouses",
    category: "civic",
    tier: 1,
    jobs: { enforcer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },
  {
    id: "hall_of_judgment",
    requires: [NOT_GESTALT, notCivic("principleCivilEducation"), notDesignation("thrallWorld"), CAPITAL_TIER_2],
    img: "buildings/building_hall_judgment.png",
    i18nKey: "buildingHallOfJudgment",
    category: "civic",
    tier: 2,
    upgradesFrom: "precinct_houses",
    jobs: { enforcer: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)",
    sets: ["origin"]
  },
  {
    id: "state_academy",
    requires: [civic("principleCivilEducation"), notDesignation("thrallWorld")],
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingStateAcademy",
    category: "civic",
    tier: 1,
    jobs: { educator: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },
  {
    id: "center_of_guidance",
    requires: [civic("principleCivilEducation"), notDesignation("thrallWorld"), CAPITAL_TIER_2],
    img: "buildings/building_center_of_guidance.png",
    i18nKey: "buildingCenterOfGuidance",
    category: "civic",
    tier: 2,
    upgradesFrom: "state_academy",
    jobs: { educator: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, minerals: -1 },
    cost: "480 minerales (600 si está asentado, 50 aleaciones)",
    sets: ["origin"]
  },
  {
    id: "administrative_offices",
    requires: [NOT_GESTALT, NOT_USES_PRIEST_JOBS, notDesignation("penalColony", "resortWorld")],
    img: "buildings/building_bureaucratic_1.png",
    i18nKey: "buildingAdministrativeOffices",
    category: "civic",
    jobs: { bureaucrat: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },

  // ── Militares ───────────────────────────────────────────────────────
  {
    id: "stronghold",
    requires: [notDesignation("resortWorld")],
    img: "buildings/building_stronghold.png",
    i18nKey: "buildingStronghold",
    category: "military",
    tier: 1,
    jobs: { soldier: 200 },
    colonyLimit: 1,
    upkeep: { minerals: -1 },
    cost: "240 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["fortress"]
  },
  {
    id: "fortress",
    requires: [notDesignation("resortWorld"), CAPITAL_TIER_2],
    img: "buildings/building_fortress.png",
    i18nKey: "buildingFortress",
    category: "military",
    tier: 2,
    upgradesFrom: "stronghold",
    jobs: { soldier: 400 },
    colonyLimit: 1,
    upkeep: { minerals: -1, alloys: -1 },
    cost: "360 minerales (600 si está asentado, 50 aleaciones)",
    sets: ["fortress"]
  },

  // ── Otros ───────────────────────────────────────────────────────────
  {
    id: "commercial_zones",
    requires: [NOT_GESTALT, notDesignation("penalColony", "thrallWorld")],
    img: "buildings/building_commercial_zone.png",
    i18nKey: "buildingCommercialZones",
    category: "other",
    jobs: { trader: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["trade"]
  },
  {
    id: "holo_theatres",
    requires: [NOT_GESTALT, notCivic("principleDystopianSociety"), notDesignation("penalColony", "thrallWorld")],
    img: "buildings/building_holo_theatres.png",
    i18nKey: "buildingHoloTheatres",
    category: "other",
    jobs: { entertainer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },

  // ── Vivienda (sin empleos: vivienda y comodidades, ambos ×100) ─────
  {
    id: "luxury_residences",
    requires: [NOT_GESTALT, notCivic("principleSharedBurdens"), notCelestial("habitat")],
    img: "buildings/building_luxury_residence.png",
    i18nKey: "buildingLuxuryResidences",
    category: "housing",
    tier: 1,
    jobs: {},
    housing: 1500,
    amenities: 1500,
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
  },
  {
    id: "paradise_domes",
    requires: [NOT_GESTALT, notCivic("principleSharedBurdens"), notCelestial("habitat"), CAPITAL_TIER_2],
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
    cost: "480 minerales (600 si está asentado, 50 aleaciones)",
    sets: ["origin"]
  },

  // ── Unidad (unity) ─────────────────────────────────────────────────
  {
    id: "temple",
    requires: [USES_PRIEST_JOBS],
    img: "buildings/building_temple.png",
    i18nKey: "buildingTemple",
    category: "unity",
    jobs: { priest: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: "360 minerales (400 si está asentado / 40 si es nómada)",
    sets: ["origin"]
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

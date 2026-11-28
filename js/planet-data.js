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
/** Los efectos de edificio (empleos, vivienda, comodidades) se guardan ×100; se dividen aquí, en un único sitio. */
export const EFFECT_SCALE = 100;
export function divideEffect(rawAmount) {
  return rawAmount / EFFECT_SCALE;
}

/**
 * Reglas reales de ranuras de edificios de una colonia:
 * - 6 ranuras base en el distrito principal (una de ellas la ocupa siempre
 *   el edificio capital, ver CAPITAL_SETS).
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
const BUILDING_SLOT_RULES = {
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
 * Edificios capital por tipo de autoridad. SIEMPRE hay uno, ocupa la primera
 * ranura del distrito principal, nunca se puede demoler ni desactivar: solo
 * mejorar o degradar de nivel. Datos de la página "Capital building" de la
 * wiki. `tier` es el nivel en números (I-V) que usan los requisitos de otros
 * edificios (ver CAPITAL_TIER_2 y similares): la Mente Colmena salta del II
 * al IV y al V. `upkeep` es el mantenimiento de energía del propio edificio.
 *
 * P7.5: `defenseArmies` (ejércitos de defensa planetarios, wiki 4.5) y el empleo
 * Colonista del Refugio Colonial (estándar, individualista). Simplificaciones: no
 * se modelan los empleos secundarios condicionados a tradiciones, civismos o
 * especies (Robotista, Noble, Animador, Trabajador médico, Trabajador cultural...),
 * ni los empleos extra de la Máquina que dependen de tener 1000 o 4000 pops
 * (Replicadores adicionales), ni los ejércitos de otros capitales no incluidos aquí.
 */
export const CAPITAL_SETS = {
  standard: [
  { id: "colony_shelter", img: "buildings/building_colony_shelter.png", i18nKey: "buildingColonyShelter", tier: 1, housing: 300, amenities: 300, jobs: { colonist: 200 }, upkeep: {} },
  { id: "planetary_administration", img: "buildings/building_capital.png", i18nKey: "buildingPlanetaryAdministration", tier: 2, housing: 1000, amenities: 1000, jobs: { politician: 200, enforcer: 100 }, defenseArmies: 4, upkeep: { energy: -5 } },
  { id: "planetary_capital", img: "buildings/building_major_capital.png", i18nKey: "buildingPlanetaryCapital", tier: 3, housing: 1500, amenities: 1500, jobs: { politician: 300, enforcer: 200 }, defenseArmies: 8, upkeep: { energy: -8 } },
  { id: "system_capital_complex", img: "buildings/building_system_capital.png", i18nKey: "buildingSystemCapitalComplex", tier: 4, housing: 2000, amenities: 2000, jobs: { politician: 400, enforcer: 300 }, defenseArmies: 16, upkeep: { energy: -10 } },
  { id: "imperial_palace", img: "buildings/building_imperial_capital.png", i18nKey: "buildingImperialPalace", tier: 5, housing: 3000, amenities: 3000, jobs: { politician: 600, enforcer: 500 }, defenseArmies: 16, upkeep: { energy: -10 } }
  ],
  hive: [
  { id: "colony_shelter", img: "buildings/building_colony_shelter.png", i18nKey: "buildingColonyShelter", tier: 1, housing: 300, amenities: 300, jobs: {  }, upkeep: { energy: -1 } },
  { id: "hive_core", img: "buildings/building_hive_capital.png", i18nKey: "buildingHiveCore", tier: 2, housing: 1000, amenities: 800, jobs: { logistic_drone: 200, synapse_drone: 200, hunter_seeker_drone: 100 }, defenseArmies: 4, upkeep: { energy: -2 } },
  { id: "hive_nexus", img: "buildings/building_hive_major_capital.png", i18nKey: "buildingHiveNexus", tier: 4, housing: 2000, amenities: 2000, jobs: { logistic_drone: 500, synapse_drone: 300, hunter_seeker_drone: 200 }, defenseArmies: 8, upkeep: { energy: -5 } },
  { id: "hive_imperial_complex", img: "buildings/building_imperial_hive_capital.png", i18nKey: "buildingHiveImperialComplex", tier: 5, housing: 3000, amenities: 3000, jobs: { logistic_drone: 700, synapse_drone: 500, hunter_seeker_drone: 400 }, defenseArmies: 16, upkeep: { energy: -10 } }
  ],
  machine: [
  { id: "deployment_post", img: "buildings/building_deployment_post.png", i18nKey: "buildingDeploymentPost", tier: 1, housing: 300, amenities: 500, jobs: { replicator: 200, hunter_seeker_drone: 100, logistic_drone: 200 }, upkeep: { energy: -1 } },
  { id: "administrative_array", img: "buildings/building_machine_capital.png", i18nKey: "buildingAdministrativeArray", tier: 2, housing: 1000, amenities: 1000, jobs: { replicator: 200, hunter_seeker_drone: 100, logistic_drone: 300, coordinator: 200 }, defenseArmies: 4, upkeep: { energy: -5 } },
  { id: "planetary_processor", img: "buildings/building_machine_major_capital.png", i18nKey: "buildingPlanetaryProcessor", tier: 3, housing: 1500, amenities: 1500, jobs: { replicator: 200, hunter_seeker_drone: 200, logistic_drone: 400, coordinator: 300 }, defenseArmies: 8, upkeep: { energy: -8 } },
  { id: "primary_nexus", img: "buildings/building_machine_system_capital.png", i18nKey: "buildingPrimaryNexus", tier: 4, housing: 2000, amenities: 2000, jobs: { replicator: 200, hunter_seeker_drone: 300, logistic_drone: 500, coordinator: 400 }, defenseArmies: 16, upkeep: { energy: -10 } },
  { id: "machine_imperial_center", img: "buildings/building_imperial_machine_capital.png", i18nKey: "buildingMachineImperialCenter", tier: 5, housing: 3000, amenities: 3000, jobs: { replicator: 400, hunter_seeker_drone: 500, logistic_drone: 600, coordinator: 500 }, defenseArmies: 16, upkeep: { energy: -10 } }
  ],
  // P10.6: Wilderness capitals (game files 4.5.4, common/buildings/21_wilderness_buildings.txt). Game jobs of a hive:
  // coordinator = Synapse Drone, logistics_drone = Logistic Drone, patrol_drone = Hunter-Seeker Drone (as in the Hive
  // Core). Costs (food, biomass) are shown in the capital tooltip; the tier V cost is the Imperial Complex one.
  wilderness: [
  { id: "colony_shelter_wilderness", img: "buildings/capital_wilderness_1.png", i18nKey: "buildingPlanetaryTendrils", tier: 1, housing: 300, amenities: 300, jobs: { hunter_seeker_drone: 100, logistic_drone: 200 }, upkeep: { energy: -1, food: -1 } },
  { id: "capital_wilderness", img: "buildings/capital_wilderness_2.png", i18nKey: "buildingPlanetaryRootBundle", tier: 2, housing: 1000, amenities: 1000, jobs: { synapse_drone: 100, logistic_drone: 300, hunter_seeker_drone: 100 }, defenseArmies: 4, upkeep: { food: -5 }, cost: { food: 400, biomass: 100 } },
  { id: "major_capital_wilderness", img: "buildings/capital_wilderness_3.png", i18nKey: "buildingPlanetaryRootComplex", tier: 3, housing: 1500, amenities: 1500, jobs: { synapse_drone: 200, logistic_drone: 400, hunter_seeker_drone: 200 }, defenseArmies: 8, upkeep: { food: -8 }, cost: { food: 600, biomass: 200 } },
  { id: "system_capital_wilderness", img: "buildings/capital_wilderness_4.png", i18nKey: "buildingPlanetaryRootNexus", tier: 4, housing: 2000, amenities: 2000, jobs: { synapse_drone: 300, logistic_drone: 500, hunter_seeker_drone: 300 }, defenseArmies: 16, upkeep: { food: -10 }, cost: { food: 800, biomass: 400 } },
  { id: "imperial_capital_wilderness", img: "buildings/capital_wilderness_4.png", i18nKey: "buildingHiveImperialComplex", tier: 5, housing: 3000, amenities: 3000, jobs: { hunter_seeker_drone: 400, logistic_drone: 700 }, defenseArmies: 16, upkeep: { food: -10 }, cost: { food: 2000, biomass: 800 } }
  ]
};

/** Conjunto de capitales que corresponde a la autoridad elegida (Mente Colmena, Inteligencia de Máquina o el estándar para el resto). */
export function capitalSetForAuthority(authorityId, originId = null) {
  if (authorityId === "hiveMind" && originId === "wilderness") return CAPITAL_SETS.wilderness;
  if (authorityId === "hiveMind") return CAPITAL_SETS.hive;
  if (authorityId === "machineIntelligence") return CAPITAL_SETS.machine;
  return CAPITAL_SETS.standard;
}

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
/**
 * P10.10: Anglers-family civics (Anglers / Marine Machines share civicAnglers, Trawling Operations / Maritime Robotics
 * share civicCorporateAnglers) on a wet-climate world (Ocean, Continental, Tropical). Wiki 4.5.2 "District
 * specialization", Agriculture specializations: Agricultural Focus and Agrarian Villages are NOT available there
 * (Aquaculture and Coastal Hamlets replace them); Coastal Hamlets and Aquaculture need it. Anglers civic page: there
 * every Farmer becomes an Angler and every Artisan a Pearl Diver (Jobs page job swaps, js/job-swap-data.js).
 */
export const ANGLERS_WET_CLIMATE = [{ type: "civic", keys: ["civicAnglers", "civicCorporateAnglers"] }, { type: "celestial", ids: ["ocean", "continental", "tropical"] }];
const ANGLERS_WET_CLIMATE_BLOCK = { type: "notAll", rules: ANGLERS_WET_CLIMATE };
/** P10.6: origin rules (js/building-requirements.js); the game writes them as is_wilderness_empire = yes / no. */
export const WILDERNESS_ORIGIN = { type: "origin", ids: ["wilderness"], i18nKey: "reqWildernessOrigin" };
export const NOT_WILDERNESS_ORIGIN = { type: "notOrigin", ids: ["wilderness"], i18nKey: "reqNotWildernessOrigin" };

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
    // Vivienda (×100) y mantenimiento por copia del distrito primario (P7.1, página
    // "Districts" 4.5). Ciudad (individualista) +1000, Núcleo central (máquina) +1000 y
    // Clúster de la colmena +1200 (+600 más en un mundo colmena). Mantenimiento −2 energía.
    // Cada especialización elegida resta 200 de vivienda por copia (campo `housing` de
    // cada opción). Con Idilio Agrario, −200 por copia.
    // P7.10: bonos de vivienda por tecnología (todas investigadas, GDD §2), valores por copia de la
    // página "Districts" 4.5.2: Weather Control Systems +100 (ciudad, núcleo y clúster);
    // Anti-Gravity Engineering +200 ciudad, +100 núcleo central y clúster de la colmena; no con
    // Idilio Agrario (el principio impide investigarla). Public Works Division es una tradición y
    // no se aplica; Optimized Nexus y Extended Hives no figuran en las páginas de tecnología
    // (parecen sus variantes gestalt): tampoco se aplican hasta P14.
    housing: 1000,
    housingByAuthority: { hiveMind: 1200, machineIntelligence: 1100 },
    hiveWorldHousing: 600,
    agrarianIdyllHousing: -200,
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 100 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 200, housingByAuthority: { hiveMind: 100, machineIntelligence: 100 }, excludedCivics: ["civicAgrarianIdyll"] }
    ],
    upkeep: { energy: -2 },
    specializationSlots: 2,
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "mixedIndustry",
        i18nKey: "specializationMixedIndustry",
        img: "districts_specialization/District_specialization_industrial.png",
        housing: -200,
        jobs: { metallurgist: 50, artisan: 50 },
        permittedSets: ["industrial"]
      },
      {
        id: "heavyIndustry",
        i18nKey: "specializationHeavyIndustry",
        img: "districts_specialization/District_specialization_foundry.png",
        housing: -200,
        jobs: { metallurgist: 100 },
        permittedSets: ["foundry"]
      },
      {
        id: "civilianIndustry",
        i18nKey: "specializationCivilianIndustry",
        img: "districts_specialization/District_specialization_factory.png",
        housing: -200,
        jobs: { artisan: 100 },
        permittedSets: ["factory"]
      },
      {
        id: "militaryDefenses",
        i18nKey: "specializationMilitaryDefenses",
        img: "districts_specialization/District_specialization_fortress.png",
        housing: -200,
        jobs: { soldier: 100 },
        permittedSets: ["fortress"]
      },
      {
        id: "commercialNexus",
        i18nKey: "specializationCommercialNexus",
        img: "districts_specialization/District_specialization_trade.png",
        housing: -200,
        jobs: { trader: 100 },
        permittedSets: ["trade"]
      },
      // P10.2: research specializations (wiki 4.5.2 "District specialization"). The HTML marks the requirement with a
      // red cross: NOT available in a Habitat primary district (the markdown copy loses the cross). Research labs are
      // tagged "origin" in BUILDINGS, so these slots permit "research" and "origin" (wiki: Research; Origin).
      {
        id: "researchEnclave",
        i18nKey: "specializationResearchEnclave",
        img: "districts_specialization/District_specialization_research.png",
        housing: -200,
        requires: [{ type: "notCelestial", ids: ["habitat"] }],
        jobs: { physicist: 30, biologist: 30, engineer: 30 },
        permittedSets: ["research", "origin"]
      },
      {
        id: "engineeringResearch",
        i18nKey: "specializationEngineeringResearch",
        img: "districts_specialization/District_specialization_engineering.png",
        housing: -200,
        requires: [{ type: "notCelestial", ids: ["habitat"] }],
        jobs: { engineer: 100 },
        permittedSets: ["engineering", "research", "origin"]
      },
      {
        id: "physicsResearch",
        i18nKey: "specializationPhysicsResearch",
        img: "districts_specialization/District_specialization_physics.png",
        housing: -200,
        requires: [{ type: "notCelestial", ids: ["habitat"] }],
        jobs: { physicist: 100 },
        permittedSets: ["physics", "research", "origin"]
      },
      {
        id: "societyResearch",
        i18nKey: "specializationSocietyResearch",
        img: "districts_specialization/District_specialization_society.png",
        housing: -200,
        requires: [{ type: "notCelestial", ids: ["habitat"] }],
        jobs: { biologist: 100 },
        permittedSets: ["society", "research", "origin"]
      },
      // P10.9: Administrative Hub, Spiritual Enclave (urban, primary and secondary urban districts) and the primary-only
      // Archives and Urban Expansion (wiki 4.5.2 "District specialization"). administratorJobs: Bureaucrats, or the
      // Administrator job of the authority (Hive Mind Synapse Drones, Machine Intelligence Coordinators; Jobs page).
      // primaryOnly: not offered in secondary urban districts. excludedSets: building sets the slots do NOT permit (Urban
      // Expansion permits every set but Generator / Mining / Farming; Knights, Betharian and Automation are not modelled).
      {
        id: "administrativeHub",
        i18nKey: "specializationAdministrativeHub",
        img: "districts_specialization/District_specialization_unity.png",
        housing: -200,
        requires: [{ type: "notEthic", ids: ["spiritualist"] }, { type: "notCivic", keys: ["civicMachineServitor"] }],
        administratorJobs: 100,
        permittedSets: ["unity", "origin"]
      },
      {
        id: "spiritualEnclave",
        i18nKey: "specializationSpiritualEnclave",
        img: "districts_specialization/District_specialization_priest.png",
        housing: -200,
        requires: [{ type: "ethic", ids: ["spiritualist"] }],
        jobs: { priest: 100 },
        permittedSets: ["unity", "origin"]
      },
      {
        id: "urbanExpansion",
        i18nKey: "specializationUrbanExpansion",
        img: "districts_specialization/District_specialization_urban.png",
        housing: 200,
        primaryOnly: true,
        excludedSets: ["energy", "minerals", "food"]
      },
      {
        // "+200 Bio-Trophies (if Rogue Servitor)" replaces the Bureaucrats: Bio-Trophies are not modelled (GDD §10), shown as a note.
        id: "archives",
        i18nKey: "specializationArchives",
        img: "districts_specialization/District_specialization_bureaucrat.png",
        housing: -200,
        primaryOnly: true,
        jobs: { biologist: 20, engineer: 20, physicist: 20 },
        administratorJobs: 40,
        administratorExcludedCivics: ["civicMachineServitor"],
        civicNotes: { civicMachineServitor: "specNoteArchivesBioTrophies" },
        permittedSets: ["research", "unity", "origin"]
      },
      // P10.6: Central Spire (wiki 4.5.2 "District specialization"): Relic World only, first specialization slot only (it is
      // set there when the Collapsed Spire blocker is cleared; the blocker itself is P10.8, shown as an unmodelled
      // requirement until then). "+15% Physics / Society / Engineering research from jobs" is a planet effect, applied once
      // whatever the number of district copies (jobResourcePct, like the body type's). "Cannot be rebuilt if removed" is not enforced.
      {
        id: "centralSpire",
        i18nKey: "specializationCentralSpire",
        img: "districts_specialization/District_specialization_research.png",
        housing: -200,
        firstSlotOnly: true,
        primaryOnly: true,
        requires: [{ type: "celestial", ids: ["relic"] }, { type: "notBlocker", ids: ["collapsedSpire"] }, { type: "unmodelled", i18nKey: "reqCollapsedSpireCleared" }],
        jobs: { physicist: 60, biologist: 60, engineer: 60 },
        jobResourcePct: { physics: 15, society: 15, engineering: 15 },
        permittedSets: ["urban", "research", "origin"]
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
   * P7.4: `requires` (mismas reglas que los edificios, ver js/building-requirements.js)
   * en las opciones cuyo requisito se puede modelar: Bahías de Cultivo Solar (solo
   * hábitat), Aldeas Agrarias (Idilio Agrario, sin Pescadores en clima húmedo) y Caseríos Costeros
   * (Idilio Agrario + Pescadores en clima húmedo; sustituyen a las Aldeas). NO se modelan los de
   * origen (Urbanización Subterránea: Subterráneo; Generación de Energía y Extracción de
   * Minerales: no Naturaleza salvaje) ni de característica planetaria (Minas Gravitónicas:
   * Montañas en el cielo, ver P10.8): siguen disponibles, con el requisito indicado
   * (`{ type: "unmodelled" }`, ver js/building-requirements.js).
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
    // Vivienda (×100) y mantenimiento por copia (P7.1, página "Districts" 4.5); +100 con consciencia gestalt, +300 con Idilio Agrario.
    housing: 200,
    gestaltHousing: 100,
    agrarianIdyllHousing: 300,
    upkeep: { energy: -1 },
    lockedTooltipKey: "specializationRequiresEnergy",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "energyGeneration",
        i18nKey: "specializationEnergyGeneration",
        img: "districts_specialization/District_specialization_energy.png",
        requires: [NOT_WILDERNESS_ORIGIN],
        jobs: { technician: 100 },
        permittedSets: ["energy"]
      },
      // P10.8: strategic specializations (wiki 4.5.2 "District specialization"). They need a strategic deposit
      // (js/planetary-features-data.js STRATEGIC_DEPOSITS, rule "deposit": only bodies with deposit features) and swap
      // every job of the base job on the planet ("Swaps Technicians into Mote Harvesters", Jobs page "zone on planet").
      {
        id: "volatileMotesHarvesting",
        i18nKey: "specializationVolatileMotesHarvesting",
        img: "districts_specialization/District_specialization_volatile_motes.png",
        requires: [{ type: "deposit", specialization: "volatileMotesHarvesting" }],
        jobs: { mote_harvester: 100 },
        permittedSets: ["energy"]
      },
      {
        id: "solarFarmingBays",
        i18nKey: "specializationSolarFarmingBays",
        img: "districts_specialization/District_specialization_food.png",
        requires: [{ type: "celestial", ids: ["habitat"] }],
        jobs: { farmer: 100 },
        permittedSets: ["energy", "food"]
      }
    ]
  },
  mining: {
    i18nKey: "districtMining",
    img: "districs/district_mining.png",
    jobs: { miner: 200 },
    // Vivienda (×100) y mantenimiento por copia (P7.1, página "Districts" 4.5); +100 con consciencia gestalt, +300 con Idilio Agrario.
    housing: 200,
    gestaltHousing: 100,
    agrarianIdyllHousing: 300,
    upkeep: { energy: -1 },
    lockedTooltipKey: "specializationRequiresMinerals",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "mineralExtraction",
        i18nKey: "specializationMineralExtraction",
        img: "districts_specialization/District_specialization_minerals.png",
        requires: [NOT_WILDERNESS_ORIGIN],
        jobs: { miner: 100 },
        permittedSets: ["minerals"]
      },
      {
        id: "subterraneanUrbanization",
        i18nKey: "specializationSubterraneanUrbanization",
        img: "districts_specialization/District_specialization_minerals.png",
        requires: [{ type: "unmodelled", i18nKey: "reqSubterraneanOrigin" }],
        jobs: { miner: 50, trader: 50 },
        permittedSets: ["minerals", "origin"]
      },
      {
        id: "gravitonicMines",
        i18nKey: "specializationGravitonicMines",
        img: "districts_specialization/District_specialization_minerals.png",
        requires: [{ type: "unmodelled", i18nKey: "reqMountainsInTheSky" }],
        jobs: { miner: 50, physicist: 50 },
        permittedSets: ["minerals"]
      },
      {
        id: "rareCrystalExtraction",
        i18nKey: "specializationRareCrystalExtraction",
        img: "districts_specialization/District_specialization_rare_crystals.png",
        requires: [{ type: "deposit", specialization: "rareCrystalExtraction" }],
        jobs: { crystal_miner: 100 },
        permittedSets: ["minerals"]
      },
      {
        // "Per 100 Miners: −2 Minerals, +6 Energy" (Effects column): per staffed job of the Miners category, once for the planet.
        id: "betharianProcessing",
        i18nKey: "specializationBetharianProcessing",
        img: "districts_specialization/District_specialization_betharian.png",
        requires: [{ type: "deposit", specialization: "betharianProcessing" }],
        jobs: { miner: 100 },
        jobCategoryFlat: { miners: { minerals: -2, energy: 6 } },
        permittedSets: ["minerals"]
      }
    ]
  },
  agriculture: {
    i18nKey: "districtAgriculture",
    img: "districs/district_farming.png",
    jobs: { farmer: 200 },
    // Vivienda (×100) y mantenimiento por copia (P7.1, página "Districts" 4.5); +100 con consciencia gestalt, +300 con Idilio Agrario.
    housing: 200,
    gestaltHousing: 100,
    agrarianIdyllHousing: 300,
    // P7.10: Agrarian Utopias (tecnología solo con Idilio Agrario) +200 por copia según "Districts" 4.5.2
    // (la página "Society research" dice +100: discrepancia a revisar en P14).
    technologyHousing: [
      { id: "agrarianUtopias", i18nKey: "techAgrarianUtopias", housing: 200, requiredCivics: ["civicAgrarianIdyll"] }
    ],
    upkeep: { energy: -1 },
    lockedTooltipKey: "specializationRequiresFood",
    slotsPerSpecialization: 3,
    specializationOptions: [
      {
        id: "agriculturalFocus",
        i18nKey: "specializationAgriculturalFocus",
        img: "districts_specialization/District_specialization_food.png",
        requires: [NOT_WILDERNESS_ORIGIN, ANGLERS_WET_CLIMATE_BLOCK],
        jobs: { farmer: 100 },
        permittedSets: ["food"]
      },
      {
        // P10.10: replaces Agricultural Focus with Anglers on a wet-climate world.
        id: "aquaculture",
        i18nKey: "specializationAquaculture",
        img: "districts_specialization/District_specialization_angler.png",
        requires: ANGLERS_WET_CLIMATE,
        jobs: { angler: 50, pearl_diver: 50 },
        permittedSets: ["food"]
      },
      {
        id: "agrarianVillages",
        i18nKey: "specializationAgrarianVillages",
        img: "districts_specialization/District_specialization_food.png",
        requires: [{ type: "civic", keys: ["civicAgrarianIdyll"] }, ANGLERS_WET_CLIMATE_BLOCK],
        jobs: { farmer: 75, trader: 75 },
        permittedSets: ["food", "origin"]
      },
      {
        id: "coastalHamlets",
        i18nKey: "specializationCoastalHamlets",
        img: "districts_specialization/District_specialization_food.png",
        requires: [{ type: "civic", keys: ["civicAgrarianIdyll"] }, ...ANGLERS_WET_CLIMATE],
        jobs: { farmer: 50, artisan: 50, trader: 50 },
        permittedSets: ["food", "origin"]
      },
      {
        id: "exoticGasCapture",
        i18nKey: "specializationExoticGasCapture",
        img: "districts_specialization/District_specialization_exotic_gases.png",
        requires: [{ type: "deposit", specialization: "exoticGasCapture" }],
        jobs: { gas_extractor: 100 },
        permittedSets: ["food"]
      }
    ]
  }
};

export const RESOURCE_DISTRICT_ORDER = ["generator", "mining", "agriculture"];

/**
 * P10.6: Wilderness districts and specializations (game files 4.5.4: common/districts/05_wilderness_districts.txt,
 * common/zones/03_wilderness_zones.txt). They replace the regular districts on bodies that use the standard district
 * set (regular planets, Gaia, Tomb and Relic Worlds); other bodies keep their own districts. Housing and jobs ×100 per
 * copy; costs (minerals, biomass) are shown in the district tooltip. Specialization jobs are the gestalt ones (hive
 * ids of the simulator: Fabricator = Metallurgist, calculators = researchers, Coordinator = the Administrator job of
 * the authority, Logistics Drone = Trader, Warrior Drone = Soldier); no Wilderness specialization changes housing.
 * permittedSets follow the regular specialization with the same building set (game included / excluded sets).
 * The resource districts also offer the regular strategic specializations (deposit rule), whose zones do not exclude
 * Wilderness.
 */
const wildernessZone = (id, i18nKey, icon, extra) => ({ id, i18nKey, img: `districts_specialization/District_specialization_wilderness_${icon}.png`, housing: 0, ...extra });
const strategicOptions = (cat) => DISTRICTS[cat].specializationOptions.filter((option) => (option.requires || []).some((rule) => rule.type === "deposit"));
export const WILDERNESS_DISTRICTS = {
  urban: {
    i18nKey: "districtCommunalBiome",
    img: "districs/district_craglands.png",
    jobs: {},
    housing: 100,
    upkeep: { energy: -2 },
    cost: { minerals: 500, biomass: 50 },
    specializationSlots: 2,
    slotsPerSpecialization: 3,
    specializationOptions: [
      wildernessZone("heartgrove", "specializationHeartgrove", "urban", { excludedSets: ["energy", "minerals", "food"] }),
      wildernessZone("moltgut", "specializationMoltgut", "foundry", { jobs: { metallurgist: 100 }, permittedSets: ["foundry"] }),
      wildernessZone("thinkstem", "specializationThinkstem", "research", { jobs: { physicist: 30, biologist: 30, engineer: 30 }, permittedSets: ["research", "origin"] }),
      wildernessZone("singingCliffs", "specializationSingingCliffs", "unity", { administratorJobs: 100, permittedSets: ["unity", "origin"] }),
      wildernessZone("harmonicCore", "specializationHarmonicCore", "spawning", { jobs: { physicist: 20, biologist: 20, engineer: 20 }, administratorJobs: 40, permittedSets: ["research", "unity", "origin"] }),
      wildernessZone("threadway", "specializationThreadway", "trade", { jobs: { trader: 100 }, permittedSets: ["trade"] }),
      wildernessZone("commandBulb", "specializationCommandBulb", "fortress", { jobs: { soldier: 100 }, permittedSets: ["fortress"] })
    ]
  },
  generator: {
    i18nKey: "districtPhotosynthesisField",
    img: "districs/district_photosynthesis_fields.png",
    jobs: { technician: 200 },
    housing: 100,
    upkeep: { energy: -1 },
    cost: { minerals: 300, biomass: 50 },
    lockedTooltipKey: DISTRICTS.generator.lockedTooltipKey,
    slotsPerSpecialization: 3,
    specializationOptions: [wildernessZone("solarMycolungs", "specializationSolarMycolungs", "energy", { jobs: { technician: 100 }, permittedSets: ["energy"] }), ...strategicOptions("generator")]
  },
  mining: {
    i18nKey: "districtHollowMountain",
    img: "districs/district_hollow_mountains.png",
    jobs: { miner: 200 },
    housing: 100,
    upkeep: { food: -1 },
    cost: { minerals: 300, biomass: 50 },
    lockedTooltipKey: DISTRICTS.mining.lockedTooltipKey,
    slotsPerSpecialization: 3,
    specializationOptions: [wildernessZone("orespine", "specializationOrespine", "minerals", { jobs: { miner: 100 }, permittedSets: ["minerals"] }), ...strategicOptions("mining")]
  },
  agriculture: {
    i18nKey: "districtOrchardForest",
    img: "districs/district_orchard_forests.png",
    jobs: { farmer: 200 },
    housing: 100,
    upkeep: { energy: -1 },
    cost: { minerals: 300, biomass: 50 },
    lockedTooltipKey: DISTRICTS.agriculture.lockedTooltipKey,
    slotsPerSpecialization: 3,
    specializationOptions: [wildernessZone("bloomloom", "specializationBloomloom", "food", { jobs: { farmer: 100 }, permittedSets: ["food"] }), ...strategicOptions("agriculture")]
  }
};

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
  exotic_gases: { i18nKey: "resourceExoticGases", img: "resources/Exotic_gases.png" },
  minor_artifacts: { i18nKey: "resourceMinorArtifacts", img: "resources/Minor_artifacts.png" },
  astral_threads: { i18nKey: "resourceAstralThreads", img: "resources/Astral_threads.png" },
  // P10.5: Neural Chips and Synaptic Lathe districts. Icon exported from the game (advanced_logic_large.dds, T2525).
  advanced_logic: { i18nKey: "resourceAdvancedLogic", img: "resources/Advanced_logic.png" },
  // P10.8: produced by selectable blockers (Nanite Harvest Basin, Shroudstone, Ruined Sanctum of the Dreamer).
  nanites: { i18nKey: "resourceNanites", img: "resources/Nanites.png" },
  zro: { i18nKey: "resourceZro", img: "resources/Zro.png" },
  // P10.6: Wilderness origin; only a cost (districts, capitals, buildings). T1011: no job or building produces it: the
  // game sets the empire stock to its Wilderness pops every month (on_biomass_monthly), shown in the conditions panel.
  biomass: { i18nKey: "resourceBiomass", img: "resources/Biomass.png" }
};

/**
 * Estratos de empleo, de mayor a menor rango (página "Jobs" de la wiki, v4.3):
 * gobernante (stratum "Elite" de la wiki: Político), especialista, obrero y
 * "especial", para los empleos que no pertenecen a ninguno de los tres
 * (civiles, subversivos como criminales, esclavos...). El panel de empleos
 * los agrupa en este orden.
 */
export const JOB_STRATA = ["ruler", "specialist", "worker", "special"];
export const STRATUM_I18N_KEYS = {
  ruler: "stratumRuler",
  specialist: "stratumSpecialist",
  worker: "stratumWorker",
  special: "stratumSpecial"
};

/**
 * Diccionario de empleos: id -> { i18nKey, img (dentro de jobs/), stratum }.
 * Los de stratum "special" salen de las secciones "Special jobs", "Subversive
 * jobs" y "Slave jobs" de la wiki; ningún edificio, distrito ni designación
 * de este simulador los genera todavía (dependen de población sin empleo,
 * delincuencia, esclavitud o edificios no modelados), así que de momento no
 * aparecen en el panel hasta que alguna fuente les dé capacidad.
 */
export const JOBS = {
  technician: { i18nKey: "jobTechnician", img: "jobs/job_technician.png", stratum: "worker" },
  miner: { i18nKey: "jobMiner", img: "jobs/job_miner.png", stratum: "worker" },
  farmer: { i18nKey: "jobFarmer", img: "jobs/job_farmer.png", stratum: "worker" },
  metallurgist: { i18nKey: "jobMetallurgist", img: "jobs/job_foundry.png", stratum: "specialist" },
  artisan: { i18nKey: "jobArtisan", img: "jobs/job_artisan.png", stratum: "specialist" },
  enforcer: { i18nKey: "jobEnforcer", img: "jobs/job_enforcer.png", stratum: "specialist" },
  educator: { i18nKey: "jobEducator", img: "jobs/job_educator.png", stratum: "specialist" },
  soldier: { i18nKey: "jobSoldier", img: "jobs/job_soldier.png", stratum: "specialist" },
  trader: { i18nKey: "jobTrader", img: "jobs/job_trader.png", stratum: "specialist" },
  entertainer: { i18nKey: "jobEntertainer", img: "jobs/job_entertainer.png", stratum: "specialist" },
  physicist: { i18nKey: "jobPhysicist", img: "jobs/job_physicist.png", stratum: "specialist" },
  engineer: { i18nKey: "jobEngineer", img: "jobs/job_engineer.png", stratum: "specialist" },
  biologist: { i18nKey: "jobBiologist", img: "jobs/job_biologist.png", stratum: "specialist" },
  priest: { i18nKey: "jobPriest", img: "jobs/job_priest.png", stratum: "specialist" },
  bureaucrat: { i18nKey: "jobBureaucrat", img: "jobs/job_bureaucrat.png", stratum: "specialist" },
  politician: { i18nKey: "jobPolitician", img: "jobs/job_politician.png", stratum: "ruler" },
  // P10.2: Clerk (worker, individualist), created by Residential Arcologies and City Segments.
  clerk: { i18nKey: "jobClerk", img: "jobs/job_clerk.png", stratum: "worker" },
  // P10.6: Volcanic Worlds (wiki 4.5.2 "Jobs"). Thermoforger = Miner job swap (worker), Thermotechnic Mentor (specialist).
  thermoforger: { i18nKey: "jobThermoforger", img: "jobs/job_miner.png", stratum: "worker" },
  // P10.8: strategic job swaps (wiki 4.5.2 "Jobs"; robotic founder variants not modelled).
  crystal_miner: { i18nKey: "jobCrystalMiner", img: "jobs/job_crystal_miner.png", stratum: "worker" },
  mote_harvester: { i18nKey: "jobMoteHarvester", img: "jobs/job_mote_harvester.png", stratum: "worker" },
  gas_extractor: { i18nKey: "jobGasExtractor", img: "jobs/job_gas_extractor.png", stratum: "worker" },
  angler: { i18nKey: "jobAngler", img: "jobs/job_angler.png", stratum: "worker" },
  pearl_diver: { i18nKey: "jobPearlDiver", img: "jobs/job_pearl_diver.png", stratum: "specialist" },
  thermotechnic_mentor: { i18nKey: "jobThermotechnicMentor", img: "jobs/job_polytechnic_mentor.png", stratum: "specialist" },
  // Especialistas ligados a edificios de ética/principio
  death_priest: { i18nKey: "jobDeathPriest", img: "jobs/job_death_priest.png", stratum: "specialist" },
  mortal_initiate: { i18nKey: "jobMortalInitiate", img: "jobs/job_mortal_initiate.png", stratum: "specialist" },
  experiment_engineer: { i18nKey: "jobExperimentEngineer", img: "jobs/job_experiment_engineer.png", stratum: "specialist" },
  // Gestalt (drones). Los de "complex drone" equivalen al estrato de especialista.
  synapse_drone: { i18nKey: "jobSynapseDrone", img: "jobs/job_synapse_drone.png", stratum: "specialist" },
  coordinator: { i18nKey: "jobCoordinator", img: "jobs/job_coordinator.png", stratum: "specialist" },
  logistic_drone: { i18nKey: "jobLogisticDrone", img: "jobs/job_trader.png", stratum: "specialist" },
  hunter_seeker_drone: { i18nKey: "jobHunterSeekerDrone", img: "jobs/job_patrol_drone.png", stratum: "specialist" },
  replicator: { i18nKey: "jobReplicator", img: "jobs/job_replicator.png", stratum: "specialist" },
  // T1011: gestalt jobs created only by Wilderness buildings (game files 4.5.4, common/pop_jobs/04_gestalt_jobs.txt):
  // Cradle of Rebirth (Spawning Drone), Chemical Digester, Crystal Bed and Exotic Gas Filters. A Wilderness empire swaps
  // them for the Broodsymbiont, Motesymbiont, Crystalsymbiont and Gaseosymbiont (js/job-swap-data.js).
  spawning_drone: { i18nKey: "jobSpawningDrone", img: "jobs/job_spawning_drone.png", stratum: "specialist" },
  chemist_drone: { i18nKey: "jobChemDrone", img: "jobs/job_chemist_drone.png", stratum: "specialist" },
  translucer_drone: { i18nKey: "jobLensingDrone", img: "jobs/job_translucer_drone.png", stratum: "specialist" },
  gas_refiner_drone: { i18nKey: "jobRefineryDrone", img: "jobs/job_gas_refiner_drone.png", stratum: "specialist" },
  // Especiales
  colonist: { i18nKey: "jobColonist", img: "jobs/job_colonist.png", stratum: "special" },
  civilian: { i18nKey: "jobCivilian", img: "jobs/job_civilian.png", stratum: "special" },
  criminal: { i18nKey: "jobCriminal", img: "jobs/job_criminal.png", stratum: "special" },
  test_subject: { i18nKey: "jobTestSubject", img: "jobs/job_test_subject.png", stratum: "special" },
  servant: { i18nKey: "jobServant", img: "jobs/job_servant.png", stratum: "special" },
  // P19.3: jobs created by branch office buildings of another empire (wiki 4.5.2 "Jobs").
  prosperity_preacher: { i18nKey: "jobProsperityPreacher", img: "jobs/job_numistic_priest.png", stratum: "specialist" },
  medical_worker: { i18nKey: "jobMedicalWorker", img: "jobs/job_healthcare.png", stratum: "specialist" },
  augmentor: { i18nKey: "jobAugmentor", img: "jobs/job_augmentor.png", stratum: "specialist" },
  roboticist: { i18nKey: "jobRoboticist", img: "jobs/job_roboticist.png", stratum: "specialist" },
  empathic_marketer: { i18nKey: "jobEmpathicMarketer", img: "jobs/job_telepath.png", stratum: "specialist" },
  merchant: { i18nKey: "jobMerchant", img: "jobs/job_merchant.png", stratum: "ruler" },
  orderly: { i18nKey: "jobOrderly", img: "jobs/job_slave_orderly.png", stratum: "worker" }
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
  // P10.2: Clerk, wiki 4.5.2 "Jobs" (+3 trade, +300 amenities = 3 per pop; its +1% trade from jobs is JOB_RESOURCE_MULT).
  clerk: { trade: 3, amenities: 3 },
  // P10.6: Thermoforger (Miner swap on Volcanic planets): +5 minerals +0.5 alloys, −1 energy.
  thermoforger: { minerals: 5, alloys: 0.5, energy: -1 },
  // P10.8: Crystal Miner (Miner swap, Rare Crystal Extraction), Mote Harvester (Technician swap, Volatile Motes Harvesting),
  // Gas Extractor (Farmer swap, Exotic Gas Capture: Jobs page +0.5 exotic gases; the specialization page says +0.75, P14).
  crystal_miner: { minerals: 2, rare_crystals: 0.5 },
  mote_harvester: { energy: 3, volatile_motes: 0.5 },
  gas_extractor: { food: 3, exotic_gases: 0.5 },
  angler: { food: 6, trade: 2 },
  pearl_diver: { consumer_goods: 6, trade: 2, minerals: -4, food: -3 },
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
  // Culto a la Muerte (principio) y Cámaras de experimentación (ética materialista)
  death_priest: { unity: 2, amenities: 4, society: 0.5, consumer_goods: -2 },
  mortal_initiate: { unity: 1, society: 0.5, amenities: 2 },
  // T2523: 4.6.0 game files (common/pop_jobs): +1 of each research type, −1 consumer goods (−0.5 more with a science ministry, not modelled).
  experiment_engineer: { physics: 1, society: 1, engineering: 1, consumer_goods: -1 },
  // P10.6: Thermotechnic Mentor, "+1 Research" read as +1 of each research type (same reading as above); +1 unity.
  // Its workforce-scaling bonuses are JOB_WORKFORCE_SCALING; gestalt upkeep in GESTALT_JOB_UPKEEP (Pyroclastic Drone).
  thermotechnic_mentor: { physics: 1, society: 1, engineering: 1, unity: 1, consumer_goods: -3 },
  // Gestalt (el mantenimiento depende de la especie: ver GESTALT_JOB_UPKEEP)
  synapse_drone: { unity: 3 },
  coordinator: { unity: 3 },
  logistic_drone: { trade: 6, amenities: 5 },
  hunter_seeker_drone: { unity: 0.5 },
  // La wiki también da +1 de ensamblaje de población mecánica (no modelado).
  replicator: { alloys: -1 },
  // T1011 (game files 4.5.4): the Spawning Drone only has upkeep (GESTALT_JOB_UPKEEP; its pop growth is not modelled);
  // the refinery drones of a non-catalytic empire.
  spawning_drone: {},
  chemist_drone: { volatile_motes: 2, minerals: -10 },
  translucer_drone: { rare_crystals: 2, minerals: -10 },
  gas_refiner_drone: { exotic_gases: 2, minerals: -10 },
  // Élite
  politician: { unity: 5, amenities: 3, consumer_goods: -3 },
  // Especiales (wiki: Special jobs, Subversive jobs y Slave jobs)
  // Colonista: +5 servicios; el +1 de recurso depende de la especie (ver computeTotals). No se modelan su estabilidad, felicidad ni velocidad de construcción.
  colonist: { amenities: 5 },
  civilian: { amenities: 0.5, trade: 1 },
  criminal: {},
  test_subject: { physics: 0.5, society: 1, engineering: 0.5, amenities: 3, consumer_goods: -1 },
  servant: { amenities: 4 },
  // P19.3: branch office jobs (wiki 4.5.2 "Jobs", per 100 workforce). Not modelled: pop growth / assembly speed (Medical
  // Worker, Augmentor, Roboticist +2 mechanical pop assembly), Augmentor cybernetic bonus, Orderly +2.5 % Experiment
  // Engineer / Test Subject efficiency, Empathic Marketer Shroud bonus. P21.3: their job swaps (Prosperity Preacher with
  // Manager / Steward conditions, Politician → Merchant with Corporate Embassy...) come from js/job-swap-data.js.
  prosperity_preacher: { unity: 3, amenities: 2, consumer_goods: -2 },
  medical_worker: { amenities: 7.5, consumer_goods: -1 },
  augmentor: { amenities: 5, society: 1.5, engineering: 1.5, alloys: -1 },
  roboticist: { alloys: -2 },
  empathic_marketer: { trade: 6, consumer_goods: -1 },
  merchant: { unity: 3.5, trade: 6, amenities: 3, consumer_goods: -3 },
  orderly: { amenities: 5 }
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
/**
 * P16.12: salida de los civiles (pops sin empleo, entrada manual), wiki 4.5.2 "Jobs" → Special jobs, salida por 100 de
 * fuerza laboral (unidades reales por pop, como JOB_OUTPUTS). Individualista: Civilian (+50 servicios, +1 comercio).
 * Gestalt: Maintenance Drone (+400 servicios, +1 comercio). No se modelan los cambios de empleo Hedonist (Pleasure
 * Seekers) ni Tourist (Resort World).
 */
export const CIVILIAN_OUTPUTS = {
  individualist: { i18nKey: "jobCivilian", output: { amenities: 0.5, trade: 1 } },
  gestalt: { i18nKey: "jobMaintenanceDrone", output: { amenities: 4, trade: 1 } },
  // T1011: a Wilderness empire has Pliable Biomass instead of Maintenance Drones (game files 4.5.4,
  // wilderness_maintenance_drone): no output.
  wilderness: { i18nKey: "jobPliableBiomass", output: {} }
};

/** T1011: key of CIVILIAN_OUTPUTS for the empire. */
export function civilianOutputKind(gestalt, originId) {
  if (originId === "wilderness") return "wilderness";
  return gestalt ? "gestalt" : "individualist";
}

/** P10.2: "+X% <resource> from jobs" granted per staffed job (wiki 4.5.2 "Jobs"): fraction per job, step 4 of the calculation. */
export const JOB_RESOURCE_MULT = {
  clerk: { trade: 0.01 }
};

/**
 * P10.6: per-job bonuses that scale with the workforce of other jobs on the planet (wiki 4.5.2 "Jobs").
 * Thermotechnic Mentor: per 100 workforce (= 1 staffed pop) producing minerals / energy / consumer goods / alloys,
 * +0.05 unity / physics / society / engineering, up to +3 each per mentor. A job "produces" a resource when its base
 * output (JOB_OUTPUTS, after the gestalt upkeep swap) is positive for it; Thermoforgers count for minerals and alloys.
 * Applied as a per-job bonus (step 2, own breakdown line), so job efficiency and "% from jobs" apply on top.
 */
export const JOB_WORKFORCE_SCALING = {
  thermotechnic_mentor: { perPop: 0.05, max: 3, outputs: { minerals: "unity", energy: "physics", consumer_goods: "society", alloys: "engineering" } }
};

export const JOB_EFFECTS = {
  enforcer: { stability: 0.2, crime: -25, defenseArmies: 1 },
  educator: { crime: -20, defenseArmies: 0.5 },
  soldier: { navalCapacity: 4, stability: 0.15, defenseArmies: 1 },
  hunter_seeker_drone: { crime: -20, defenseArmies: 1 }
};

/**
 * Tipos de especie (solo cambian el mantenimiento de los empleos de
 * conciencia gestalt, ver GESTALT_JOB_UPKEEP) y el recurso que consume cada
 * una: orgánica comida, litoide minerales, infernal aleaciones, máquina
 * energía. Una Inteligencia de Máquina solo puede ser especie máquina y una
 * Mente Colmena no puede serlo (ver allowedSpeciesTypes).
 */
export const SPECIES_TYPES = [
  { id: "organic", i18nKey: "speciesOrganic", upkeepResource: "food" },
  { id: "lithoid", i18nKey: "speciesLithoid", upkeepResource: "minerals" },
  { id: "infernal", i18nKey: "speciesInfernal", upkeepResource: "alloys" },
  { id: "machine", i18nKey: "speciesMachine", upkeepResource: "energy" }
];

/** Tipos de especie elegibles según la autoridad. */
export function allowedSpeciesTypes(authorityId) {
  if (authorityId === "machineIntelligence") return ["machine"];
  if (authorityId === "hiveMind") return ["organic", "lithoid", "infernal"];
  return SPECIES_TYPES.map((type) => type.id);
}

/**
 * Mantenimiento por empleo en conciencia gestalt (página "Jobs" de la wiki),
 * que sustituye al mantenimiento en bienes de consumo del imperio
 * individualista. `machine` es la cantidad cuando la especie es máquina
 * (energía) y `hive` la de las demás especies (comida, minerales o
 * aleaciones según SPECIES_TYPES). La wiki da cifras para energía y
 * minerales; para comida y aleaciones no hay cifra propia y se usa la de
 * minerales (`hive`): es una suposición.
 */
export const GESTALT_JOB_UPKEEP = {
  physicist: { machine: 3, hive: 4 },
  engineer: { machine: 3, hive: 4 },
  biologist: { machine: 3, hive: 4 },
  experiment_engineer: { machine: 6, hive: 6 },
  synapse_drone: { machine: 2, hive: 2 },
  coordinator: { machine: 4, hive: 4 },
  logistic_drone: { machine: 2, hive: 2 },
  // P10.6: Pyroclastic Drone (gestalt Thermotechnic Mentor): the wiki gives −7 minerals for every gestalt empire.
  thermotechnic_mentor: { fixed: { minerals: 7 } },
  // T1011: Spawning Drone (game files 4.5.4): 5 food (organic), 5 minerals (lithoid) or 2 alloys (infernal) per job.
  spawning_drone: { bySpecies: { organic: { food: 5 }, lithoid: { minerals: 5 }, infernal: { alloys: 2 } } }
};

/** Estadística de JOB_EFFECTS -> { i18nKey, icono (carpeta "modifiers/" de la API de assets; nombres verificados contra StellarisAssetsTree.txt) }. */
export const STAT_EFFECTS = {
  stability: { i18nKey: "statStability", img: "modifiers/mod_planet_stability_add.png" },
  crime: { i18nKey: "statCrime", img: "modifiers/mod_planet_crime_add.png" },
  defenseArmies: { i18nKey: "statDefenseArmies", img: "modifiers/mod_planet_defense_armies_add.png" },
  navalCapacity: { i18nKey: "statNavalCapacity", img: "modifiers/mod_navy_size_add.png" }
};

/**
 * Reglas de requisitos de los edificios (ver js/building-requirements.js).
 */
const NOT_GESTALT = { type: "notGestalt" };
const USES_PRIEST_JOBS = { type: "usesPriestJobs", value: true };
const NOT_USES_PRIEST_JOBS = { type: "usesPriestJobs", value: false };
const USES_CONSUMER_GOODS = { type: "usesConsumerGoods" };
const CAPITAL_TIER_2 = { type: "capitalTier", min: 2 };
const civic = (...keys) => ({ type: "civic", keys });
const notCivic = (...keys) => ({ type: "notCivic", keys });
const notDesignation = (...ids) => ({ type: "notDesignation", ids });
const notCelestial = (...ids) => ({ type: "notCelestial", ids });
const ethic = (...ids) => ({ type: "ethic", ids });
const authority = (...ids) => ({ type: "authority", ids });
/** P10.10: requirement the simulator does not model (origin, capital, astral action...): shown, never blocks. */
const unmodelled = (i18nKey) => ({ type: "unmodelled", i18nKey });
const NOT_WILDERNESS = NOT_WILDERNESS_ORIGIN;
const NOT_COMMAND_CENTER = unmodelled("reqNotCommandCenter");
const EXPERIMENTAL_SENTENCING = civic("civicTwistedExperimenters", "civicCorporateTwistedExperimenters", "civicHiveTwistedExperimenters");

/** P10.5: technology requirement of a Synaptic Lathe building (technologies are not modelled: shown, never blocks). */
const LATHE_TECH = (i18nKey) => ({ type: "unmodelled", i18nKey });

/**
 * P10.5: a Synaptic Lathe building. Extra fields only these use:
 *  - stability: flat stability points (conditions panel).
 *  - upkeepMult: { buildings, districtEnergy } fraction on the upkeep of every building (capital included) and on the
 *    energy upkeep of the districts.
 *  - jobResourcePct: { all | resourceId: % } "Resources from jobs" (like the designation's).
 *  - perNeuralChips: per 100 Neural Chips (one chip job): resources ("research" = each of the three) or jobResourcePct.
 *  - infoKeys: effects the simulator does not model (purge speed, computing research speed, naval capacity...), shown.
 */
// T2523: costs and upkeep from the 4.6.0 game files (common/buildings): 1500 alloys and 300 of the strategic resource;
// the Validator and the Cogitator ("big" = true) cost 800 Advanced Logic and keep −8 energy and −2 of the resource.
function latheBuilding(id, img, i18nKey, strategic, extra, big = false) {
  return {
    id,
    img: `buildings/${img}`,
    i18nKey,
    category: "lathe",
    jobs: {},
    colonyLimit: 2,
    upkeep: id === "lathe_reactor" ? { [strategic]: -4 } : big ? { energy: -8, [strategic]: -2 } : { energy: -5, [strategic]: -1 },
    cost: { time: 480, items: [{ resource: "alloys", amount: 1500 }, { resource: strategic, amount: 300 }, { resource: "advanced_logic", amount: big ? 800 : 600 }] },
    sets: ["lathe"],
    ...extra
  };
}

/**
 * T1011: a Wilderness building (game files 4.5.4, common/buildings/21_wilderness_buildings.txt). Needs the Wilderness
 * origin and, for upgrades, the capital tier of its allow (has_upgraded_capital = II, major = III, fully = IV). Game jobs
 * in the simulator's ids (Logistic Drone, research drones = Physicist / Biologist / Engineer, Coordinator = Synapse Drone
 * as in the Hive Core, Agri / Tech / Mining Drone = Farmer / Technician / Miner, Fabricator = Metallurgist, Warrior Drone
 * = Soldier); the Fallen Empire jobs of their tables are left out. Building sets: government = "origin", farming /
 * generator / mining = food / energy / minerals. Technology prerequisites are not modelled, as for the other buildings.
 * cost: [[resource, amount]...], game time in days.
 */
function wildernessBuilding(id, img, i18nKey, category, { tier, upgradesFrom, capital, cost, time, ...extra }) {
  const requires = [WILDERNESS_ORIGIN];
  if (capital) requires.push({ type: "capitalTier", min: capital });
  return {
    id,
    requires,
    img: `buildings/${img}`,
    i18nKey,
    category,
    ...(tier ? { tier } : {}),
    ...(upgradesFrom ? { upgradesFrom } : {}),
    jobs: {},
    colonyLimit: "none",
    cost: { time, items: cost.map(([resource, amount]) => ({ resource, amount })) },
    ...extra
  };
}

/** T1011: "+X per job" bonus of a whole Wilderness chain level on several jobs (planet_<category>_<resource>_produces_add). */
const perJob = (jobIds, resource, amount) => Object.fromEntries(jobIds.map((jobId, index) => [jobId, { [Array.isArray(resource) ? resource[index] : resource]: amount }]));
const RESEARCH_JOBS = ["physicist", "biologist", "engineer"];
const RESEARCH_OUTPUTS = ["physics", "society", "engineering"];
const each = (jobIds, value) => Object.fromEntries(jobIds.map((jobId) => [jobId, value]));

/**
 * T1011: the Wilderness building catalogue. Left out: Subterranean Cache (storage, not modelled, GDD §10) and Planetary
 * Shield Canopy (orbital bombardment and storm damage only, like the Planetary Shield Generator the simulator does not
 * have). Avatar Cradle: its extra amenities while an Avatar Chamber / Forest / Cortex stands on the planet are not
 * modelled (infoKeys). planet_bureaucrats_produces_mult / pop_<job>_bonus_workforce_mult = job efficiency;
 * planet_pops_trade_produces_mult = "% trade from jobs" (jobResourceMult).
 */
const WILDERNESS_BUILDINGS = [
  wildernessBuilding("cradle_of_rebirth", "seed_cradle_2.png", "buildingCradleOfRebirth", "other", {
    jobs: { spawning_drone: 100 }, upkeep: { food: -2 }, cost: [["food", 400], ["biomass", 400]], time: 360, sets: ["origin"], infoKeys: ["wildernessInfoSpawning"]
  }),
  wildernessBuilding("tendril_cradle_1", "tendril_cradle_building_1.png", "buildingTendrilCradle", "other", {
    tier: 1, jobs: { logistic_drone: 100 }, upkeep: { minerals: -2 }, cost: [["minerals", 400], ["biomass", 100]], time: 360, sets: ["origin", "trade"]
  }),
  wildernessBuilding("tendril_cradle_2", "tendril_cradle_building_2.png", "buildingThreadedSpan", "other", {
    tier: 2, upgradesFrom: "tendril_cradle_1", capital: 2, jobs: { logistic_drone: 200 }, upkeep: { minerals: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 480, sets: ["origin", "trade"]
  }),
  wildernessBuilding("tendril_cradle_3", "tendril_cradle_building_3.png", "buildingConveyrootNest", "other", {
    tier: 3, upgradesFrom: "tendril_cradle_2", capital: 3, colonyLimit: 1, jobs: { logistic_drone: 400 }, jobResourceMult: { trade: 0.1 },
    upkeep: { minerals: -8, rare_crystals: -1 }, cost: [["minerals", 800], ["biomass", 400], ["rare_crystals", 50]], time: 600, sets: ["origin", "trade"]
  }),
  wildernessBuilding("tendril_cradle_4", "tendril_cradle_building_4.png", "buildingPlanetaryThreadheart", "other", {
    tier: 4, upgradesFrom: "tendril_cradle_3", capital: 4, colonyLimit: 1, jobs: { logistic_drone: 400 }, jobResourceMult: { trade: 0.15 },
    upkeep: { minerals: -10, rare_crystals: -2 }, cost: [["minerals", 2000], ["biomass", 800], ["rare_crystals", 100]], time: 720, sets: ["origin", "trade"]
  }),
  wildernessBuilding("brain_node_1", "brain_node_1.png", "buildingResearchGrowth", "research", {
    tier: 1, jobs: each(RESEARCH_JOBS, 30), upkeep: { energy: -2 }, cost: [["minerals", 400], ["biomass", 100]], time: 240, sets: ["origin", "research"]
  }),
  wildernessBuilding("brain_node_2", "brain_node_2.png", "buildingResearchGrove", "research", {
    tier: 2, upgradesFrom: "brain_node_1", capital: 2, jobs: each(RESEARCH_JOBS, 60), upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 360, sets: ["origin", "research"]
  }),
  wildernessBuilding("brain_node_3", "brain_node_3.png", "buildingExoticResearchEnclosure", "research", {
    tier: 3, upgradesFrom: "brain_node_2", capital: 3, colonyLimit: 1, jobs: each(RESEARCH_JOBS, 120), jobModifiers: perJob(RESEARCH_JOBS, RESEARCH_OUTPUTS, 0.25),
    upkeep: { energy: -8, exotic_gases: -1 }, cost: [["minerals", 800], ["biomass", 400], ["exotic_gases", 50]], time: 480, sets: ["origin", "research"]
  }),
  wildernessBuilding("brain_node_4", "brain_node_4.png", "buildingAdvancedResearchEnclosure", "research", {
    tier: 4, upgradesFrom: "brain_node_3", capital: 4, colonyLimit: 1, jobs: each(RESEARCH_JOBS, 120), jobModifiers: perJob(RESEARCH_JOBS, RESEARCH_OUTPUTS, 0.25),
    jobEfficiency: each(RESEARCH_JOBS, 0.05), upkeep: { energy: -10, exotic_gases: -2 }, cost: [["minerals", 2000], ["biomass", 800], ["exotic_gases", 100]], time: 600, sets: ["origin", "research"]
  }),
  wildernessBuilding("commensal_clearing_1", "building_commensal_clearing_1.png", "buildingCommensalClearing", "unity", {
    tier: 1, jobs: { synapse_drone: 100 }, upkeep: { energy: -1 }, cost: [["minerals", 200], ["biomass", 100]], time: 240, sets: ["origin", "unity"]
  }),
  wildernessBuilding("commensal_clearing_2", "building_commensal_clearing_2.png", "buildingCommensalGrove", "unity", {
    tier: 2, upgradesFrom: "commensal_clearing_1", capital: 2, jobs: { synapse_drone: 200 }, upkeep: { energy: -2 }, cost: [["minerals", 400], ["biomass", 200]], time: 360, sets: ["origin", "unity"]
  }),
  wildernessBuilding("commensal_clearing_3", "building_commensal_clearing_3.png", "buildingCommensalValley", "unity", {
    tier: 3, upgradesFrom: "commensal_clearing_2", capital: 3, colonyLimit: 1, jobs: { synapse_drone: 400 }, jobModifiers: { synapse_drone: { unity: 0.25 } },
    upkeep: { energy: -5, rare_crystals: -1 }, cost: [["minerals", 600], ["biomass", 400], ["rare_crystals", 50]], time: 480, sets: ["origin", "unity"]
  }),
  wildernessBuilding("commensal_clearing_4", "building_commensal_clearing_4.png", "buildingCommensalBiome", "unity", {
    tier: 4, upgradesFrom: "commensal_clearing_3", capital: 4, colonyLimit: 1, jobs: { synapse_drone: 400 }, jobModifiers: { synapse_drone: { unity: 0.25 } },
    jobEfficiency: { synapse_drone: 0.05 }, upkeep: { energy: -8, rare_crystals: -2 }, cost: [["minerals", 800], ["biomass", 800], ["rare_crystals", 100]], time: 600, sets: ["origin", "unity"]
  }),
  ...[
    ["massive_growth", "massive_growth_", "farmer", "food", "food", "exotic_gases", ["buildingNutritiousDell", "buildingNutritiousUndergrowth", "buildingContourMegaplantation", "buildingSylviculturePlantation"]],
    ["bioelectric_stimulator", "bio_electric_stimulator_", "technician", "energy", "energy", "rare_crystals", ["buildingChloroplasticAcclimator", "buildingChloroplasticAccelerator", "buildingChloroplasticLensArray", "buildingChloroplasticCyst"]],
    ["churning_tunnels", "churning_tunnels_", "miner", "minerals", "minerals", "volatile_motes", ["buildingLithicBore", "buildingLithicFilters", "buildingLithicMacerator", "buildingLithicBaths"]]
  ].flatMap(([stem, icon, job, output, set, strategic, keys]) => [
    wildernessBuilding(`${stem}_1`, `${icon}1.png`, keys[0], "resource", {
      tier: 1, jobs: { [job]: 100 }, upkeep: { minerals: -2 }, cost: [["minerals", 400], ["biomass", 100]], time: 180, sets: [set]
    }),
    wildernessBuilding(`${stem}_2`, `${icon}2.png`, keys[1], "resource", {
      tier: 2, upgradesFrom: `${stem}_1`, capital: 2, jobs: { [job]: 200 }, upkeep: { minerals: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 240, sets: [set]
    }),
    wildernessBuilding(`${stem}_3`, `${icon}3.png`, keys[2], "resource", {
      tier: 3, upgradesFrom: `${stem}_2`, capital: 3, colonyLimit: 1, jobs: { [job]: 400 }, jobModifiers: { [job]: { [output]: 0.5 } },
      upkeep: { minerals: -8, [strategic]: -1 }, cost: [["minerals", 800], ["biomass", 400], [strategic, 50]], time: 360, sets: [set]
    }),
    wildernessBuilding(`${stem}_4`, `${icon}4.png`, keys[3], "resource", {
      tier: 4, upgradesFrom: `${stem}_3`, capital: 4, colonyLimit: 1, jobs: { [job]: 400 }, jobModifiers: { [job]: { [output]: 0.5 } }, jobEfficiency: { [job]: 0.05 },
      upkeep: { minerals: -10, [strategic]: -2 }, cost: [["minerals", 2000], ["biomass", 800], [strategic, 100]], time: 480, sets: [set]
    })
  ]),
  wildernessBuilding("natural_furnace_0", "natural_furnace_1.png", "buildingSmeltingPool", "foundry", {
    tier: 1, jobs: { metallurgist: 100 }, upkeep: { energy: -2 }, cost: [["minerals", 400], ["biomass", 100]], time: 180, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("natural_furnace_1", "natural_furnace_2.png", "buildingSmeltingKiln", "foundry", {
    tier: 2, upgradesFrom: "natural_furnace_0", capital: 3, jobs: { metallurgist: 200 }, upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 240, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("natural_furnace_2", "natural_furnace_3.png", "buildingSolidLightSmelter", "foundry", {
    tier: 3, upgradesFrom: "natural_furnace_1", capital: 3, colonyLimit: 1, jobs: { metallurgist: 400 }, jobModifiers: { metallurgist: { alloys: 0.5, minerals: -2 } },
    upkeep: { energy: -8, volatile_motes: -1 }, cost: [["minerals", 800], ["biomass", 400], ["volatile_motes", 50]], time: 360, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("natural_furnace_3", "natural_furnace_4.png", "buildingNanoSmelter", "foundry", {
    tier: 4, upgradesFrom: "natural_furnace_2", capital: 4, colonyLimit: 1, jobs: { metallurgist: 400 }, jobModifiers: { metallurgist: { alloys: 0.5, minerals: -2 } },
    jobEfficiency: { metallurgist: 0.05 }, upkeep: { energy: -10, volatile_motes: -2 }, cost: [["minerals", 2000], ["biomass", 800], ["volatile_motes", 100]], time: 480, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("avatar_chamber_1", "avatar_chamber_1.png", "buildingAvatarCradle", "housing", {
    tier: 1, housing: 300, amenities: 400, upkeep: { food: -2 }, cost: [["minerals", 400], ["biomass", 100]], time: 360, sets: ["origin", "unity"], infoKeys: ["wildernessInfoAvatarCradle"]
  }),
  // The game allows one Avatar Chamber per planet (its potential excludes a planet that already has one): colonyLimit 1.
  wildernessBuilding("avatar_chamber_2", "avatar_chamber_2.png", "buildingAvatarChamber", "housing", {
    tier: 2, upgradesFrom: "avatar_chamber_1", capital: 2, colonyLimit: 1, housing: 300, amenities: 600, jobEfficiency: { synapse_drone: 0.05 },
    upkeep: { food: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 360, sets: ["origin", "unity"]
  }),
  wildernessBuilding("avatar_chamber_3", "avatar_chamber_3.png", "buildingAvatarForest", "housing", {
    tier: 3, upgradesFrom: "avatar_chamber_2", capital: 3, colonyLimit: 1, housing: 300, amenities: 800, jobEfficiency: { synapse_drone: 0.1 },
    upkeep: { food: -8, volatile_motes: -1 }, cost: [["minerals", 800], ["biomass", 400], ["volatile_motes", 50]], time: 480, sets: ["origin", "unity"]
  }),
  wildernessBuilding("avatar_chamber_4", "avatar_chamber_4.png", "buildingAvatarCortex", "housing", {
    tier: 4, upgradesFrom: "avatar_chamber_3", capital: 4, colonyLimit: 1, housing: 300, amenities: 1200, jobEfficiency: { synapse_drone: 0.2 },
    upkeep: { food: -10, volatile_motes: -2 }, cost: [["minerals", 2000], ["biomass", 800], ["volatile_motes", 100]], time: 600, sets: ["origin", "unity"]
  }),
  wildernessBuilding("mote_aggravator", "mote_aggravator.png", "buildingChemicalDigester", "industryOutput", {
    jobs: { chemist_drone: 200 }, upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 400]], time: 480, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("churning_stomach", "churning_stomach.png", "buildingExoticGasFilters", "industryOutput", {
    jobs: { gas_refiner_drone: 200 }, upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 400]], time: 480, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("crystal_growth", "crystal_growth.png", "buildingCrystalBed", "industryOutput", {
    jobs: { translucer_drone: 200 }, upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 400]], time: 480, sets: ["origin", "foundry"]
  }),
  wildernessBuilding("planetary_carapace", "planetary_carapace_1.png", "buildingBoneGarrison", "military", {
    tier: 1, jobs: { soldier: 100 }, upkeep: { minerals: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 240, sets: ["origin", "fortress"]
  }),
  wildernessBuilding("planetary_carapace_2", "planetary_carapace_2.png", "buildingBoneFortress", "military", {
    tier: 2, upgradesFrom: "planetary_carapace", capital: 2, jobs: { soldier: 200 }, upkeep: { minerals: -8, volatile_motes: -1 },
    cost: [["minerals", 800], ["biomass", 400], ["volatile_motes", 50]], time: 360, sets: ["origin", "fortress"]
  }),
  wildernessBuilding("wilderness_storm_relief", "building_wilderness_storm_relief.png", "buildingStormReliefCenter", "other", {
    colonyLimit: 1, amenities: 800, upkeep: { energy: -5 }, cost: [["minerals", 600], ["biomass", 200]], time: 360, sets: ["origin"], infoKeys: ["wildernessInfoStormRelief"]
  })
];

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
 * - cost: coste de construcción de la wiki 4.5 (P7.3), solo informativo (no se
 *   simula el almacén de recursos): { time (días), items: [{ resource, amount,
 *   when?: "settled" | "nomadic" }] }. Un ítem sin `when` se paga siempre. Solo
 *   están los edificios cuya fila de la wiki se pudo leer sin ambigüedad; el resto
 *   (cadenas de Unidad, red sináptica/de enlace, red de recursos, mejoras de
 *   extracción) no tiene `cost`. Los costes de los mundos anillo no se modelan.
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
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "volatile_motes", amount: 40, when: "nomadic" }] },
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
    cost: { time: 360, items: [{ resource: "minerals", amount: 400 }] },
    sets: ["minerals"]
  },
  {
    id: "hydroponics_farm",
    requires: [notCelestial("machine"), unmodelled("reqEmpireUsesFood")],
    img: "buildings/building_hydroponics_farm.png",
    i18nKey: "buildingHydroponicsFarm",
    category: "resource",
    jobs: { farmer: 200 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "volatile_motes", amount: 40, when: "nomadic" }] },
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
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "volatile_motes", amount: 40, when: "nomadic" }] },
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
    upkeep: { energy: -5, volatile_motes: -2 },
    cost: { time: 480, items: [{ resource: "minerals", amount: 600, when: "settled" }, { resource: "volatile_motes", amount: 100, when: "settled" }, { resource: "volatile_motes", amount: 160, when: "nomadic" }] },
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
    upkeep: { energy: -8, volatile_motes: -4 },
    cost: { time: 600, items: [{ resource: "minerals", amount: 800, when: "settled" }, { resource: "volatile_motes", amount: 200, when: "settled" }, { resource: "volatile_motes", amount: 280, when: "nomadic" }] },
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
    cost: { time: 480, items: [{ resource: "minerals", amount: 600 }, { resource: "volatile_motes", amount: 100 }] },
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
    cost: { time: 600, items: [{ resource: "minerals", amount: 800 }, { resource: "volatile_motes", amount: 200 }] },
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
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "volatile_motes", amount: 40, when: "nomadic" }] },
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
    upkeep: { energy: -5, rare_crystals: -2 },
    cost: { time: 480, items: [{ resource: "minerals", amount: 600, when: "settled" }, { resource: "rare_crystals", amount: 100, when: "settled" }, { resource: "rare_crystals", amount: 160, when: "nomadic" }] },
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
    upkeep: { energy: -8, rare_crystals: -4 },
    cost: { time: 600, items: [{ resource: "minerals", amount: 800, when: "settled" }, { resource: "rare_crystals", amount: 200, when: "settled" }, { resource: "rare_crystals", amount: 280, when: "nomadic" }] },
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
    cost: { time: 480, items: [{ resource: "minerals", amount: 600 }, { resource: "rare_crystals", amount: 100 }] },
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
    cost: { time: 600, items: [{ resource: "minerals", amount: 800 }, { resource: "rare_crystals", amount: 200 }] },
    sets: ["industrial", "factory"]
  },

  // ── Investigación genérica (sin límite por colonia) ────────────────
  {
    id: "research_labs",
    requires: [notDesignation("resortWorld", "thrallWorld", "penalColony")],
    img: "buildings/building_research_lab_1.png",
    i18nKey: "buildingResearchLabs",
    category: "research",
    tier: 1,
    jobs: { physicist: 60, engineer: 60, biologist: 60 },
    colonyLimit: "none",
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "exotic_gases", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "research_complexes",
    requires: [notDesignation("resortWorld", "thrallWorld", "penalColony")],
    img: "buildings/building_research_lab_2.png",
    i18nKey: "buildingResearchComplexes",
    category: "research",
    tier: 2,
    upgradesFrom: "research_labs",
    jobs: { physicist: 120, engineer: 120, biologist: 120 },
    colonyLimit: "none",
    upkeep: { energy: -5, exotic_gases: -1 },
    cost: { time: 480, items: [{ resource: "minerals", amount: 600, when: "settled" }, { resource: "exotic_gases", amount: 50, when: "settled" }, { resource: "exotic_gases", amount: 110, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "advanced_research_complexes",
    requires: [notDesignation("resortWorld", "thrallWorld", "penalColony")],
    img: "buildings/building_research_lab_3.png",
    i18nKey: "buildingAdvancedResearchComplexes",
    category: "research",
    tier: 3,
    upgradesFrom: "research_complexes",
    jobs: { physicist: 180, engineer: 180, biologist: 180 },
    colonyLimit: "none",
    upkeep: { energy: -8, exotic_gases: -2 },
    cost: { time: 600, items: [{ resource: "minerals", amount: 800, when: "settled" }, { resource: "exotic_gases", amount: 100, when: "settled" }, { resource: "exotic_gases", amount: 180, when: "nomadic" }] },
    sets: ["origin"]
  },

  // ── Administración civil (una por línea de mejora) ─────────────────
  {
    id: "precinct_houses",
    requires: [NOT_GESTALT, notCivic("civicCivilEducation"), notDesignation("thrallWorld")],
    img: "buildings/building_precinct_house.png",
    i18nKey: "buildingPrecinctHouses",
    category: "civic",
    tier: 1,
    jobs: { enforcer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "hall_of_judgment",
    requires: [NOT_GESTALT, notCivic("civicCivilEducation"), notDesignation("thrallWorld"), CAPITAL_TIER_2],
    img: "buildings/building_hall_judgment.png",
    i18nKey: "buildingHallOfJudgment",
    category: "civic",
    tier: 2,
    upgradesFrom: "precinct_houses",
    jobs: { enforcer: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, volatile_motes: -1 },
    cost: { time: 480, items: [{ resource: "volatile_motes", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "alloys", amount: 60, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "state_academy",
    requires: [civic("civicCivilEducation"), notDesignation("thrallWorld")],
    img: "buildings/building_state_academy.png",
    i18nKey: "buildingStateAcademy",
    category: "civic",
    tier: 1,
    jobs: { educator: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "center_of_guidance",
    requires: [civic("civicCivilEducation"), notDesignation("thrallWorld"), CAPITAL_TIER_2],
    img: "buildings/building_center_of_guidance.png",
    i18nKey: "buildingCenterOfGuidance",
    category: "civic",
    tier: 2,
    upgradesFrom: "state_academy",
    jobs: { educator: 500 },
    colonyLimit: 1,
    upkeep: { energy: -2, volatile_motes: -1 },
    cost: { time: 480, items: [{ resource: "volatile_motes", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "alloys", amount: 60, when: "nomadic" }] },
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
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "rare_crystals", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },

  // ── Militares ───────────────────────────────────────────────────────
  {
    id: "stronghold",
    requires: [notDesignation("resortWorld"), NOT_WILDERNESS],
    img: "buildings/building_stronghold.png",
    i18nKey: "buildingStronghold",
    category: "military",
    tier: 1,
    jobs: { soldier: 200 },
    colonyLimit: 1,
    upkeep: { energy: -1 },
    cost: { time: 240, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "volatile_motes", amount: 40, when: "nomadic" }] },
    sets: ["fortress"]
  },
  {
    id: "fortress",
    requires: [notDesignation("resortWorld"), NOT_WILDERNESS, CAPITAL_TIER_2],
    img: "buildings/building_fortress.png",
    i18nKey: "buildingFortress",
    category: "military",
    tier: 2,
    upgradesFrom: "stronghold",
    jobs: { soldier: 400 },
    colonyLimit: 1,
    upkeep: { energy: -1, volatile_motes: -1 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 600, when: "settled" }, { resource: "volatile_motes", amount: 50, when: "settled" }, { resource: "volatile_motes", amount: 110, when: "nomadic" }] },
    sets: ["fortress"]
  },

  // ── Otros ───────────────────────────────────────────────────────────
  {
    id: "commercial_zones",
    requires: [NOT_GESTALT, NOT_COMMAND_CENTER, notDesignation("penalColony", "thrallWorld")],
    img: "buildings/building_commercial_zone.png",
    i18nKey: "buildingCommercialZones",
    category: "other",
    jobs: { trader: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "rare_crystals", amount: 40, when: "nomadic" }] },
    sets: ["trade"]
  },
  {
    id: "holo_theatres",
    requires: [NOT_GESTALT, NOT_COMMAND_CENTER, notCivic("civicDystopianSociety"), notDesignation("penalColony", "thrallWorld")],
    img: "buildings/building_holo_theatres.png",
    i18nKey: "buildingHoloTheatres",
    category: "other",
    jobs: { entertainer: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },

  // ══ Edificios vinculados a éticas, autoridades y principios (requisitos de la columna Requirements de la wiki) ══

  // ── Cadena del Templo (ética espiritualista; límite 1 por cadena) ──
  {
    id: "holotemple",
    img: "buildings/building_holotemple.png",
    i18nKey: "buildingHolotemple",
    category: "unity",
    requires: [USES_PRIEST_JOBS],
    tier: 2,
    upgradesFrom: "temple",
    jobs: {},
    jobUpkeepMult: { priest: -0.2 },
    colonyLimit: 1,
    upkeep: { energy: -5, rare_crystals: -1 },
    sets: ["origin"]
  },
  {
    id: "sacred_nexus",
    img: "buildings/building_sacred_nexus.png",
    i18nKey: "buildingSacredNexus",
    category: "unity",
    requires: [USES_PRIEST_JOBS],
    tier: 3,
    upgradesFrom: "holotemple",
    jobs: {},
    jobEfficiency: { priest: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, rare_crystals: -2 },
    sets: ["origin"]
  },

  // ── Cadena de Oficinas Administrativas (no con empleos de sacerdote) ──
  {
    id: "administrative_park",
    img: "buildings/building_bureaucratic_2.png",
    i18nKey: "buildingAdministrativePark",
    category: "civic",
    requires: [NOT_GESTALT, NOT_USES_PRIEST_JOBS, notDesignation("penalColony", "resortWorld")],
    tier: 2,
    upgradesFrom: "administrative_offices",
    jobs: {},
    jobUpkeepMult: { bureaucrat: -0.2 },
    colonyLimit: 1,
    upkeep: { energy: -5, rare_crystals: -1 },
    cost: { time: 480, items: [{ resource: "minerals", amount: 600 }] },
    sets: ["origin"]
  },
  {
    id: "administrative_complex",
    img: "buildings/building_bureaucratic_3.png",
    i18nKey: "buildingAdministrativeComplex",
    category: "civic",
    requires: [NOT_GESTALT, NOT_USES_PRIEST_JOBS, notDesignation("penalColony", "resortWorld")],
    tier: 3,
    upgradesFrom: "administrative_park",
    jobs: {},
    jobEfficiency: { bureaucrat: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, rare_crystals: -2 },
    cost: { time: 600, items: [{ resource: "minerals", amount: 800 }] },
    sets: ["origin"]
  },

  // ── Culto a la Muerte (principio Culto a la Muerte o su versión corporativa) ──
  {
    id: "sacrificial_temple",
    img: "buildings/building_sacrificial_temple_1.png",
    i18nKey: "buildingSacrificialTemple",
    category: "unity",
    requires: [civic("civicDeathCult", "civicCorporateDeathCult")],
    tier: 1,
    jobs: { death_priest: 100, mortal_initiate: 100 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    sets: ["origin"]
  },
  {
    id: "grim_holotemple",
    img: "buildings/building_sacrificial_temple_2.png",
    i18nKey: "buildingGrimHolotemple",
    category: "unity",
    requires: [civic("civicDeathCult", "civicCorporateDeathCult")],
    tier: 2,
    upgradesFrom: "sacrificial_temple",
    jobs: { mortal_initiate: 200 },
    jobEfficiency: { death_priest: 0.05 },
    colonyLimit: 1,
    upkeep: { energy: -5, exotic_gases: -1 },
    sets: ["origin"]
  },
  {
    id: "temple_of_grand_sacrifice",
    img: "buildings/building_sacrificial_temple_3.png",
    i18nKey: "buildingTempleOfGrandSacrifice",
    category: "unity",
    requires: [civic("civicDeathCult", "civicCorporateDeathCult")],
    tier: 3,
    upgradesFrom: "grim_holotemple",
    jobs: { mortal_initiate: 400 },
    jobEfficiency: { mortal_initiate: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, exotic_gases: -2 },
    sets: ["origin"]
  },

  // ── Cámaras de experimentación (P10.10: principio Sentencias Experimentales y equivalentes, no ética materialista) ──
  {
    id: "experimentation_chambers",
    img: "buildings/building_experimentation_chambers_1.png",
    i18nKey: "buildingExperimentationChambers",
    category: "research",
    requires: [EXPERIMENTAL_SENTENCING, notDesignation("resortWorld", "thrallWorld")],
    tier: 1,
    jobs: { experiment_engineer: 200, test_subject: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "exotic_gases", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "experimentation_complex",
    img: "buildings/building_experimentation_chambers_2.png",
    i18nKey: "buildingExperimentationComplex",
    category: "research",
    requires: [EXPERIMENTAL_SENTENCING, notDesignation("resortWorld", "thrallWorld")],
    tier: 2,
    upgradesFrom: "experimentation_chambers",
    jobs: { experiment_engineer: 200, test_subject: 400 },
    colonyLimit: 1,
    upkeep: { energy: -2, rare_crystals: -2 },
    cost: { time: 480, items: [{ resource: "rare_crystals", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "exotic_gases", amount: 60, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "experimentation_nexus",
    img: "buildings/building_experimentation_chambers_3.png",
    i18nKey: "buildingExperimentationNexus",
    category: "research",
    requires: [EXPERIMENTAL_SENTENCING, notDesignation("resortWorld", "thrallWorld")],
    tier: 3,
    upgradesFrom: "experimentation_complex",
    jobs: { experiment_engineer: 200, test_subject: 600 },
    colonyLimit: 1,
    upkeep: { energy: -2, rare_crystals: -2, volatile_motes: -1 },
    cost: { time: 600, items: [{ resource: "rare_crystals", amount: 100 }, { resource: "minerals", amount: 800, when: "settled" }, { resource: "exotic_gases", amount: 80, when: "nomadic" }] },
    sets: ["origin"]
  },

  // ── Vivienda de gestalt (Mente Colmena / Inteligencia de Máquina) ──
  {
    id: "hive_warren",
    img: "buildings/building_hive_warren.png",
    i18nKey: "buildingHiveWarren",
    category: "housing",
    requires: [authority("hiveMind")],
    tier: 1,
    jobs: {},
    housing: 1500,
    amenities: 1500,
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "expanded_warren",
    img: "buildings/building_expanded_warren.png",
    i18nKey: "buildingExpandedWarren",
    category: "housing",
    requires: [authority("hiveMind")],
    tier: 2,
    upgradesFrom: "hive_warren",
    jobs: {},
    housing: 3000,
    amenities: 3000,
    colonyLimit: 1,
    upkeep: { energy: -3, rare_crystals: -1 },
    cost: { time: 480, items: [{ resource: "rare_crystals", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "alloys", amount: 60, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "drone_storage",
    img: "buildings/building_drone_storage.png",
    i18nKey: "buildingDroneStorage",
    category: "housing",
    requires: [authority("machineIntelligence")],
    tier: 1,
    jobs: {},
    housing: 1500,
    amenities: 1500,
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "upgraded_drone_storage",
    img: "buildings/building_drone_megastorage.png",
    i18nKey: "buildingUpgradedDroneStorage",
    category: "housing",
    requires: [authority("machineIntelligence"), CAPITAL_TIER_2],
    tier: 2,
    upgradesFrom: "drone_storage",
    jobs: {},
    housing: 3000,
    amenities: 3000,
    colonyLimit: 1,
    upkeep: { energy: -3, rare_crystals: -1 },
    cost: { time: 480, items: [{ resource: "rare_crystals", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "alloys", amount: 60, when: "nomadic" }] },
    sets: ["origin"]
  },

  // ── Cadena sináptica de la Mente Colmena (requiere los capitales Núcleo y Nexo de la colmena) ──
  {
    id: "synaptic_nodes",
    img: "buildings/building_hive_node.png",
    i18nKey: "buildingSynapticNodes",
    category: "unity",
    requires: [authority("hiveMind"), NOT_WILDERNESS],
    tier: 1,
    jobs: { synapse_drone: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    sets: ["origin"]
  },
  {
    id: "synaptic_clusters",
    img: "buildings/building_hive_cluster.png",
    i18nKey: "buildingSynapticClusters",
    category: "unity",
    requires: [authority("hiveMind"), NOT_WILDERNESS, { type: "capitalTier", min: 2 }],
    tier: 2,
    upgradesFrom: "synaptic_nodes",
    jobs: {},
    jobUpkeepMult: { synapse_drone: -0.2 },
    colonyLimit: 1,
    upkeep: { energy: -5, exotic_gases: -1 },
    sets: ["origin"]
  },
  {
    id: "confluence_of_thought",
    img: "buildings/building_hive_confluence.png",
    i18nKey: "buildingConfluenceOfThought",
    category: "unity",
    requires: [authority("hiveMind"), NOT_WILDERNESS, { type: "capitalTier", min: 4 }],
    tier: 3,
    upgradesFrom: "synaptic_clusters",
    jobs: {},
    jobEfficiency: { synapse_drone: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, exotic_gases: -2 },
    sets: ["origin"]
  },

  // ── Cadena de enlace de la Inteligencia de Máquina (requiere el capital Matriz Administrativa) ──
  {
    id: "uplink_node",
    img: "buildings/building_autochthon_monument.png",
    i18nKey: "buildingUplinkNode",
    category: "unity",
    requires: [authority("machineIntelligence"), notCivic("civicMachineServitor")],
    tier: 1,
    jobs: { coordinator: 200 },
    colonyLimit: 1,
    upkeep: { energy: -2 },
    sets: ["origin"]
  },
  {
    id: "network_junction",
    img: "buildings/building_heritage_site.png",
    i18nKey: "buildingNetworkJunction",
    category: "unity",
    requires: [authority("machineIntelligence"), notCivic("civicMachineServitor"), { type: "capitalTier", min: 2 }],
    tier: 2,
    upgradesFrom: "uplink_node",
    jobs: {},
    jobUpkeepMult: { coordinator: -0.2 },
    colonyLimit: 1,
    upkeep: { energy: -5, rare_crystals: -1 },
    sets: ["origin"]
  },
  {
    id: "system_conflux",
    img: "buildings/building_hypercomms_forum.png",
    i18nKey: "buildingSystemConflux",
    category: "unity",
    requires: [authority("machineIntelligence"), notCivic("civicMachineServitor"), { type: "capitalTier", min: 2 }],
    tier: 3,
    upgradesFrom: "network_junction",
    jobs: {},
    jobEfficiency: { coordinator: 0.1 },
    colonyLimit: 1,
    upkeep: { energy: -8, rare_crystals: -2 },
    sets: ["origin"]
  },

  // ── Vivienda (sin empleos: vivienda y comodidades, ambos ×100) ─────
  {
    id: "luxury_residences",
    requires: [NOT_GESTALT, notCivic("civicSharedBurdens"), notCelestial("habitat")],
    img: "buildings/building_luxury_residence.png",
    i18nKey: "buildingLuxuryResidences",
    category: "housing",
    tier: 1,
    jobs: {},
    housing: 1500,
    amenities: 1500,
    colonyLimit: 1,
    upkeep: { energy: -2 },
    cost: { time: 360, items: [{ resource: "minerals", amount: 400, when: "settled" }, { resource: "alloys", amount: 40, when: "nomadic" }] },
    sets: ["origin"]
  },
  {
    id: "paradise_domes",
    requires: [NOT_GESTALT, notCivic("civicSharedBurdens"), notCelestial("habitat"), CAPITAL_TIER_2],
    img: "buildings/building_paradise_dome.png",
    i18nKey: "buildingParadiseDomes",
    category: "housing",
    tier: 2,
    upgradesFrom: "luxury_residences",
    jobs: {},
    housing: 3000,
    amenities: 3000,
    colonyLimit: 1,
    upkeep: { energy: -3, rare_crystals: -1 },
    cost: { time: 480, items: [{ resource: "rare_crystals", amount: 50 }, { resource: "minerals", amount: 600, when: "settled" }, { resource: "alloys", amount: 60, when: "nomadic" }] },
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
    sets: ["origin"]
  },

  // ══ P7.8: ampliación del catálogo desde las páginas Industry/Research/Resource/Unity buildings de la wiki 4.5 (ver cabecera de la sección en el GDD) ══
  {
    id: "exotic_gas_refineries",
    img: "buildings/building_refinery.png",
    i18nKey: "buildingExoticGasRefineries",
    category: "industryOutput",
    jobs: {},
    jobModifiers: {"metallurgist": {"exotic_gases": 0.1, "minerals": -0.5}, "artisan": {"exotic_gases": 0.1, "minerals": -0.5}},
    conditionalJobModifiers: [{"when": [{"type": "civic", "keys": ["civicCatalyticProcessing", "civicCorporateCatalyticProcessing", "civicHiveCatalyticProcessing", "civicMachineCatalyticProcessing"]}], "jobModifiers": {"metallurgist": {"food": -0.5}, "artisan": {"food": -0.5}}}],
    colonyLimit: 1,
    upkeep: {"energy": -3},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 500}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "chemical_plants",
    img: "buildings/building_chemical_plant.png",
    i18nKey: "buildingChemicalPlants",
    category: "industryOutput",
    jobs: {},
    jobModifiers: {"metallurgist": {"volatile_motes": 0.1, "minerals": -0.5}, "artisan": {"volatile_motes": 0.1, "minerals": -0.5}},
    conditionalJobModifiers: [{"when": [{"type": "civic", "keys": ["civicCatalyticProcessing", "civicCorporateCatalyticProcessing", "civicHiveCatalyticProcessing", "civicMachineCatalyticProcessing"]}], "jobModifiers": {"metallurgist": {"food": -0.5}, "artisan": {"food": -0.5}}}],
    colonyLimit: 1,
    upkeep: {"energy": -3},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "synthetic_crystal_plants",
    img: "buildings/building_crystal_plant.png",
    i18nKey: "buildingSyntheticCrystalPlants",
    category: "industryOutput",
    jobs: {},
    jobModifiers: {"metallurgist": {"rare_crystals": 0.1, "minerals": -0.5}, "artisan": {"rare_crystals": 0.1, "minerals": -0.5}},
    conditionalJobModifiers: [{"when": [{"type": "civic", "keys": ["civicCatalyticProcessing", "civicCorporateCatalyticProcessing", "civicHiveCatalyticProcessing", "civicMachineCatalyticProcessing"]}], "jobModifiers": {"metallurgist": {"food": -0.5}, "artisan": {"food": -0.5}}}],
    colonyLimit: 1,
    upkeep: {"energy": -3},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "ministry_of_production",
    img: "buildings/building_production_center.png",
    i18nKey: "buildingMinistryOfProduction",
    category: "industryOutput",
    requires: [{"type": "notGestalt"}, {"type": "capitalTier", "min": 3}],
    jobs: {"politician": 200},
    jobModifiers: {"metallurgist": {"alloys": 0.2}, "artisan": {"consumer_goods": 0.2}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "volatile_motes": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "volatile_motes", "amount": 50}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "resource_processing_center",
    img: "buildings/building_production_center.png",
    i18nKey: "buildingResourceProcessingCenter",
    category: "industryOutput",
    requires: [{"type": "ethic", "ids": ["gestaltConsciousness"]}, {"type": "capitalTier", "min": 3}],
    jobs: {"metallurgist": 200},
    jobModifiers: {"metallurgist": {"alloys": 0.2}, "artisan": {"consumer_goods": 0.2}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "volatile_motes": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "volatile_motes", "amount": 50}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "ancient_refinery",
    img: "buildings/building_archaeo_refinery.png",
    i18nKey: "buildingAncientRefinery",
    category: "industryOutput",
    jobs: {},
    jobModifiers: {"metallurgist": {"volatile_motes": 0.1, "exotic_gases": 0.1, "rare_crystals": 0.1, "minerals": -1}, "artisan": {"volatile_motes": 0.1, "exotic_gases": 0.1, "rare_crystals": 0.1, "minerals": -1}},
    conditionalJobModifiers: [{"when": [{"type": "civic", "keys": ["civicCatalyticProcessing", "civicCorporateCatalyticProcessing", "civicHiveCatalyticProcessing", "civicMachineCatalyticProcessing"]}], "jobModifiers": {"metallurgist": {"food": -1.5}, "artisan": {"food": -1.5}}}],
    jobResourceMult: {"volatile_motes": 0.1, "exotic_gases": 0.1, "rare_crystals": 0.1},
    colonyLimit: 1,
    upkeep: {"energy": -5},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 600}, {"resource": "minor_artifacts", "amount": 200}]},
    sets: ["industrial", "factory", "foundry"]
  },
  {
    id: "field_dynamics_center",
    img: "buildings/building_physics_lab_1.png",
    i18nKey: "buildingFieldDynamicsCenter",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 1,
    jobs: {"physicist": 200},
    jobModifiers: {"physicist": {"physics": 0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -2},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "quantum_relations_annex",
    img: "buildings/building_physics_lab_2.png",
    i18nKey: "buildingQuantumRelationsAnnex",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 2,
    upgradesFrom: "field_dynamics_center",
    jobs: {"physicist": 200},
    jobModifiers: {"physicist": {"physics": 0.5, "volatile_motes": -0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "volatile_motes": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "volatile_motes", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "fundamental_research_nexus",
    img: "buildings/building_physics_lab_3.png",
    i18nKey: "buildingFundamentalResearchNexus",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 3,
    upgradesFrom: "quantum_relations_annex",
    jobs: {"physicist": 200},
    jobModifiers: {"physicist": {"physics": 0.5, "volatile_motes": -0.25}},
    jobEfficiency: {"physicist": 0.1},
    colonyLimit: 1,
    upkeep: {"energy": -8, "volatile_motes": -2},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}, {"resource": "volatile_motes", "amount": 100}]},
    sets: ["origin"]
  },
  {
    id: "xenobiological_lab",
    img: "buildings/building_biolab_1.png",
    i18nKey: "buildingXenobiologicalLab",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 1,
    jobs: {"biologist": 200},
    jobModifiers: {"biologist": {"society": 0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -2},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "neurogenetics_institute",
    img: "buildings/building_biolab_2.png",
    i18nKey: "buildingNeurogeneticsInstitute",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 2,
    upgradesFrom: "xenobiological_lab",
    jobs: {"biologist": 200},
    jobModifiers: {"biologist": {"society": 0.5, "exotic_gases": -0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "exotic_gases": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "exotic_gases", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "life_systems_complex",
    img: "buildings/building_biolab_3.png",
    i18nKey: "buildingLifeSystemsComplex",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 3,
    upgradesFrom: "neurogenetics_institute",
    jobs: {"biologist": 200},
    jobModifiers: {"biologist": {"society": 0.5, "exotic_gases": -0.25}},
    jobEfficiency: {"biologist": 0.1},
    colonyLimit: 1,
    upkeep: {"energy": -8, "exotic_gases": -2},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 800}, {"resource": "exotic_gases", "amount": 100}]},
    sets: ["origin"]
  },
  {
    id: "materials_workshop",
    img: "buildings/building_engineering_facility_1.png",
    i18nKey: "buildingMaterialsWorkshop",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 1,
    jobs: {"engineer": 200},
    jobModifiers: {"engineer": {"engineering": 0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -2},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "applied_mechanics_institute",
    img: "buildings/building_engineering_facility_2.png",
    i18nKey: "buildingAppliedMechanicsInstitute",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 2,
    upgradesFrom: "materials_workshop",
    jobs: {"engineer": 200},
    jobModifiers: {"engineer": {"engineering": 0.5, "rare_crystals": -0.25}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "rare_crystals": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "rare_crystals", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "advanced_engineering_complex",
    img: "buildings/building_engineering_facility_3.png",
    i18nKey: "buildingAdvancedEngineeringComplex",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 3,
    upgradesFrom: "applied_mechanics_institute",
    jobs: {"engineer": 200},
    jobModifiers: {"engineer": {"engineering": 0.5, "rare_crystals": -0.25}},
    jobEfficiency: {"engineer": 0.1},
    colonyLimit: 1,
    upkeep: {"energy": -8, "rare_crystals": -2},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}, {"resource": "rare_crystals", "amount": 100}]},
    sets: ["origin"]
  },
  {
    id: "research_supply_depot",
    img: "buildings/building_research_upkeep_1.png",
    i18nKey: "buildingResearchSupplyDepot",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    jobs: {},
    jobUpkeepMult: {"physicist": -0.1, "biologist": -0.1, "engineer": -0.1},
    colonyLimit: 1,
    upkeep: {"energy": -5, "exotic_gases": -2},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "exotic_gases", "amount": 100}]},
    sets: ["origin"]
  },
  {
    id: "data_driven_theorem_facility",
    img: "buildings/building_research_efficiency_1.png",
    i18nKey: "buildingDataDrivenTheoremFacility",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    jobs: {},
    jobEfficiency: {"physicist": 0.1, "biologist": 0.1, "engineer": 0.1},
    colonyLimit: 1,
    upkeep: {"energy": -8, "exotic_gases": -4},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}, {"resource": "exotic_gases", "amount": 200}]},
    sets: ["origin"]
  },
  {
    id: "research_institute",
    img: "buildings/building_institute.png",
    i18nKey: "buildingResearchInstitute",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}, {"type": "notGestalt"}, {"type": "capitalTier", "min": 3}],
    jobs: {},
    jobModifiers: {"physicist": {"physics": 0.5}, "biologist": {"society": 0.5}, "engineer": {"engineering": 0.5}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"physicist": {"consumer_goods": -1}, "biologist": {"consumer_goods": -1}, "engineer": {"consumer_goods": -1}}}, {"when": [{"type": "authority", "ids": ["hiveMind"]}], "jobModifiers": {"physicist": {"minerals": -2}, "biologist": {"minerals": -2}, "engineer": {"minerals": -2}}}, {"when": [{"type": "authority", "ids": ["machineIntelligence"]}], "jobModifiers": {"physicist": {"energy": -2}, "biologist": {"energy": -2}, "engineer": {"energy": -2}}}],
    colonyLimit: 1,
    upkeep: {"energy": -5, "exotic_gases": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "exotic_gases", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "planetary_supercomputer",
    img: "buildings/building_institute.png",
    i18nKey: "buildingPlanetarySupercomputer",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}, {"type": "ethic", "ids": ["gestaltConsciousness"]}, {"type": "capitalTier", "min": 3}],
    jobs: {},
    jobModifiers: {"physicist": {"physics": 0.5}, "biologist": {"society": 0.5}, "engineer": {"engineering": 0.5}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"physicist": {"consumer_goods": -1}, "biologist": {"consumer_goods": -1}, "engineer": {"consumer_goods": -1}}}, {"when": [{"type": "authority", "ids": ["hiveMind"]}], "jobModifiers": {"physicist": {"minerals": -2}, "biologist": {"minerals": -2}, "engineer": {"minerals": -2}}}, {"when": [{"type": "authority", "ids": ["machineIntelligence"]}], "jobModifiers": {"physicist": {"energy": -2}, "biologist": {"energy": -2}, "engineer": {"energy": -2}}}],
    colonyLimit: 1,
    upkeep: {"energy": -5, "exotic_gases": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "exotic_gases", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "vultaum_reality_computer",
    img: "buildings/building_vultaum_reality_computer.png",
    i18nKey: "buildingVultaumRealityComputer",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    jobs: {"physicist": 200},
    jobModifiers: {"physicist": {"physics": 1}},
    colonyLimit: 1,
    upkeep: {"energy": -5},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "minor_artifacts", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "astral_siphon",
    img: "buildings/building_astral_siphon_1.png",
    i18nKey: "buildingAstralSiphon",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}, {"type": "unmodelled", "i18nKey": "reqAstralSiphonAction"}],
    tier: 1,
    jobs: {},
    jobModifiers: {"physicist": {"physics": 0.2, "astral_threads": 0.2}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"physicist": {"consumer_goods": -1}}}, {"when": [{"type": "authority", "ids": ["hiveMind"]}], "jobModifiers": {"physicist": {"minerals": -2}}}, {"when": [{"type": "authority", "ids": ["machineIntelligence"]}], "jobModifiers": {"physicist": {"energy": -2}}}],
    colonyLimit: 1,
    upkeep: {"energy": -2},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "astral_funnel",
    img: "buildings/building_astral_siphon_2.png",
    i18nKey: "buildingAstralFunnel",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 2,
    upgradesFrom: "astral_siphon",
    jobs: {},
    jobModifiers: {"physicist": {"physics": 0.35, "astral_threads": 0.35}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"physicist": {"consumer_goods": -1.5}}}, {"when": [{"type": "authority", "ids": ["hiveMind"]}], "jobModifiers": {"physicist": {"minerals": -3.0}}}, {"when": [{"type": "authority", "ids": ["machineIntelligence"]}], "jobModifiers": {"physicist": {"energy": -3.0}}}],
    colonyLimit: 1,
    upkeep: {"energy": -8},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },
  {
    id: "astral_nexus",
    img: "buildings/building_astral_siphon_3.png",
    i18nKey: "buildingAstralNexus",
    category: "research",
    requires: [{"type": "notDesignation", "ids": ["resortWorld", "thrallWorld", "penalColony"]}],
    tier: 3,
    upgradesFrom: "astral_funnel",
    jobs: {},
    jobModifiers: {"physicist": {"physics": 0.5, "astral_threads": 0.5}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"physicist": {"consumer_goods": -2}}}, {"when": [{"type": "authority", "ids": ["hiveMind"]}], "jobModifiers": {"physicist": {"minerals": -4}}}, {"when": [{"type": "authority", "ids": ["machineIntelligence"]}], "jobModifiers": {"physicist": {"energy": -4}}}],
    colonyLimit: 1,
    upkeep: {"energy": -8},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },
  {
    id: "bio_reactor",
    img: "buildings/building_bio_reactor.png",
    i18nKey: "buildingBioReactor",
    category: "resource",
    requires: [{"type": "notCelestial", "ids": ["machine"]}],
    tier: 1,
    jobs: {},
    jobModifiers: {"farmer": {"food": -2, "energy": 2}},
    colonyLimit: 1,
    upkeep: {"food": -2},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["food"]
  },
  {
    id: "advanced_bio_reactor",
    img: "buildings/building_bio_reactor_2.png",
    i18nKey: "buildingAdvancedBioReactor",
    category: "resource",
    requires: [{"type": "notCelestial", "ids": ["machine"]}, {"type": "capitalTier", "min": 2}],
    tier: 2,
    upgradesFrom: "bio_reactor",
    jobs: {},
    jobModifiers: {"farmer": {"food": -3, "energy": 2, "exotic_gases": 0.1}},
    colonyLimit: 1,
    upkeep: {"food": -5},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["food"]
  },
  {
    id: "baol_organic_plant",
    img: "buildings/building_baol_organic_plant.png",
    i18nKey: "buildingBaolOrganicPlant",
    category: "resource",
    requires: [{"type": "notCelestial", "ids": ["machine"]}],
    jobs: {"farmer": 200},
    jobModifiers: {"farmer": {"food": 1}},
    conditionalJobModifiers: [{"when": [{"type": "notGestalt"}], "jobModifiers": {"farmer": {"consumer_goods": 0.5}}}, {"when": [{"type": "ethic", "ids": ["gestaltConsciousness"]}], "jobModifiers": {"farmer": {"energy": 1}}}],
    colonyLimit: 1,
    upkeep: {"energy": -2},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "minor_artifacts", "amount": 25}]},
    sets: ["food", "factory"]
  },
  {
    id: "waste_reprocessing_center",
    img: "buildings/building_waste_reprocessing_center.png",
    i18nKey: "buildingWasteReprocessingCenter",
    category: "resource",
    requires: [{"type": "ethic", "ids": ["gestaltConsciousness"]}, {"type": "unmodelled", "i18nKey": "reqCaravanDeal"}],
    jobs: {"technician": 200},
    produces: {"energy": 10, "minerals": 10},
    amenities: 500,
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 100}]},
    sets: ["origin"]
  },
  {
    id: "auto_curating_vault",
    img: "buildings/building_autocurating_vault.png",
    i18nKey: "buildingAutoCuratingVault",
    category: "unity",
    requires: [{"type": "notGestalt"}, {"type": "usesPriestJobs", "value": false}, {"type": "notAuthority", "ids": ["corporate"]}],
    jobs: {},
    jobModifiers: {"bureaucrat": {"unity": 0.25, "physics": 0.1, "society": 0.1, "engineering": 0.1, "consumer_goods": -2}},
    colonyLimit: 1,
    upkeep: {"energy": -5, "rare_crystals": -1},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}, {"resource": "rare_crystals", "amount": 50}]},
    sets: ["origin"]
  },
  {
    id: "autochthon_monument",
    img: "buildings/building_autochthon_monument.png",
    i18nKey: "buildingAutochthonMonument",
    category: "unity",
    requires: [{"type": "notGestalt"}, {"type": "notAuthority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicMemorialist", "civicEntropyDrinkers"]}],
    tier: 1,
    jobs: {},
    jobResourceMult: {"unity": 0.05},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "heritage_site",
    img: "buildings/building_heritage_site.png",
    i18nKey: "buildingHeritageSite",
    category: "unity",
    requires: [{"type": "notGestalt"}, {"type": "notAuthority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicMemorialist", "civicEntropyDrinkers"]}, {"type": "capitalTier", "min": 2}],
    tier: 2,
    upgradesFrom: "autochthon_monument",
    jobs: {},
    jobResourceMult: {"unity": 0.1},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["origin"]
  },
  {
    id: "hypercomms_forum",
    img: "buildings/building_hypercomms_forum.png",
    i18nKey: "buildingHypercommsForum",
    category: "unity",
    requires: [{"type": "notGestalt"}, {"type": "notAuthority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicMemorialist", "civicEntropyDrinkers"]}, {"type": "capitalTier", "min": 3}],
    tier: 3,
    upgradesFrom: "heritage_site",
    jobs: {},
    jobResourceMult: {"unity": 0.15},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },
  {
    id: "corporate_culture_site",
    img: "buildings/building_autochthon_monument.png",
    i18nKey: "buildingCorporateCultureSite",
    category: "unity",
    requires: [{"type": "authority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicCorporateEntropyDrinkers"]}],
    tier: 1,
    jobs: {},
    jobResourceMult: {"unity": 0.05},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "business_management_nexus",
    img: "buildings/building_heritage_site.png",
    i18nKey: "buildingBusinessManagementNexus",
    category: "unity",
    requires: [{"type": "authority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicCorporateEntropyDrinkers"]}, {"type": "capitalTier", "min": 2}],
    tier: 2,
    upgradesFrom: "corporate_culture_site",
    jobs: {},
    jobResourceMult: {"unity": 0.1},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["origin"]
  },
  {
    id: "synergy_forum",
    img: "buildings/building_hypercomms_forum.png",
    i18nKey: "buildingSynergyForum",
    category: "unity",
    requires: [{"type": "authority", "ids": ["corporate"]}, {"type": "notCivic", "keys": ["civicCorporateEntropyDrinkers"]}, {"type": "capitalTier", "min": 3}],
    tier: 3,
    upgradesFrom: "business_management_nexus",
    jobs: {},
    jobResourceMult: {"unity": 0.15},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },
  {
    id: "sensorium_site",
    img: "buildings/building_sensorium_1.png",
    i18nKey: "buildingSensoriumSite",
    category: "unity",
    requires: [{"type": "authority", "ids": ["hiveMind"]}, {"type": "notCivic", "keys": ["civicHiveMemorialist", "civicHiveEntropyDrinkers"]}],
    tier: 1,
    jobs: {},
    jobResourceMult: {"unity": 0.05},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "sensorium_center",
    img: "buildings/building_sensorium_2.png",
    i18nKey: "buildingSensoriumCenter",
    category: "unity",
    requires: [{"type": "authority", "ids": ["hiveMind"]}, {"type": "notCivic", "keys": ["civicHiveMemorialist", "civicHiveEntropyDrinkers"]}, {"type": "capitalTier", "min": 2}],
    tier: 2,
    upgradesFrom: "sensorium_site",
    jobs: {},
    jobResourceMult: {"unity": 0.1},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["origin"]
  },
  {
    id: "sensorium_complex",
    img: "buildings/building_sensorium_3.png",
    i18nKey: "buildingSensoriumComplex",
    category: "unity",
    requires: [{"type": "authority", "ids": ["hiveMind"]}, {"type": "notCivic", "keys": ["civicHiveMemorialist", "civicHiveEntropyDrinkers"]}, {"type": "capitalTier", "min": 3}],
    tier: 3,
    upgradesFrom: "sensorium_center",
    jobs: {},
    jobResourceMult: {"unity": 0.15},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },
  {
    id: "simulation_site",
    img: "buildings/building_simulation_1.png",
    i18nKey: "buildingSimulationSite",
    category: "unity",
    requires: [{"type": "authority", "ids": ["machineIntelligence"]}, {"type": "notCivic", "keys": ["civicMachineMemorialist", "civicMachineEntropyDrinkers"]}],
    tier: 1,
    jobs: {},
    jobResourceMult: {"unity": 0.05},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 360, "items": [{"resource": "minerals", "amount": 400}]},
    sets: ["origin"]
  },
  {
    id: "simulation_center",
    img: "buildings/building_simulation_2.png",
    i18nKey: "buildingSimulationCenter",
    category: "unity",
    requires: [{"type": "authority", "ids": ["machineIntelligence"]}, {"type": "notCivic", "keys": ["civicMachineMemorialist", "civicMachineEntropyDrinkers"]}, {"type": "capitalTier", "min": 2}],
    tier: 2,
    upgradesFrom: "simulation_site",
    jobs: {},
    jobResourceMult: {"unity": 0.1},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 480, "items": [{"resource": "minerals", "amount": 600}]},
    sets: ["origin"]
  },
  {
    id: "simulation_complex",
    img: "buildings/building_simulation_3.png",
    i18nKey: "buildingSimulationComplex",
    category: "unity",
    requires: [{"type": "authority", "ids": ["machineIntelligence"]}, {"type": "notCivic", "keys": ["civicMachineMemorialist", "civicMachineEntropyDrinkers"]}, {"type": "capitalTier", "min": 3}],
    tier: 3,
    upgradesFrom: "simulation_center",
    jobs: {},
    jobResourceMult: {"unity": 0.15},
    colonyLimit: 1,
    upkeep: {},
    cost: {"time": 600, "items": [{"resource": "minerals", "amount": 800}]},
    sets: ["origin"]
  },

  // ── P10.5: Synaptic Lathe buildings (wiki 4.5.2, Planet unique buildings) ──
  // Only on the Synaptic Lathe ("lathe" set; it uses no other building), two per building. Upkeep −5 energy and −1 of
  // the building's strategic resource (Expanded Reactor: no energy, −4; Validator and Cogitator: −8 and −2, 4.6.0). Effects "per 100 Neural Chips" are per copy.
  latheBuilding("lathe_reactor", "building_lathe_reactor.png", "buildingLatheReactor", "exotic_gases", {
    jobUpkeepMult: { all: -0.15 }, upkeepMult: { buildings: -0.15, districtEnergy: -0.15 }
  }),
  latheBuilding("lathe_stabilizer", "building_lathe_stabilisator.png", "buildingLatheStabilizer", "exotic_gases", { stability: 15 }),
  latheBuilding("lathe_preserver", "building_lathe_preserver.png", "buildingLathePreserver", "exotic_gases", {
    requires: [LATHE_TECH("reqTechSynapticPreserver")], infoKeys: ["latheInfoPreserver"]
  }),
  latheBuilding("lathe_sustainer", "building_lathe_life_support.png", "buildingLatheSustainer", "rare_crystals", {
    requires: [LATHE_TECH("reqTechSynapticSustainer")], housing: 5000, amenities: 5000
  }),
  latheBuilding("lathe_resonator", "building_lathe_resonator.png", "buildingLatheResonator", "rare_crystals", {
    requires: [LATHE_TECH("reqTechSynapticResonator")], jobUpkeepMult: { all: 1 }, perNeuralChips: { jobResourcePct: 1 }
  }),
  latheBuilding("lathe_validator", "building_lathe_validator.png", "buildingLatheValidator", "rare_crystals", {
    requires: [LATHE_TECH("reqTechSynapticValidator")], stability: -10, infoKeys: ["latheInfoValidator"]
  }, true),
  latheBuilding("lathe_overclocker", "building_lathe_overclocker.png", "buildingLatheOverclocker", "volatile_motes", {
    requires: [LATHE_TECH("reqTechSynapticOverclocker")], perNeuralChips: { research: 1, advanced_logic: 0.5 }, infoKeys: ["latheInfoOverclocker"]
  }),
  latheBuilding("lathe_cogitator", "building_lathe_cogitator.png", "buildingLatheCogitator", "volatile_motes", {
    requires: [LATHE_TECH("reqTechSynapticCogitator")], jobResourcePct: { all: -35 }, amenities: -5000, infoKeys: ["latheInfoCogitator"]
  }, true),

  // ══ T1011: Wilderness origin buildings (see WILDERNESS_BUILDINGS above) ══
  ...WILDERNESS_BUILDINGS
];

/**
 * P10.6: buildings whose game potential / allow has is_wilderness_empire = no (game files 4.5.4, matched to the game
 * buildings as in tools/extract/report_differences.py): not available to a Wilderness empire. Its own buildings are
 * WILDERNESS_BUILDINGS (T1011).
 */
const WILDERNESS_EXCLUDED_BUILDINGS = [
  "voltaic_yard", "quarry_depot", "hydroponics_farm", "energy_grid", "energy_nexus", "mineral_purification_plants",
  "mineral_purification_hubs", "food_processing_facilities", "food_processing_centers", "alloy_foundries", "alloy_mega_forges",
  "alloy_nano_plants", "alloy_reclamation_plant", "metallurgical_research_lab", "research_labs", "research_complexes",
  "advanced_research_complexes", "stronghold", "fortress", "hive_warren", "expanded_warren", "synaptic_nodes", "synaptic_clusters",
  "confluence_of_thought", "exotic_gas_refineries", "chemical_plants", "synthetic_crystal_plants", "resource_processing_center",
  "field_dynamics_center", "xenobiological_lab", "neurogenetics_institute", "materials_workshop", "research_supply_depot",
  "data_driven_theorem_facility", "planetary_supercomputer", "bio_reactor", "advanced_bio_reactor", "auto_curating_vault",
  "sensorium_site", "sensorium_center", "sensorium_complex"
];
BUILDINGS.forEach((building) => {
  if (!WILDERNESS_EXCLUDED_BUILDINGS.includes(building.id)) return;
  const requires = building.requires || [];
  if (!requires.includes(NOT_WILDERNESS_ORIGIN)) building.requires = [...requires, NOT_WILDERNESS_ORIGIN];
});

export const CATEGORY_ORDER = [
  "resource",
  "foundry",
  "factory",
  "industryOutput",
  "research",
  "civic",
  "military",
  "other",
  "housing",
  "unity",
  "lathe"
];

export const CATEGORY_I18N_KEYS = {
  resource: "planetSimCategoryResource",
  foundry: "planetSimCategoryFoundry",
  factory: "planetSimCategoryFactory",
  industryOutput: "planetSimCategoryIndustryOutput",
  research: "planetSimCategoryResearch",
  civic: "planetSimCategoryCivic",
  military: "planetSimCategoryMilitary",
  other: "planetSimCategoryOther",
  housing: "planetSimCategoryHousing",
  unity: "planetSimCategoryUnity",
  lathe: "planetSimCategoryLathe"
};

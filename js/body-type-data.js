/**
 * Per-body-type rules for special planets (P10.1 audit, wiki 4.5.2).
 *
 * Sources: *Celestial object* (base modifiers per world type, planet capacity,
 * megastructure sizes), *Districts* (district sets per body type),
 * *District specialization* (job and housing multipliers), *Capital building*
 * (habitat and Synaptic Lathe capitals), *Designation* (designation sets) and
 * *Jobs* (Clerk, Thermoforger, Thermotechnic Mentor, Neural Chip).
 *
 * The engine reads the rules of the body types wired in so far (P10.2:
 * Ecumenopolis, P10.3: Ring Worlds, P10.4: Habitats, P10.5: Hive / Machine / Nanite Worlds, P10.6: Volcanic / Gaia / Tomb / Relic); P10.5–P10.7 wire in the rest, one body type at a time. Every value is `unverified` until P14 and is copied
 * as written on the wiki (housing and jobs ×100, upkeep and costs as plain
 * numbers, percentages as whole numbers). Open questions are listed in
 * PLANET_SIM_GDD.md §4.1 and must be answered before the value is used.
 *
 * Technology bonuses follow the existing rule (GDD §4): all technologies are
 * researched, traditions are not. "Productivity Simulations" and "Public Works
 * Division" are traditions; "Optimized Nexus", "Extended Hives" and "Modular
 * Superstructures" are on no technology page: none of them is listed here.
 */

/** Rules shared by the nine regular planets (and the default for any body without an entry in BODY_TYPE_RULES). */
export const REGULAR_BODY_RULES = {
  planetCapacity: 400,
  districtLayout: "standard", // urban primary + generator/mining/agriculture (current model)
  sizeRange: { min: 12, max: 25, moonMin: 10, moonMax: 15 }
};

/**
 * Overrides per celestial type id (ids from js/celestial-data.js).
 * - planetCapacity: per free district slot (info only; pop growth is out of scope).
 * - jobResourcePct: "+X% Resources from jobs" ({ all } or per resource id).
 * - happinessPct: flat happiness (treated as points, like edicts, GDD §5.1).
 * - popHousingUsagePct: pop housing usage change (housing needed = pops × (1 + pct/100)).
 * - fixedSize: district slots fixed by the body (megastructures).
 * - districtLayout: "standard" | "urbanSecondary" (secondary urban districts
 *   replace resource districts) | "habitat" | "volcanic" | "lathe".
 * - primaryDistrict / secondaryDistrict: ids in SPECIAL_DISTRICTS (absent = current urban model).
 * - specializationJobMultiplier: jobs added by specializations ×N.
 * - secondaryHousingPenaltyMultiplier: housing removed by secondary specializations ×N.
 * - secondarySpecializations: which secondary (resource-like) specializations a
 *   secondary urban district may pick (see GDD §4.1 Q3 for the reading of the
 *   wiki's "Requirements" column).
 * - infoOnly: effects shown on the card but not computed.
 */
export const BODY_TYPE_RULES = {
  volcanic: {
    planetCapacity: 400,
    jobResourcePct: { alloys: 5 },
    districtLayout: "volcanic",
    // P10.6: the three secondary groups (generator/mining/agriculture keys) hold these districts, in this order.
    // Geothermal Powerplant takes the generator specializations, Magma Conduit the mining ones (District specialization
    // page); no specialization lists the Thermotechnic Forum (it unlocks no building slots).
    resourceDistricts: ["geothermalPowerplant", "magmaConduit", "thermotechnicForum"],
    // Jobs page: Thermoforger is the Miner job swap on a Volcanic planet (P21.2: js/job-swap-data.js).
    infoOnly: ["Volcanic climate (habitability)"]
  },
  gaia: {
    planetCapacity: 600,
    jobResourcePct: { all: 10 },
    happinessPct: 10,
    infoOnly: ["Perfect habitability", "+15% Pop growth speed", "+50% Automatic resettlement destination chance"]
  },
  tomb: {
    planetCapacity: 300,
    infoOnly: ["0% Base habitability", "Traditionalist faction displeased (unless Post-Apocalyptic / Memorialists)"]
  },
  relic: {
    planetCapacity: 400,
    // Collapsed Spire blocker: the first primary specialization is locked until cleared and then set to Central Spire (P10.6 / P10.8).
    infoOnly: ["80% Base habitability", "Restore Ecumenopolis decision", "Research planetary features and expensive blockers"]
  },
  city: {
    planetCapacity: 600,
    jobResourcePct: { all: 20 },
    districtLayout: "urbanSecondary",
    primaryDistrict: "residentialArcology",
    secondaryDistrict: "unspecializedArcology",
    // Owner decision 2026-11-19: ×3 applies to the specialization jobs of every district copy (primary and secondary);
    // the wiki's extra "×2 for secondary urban districts" is not a separate multiplier.
    specializationJobMultiplier: 3,
    secondaryHousingPenaltyMultiplier: 3,
    secondarySpecializations: [], // "None of them are available on Ecumenopolis"
    infoOnly: ["Perfect habitability", "+15% Pop assembly speed", "+15% Monthly organic pop growth", "+50% Automatic resettlement destination chance", "Cannot be terraformed"]
  },
  hive: {
    planetCapacity: 600,
    jobResourcePct: { all: 10 },
    districtLayout: "urbanSecondary",
    secondaryDistrict: "unspecializedCluster",
    specializationJobMultiplier: 3,
    secondaryHousingPenaltyMultiplier: 3,
    secondarySpecializations: ["energyGeneration", "mineralExtraction", "agriculturalFocus"],
    // Wiki: the Hive Cluster is not available with the Wilderness origin (red cross); origins are not modelled.
    // "+600 Housing from districts" is already the hiveWorldHousing of the Hive Cluster (planet-data.js).
    infoOnly: ["Perfect habitability (Hive-Minded species only)", "+50% Automatic resettlement destination chance"]
  },
  machine: {
    planetCapacity: 300,
    jobResourcePct: { all: 10 },
    popHousingUsagePct: -10,
    districtLayout: "urbanSecondary",
    secondaryDistrict: "unspecializedNexus",
    specializationJobMultiplier: 3,
    secondaryHousingPenaltyMultiplier: 3,
    secondarySpecializations: ["energyGeneration", "mineralExtraction"],
    infoOnly: ["Perfect habitability for Machine/Mechanical (0% otherwise)", "+50% Automatic resettlement destination chance"]
  },
  nanite: {
    districtLayout: "urbanSecondary",
    secondaryDistrict: "unspecializedNexus",
    specializationJobMultiplier: 3,
    secondaryHousingPenaltyMultiplier: 3,
    secondarySpecializations: ["energyGeneration", "mineralExtraction"],
    // The wiki gives no planet capacity for Nanite Worlds.
    infoOnly: ["Perfect habitability for Nanotech (0% otherwise)"]
  },
  ringworld: {
    planetCapacity: 600,
    fixedSize: 10,
    districtLayout: "urbanSecondary",
    primaryDistrictByAuthority: { default: "citySegment", hiveMind: "hiveSegment", machineIntelligence: "nexusSegment" },
    secondaryDistrict: "unspecializedSegment",
    specializationJobMultiplier: 5,
    secondaryHousingPenaltyMultiplier: 5,
    // Mineral Extraction has a red cross for Ring World (not available).
    secondarySpecializations: ["energyGeneration", "agriculturalFocus"],
    infoOnly: ["Ideal habitability", "+50% Automatic resettlement destination chance"]
  },
  shatteredRingworld: {
    fixedSize: 25,
    // Generator, mining and agriculture districts are uncapped (Districts page, "Uncapped if either").
    resourceDistrictsUncapped: true,
    infoOnly: ["Ideal habitability", "Repair the Shattered Ring decision"]
  },
  habitat: {
    planetCapacity: 300,
    fixedSize: 6,
    districtLayout: "habitat",
    primaryDistrict: "habitationDistrict",
    // P10.4: the three secondary groups (generator/mining/agriculture keys) hold these districts, in this order.
    // Reactor District takes the generator specializations, Astro-Mining Bay the mining ones (District specialization page).
    resourceDistricts: ["reactorDistrict", "astroMiningBay", "researchDistrict"],
    // Owner decision 2026-11-19: manual cap per resource district (orbital deposits), saved with the planet.
    resourceDistrictCaps: true,
    // Void Dwellers / Voidborne ×1.5 (origins and ascension perks are not modelled).
    specializationJobMultiplier: 1,
    capitalSet: "habitat",
    infoOnly: ["Habitability 40/50/60% (tier I/II/III)", "+200% Colony development speed", "Resource districts limited by orbital deposits: 1 + half the deposit size"]
  },
  synapticLathe: {
    fixedSize: 2,
    districtLayout: "lathe",
    // P10.5: the primary group (urban key) holds the Neural Gate and the first secondary group (generator key) the
    // Ampliative Speculator; the mining and agriculture groups are not available. No specializations.
    latheDistricts: ["neuralGate", "ampliativeSpeculator"],
    // "Each Synaptic Lathe can build two districts for every capital building level" (Districts); capitals add Max Districts (Capital building).
    // Reading (P10.5): district slots = fixedSize 2 + the capital's maxDistricts (Processing Unit 2, Parallelized 4, Vectorial 6).
    capitalSet: "synapticLathe",
    infoOnly: ["85% habitability", "Separate building set", "All pops are Neural Chips", "Pops are purged and cannot grow", "Cannot have branch offices"]
  }
};

/**
 * Special districts per body type (wiki 4.5.2 *Districts*). Same shape as
 * DISTRICTS in planet-data.js: housing and jobs ×100, upkeep plain numbers.
 * jobsByEmpire: { individualist, gestalt } when the wiki splits them.
 * technologyHousing / technologyJobs: technology bonuses per copy.
 */
export const SPECIAL_DISTRICTS = {
  // Ecumenopolis
  residentialArcology: {
    role: "primary", bodies: ["city"], housing: 1500,
    i18nKey: "districtResidentialArcology", img: "districs/district_arcology_housing.png",
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 300 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 300, excludedCivics: ["civicAgrarianIdyll"] }
    ],
    jobsByEmpire: { individualist: { clerk: 300 }, gestalt: { logistic_drone: 900 } },
    technologyJobs: [{ id: "antiGravityEngineering", empire: "gestalt", jobs: { logistic_drone: 300 } }],
    upkeep: { energy: -5 }, cost: { minerals: 1000 }, time: 480
  },
  unspecializedArcology: {
    role: "secondaryUrban", bodies: ["city"], housing: 1500,
    i18nKey: "districtUnspecializedArcology", img: "districs/district_arcology_housing_secondary.png",
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 300 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 300, excludedCivics: ["civicAgrarianIdyll"] }
    ],
    upkeep: { energy: -5 }, cost: { alloys: 500 }, time: 480
  },
  // Ring World
  citySegment: {
    role: "primary", bodies: ["ringworld"], empire: "individualist", housing: 2500, agrarianIdyllHousing: -500,
    i18nKey: "districtCitySegment", img: "districs/district_city.png",
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 500 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 500, excludedCivics: ["civicAgrarianIdyll"] }
    ],
    jobs: { clerk: 300, enforcer: 200 },
    upkeep: { energy: -5 }, cost: { minerals: 1000 }, time: 360
  },
  hiveSegment: {
    role: "primary", bodies: ["ringworld"], empire: "hiveMind", housing: 3000,
    i18nKey: "districtHiveSegment", img: "districs/district_hive.png",
    technologyHousing: [{ id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 500 }, { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 500 }],
    jobs: { logistic_drone: 1500, synapse_drone: 200 },
    technologyJobs: [{ id: "antiGravityEngineering", jobs: { logistic_drone: 500 } }],
    upkeep: { energy: -5 }, cost: { minerals: 1000 }, time: 360
  },
  nexusSegment: {
    role: "primary", bodies: ["ringworld"], empire: "machineIntelligence", housing: 2500,
    i18nKey: "districtNexusSegment", img: "districs/district_nexus.png",
    technologyHousing: [{ id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 500 }, { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 500 }],
    // "+200 Tech-Drones": the gestalt name of the Technician job.
    jobs: { logistic_drone: 1000, technician: 200 },
    technologyJobs: [{ id: "antiGravityEngineering", jobs: { logistic_drone: 500 } }],
    upkeep: { energy: -5 }, cost: { minerals: 1000 }, time: 360
  },
  unspecializedSegment: {
    role: "secondaryUrban", bodies: ["ringworld"], housing: 2500, agrarianIdyllHousing: -500,
    i18nKey: "districtUnspecializedSegment", img: "districs/district_city.png",
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 500 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 500, excludedCivics: ["civicAgrarianIdyll"] }
    ],
    upkeep: { energy: -5 }, cost: { minerals: 1000 }, time: 360
  },
  // Hive / Machine / Nanite Worlds
  unspecializedCluster: {
    role: "secondaryUrban", bodies: ["hive"], housing: 1800,
    i18nKey: "districtUnspecializedCluster", img: "districs/district_hive.png",
    // "+100 with Extended Hives" is not on any technology page (not applied).
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 100 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 100 }
    ],
    upkeep: { energy: -2 }, cost: { minerals: 500 }, time: 480
  },
  unspecializedNexus: {
    role: "secondaryUrban", bodies: ["machine", "nanite"], housing: 1000,
    i18nKey: "districtUnspecializedNexus", img: "districs/district_nexus.png",
    // "+100 with Optimized Nexus" is not on any technology page (not applied).
    technologyHousing: [
      { id: "weatherControlSystems", i18nKey: "techWeatherControlSystems", housing: 100 },
      { id: "antiGravityEngineering", i18nKey: "techAntiGravityEngineering", housing: 100 }
    ],
    upkeep: { energy: -2 }, cost: { minerals: 500 }, time: 480
  },
  // Habitat
  habitationDistrict: {
    role: "primary", bodies: ["habitat"], housing: 1000,
    i18nKey: "districtHabitationDistrict", img: "districs/district_hab_housing.png",
    // "+100 with Modular Superstructures" is a tradition (not applied).
    upkeep: { energy: -2, alloys: -0.5 }, cost: { alloys: 300 }, time: 360
  },
  reactorDistrict: {
    role: "resource", category: "generator", bodies: ["habitat"], housing: 300,
    i18nKey: "districtReactorDistrict", img: "districs/district_hab_energy.png", jobs: { technician: 100 },
    upkeep: { energy: -2, alloys: -0.5 }, cost: { alloys: 300 }, time: 360
  },
  astroMiningBay: {
    role: "resource", category: "mining", bodies: ["habitat"], housing: 300,
    i18nKey: "districtAstroMiningBay", img: "districs/district_hab_mining.png", jobs: { miner: 100 },
    upkeep: { energy: -2, alloys: -0.5 }, cost: { alloys: 300 }, time: 360
  },
  researchDistrict: {
    // No specialization lists the Research District (District specialization page): it unlocks no building slots.
    role: "resource", category: "research", bodies: ["habitat"], housing: 300,
    i18nKey: "districtResearchDistrict", img: "districs/district_hab_science.png", jobs: { physicist: 30, biologist: 30, engineer: 30 },
    upkeep: { energy: -2, alloys: -0.5 }, cost: { alloys: 300 }, time: 360
  },
  // Volcanic World (resource districts)
  geothermalPowerplant: {
    role: "resource", category: "generator", bodies: ["volcanic"], housing: 200, gestaltHousing: 100, agrarianIdyllHousing: 300,
    i18nKey: "districtGeothermalPowerplant", img: "districs/district_geothermal.png",
    jobs: { technician: 200 }, upkeep: { energy: -1 }, cost: { minerals: 300 }, time: 240
  },
  magmaConduit: {
    role: "resource", category: "mining", bodies: ["volcanic"], housing: 200, gestaltHousing: 100, agrarianIdyllHousing: 300,
    i18nKey: "districtMagmaConduit", img: "districs/district_melting.png",
    jobs: { thermoforger: 200 }, upkeep: { energy: -1 }, cost: { minerals: 300 }, time: 240
  },
  thermotechnicForum: {
    role: "resource", category: "research", bodies: ["volcanic"], housing: 200,
    i18nKey: "districtThermotechnicForum", img: "districs/district_polytechnic.png",
    jobs: { thermotechnic_mentor: 200 }, upkeep: { energy: -3 }, cost: { minerals: 450 }, time: 250
  },
  // Synaptic Lathe
  neuralGate: {
    role: "lathe", bodies: ["synapticLathe"], housing: 1500, buildingSlots: 1,
    i18nKey: "districtNeuralGate", img: "districs/district_cosmogenesis_world_science.png",
    perNeuralChips: { research: 0.75 }, upkeep: { energy: -50 }, cost: { alloys: 800, advanced_logic: 400 }, time: 250
  },
  ampliativeSpeculator: {
    role: "lathe", bodies: ["synapticLathe"], housing: 1500, buildingSlots: 1,
    i18nKey: "districtAmpliativeSpeculator", img: "districs/district_cosmogenesis_world_logic.png",
    perNeuralChips: { advanced_logic: 0.02 }, upkeep: { energy: -50 }, cost: { alloys: 800, advanced_logic: 400 }, time: 250
  }
};

/**
 * Capitals of special bodies (wiki 4.5.2 *Capital building*). Same shape as
 * CAPITAL_SETS in planet-data.js. Habitat upkeep is listed without a sign on
 * the wiki ("[Energy] 3; [Alloys] 5"); it is upkeep, stored as negative.
 *
 * P10.4: habitat capitals are used by every empire; jobsByEmpire is read by
 * authority (individualist = any non-gestalt authority) and gestaltAmenities is
 * added for Gestalt Consciousness. Not modelled (same as the regular capitals):
 * the "Additional jobs" (Roboticists, Medical Workers, Enforcers by civic or
 * species), Worker Cooperative Stewards, Order's Keep, the Expansion tradition
 * alloy discount, max districts per celestial body in the system, habitability
 * and the tier III/IV pop requirements (all technologies are researched).
 */
export const SPECIAL_CAPITAL_SETS = {
  habitat: [
    {
      id: "habitat_administration", i18nKey: "buildingHabitatAdministration", img: "buildings/building_capital.png", tier: 2, housing: 500, amenities: 500, gestaltAmenities: 300, defenseArmies: 4,
      jobsByEmpire: { individualist: { politician: 200 }, hiveMind: { synapse_drone: 200 }, machineIntelligence: { coordinator: 100, replicator: 100, logistic_drone: 200 } },
      upkeep: { energy: -3, alloys: -5 }
    },
    {
      id: "habitat_central_control", i18nKey: "buildingHabitatCentralControl", img: "buildings/building_major_capital.png", tier: 3, housing: 750, amenities: 750, gestaltAmenities: 300, defenseArmies: 8,
      jobsByEmpire: { individualist: { politician: 200, enforcer: 100 }, hiveMind: { synapse_drone: 300 }, machineIntelligence: { coordinator: 200, replicator: 100, logistic_drone: 300 } },
      upkeep: { energy: -3, alloys: -5 }, cost: { minerals: 600 }, time: 480
    },
    {
      id: "habitat_system_control", i18nKey: "buildingHabitatSystemControl", img: "buildings/building_system_capital.png", tier: 4, housing: 1000, amenities: 1000, gestaltAmenities: 300, defenseArmies: 16,
      jobsByEmpire: { individualist: { politician: 200, enforcer: 200 }, hiveMind: { synapse_drone: 400 }, machineIntelligence: { coordinator: 300, replicator: 100, logistic_drone: 300 } },
      upkeep: { energy: -5, alloys: -5 }, cost: { minerals: 800 }, time: 600
    }
  ],
  synapticLathe: [
    { id: "processing_unit", i18nKey: "buildingProcessingUnit", img: "buildings/building_lathe_capital.png", tier: 2, housing: 2000, amenities: 1500, stability: 10, upkeep: { energy: -8, alloys: -5 } },
    { id: "processing_unit_parallelized", i18nKey: "buildingProcessingUnitParallelized", img: "buildings/building_lathe_major_capital.png", tier: 3, housing: 4000, amenities: 3000, stability: 10, maxDistricts: 2, requires: [{ type: "unmodelled", i18nKey: "reqCosmogenesisPerk" }], upkeep: { energy: -8, alloys: -10 }, cost: { alloys: 2000 }, time: 480 },
    { id: "processing_unit_vectorial", i18nKey: "buildingProcessingUnitVectorial", img: "buildings/building_lathe_super_capital.png", tier: 4, housing: 10000, amenities: 5000, stability: 15, maxDistricts: 4, requires: [{ type: "unmodelled", i18nKey: "reqCosmogenesisPerk" }], upkeep: { energy: -8, alloys: -15 }, cost: { alloys: 2000 }, time: 600 }
  ]
};

/**
 * Jobs that only special bodies create (wiki 4.5.2 *Jobs*); not in JOBS yet.
 * Outputs per pop, upkeep negative.
 */
export const SPECIAL_BODY_JOBS = {
  clerk: { stratum: "worker", outputs: { trade: 3 }, amenities: 300, tradeFromJobsPct: 1, empire: "individualist" },
  thermoforger: { stratum: "worker", swapOf: "miner", outputs: { minerals: 5, alloys: 0.5 }, upkeep: { energy: -1 } },
  thermotechnic_mentor: {
    stratum: "specialist", outputs: { research: 1, unity: 1 },
    upkeepByEmpire: { individualist: { consumer_goods: -3 }, gestalt: { minerals: -7 } },
    // Per 100 workforce producing minerals/energy/consumer goods/alloys: +0.05 unity/physics/society/engineering, up to +3 each.
    scalingInfo: true
  },
  // Neural Chip output scales with the total number of chips (×total/2000 output, ×total/4000 upkeep).
  neural_chip: { stratum: "computingComponent", outputs: { society: 0.375, physics: 0.375, engineering: 0.375, advanced_logic: 0.025 }, upkeep: { energy: -4.5 }, scaling: { output: 2000, upkeep: 4000 } }
};

/**
 * Job swaps (P21.1). Source: wiki 4.5.2 *Jobs* page, "Job swaps" section and
 * every row whose source column reads "<Base> job swap: (...)". Every value
 * is copied as written on the wiki and stays `unverified` until P14.
 * Audited in PLANET_SIM_GDD.md §6.1.
 *
 * Wiki rules: a swapped job replaces EVERY job of its base job on the planet;
 * it produces its own output but inherits the base job's modifiers (building
 * bonuses, efficiency, edicts...). When several swaps of one base job have
 * their conditions met, the highest weight wins; the output changes of the
 * other met swaps stack "save exceptions": here only the changes the wiki
 * lists on the winning job ("With X swap conditions: ...") stack (`withSwaps`),
 * nothing else (assumption, GDD §9).
 *
 * ── Format ─────────────────────────────────────────────────────────────
 * JOB_SWAPS: { id, img, base, weight, empire, output, upkeepByType, effects,
 *   requires, withSwaps, notModelledKeys }
 *  - id: job id (same as JOBS / JOB_OUTPUTS in planet-data.js when the job
 *    already exists there: angler, pearl_diver, crystal_miner, mote_harvester,
 *    gas_extractor, thermoforger, priest, death_priest, educator, merchant,
 *    prosperity_preacher). Name: i18n key job<PascalCase id> = wiki English
 *    name (individualist variant). `img` = the wiki row icon in the assets repository (jobs/).
 *  - base: base job id, or a list when the wiki gives several (Chronicle
 *    Drone). A base job not in the simulator (Spawning Drone, Telepath,
 *    Evaluator, Lubrication Terminal) makes the swap info only.
 *  - weight: number, { individualist, gestalt } when the wiki splits it,
 *    null when the wiki gives none (the "Event jobs" table, Devoted Adept).
 *  - empire: "individualist" | "gestalt" | "machine" | "any" (wiki Empire
 *    column; absent on the wiki = individualist for Elite/Specialist rows).
 *  - output: per staffed job (wiki "per 100 workforce", jobs are ×100), output
 *    and upkeep together (upkeep negative) as JOB_OUTPUTS; amenities ÷100.
 *    Untyped "+1 Research" = +1 of each research type (same reading as
 *    Experiment Engineer / Thermotechnic Mentor). Individualist upkeep.
 *  - upkeepByType: upkeep replacing the consumer goods one for other empire /
 *    species types when the wiki lists it: keys machine / hive (authority) or
 *    organic / lithoid / infernal / machine (species, `speciesExtra: true` =
 *    added to `output`, Chronicle Drone).
 *  - effects: non-resource effects per job (JOB_EFFECTS keys: stability,
 *    crime, navalCapacity, defenseArmies).
 *  - requires: ALL must be met. Rules of js/building-requirements.js plus:
 *      { type: "building", ids }        one of these buildings (planet-data ids) active on the planet
 *      { type: "zone", ids }            one of these district specializations chosen
 *      { type: "designation", ids }     planet designation is one of these
 *      { type: "planetModifier", ids }  one of these planet modifiers active
 *      { type: "branchBuilding", ids }  P19 branch office building active on the planet
 *      { type: "swap", id }             the conditions of that swap are met ("X conditions AND")
 *      { type: "origin", ids, i18nKey }  P10.6: the empire origin (only Wilderness is modelled)
 *      { type: "unmodelled", kind, i18nKey }  condition the simulator cannot evaluate (text in js/i18n.js)
 *        (kind: origin, authority, building, zone, feature, planetModifier,
 *        habitability); for job swaps it is NEVER met (otherwise every
 *        Wilderness / origin swap would always apply), so the swap is listed
 *        but not applied. Inside anyOf it counts as not met as well.
 *    "A; B" inside the wiki parentheses = A and B, except where the items
 *    cannot hold together (Scrap Miner, Culture Worker, Zookeeper, Science
 *    Director, Merchant: "one of").
 *  - withSwaps: [{ swaps: [ids], output, effects }] output changes added
 *    when one of those swaps also has its conditions met.
 *  - withZone: { zone, output } output change while that specialization is
 *    chosen (Angler under Exotic Gas Capture, already modelled in P10.10).
 *  - notModelledKeys: i18n keys of the effects listed on the wiki but not
 *    computed (P13.8: English until P15).
 */

import { ANGLERS_WET_CLIMATE, WILDERNESS_ORIGIN } from "./planet-data.js";

const civ = (...keys) => ({ type: "civic", keys });
const noCiv = (...keys) => ({ type: "notCivic", keys });
const auth = (...ids) => ({ type: "authority", ids });
const bld = (...ids) => ({ type: "building", ids });
const zone = (...ids) => ({ type: "zone", ids });
const pm = (...ids) => ({ type: "planetModifier", ids });
const branch = (...ids) => ({ type: "branchBuilding", ids });
const swap = (id) => ({ type: "swap", id });
const anyOf = (...rules) => ({ type: "anyOf", rules });
const um = (kind, i18nKey) => ({ type: "unmodelled", kind, i18nKey }); // P13.8: i18n key of the condition text
const R1 = { physics: 1, society: 1, engineering: 1 }; // untyped "+1 Research"

const CATALYTIC = ["civicCatalyticProcessing", "civicCorporateCatalyticProcessing", "civicHiveCatalyticProcessing", "civicMachineCatalyticProcessing"];
const CRAFTERS = ["civicCrafters", "civicCorporateCrafters"];
const ASTROMETEOROLOGY = ["civicAstrometeorology", "civicCorporateAstrometeorology", "civicHiveAstrometeorology", "civicMachineAstrometeorology"];
const DEATH_CULT = ["civicDeathCult", "civicCorporateDeathCult"];
const SUPERSTITIOUS_ALL = ["civicSuperstitiousBeliefs", "civicCorporateSuperstitiousBeliefs"];
const MEMORIALIST = ["civicMemorialist", "civicHiveMemorialist", "civicMachineMemorialist"];
const CURATORS = ["civicGalacticCurators", "civicCorporateGalacticCurators", "civicHiveGalacticCurators", "civicMachineGalacticCurators"];
const STORM = ["civicStormDevotion", "civicCorporateStormDevotion"];
const PLEASURE = ["civicPleasureSeekers", "civicCorporateHedonism"];
const FIRE = "civicPyrolatry";
const LOW_HABITABILITY = um("habitability", "swapReqPlanetHabitabilityForMainSpeciesIs");
const ASTRAL_SIPHON = bld("astral_siphon", "astral_funnel", "astral_nexus");
const OBSERVATORY = um("building", "swapReqAstrometeorologyObservatory");
const SACRIFICE = "swapNotModelled15UnityWhileASacrifice";
const ATTRACTION_NOBLE = "swapNotModelled2Authoritarian01EgalitarianAttraction";
const GOV_ATTRACTION = "swapNotModelled10GoverningEthicsAttraction";
const CHRONICLER_ETHICS = "swapNotModelledDeathChroniclerAdditionalEffectsBasedOn";

// Repeated "With X swap conditions" blocks of the Administrators table.
const W_MANAGER = { swaps: ["manager"], output: { trade: 2 } };
const W_STEWARD = { swaps: ["steward"], output: { trade: 1, amenities: 1 } };
const W_PRIEST = { swaps: ["priest", "prosperity_preacher"], output: { amenities: 2 } };
const W_CULTURE = { swaps: ["culture_worker"], output: { amenities: 3 }, notModelledKeys: [GOV_ATTRACTION] };
const W_CHRONICLER = { swaps: ["death_chronicler"], effects: { stability: 0.2 }, notModelledKeys: [CHRONICLER_ETHICS] };
const W_DEATH_PRIEST = { swaps: ["death_priest"], output: { unity: -1, amenities: 2, society: 0.5 }, notModelledKeys: [SACRIFICE] };
const GESTALT_RESEARCH_UPKEEP = { machine: { energy: -6 }, hive: { minerals: -8 } };

export const JOB_SWAPS = [
  // ── Elite: Politician (Politicians category) ──────────────────────────
  { id: "executive", img: "jobs/job_executive.png", base: "politician", weight: 5, output: { unity: 5, amenities: 3, trade: 4, consumer_goods: -3 },
    requires: [anyOf(auth("corporate"), civ("civicGalacticSovereign"))] },
  { id: "science_director", img: "jobs/job_researcher.png", base: "politician", weight: 5, output: { unity: 4, ...R1, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicTechnocracy"), bld("research_institute", "vultaum_reality_computer"), um("building", "swapReqQuantumInnovationNexus"), um("building", "swapReqTranscendentalInnovationDepartment"))] },
  { id: "noble", img: "jobs/job_noble.png", base: "politician", weight: 10, output: { unity: 5, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [anyOf(civ("civicAristocraticElite"), um("authority", "swapReqImperialChipsetImperialNetwork"))], notModelledKeys: [ATTRACTION_NOBLE] },
  { id: "merchant", img: "jobs/job_merchant.png", base: "politician", weight: 10, output: { unity: 3.5, trade: 6, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicMerchantGuilds"), um("building", "swapReqGalacticStockExchangeGalacticCommerceHub"),
      branch("imperialConcessionPort", "corporateEmbassy", "disinformationCenter"))] },
  { id: "high_priest", img: "jobs/job_priest.png", base: "politician", weight: 10, output: { unity: 6, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicExaltedPriesthood"), um("authority", "swapReqTranscendentTheocracy"), um("building", "swapReqCitadelOfFaith"))], notModelledKeys: ["swapNotModelled01MaterialistAttractionForThis"] },
  { id: "planetary_warden", img: "jobs/job_enforcer.png", base: "politician", weight: 15, output: { unity: 5, amenities: 3, consumer_goods: -3 }, effects: { stability: 1 },
    requires: [{ type: "designation", ids: ["penalColony"] }] },
  { id: "noble_researcher", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 4, ...R1, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("science_director")], notModelledKeys: [ATTRACTION_NOBLE] },
  { id: "sacred_noble", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("high_priest")], notModelledKeys: [ATTRACTION_NOBLE, "swapNotModelled01MaterialistAttractionForThis"] },
  { id: "patrician", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 3.5, trade: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("merchant")], notModelledKeys: [ATTRACTION_NOBLE] },
  { id: "tech_visionary", img: "jobs/job_executive.png", base: "politician", weight: 20, output: { unity: 2.5, ...R1, trade: 6, amenities: 3, consumer_goods: -3 },
    requires: [swap("science_director"), swap("merchant")] },
  { id: "augmentation_merchant", img: "jobs/job_augmentor.png", base: "politician", weight: 20, output: { unity: 3.5, trade: 10, amenities: 3, consumer_goods: -3 },
    requires: [civ("civicCorporateAugmentationBazaars")] },
  { id: "high_astrologist", img: "jobs/job_superstitious_beliefs_priest.png", base: "politician", weight: 20, output: { unity: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ("civicSuperstitiousBeliefs")] },
  { id: "fortune_broker", img: "jobs/job_superstitious_beliefs_priest.png", base: "politician", weight: 20, output: { unity: 5, trade: 10, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ("civicCorporateSuperstitiousBeliefs")] },
  { id: "fire_oracle", img: "jobs/job_fire_oracle.png", base: "politician", weight: 25, output: { unity: 6, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), LOW_HABITABILITY] },
  { id: "blazewright", img: "jobs/job_blazewright.png", base: "politician", weight: 26, output: { unity: 7.5, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicSuperstitiousBeliefs"), noCiv("civicAristocraticElite"), LOW_HABITABILITY] },
  { id: "radiant_priest", img: "jobs/job_radiant_priest.png", base: "politician", weight: 26, output: { unity: 7.5, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicExaltedPriesthood"), LOW_HABITABILITY] },
  { id: "pyrocrat", img: "jobs/job_pyrocrat.png", base: "politician", weight: 26, output: { unity: 6, amenities: 7, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ(FIRE), civ("civicAristocraticElite"), noCiv("civicSuperstitiousBeliefs"), LOW_HABITABILITY] },
  { id: "ashbroker", img: "jobs/job_ashbroker.png", base: "politician", weight: 26, output: { unity: 4.5, trade: 6, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicMerchantGuilds"), LOW_HABITABILITY] },
  { id: "blazing_harbinger", img: "jobs/job_pyrocrat.png", base: "politician", weight: 27, output: { unity: 8, amenities: 7, consumer_goods: -3 }, effects: { stability: 0.52 },
    requires: [civ(FIRE), civ("civicAristocraticElite"), civ("civicSuperstitiousBeliefs"), LOW_HABITABILITY] },
  { id: "technophant", img: "jobs/job_technophant.png", base: "politician", weight: 20, output: { unity: 5, engineering: 2, amenities: 2, consumer_goods: -3 },
    requires: [um("origin", "swapReqCyberneticCreed")],
    withSwaps: [
      { swaps: ["science_director"], output: { unity: -1, ...R1 } },
      { swaps: ["noble"], effects: { stability: 0.5 } },
      { swaps: ["high_priest"], output: { unity: 1 } },
      { swaps: ["executive"], output: { trade: 4 } },
      { swaps: ["merchant", "augmentation_merchant"], output: { unity: -1.5, trade: 6 } },
      { swaps: ["planetary_warden"], effects: { stability: 1 } }
    ] },

  // ── Specialists: industrial ──────────────────────────────────────────
  { id: "catalytic_technician", img: "jobs/job_foundry.png", base: "metallurgist", weight: 5, empire: "any", output: { alloys: 3.75, food: -9 },
    requires: [civ(...CATALYTIC)], notModelledKeys: ["swapNotModelledRoboticMainSpecies125Alloys"] },
  { id: "artificer", img: "jobs/job_artificer.png", base: "artisan", weight: 5, output: { consumer_goods: 8, trade: 2, minerals: -6 },
    requires: [civ(...CRAFTERS)], notModelledKeys: ["swapNotModelledCatalyticProcessing15ConsumerGoods"] },
  { id: "pearl_diver", img: "jobs/job_pearl_diver.png", base: "artisan", weight: 5, output: { consumer_goods: 6, trade: 2, minerals: -4, food: -3 },
    requires: [...ANGLERS_WET_CLIMATE], notModelledKeys: ["swapNotModelledCatalyticProcessing15ConsumerGoods2"] },
  { id: "pearl_crafter", img: "jobs/job_pearl_diver.png", base: "artisan", weight: 10, output: { consumer_goods: 8, trade: 4, minerals: -4, food: -3 },
    requires: [swap("pearl_diver"), swap("artificer")], notModelledKeys: ["swapNotModelledCatalyticProcessing15ConsumerGoods2"] },

  // ── Specialists: research ────────────────────────────────────────────
  { id: "astrometeorologist", img: "jobs/job_astrometeorologist.png", base: "physicist", weight: 5, empire: "any", output: { physics: 3, consumer_goods: -1.5 },
    upkeepByType: { machine: { energy: -3 }, hive: { minerals: -4 } },
    requires: [civ(...ASTROMETEOROLOGY), OBSERVATORY], notModelledKeys: ["swapNotModelled2PhysicsDuringAStormOr"] },
  { id: "astral_researcher", img: "jobs/job_astral_researcher.png", base: "physicist", weight: 5, output: { physics: 3, consumer_goods: -1 },
    upkeepByType: { machine: { energy: -2 }, hive: { minerals: -2 } },
    requires: [ASTRAL_SIPHON], notModelledKeys: ["swapNotModelledBonusPhysicsAndAstralThreadsExtra"] },
  { id: "astral_meteorologist", img: "jobs/job_astrometeorologist.png", base: "physicist", weight: 20, output: { physics: 3, consumer_goods: -1.5 },
    requires: [civ(...ASTROMETEOROLOGY), OBSERVATORY, ASTRAL_SIPHON], notModelledKeys: ["swapNotModelled2PhysicsDuringAStormOr", "swapNotModelledBonusPhysicsAndAstralThreadsExtra2"] },
  { id: "extradimensional_research_unit", img: "jobs/job_extradimensional_research_unit.png", base: "physicist", weight: 100, empire: "machine", output: { physics: 3, minerals: 4, alloys: 2, zro: -1 },
    requires: [um("origin", "swapReqShroudForged"), um("building", "swapReqMaterialityEngine")], notModelledKeys: ["swapNotModelledVariesWithThePowerOfThe"] },
  { id: "ranger", img: "jobs/job_ranger.png", base: "biologist", weight: 5, output: { society: 3, amenities: 3, consumer_goods: -1.5 },
    requires: [civ("civicEnvironmentalist"), um("building", "swapReqRangerLodge")] },
  { id: "zookeeper", img: "jobs/job_xeno_zoo_keeper.png", base: "biologist", weight: 15, output: { society: 3.5, amenities: 4, consumer_goods: -2 },
    requires: [anyOf(um("zone", "swapReqXenobiologicalZoo"), um("building", "swapReqAlienZoo"), um("building", "swapReqPinnipedSanctuary"), um("feature", "swapReqAlienSafari"))],
    notModelledKeys: ["swapNotModelled200AmenitiesPer100WorkforceOf"] },
  { id: "archaeo_engineer", img: "jobs/job_archaeoengineers.png", base: "biologist", weight: { individualist: 20, gestalt: 3 }, empire: "any", output: { society: 3.25, consumer_goods: -2 },
    upkeepByType: { machine: { energy: -4 }, hive: { minerals: -5 } },
    requires: [um("building", "swapReqFacultyOfArchaeostudies")], notModelledKeys: ["swapNotModelled025MinorArtifactsOnA", "swapNotModelled015MinorArtifactsWithThe"] },
  { id: "observator_drone", img: "jobs/job_observator_drone.png", base: "biologist", weight: 10, empire: "machine", output: { physics: 4.5, society: 4.5, zro: -1 },
    requires: [um("origin", "swapReqShroudForged"), um("building", "swapReqShroudObservatoryZroniEquilibrator")] },
  { id: "nanotech_researcher", img: "jobs/job_engineer.png", base: "engineer", weight: 15, output: { engineering: 4, nanites: -1, consumer_goods: -1.5 },
    upkeepByType: { machine: { energy: -3 } },
    requires: [{ type: "tradition" }, um("building", "swapReqNaniteResearchFacilityNaniteResearchComplex")] },

  // ── Specialists: Administrators (Bureaucrat) ─────────────────────────
  { id: "manager", img: "jobs/job_manager.png", base: "bureaucrat", weight: 2, output: { unity: 3, trade: 2, consumer_goods: -2 },
    requires: [auth("corporate"), noCiv("civicWorkerCoop")] },
  { id: "steward", img: "jobs/job_manager.png", base: "bureaucrat", weight: 10, output: { unity: 3, trade: 1, amenities: 1, consumer_goods: -2 },
    requires: [auth("corporate"), civ("civicWorkerCoop")] },
  { id: "priest", img: "jobs/job_priest.png", base: "bureaucrat", weight: 5, output: { unity: 3, amenities: 2, consumer_goods: -2 },
    requires: [{ type: "notAuthority", ids: ["corporate"] }, anyOf({ type: "ethic", ids: ["spiritualist"] }, { type: "federation" })] },
  { id: "prosperity_preacher", img: "jobs/job_numistic_priest.png", base: "bureaucrat", weight: 15, output: { unity: 3, amenities: 2, consumer_goods: -2 },
    requires: [auth("corporate"), anyOf({ type: "ethic", ids: ["spiritualist"] }, { type: "federation" })], withSwaps: [W_MANAGER, W_STEWARD] },
  // Wiki output +6 Trade and upkeep −2 Trade: net +4.
  { id: "numistic_priest", img: "jobs/job_numistic_priest.png", base: "bureaucrat", weight: 20, output: { unity: 2, trade: 4, amenities: 2, consumer_goods: -1 },
    requires: [um("building", "swapReqNumisticShrine")], withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST] },
  { id: "unification_officer", img: "jobs/job_overlord_propagandist.png", base: "bureaucrat", weight: 25, output: { unity: 3, amenities: 3, consumer_goods: -1 },
    requires: [um("origin", "swapReqPayback"), pm("unifiedPurpose")], withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST] },
  { id: "culture_worker", img: "jobs/job_culture_worker.png", base: "bureaucrat", weight: 30, output: { unity: 3, amenities: 3, consumer_goods: -2 },
    requires: [anyOf(um("zone", "swapReqMemoryHall"), um("zone", "swapReqUnshackledMemorial"), um("building", "swapReqMinistryOfCulture"))],
    withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST], notModelledKeys: [GOV_ATTRACTION] },
  { id: "death_priest", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 35, output: { unity: 2, amenities: 4, society: 0.5, consumer_goods: -2 },
    requires: [civ(...DEATH_CULT), noCiv(...SUPERSTITIOUS_ALL)], withSwaps: [{ swaps: ["steward"], output: { trade: 1, amenities: 1 } }, W_CULTURE], notModelledKeys: [SACRIFICE] },
  { id: "fire_dancer", img: "jobs/job_fire_dancer.png", base: "bureaucrat", weight: 40, output: { unity: 3, amenities: 4, consumer_goods: -2 }, effects: { stability: 0.5 },
    requires: [civ(FIRE)], withSwaps: [W_CULTURE] },
  { id: "death_chronicler", img: "jobs/job_death_chronicler.png", base: "bureaucrat", weight: 200, output: { unity: 3, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ(...MEMORIALIST)], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, { swaps: ["priest"], output: { amenities: 2 } }, W_DEATH_PRIEST], notModelledKeys: [CHRONICLER_ETHICS] },
  { id: "extinction_manager", img: "jobs/job_manager.png", base: "bureaucrat", weight: 300, output: { unity: 2, amenities: 4, society: 0.5, trade: 2, consumer_goods: -2 },
    requires: [swap("death_priest"), swap("manager")], withSwaps: [W_CULTURE, W_CHRONICLER], notModelledKeys: [SACRIFICE] },
  { id: "spirit_medium", img: "jobs/job_superstitious_beliefs_priest.png", base: "bureaucrat", weight: 400, output: { unity: 3, amenities: 2, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ("civicSuperstitiousBeliefs"), noCiv("civicDeathCult")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  { id: "fortune_teller", img: "jobs/job_superstitious_beliefs_priest.png", base: "bureaucrat", weight: 400, output: { unity: 3, amenities: 2, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ("civicCorporateSuperstitiousBeliefs"), noCiv("civicDeathCult")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_CHRONICLER] },
  { id: "fire_seer", img: "jobs/job_fire_seer.png", base: "bureaucrat", weight: 450, output: { unity: 3, amenities: 8, consumer_goods: -2 }, effects: { stability: 2.2 },
    requires: [civ(FIRE), civ("civicSuperstitiousBeliefs")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  // The wiki lists the Death Chronicler block twice on the Pyromancer: counted once.
  { id: "pyromancer", img: "jobs/job_fire_dancer.png", base: "bureaucrat", weight: 450, output: { unity: 3, amenities: 8, consumer_goods: -2 }, effects: { stability: 2 },
    requires: [civ(FIRE), civ("civicAristocraticElite")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  { id: "cremator", img: "jobs/job_cremator.png", base: "bureaucrat", weight: 450, output: { unity: 2, amenities: 10, society: 0.5, consumer_goods: -2 }, effects: { stability: 2 },
    requires: [civ(FIRE), civ(...DEATH_CULT)], withSwaps: [W_CULTURE, W_CHRONICLER], notModelledKeys: [SACRIFICE] },
  { id: "corpse_reader", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 500, output: { unity: 2, amenities: 6, society: 1, consumer_goods: -2 }, effects: { stability: 1 },
    requires: [civ("civicSuperstitiousBeliefs"), civ("civicDeathCult")], withSwaps: [W_CULTURE, W_CHRONICLER], notModelledKeys: [SACRIFICE] },
  { id: "corpse_broker", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 500, output: { unity: 2, amenities: 6, society: 1, consumer_goods: -2 }, effects: { stability: 1 },
    requires: [civ("civicCorporateSuperstitiousBeliefs"), civ("civicDeathCult")],
    withSwaps: [W_MANAGER, { swaps: ["steward"], output: { trade: 1 } }, W_CULTURE, W_CHRONICLER], notModelledKeys: [SACRIFICE] },
  { id: "haruspex", img: "jobs/job_haruspex.png", base: "bureaucrat", weight: 500, output: { unity: 2, engineering: 1, amenities: 4, consumer_goods: -2 },
    requires: [um("origin", "swapReqCyberneticCreed")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_DEATH_PRIEST, W_CHRONICLER] },
  { id: "devoted_adept", img: "jobs/job_haruspex.png", base: "bureaucrat", weight: null, output: { unity: 2, engineering: 1, amenities: 4, consumer_goods: -2 },
    requires: [um("origin", "swapReqTheSacredPath")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_DEATH_PRIEST, W_CHRONICLER] },
  { id: "chronicle_drone", img: "jobs/job_death_chronicler.png", base: ["coordinator", "synapse_drone"], weight: 3, empire: "gestalt", output: { unity: 3.5, energy: -2 }, effects: { stability: 0.2 },
    upkeepByType: { speciesExtra: true, organic: { food: -2 }, lithoid: { minerals: -2 }, infernal: { minerals: -2 }, machine: { energy: -2 } },
    requires: [civ(...MEMORIALIST)] },
  { id: "curator_drone", img: "jobs/job_historical_curator.png", base: "evaluator", weight: 10, empire: "gestalt", output: { unity: 2, amenities: 3, energy: -2 },
    requires: [anyOf(civ(...CURATORS), um("building", "swapReqHoloMuseum"))] },

  // ── Specialists: Amenities (Entertainer), crime, naval, growth, ascension ──
  { id: "duelist", img: "jobs/job_duelist.png", base: "entertainer", weight: 5, output: { amenities: 12.5, unity: 1, alloys: -0.5 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), noCiv(...STORM)], notModelledKeys: ["swapNotModelled2Militarist01PacifistAttraction", "swapNotModelledBattleThrallSlavesCanWorkIt"] },
  { id: "storm_dancer", img: "jobs/job_storm_dancer.png", base: "entertainer", weight: 5, output: { amenities: 12.5, unity: 2, consumer_goods: -2 },
    requires: [civ(...STORM), noCiv("civicWarriorCulture")] },
  { id: "museum_curator", img: "jobs/job_historical_curator.png", base: "entertainer", weight: 10, output: { amenities: 12.5, unity: 0.5, society: 0.5, consumer_goods: -2 },
    requires: [anyOf(civ(...CURATORS), um("building", "swapReqHoloMuseum"))] },
  { id: "storm_duelist", img: "jobs/job_duelist.png", base: "entertainer", weight: 20, output: { amenities: 12.5, unity: 2.5, alloys: -1 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), civ(...STORM)], notModelledKeys: ["swapNotModelled2Militarist01PacifistAttraction", "swapNotModelledBattleThrallSlavesCanWorkIt"] },
  { id: "historic_reenactor", img: "jobs/job_duelist.png", base: "entertainer", weight: 20, output: { amenities: 12.5, unity: 1, society: 0.5, alloys: -1 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), swap("museum_curator")], notModelledKeys: ["swapNotModelled2Militarist01PacifistAttraction", "swapNotModelledBattleThrallSlavesCanWorkIt"] },
  { id: "mutagenic_spa_attendant", img: "jobs/job_bath_attendant.png", base: "lubrication_terminal", weight: 5, empire: "machine", output: { amenities: 5, consumer_goods: -2 },
    requires: [civ("civicMachineServitor")], notModelledKeys: ["swapNotModelledHospitalityServitor5BioTrophyJob"] },
  { id: "educator", img: "jobs/job_educator.png", base: "enforcer", weight: 10, output: { unity: 2.5, consumer_goods: -1 }, effects: { crime: -20, defenseArmies: 0.5 },
    requires: [civ("civicCivilEducation")], notModelledKeys: ["swapNotModelled10EthicsAttraction"] },
  { id: "necromancer", img: "jobs/job_necromancer.png", base: "soldier", weight: 50, output: { society: 0.5, engineering: 0.5, alloys: -1, consumer_goods: -0.5 }, effects: { navalCapacity: 4, stability: 0.15, defenseArmies: 1 },
    requires: [civ("civicReanimatedArmies")] },
  { id: "offspring_drone", img: "jobs/job_spawning_drone.png", base: "spawning_drone", weight: 10, empire: "gestalt", output: { amenities: 5 },
    upkeepByType: { organic: { food: -5 }, lithoid: { minerals: -5 }, infernal: { alloys: -2 } },
    requires: [um("origin", "swapReqProgenitorHive")], notModelledKeys: ["swapNotModelled2OrganicPopAssembly", "swapNotModelled10MenialDroneOutput", "swapNotModelledOffspringLedArmies"] },
  { id: "genomic_researcher", img: "jobs/job_genomic_researcher.png", base: "medical_worker", weight: 10, output: { amenities: 7.5, society: 1.75, consumer_goods: -3 },
    requires: [um("building", "swapReqGenomicResearchFacility")], notModelledKeys: ["swapNotModelled5PopGrowthSpeed5Organic", "swapNotModelled175SocietyAfterTheBiomorphosis", "swapNotModelled10BaseJobWeight"] },
  { id: "genomic_drone", img: "jobs/job_genomic_researcher.png", base: "spawning_drone", weight: 15, empire: "gestalt", output: { amenities: 5, society: 1.75 },
    upkeepByType: { organic: { food: -10 }, lithoid: { minerals: -10 }, infernal: { alloys: -4 } },
    requires: [um("building", "swapReqGenomicResearchFacility")], notModelledKeys: ["swapNotModelled2OrganicPopAssembly", "swapNotModelled175SocietyAfterTheBiomorphosis"] },
  { id: "psionic_mentor", img: "jobs/job_telepath.png", base: "telepath", weight: 10, output: { unity: 4.5, energy: -1 }, effects: { crime: -5 },
    requires: [civ("civicCivilEducation")], notModelledKeys: ["swapNotModelled10EthicsAttraction", "swapNotModelledCovenantEffects"] },

  // ── Workers ──────────────────────────────────────────────────────────
  { id: "mote_harvester", img: "jobs/job_mote_harvester.png", base: "technician", weight: { individualist: 20, gestalt: 5 }, empire: "any", output: { energy: 3, volatile_motes: 0.5 },
    requires: [zone("volatileMotesHarvesting")], notModelledKeys: ["swapNotModelledRoboticFounderSpecies2Energy"] },
  { id: "photosymbiont", img: "jobs/job_photosymbiont.png", base: "technician", empire: "gestalt", weight: 10, output: { energy: 6 },
    requires: [WILDERNESS_ORIGIN], notModelledKeys: ["swapNotModelledExoticGasCapture3Energy0"] },
  { id: "scrap_miner", img: "jobs/job_miner.png", base: "miner", weight: { individualist: 5, gestalt: 2 }, empire: "any", output: { minerals: 2, alloys: 1 },
    requires: [anyOf({ type: "celestial", ids: ["shatteredRingworld"] }, um("feature", "swapReqCrashedShips"), um("feature", "swapReqFallenShipyard"))] },
  { id: "crystal_miner", img: "jobs/job_crystal_miner.png", base: "miner", weight: { individualist: 20, gestalt: 5 }, empire: "any", output: { minerals: 2, rare_crystals: 0.5 },
    requires: [zone("rareCrystalExtraction")] },
  { id: "thermoforger", img: "jobs/job_miner.png", base: "miner", weight: { individualist: 35, gestalt: 15 }, empire: "any", output: { minerals: 5, alloys: 0.5, energy: -1 },
    requires: [{ type: "celestial", ids: ["volcanic"] }] },
  { id: "grubsymbiont", img: "jobs/job_grubsymbiont.png", base: "miner", empire: "gestalt", weight: 10, output: { minerals: 4 },
    requires: [WILDERNESS_ORIGIN], notModelledKeys: ["swapNotModelledRareCrystalExtraction2Minerals0"] },
  { id: "gas_extractor", img: "jobs/job_gas_extractor.png", base: "farmer", weight: 20, empire: "any", output: { food: 3, exotic_gases: 0.5 },
    requires: [zone("exoticGasCapture")], notModelledKeys: ["swapNotModelledRoboticFounderSpecies1Food"] },
  // The Empire column says Individualist, but the condition lists the machine variants (Marine Machines, Maritime
  // Robotics): "any" (kept from P10.10).
  { id: "angler", img: "jobs/job_angler.png", base: "farmer", weight: 50, empire: "any", output: { food: 6, trade: 2 },
    requires: [...ANGLERS_WET_CLIMATE], withZone: { zone: "exoticGasCapture", output: { food: -3, exotic_gases: 0.5 } }, notModelledKeys: ["swapNotModelledRoboticFounderSpecies1Food"] },
  { id: "pollinosymbiont", img: "jobs/job_pollinosymbiont.png", base: "farmer", empire: "gestalt", weight: 100, output: { food: 6 },
    requires: [WILDERNESS_ORIGIN], notModelledKeys: ["swapNotModelledExoticGasCapture3Food0"] },

  // ── Civilians ────────────────────────────────────────────────────────
  { id: "hedonist", img: "jobs/job_fe_hedonist.png", base: "civilian", weight: 5, output: { trade: 1 }, requires: [civ(...PLEASURE)] },
  { id: "tourist", img: "jobs/job_trader.png", base: "civilian", weight: 6, output: { trade: 2 }, requires: [{ type: "designation", ids: ["resortWorld"] }] },

  // ── Event jobs (no weight on the wiki) ───────────────────────────────
  { id: "subterranean_liaison_officer", img: "jobs/job_trader.png", base: "trader", weight: null, output: { trade: 8, amenities: 3, consumer_goods: -2 },
    requires: [um("zone", "swapReqSubterraneanContactZone")] },
  { id: "subterranean_contact_drone", img: "jobs/job_politician.png", base: "logistic_drone", weight: null, empire: "gestalt", output: { trade: 6, amenities: 5 },
    upkeepByType: { hive: { minerals: -3 }, machine: { energy: -3 } }, requires: [um("zone", "swapReqSubterraneanContactZone")] },
  { id: "dimensional_portal_researcher", img: "jobs/job_physicist.png", base: "physicist", weight: null, empire: "any", output: { physics: 7, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("zone", "swapReqPortalResearchArea"), um("planetModifier", "swapReqExtradimensionalExperimentation")], notModelledKeys: ["swapNotModelledProbeTheDimensionalPortalOutcomeEffects"] },
  { id: "space_time_anomaly_researcher", img: "jobs/job_physicist.png", base: "physicist", weight: null, empire: "any", output: { physics: 4, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("feature", "swapReqSpaceTimeAnomaly")], notModelledKeys: ["swapNotModelled02DarkMatter"] },
  { id: "vent_researcher", img: "jobs/job_xeno_zoo_keeper.png", base: "biologist", weight: null, output: { society: 6, trade: 3, amenities: 3, consumer_goods: -2.5 },
    requires: [pm("stratosphericVents")] },
  { id: "munitions_decommissioner", img: "jobs/job_researcher.png", base: "engineer", weight: null, empire: "any", output: { engineering: 9, alloys: 1, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("building", "swapReqWeaponExtractionFacility")], notModelledKeys: ["swapNotModelled1MinorArtifactsAncientRelics1"] },
  { id: "dismantler", img: "jobs/job_broken_shackles_scavenger.png", base: "engineer", weight: null, empire: "any", output: { engineering: 5, alloys: 2, consumer_goods: -3.5 },
    upkeepByType: { machine: { energy: -3, minerals: -2 }, hive: { minerals: -6 } }, requires: [um("building", "swapReqManufactoriumScrapyard")] },
  { id: "cave_cleaner", img: "jobs/job_miner.png", base: "miner", weight: null, empire: "any", output: { minerals: 6 },
    requires: [um("feature", "swapReqCaveShroomVeins")], notModelledKeys: ["swapNotModelledGestalt5Minerals10MineralsFrom"] },
  { id: "nemma_miner", img: "jobs/job_miner.png", base: "miner", weight: null, empire: "any", output: { minerals: 3, food: 3 },
    requires: [um("feature", "swapReqNemmaMiningOperation")], notModelledKeys: ["swapNotModelledGestalt2Food12With"] },
  { id: "titan_hunter", img: "jobs/job_hunter.png", base: "farmer", weight: null, output: { food: 8, trade: 8 }, requires: [um("planetModifier", "swapReqDeliciousTitans")] },
  { id: "puddle_technician", img: "jobs/job_farmer.png", base: "farmer", weight: null, empire: "any", output: { alloys: 1, food: 6 },
    requires: [um("feature", "swapReqMetallicPuddles")], notModelledKeys: ["swapNotModelledRoboticMainSpecies1Food"] }
];

export const JOB_SWAPS_BY_ID = new Map(JOB_SWAPS.map((entry) => [entry.id, entry]));

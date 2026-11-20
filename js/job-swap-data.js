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
 * JOB_SWAPS: { id, name, base, weight, empire, output, upkeepByType, effects,
 *   requires, withSwaps, notModelled }
 *  - id: job id (same as JOBS / JOB_OUTPUTS in planet-data.js when the job
 *    already exists there: angler, pearl_diver, crystal_miner, mote_harvester,
 *    gas_extractor, thermoforger, priest, death_priest, educator, merchant,
 *    prosperity_preacher). `name` = wiki English name (individualist variant),
 *    `img` = the wiki row icon in the assets repository (jobs/).
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
 *      { type: "unmodelled", kind, name }  condition the simulator cannot evaluate
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
 *  - notModelled: effects listed on the wiki but not computed (English,
 *    moved to i18n in P13.8).
 */

import { ANGLERS_WET_CLIMATE } from "./planet-data.js";

const civ = (...keys) => ({ type: "civic", keys });
const noCiv = (...keys) => ({ type: "notCivic", keys });
const auth = (...ids) => ({ type: "authority", ids });
const bld = (...ids) => ({ type: "building", ids });
const zone = (...ids) => ({ type: "zone", ids });
const pm = (...ids) => ({ type: "planetModifier", ids });
const branch = (...ids) => ({ type: "branchBuilding", ids });
const swap = (id) => ({ type: "swap", id });
const anyOf = (...rules) => ({ type: "anyOf", rules });
const um = (kind, name) => ({ type: "unmodelled", kind, name });
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
const LOW_HABITABILITY = um("habitability", "Planet habitability for main species is less than 50%");
const ASTRAL_SIPHON = bld("astral_siphon", "astral_funnel", "astral_nexus");
const OBSERVATORY = um("building", "Astrometeorology Observatory");
const SACRIFICE = "+1.5 Unity while a Sacrifice edict is active";
const ATTRACTION_NOBLE = "×2 Authoritarian / ×0.1 Egalitarian attraction for this pop";
const GOV_ATTRACTION = "+10% Governing ethics attraction";
const CHRONICLER_ETHICS = "Death Chronicler: additional effects based on empire ethics";

// Repeated "With X swap conditions" blocks of the Administrators table.
const W_MANAGER = { swaps: ["manager"], output: { trade: 2 } };
const W_STEWARD = { swaps: ["steward"], output: { trade: 1, amenities: 1 } };
const W_PRIEST = { swaps: ["priest", "prosperity_preacher"], output: { amenities: 2 } };
const W_CULTURE = { swaps: ["culture_worker"], output: { amenities: 3 }, notModelled: [GOV_ATTRACTION] };
const W_CHRONICLER = { swaps: ["death_chronicler"], effects: { stability: 0.2 }, notModelled: [CHRONICLER_ETHICS] };
const W_DEATH_PRIEST = { swaps: ["death_priest"], output: { unity: -1, amenities: 2, society: 0.5 }, notModelled: [SACRIFICE] };
const GESTALT_RESEARCH_UPKEEP = { machine: { energy: -6 }, hive: { minerals: -8 } };

export const JOB_SWAPS = [
  // ── Elite: Politician (Politicians category) ──────────────────────────
  { id: "executive", name: "Executive", img: "jobs/job_executive.png", base: "politician", weight: 5, output: { unity: 5, amenities: 3, trade: 4, consumer_goods: -3 },
    requires: [anyOf(auth("corporate"), civ("civicGalacticSovereign"))] },
  { id: "science_director", name: "Science Director", img: "jobs/job_researcher.png", base: "politician", weight: 5, output: { unity: 4, ...R1, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicTechnocracy"), bld("research_institute", "vultaum_reality_computer"), um("building", "Quantum Innovation Nexus"), um("building", "Transcendental Innovation Department"))] },
  { id: "noble", name: "Noble", img: "jobs/job_noble.png", base: "politician", weight: 10, output: { unity: 5, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [anyOf(civ("civicAristocraticElite"), um("authority", "Imperial Chipset / Imperial Network"))], notModelled: [ATTRACTION_NOBLE] },
  { id: "merchant", name: "Merchant", img: "jobs/job_merchant.png", base: "politician", weight: 10, output: { unity: 3.5, trade: 6, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicMerchantGuilds"), um("building", "Galactic Stock Exchange / Galactic Commerce Hub / Interstellar Commerce Nexus"),
      branch("imperialConcessionPort", "corporateEmbassy", "disinformationCenter"))] },
  { id: "high_priest", name: "High Priest", img: "jobs/job_priest.png", base: "politician", weight: 10, output: { unity: 6, amenities: 3, consumer_goods: -3 },
    requires: [anyOf(civ("civicExaltedPriesthood"), um("authority", "Transcendent Theocracy"), um("building", "Citadel of Faith"))], notModelled: ["×0.1 Materialist attraction for this pop"] },
  { id: "planetary_warden", name: "Planetary Warden", img: "jobs/job_enforcer.png", base: "politician", weight: 15, output: { unity: 5, amenities: 3, consumer_goods: -3 }, effects: { stability: 1 },
    requires: [{ type: "designation", ids: ["penalColony"] }] },
  { id: "noble_researcher", name: "Noble Researcher", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 4, ...R1, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("science_director")], notModelled: [ATTRACTION_NOBLE] },
  { id: "sacred_noble", name: "Sacred Noble", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("high_priest")], notModelled: [ATTRACTION_NOBLE, "×0.1 Materialist attraction for this pop"] },
  { id: "patrician", name: "Patrician", img: "jobs/job_noble.png", base: "politician", weight: 20, output: { unity: 3.5, trade: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [swap("noble"), swap("merchant")], notModelled: [ATTRACTION_NOBLE] },
  { id: "tech_visionary", name: "Tech Visionary", img: "jobs/job_executive.png", base: "politician", weight: 20, output: { unity: 2.5, ...R1, trade: 6, amenities: 3, consumer_goods: -3 },
    requires: [swap("science_director"), swap("merchant")] },
  { id: "augmentation_merchant", name: "Augmentation Merchant", img: "jobs/job_augmentor.png", base: "politician", weight: 20, output: { unity: 3.5, trade: 10, amenities: 3, consumer_goods: -3 },
    requires: [civ("civicCorporateAugmentationBazaars")] },
  { id: "high_astrologist", name: "High Astrologist", img: "jobs/job_superstitious_beliefs_priest.png", base: "politician", weight: 20, output: { unity: 6, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ("civicSuperstitiousBeliefs")] },
  { id: "fortune_broker", name: "Fortune Broker", img: "jobs/job_superstitious_beliefs_priest.png", base: "politician", weight: 20, output: { unity: 5, trade: 10, amenities: 3, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ("civicCorporateSuperstitiousBeliefs")] },
  { id: "fire_oracle", name: "Fire Oracle", img: "jobs/job_fire_oracle.png", base: "politician", weight: 25, output: { unity: 6, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), LOW_HABITABILITY] },
  { id: "blazewright", name: "Blazewright", img: "jobs/job_blazewright.png", base: "politician", weight: 26, output: { unity: 7.5, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicSuperstitiousBeliefs"), noCiv("civicAristocraticElite"), LOW_HABITABILITY] },
  { id: "radiant_priest", name: "Radiant Priest", img: "jobs/job_radiant_priest.png", base: "politician", weight: 26, output: { unity: 7.5, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicExaltedPriesthood"), LOW_HABITABILITY] },
  { id: "pyrocrat", name: "Pyrocrat", img: "jobs/job_pyrocrat.png", base: "politician", weight: 26, output: { unity: 6, amenities: 7, consumer_goods: -3 }, effects: { stability: 0.5 },
    requires: [civ(FIRE), civ("civicAristocraticElite"), noCiv("civicSuperstitiousBeliefs"), LOW_HABITABILITY] },
  { id: "ashbroker", name: "Ashbroker", img: "jobs/job_ashbroker.png", base: "politician", weight: 26, output: { unity: 4.5, trade: 6, amenities: 7, consumer_goods: -3 },
    requires: [civ(FIRE), civ("civicMerchantGuilds"), LOW_HABITABILITY] },
  { id: "blazing_harbinger", name: "Blazing Harbinger", img: "jobs/job_pyrocrat.png", base: "politician", weight: 27, output: { unity: 8, amenities: 7, consumer_goods: -3 }, effects: { stability: 0.52 },
    requires: [civ(FIRE), civ("civicAristocraticElite"), civ("civicSuperstitiousBeliefs"), LOW_HABITABILITY] },
  { id: "technophant", name: "Technophant", img: "jobs/job_technophant.png", base: "politician", weight: 20, output: { unity: 5, engineering: 2, amenities: 2, consumer_goods: -3 },
    requires: [um("origin", "Cybernetic Creed")],
    withSwaps: [
      { swaps: ["science_director"], output: { unity: -1, ...R1 } },
      { swaps: ["noble"], effects: { stability: 0.5 } },
      { swaps: ["high_priest"], output: { unity: 1 } },
      { swaps: ["executive"], output: { trade: 4 } },
      { swaps: ["merchant", "augmentation_merchant"], output: { unity: -1.5, trade: 6 } },
      { swaps: ["planetary_warden"], effects: { stability: 1 } }
    ] },

  // ── Specialists: industrial ──────────────────────────────────────────
  { id: "catalytic_technician", name: "Catalytic Technician", img: "jobs/job_foundry.png", base: "metallurgist", weight: 5, empire: "any", output: { alloys: 3.75, food: -9 },
    requires: [civ(...CATALYTIC)], notModelled: ["Robotic main species: +1.25 Alloys, −3 Food"] },
  { id: "artificer", name: "Artificer", img: "jobs/job_artificer.png", base: "artisan", weight: 5, output: { consumer_goods: 8, trade: 2, minerals: -6 },
    requires: [civ(...CRAFTERS)], notModelled: ["Catalytic Processing: +1.5 Consumer goods, −9 Food instead of the Mineral upkeep"] },
  { id: "pearl_diver", name: "Pearl Diver", img: "jobs/job_pearl_diver.png", base: "artisan", weight: 5, output: { consumer_goods: 6, trade: 2, minerals: -4, food: -3 },
    requires: [...ANGLERS_WET_CLIMATE], notModelled: ["Catalytic Processing: +1.5 Consumer goods, +2 Minerals, −3 Food"] },
  { id: "pearl_crafter", name: "Pearl Crafter", img: "jobs/job_pearl_diver.png", base: "artisan", weight: 10, output: { consumer_goods: 8, trade: 4, minerals: -4, food: -3 },
    requires: [swap("pearl_diver"), swap("artificer")], notModelled: ["Catalytic Processing: +1.5 Consumer goods, +2 Minerals, −3 Food"] },

  // ── Specialists: research ────────────────────────────────────────────
  { id: "astrometeorologist", name: "Astrometeorologist", img: "jobs/job_astrometeorologist.png", base: "physicist", weight: 5, empire: "any", output: { physics: 3, consumer_goods: -1.5 },
    upkeepByType: { machine: { energy: -3 }, hive: { minerals: -4 } },
    requires: [civ(...ASTROMETEOROLOGY), OBSERVATORY], notModelled: ["+2 Physics during a storm or within a nebula"] },
  { id: "astral_researcher", name: "Astral Researcher", img: "jobs/job_astral_researcher.png", base: "physicist", weight: 5, output: { physics: 3, consumer_goods: -1 },
    upkeepByType: { machine: { energy: -2 }, hive: { minerals: -2 } },
    requires: [ASTRAL_SIPHON], notModelled: ["Bonus Physics and Astral threads, extra upkeep (up to ×2) from the Astral Siphon tier"] },
  { id: "astral_meteorologist", name: "Astral-Meteorologist", img: "jobs/job_astrometeorologist.png", base: "physicist", weight: 20, output: { physics: 3, consumer_goods: -1.5 },
    requires: [civ(...ASTROMETEOROLOGY), OBSERVATORY, ASTRAL_SIPHON], notModelled: ["+2 Physics during a storm or within a nebula", "Bonus Physics and Astral threads, extra upkeep from the Astral Siphon tier"] },
  { id: "extradimensional_research_unit", name: "Extra-dimensional Research Unit", img: "jobs/job_extradimensional_research_unit.png", base: "physicist", weight: 100, empire: "machine", output: { physics: 3, minerals: 4, alloys: 2, zro: -1 },
    requires: [um("origin", "Shroud-Forged"), um("building", "Materiality Engine")], notModelled: ["Varies with the power of the Materiality Engine"] },
  { id: "ranger", name: "Ranger", img: "jobs/job_ranger.png", base: "biologist", weight: 5, output: { society: 3, amenities: 3, consumer_goods: -1.5 },
    requires: [civ("civicEnvironmentalist"), um("building", "Ranger Lodge")] },
  { id: "zookeeper", name: "Zookeeper", img: "jobs/job_xeno_zoo_keeper.png", base: "biologist", weight: 15, output: { society: 3.5, amenities: 4, consumer_goods: -2 },
    requires: [anyOf(um("zone", "Xenobiological Zoo"), um("building", "Alien Zoo"), um("building", "Pinniped Sanctuary"), um("feature", "Alien Safari"))],
    notModelled: ["+200 Amenities per 100 workforce of Conserved Fauna / Gladiatorial Beast / Protected Fauna / Gladiatorial Xeno"] },
  { id: "archaeo_engineer", name: "Archaeo-Engineer", img: "jobs/job_archaeoengineers.png", base: "biologist", weight: { individualist: 20, gestalt: 3 }, empire: "any", output: { society: 3.25, consumer_goods: -2 },
    upkeepByType: { machine: { energy: -4 }, hive: { minerals: -5 } },
    requires: [um("building", "Faculty of Archaeostudies")], notModelled: ["+0.25 Minor artifacts on a Relic World", "+0.15 Minor artifacts with the Archaeo-Engineers ascension perk"] },
  { id: "observator_drone", name: "Observator Drone", img: "jobs/job_observator_drone.png", base: "biologist", weight: 10, empire: "machine", output: { physics: 4.5, society: 4.5, zro: -1 },
    requires: [um("origin", "Shroud-Forged"), um("building", "Shroud Observatory / Zroni Equilibrator")] },
  { id: "nanotech_researcher", name: "Nanotech Researcher", img: "jobs/job_engineer.png", base: "engineer", weight: 15, output: { engineering: 4, nanites: -1, consumer_goods: -1.5 },
    upkeepByType: { machine: { energy: -3 } },
    requires: [{ type: "tradition" }, um("building", "Nanite Research Facility / Nanite Research Complex")] },

  // ── Specialists: Administrators (Bureaucrat) ─────────────────────────
  { id: "manager", name: "Manager", img: "jobs/job_manager.png", base: "bureaucrat", weight: 2, output: { unity: 3, trade: 2, consumer_goods: -2 },
    requires: [auth("corporate"), noCiv("civicWorkerCoop")] },
  { id: "steward", name: "Steward", img: "jobs/job_manager.png", base: "bureaucrat", weight: 10, output: { unity: 3, trade: 1, amenities: 1, consumer_goods: -2 },
    requires: [auth("corporate"), civ("civicWorkerCoop")] },
  { id: "priest", name: "Priest", img: "jobs/job_priest.png", base: "bureaucrat", weight: 5, output: { unity: 3, amenities: 2, consumer_goods: -2 },
    requires: [{ type: "notAuthority", ids: ["corporate"] }, anyOf({ type: "ethic", ids: ["spiritualist"] }, { type: "federation" })] },
  { id: "prosperity_preacher", name: "Prosperity Preacher", img: "jobs/job_numistic_priest.png", base: "bureaucrat", weight: 15, output: { unity: 3, amenities: 2, consumer_goods: -2 },
    requires: [auth("corporate"), anyOf({ type: "ethic", ids: ["spiritualist"] }, { type: "federation" })], withSwaps: [W_MANAGER, W_STEWARD] },
  // Wiki output +6 Trade and upkeep −2 Trade: net +4.
  { id: "numistic_priest", name: "Numistic Priest", img: "jobs/job_numistic_priest.png", base: "bureaucrat", weight: 20, output: { unity: 2, trade: 4, amenities: 2, consumer_goods: -1 },
    requires: [um("building", "Numistic Shrine")], withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST] },
  { id: "unification_officer", name: "Unification Officer", img: "jobs/job_overlord_propagandist.png", base: "bureaucrat", weight: 25, output: { unity: 3, amenities: 3, consumer_goods: -1 },
    requires: [um("origin", "Payback"), pm("unifiedPurpose")], withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST] },
  { id: "culture_worker", name: "Culture Worker", img: "jobs/job_culture_worker.png", base: "bureaucrat", weight: 30, output: { unity: 3, amenities: 3, consumer_goods: -2 },
    requires: [anyOf(um("zone", "Memory Hall"), um("zone", "Unshackled Memorial"), um("building", "Ministry of Culture"))],
    withSwaps: [W_MANAGER, W_STEWARD, W_PRIEST], notModelled: [GOV_ATTRACTION] },
  { id: "death_priest", name: "Death Priest", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 35, output: { unity: 2, amenities: 4, society: 0.5, consumer_goods: -2 },
    requires: [civ(...DEATH_CULT), noCiv(...SUPERSTITIOUS_ALL)], withSwaps: [{ swaps: ["steward"], output: { trade: 1, amenities: 1 } }, W_CULTURE], notModelled: [SACRIFICE] },
  { id: "fire_dancer", name: "Fire Dancer", img: "jobs/job_fire_dancer.png", base: "bureaucrat", weight: 40, output: { unity: 3, amenities: 4, consumer_goods: -2 }, effects: { stability: 0.5 },
    requires: [civ(FIRE)], withSwaps: [W_CULTURE] },
  { id: "death_chronicler", name: "Death Chronicler", img: "jobs/job_death_chronicler.png", base: "bureaucrat", weight: 200, output: { unity: 3, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ(...MEMORIALIST)], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, { swaps: ["priest"], output: { amenities: 2 } }, W_DEATH_PRIEST], notModelled: [CHRONICLER_ETHICS] },
  { id: "extinction_manager", name: "Extinction Manager", img: "jobs/job_manager.png", base: "bureaucrat", weight: 300, output: { unity: 2, amenities: 4, society: 0.5, trade: 2, consumer_goods: -2 },
    requires: [swap("death_priest"), swap("manager")], withSwaps: [W_CULTURE, W_CHRONICLER], notModelled: [SACRIFICE] },
  { id: "spirit_medium", name: "Spirit Medium", img: "jobs/job_superstitious_beliefs_priest.png", base: "bureaucrat", weight: 400, output: { unity: 3, amenities: 2, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ("civicSuperstitiousBeliefs"), noCiv("civicDeathCult")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  { id: "fortune_teller", name: "Fortune Teller", img: "jobs/job_superstitious_beliefs_priest.png", base: "bureaucrat", weight: 400, output: { unity: 3, amenities: 2, consumer_goods: -2 }, effects: { stability: 0.2 },
    requires: [civ("civicCorporateSuperstitiousBeliefs"), noCiv("civicDeathCult")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_CHRONICLER] },
  { id: "fire_seer", name: "Fire Seer", img: "jobs/job_fire_seer.png", base: "bureaucrat", weight: 450, output: { unity: 3, amenities: 8, consumer_goods: -2 }, effects: { stability: 2.2 },
    requires: [civ(FIRE), civ("civicSuperstitiousBeliefs")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  // The wiki lists the Death Chronicler block twice on the Pyromancer: counted once.
  { id: "pyromancer", name: "Pyromancer", img: "jobs/job_fire_dancer.png", base: "bureaucrat", weight: 450, output: { unity: 3, amenities: 8, consumer_goods: -2 }, effects: { stability: 2 },
    requires: [civ(FIRE), civ("civicAristocraticElite")], withSwaps: [W_CULTURE, W_CHRONICLER] },
  { id: "cremator", name: "Cremator", img: "jobs/job_cremator.png", base: "bureaucrat", weight: 450, output: { unity: 2, amenities: 10, society: 0.5, consumer_goods: -2 }, effects: { stability: 2 },
    requires: [civ(FIRE), civ(...DEATH_CULT)], withSwaps: [W_CULTURE, W_CHRONICLER], notModelled: [SACRIFICE] },
  { id: "corpse_reader", name: "Corpse Reader", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 500, output: { unity: 2, amenities: 6, society: 1, consumer_goods: -2 }, effects: { stability: 1 },
    requires: [civ("civicSuperstitiousBeliefs"), civ("civicDeathCult")], withSwaps: [W_CULTURE, W_CHRONICLER], notModelled: [SACRIFICE] },
  { id: "corpse_broker", name: "Corpse Broker", img: "jobs/job_death_priest.png", base: "bureaucrat", weight: 500, output: { unity: 2, amenities: 6, society: 1, consumer_goods: -2 }, effects: { stability: 1 },
    requires: [civ("civicCorporateSuperstitiousBeliefs"), civ("civicDeathCult")],
    withSwaps: [W_MANAGER, { swaps: ["steward"], output: { trade: 1 } }, W_CULTURE, W_CHRONICLER], notModelled: [SACRIFICE] },
  { id: "haruspex", name: "Haruspex", img: "jobs/job_haruspex.png", base: "bureaucrat", weight: 500, output: { unity: 2, engineering: 1, amenities: 4, consumer_goods: -2 },
    requires: [um("origin", "Cybernetic Creed")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_DEATH_PRIEST, W_CHRONICLER] },
  { id: "devoted_adept", name: "Devoted Adept", img: "jobs/job_haruspex.png", base: "bureaucrat", weight: null, output: { unity: 2, engineering: 1, amenities: 4, consumer_goods: -2 },
    requires: [um("origin", "The Sacred Path")], withSwaps: [W_MANAGER, W_STEWARD, W_CULTURE, W_DEATH_PRIEST, W_CHRONICLER] },
  { id: "chronicle_drone", name: "Chronicle Drone", img: "jobs/job_death_chronicler.png", base: ["coordinator", "synapse_drone"], weight: 3, empire: "gestalt", output: { unity: 3.5, energy: -2 }, effects: { stability: 0.2 },
    upkeepByType: { speciesExtra: true, organic: { food: -2 }, lithoid: { minerals: -2 }, infernal: { minerals: -2 }, machine: { energy: -2 } },
    requires: [civ(...MEMORIALIST)] },
  { id: "curator_drone", name: "Curator Drone", img: "jobs/job_historical_curator.png", base: "evaluator", weight: 10, empire: "gestalt", output: { unity: 2, amenities: 3, energy: -2 },
    requires: [anyOf(civ(...CURATORS), um("building", "Holo-Museum"))] },

  // ── Specialists: Amenities (Entertainer), crime, naval, growth, ascension ──
  { id: "duelist", name: "Duelist", img: "jobs/job_duelist.png", base: "entertainer", weight: 5, output: { amenities: 12.5, unity: 1, alloys: -0.5 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), noCiv(...STORM)], notModelled: ["×2 Militarist / ×0.1 Pacifist attraction for this pop", "Battle Thrall slaves can work it"] },
  { id: "storm_dancer", name: "Storm Dancer", img: "jobs/job_storm_dancer.png", base: "entertainer", weight: 5, output: { amenities: 12.5, unity: 2, consumer_goods: -2 },
    requires: [civ(...STORM), noCiv("civicWarriorCulture")] },
  { id: "museum_curator", name: "Museum Curator", img: "jobs/job_historical_curator.png", base: "entertainer", weight: 10, output: { amenities: 12.5, unity: 0.5, society: 0.5, consumer_goods: -2 },
    requires: [anyOf(civ(...CURATORS), um("building", "Holo-Museum"))] },
  { id: "storm_duelist", name: "Storm Duelist", img: "jobs/job_duelist.png", base: "entertainer", weight: 20, output: { amenities: 12.5, unity: 2.5, alloys: -1 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), civ(...STORM)], notModelled: ["×2 Militarist / ×0.1 Pacifist attraction for this pop", "Battle Thrall slaves can work it"] },
  { id: "historic_reenactor", name: "Historic Reenactor", img: "jobs/job_duelist.png", base: "entertainer", weight: 20, output: { amenities: 12.5, unity: 1, society: 0.5, alloys: -1 }, effects: { navalCapacity: 2 },
    requires: [civ("civicWarriorCulture"), swap("museum_curator")], notModelled: ["×2 Militarist / ×0.1 Pacifist attraction for this pop", "Battle Thrall slaves can work it"] },
  { id: "mutagenic_spa_attendant", name: "Mutagenic Spa Attendant", img: "jobs/job_bath_attendant.png", base: "lubrication_terminal", weight: 5, empire: "machine", output: { amenities: 5, consumer_goods: -2 },
    requires: [civ("civicMachineServitor")], notModelled: ["Hospitality Servitor: +5% Bio-Trophy job efficiency, +5% resources from First-Class Passengers"] },
  { id: "educator", name: "Educator", img: "jobs/job_educator.png", base: "enforcer", weight: 10, output: { unity: 2.5, consumer_goods: -1 }, effects: { crime: -20, defenseArmies: 0.5 },
    requires: [civ("civicCivilEducation")], notModelled: ["+10% Ethics attraction"] },
  { id: "necromancer", name: "Necromancer", img: "jobs/job_necromancer.png", base: "soldier", weight: 50, output: { society: 0.5, engineering: 0.5, alloys: -1, consumer_goods: -0.5 }, effects: { navalCapacity: 4, stability: 0.15, defenseArmies: 1 },
    requires: [civ("civicReanimatedArmies")] },
  { id: "offspring_drone", name: "Offspring Drone", img: "jobs/job_spawning_drone.png", base: "spawning_drone", weight: 10, empire: "gestalt", output: { amenities: 5 },
    upkeepByType: { organic: { food: -5 }, lithoid: { minerals: -5 }, infernal: { alloys: -2 } },
    requires: [um("origin", "Progenitor Hive")], notModelled: ["+2 Organic pop assembly", "+10% Menial Drone output", "Offspring-Led Armies"] },
  { id: "genomic_researcher", name: "Genomic Researcher", img: "jobs/job_genomic_researcher.png", base: "medical_worker", weight: 10, output: { amenities: 7.5, society: 1.75, consumer_goods: -3 },
    requires: [um("building", "Genomic Research Facility")], notModelled: ["+5% Pop growth speed, +5% Organic pop assembly speed", "+1.75 Society after the Biomorphosis situation", "×10 base job weight"] },
  { id: "genomic_drone", name: "Genomic Drone", img: "jobs/job_genomic_researcher.png", base: "spawning_drone", weight: 15, empire: "gestalt", output: { amenities: 5, society: 1.75 },
    upkeepByType: { organic: { food: -10 }, lithoid: { minerals: -10 }, infernal: { alloys: -4 } },
    requires: [um("building", "Genomic Research Facility")], notModelled: ["+2 Organic pop assembly", "+1.75 Society after the Biomorphosis situation"] },
  { id: "psionic_mentor", name: "Psionic Mentor", img: "jobs/job_telepath.png", base: "telepath", weight: 10, output: { unity: 4.5, energy: -1 }, effects: { crime: -5 },
    requires: [civ("civicCivilEducation")], notModelled: ["+10% Ethics attraction", "Covenant effects"] },

  // ── Workers ──────────────────────────────────────────────────────────
  { id: "mote_harvester", name: "Mote Harvester", img: "jobs/job_mote_harvester.png", base: "technician", weight: { individualist: 20, gestalt: 5 }, empire: "any", output: { energy: 3, volatile_motes: 0.5 },
    requires: [zone("volatileMotesHarvesting")], notModelled: ["Robotic founder species: +2 Energy"] },
  { id: "photosymbiont", name: "Photosymbiont", img: "jobs/job_photosymbiont.png", base: "technician", weight: 10, output: { energy: 6 },
    requires: [um("origin", "Wilderness")], notModelled: ["Exotic Gas Capture: −3 Energy, +0.5 Volatile motes"] },
  { id: "scrap_miner", name: "Scrap Miner", img: "jobs/job_miner.png", base: "miner", weight: { individualist: 5, gestalt: 2 }, empire: "any", output: { minerals: 2, alloys: 1 },
    requires: [anyOf({ type: "celestial", ids: ["shatteredRingworld"] }, um("feature", "Crashed Ships"), um("feature", "Fallen Shipyard"))] },
  { id: "crystal_miner", name: "Crystal Miner", img: "jobs/job_crystal_miner.png", base: "miner", weight: { individualist: 20, gestalt: 5 }, empire: "any", output: { minerals: 2, rare_crystals: 0.5 },
    requires: [zone("rareCrystalExtraction")] },
  { id: "thermoforger", name: "Thermoforger", img: "jobs/job_miner.png", base: "miner", weight: { individualist: 35, gestalt: 15 }, empire: "any", output: { minerals: 5, alloys: 0.5, energy: -1 },
    requires: [{ type: "celestial", ids: ["volcanic"] }] },
  { id: "grubsymbiont", name: "Grubsymbiont", img: "jobs/job_grubsymbiont.png", base: "miner", weight: 10, output: { minerals: 4 },
    requires: [um("origin", "Wilderness")], notModelled: ["Rare Crystal Extraction: −2 Minerals, +0.5 Rare crystals"] },
  { id: "gas_extractor", name: "Gas Extractor", img: "jobs/job_gas_extractor.png", base: "farmer", weight: 20, empire: "any", output: { food: 3, exotic_gases: 0.5 },
    requires: [zone("exoticGasCapture")], notModelled: ["Robotic founder species: −1 Food"] },
  // The Empire column says Individualist, but the condition lists the machine variants (Marine Machines, Maritime
  // Robotics): "any" (kept from P10.10).
  { id: "angler", name: "Angler", img: "jobs/job_angler.png", base: "farmer", weight: 50, empire: "any", output: { food: 6, trade: 2 },
    requires: [...ANGLERS_WET_CLIMATE], withZone: { zone: "exoticGasCapture", output: { food: -3, exotic_gases: 0.5 } }, notModelled: ["Robotic founder species: −1 Food"] },
  { id: "pollinosymbiont", name: "Pollinosymbiont", img: "jobs/job_pollinosymbiont.png", base: "farmer", weight: 100, output: { food: 6 },
    requires: [um("origin", "Wilderness")], notModelled: ["Exotic Gas Capture: −3 Food, +0.5 Exotic gases"] },

  // ── Civilians ────────────────────────────────────────────────────────
  { id: "hedonist", name: "Hedonist", img: "jobs/job_fe_hedonist.png", base: "civilian", weight: 5, output: { trade: 1 }, requires: [civ(...PLEASURE)] },
  { id: "tourist", name: "Tourist", img: "jobs/job_trader.png", base: "civilian", weight: 6, output: { trade: 2 }, requires: [{ type: "designation", ids: ["resortWorld"] }] },

  // ── Event jobs (no weight on the wiki) ───────────────────────────────
  { id: "subterranean_liaison_officer", name: "Subterranean Liaison Officer", img: "jobs/job_trader.png", base: "trader", weight: null, output: { trade: 8, amenities: 3, consumer_goods: -2 },
    requires: [um("zone", "Subterranean Contact Zone")] },
  { id: "subterranean_contact_drone", name: "Subterranean Contact Drone", img: "jobs/job_politician.png", base: "logistic_drone", weight: null, empire: "gestalt", output: { trade: 6, amenities: 5 },
    upkeepByType: { hive: { minerals: -3 }, machine: { energy: -3 } }, requires: [um("zone", "Subterranean Contact Zone")] },
  { id: "dimensional_portal_researcher", name: "Dimensional Portal Researcher", img: "jobs/job_physicist.png", base: "physicist", weight: null, empire: "any", output: { physics: 7, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("zone", "Portal Research Area"), um("planetModifier", "Extradimensional Experimentation")], notModelled: ["Probe the Dimensional Portal outcome effects"] },
  { id: "space_time_anomaly_researcher", name: "Space-Time Anomaly Researcher", img: "jobs/job_physicist.png", base: "physicist", weight: null, empire: "any", output: { physics: 4, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("feature", "Space-Time Anomaly")], notModelled: ["+0.2 Dark Matter"] },
  { id: "vent_researcher", name: "Vent Researcher", img: "jobs/job_xeno_zoo_keeper.png", base: "biologist", weight: null, output: { society: 6, trade: 3, amenities: 3, consumer_goods: -2.5 },
    requires: [pm("stratosphericVents")] },
  { id: "munitions_decommissioner", name: "Munitions Decommissioner", img: "jobs/job_researcher.png", base: "engineer", weight: null, empire: "any", output: { engineering: 9, alloys: 1, consumer_goods: -3 },
    upkeepByType: GESTALT_RESEARCH_UPKEEP, requires: [um("building", "Weapon Extraction Facility")], notModelled: ["+1 Minor artifacts (Ancient Relics), +1 more with Archaeo-Engineers"] },
  { id: "dismantler", name: "Dismantler", img: "jobs/job_broken_shackles_scavenger.png", base: "engineer", weight: null, empire: "any", output: { engineering: 5, alloys: 2, consumer_goods: -3.5 },
    upkeepByType: { machine: { energy: -3, minerals: -2 }, hive: { minerals: -6 } }, requires: [um("building", "Manufactorium Scrapyard")] },
  { id: "cave_cleaner", name: "Cave Cleaner", img: "jobs/job_miner.png", base: "miner", weight: null, empire: "any", output: { minerals: 6 },
    requires: [um("feature", "Cave Shroom Veins")], notModelled: ["Gestalt: +5 Minerals, +10% Minerals from jobs, −2 Energy"] },
  { id: "nemma_miner", name: "Nemma Miner", img: "jobs/job_miner.png", base: "miner", weight: null, empire: "any", output: { minerals: 3, food: 3 },
    requires: [um("feature", "Nemma Mining Operation")], notModelled: ["Gestalt: +2 Food (+1 / 2 with Food Processing Facilities), −2 Energy"] },
  { id: "titan_hunter", name: "Titan Hunter", img: "jobs/job_hunter.png", base: "farmer", weight: null, output: { food: 8, trade: 8 }, requires: [um("planetModifier", "Delicious Titans")] },
  { id: "puddle_technician", name: "Puddle Technician", img: "jobs/job_farmer.png", base: "farmer", weight: null, empire: "any", output: { alloys: 1, food: 6 },
    requires: [um("feature", "Metallic Puddles")], notModelled: ["Robotic main species: −1 Food"] }
];

export const JOB_SWAPS_BY_ID = new Map(JOB_SWAPS.map((entry) => [entry.id, entry]));

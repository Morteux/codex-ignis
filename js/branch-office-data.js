/**
 * Branch offices placed on this planet by another (corporate) empire (P19).
 *
 * Source: game files 4.6.0 (`common/buildings`; values switched in T2523,
 * `reports/stellaris-pc-4.6.0/buildings.md`). The wiki 4.5.2 *Holdings* → Branch
 * offices (legal / Criminal Heritage illegal corporate buildings, civic and
 * ascension corporate buildings) and *Capital building* (branch office building
 * slots per capital, read from the HTML page: the markdown drops the slot icons)
 * stay the source of what the game files do not give (the table layout, texts,
 * modelling notes). Audited in P19.1 (PLANET_SIM_GDD.md §5.2); `unverified`
 * until P14.
 *
 * The planet is the HOST (the colony). The branch office OWNER is another
 * empire: its civics only matter for the corporate buildings it can build and
 * for the per-civic trade bonuses; they are chosen in the Sucursales tab
 * (P19.2), never taken from the host empire.
 *
 * ── Format ─────────────────────────────────────────────────────────────
 * BRANCH_OFFICE_BUILDINGS: { id, i18nKey, img, kind, illegal, jobs, jobTrade,
 *   colony, owner, upkeep, cost, requires }
 *  - kind: "corporate" (legal/illegal pairs), "civic", "ascension" (wiki tables).
 *  - illegal: the Criminal Heritage illegal variant { id, i18nKey, img }
 *    ("same" = the same building is used in both; null = "Unavailable").
 *    Civic buildings have no illegal column: `branch` in requires says which
 *    branch office they need ("legal" / "illegal"); absent = both.
 *  - jobs: jobs created on the colony, ×100 like every job count (+200 = 2 pops).
 *    `illegalJobs` overrides them for the illegal variant when the wiki lists
 *    it (Private Security Company); the other illegal variants follow
 *    ILLEGAL_BRANCH_RULES (half of the jobs become Criminals, +25 crime).
 *  - jobTrade: colony trade "Per 100 X" = per staffed job (×100 scale), on the
 *    listed jobs of the colony: { jobs, amount, perCivic, civics, allCivics }.
 *    In an illegal building the bonus applies to the colony's Criminal jobs
 *    instead (owner decision 2026-11-20, as the Private Security Company).
 *    `perCivic` is added once per OWNER civic in `civics`; `allCivics: true`
 *    = the extra is given only with every civic in `civics` (Corporate Clinic).
 *  - colony: other colony effects { tradeFromJobsPct, workerOutputPct,
 *    happinessPct, amenitiesPer100: { jobs, amount } } and `info` (i18n keys of
 *    effects shown but not computed: ethics attraction, army experience, aura...).
 *  - owner: corporate-empire effects, never applied to this planet (shown only;
 *    resource ids of planet-data.js RESOURCES plus "research" (untyped) and
 *    "navalCapacity"):
 *    perBranchValue { resource: amount } per 100 branch office value,
 *    capitalTraders: civics giving +200 Traders on the owner's capital, info.
 *  - upkeep / cost: as on the wiki (cost.alt = Nomadic alternative resource).
 *    Upkeep is paid by the host planet (owner decision 2026-11-20); cost is
 *    paid by the owner (shown only).
 *  - maxPerColony: copies allowed on one colony (P19.5), from the game files (4.5.4, same in 4.6.0)
 *    (extractor `buildings.json`: `planet_limit`, or `base_cap_amount` for the
 *    Experimentation Offices and the Living Metal Enhancement Clinic); absent =
 *    repeatable. The illegal twin shares the limit of its legal building.
 *  - requires: rules of js/building-requirements.js plus `scope`:
 *      "owner" → evaluated with the owner's civics / branch legality
 *      "host"  → evaluated with this planet (body type, capital tier)
 *    New rule types: { type: "branch", value: "legal" | "illegal" } and
 *    { type: "anyOf", rules } (one of the rules is met; an unmodelled rule
 *    counts as met, like everywhere else).
 *    Technology requirements are met (all researched), tradition ones too
 *    (same exception as edicts); origins, cybernetic/synthetic corporate
 *    authorities, Imperial Charter and pop counts are `unmodelled` (shown).
 */

import { buildingRequirementsMet, unmetRequirements } from "./building-requirements.js";
import { MAX_CIVICS, civicsConflict } from "./empire-data.js";

const civic = (...keys) => ({ type: "civic", keys, scope: "owner" });
const notCivic = (...keys) => ({ type: "notCivic", keys, scope: "owner" });
const branch = (value) => ({ type: "branch", value, scope: "owner" });
const ownerUnmodelled = (i18nKey) => ({ type: "unmodelled", i18nKey, scope: "owner" });
const hostUnmodelled = (i18nKey) => ({ type: "unmodelled", i18nKey, scope: "host" });
const notCelestial = (...ids) => ({ type: "notCelestial", ids, scope: "host" });
const tradition = (i18nKey) => ({ type: "tradition", i18nKey, scope: "owner" });
const cost = (time, influence, minerals, alt, altAmount) => ({ time, influence, minerals, alt, altAmount });
const trade = (jobs, amount, perCivic, civics) => ({ jobs, amount, perCivic, civics });

/** Branch office building slots per capital tier (I–V); habitat capitals (II–IV) and Resort / Thrall-World capitals give the same. Gestalt capitals have none (no branch offices in gestalt systems). */
export const BRANCH_OFFICE_SLOTS_BY_TIER = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 4 };

/** Where a branch office can exist (host side). */
const BRANCH_OFFICE_HOST_RULES = {
  notCelestial: ["nanite", "synapticLathe"], // Nanite Worlds (Holdings); Synaptic Lathe "Cannot have branch offices" (Celestial object)
  notGestalt: true, // systems owned by a Gestalt Consciousness
  notCivic: ["civicFanaticPurifiers"], // ... or Fanatic Purifiers (fallen empires: out of scope)
  ownerAuthority: "corporate" // built by Corporate authority empires (or Corporate Sovereign civic, Corporate civics page)
};

/** Branch office value: the owner gains trade equal to this share of the colony's current trade. */
export const BRANCH_OFFICE_VALUE = {
  legal: 0.5,
  illegal: { min: 0.25, max: 0.75 } // Criminal Heritage: 25–75 % depending on the colony's crime (formula not on the wiki)
};

/** Criminal Heritage illegal corporate buildings (wiki general text). */
export const ILLEGAL_BRANCH_RULES = {
  criminalJobShare: 0.5, // half of the produced jobs become Criminal jobs
  crime: 25, // +25 crime per illegal building
  legalMinCrimePerBuilding: 5 // Criminal Heritage owner: each LEGAL corporate building raises the colony's minimum crime by +5 (min crime not modelled)
};

const CAPITAL_TRADERS = "capitalTraders";

export const BRANCH_OFFICE_BUILDINGS = [
  // ── Legal / illegal corporate buildings ──
  { id: "commercialForum", i18nKey: "branchCommercialForum", img: "buildings/building_commercial_forum.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "smugglersPort", i18nKey: "branchSmugglersPort", img: "buildings/building_smuggling_rings.png" },
    jobs: { trader: 200 },
    jobTrade: [trade(["trader"], 0.05, 0.05, ["civicFranchising", "civicTradingPosts", "civicCorporateMemoryVault", "civicCorporateCaravanMasters"])],
    owner: { [CAPITAL_TRADERS]: ["civicFranchising", "civicTradingPosts", "civicCorporateMemoryVault", "civicCorporateCaravanMasters"] },
    upkeep: { energy: 3 }, cost: cost(480, 25, 800, "alloys", 80), requires: [] },
  { id: "mercenaryLiaisonOffice", i18nKey: "branchMercenaryLiaisonOffice", img: "buildings/building_military_contractors.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "pirateFreeHaven", i18nKey: "branchPirateFreeHaven", img: "buildings/building_pirate_haven.png" },
    jobs: { soldier: 200 },
    jobTrade: [trade(["soldier"], 0.1, 0.1, ["civicPrivateMilitaryCompanies", "civicCrusaderSpiritCorporate", "civicCorporateHiredGuns", "civicCorporateFlightSchools"])],
    colony: { info: ["branchInfoArmyExperience"] },
    owner: { perBranchValue: { navalCapacity: 5 }, [CAPITAL_TRADERS]: ["civicPrivateMilitaryCompanies", "civicCrusaderSpiritCorporate", "civicCorporateHiredGuns", "civicCorporateFlightSchools"] },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "volatile_motes", 50), requires: [] },
  { id: "privateMilitaryIndustries", i18nKey: "branchPrivateMilitaryIndustries", img: "buildings/building_private_shipyards.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "wreckingYards", i18nKey: "branchWreckingYards", img: "buildings/building_wrecking_yards.png" },
    jobs: { metallurgist: 200 },
    jobTrade: [trade(["metallurgist"], 0.1, 0.1, ["civicNavalContractors", "civicCorporateCatalyticProcessing"])],
    owner: { perBranchValue: { alloys: 3 }, [CAPITAL_TRADERS]: ["civicNavalContractors", "civicCorporateCatalyticProcessing"] },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "volatile_motes", 50), requires: [] },
  { id: "privateResearchEnterprises", i18nKey: "branchPrivateResearchEnterprises", img: "buildings/building_private_research_initiative.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "illicitResearchLabs", i18nKey: "branchIllicitResearchLabs", img: "buildings/building_illicit_research_labs.png" },
    jobs: { physicist: 60, biologist: 60, engineer: 60 },
    jobTrade: [trade(["physicist", "biologist", "engineer"], 0.1, 0.1, ["civicCorporateAstrometeorology", "civicCorporateCrowdsourcing", "civicCorporateDarkConsortium"])],
    owner: { perBranchValue: { research: 5 }, [CAPITAL_TRADERS]: ["civicCorporateAstrometeorology", "civicCorporateCrowdsourcing", "civicCorporateDarkConsortium"] },
    upkeep: { energy: 3 }, cost: cost(480, 25, 800, "exotic_gases", 80), requires: [] },
  { id: "privateSecurityCompany", i18nKey: "branchPrivateSecurityCompany", img: "buildings/building_private_security.png", kind: "corporate", maxPerColony: 1,
    illegal: "same",
    jobs: { enforcer: 200 },
    illegalJobs: { enforcer: 100, criminal: 100 }, illegalCrime: 25,
    jobTrade: [trade(["enforcer"], 0.1, 0.1, ["civicIndenturedAssets", "civicCorporateGeneticIdentification"])],
    illegalJobTrade: [trade(["criminal"], 0.1, 0.1, ["civicIndenturedAssets", "civicCorporateGeneticIdentification"])],
    owner: { perBranchValue: { energy: 10 }, [CAPITAL_TRADERS]: ["civicIndenturedAssets", "civicCorporateGeneticIdentification"] },
    upkeep: {}, cost: cost(360, 10, 500, "alloys", 50), requires: [] },
  { id: "publicRelationsFirm", i18nKey: "branchPublicRelationsFirm", img: "buildings/building_public_relations_office.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "syndicateFrontCorporations", i18nKey: "branchSyndicateFrontCorporations", img: "buildings/building_syndicate_outreach_office.png" },
    jobs: { bureaucrat: 200 },
    jobTrade: [trade(["bureaucrat"], 0.1, 0.1, ["civicCorporateAscensionists", "civicPublicRelationsSpecialists", "civicCorporateGalacticCurators"])],
    owner: { perBranchValue: { unity: 6 }, [CAPITAL_TRADERS]: ["civicCorporateAscensionists", "civicPublicRelationsSpecialists", "civicCorporateGalacticCurators"] },
    upkeep: { energy: 3 }, cost: cost(480, 25, 800, "rare_crystals", 80), requires: [] },
  { id: "virtualEntertainmentStudios", i18nKey: "branchVirtualEntertainmentStudios", img: "buildings/building_virtual_entertainment_studios.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "concealedDrugLabs", i18nKey: "branchConcealedDrugLabs", img: "buildings/building_underground_chemists.png" },
    jobs: { artisan: 200 },
    jobTrade: [trade(["artisan"], 0.1, 0.1, ["civicMediaConglomerate", "civicCorporateCrafters", "civicCorporateTankbound"])],
    owner: { perBranchValue: { consumer_goods: 6 }, [CAPITAL_TRADERS]: ["civicMediaConglomerate", "civicCorporateCrafters", "civicCorporateTankbound"] },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "volatile_motes", 50), requires: [] },
  { id: "fastFoodChain", i18nKey: "branchFastFoodChain", img: "buildings/building_food_conglomerate.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "bioReprocessingPlants", i18nKey: "branchBioReprocessingPlants", img: "buildings/building_bio_reprocessing_facilities.png" },
    jobs: { farmer: 200 },
    // Trawling Operations and Maritime Robotics share the corporate anglers icon (one key).
    jobTrade: [trade(["farmer"], 0.1, 0.1, ["civicPermanentEmployment", "civicCorporateAnglers", "civicCorporateBeastmasters", "civicCorporateDeepSleep"])],
    owner: { perBranchValue: { food: 10 }, [CAPITAL_TRADERS]: ["civicPermanentEmployment", "civicCorporateAnglers", "civicCorporateBeastmasters", "civicCorporateDeepSleep"] },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "volatile_motes", 50),
    // wiki note: does not prohibit Nanite Worlds (likely a bug) — Nanite Worlds have no branch offices anyway
    requires: [notCelestial("relic", "hive", "machine")] },
  { id: "privateMiningConsortium", i18nKey: "branchPrivateMiningConsortium", img: "buildings/building_private_mining_consortium.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "wildcatMiningOperations", i18nKey: "branchWildcatMiningOperations", img: "buildings/building_wildcat_miners.png" },
    jobs: { miner: 200 },
    jobTrade: [trade(["miner"], 0.1, 0.1, ["civicPrivateProspectors", "civicPrivatizedExploration"])],
    owner: { perBranchValue: { minerals: 10 }, [CAPITAL_TRADERS]: ["civicPrivateProspectors", "civicPrivatizedExploration"] },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "volatile_motes", 50),
    // Artificial worlds (Ring World, Shattered Ring World, Habitat, Arkship — arkships not modelled), Ecumenopolis, Hive World, Machine World
    requires: [notCelestial("ringworld", "shatteredRingworld", "habitat", "city", "hive", "machine")] },
  { id: "amusementMegaplex", i18nKey: "branchAmusementMegaplex", img: "buildings/building_amusement_megaplex.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "undergroundClubs", i18nKey: "branchUndergroundClubs", img: "buildings/building_underground_clubs.png" },
    jobs: { entertainer: 200 },
    jobTrade: [trade(["entertainer"], 0.1, 0.1, ["civicCorporateHedonism", "civicCorporateHyperspaceSpecialty", "civicCorporateStormDevotion"])],
    owner: { perBranchValue: { energy: 10 }, [CAPITAL_TRADERS]: ["civicCorporateHedonism", "civicCorporateHyperspaceSpecialty", "civicCorporateStormDevotion"] },
    upkeep: {}, cost: cost(480, 25, 800, "alloys", 80),
    requires: [ownerUnmodelled("branchReqNotKnightsOfTheToxicGod")] },
  { id: "corporateEmbassy", i18nKey: "branchCorporateEmbassy", img: "buildings/building_corporate_embassy.png", kind: "corporate", maxPerColony: 1,
    illegal: { id: "disinformationCenter", i18nKey: "branchDisinformationCenter", img: "buildings/building_disinformation_center.png" },
    jobs: { politician: 100 },
    jobTrade: [trade(["politician"], 0.15, 0.15, ["civicWorkerCoop", "civicBrandLoyalty", "civicCorporateSecretSocieties"])],
    colony: { info: ["branchInfoGoverningEthicsIllegal"] },
    owner: { [CAPITAL_TRADERS]: ["civicWorkerCoop", "civicBrandLoyalty", "civicCorporateSecretSocieties"], info: ["branchInfoDiplomaticWeightLegal", "branchInfoInfiltrationIllegal"] },
    upkeep: { energy: 3 }, cost: cost(480, 25, 800, "alloys", 80),
    // Xeno Diplomacy technology (researched); Tier 2 capital (Planetary Administration) on the colony
    requires: [{ type: "capitalTier", min: 2, scope: "host" }] },
  { id: "industrialSubsidiary", i18nKey: "branchIndustrialSubsidiary", img: "buildings/building_industrial_subsidiary.png", kind: "corporate", maxPerColony: 1,
    illegal: null,
    jobs: { artisan: 100, metallurgist: 100 },
    jobTrade: [trade(["metallurgist", "artisan"], 0.1, 0.1, ["civicCorporateScavengers", "civicCorporateRelentlessIndustrialists"])],
    owner: { perBranchValue: { alloys: 1, consumer_goods: 1 }, [CAPITAL_TRADERS]: ["civicCorporateScavengers", "civicCorporateRelentlessIndustrialists"] },
    upkeep: { energy: 2 }, cost: cost(360, 25, 800, "volatile_motes", 80),
    requires: [notCivic("civicCriminalHeritage")] },
  { id: "executiveRetreat", i18nKey: "branchExecutiveRetreat", img: "buildings/building_executive_retreat.png", kind: "corporate", maxPerColony: 1,
    illegal: null,
    jobs: { entertainer: 200 },
    jobTrade: [trade(["entertainer"], 0.2, 0.2, ["civicRuthlessCompetition", "civicCorporateTaskDelegation", "civicCorporatePlanetscapers", "civicCorporateEntropyDrinkers"])],
    owner: { [CAPITAL_TRADERS]: ["civicRuthlessCompetition", "civicCorporateTaskDelegation", "civicCorporatePlanetscapers", "civicCorporateEntropyDrinkers"], info: ["branchInfoEmpireAmenities"] },
    upkeep: { energy: 5, exotic_gases: 1 }, cost: { ...cost(600, 25, 1000, "alloys", 100), exotic_gases: 50 },
    // Executive Leisure Program technology (researched)
    requires: [hostUnmodelled("branchReqPops2500")] },
  { id: "xenoOutreachAgency", i18nKey: "branchXenoOutreachAgency", img: "buildings/building_xeno_tourism_agency.png", kind: "corporate", maxPerColony: 1,
    illegal: null,
    jobs: { entertainer: 100 },
    jobTrade: [trade(["entertainer"], 0.1, 0.1, ["civicCorporateDeathCult", "civicCorporateDimensionalWorship", "civicCorporateGuidedSapience"])],
    owner: { [CAPITAL_TRADERS]: ["civicCorporateDeathCult", "civicCorporateDimensionalWorship", "civicCorporateGuidedSapience"], info: ["branchInfoResettlementChance"] },
    upkeep: { energy: 5, rare_crystals: 1 }, cost: { ...cost(600, 25, 1000, "alloys", 100), rare_crystals: 50 },
    // Xeno Outreach Agencies technology (researched)
    requires: [hostUnmodelled("branchReqPops2500")] },
  { id: "knightlyFairGrounds", i18nKey: "branchKnightlyFairGrounds", img: "buildings/building_order_holding.png", kind: "corporate", maxPerColony: 1,
    illegal: "same",
    jobs: { entertainer: 200 },
    jobTrade: [trade(["entertainer"], 0.1, 0.1, ["civicCorporateHedonism", "civicCorporateHyperspaceSpecialty"])],
    owner: { perBranchValue: { energy: 10 }, [CAPITAL_TRADERS]: ["civicCorporateHedonism", "civicCorporateHyperspaceSpecialty"], info: ["branchInfoToxicGodQuest"] },
    upkeep: {}, cost: cost(480, 25, 800, "alloys", 80),
    requires: [ownerUnmodelled("branchReqKnightsOfTheToxicGod"), hostUnmodelled("branchReqPops5000")] },

  // ── Civic corporate buildings (no illegal column: legal/illegal stated in requires) ──
  { id: "templeOfProsperity", i18nKey: "branchTempleOfProsperity", img: "buildings/building_temple_of_prosperity.png", kind: "civic", maxPerColony: 1,
    jobs: { prosperity_preacher: 200 },
    colony: { info: ["branchInfoSpiritualistAttraction"] },
    owner: { perBranchValue: { unity: 6 } },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "rare_crystals", 50),
    requires: [civic("civicGospelOfTheMasses"), branch("legal")] },
  { id: "subversiveShrine", i18nKey: "branchSubversiveShrine", img: "buildings/building_subversive_shrine.png", kind: "civic", maxPerColony: 1,
    jobs: { prosperity_preacher: 200 },
    colony: { info: ["branchInfoSpiritualistAttraction"] },
    owner: { perBranchValue: { unity: 6 } },
    upkeep: { energy: 2 }, cost: cost(360, 10, 500, "rare_crystals", 50),
    requires: [civic("civicGospelOfTheMasses"), branch("illegal")] },
  { id: "corporateClinic", i18nKey: "branchCorporateClinic", img: "buildings/building_corporate_clinic.png", kind: "civic", maxPerColony: 1,
    jobs: { medical_worker: 200 },
    // Per 100 Medical Workers: +100 amenities; +2 trade, +1 more with BOTH Pharma State and Mutagenic Luxury (Luxury Lubrication Pools shares its key)
    jobTrade: [{ jobs: ["medical_worker"], amount: 2, perCivic: 1, civics: ["civicPrivateHealthcareCorporate", "civicCorporateToxicBaths"], allCivics: true }],
    colony: { amenitiesPer100: { jobs: ["medical_worker"], amount: 100 } },
    owner: { perBranchValue: { energy: 8, unity: 2 }, [CAPITAL_TRADERS]: ["civicPrivateHealthcareCorporate", "civicCorporateToxicBaths"] },
    upkeep: { consumer_goods: 1 }, cost: cost(480, 25, 800, "rare_crystals", 80),
    requires: [civic("civicPrivateHealthcareCorporate", "civicCorporateToxicBaths")] },
  { id: "offworldImplantHub", i18nKey: "branchOffworldImplantHub", img: "buildings/building_corporate_augmentation_bazaars.png", kind: "civic", maxPerColony: 1,
    jobs: { augmentor: 200 },
    jobTrade: [trade(["augmentor"], 1, 0, [])],
    colony: { tradeFromJobsPct: 10 },
    owner: { perBranchValue: { engineering: 10 } },
    upkeep: { energy: 5 }, cost: cost(480, 25, 600, "rare_crystals", 60),
    requires: [civic("civicCorporateAugmentationBazaars")] },
  { id: "experimentationOffices", i18nKey: "branchExperimentationOffices", img: "buildings/building_carceral_test_facility.png", kind: "civic", maxPerColony: 1,
    jobs: { enforcer: 100, orderly: 50 },
    owner: { perBranchValue: { research: 1 } },
    upkeep: { energy: 3 }, cost: cost(480, null, 800, "exotic_gases", 80),
    requires: [civic("civicCorporateTwistedExperimenters")] },
  { id: "livingMetalEnhancementClinic", i18nKey: "branchLivingMetalEnhancementClinic", img: "buildings/building_living_metal_clinic.png", kind: "civic", maxPerColony: 1,
    jobs: {},
    colony: { workerOutputPct: 5 },
    owner: { perBranchValue: { exotic_gases: 1.5 } },
    upkeep: { energy: 3 }, cost: cost(360, 20, 500, "alloys", 50),
    requires: [civic("civicCorporateGalvanicSymbiosis"), branch("legal")] },
  { id: "imperialConcessionPort", i18nKey: "branchImperialConcessionPort", img: "buildings/building_imperial_concession_port.png", kind: "civic", maxPerColony: 1,
    jobs: { merchant: 100 },
    jobTrade: [trade(["merchant"], 1, 0, [])],
    owner: { perBranchValue: { energy: 8, trade: 20 }, info: ["branchInfoDiplomaticWeight"] },
    upkeep: {}, cost: cost(600, 25, 1000, "alloys", 100),
    requires: [{ type: "anyOf", scope: "owner", rules: [civic("civicGalacticSovereign"), ownerUnmodelled("branchReqImperialCharter")] }] },

  // ── Ascension corporate buildings (same building in legal and illegal branch offices) ──
  { id: "aiEmporium", i18nKey: "branchAiEmporium", img: "buildings/building_ai_emporium.png", kind: "ascension", maxPerColony: 1,
    jobs: { roboticist: 100 },
    owner: { perBranchValue: { energy: 10, physics: 10 }, info: ["branchInfoBranchValuePerRoboticist"] },
    upkeep: {}, cost: cost(480, 25, 800, "alloys", 80),
    requires: [ownerUnmodelled("branchReqCorporateSapience")] },
  { id: "clearThoughtClinic", i18nKey: "branchClearThoughtClinic", img: "buildings/building_clear_thought_clinic.png", kind: "ascension", maxPerColony: 1,
    jobs: { trader: 200 },
    colony: { tradeFromJobsPct: 10, happinessPct: -5 },
    owner: { perBranchValue: { energy: 10, society: 10 }, info: ["branchInfoInfiltration"] },
    upkeep: {}, cost: cost(480, 25, 800, "alloys", 80),
    requires: [ownerUnmodelled("branchReqCorporateRecollection")] },
  { id: "psionicOffices", i18nKey: "branchPsionicOffices", img: "buildings/building_psi_corps.png", kind: "ascension", maxPerColony: 1,
    jobs: { empathic_marketer: 200 },
    jobTrade: [trade(["trader"], 0, 0.05, ["civicCorporateChosen"])],
    colony: { info: ["branchInfoPsionicAura"] },
    owner: { perBranchValue: { unity: 5 }, [CAPITAL_TRADERS]: ["civicCorporateChosen"] },
    upkeep: { zro: 0.5 }, cost: cost(480, 25, 800, "rare_crystals", 80),
    requires: [tradition("branchReqPsiCorps"), ownerUnmodelled("branchReqNotEndbringers")] }
];

// ── Helpers (P19.2) ─────────────────────────────────────────────────────


/** Building by id (legal id; illegal variants are looked up through the legal building). */
export function getBranchBuilding(id) {
  return BRANCH_OFFICE_BUILDINGS.find((building) => building.id === id) || null;
}

/** Owner civics the Sucursales tab offers: every civic a corporate building uses (requirements, per-civic trade, capital Traders) plus Criminal Heritage (illegal branch offices). */
export const BRANCH_OWNER_CIVICS = (() => {
  const keys = new Set(["civicCriminalHeritage"]);
  const addRules = (rules) => rules.forEach((rule) => {
    if (rule.type === "civic" || rule.type === "notCivic") rule.keys.forEach((key) => keys.add(key));
    if (rule.type === "anyOf") addRules(rule.rules);
  });
  BRANCH_OFFICE_BUILDINGS.forEach((building) => {
    addRules(building.requires || []);
    [...(building.jobTrade || []), ...(building.illegalJobTrade || [])].forEach((entry) => entry.civics.forEach((key) => keys.add(key)));
    (building.owner?.capitalTraders || []).forEach((key) => keys.add(key));
  });
  return [...keys].sort();
})();

/**
 * Valid owner civics from a list (saved planet or empire profile): only BRANCH_OWNER_CIVICS, no duplicates,
 * none incompatible with an earlier one, at most MAX_CIVICS (in list order).
 */
export function sanitizeOwnerCivics(civicIds) {
  const result = [];
  (Array.isArray(civicIds) ? civicIds : []).forEach((key) => {
    if (BRANCH_OWNER_CIVICS.includes(key) && result.length < MAX_CIVICS && !result.includes(key) && !result.some((other) => civicsConflict(key, other))) result.push(key);
  });
  return result;
}

/** P19.6: can this saved empire profile own a branch office (a megacorporation: Corporate authority)? */
export function isBranchOwnerProfile(profile) {
  return Boolean(profile) && profile.authorityId === BRANCH_OFFICE_HOST_RULES.ownerAuthority;
}

/** Number of branch office building slots the host capital gives (0 with no branch office allowed). */
export function branchSlotCount(capitalTier) {
  return BRANCH_OFFICE_SLOTS_BY_TIER[capitalTier] || 0;
}

/** Why this host planet cannot have a branch office (i18n key), or null. hostCtx: requirement context of the planet. */
export function branchHostBlockReason(hostCtx, gestalt) {
  if (BRANCH_OFFICE_HOST_RULES.notCelestial.includes(hostCtx.celestialTypeId)) return "branchHostBlockedBody";
  if (gestalt) return "branchHostBlockedGestalt";
  if ((hostCtx.civicIds || []).some((key) => BRANCH_OFFICE_HOST_RULES.notCivic.includes(key))) return "branchHostBlockedPurifiers";
  return null;
}

/** The variant built in this branch office: { id, i18nKey, img } or null when the building has no illegal variant ("Unavailable"). */
export function branchBuildingVariant(building, illegal) {
  if (!illegal || building.kind !== "corporate" || building.illegal === "same") return { id: building.id, i18nKey: building.i18nKey, img: building.img };
  return building.illegal || null;
}

function scoped(building, scope) {
  return { requires: (building.requires || []).filter((rule) => rule.scope === scope) };
}

/** Owner requirement context from the tab settings. */
export function branchOwnerContext({ ownerCivicIds, illegal }) {
  return { civicIds: ownerCivicIds || [], branchLegality: illegal ? "illegal" : "legal" };
}

/** Unmet rules of a building for this owner and host: [{ rule, scope }]; an illegal branch office without an illegal variant gives { rule: { type: "noIllegalVariant" } }. */
export function branchBuildingUnmet(building, ownerCtx, hostCtx) {
  const unmet = [];
  if (ownerCtx.branchLegality === "illegal" && !branchBuildingVariant(building, true)) unmet.push({ rule: { type: "noIllegalVariant" }, scope: "owner" });
  unmetRequirements(scoped(building, "owner"), ownerCtx).forEach((rule) => unmet.push({ rule, scope: "owner" }));
  unmetRequirements(scoped(building, "host"), hostCtx).forEach((rule) => unmet.push({ rule, scope: "host" }));
  return unmet;
}

export function branchBuildingAvailable(building, ownerCtx, hostCtx) {
  return branchBuildingUnmet(building, ownerCtx, hostCtx).length === 0
    && buildingRequirementsMet(scoped(building, "owner"), ownerCtx) && buildingRequirementsMet(scoped(building, "host"), hostCtx);
}

/** Would choosing this building in slot `index` go over its `maxPerColony` (counting the other slots)? */
export function branchBuildingLimitReached(building, slots, index) {
  if (!building.maxPerColony) return false;
  const others = slots.filter((id, slot) => slot !== index && id === building.id).length;
  return others >= building.maxPerColony;
}

/** Slot building ids with the copies over `maxPerColony` dropped (the first slots win). */
export function branchSlotsWithinLimits(slots) {
  const counts = {};
  return slots.map((id) => {
    const building = getBranchBuilding(id);
    if (!building) return id;
    counts[id] = (counts[id] || 0) + 1;
    return building.maxPerColony && counts[id] > building.maxPerColony ? null : id;
  });
}

/** Is this the Criminal Heritage illegal twin of a corporate building (not the same building in both offices)? */
export function isIllegalVariant(building, illegal) {
  return Boolean(illegal) && building.kind === "corporate" && building.illegal !== "same";
}

/** Jobs created on the colony by this building in this branch office (×100, as displayed elsewhere). */
export function branchBuildingJobs(building, illegal) {
  if (illegal && building.illegalJobs) return { ...building.illegalJobs };
  const jobs = { ...building.jobs };
  if (!isIllegalVariant(building, illegal)) return jobs;
  // Criminal Heritage illegal variant: half of the produced jobs become Criminal jobs.
  const result = {};
  let criminals = 0;
  Object.entries(jobs).forEach(([jobId, amount]) => {
    const moved = amount * ILLEGAL_BRANCH_RULES.criminalJobShare;
    result[jobId] = amount - moved;
    criminals += moved;
  });
  if (criminals) result.criminal = (result.criminal || 0) + criminals;
  return result;
}

/**
 * Colony trade per staffed job of each "Per 100 X" entry: [{ entry, jobs, total }]. The extra is added once per owner
 * civic in the list (or once with every civic for `allCivics`); in an illegal twin the bonus goes to the Criminal jobs
 * (owner decision 2026-11-20; the Private Security Company lists it as `illegalJobTrade`).
 */
export function branchJobTrade(building, illegal, ownerCivicIds) {
  const entries = illegal && building.illegalJobTrade ? building.illegalJobTrade : (building.jobTrade || []);
  return entries.map((entry) => {
    const matched = entry.civics.filter((key) => ownerCivicIds.includes(key));
    const extra = entry.allCivics ? (matched.length === entry.civics.length ? entry.perCivic : 0) : entry.perCivic * matched.length;
    const total = Math.round((entry.amount + extra) * 1000) / 1000;
    return { entry, jobs: isIllegalVariant(building, illegal) && !building.illegalJobTrade ? ["criminal"] : entry.jobs, total };
  });
}

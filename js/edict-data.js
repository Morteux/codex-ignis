/**
 * Edicts that change the economy or conditions of a planet (P18).
 *
 * Source: game files 4.6.0 (`common/edicts`; values switched in T2523 and checked
 * again in T2534: no listed edict differs, `reports/stellaris-pc-4.6.0/edicts.md`).
 * The wiki 4.5.2 "Edicts" page (Codex Ignis Wiki/v4-5-2/Edicts.md), audited in
 * P18.1 (PLANET_SIM_GDD.md §5.1), stays the source of the texts and modelling
 * notes. Only edicts with at least one effect this simulator can compute are
 * listed; nothing is invented. Edicts are an empire-level choice: they are saved
 * with the empire profile (`edictIds`).
 *
 * T2534: the 12 edicts new in 4.6.0 (the eight ideology Broadcastings, Peaceful
 * Prosperity and the three Dutiful sacrifices) are not listed: they need an active
 * ideology tenet (Willpower), which the simulator does not model, and their effects
 * are ideological reach, naval capacity or pop sacrifice (Peaceful Prosperity's
 * +2.5 % workforce is multiplied by the tenet tier). The Willpower-only effects 4.6.0
 * adds to listed edicts (ideological resistance of Information Quarantine, ethic
 * attraction of Land of Opportunity, ideological strength of Research Subsidies)
 * are not computed either.
 *
 * ── Format ─────────────────────────────────────────────────────────────
 * EDICTS: { id, i18nKey, kind, upkeep, requires, effects, info }
 *  - kind: wiki section (unity, ethic, civic, decree, campaign, strategic,
 *    darkMatter, nanite); only used to group the cards.
 *  - upkeep: base monthly upkeep { resource: amount } as on the wiki (before
 *    empire size and edict cost modifiers). Shown only: edict upkeep is paid by
 *    the empire, never by this planet.
 *  - requires: same rules as buildings (js/building-requirements.js). Rules of
 *    type "tradition" are always met (like tradition-gated policy options;
 *    owner decision 2026-11-19); technologies and "Communications with another empire" are not
 *    listed because every technology is assumed researched.
 *  - effects (applied by planet-sim.js through the modifier list):
 *      jobEfficiency { jobId: fraction }      job efficiency (step 3 pool)
 *      stratumEfficiency { stratum: fraction } efficiency of a whole stratum
 *      jobFlat { jobId: { resource: amount } } per staffed job (×100 scale: the
 *                                             wiki's "per 100 X" is per job)
 *      jobUpkeep { jobId | "all": fraction }  job upkeep change
 *      civilianFlat { resource: amount }      per civilian pop (gestalt
 *                                             civilians = Maintenance Drones)
 *      resourceMult { resource: fraction }    "Monthly X" (step 6)
 *      conditions { happiness, stability, crime } points (the wiki's % for
 *                                             happiness is read as points)
 *      popUpkeep { resource: fraction }       change of every pop upkeep of the
 *                                             resource (species type and living
 *                                             standard; not job upkeep), P20.4
 *      speciesHappiness { speciesType: points } happiness points when the
 *                                             empire's species type is listed
 *  - info: i18n keys of effects shown on the card but not computed.
 *
 * Verification: values from the 4.6.0 game files (first transcribed from the
 * 4.5.2 page, `wiki-verified`); the modelling decisions above are reviewed in P14.
 */

import { buildingRequirementsMet, unmetRequirements } from "./building-requirements.js";

const RESEARCHERS = ["physicist", "engineer", "biologist"];
const each = (jobIds, value) => Object.fromEntries(jobIds.map((jobId) => [jobId, value]));

const NOT_GESTALT = { type: "notGestalt" };
const GESTALT = { type: "ethic", ids: ["gestaltConsciousness"] };
const USES_CONSUMER_GOODS = { type: "usesConsumerGoods" };
const ethic = (...ids) => ({ type: "ethic", ids });
const civic = (...keys) => ({ type: "civic", keys });
const authority = (...ids) => ({ type: "authority", ids });
const tradition = (i18nKey) => ({ type: "tradition", i18nKey });

const unity = (amount) => ({ unity: amount });
const ORGANIC_UPKEEP_25 = { food: 0.25, minerals: 0.25, alloys: 0.25 };
// biological_pop_happiness + lithoid_pop_happiness: organic, infernal (BIOLOGICAL archetype) and lithoid pops.
const BIOLOGICAL_HAPPINESS_5 = { organic: 5, infernal: 5, lithoid: 5 };

export const EDICTS = [
  // Unity edicts
  { id: "capacitySubsidies", i18nKey: "edictCapacitySubsidies", kind: "unity", upkeep: unity(30), requires: [],
    effects: { jobEfficiency: { technician: 0.2 }, jobFlat: { technician: { trade: -0.5 } } } },
  { id: "miningSubsidies", i18nKey: "edictMiningSubsidies", kind: "unity", upkeep: unity(30), requires: [],
    effects: { jobEfficiency: { miner: 0.2 }, jobFlat: { miner: { trade: -0.5 } } } },
  { id: "farmingSubsidies", i18nKey: "edictFarmingSubsidies", kind: "unity", upkeep: unity(30), requires: [],
    effects: { jobEfficiency: { farmer: 0.2 }, jobFlat: { farmer: { trade: -0.5 } } } },
  { id: "forgeSubsidies", i18nKey: "edictForgeSubsidies", kind: "unity", upkeep: unity(30), requires: [],
    effects: { jobEfficiency: { metallurgist: 0.1 }, jobFlat: { metallurgist: { trade: -1 } } } },
  { id: "industrialSubsidies", i18nKey: "edictIndustrialSubsidies", kind: "unity", upkeep: unity(30), requires: [USES_CONSUMER_GOODS],
    effects: { jobEfficiency: { artisan: 0.1 }, jobFlat: { artisan: { trade: -1 } } } },
  { id: "researchSubsidies", i18nKey: "edictResearchSubsidies", kind: "unity", upkeep: unity(30), requires: [tradition("traditionDatabankUplinks")],
    effects: { jobEfficiency: each(RESEARCHERS, 0.1), jobFlat: each(RESEARCHERS, { trade: -1 }) } },
  { id: "synapticReinforcement", i18nKey: "edictSynapticReinforcement", kind: "unity", upkeep: unity(10), requires: [authority("hiveMind")],
    effects: { civilianFlat: { trade: 1 } } },
  { id: "industrialMaintenance", i18nKey: "edictIndustrialMaintenance", kind: "unity", upkeep: unity(10), requires: [tradition("traditionSynchronicityFinished"), authority("machineIntelligence")],
    effects: { civilianFlat: { trade: 1 } } },
  { id: "extendedShifts", i18nKey: "edictExtendedShifts", kind: "unity", upkeep: unity(10), requires: [tradition("traditionWorkplaceMotivators")],
    effects: { stratumEfficiency: { worker: 0.1 } }, info: ["edictInfoWorkerHappiness15", "edictInfoSlaves"] },
  { id: "enhancedSurveillance", i18nKey: "edictEnhancedSurveillance", kind: "unity", upkeep: unity(20), requires: [tradition("traditionPublicTrustOfficers"), NOT_GESTALT],
    effects: { conditions: { stability: 5, happiness: -10 } }, info: ["edictInfoEncryption", "edictInfoAuthoritarianAttraction"] },
  { id: "trackingImplants", i18nKey: "edictTrackingImplants", kind: "unity", upkeep: unity(30), requires: [NOT_GESTALT],
    effects: { conditions: { crime: -10, happiness: -10 } }, info: ["edictInfoEncryption", "edictInfoAuthoritarianAttraction"] },
  { id: "thoughtEnforcement", i18nKey: "edictThoughtEnforcement", kind: "unity", upkeep: unity(30), requires: [NOT_GESTALT],
    effects: { conditions: { happiness: -10 } }, info: ["edictInfoTelepathCrime", "edictInfoEncryption", "edictInfoGoverningAttraction"] },
  { id: "thoughtPreEmption", i18nKey: "edictThoughtPreEmption", kind: "unity", upkeep: unity(30), requires: [GESTALT],
    effects: { jobUpkeep: { all: -0.1 }, conditions: { stability: -5 } }, info: ["edictInfoTelepathDeviancy", "edictInfoEncryption"] },
  // Pop upkeep edicts (P20.4, game files 4.5.4, unchanged in 4.6.0: common/edicts/00_edicts.txt). "planet_pops_organics_X_upkeep_mult" only
  // touches the species type upkeep of organic pops (food / minerals / alloys); machine pops pay energy, so it is applied
  // to every pop upkeep of those resources. The prerequisite technology (Gene Crops) counts as researched.
  { id: "nutritionalPlenitude", i18nKey: "edictNutritionalPlenitude", kind: "unity", upkeep: unity(10), requires: [NOT_GESTALT],
    effects: { popUpkeep: ORGANIC_UPKEEP_25, speciesHappiness: BIOLOGICAL_HAPPINESS_5 }, info: ["edictInfoLogisticGrowth10"] },
  { id: "nutritionalPlenitudeHive", i18nKey: "edictNutritionalPlenitude", kind: "unity", upkeep: unity(10), requires: [authority("hiveMind")],
    effects: { popUpkeep: ORGANIC_UPKEEP_25 }, info: ["edictInfoLogisticGrowth10"] },
  { id: "expandedBreedingProgram", i18nKey: "edictExpandedBreedingProgram", kind: "unity", upkeep: unity(10), requires: [civic("civicMachineServitor")],
    effects: { popUpkeep: ORGANIC_UPKEEP_25, speciesHappiness: BIOLOGICAL_HAPPINESS_5 }, info: ["edictInfoLogisticGrowth10"] },
  // Ethic edicts
  { id: "informationQuarantine", i18nKey: "edictInformationQuarantine", kind: "ethic", upkeep: unity(10), requires: [ethic("authoritarian")],
    effects: { conditions: { stability: 5 } }, info: ["edictInfoGoverningAttraction"] },
  { id: "peaceFestivals", i18nKey: "edictPeaceFestivals", kind: "ethic", upkeep: unity(10), requires: [ethic("pacifist")],
    effects: { conditions: { happiness: 5 } }, info: ["edictInfoPacifistAttraction"] },
  { id: "venerationOfSaints", i18nKey: "edictVenerationOfSaints", kind: "ethic", upkeep: unity(10), requires: [ethic("spiritualist")],
    effects: { jobEfficiency: { priest: 0.05 } }, info: ["edictInfoSpiritualistAttraction"] },
  // Civic edicts
  { id: "decentralizedResearch", i18nKey: "edictDecentralizedResearch", kind: "civic", upkeep: unity(10),
    requires: [civic("civicGalacticCurators", "civicCorporateGalacticCurators", "civicHiveGalacticCurators", "civicMachineGalacticCurators")],
    effects: { jobEfficiency: each(RESEARCHERS, -0.1) }, info: ["edictInfoResearchStations"] },
  // Decrees (base cost and upkeep 75 unity)
  { id: "omnifariousAcquisition", i18nKey: "edictOmnifariousAcquisition", kind: "decree", upkeep: unity(75), requires: [],
    effects: { resourceMult: { minerals: 0.25 } }, info: ["edictInfoSettledOnly"] },
  { id: "scientificRevolution", i18nKey: "edictScientificRevolution", kind: "decree", upkeep: unity(75), requires: [],
    effects: { jobEfficiency: each(RESEARCHERS, 0.1) }, info: ["edictInfoResearchAlternatives"] },
  // Campaigns
  { id: "fearCampaign", i18nKey: "edictFearCampaign", kind: "campaign", upkeep: { energy: 15 }, requires: [ethic("xenophobe")],
    effects: { resourceMult: { unity: 0.1 } }, info: ["edictInfoXenophobeAttraction"] },
  // P20.4 (game files 4.5.4, unchanged in 4.6.0); Planetary Unification counts as researched.
  { id: "recyclingCampaign", i18nKey: "edictRecyclingCampaign", kind: "campaign", upkeep: { energy: 15 }, requires: [NOT_GESTALT],
    effects: { popUpkeep: { consumer_goods: -0.1 } } },
  // Strategic resource edicts (base cost per month, scaled by empire size)
  { id: "innerFocus", i18nKey: "edictInnerFocus", kind: "strategic", upkeep: { influence: 3 },
    requires: [civic("civicSovereignGuardianship", "civicCorporateSovereignGuardianship", "civicHiveSovereignGuardianship", "civicMachineSovereignGuardianship")],
    effects: { resourceMult: { unity: 0.1 } } },
  { id: "naniteActuators", i18nKey: "edictNaniteActuators", kind: "strategic", upkeep: { nanites: 2 }, requires: [],
    effects: { jobUpkeep: each(RESEARCHERS, 0.1) }, info: ["edictInfoResearchSpeed"] },
  // Dark matter edicts
  { id: "baryonicInsight", i18nKey: "edictBaryonicInsight", kind: "darkMatter", upkeep: { dark_matter: 1 }, requires: [civic("civicDarkConsortium", "civicCorporateDarkConsortium")],
    effects: { resourceMult: { physics: 0.1 } } },
  { id: "darkMatterForging", i18nKey: "edictDarkMatterForging", kind: "darkMatter", upkeep: { dark_matter: 3 }, requires: [civic("civicDarkConsortium", "civicCorporateDarkConsortium")],
    effects: { resourceMult: { alloys: 0.05 } } },
  { id: "darkMatterUnraveling", i18nKey: "edictDarkMatterUnraveling", kind: "darkMatter", upkeep: { dark_matter: 4 }, requires: [civic("civicDarkConsortium", "civicCorporateDarkConsortium")],
    effects: { resourceMult: { energy: 0.1 } } },
  // Nanite edicts (base cost 2500 nanites; cannot be cancelled for 15 years)
  { id: "coordinatedNanocomplexes", i18nKey: "edictCoordinatedNanocomplexes", kind: "nanite", upkeep: { nanites: 5 }, requires: [tradition("traditionNaniteAugmentations")],
    effects: { resourceMult: { alloys: 0.15 } } },
  { id: "nanoconnectedGenerators", i18nKey: "edictNanoconnectedGenerators", kind: "nanite", upkeep: { nanites: 5 }, requires: [tradition("traditionNaniteAugmentations")],
    effects: { resourceMult: { energy: 0.25 } } }
];

/** Order and i18n keys of the card groups. */
export const EDICT_KINDS = [
  { id: "unity", i18nKey: "edictKindUnity" },
  { id: "ethic", i18nKey: "edictKindEthic" },
  { id: "civic", i18nKey: "edictKindCivic" },
  { id: "decree", i18nKey: "edictKindDecree" },
  { id: "campaign", i18nKey: "edictKindCampaign" },
  { id: "strategic", i18nKey: "edictKindStrategic" },
  { id: "darkMatter", i18nKey: "edictKindDarkMatter" },
  { id: "nanite", i18nKey: "edictKindNanite" }
];

const EDICTS_BY_ID = new Map(EDICTS.map((edict) => [edict.id, edict]));

export function getEdict(id) {
  return EDICTS_BY_ID.get(id) || null;
}

export function edictAvailable(edict, ctx) {
  return buildingRequirementsMet(edict, ctx);
}

/** Requirement rules the empire does not meet (to explain a locked card). */
export function edictUnmetRules(edict, ctx) {
  return unmetRequirements(edict, ctx);
}

/** Tradition requirements of an edict (always treated as met, shown as a note on the card). */
export function edictTraditionRules(edict) {
  return (edict.requires || []).filter((rule) => rule.type === "tradition");
}

/**
 * Normalises a list of active edict ids for the given empire: drops unknown,
 * duplicated and unavailable ids (never replaces them). Returns
 * { edictIds, removed } in catalog order; `removed` lists the dropped ids.
 */
export function resolveEdicts(edictIds, ctx) {
  const wanted = new Set(Array.isArray(edictIds) ? edictIds.filter((id) => typeof id === "string") : []);
  const kept = EDICTS.filter((edict) => wanted.has(edict.id) && edictAvailable(edict, ctx)).map((edict) => edict.id);
  const removed = [...wanted].filter((id) => !kept.includes(id));
  return { edictIds: kept, removed };
}

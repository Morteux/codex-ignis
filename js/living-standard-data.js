/**
 * Living standards of the empire's founder species and the pop upkeep they set (P20).
 *
 * Source: game files 4.5.4 (`common/species_rights/living_standards`, the trade of
 * `common/pop_categories` and the species type traits of `common/traits`), extracted by
 * tools/extract/extract_living_standards.py into data/generated/stellaris-pc-4.5.4/living_standards.json
 * and audited in P20.1 (PLANET_SIM_GDD.md §5.3). Nothing is invented.
 *
 * The living standard is an empire-level choice: it is saved with the empire profile
 * (`livingStandardId`, optional field; missing or unavailable → the default of
 * livingStandardDefault). Only the standards the founder species (full citizenship) can take
 * are listed: slavery, purge, assimilation, robot servitude and origin standards are out of scope.
 *
 * ── Format ─────────────────────────────────────────────────────────────
 * LIVING_STANDARDS: { id, gameId, i18nKey, requires, upkeep, trade, happiness, strataHappiness,
 *                     politicalPower, civilianOutput, info }
 *  - Every value is per pop group of 100 pops in the game, i.e. per simulator pop (pops are ×100,
 *    like jobs). Strata: ruler / specialist / worker jobs and the manual civilians.
 *  - requires: rules of js/building-requirements.js. Technologies are assumed researched.
 *  - upkeep { stratum: { resource: amount } }   pop upkeep on top of the species upkeep
 *  - trade { stratum: amount }                  trade produced by each pop of the stratum
 *  - happiness: points for every pop while the empire has no consumer goods deficit
 *    (the game's `pop_happiness`; 0.1 = +10)
 *  - strataHappiness { stratum: points }        happiness of a single stratum (the simulator has
 *    one happiness for all pops: shown, not computed)
 *  - politicalPower { stratum: amount }         shown only (factions are not modelled)
 *  - civilianOutput { resource: amount }        extra output of each civilian pop
 *  - info: i18n keys of other effects, shown on the card and not computed
 *
 * SPECIES_POP_UPKEEP: upkeep of every pop of the species type (trait_organic, trait_lithoid,
 * trait_infernal, trait_machine_unit / trait_mechanical), paid with any living standard.
 */

import { buildingRequirementsMet, unmetRequirements } from "./building-requirements.js";

const SHARED_BURDENS = "civicSharedBurdens";
const WORKER_COOP = "civicWorkerCoop";
const DYSTOPIAN = "civicDystopianSociety";
const NOT_GESTALT = { type: "notGestalt" };
const NOT_CIVIC_STANDARD = { type: "notCivic", keys: [SHARED_BURDENS, WORKER_COOP, DYSTOPIAN] };
const civic = (...keys) => ({ type: "civic", keys });
const ethic = (...ids) => ({ type: "ethic", ids });
const goods = (ruler, specialist, worker, civilian) => ({
  ruler: { consumer_goods: ruler }, specialist: { consumer_goods: specialist }, worker: { consumer_goods: worker }, civilian: { consumer_goods: civilian }
});
const strata = (ruler, specialist, worker, civilian) => ({ ruler, specialist, worker, civilian });

export const SPECIES_POP_UPKEEP = {
  organic: { food: 1 },
  lithoid: { minerals: 1 },
  infernal: { alloys: 0.25 },
  machine: { energy: 1 }
};

export const LIVING_STANDARDS = [
  {
    id: "decentConditions", gameId: "living_standard_normal", i18nKey: "livingStandardDecentConditions",
    requires: [NOT_GESTALT, NOT_CIVIC_STANDARD],
    upkeep: goods(1, 0.5, 0.25, 0.25), trade: strata(0.5, 0.33, 0.2, 0.2), happiness: 0,
    strataHappiness: { ruler: 10, specialist: 5 }, politicalPower: strata(5, 2.5, 1.5, 1.5), civilianOutput: {}, info: []
  },
  {
    id: "socialWelfare", gameId: "living_standard_good", i18nKey: "livingStandardSocialWelfare",
    requires: [NOT_GESTALT, NOT_CIVIC_STANDARD],
    upkeep: goods(1, 0.5, 0.5, 0.5), trade: strata(0.5, 0.33, 0.33, 0.33), happiness: 5,
    strataHappiness: {}, politicalPower: strata(4, 3, 2, 2), civilianOutput: { unity: 0.5 }, info: []
  },
  {
    id: "utopianAbundance", gameId: "living_standard_utopian", i18nKey: "livingStandardUtopianAbundance",
    requires: [NOT_GESTALT, ethic("egalitarian"), { type: "notCivic", keys: [DYSTOPIAN] }],
    upkeep: goods(1, 1, 1, 1), trade: strata(0.5, 0.5, 0.5, 0.5), happiness: 20,
    strataHappiness: {}, politicalPower: strata(4, 4, 4, 4),
    civilianOutput: { physics: 0.5, society: 0.5, engineering: 0.5, unity: 0.5 }, info: []
  },
  {
    id: "academicPrivilege", gameId: "living_standard_academic_privilege", i18nKey: "livingStandardAcademicPrivilege",
    requires: [NOT_GESTALT, ethic("materialist"), NOT_CIVIC_STANDARD],
    upkeep: goods(1, 1, 0.25, 0.25), trade: strata(0.5, 0.5, 0.2, 0.2), happiness: 0,
    strataHappiness: { ruler: 15, specialist: 15 }, politicalPower: strata(6, 2.5, 0.5, 0.5), civilianOutput: {},
    // +10 % researcher job output (no deficit): applied as job efficiency of Physicists, Engineers and Biologists
    researcherEfficiency: 0.1, info: []
  },
  {
    id: "stratifiedEconomy", gameId: "living_standard_stratified", i18nKey: "livingStandardStratifiedEconomy",
    requires: [NOT_GESTALT, ethic("authoritarian"), NOT_CIVIC_STANDARD],
    upkeep: goods(1, 0.5, 0.1, 0.1), trade: strata(0.5, 0.33, 0.1, 0.1), happiness: 0,
    strataHappiness: { ruler: 15, specialist: 5, worker: -10, civilian: -10 }, politicalPower: strata(8, 1.25, -0.25, -0.25), civilianOutput: {}, info: []
  },
  {
    id: "decadentLifestyle", gameId: "living_standard_decadent", i18nKey: "livingStandardDecadentLifestyle",
    requires: [NOT_GESTALT, civic("civicPleasureSeekers", "civicCorporateHedonism"), NOT_CIVIC_STANDARD],
    upkeep: goods(1.33, 0.66, 0.33, 1.33), trade: strata(0.5, 0.5, 0.5, 0.5), happiness: 20,
    strataHappiness: {}, politicalPower: { ruler: 7, specialist: 2 }, civilianOutput: {},
    info: ["livingStandardInfoDecadentAmenities"]
  },
  {
    id: "chemicalBliss", gameId: "living_standard_chemical_bliss", i18nKey: "livingStandardChemicalBliss",
    requires: [NOT_GESTALT, { type: "notSpecies", ids: ["machine"] }, { type: "notCivic", keys: [DYSTOPIAN] }],
    upkeep: goods(1, 1, 1, 0.1), trade: strata(0.5, 0.5, 0.5, 0.5), happiness: 40,
    strataHappiness: {}, politicalPower: {}, civilianOutput: {},
    // −60 % workforce of every pop: applied as job efficiency of every job
    jobEfficiency: -0.6, info: ["livingStandardInfoChemicalBlissTech"]
  },
  {
    id: "sharedBurdens", gameId: "living_standard_shared_burden", i18nKey: "livingStandardSharedBurdens",
    requires: [civic(SHARED_BURDENS)],
    upkeep: goods(0.4, 0.4, 0.4, 0.4), trade: strata(0.25, 0.25, 0.25, 0.25), happiness: 5,
    strataHappiness: {}, politicalPower: strata(3, 3, 3, 3), civilianOutput: { unity: 1 },
    info: ["livingStandardInfoCivilianWorkforce15"]
  },
  {
    id: "employeeOwnership", gameId: "living_standard_worker_ownership", i18nKey: "livingStandardEmployeeOwnership",
    requires: [civic(WORKER_COOP)],
    upkeep: goods(0.5, 0.5, 0.5, 0.5), trade: strata(0.33, 0.33, 0.33, 0.33), happiness: 0,
    strataHappiness: {}, politicalPower: strata(3, 3, 3, 3), civilianOutput: {},
    info: ["livingStandardInfoEmployeeOwnershipTradition"]
  },
  {
    id: "dystopianSociety", gameId: "living_standard_dystopian_society", i18nKey: "livingStandardDystopianSociety",
    requires: [civic(DYSTOPIAN)],
    upkeep: goods(1.33, 0.125, 0.1, 0.1), trade: strata(0.5, 0.1, 0.1, 0.1), happiness: 0,
    strataHappiness: { ruler: 25, specialist: -200, worker: -200, civilian: -200 }, politicalPower: strata(10, -0.25, -0.75, -1), civilianOutput: {},
    info: ["livingStandardInfoDystopianAmenities", "livingStandardInfoCivilianWorkforce10"]
  },
  {
    id: "drone", gameId: "living_standard_hive_mind", i18nKey: "livingStandardDrone",
    requires: [{ type: "gestalt" }],
    upkeep: {}, trade: {}, happiness: 0, strataHappiness: {}, politicalPower: {}, civilianOutput: {}, info: []
  }
];

const BY_ID = new Map(LIVING_STANDARDS.map((standard) => [standard.id, standard]));

export function getLivingStandard(id) {
  return BY_ID.get(id) || null;
}

export function livingStandardAvailable(standard, ctx) {
  return buildingRequirementsMet(standard, ctx);
}

/** Requirement rules the empire does not meet (to explain a locked card). */
export function livingStandardUnmetRules(standard, ctx) {
  return unmetRequirements(standard, ctx);
}

/** Default living standard of an empire: its civic's own standard, Drone for gestalt, otherwise Decent Conditions. */
export function livingStandardDefault(ctx) {
  const civics = ctx.civicIds || [];
  if (civics.includes(DYSTOPIAN)) return "dystopianSociety";
  if (civics.includes(SHARED_BURDENS)) return "sharedBurdens";
  if (civics.includes(WORKER_COOP)) return "employeeOwnership";
  const drone = getLivingStandard("drone");
  return livingStandardAvailable(drone, ctx) ? "drone" : "decentConditions";
}

/** A saved or chosen living standard id for the given empire: kept when known and available, else the default. */
export function resolveLivingStandard(id, ctx) {
  const standard = getLivingStandard(id);
  if (standard && livingStandardAvailable(standard, ctx)) return { livingStandardId: standard.id, changed: false };
  return { livingStandardId: livingStandardDefault(ctx), changed: Boolean(id) };
}

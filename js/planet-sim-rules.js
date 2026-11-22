/**
 * Planet simulator: rules of the planet — capital sets, district definitions per body type,
 * slots and their specializations, district caps and deposit features, blockers, planet
 * modifiers, branch office host, building requirements and availability.
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { calculateBuildingSlots, capitalSetForAuthority, DISTRICTS, WILDERNESS_DISTRICTS, RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { BODY_TYPE_RULES, SPECIAL_DISTRICTS, SPECIAL_CAPITAL_SETS } from "./body-type-data.js";
import { PLANET_MODIFIERS } from "./planet-modifier-data.js";
import { DEPOSIT_FEATURES, DEPOSIT_FEATURE_BODIES, UNCAPPED_DISTRICTS, STRATEGIC_DEPOSITS, JOB_CATEGORIES, BLOCKERS } from "./planetary-features-data.js";
import { getPlanetState } from "./planet-state.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS } from "./empire-data.js";
import { buildingRequirementsMet, unmetRequirements } from "./building-requirements.js";
import { branchSlotCount, branchHostBlockReason, branchOwnerContext, getBranchBuilding, BRANCH_OFFICE_BUILDINGS, branchBuildingAvailable } from "./branch-office-data.js";
import { showNotice } from "./planet-sim-dom.js";
import { URBAN_MIN_COUNT, districtState, selectedBlockers, selectedPlanetModifiers, strategicDepositChoice, branchOffice, buildingsById, builtMap, sim } from "./planet-sim-state.js";
import { describeUnmetRule } from "./planet-sim-text.js";

/** P10.4: habitat capitals (tiers II–IV), built once per empire type so the set keeps its identity (syncCapitalToAuthority). */
const habitatCapitalCache = new Map();
function habitatCapitalSet(authorityId, gestalt) {
  const empire = authorityId === "hiveMind" || authorityId === "machineIntelligence" ? authorityId : "individualist";
  const key = `${empire}|${gestalt}`;
  if (!habitatCapitalCache.has(key)) {
    habitatCapitalCache.set(key, SPECIAL_CAPITAL_SETS.habitat.map((entry) => ({
      id: entry.id,
      img: entry.img,
      i18nKey: entry.i18nKey,
      tier: entry.tier,
      housing: entry.housing,
      amenities: entry.amenities + (gestalt ? entry.gestaltAmenities || 0 : 0),
      jobs: { ...entry.jobsByEmpire[empire] },
      defenseArmies: entry.defenseArmies,
      upkeep: { ...entry.upkeep }
    })));
  }
  return habitatCapitalCache.get(key);
}

/** P10.5: Synaptic Lathe capitals (Processing Unit, tiers II–IV), the same for every empire. */
const LATHE_CAPITAL_SET = SPECIAL_CAPITAL_SETS.synapticLathe.map((entry) => ({ ...entry, upkeep: { ...entry.upkeep } }));

/** Capitales disponibles según la autoridad (estándar, Mente Colmena o Inteligencia de Máquina) o el cuerpo (hábitat, P10.4; Synaptic Lathe, P10.5). */
export function currentCapitalSet() {
  const state = getPlanetState();
  if (bodyRules()?.capitalSet === "synapticLathe") return LATHE_CAPITAL_SET;
  if (bodyRules()?.capitalSet === "habitat") {
    return habitatCapitalSet(state.authorityId, ethicsSatisfy(state.ethicIds || [], GESTALT_CONSCIOUSNESS.id));
  }
  return capitalSetForAuthority(state.authorityId, state.originId);
}

/**
 * P10.6: a Wilderness empire (Hive Mind authority + Wilderness origin) replaces the districts of the standard district
 * set (bodies with no own district layout: regular planets, Gaia, Tomb, Relic) with its own (WILDERNESS_DISTRICTS).
 */
export function usesWildernessDistricts() {
  const state = getPlanetState();
  return state.originId === "wilderness" && state.authorityId === "hiveMind" && !bodyRules()?.districtLayout;
}

/** Al cambiar de autoridad cambia el conjunto de capitales: se conserva el nivel (I-V) o el más alto que no lo supere. */
export function syncCapitalToAuthority() {
  const set = currentCapitalSet();
  if (set === sim.lastCapitalSet) return;
  const tier = sim.lastCapitalSet[Math.min(sim.capitalTierIndex, sim.lastCapitalSet.length - 1)].tier;
  let index = 0;
  set.forEach((entry, i) => { if (entry.tier <= tier) index = i; });
  sim.capitalTierIndex = index;
  sim.lastCapitalSet = set;
}

export function currentCapital() {
  const set = currentCapitalSet();
  sim.capitalTierIndex = Math.min(sim.capitalTierIndex, set.length - 1);
  return set[sim.capitalTierIndex];
}

/**
 * P10.2: district layout of the current body type (js/body-type-data.js). The four district groups keep their
 * stable keys (urban = primary, generator/mining/agriculture = the three secondary sets) so saved planets and slot
 * keys do not change; only their definitions depend on the body. On bodies with secondary urban districts
 * (Ecumenopolis...) the three secondary sets are copies of the same district, each with one urban specialization.
 */
export function bodyRules() {
  return BODY_TYPE_RULES[getPlanetState().celestialTypeId] || null;
}

/** Jobs added by specializations are multiplied on some bodies (×3 Ecumenopolis); owner decision: per copy, primary and secondary. */
export function specializationJobMultiplier() {
  return bodyRules()?.specializationJobMultiplier || 1;
}

/** P10.3: district slots fixed by the body (Ring World 10, Shattered Ring World 25); null = editable planet size.
 * P10.5: on a Synaptic Lathe the capital adds Max Districts (2 + 0 / 2 / 4). */
export function fixedPlanetSize() {
  const rules = bodyRules();
  if (!rules?.fixedSize) return null;
  return rules.fixedSize + (rules.capitalSet === "synapticLathe" ? currentCapital().maxDistricts || 0 : 0);
}

/** P10.5: Synaptic Lathe layout (Neural Gate + Ampliative Speculator, no specializations). */
export function isLatheLayout() {
  return bodyRules()?.districtLayout === "lathe";
}

/** Minimum copies of the primary district: 1 on every body (the last one cannot be demolished), 0 on a Synaptic Lathe. */
export function primaryMinCount() {
  return isLatheLayout() ? 0 : URBAN_MIN_COUNT;
}

/** Housing removed by the specialization of a secondary district (×3 Ecumenopolis). */
export function secondaryHousingPenaltyMultiplier() {
  return bodyRules()?.secondaryHousingPenaltyMultiplier || 1;
}

export function scaleJobs(jobs, factor) {
  return Object.fromEntries(Object.entries(jobs || {}).map(([jobId, raw]) => [jobId, raw * factor]));
}

/** Primary district definition: the regular urban district, or the body's own primary district (Residential Arcology). */
export function primaryDistrictDef() {
  const rules = bodyRules();
  // P10.3: the Ring World primary district depends on the authority (City / Hive / Nexus Segment).
  const primaryId = rules?.primaryDistrictByAuthority
    ? rules.primaryDistrictByAuthority[getPlanetState().authorityId] || rules.primaryDistrictByAuthority.default
    : rules?.primaryDistrict;
  const special = SPECIAL_DISTRICTS[rules?.districtLayout === "lathe" ? rules.latheDistricts[0] : primaryId] || null;
  if (!special) return usesWildernessDistricts() ? WILDERNESS_DISTRICTS.urban : DISTRICTS.urban;
  if (rules.districtLayout === "lathe") {
    return {
      i18nKey: special.i18nKey, img: special.img, jobs: {}, housing: special.housing, upkeep: special.upkeep,
      specializationSlots: 0, slotsPerSpecialization: 0, specializationOptions: []
    };
  }
  return {
    i18nKey: special.i18nKey,
    img: special.img,
    jobs: special.jobs || {},
    jobsByEmpire: special.jobsByEmpire,
    technologyJobs: special.technologyJobs,
    housing: special.housing,
    agrarianIdyllHousing: special.agrarianIdyllHousing || 0,
    technologyHousing: special.technologyHousing,
    upkeep: special.upkeep,
    specializationSlots: DISTRICTS.urban.specializationSlots,
    slotsPerSpecialization: DISTRICTS.urban.slotsPerSpecialization,
    specializationOptions: DISTRICTS.urban.specializationOptions
  };
}

/** Definition of one secondary district set: a resource district (regular bodies) or a secondary urban district. */
export function secondaryDistrictDef(cat) {
  const rules = bodyRules();
  // P10.4: Habitat resource districts (Reactor District, Astro-Mining Bay, Research District) with the specializations of their category.
  // P10.6: Volcanic resource districts (Geothermal Powerplant, Magma Conduit, Thermotechnic Forum), same shape, no manual cap.
  if (rules?.districtLayout === "habitat" || rules?.districtLayout === "volcanic") {
    const special = SPECIAL_DISTRICTS[rules.resourceDistricts[RESOURCE_DISTRICT_ORDER.indexOf(cat)]];
    const regular = DISTRICTS[special.category];
    return {
      habitatResource: rules.districtLayout === "habitat",
      i18nKey: special.i18nKey,
      img: special.img,
      jobs: special.jobs || {},
      housing: special.housing,
      gestaltHousing: special.gestaltHousing || 0,
      agrarianIdyllHousing: special.agrarianIdyllHousing || 0,
      upkeep: special.upkeep,
      lockedTooltipKey: regular ? regular.lockedTooltipKey : "planetSimNoSpecializationTooltip",
      slotsPerSpecialization: regular ? regular.slotsPerSpecialization : 0,
      specializationOptions: regular ? regular.specializationOptions : []
    };
  }
  // P10.5: Synaptic Lathe — the generator group is the Ampliative Speculator, the mining and agriculture groups do not exist.
  if (rules?.districtLayout === "lathe") {
    const special = cat === RESOURCE_DISTRICT_ORDER[0] ? SPECIAL_DISTRICTS[rules.latheDistricts[1]] : null;
    if (!special) return { unavailable: true, i18nKey: DISTRICTS[cat].i18nKey, img: DISTRICTS[cat].img, jobs: {}, housing: 0, upkeep: {}, slotsPerSpecialization: 0, specializationOptions: [] };
    return { latheDistrict: true, i18nKey: special.i18nKey, img: special.img, jobs: {}, housing: special.housing, upkeep: special.upkeep, lockedTooltipKey: "planetSimNoSpecializationTooltip", slotsPerSpecialization: 0, specializationOptions: [] };
  }
  if (rules?.districtLayout !== "urbanSecondary" || !rules.secondaryDistrict) return usesWildernessDistricts() ? WILDERNESS_DISTRICTS[cat] : DISTRICTS[cat];
  const special = SPECIAL_DISTRICTS[rules.secondaryDistrict];
  // Secondary district specializations (wiki: "Effects per district" −200 Housing, like the urban ones).
  const resourceOptions = RESOURCE_DISTRICT_ORDER.flatMap((resourceCat) => DISTRICTS[resourceCat].specializationOptions)
    .filter((option) => (rules.secondarySpecializations || []).includes(option.id))
    // The secondary specialization table lists no origin requirement: the resource-district "not Wilderness" note is dropped.
    .map((option) => ({ ...option, housing: -200, requires: (option.requires || []).filter((rule) => rule.type !== "unmodelled" && rule.type !== "notOrigin") }));
  return {
    secondaryUrban: true,
    setIndex: RESOURCE_DISTRICT_ORDER.indexOf(cat) + 1,
    i18nKey: special.i18nKey,
    img: special.img,
    jobs: {},
    housing: special.housing,
    agrarianIdyllHousing: special.agrarianIdyllHousing || 0,
    technologyHousing: special.technologyHousing,
    upkeep: special.upkeep,
    lockedTooltipKey: "planetSimUrbanSlotLockedTooltip",
    slotsPerSpecialization: DISTRICTS.urban.slotsPerSpecialization,
    // P10.9: primary-only specializations (Archives, Urban Expansion, Central Spire) are not offered in secondary urban districts.
    specializationOptions: [...DISTRICTS.urban.specializationOptions.filter((option) => !option.primaryOnly), ...resourceOptions]
  };
}

/** Definition of a district group by its key ("urban" or a secondary key). */
function districtDefFor(key) {
  return key === "urban" ? primaryDistrictDef() : secondaryDistrictDef(key);
}

/** Display name of a district group (secondary urban sets are numbered: "Unspecialized Arcology 2"). */
export function districtDisplayName(key) {
  const def = districtDefFor(key);
  return def.secondaryUrban ? `${t(getLang(), def.i18nKey)} ${def.setIndex}` : t(getLang(), def.i18nKey);
}

export function primaryOption(optionId) {
  return optionId ? primaryDistrictDef().specializationOptions.find((option) => option.id === optionId) || null : null;
}

export function secondaryOption(cat, optionId) {
  return optionId ? secondaryDistrictDef(cat).specializationOptions.find((option) => option.id === optionId) || null : null;
}

/** P10.9: Administrator job of each authority (Jobs page: Bureaucrat; Hive Mind Synapse Drone; Machine Intelligence Coordinator). */
const ADMINISTRATOR_JOB_BY_AUTHORITY = { hiveMind: "synapse_drone", machineIntelligence: "coordinator" };

/** Jobs of one copy of a specialization: its fixed jobs plus its Administrator jobs by authority (P10.9), before the body multiplier. */
export function specializationJobs(option) {
  const jobs = { ...(option?.jobs || {}) };
  if (option?.administratorJobs) {
    const state = getPlanetState();
    if (!(option.administratorExcludedCivics || []).some((key) => (state.civicIds || []).includes(key))) {
      const jobId = ADMINISTRATOR_JOB_BY_AUTHORITY[state.authorityId] || "bureaucrat";
      jobs[jobId] = (jobs[jobId] || 0) + option.administratorJobs;
    }
  }
  return jobs;
}

/** P10.9: notes for the effects of a specialization that are not modelled under the current civics (Archives Bio-Trophies). */
export function specializationNotes(option) {
  const civics = getPlanetState().civicIds || [];
  return Object.entries(option?.civicNotes || {}).filter(([key]) => civics.includes(key)).map(([, i18nKey]) => t(getLang(), i18nKey));
}

/** Base jobs of one copy of a district: per empire type (Residential Arcology) and technology jobs (all technologies researched). */
export function districtBaseJobs(def) {
  const gestalt = ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id);
  const jobs = { ...(def.jobsByEmpire ? def.jobsByEmpire[gestalt ? "gestalt" : "individualist"] : def.jobs) };
  (def.technologyJobs || []).forEach((tech) => {
    if (tech.empire && tech.empire !== (gestalt ? "gestalt" : "individualist")) return;
    Object.entries(tech.jobs).forEach(([jobId, raw]) => { jobs[jobId] = (jobs[jobId] || 0) + raw; });
  });
  return jobs;
}

function specializedCategoryCount() {
  return RESOURCE_DISTRICT_ORDER.filter((cat) => districtState[cat].optionId).length;
}

/** Cuántas de las 2 ranuras de especialización del distrito urbano tienen ya una especialización elegida. */
function specializedUrbanSlotCount() {
  return districtState.urban.slots.filter(Boolean).length;
}

function totalSlots() {
  return calculateBuildingSlots(specializedUrbanSlotCount(), specializedCategoryCount());
}

/** Suma de copias de distrito construidas (urbano + las 3 categorías de recursos), para compararla con planetSize. */
export function totalDistrictCount() {
  return districtState.urban.count
    + districtState.generator.count
    + districtState.mining.count
    + districtState.agriculture.count;
}

/** ¿Cabe una copia más de distrito en el planeta, según su tamaño? */
export function canAddDistrict() {
  return totalDistrictCount() < sim.planetSize;
}

/** P10.4: manual cap of a resource district (Habitat orbital deposits); null = not set or not a capped body. */
export function districtCap(cat) {
  if (!bodyRules()?.resourceDistrictCaps) return null;
  const cap = districtState[cat].cap;
  return Number.isInteger(cap) ? cap : null;
}

/**
 * P10.8: deposit features (js/planetary-features-data.js). On natural planets the resource districts need deposit
 * features; the simulator computes the fewest the built districts need (owner decision 2026-11-20). null = the body has
 * no deposit features (artificial bodies, converted worlds) or the group is uncapped (Anglers on an Ocean World).
 */
function depositFeaturesApply() {
  return DEPOSIT_FEATURE_BODIES.includes(getPlanetState().celestialTypeId);
}

function districtUncapped(cat) {
  const state = getPlanetState();
  return UNCAPPED_DISTRICTS.some((rule) => rule.district === cat && rule.bodies.includes(state.celestialTypeId)
    && rule.civics.some((key) => (state.civicIds || []).includes(key)));
}

/** Deposit features of the current planet type that raise the cap of a district group. */
function depositFeaturesFor(cat) {
  const typeId = getPlanetState().celestialTypeId;
  return DEPOSIT_FEATURES.filter((feature) => feature.bodies.includes(typeId) && feature.caps[cat]);
}

/** Can this district group be capped by features and does the planet type have none for it (Relic agriculture)? */
export function districtHasNoFeature(cat) {
  return depositFeaturesApply() && !districtUncapped(cat) && depositFeaturesFor(cat).length === 0;
}

export function blockerFitsBody(blocker) {
  return !blocker.bodies || blocker.bodies.includes(getPlanetState().celestialTypeId);
}

/** Reason a selected blocker has no effect (wrong body or unmet requirement), or null. */
export function blockerInactiveReason(blocker, ctx = requirementContext()) {
  if (!blockerFitsBody(blocker)) return t(getLang(), "blockerWrongBody");
  const unmet = unmetRequirements(blocker, ctx).map(describeUnmetRule).filter(Boolean);
  return unmet.length ? unmet.join("; ") : null;
}

export function activeBlockers() {
  const ctx = requirementContext();
  return BLOCKERS.filter((blocker) => selectedBlockers.has(blocker.id) && !blockerInactiveReason(blocker, ctx));
}

/** P10.8: the Collapsed Spire locks the first primary specialization slot while it is on the planet. */
export function firstSpecializationLocked() {
  return activeBlockers().some((blocker) => blocker.locksFirstSpecialization);
}

export function planetModifierFitsBody(modifier) {
  const typeId = getPlanetState().celestialTypeId;
  return (!modifier.bodies || modifier.bodies.includes(typeId)) && !(modifier.notBodies || []).includes(typeId);
}

/** Selected modifier that excludes this one (the earlier one in data order wins), or null. */
export function planetModifierExcludedBy(modifier) {
  return PLANET_MODIFIERS.find((other) => other.id !== modifier.id && selectedPlanetModifiers.has(other.id) && planetModifierFitsBody(other)
    && ((other.excludes || []).includes(modifier.id) || (modifier.excludes || []).includes(other.id))
    && PLANET_MODIFIERS.indexOf(other) < PLANET_MODIFIERS.indexOf(modifier)) || null;
}

export function activePlanetModifiers() {
  return PLANET_MODIFIERS.filter((modifier) => selectedPlanetModifiers.has(modifier.id) && planetModifierFitsBody(modifier) && !planetModifierExcludedBy(modifier));
}

/** Strategic deposits that can unlock a specialization on the current planet type, worst (lowest bonus) first. */
function strategicDepositCandidates(specializationId) {
  if (!depositFeaturesApply()) return [];
  const typeId = getPlanetState().celestialTypeId;
  return STRATEGIC_DEPOSITS.filter((deposit) => deposit.unlocks === specializationId && deposit.bodies.includes(typeId))
    .map((deposit, index) => ({ deposit, index }))
    .sort((a, b) => ((a.deposit.jobBonus?.perJob || 0) - (b.deposit.jobBonus?.perJob || 0)) || a.index - b.index)
    .map((entry) => entry.deposit);
}

/** Strategic specializations chosen on the planet (resource district groups with a built copy). */
function chosenStrategicSpecializations() {
  return RESOURCE_DISTRICT_ORDER.map((cat) => (districtState[cat].count > 0 ? secondaryOption(cat, districtState[cat].optionId) : null))
    .filter((option) => option && (option.requires || []).some((rule) => rule.type === "deposit"));
}

/** Active strategic deposits: one per chosen strategic specialization (the user's choice if valid, otherwise the worst). */
function activeStrategicDeposits() {
  return chosenStrategicSpecializations().map((option) => {
    const candidates = strategicDepositCandidates(option.id);
    const chosen = candidates.find((deposit) => deposit.id === strategicDepositChoice[option.id]) || candidates[0];
    return chosen ? { specialization: option, deposit: chosen, candidates } : null;
  }).filter(Boolean);
}

/** P21.2: district specializations chosen on the planet (primary slots and resource districts with copies). */
function chosenZoneIds() {
  const ids = new Set();
  if (districtState.urban.count > 0) districtState.urban.slots.filter(Boolean).forEach((id) => ids.add(id));
  RESOURCE_DISTRICT_ORDER.forEach((cat) => { if (districtState[cat].count > 0 && districtState[cat].optionId) ids.add(districtState[cat].optionId); });
  return [...ids];
}

/**
 * P21.2: context of the job swap conditions (js/job-swaps.js): the requirement context plus gestalt, the active buildings,
 * the chosen specializations, the active planet modifiers and the active branch office buildings (legal or illegal id).
 */
export function swapContext(buildingIds, branchBuildingIds) {
  const state = getPlanetState();
  return {
    ...requirementContext(),
    gestalt: ethicsSatisfy(state.ethicIds || [], GESTALT_CONSCIOUSNESS.id),
    buildingIds,
    zoneIds: chosenZoneIds(),
    planetModifierIds: activePlanetModifiers().map((modifier) => modifier.id),
    branchBuildingIds
  };
}

/** P10.8: per-job bonuses of strategic deposits and of specializations by job category (Betharian Processing), per staffed job. */
export function featureJobBonuses() {
  const bonuses = []; // { jobs, resource, perJob, source }
  activeStrategicDeposits().forEach(({ deposit }) => {
    if (deposit.jobBonus) bonuses.push({ jobs: JOB_CATEGORIES[deposit.jobBonus.category], resource: deposit.jobBonus.resource, perJob: deposit.jobBonus.perJob, source: { kind: "feature", id: deposit.id } });
  });
  activePlanetModifiers().forEach((modifier) => (modifier.effects.jobCategoryFlat || []).forEach((bonus) => {
    bonuses.push({ jobs: JOB_CATEGORIES[bonus.category], resource: bonus.resource, perJob: bonus.perJob, source: { kind: "planetModifier", id: modifier.id } });
  }));
  activeBlockers().forEach((blocker) => {
    if (blocker.jobBonus) bonuses.push({ jobs: JOB_CATEGORIES[blocker.jobBonus.category], resource: blocker.jobBonus.resource, perJob: blocker.jobBonus.perJob, source: { kind: "blocker", id: blocker.id } });
  });
  new Set(RESOURCE_DISTRICT_ORDER.map((cat) => (districtState[cat].count > 0 ? districtState[cat].optionId : null)).filter(Boolean)).forEach((optionId) => {
    const cat = RESOURCE_DISTRICT_ORDER.find((entry) => districtState[entry].optionId === optionId);
    const option = secondaryOption(cat, optionId);
    Object.entries(option?.jobCategoryFlat || {}).forEach(([category, resources]) => Object.entries(resources).forEach(([resource, perJob]) => {
      bonuses.push({ jobs: JOB_CATEGORIES[category], resource, perJob, source: { kind: "specialization", id: option.id } });
    }));
  });
  return bonuses;
}

/**
 * Fewest deposit features covering the built resource districts (exact search over the remaining need per group;
 * ties: least spare capacity, then data order). Features with the same caps are interchangeable: the first one is
 * used and the others are listed as alternatives. Returns null when the body has no deposit features.
 */
export function requiredDepositFeatures() {
  if (!depositFeaturesApply()) return null;
  const cats = RESOURCE_DISTRICT_ORDER.filter((cat) => !districtUncapped(cat));
  const need = cats.map((cat) => districtState[cat].count);
  const typeId = getPlanetState().celestialTypeId;
  const groups = [];
  DEPOSIT_FEATURES.filter((feature) => feature.bodies.includes(typeId) && cats.some((cat) => feature.caps[cat])).forEach((feature) => {
    const signature = cats.map((cat) => feature.caps[cat] || 0).join(",");
    const group = groups.find((entry) => entry.signature === signature);
    if (group) group.alternatives.push(feature);
    else groups.push({ signature, caps: cats.map((cat) => feature.caps[cat] || 0), feature, alternatives: [] });
  });
  const memo = new Map();
  const best = (state) => {
    if (state.every((value) => value <= 0)) return { count: 0, spare: -state.reduce((sum, value) => sum + Math.min(0, value), 0), picks: [] };
    const key = state.join(",");
    if (memo.has(key)) return memo.get(key);
    let result = null;
    groups.forEach((group, index) => {
      if (!group.caps.some((cap, i) => cap > 0 && state[i] > 0)) return;
      const sub = best(state.map((value, i) => (value > 0 ? value - group.caps[i] : value)));
      if (!sub) return;
      const candidate = { count: sub.count + 1, spare: sub.spare, picks: [index, ...sub.picks] };
      if (!result || candidate.count < result.count || (candidate.count === result.count && candidate.spare < result.spare)) result = candidate;
    });
    memo.set(key, result);
    return result;
  };
  // Strategic deposits of the chosen strategic specializations are on the planet: their caps count first.
  const strategic = activeStrategicDeposits();
  strategic.forEach(({ deposit }) => cats.forEach((cat, i) => { need[i] -= deposit.caps[cat] || 0; }));
  // Planet modifiers add (or remove) max districts per group (High Quality Minerals +4 mining, Bleak −4 agriculture...).
  const modifierCaps = {};
  activePlanetModifiers().forEach((modifier) => Object.entries(modifier.effects.maxDistricts || {}).forEach(([cat, amount]) => { modifierCaps[cat] = (modifierCaps[cat] || 0) + amount; }));
  cats.forEach((cat, i) => { need[i] -= modifierCaps[cat] || 0; });
  const found = best(need.map((value) => Math.max(0, value)));
  const uncovered = cats.filter((cat, i) => need[i] > 0 && !groups.some((group) => group.caps[i] > 0));
  // (need already includes the strategic caps)
  const picks = new Map();
  (found?.picks || []).forEach((index) => picks.set(index, (picks.get(index) || 0) + 1));
  return {
    strategic,
    modifierCaps,
    features: [...picks.entries()].sort((a, b) => a[0] - b[0]).map(([index, copies]) => ({ ...groups[index], copies })),
    count: found ? found.count + strategic.length : null,
    uncovered,
    uncapped: RESOURCE_DISTRICT_ORDER.filter((cat) => districtUncapped(cat))
  };
}

/** ¿Cabe una copia más de este distrito de recursos (tamaño del planeta y, en hábitats, límite manual por depósitos)? */
export function canAddResourceDistrict(cat) {
  if (secondaryDistrictDef(cat).unavailable) return false;
  if (districtHasNoFeature(cat)) return false; // P10.8: no deposit feature for this group on the planet type
  const cap = districtCap(cat);
  return canAddDistrict() && (cap === null || districtState[cat].count < cap);
}

/** Ranuras que no son la del capital: la ranura 0 de las 6 base siempre es suya. */
function buildableCapacity() {
  return totalSlots() - 1;
}

/** P10.5: building slots of a Synaptic Lathe besides the capital (it has six at most, one is the capital's). */
const LATHE_MAX_BUILDING_SLOTS = 5;

/** P10.5: each Synaptic Lathe district (Neural Gate, Ampliative Speculator) opens one building slot. */
function latheBuildingSlots() {
  return Math.min(LATHE_MAX_BUILDING_SLOTS, districtState.urban.count + districtState[RESOURCE_DISTRICT_ORDER[0]].count);
}

/** Claves de ranura, en orden canónico estable, dentro del límite actual (incluido el tope real de 21). */
export function unlockedKeys() {
  // P10.5: the Synaptic Lathe only has the base slots, opened by its districts.
  if (isLatheLayout()) return Array.from({ length: latheBuildingSlots() }, (_, i) => `base-${i + 1}`);
  const keys = [];
  for (let i = 1; i <= 5; i += 1) keys.push(`base-${i}`);
  districtState.urban.slots.forEach((optionId, slotIndex) => {
    if (!optionId) return;
    for (let i = 1; i <= 3; i += 1) keys.push(`urban-spec-${slotIndex}-${i}`);
  });
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (districtState[cat].optionId) {
      for (let i = 1; i <= 3; i += 1) keys.push(`${cat}-spec-${i}`);
    }
  });
  return keys.slice(0, buildableCapacity());
}

export function branchHostBlock() {
  const state = getPlanetState();
  return branchHostBlockReason(requirementContext(), ethicsSatisfy(state.ethicIds || [], GESTALT_CONSCIOUSNESS.id));
}

/** P19.3: branch office buildings that act on the planet (office present, host allowed, slot unlocked, requirements met). */
export function activeBranchBuildings() {
  if (!branchOffice.present || branchHostBlock()) return [];
  const ownerCtx = branchOwnerContext(branchOffice);
  const hostCtx = requirementContext();
  const slots = branchSlotCount(currentCapital().tier);
  return branchOffice.slots.slice(0, slots).map((id) => getBranchBuilding(id)).filter((building) => building && branchBuildingAvailable(building, ownerCtx, hostCtx));
}

/** Name of a branch office building (legal id or illegal twin id) for the modifier panel. */
export function branchBuildingName(id) {
  const building = BRANCH_OFFICE_BUILDINGS.find((entry) => entry.id === id || entry.illegal?.id === id);
  if (!building) return id;
  return t(getLang(), (building.id === id ? building : building.illegal).i18nKey);
}

/** Contexto con el que se evalúan los requisitos de los edificios (ver js/building-requirements.js). */
export function requirementContext() {
  const state = getPlanetState();
  return {
    ethicIds: state.ethicIds || [],
    authorityId: state.authorityId,
    originId: state.originId || null,
    civicIds: state.civicIds || [],
    designationId: sim.selectedDesignationId,
    celestialTypeId: state.celestialTypeId,
    speciesType: state.speciesType,
    capitalTierNumber: currentCapital().tier,
    // P10.8: strategic specializations whose deposit can exist on this body.
    blockerIds: [...selectedBlockers].filter((id) => { const blocker = BLOCKERS.find((entry) => entry.id === id); return blocker && blockerFitsBody(blocker); }),
    depositSpecializations: [...new Set(STRATEGIC_DEPOSITS.filter((deposit) => depositFeaturesApply() && deposit.bodies.includes(state.celestialTypeId)).map((deposit) => deposit.unlocks))],
    // P10.4: manual caps of the habitat district groups (null = not set), for the "Can build ..." designation requirements.
    districtCaps: Object.fromEntries(RESOURCE_DISTRICT_ORDER.map((cat) => [cat, districtCap(cat)]))
  };
}

/** ¿Cumple este edificio sus requisitos (ética, autoridad, principios, designación...) ahora mismo? */
export function isBuildingAvailable(building) {
  // P10.5: the Synaptic Lathe uses its own building set, which cannot be built anywhere else.
  if ((building.sets || []).includes("lathe") !== isLatheLayout()) return false;
  return buildingRequirementsMet(building, requirementContext());
}

/** Raíz de la cadena de mejora de un edificio (p. ej. Megaforjas -> Fundiciones). Los de una misma cadena comparten el límite de colonia: mejorar sustituye al anterior, no se suman. */
function chainRootId(building) {
  let current = building;
  while (current.upgradesFrom && buildingsById.get(current.upgradesFrom)) current = buildingsById.get(current.upgradesFrom);
  return current.id;
}

/** Cuántos edificios de la cadena de este edificio hay construidos. */
export function chainBuildingCount(building) {
  const root = chainRootId(building);
  let n = 0;
  builtMap.forEach((id) => {
    const other = buildingsById.get(id);
    // Solo cuentan los eslabones con límite de colonia: los "sin límite" (p. ej. Templo, Oficinas) no bloquean su mejora.
    if (other.colonyLimit !== "none" && chainRootId(other) === root) n += 1;
  });
  return n;
}

export function buildingCount(id) {
  let n = 0;
  builtMap.forEach((buildingId) => { if (buildingId === id) n += 1; });
  return n;
}

export function isLimited(building) {
  return building.colonyLimit !== "none";
}

/** Building sets que solo se pueden construir en su distrito de recursos especializado a juego, nunca en las ranuras base (ver doc de BUILDINGS en planet-data.js). */
const EXTRACTION_BUILDING_SETS = ["energy", "minerals", "food"];

/**
 * Qué building sets admite una ranura, y una etiqueta legible de su
 * especialización (para el aviso cuando un edificio no encaja ahí).
 * sets === null significa "ranura base": admite cualquier cosa salvo los
 * building sets de extracción (energy/minerals/food), que exigen su propio
 * distrito de recursos especializado.
 */
export function slotSpecInfo(key) {
  const urbanMatch = /^urban-spec-(\d+)-\d+$/.exec(key);
  if (urbanMatch) {
    const slotIndex = Number(urbanMatch[1]);
    const optionId = districtState.urban.slots[slotIndex];
    const option = primaryOption(optionId);
    // P10.9: Urban Expansion permits every set except the listed ones (excludedSets).
    if (option?.excludedSets) return { sets: null, excludedSets: option.excludedSets, label: t(getLang(), option.i18nKey) };
    return {
      sets: option ? option.permittedSets : [],
      label: option ? t(getLang(), option.i18nKey) : t(getLang(), "planetSimNotSpecialized")
    };
  }

  const resourceMatch = /^(generator|mining|agriculture)-spec-\d+$/.exec(key);
  if (resourceMatch) {
    const cat = resourceMatch[1];
    const state = districtState[cat];
    const option = secondaryOption(cat, state.optionId);
    return {
      sets: option ? option.permittedSets : [],
      label: option ? t(getLang(), option.i18nKey) : t(getLang(), "planetSimNotSpecialized")
    };
  }

  // Ranura base (base-1..5 o capital): sin especialización que la restrinja.
  return { sets: null, label: null };
}

/** ¿Puede este edificio construirse en esta ranura, según su especialización? */
export function slotAcceptsBuilding(key, building) {
  const info = slotSpecInfo(key);
  if (info.excludedSets) return !building.sets.some((set) => info.excludedSets.includes(set) || set === "lathe");
  if (info.sets === null) {
    if (isLatheLayout()) return building.sets.includes("lathe"); // P10.5
    return !building.sets.some((set) => EXTRACTION_BUILDING_SETS.includes(set) || set === "lathe");
  }
  return building.sets.some((set) => info.sets.includes(set));
}

/** Mantiene selectedSlotKey apuntando a una ranura libre y desbloqueada válida (o null si no queda ninguna). Se llama al principio de refresh(). */
/**
 * Mantiene selectedSlotKey apuntando a una ranura libre y desbloqueada
 * válida (o null si no queda ninguna). Se llama al principio de refresh().
 * Cuando el objetivo actual deja de ser válido (se acaba de construir en
 * él, o ha dejado de estar desbloqueado), avanza a la SIGUIENTE ranura
 * libre por orden canónico a partir de esa posición — no reinicia al
 * primer hueco de toda la colonia — y solo da la vuelta al principio si no
 * queda ninguna ranura libre después de esa posición.
 */
export function resolveSelectedSlot() {
  const unlocked = unlockedKeys();
  if (sim.selectedSlotKey && unlocked.includes(sim.selectedSlotKey) && !builtMap.has(sim.selectedSlotKey)) {
    return sim.selectedSlotKey;
  }

  const previousIndex = sim.selectedSlotKey ? unlocked.indexOf(sim.selectedSlotKey) : -1;
  const startIndex = previousIndex === -1 ? 0 : previousIndex + 1;
  const next = unlocked.slice(startIndex).find((key) => !builtMap.has(key))
    ?? unlocked.find((key) => !builtMap.has(key));
  sim.selectedSlotKey = next || null;
  return sim.selectedSlotKey;
}

/**
 * Un edificio construido solo cuenta (empleos, recursos, vivienda...) si
 * cumple TRES condiciones a la vez: su ranura sigue desbloqueada, cumple sus
 * requisitos (ética, autoridad, principio...) y la especialización de la
 * ranura sigue permitiendo su building set. Si falla alguna, NO se borra:
 * queda inactivo (marco amarillo) hasta que se recupere la condición o se
 * demuela a mano. Devuelve null si está activo, o el motivo del bloqueo:
 * "locked" | "requirements" | "notPermitted".
 */
export function inactiveReason(key, building, unlocked) {
  if (!unlocked.includes(key)) return "locked";
  if (!isBuildingAvailable(building)) return "requirements";
  if (!slotAcceptsBuilding(key, building)) return "notPermitted";
  return null;
}

export function removeBuildingAt(key) {
  builtMap.delete(key);
}

/** P16.12: civiles válidos = entero ≥ 0 (×100); cualquier otra cosa → 0. */
export function sanitizeCivilians(raw) {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Especializaciones elegidas que dejan de cumplir sus requisitos (P7.4) o que el distrito del cuerpo celeste actual ya
 * no ofrece (P10.2: p. ej. al pasar de un planeta normal a una ecumenópolis): se quitan y se avisa. Los edificios de esas
 * ranuras quedan inactivos, no se borran.
 */
export function pruneInvalidSpecializations() {
  const ctx = requirementContext();
  const reset = [];
  const allOptions = [DISTRICTS, WILDERNESS_DISTRICTS].flatMap((set) => ["urban", ...RESOURCE_DISTRICT_ORDER].flatMap((cat) => set[cat].specializationOptions));
  const optionName = (optionId) => { const option = allOptions.find((entry) => entry.id === optionId); return option ? t(getLang(), option.i18nKey) : optionId; };
  districtState.urban.slots.forEach((optionId, slotIndex) => {
    if (!optionId) return;
    const option = primaryOption(optionId);
    if (!option || !buildingRequirementsMet(option, ctx) || (option.firstSlotOnly && slotIndex > 0) || (slotIndex === 0 && firstSpecializationLocked())) {
      districtState.urban.slots[slotIndex] = null;
      reset.push(optionName(optionId));
    }
  });
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const optionId = districtState[cat].optionId;
    if (!optionId) return;
    const option = secondaryOption(cat, optionId);
    if (!option || !buildingRequirementsMet(option, ctx)) {
      districtState[cat].optionId = null;
      reset.push(optionName(optionId));
    }
  });
  if (reset.length) showNotice(t(getLang(), "planetSimSpecializationResetNotice")(reset.join(", ")));
  // P10.5: district groups the body does not have (Synaptic Lathe mining / agriculture) are emptied.
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (secondaryDistrictDef(cat).unavailable && districtState[cat].count) districtState[cat].count = 0;
  });
}

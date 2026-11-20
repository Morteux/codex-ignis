/**
 * Simulador de Planetas (v1.5).
 *
 * Resumen del modelo actual (a petición de Morteux, iteración a iteración):
 *  - Ranuras: 6 base (una es el edificio capital) + 3 por cada
 *    especialización de distrito elegida (2 ranuras de especialización
 *    urbanas y 1 por cada categoría de recursos), con tope real de 21. Ver
 *    unlockedKeys() y calculateBuildingSlots() en planet-data.js.
 *  - Distritos: el urbano tiene 2 ranuras de especialización; generador,
 *    minería y agricultura tienen 1 cada una, todas con varias opciones
 *    (DISTRICTS[...].specializationOptions). Construir copias de distrito
 *    solo escala los empleos de las especializaciones elegidas. El total de
 *    copias de todos los tipos no puede superar planetSize (por defecto 20,
 *    editable).
 *  - Edificios: cada uno tiene "sets" y cada especialización "permittedSets"
 *    (ver planet-data.js); slotAcceptsBuilding() decide dónde se puede
 *    construir. Hay una ranura objetivo (selectedSlotKey, borde amarillo)
 *    que avanza sola a la siguiente libre; el catálogo desactiva lo que no
 *    encaja en ella y sus desplegables por categoría solo se recalculan al
 *    cambiar el TIPO de ranura objetivo (getSlotTypeSignature), no al
 *    moverse entre ranuras del mismo tipo.
 *  - Empleos: cada empleo tiene un slider de población (escala ×100 de los
 *    datos, paso 10) con botones ±100 (Mayús: ±1000). Los recursos se
 *    calculan a partir de la población asignada, no de la capacidad; el
 *    slider actualiza en vivo vía refreshEconomyOnly(), que nunca recrea
 *    los propios sliders para no interrumpir el arrastre.
 *  - Recursos: tres columnas siempre visibles (producidos, consumidos,
 *    netos), calculadas en computeTotals().
 *  - Pestañas de planeta (Planeta/Imperio/Cuerpo celeste/Sucursales):
 *    todo lo anterior vive bajo "Planeta"; Sucursales es un marcador.
 *
 * Modelo de ranuras: cada ranura no-capital tiene una "clave" estable
 * (p. ej. "urban-spec-0-1", "generator-spec-3") en vez de una simple
 * posición en un array. Así, si le retiras la especialización a una ranura,
 * sus edificios no se borran: dejan de contar hasta que la recuperes.
 *
 * Ver js/planet-data.js para el origen de todos los números.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import {
  BUILDINGS,
  JOBS,
  JOB_OUTPUTS,
  CIVILIAN_OUTPUTS,
  JOB_EFFECTS,
  JOB_STRATA,
  STRATUM_I18N_KEYS,
  STAT_EFFECTS,
  HEADER_ICONS,
  RESOURCES,
  CATEGORY_ORDER,
  CATEGORY_I18N_KEYS,
  calculateBuildingSlots,
  divideEffect,
  EFFECT_SCALE,
  CAPITAL_SETS,
  capitalSetForAuthority,
  GESTALT_JOB_UPKEEP,
  JOB_WORKFORCE_SCALING,
  SPECIES_TYPES,
  allowedSpeciesTypes,
  DISTRICTS,
  RESOURCE_DISTRICT_ORDER,
  JOB_RESOURCE_MULT,
  ANGLERS_WET_CLIMATE,
  ANGLERS_JOB_SWAPS
} from "./planet-data.js";
import { BODY_TYPE_RULES, SPECIAL_DISTRICTS, SPECIAL_CAPITAL_SETS, SPECIAL_BODY_JOBS } from "./body-type-data.js";
import { PLANET_MODIFIERS, PLANET_MODIFIER_GROUPS } from "./planet-modifier-data.js";
import { DEPOSIT_FEATURES, DEPOSIT_FEATURE_BODIES, UNCAPPED_DISTRICTS, DEPOSIT_FEATURE_COUNT, STRATEGIC_DEPOSITS, JOB_CATEGORIES, BLOCKERS } from "./planetary-features-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { getStackingRules, getCalculationOrder, combineFraction, stackFactor } from "./stacking-rules.js";
import { updatePlanetState, getPlanetState, onPlanetStateChange, onEmpireSwitched, onPoliciesReset, onEdictsRemoved } from "./planet-state.js";
import { getEdict } from "./edict-data.js";
import { getPolicyGroup, getPolicyOption } from "./policy-data.js";
import { createInfoPanel, syncInfoButtons, initInfoButtons } from "./info-panels.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS, ETHIC_OPTIONS, AUTHORITIES, ETHIC_EFFECTS, AUTHORITY_EFFECTS } from "./empire-data.js";
import { buildingRequirementsMet, requirementContextKey, unmetRequirements, unmodelledRequirements } from "./building-requirements.js";
import { allowedDesignationCategories, PLANET_TYPES } from "./celestial-data.js";
import { DESIGNATIONS, DESIGNATION_CATEGORY_ORDER, DESIGNATION_CATEGORY_I18N_KEYS, getDesignation, designationAvailable, designationUnmetRules } from "./designation-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const slotsVisualEl = document.querySelector("#planet-slots-visual");
const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const statHousingIcon = document.querySelector("#planet-stat-housing-icon");
const statAmenitiesIcon = document.querySelector("#planet-stat-amenities-icon");
const catalogEl = document.querySelector("#planet-catalog");
const districtsCatalogEl = document.querySelector("#planet-districts-catalog");
const tabBuildingsBtn = document.querySelector("#planet-tab-buildings");
const tabDistrictsBtn = document.querySelector("#planet-tab-districts");
const summaryEl = document.querySelector("#planet-summary");
const modifiersEl = document.querySelector("#planet-modifiers");
const externalEl = document.querySelector("#planet-production-external");
const checkEl = document.querySelector("#planet-production-check");
const conditionsEl = document.querySelector("#planet-conditions");
const summaryPopulationEl = document.querySelector("#planet-jobs-counter");
const producedEl = document.querySelector("#planet-production-produced");
const consumedEl = document.querySelector("#planet-production-consumed");
const netEl = document.querySelector("#planet-production-net");
const nonResourceEl = document.querySelector("#planet-nonresource");
const capitalNameEl = document.querySelector("#planet-capital-name");
const capitalTierEl = document.querySelector("#planet-capital-tier");
const capitalUpgradeBtn = document.querySelector("#planet-capital-upgrade");
const capitalDowngradeBtn = document.querySelector("#planet-capital-downgrade");
const designationSelect = document.querySelector("#planet-designation-select");
const planetSizeInput = document.querySelector("#planet-size-input");
const districtsUsedLabel = document.querySelector("#planet-districts-used-label");
const metaDescription = document.querySelector('meta[name="description"]');
const mainTabButtons = document.querySelectorAll(".planet-main-tab[data-main-tab]");
const mainTabPanels = {
  library: document.querySelector("#planet-tab-panel-library"),
  planet: document.querySelector("#planet-tab-panel-planet"),
  empire: document.querySelector("#planet-tab-panel-empire"),
  body: document.querySelector("#planet-tab-panel-body"),
  edicts: document.querySelector("#planet-tab-panel-edicts"),
  branches: document.querySelector("#planet-tab-panel-branches")
};

// Iconos de cabecera (vivienda/servicios): estáticos, no dependen del
// idioma ni del estado, así que se fijan una única vez al cargar.
if (statHousingIcon) statHousingIcon.src = "img/ui/Housing.png";
if (statAmenitiesIcon) statAmenitiesIcon.src = `${IMAGE_BASE}${HEADER_ICONS.amenities}`;

let currentLang = detectInitialLang();
let activeTab = "buildings";
let districtFilter = null; // null = todas, o "urban"/"generator"/"mining"/"agriculture"

let capitalTierIndex = 0;
let lastCapitalSet = CAPITAL_SETS.standard;

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
function currentCapitalSet() {
  const state = getPlanetState();
  if (bodyRules()?.capitalSet === "synapticLathe") return LATHE_CAPITAL_SET;
  if (bodyRules()?.capitalSet === "habitat") {
    return habitatCapitalSet(state.authorityId, ethicsSatisfy(state.ethicIds || [], GESTALT_CONSCIOUSNESS.id));
  }
  return capitalSetForAuthority(state.authorityId);
}

/** Al cambiar de autoridad cambia el conjunto de capitales: se conserva el nivel (I-V) o el más alto que no lo supere. */
function syncCapitalToAuthority() {
  const set = currentCapitalSet();
  if (set === lastCapitalSet) return;
  const tier = lastCapitalSet[Math.min(capitalTierIndex, lastCapitalSet.length - 1)].tier;
  let index = 0;
  set.forEach((entry, i) => { if (entry.tier <= tier) index = i; });
  capitalTierIndex = index;
  lastCapitalSet = set;
}

function currentCapital() {
  const set = currentCapitalSet();
  capitalTierIndex = Math.min(capitalTierIndex, set.length - 1);
  return set[capitalTierIndex];
}

/** Designación planetaria elegida (id de DESIGNATIONS en designation-data.js, o "" si no hay ninguna). */
let selectedDesignationId = "";

/** Tamaño del planeta: por ahora, límite del total de copias de distrito (urbano + recursos) que se pueden construir en la colonia. Editable por el usuario. */
let planetSize = 20;

/**
 * Estado de distritos: el urbano guarda cuántas copias hay construidas
 * (count, solo escala empleos) y, por separado, qué especialización tiene
 * elegida cada una de sus 2 ranuras de especialización (slots: array de 2
 * posiciones, cada una null o el id de una DISTRICTS.urban.specializationOptions).
 * Elegir una especialización es lo único que desbloquea sus 3 ranuras de
 * edificio; el número de copias del distrito NO desbloquea ranuras.
 *
 * Cada categoría de recurso básico (generador/minería/agricultura) tiene
 * una única ranura de especialización (no dos como el urbano), con varias
 * opciones entre las que elegir (optionId: null o un id de
 * DISTRICTS[cat].specializationOptions) — igual que el urbano, pero con
 * un solo hueco de elección en vez de dos.
 */
// Mínimo de copias del distrito urbano: siempre tiene que haber al menos
// una construida, ocupando su espacio dentro del número máximo de
// distritos del planeta (planetSize).
const URBAN_MIN_COUNT = 1;

const districtState = {
  urban: { count: 2, slots: [null, null] },
  // cap (P10.4): manual limit of Habitat resource districts (orbital deposits); null = not set.
  generator: { count: 0, optionId: null, cap: null },
  mining: { count: 0, optionId: null, cap: null },
  agriculture: { count: 0, optionId: null, cap: null }
};

/**
 * P10.2: district layout of the current body type (js/body-type-data.js). The four district groups keep their
 * stable keys (urban = primary, generator/mining/agriculture = the three secondary sets) so saved planets and slot
 * keys do not change; only their definitions depend on the body. On bodies with secondary urban districts
 * (Ecumenopolis...) the three secondary sets are copies of the same district, each with one urban specialization.
 */
function bodyRules() {
  return BODY_TYPE_RULES[getPlanetState().celestialTypeId] || null;
}

/** Jobs added by specializations are multiplied on some bodies (×3 Ecumenopolis); owner decision: per copy, primary and secondary. */
function specializationJobMultiplier() {
  return bodyRules()?.specializationJobMultiplier || 1;
}

/** P10.3: district slots fixed by the body (Ring World 10, Shattered Ring World 25); null = editable planet size.
 * P10.5: on a Synaptic Lathe the capital adds Max Districts (2 + 0 / 2 / 4). */
function fixedPlanetSize() {
  const rules = bodyRules();
  if (!rules?.fixedSize) return null;
  return rules.fixedSize + (rules.capitalSet === "synapticLathe" ? currentCapital().maxDistricts || 0 : 0);
}

/** P10.5: Synaptic Lathe layout (Neural Gate + Ampliative Speculator, no specializations). */
function isLatheLayout() {
  return bodyRules()?.districtLayout === "lathe";
}

/** Minimum copies of the primary district: 1 on every body (the last one cannot be demolished), 0 on a Synaptic Lathe. */
function primaryMinCount() {
  return isLatheLayout() ? 0 : URBAN_MIN_COUNT;
}

/** Housing removed by the specialization of a secondary district (×3 Ecumenopolis). */
function secondaryHousingPenaltyMultiplier() {
  return bodyRules()?.secondaryHousingPenaltyMultiplier || 1;
}

function scaleJobs(jobs, factor) {
  return Object.fromEntries(Object.entries(jobs || {}).map(([jobId, raw]) => [jobId, raw * factor]));
}

/** Primary district definition: the regular urban district, or the body's own primary district (Residential Arcology). */
function primaryDistrictDef() {
  const rules = bodyRules();
  // P10.3: the Ring World primary district depends on the authority (City / Hive / Nexus Segment).
  const primaryId = rules?.primaryDistrictByAuthority
    ? rules.primaryDistrictByAuthority[getPlanetState().authorityId] || rules.primaryDistrictByAuthority.default
    : rules?.primaryDistrict;
  const special = SPECIAL_DISTRICTS[rules?.districtLayout === "lathe" ? rules.latheDistricts[0] : primaryId] || null;
  if (!special) return DISTRICTS.urban;
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
function secondaryDistrictDef(cat) {
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
  if (rules?.districtLayout !== "urbanSecondary" || !rules.secondaryDistrict) return DISTRICTS[cat];
  const special = SPECIAL_DISTRICTS[rules.secondaryDistrict];
  // Secondary district specializations (wiki: "Effects per district" −200 Housing, like the urban ones).
  const resourceOptions = RESOURCE_DISTRICT_ORDER.flatMap((resourceCat) => DISTRICTS[resourceCat].specializationOptions)
    .filter((option) => (rules.secondarySpecializations || []).includes(option.id))
    // The secondary specialization table lists no origin requirement: the resource-district "not Wilderness" note is dropped.
    .map((option) => ({ ...option, housing: -200, requires: (option.requires || []).filter((rule) => rule.type !== "unmodelled") }));
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
function districtDisplayName(key) {
  const def = districtDefFor(key);
  return def.secondaryUrban ? `${t(currentLang, def.i18nKey)} ${def.setIndex}` : t(currentLang, def.i18nKey);
}

function primaryOption(optionId) {
  return optionId ? primaryDistrictDef().specializationOptions.find((option) => option.id === optionId) || null : null;
}

function secondaryOption(cat, optionId) {
  return optionId ? secondaryDistrictDef(cat).specializationOptions.find((option) => option.id === optionId) || null : null;
}

/** P10.9: Administrator job of each authority (Jobs page: Bureaucrat; Hive Mind Synapse Drone; Machine Intelligence Coordinator). */
const ADMINISTRATOR_JOB_BY_AUTHORITY = { hiveMind: "synapse_drone", machineIntelligence: "coordinator" };

/** Jobs of one copy of a specialization: its fixed jobs plus its Administrator jobs by authority (P10.9), before the body multiplier. */
function specializationJobs(option) {
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
function specializationNotes(option) {
  const civics = getPlanetState().civicIds || [];
  return Object.entries(option?.civicNotes || {}).filter(([key]) => civics.includes(key)).map(([, i18nKey]) => t(currentLang, i18nKey));
}

/** Base jobs of one copy of a district: per empire type (Residential Arcology) and technology jobs (all technologies researched). */
function districtBaseJobs(def) {
  const gestalt = ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id);
  const jobs = { ...(def.jobsByEmpire ? def.jobsByEmpire[gestalt ? "gestalt" : "individualist"] : def.jobs) };
  (def.technologyJobs || []).forEach((tech) => {
    if (tech.empire && tech.empire !== (gestalt ? "gestalt" : "individualist")) return;
    Object.entries(tech.jobs).forEach(([jobId, raw]) => { jobs[jobId] = (jobs[jobId] || 0) + raw; });
  });
  return jobs;
}

// Ranuras no-capital construidas: clave de ranura estable -> id de edificio.
// Ver cabecera del archivo para qué es una "clave de ranura".
const builtMap = new Map();

const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

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
function totalDistrictCount() {
  return districtState.urban.count
    + districtState.generator.count
    + districtState.mining.count
    + districtState.agriculture.count;
}

/** ¿Cabe una copia más de distrito en el planeta, según su tamaño? */
function canAddDistrict() {
  return totalDistrictCount() < planetSize;
}

/** P10.4: manual cap of a resource district (Habitat orbital deposits); null = not set or not a capped body. */
function districtCap(cat) {
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
function districtHasNoFeature(cat) {
  return depositFeaturesApply() && !districtUncapped(cat) && depositFeaturesFor(cat).length === 0;
}

/** P10.8: blockers placed by the user (saved with the planet); only the ones whose body and requirements fit have effects. */
const selectedBlockers = new Set();

function blockerFitsBody(blocker) {
  return !blocker.bodies || blocker.bodies.includes(getPlanetState().celestialTypeId);
}

/** Reason a selected blocker has no effect (wrong body or unmet requirement), or null. */
function blockerInactiveReason(blocker, ctx = requirementContext()) {
  if (!blockerFitsBody(blocker)) return t(currentLang, "blockerWrongBody");
  const unmet = unmetRequirements(blocker, ctx).map(describeUnmetRule).filter(Boolean);
  return unmet.length ? unmet.join("; ") : null;
}

function activeBlockers() {
  const ctx = requirementContext();
  return BLOCKERS.filter((blocker) => selectedBlockers.has(blocker.id) && !blockerInactiveReason(blocker, ctx));
}

/** P10.8: the Collapsed Spire locks the first primary specialization slot while it is on the planet. */
function firstSpecializationLocked() {
  return activeBlockers().some((blocker) => blocker.locksFirstSpecialization);
}

/** P10.8: planet modifiers chosen by the user (saved with the planet). */
const selectedPlanetModifiers = new Set();

function planetModifierFitsBody(modifier) {
  const typeId = getPlanetState().celestialTypeId;
  return (!modifier.bodies || modifier.bodies.includes(typeId)) && !(modifier.notBodies || []).includes(typeId);
}

/** Selected modifier that excludes this one (the earlier one in data order wins), or null. */
function planetModifierExcludedBy(modifier) {
  return PLANET_MODIFIERS.find((other) => other.id !== modifier.id && selectedPlanetModifiers.has(other.id) && planetModifierFitsBody(other)
    && ((other.excludes || []).includes(modifier.id) || (modifier.excludes || []).includes(other.id))
    && PLANET_MODIFIERS.indexOf(other) < PLANET_MODIFIERS.indexOf(modifier)) || null;
}

function activePlanetModifiers() {
  return PLANET_MODIFIERS.filter((modifier) => selectedPlanetModifiers.has(modifier.id) && planetModifierFitsBody(modifier) && !planetModifierExcludedBy(modifier));
}

/** P10.8: user's choice of strategic deposit per strategic specialization (saved with the planet); missing = the worst one. */
const strategicDepositChoice = {};

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

/** P10.10: Anglers-family civic on a wet-climate world (Farmer → Angler, Artisan → Pearl Diver). */
function anglersSwapsActive() {
  return buildingRequirementsMet({ requires: ANGLERS_WET_CLIMATE }, requirementContext());
}

/**
 * Job swaps on the planet: the body's (Volcanic), the Anglers ones (P10.10; job swap weight 50, above the Gas Extractor's
 * 20, so Anglers keep the Farmer jobs under Exotic Gas Capture) and those of the chosen specializations ("zone on planet").
 */
function planetJobSwaps() {
  const swaps = { ...(bodyRules()?.jobSwaps || {}) };
  if (anglersSwapsActive()) Object.entries(ANGLERS_JOB_SWAPS).forEach(([from, to]) => { if (!swaps[from]) swaps[from] = to; });
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const option = districtState[cat].count > 0 ? secondaryOption(cat, districtState[cat].optionId) : null;
    Object.entries(option?.jobSwaps || {}).forEach(([from, to]) => { if (!swaps[from]) swaps[from] = to; });
  });
  return swaps;
}

/** P10.8: per-job bonuses of strategic deposits and of specializations by job category (Betharian Processing), per staffed job. */
function featureJobBonuses() {
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
  // P10.10: Angler under Exotic Gas Capture (Jobs page): −3 food, +0.5 exotic gases per job.
  if (planetJobSwaps().farmer === "angler" && chosenStrategicSpecializations().some((option) => option.id === "exoticGasCapture")) {
    bonuses.push({ jobs: ["angler"], resource: "food", perJob: -3, source: { kind: "specialization", id: "exoticGasCapture" } });
    bonuses.push({ jobs: ["angler"], resource: "exotic_gases", perJob: 0.5, source: { kind: "specialization", id: "exoticGasCapture" } });
  }
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
function requiredDepositFeatures() {
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
function canAddResourceDistrict(cat) {
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
function unlockedKeys() {
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

/** Contexto con el que se evalúan los requisitos de los edificios (ver js/building-requirements.js). */
function requirementContext() {
  const state = getPlanetState();
  return {
    ethicIds: state.ethicIds || [],
    authorityId: state.authorityId,
    civicIds: state.civicIds || [],
    designationId: selectedDesignationId,
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
function isBuildingAvailable(building) {
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
function chainBuildingCount(building) {
  const root = chainRootId(building);
  let n = 0;
  builtMap.forEach((id) => {
    const other = buildingsById.get(id);
    // Solo cuentan los eslabones con límite de colonia: los "sin límite" (p. ej. Templo, Oficinas) no bloquean su mejora.
    if (other.colonyLimit !== "none" && chainRootId(other) === root) n += 1;
  });
  return n;
}

function buildingCount(id) {
  let n = 0;
  builtMap.forEach((buildingId) => { if (buildingId === id) n += 1; });
  return n;
}

function isLimited(building) {
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
function slotSpecInfo(key) {
  const urbanMatch = /^urban-spec-(\d+)-\d+$/.exec(key);
  if (urbanMatch) {
    const slotIndex = Number(urbanMatch[1]);
    const optionId = districtState.urban.slots[slotIndex];
    const option = primaryOption(optionId);
    // P10.9: Urban Expansion permits every set except the listed ones (excludedSets).
    if (option?.excludedSets) return { sets: null, excludedSets: option.excludedSets, label: t(currentLang, option.i18nKey) };
    return {
      sets: option ? option.permittedSets : [],
      label: option ? t(currentLang, option.i18nKey) : t(currentLang, "planetSimNotSpecialized")
    };
  }

  const resourceMatch = /^(generator|mining|agriculture)-spec-\d+$/.exec(key);
  if (resourceMatch) {
    const cat = resourceMatch[1];
    const state = districtState[cat];
    const option = secondaryOption(cat, state.optionId);
    return {
      sets: option ? option.permittedSets : [],
      label: option ? t(currentLang, option.i18nKey) : t(currentLang, "planetSimNotSpecialized")
    };
  }

  // Ranura base (base-1..5 o capital): sin especialización que la restrinja.
  return { sets: null, label: null };
}

/** ¿Puede este edificio construirse en esta ranura, según su especialización? */
function slotAcceptsBuilding(key, building) {
  const info = slotSpecInfo(key);
  if (info.excludedSets) return !building.sets.some((set) => info.excludedSets.includes(set) || set === "lathe");
  if (info.sets === null) {
    if (isLatheLayout()) return building.sets.includes("lathe"); // P10.5
    return !building.sets.some((set) => EXTRACTION_BUILDING_SETS.includes(set) || set === "lathe");
  }
  return building.sets.some((set) => info.sets.includes(set));
}

/**
 * Ranura actualmente seleccionada como destino de construcción (se resalta
 * con borde amarillo en la rejilla, y el catálogo desactiva los edificios
 * que no encajan en ella). Se recalcula en cada refresh() con
 * resolveSelectedSlot(): si sigue siendo una ranura libre y desbloqueada se
 * respeta tal cual (el usuario puede haberla elegido a mano pulsándola);
 * si no, se recalcula automáticamente a la primera ranura libre disponible.
 */
let selectedSlotKey = null;

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
function resolveSelectedSlot() {
  const unlocked = unlockedKeys();
  if (selectedSlotKey && unlocked.includes(selectedSlotKey) && !builtMap.has(selectedSlotKey)) {
    return selectedSlotKey;
  }

  const previousIndex = selectedSlotKey ? unlocked.indexOf(selectedSlotKey) : -1;
  const startIndex = previousIndex === -1 ? 0 : previousIndex + 1;
  const next = unlocked.slice(startIndex).find((key) => !builtMap.has(key))
    ?? unlocked.find((key) => !builtMap.has(key));
  selectedSlotKey = next || null;
  return selectedSlotKey;
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
function inactiveReason(key, building, unlocked) {
  if (!unlocked.includes(key)) return "locked";
  if (!isBuildingAvailable(building)) return "requirements";
  if (!slotAcceptsBuilding(key, building)) return "notPermitted";
  return null;
}

function removeBuildingAt(key) {
  builtMap.delete(key);
}

/**
 * Recalcula, a partir del capital, los distritos y las ranuras activas,
 * todo lo que puede derivarse: empleos totales, producción/consumo de
 * recursos, vivienda, comodidades/servicios y efectos sin recurso.
 */
function computeTotals() {
  // jobCapacities y jobAssignments viven en la MISMA escala ×100 que los
  // datos de origen (planet-data.js): así el slider (que avanza de 10 en
  // 10) tiene margen real para moverse — la mayoría de capacidades reales
  // (2, 3 pops...) apenas dejarían mover un slider de paso 10. La única
  // división por EFFECT_SCALE ocurre una vez, al final, al convertir la
  // población asignada en la tasa de recursos por trabajo (JOB_OUTPUTS,
  // que sí está en unidades reales por trabajo, confirmadas contra la wiki).
  const jobCapacities = {}; // jobId -> capacidad máxima, en unidades ×100
  const resourceTotals = {};
  const producedTotals = {};
  const consumedTotals = {};
  let housing = 0;
  let amenities = 0;

  // Suma un importe con signo al total neto de un recurso, y además lo
  // reparte en "producido" (solo la parte positiva) o "consumido" (solo la
  // parte negativa), para los paneles de desglose.
  // P8.1: desglose por fuente de cada recurso (breakdown[recurso][fuente] = importe con signo).
  // `source` es una de BREAKDOWN_SOURCES; los empleos se anotan aparte (recordBreakdown) porque
  // sus tres partes (base, bonos de edificios, eficacia) comparten una sola llamada de totales.
  const breakdown = {};
  // P8.2: lista de modificadores activos { source: {kind, id}, category, job?, resource?, stratum?, stat?, value, count }.
  // Los iguales (mismo origen y mismo objetivo) se fusionan: suman el valor y cuentan copias.
  const modifierMap = new Map();
  const pushModifier = (source, category, target, value) => {
    if (!value) return;
    const key = [source.kind, source.id, category, target.job || "", target.resource || "", target.stratum || "", target.stat || ""].join("|");
    const found = modifierMap.get(key);
    if (found) { found.value += value; found.count += 1; }
    else modifierMap.set(key, { source, category, ...target, value, count: 1 });
  };
  const recordBreakdown = (resourceId, source, amount) => {
    if (!amount) return;
    breakdown[resourceId] = breakdown[resourceId] || {};
    breakdown[resourceId][source] = (breakdown[resourceId][source] || 0) + amount;
  };
  const addSignedResource = (resourceId, amount, source) => {
    if (!amount) return;
    if (source) recordBreakdown(resourceId, source, amount);
    resourceTotals[resourceId] = (resourceTotals[resourceId] || 0) + amount;
    if (amount > 0) {
      producedTotals[resourceId] = (producedTotals[resourceId] || 0) + amount;
    } else {
      consumedTotals[resourceId] = (consumedTotals[resourceId] || 0) + amount;
    }
  };

  // P10.6: job swaps of the body (Volcanic: every Miner job becomes a Thermoforger job); P10.8: and of the chosen
  // strategic specializations (Rare Crystal Extraction: every Miner job becomes a Crystal Miner job).
  const bodyJobSwaps = planetJobSwaps();
  const addJobCapacity = (jobId, rawAmount) => {
    if (!rawAmount) return;
    const swapped = bodyJobSwaps[jobId] || jobId;
    jobCapacities[swapped] = (jobCapacities[swapped] || 0) + rawAmount;
  };

  // P10.5: active buildings first, for the upkeep multipliers of the Synaptic Lathe buildings (Expanded Reactor: −15 %
  // building upkeep, capital included, and −15 % district energy upkeep).
  const unlocked = unlockedKeys();
  const activeBuildings = [];
  builtMap.forEach((id, key) => {
    if (!unlocked.includes(key)) return;
    const building = buildingsById.get(id);
    if (building && !inactiveReason(key, building, unlocked)) activeBuildings.push([key, building]);
  });
  const upkeepStacking = getStackingRules(getPlanetState().rulesetId).upkeepMult;
  const upkeepMultValues = { buildings: [], districtEnergy: [] };
  activeBuildings.forEach(([, building]) => Object.entries(building.upkeepMult || {}).forEach(([target, fraction]) => {
    upkeepMultValues[target].push(fraction);
    pushModifier({ kind: "building", id: building.id }, "upkeepMult", { stat: target === "buildings" ? "buildingUpkeep" : "districtEnergyUpkeep" }, fraction);
  }));
  const buildingUpkeepFactor = stackFactor(upkeepStacking, upkeepMultValues.buildings);
  const districtEnergyUpkeepFactor = stackFactor(upkeepStacking, upkeepMultValues.districtEnergy);
  const districtUpkeep = (resourceId, amount) => (resourceId === "energy" && amount < 0 ? amount * districtEnergyUpkeepFactor : amount);

  // Edificio capital (fijo, siempre presente).
  const capital = currentCapital();
  Object.entries(capital.upkeep || {}).forEach(([resourceId, amount]) => addSignedResource(resourceId, amount * buildingUpkeepFactor, "capital"));
  housing += divideEffect(capital.housing || 0);
  amenities += divideEffect(capital.amenities || 0);
  // P7.10: desglose de vivienda para el tooltip de la cabecera (capital, distritos, tecnologías, edificios, designación).
  const housingSources = [];
  if (capital.housing) housingSources.push({ kind: "capital", amount: divideEffect(capital.housing) });
  // Desglose de servicios para el tooltip de la cabecera (ver renderStats).
  const amenitySources = [];
  if (capital.amenities) amenitySources.push({ kind: "capital", amount: divideEffect(capital.amenities) });
  const amenityBuildings = new Map(); // id de edificio -> { count, amount }
  Object.entries(capital.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw));

  // Vivienda y mantenimiento de los distritos (P7.1). Contexto del imperio: gestalt,
  // autoridad (el distrito primario cambia), Idilio Agrario y mundo colmena.
  const districtCtx = getPlanetState();
  const districtGestalt = ethicsSatisfy(districtCtx.ethicIds || [], GESTALT_CONSCIOUSNESS.id);
  const agrarianIdyll = (districtCtx.civicIds || []).includes("civicAgrarianIdyll");
  const urbanDef = primaryDistrictDef();
  const jobMultiplier = specializationJobMultiplier();
  // P7.10: bonos de vivienda por tecnología de un distrito (todas las tecnologías investigadas; las de tradición no).
  const addTechnologyHousing = (def, count) => {
    (def.technologyHousing || []).forEach((tech) => {
      const civics = districtCtx.civicIds || [];
      if ((tech.excludedCivics || []).some((id) => civics.includes(id))) return;
      if ((tech.requiredCivics || []).some((id) => !civics.includes(id))) return;
      const perDistrict = tech.housingByAuthority?.[districtCtx.authorityId] ?? tech.housing;
      if (!perDistrict) return;
      const amount = divideEffect(perDistrict * count);
      housing += amount;
      const found = housingSources.find((source) => source.kind === "technology" && source.id === tech.id);
      if (found) found.amount += amount;
      else housingSources.push({ kind: "technology", id: tech.id, i18nKey: tech.i18nKey, amount });
    });
  };
  if (districtState.urban.count > 0) {
    const count = districtState.urban.count;
    let perDistrict = urbanDef.housingByAuthority?.[districtCtx.authorityId] ?? urbanDef.housing;
    if (urbanDef.hiveWorldHousing && districtCtx.authorityId === "hiveMind" && districtCtx.celestialTypeId === "hive") perDistrict += urbanDef.hiveWorldHousing;
    if (agrarianIdyll) perDistrict += urbanDef.agrarianIdyllHousing || 0;
    districtState.urban.slots.forEach((optionId) => {
      const option = primaryOption(optionId);
      if (option) perDistrict += option.housing || 0;
    });
    housing += divideEffect(perDistrict * count);
    housingSources.push({ kind: "district", district: "urban", count, amount: divideEffect(perDistrict * count) });
    addTechnologyHousing(urbanDef, count);
    Object.entries(urbanDef.upkeep).forEach(([resourceId, amount]) => addSignedResource(resourceId, districtUpkeep(resourceId, amount) * count, "districts"));
  }
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const def = secondaryDistrictDef(cat);
    const count = districtState[cat].count;
    if (count <= 0) return;
    let perDistrict = def.housing + (districtGestalt ? def.gestaltHousing || 0 : 0) + (agrarianIdyll ? def.agrarianIdyllHousing || 0 : 0);
    // P10.2: a secondary urban district loses the housing of its specialization (×3 on an Ecumenopolis).
    if (def.secondaryUrban) {
      const option = secondaryOption(cat, districtState[cat].optionId);
      if (option) perDistrict += (option.housing || 0) * secondaryHousingPenaltyMultiplier();
    }
    housing += divideEffect(perDistrict * count);
    housingSources.push({ kind: "district", district: cat, count, amount: divideEffect(perDistrict * count) });
    addTechnologyHousing(def, count);
    Object.entries(def.upkeep).forEach(([resourceId, amount]) => addSignedResource(resourceId, districtUpkeep(resourceId, amount) * count, "districts"));
  });

  // Distritos de recursos básicos: empleo base por copia, y bonus de la
  // especialización elegida (si hay una) por copia.
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const state = districtState[cat];
    const def = secondaryDistrictDef(cat);
    if (state.count > 0) {
      Object.entries(districtBaseJobs(def)).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * state.count));
      const option = secondaryOption(cat, state.optionId);
      if (option) {
        Object.entries(specializationJobs(option)).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * jobMultiplier * state.count));
      }
    }
  });

  // Distrito urbano: construirlo no aporta nada por sí mismo. Cada una de
  // sus 2 ranuras de especialización que tenga una especialización elegida
  // aporta sus empleos, multiplicados por el número de copias construidas.
  if (districtState.urban.count > 0) {
    // P10.2: base jobs of the body's own primary district (Residential Arcology: Clerks / Logistic Drones).
    Object.entries(districtBaseJobs(urbanDef)).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * districtState.urban.count));
    districtState.urban.slots.forEach((optionId) => {
      const option = primaryOption(optionId);
      if (!option) return;
      Object.entries(specializationJobs(option)).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * jobMultiplier * districtState.urban.count));
    });
  }

  // Edificios normales, solo los que caen en una ranura actualmente activa.
  // Además, cada edificio puede traer bonos por tipo de empleo que se aplican
  // a TODOS los empleos de ese tipo del planeta (no solo a los que da el
  // propio edificio): "jobModifiers" (recursos por empleo), "jobEfficiency" y
  // "jobUpkeepMult". Solo los traen edificios con límite de colonia 1 (ver
  // planet-data.js), así que no se acumulan.
  const jobBonuses = {}; // jobId -> { resourceId: cantidad por empleo }
  const jobResourceMult = {}; // resourceId -> fracción extra sobre lo producido por empleos (P7.8)
  const ruleCtx = requirementContext();
  const addJobModifiers = (modifiersByJob) => {
    Object.entries(modifiersByJob).forEach(([jobId, modifiers]) => {
      jobBonuses[jobId] = jobBonuses[jobId] || {};
      Object.entries(modifiers).forEach(([resourceId, amount]) => {
        jobBonuses[jobId][resourceId] = (jobBonuses[jobId][resourceId] || 0) + amount;
      });
    });
  };
  // P10.5: Synaptic Lathe buildings — stability points, "% resources from jobs" (applied after the job output) and
  // resources per 100 Neural Chips.
  let buildingStability = 0;
  const buildingJobResourcePcts = []; // [{ pcts, source }]
  const buildingChipPops = isLatheLayout() ? divideEffect(neuralChipsRaw) : 0;
  // Un edificio inactivo (requisitos perdidos, o la especialización de su ranura ya no lo permite) no cuenta.
  activeBuildings.forEach(([, building]) => {
    const id = building.id;
    Object.entries(building.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw));
    const buildingSource = { kind: "building", id: building.id };
    if (building.stability) {
      buildingStability += building.stability;
      pushModifier(buildingSource, "conditionFlat", { stat: "stability" }, building.stability);
    }
    if (building.jobResourcePct) buildingJobResourcePcts.push({ pcts: building.jobResourcePct, source: buildingSource });
    Object.entries(building.perNeuralChips || {}).forEach(([key, per]) => {
      if (!buildingChipPops) return;
      if (key === "jobResourcePct") {
        buildingJobResourcePcts.push({ pcts: { all: per * buildingChipPops }, source: buildingSource });
        return;
      }
      const resourceIds = key === "research" ? ["physics", "society", "engineering"] : [key];
      resourceIds.forEach((resourceId) => addSignedResource(resourceId, per * buildingChipPops, "buildingFlat"));
    });
    const noteJobModifiers = (modifiersByJob) => Object.entries(modifiersByJob).forEach(([jobId, modifiers]) => {
      Object.entries(modifiers).forEach(([resourceId, amount]) => pushModifier(buildingSource, "jobFlat", { job: jobId, resource: resourceId }, amount));
    });
    addJobModifiers(building.jobModifiers || {});
    noteJobModifiers(building.jobModifiers || {});
    // Bonos por empleo que dependen del imperio (civismo, autoridad, gestalt...): ver conditionalJobModifiers en planet-data.js.
    (building.conditionalJobModifiers || []).forEach((entry) => {
      if (!buildingRequirementsMet({ requires: entry.when }, ruleCtx)) return;
      addJobModifiers(entry.jobModifiers);
      noteJobModifiers(entry.jobModifiers);
    });
    Object.entries(building.jobResourceMult || {}).forEach(([resourceId, fraction]) => {
      jobResourceMult[resourceId] = (jobResourceMult[resourceId] || 0) + fraction;
      pushModifier(buildingSource, "jobResourceMult", { resource: resourceId }, fraction);
    });
    // Producción plana del propio edificio (p. ej. Centro de reprocesado de residuos).
    Object.entries(building.produces || {}).forEach(([resourceId, amount]) => addSignedResource(resourceId, amount, "buildingFlat"));
    Object.entries(building.jobEfficiency || {}).forEach(([jobId, fraction]) => {
      pushModifier(buildingSource, "jobEfficiency", { job: jobId }, fraction);
    });
    Object.entries(building.jobUpkeepMult || {}).forEach(([jobId, fraction]) => {
      pushModifier(buildingSource, "jobUpkeep", { job: jobId }, fraction);
    });
    housing += divideEffect(building.housing || 0);
    if (building.housing) {
      const found = housingSources.find((source) => source.kind === "building" && source.id === id);
      if (found) { found.count += 1; found.amount += divideEffect(building.housing); }
      else housingSources.push({ kind: "building", id, count: 1, amount: divideEffect(building.housing) });
    }
    amenities += divideEffect(building.amenities || 0);
    if (building.amenities) {
      const entry = amenityBuildings.get(id) || { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += divideEffect(building.amenities);
      amenityBuildings.set(id, entry);
    }
    Object.entries(building.upkeep || {}).forEach(([resourceId, amount]) => {
      addSignedResource(resourceId, amount * buildingUpkeepFactor, "buildings");
    });
  });

  // La población asignada a cada empleo (slider) se ajusta a la nueva
  // capacidad antes de calcular recursos: ver syncJobAssignments más abajo.
  syncJobAssignments(jobCapacities);

  // Los recursos se calculan a partir de la población REALMENTE asignada a
  // cada empleo (jobAssignments, en unidades ×100 igual que jobCapacities),
  // convertida a trabajos reales con divideEffect() justo aquí — la única
  // división por 100 de todo el cálculo. Si hay una designación planetaria
  // elegida, su eficacia laboral multiplica la salida de ESE empleo (ver
  // js/designation-data.js).
  const designation = getDesignation(selectedDesignationId);
  if (designation) {
    const designationSource = { kind: "designation", id: designation.id };
    Object.entries(designation.jobEfficiency || {}).forEach(([jobId, fraction]) => pushModifier(designationSource, "jobEfficiency", { job: jobId }, fraction));
    Object.entries(designation.flat || {}).forEach(([key, amount]) => pushModifier(designationSource, "flat", { stat: key }, amount));
    // P10.5: "Upkeep from Jobs" of the designation (Synaptic Lathe −5 %), on every job.
    if (designation.jobUpkeepPct) pushModifier(designationSource, "jobUpkeep", { job: "all" }, designation.jobUpkeepPct / 100);
  }
  // Efectos de éticas y autoridad que sí se aplican a los cálculos (los demás son solo informativos, ver empire-data.js).
  const empireModifierState = getPlanetState();
  const noteEmpireEffects = (kind, id, effects) => (effects || []).forEach((effect) => {
    if (!effect.apply) return;
    const { type, resource, stratum } = effect.apply;
    const source = { kind, id };
    if (type === "resourceMult") pushModifier(source, "resourceMult", { resource }, effect.value);
    else if (type === "resourceFlat") pushModifier(source, "resourceFlat", { resource }, effect.value);
    else if (type === "stratumEfficiency") pushModifier(source, "stratumEfficiency", { stratum }, effect.value);
  });
  (empireModifierState.ethicIds || []).forEach((id) => noteEmpireEffects("ethic", id, ETHIC_EFFECTS[id]));
  // Políticas del imperio (P16.6): política económica (% de lo que producen los empleos), política de producción (% por estrato) y postura (% mensual).
  // La conversión de comercio de la política comercial (P16.7) se anota aquí como modificador y se aplica más abajo.
  let tradePolicy = null; // { optionId, rates } de la política comercial elegida
  Object.entries(empireModifierState.policyIds || {}).forEach(([groupId, optionId]) => {
    const option = getPolicyOption(groupId, optionId);
    if (!option) return;
    const source = { kind: "policy", id: `${groupId}:${optionId}` };
    const policyEffects = option.effects || {};
    Object.entries(policyEffects.jobResourceMult || {}).forEach(([resourceId, fraction]) => {
      jobResourceMult[resourceId] = (jobResourceMult[resourceId] || 0) + fraction;
      pushModifier(source, "jobResourceMult", { resource: resourceId }, fraction);
    });
    Object.entries(policyEffects.stratumOutput || {}).forEach(([stratum, fraction]) => pushModifier(source, "stratumOutput", { stratum }, fraction));
    Object.entries(policyEffects.resourceMult || {}).forEach(([resourceId, fraction]) => pushModifier(source, "resourceMult", { resource: resourceId }, fraction));
    if (policyEffects.tradeConversion) {
      tradePolicy = { optionId, rates: policyEffects.tradeConversion };
      Object.entries(policyEffects.tradeConversion).forEach(([resourceId, rate]) => pushModifier(source, "tradeConversion", { resource: resourceId }, rate));
    }
  });
  noteEmpireEffects("authority", empireModifierState.authorityId, AUTHORITY_EFFECTS[empireModifierState.authorityId]);
  // P18.4: edictos activos del imperio (js/edict-data.js). Eficacia, mantenimiento y % mensual van a las categorías de siempre;
  // los recursos por empleo y por civil se suman aparte (línea propia del desglose) y los puntos de felicidad, estabilidad y
  // delincuencia entran en las condiciones (categoría conditionFlat).
  const edictJobFlat = {}; // jobId -> { resourceId: cantidad por empleo }
  const edictCivilianFlat = {}; // resourceId -> cantidad por civil
  const edictConditions = { happiness: 0, stability: 0, crime: 0 };
  (empireModifierState.edictIds || []).forEach((edictId) => {
    const edict = getEdict(edictId);
    if (!edict) return;
    const source = { kind: "edict", id: edict.id };
    const effects = edict.effects || {};
    Object.entries(effects.jobEfficiency || {}).forEach(([jobId, fraction]) => pushModifier(source, "jobEfficiency", { job: jobId }, fraction));
    Object.entries(effects.stratumEfficiency || {}).forEach(([stratum, fraction]) => pushModifier(source, "stratumEfficiency", { stratum }, fraction));
    Object.entries(effects.jobUpkeep || {}).forEach(([jobId, fraction]) => pushModifier(source, "jobUpkeep", { job: jobId }, fraction));
    Object.entries(effects.resourceMult || {}).forEach(([resourceId, fraction]) => pushModifier(source, "resourceMult", { resource: resourceId }, fraction));
    Object.entries(effects.jobFlat || {}).forEach(([jobId, perJob]) => Object.entries(perJob).forEach(([resourceId, amount]) => {
      edictJobFlat[jobId] = edictJobFlat[jobId] || {};
      edictJobFlat[jobId][resourceId] = (edictJobFlat[jobId][resourceId] || 0) + amount;
      pushModifier(source, "jobFlat", { job: jobId, resource: resourceId }, amount);
    }));
    Object.entries(effects.civilianFlat || {}).forEach(([resourceId, amount]) => {
      edictCivilianFlat[resourceId] = (edictCivilianFlat[resourceId] || 0) + amount;
      pushModifier(source, "jobFlat", { job: "civilian", resource: resourceId }, amount);
    });
    Object.entries(effects.conditions || {}).forEach(([stat, value]) => {
      edictConditions[stat] += value;
      pushModifier(source, "conditionFlat", { stat }, value);
    });
  });
  // P10.8: planet modifiers — stratum output / job efficiency, job upkeep and condition points.
  const planetModifierConditions = { happiness: 0, stability: 0, crime: 0 };
  const modifierEmpireKey = ethicsSatisfy(empireModifierState.ethicIds || [], GESTALT_CONSCIOUSNESS.id) ? "gestalt" : "individualist";
  activePlanetModifiers().forEach((modifier) => {
    const source = { kind: "planetModifier", id: modifier.id };
    const effects = modifier.effects;
    Object.entries(effects.stratumOutput || {}).forEach(([stratum, pct]) => pushModifier(source, "stratumOutput", { stratum }, pct / 100));
    Object.entries(effects.stratumEfficiency || {}).forEach(([stratum, pct]) => pushModifier(source, "stratumEfficiency", { stratum }, pct / 100));
    if (effects.jobUpkeepPct) pushModifier(source, "jobUpkeep", { job: "all" }, effects.jobUpkeepPct / 100);
    [effects.conditions || {}, effects.conditionsByEmpire?.[modifierEmpireKey] || {}].forEach((stats) => Object.entries(stats).forEach(([stat, value]) => {
      planetModifierConditions[stat] += value;
      pushModifier(source, "conditionFlat", { stat }, value);
    }));
  });
  // Salida por empleo = base (JOB_OUTPUTS) + bonos de edificios; la eficacia
  // de la designación multiplica solo la parte positiva (la wiki la define
  // sobre la producción, no sobre el mantenimiento).
  const jobUnitOutputs = {};
  const jobProduced = {}; // resourceId -> producción positiva procedente de empleos (para jobResourceMult)
  const empireState = getPlanetState();
  // Reglas de apilado de la versión de datos (P8.3) y valores de modificador por categoría, tomados de la lista de modificadores activos.
  const stacking = getStackingRules(empireState.rulesetId);
  const modifierValues = (category, target) => [...modifierMap.values()]
    .filter((modifier) => modifier.category === category && Object.entries(target).every(([field, value]) => modifier[field] === value))
    .map((modifier) => modifier.value);
  const gestaltEmpire = ethicsSatisfy(empireState.ethicIds || [], GESTALT_CONSCIOUSNESS.id);
  const allowedSpecies = allowedSpeciesTypes(empireState.authorityId);
  const speciesType = SPECIES_TYPES.find((type) => type.id === empireState.speciesType && allowedSpecies.includes(type.id))
    || SPECIES_TYPES.find((type) => type.id === allowedSpecies[0]);
  // P10.6: staffed pops of the jobs producing each resource (base output > 0), for JOB_WORKFORCE_SCALING.
  const producerPops = {};
  Object.keys(jobCapacities).forEach((jobId) => {
    const staffed = divideEffect(jobAssignments[jobId] || 0);
    Object.entries(JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, amount]) => {
      if (amount > 0 && staffed) producerPops[resourceId] = (producerPops[resourceId] || 0) + staffed;
    });
  });
  const workforceScalingBonus = (jobId) => {
    const scaling = JOB_WORKFORCE_SCALING[jobId];
    if (!scaling) return {};
    const bonus = {};
    Object.entries(scaling.outputs).forEach(([producedId, outputId]) => {
      const amount = Math.min(scaling.max, scaling.perPop * (producerPops[producedId] || 0));
      if (amount) bonus[outputId] = (bonus[outputId] || 0) + amount;
    });
    return bonus;
  };
  const featureBonuses = featureJobBonuses();
  Object.keys(jobCapacities).forEach((jobId) => {
    const unit = { ...(JOB_OUTPUTS[jobId] || {}) };
    // Conciencia gestalt: el mantenimiento en bienes de consumo se sustituye por el
    // del recurso que consume la especie elegida (ver GESTALT_JOB_UPKEEP).
    const gestaltUpkeep = gestaltEmpire ? GESTALT_JOB_UPKEEP[jobId] : null;
    if (gestaltUpkeep?.fixed) {
      // P10.6: gestalt upkeep in a fixed resource whatever the species (Pyroclastic Drone: −7 minerals).
      delete unit.consumer_goods;
      Object.entries(gestaltUpkeep.fixed).forEach(([resourceId, amount]) => { unit[resourceId] = (unit[resourceId] || 0) - amount; });
    } else if (gestaltUpkeep) {
      delete unit.consumer_goods;
      const isMachine = speciesType.id === "machine";
      unit[speciesType.upkeepResource] = (unit[speciesType.upkeepResource] || 0) - (isMachine ? gestaltUpkeep.machine : gestaltUpkeep.hive);
    }
    // Colonista (Refugio Colonial, P7.5): +1 del recurso propio de la especie (orgánica comida, litoide minerales, infernal aleaciones, máquina energía).
    if (jobId === "colonist") unit[speciesType.upkeepResource] = (unit[speciesType.upkeepResource] || 0) + 1;
    const baseUnit = { ...unit };
    Object.entries(jobBonuses[jobId] || {}).forEach(([resourceId, amount]) => {
      unit[resourceId] = (unit[resourceId] || 0) + amount;
    });
    const buildingUnit = { ...unit };
    // P10.6: per-job bonuses scaling with the workforce of other jobs (Thermotechnic Mentor), own breakdown line.
    Object.entries(workforceScalingBonus(jobId)).forEach(([resourceId, amount]) => {
      unit[resourceId] = (unit[resourceId] || 0) + amount;
      pushModifier({ kind: "job", id: jobId }, "jobFlat", { job: jobId, resource: resourceId }, amount);
    });
    // P10.8: strategic deposits and Betharian Processing, per staffed job of their job category (same breakdown line).
    featureBonuses.forEach((bonus) => {
      if (!bonus.jobs.includes(jobId)) return;
      unit[bonus.resource] = (unit[bonus.resource] || 0) + bonus.perJob;
      pushModifier(bonus.source, "jobFlat", { job: jobId, resource: bonus.resource }, bonus.perJob);
    });
    const scaledUnit = { ...unit };
    Object.entries(edictJobFlat[jobId] || {}).forEach(([resourceId, amount]) => {
      unit[resourceId] = (unit[resourceId] || 0) + amount;
    });
    const bonusedUnit = { ...unit };
    // Eficacia laboral (designación + edificios): puede ser positiva o negativa
    // (+10%, -5%...) y solo afecta a la producción. El cambio de mantenimiento
    // (p. ej. -10% de mantenimiento) solo afecta al mantenimiento.
    // La eficacia de designación, edificios y estrato forma un solo montón (ver stacking-rules.js).
    const efficiencyFactor = stackFactor(stacking.jobEfficiency, [
      ...modifierValues("jobEfficiency", { job: jobId }),
      ...modifierValues("stratumEfficiency", { stratum: JOBS[jobId]?.stratum }),
      ...modifierValues("stratumOutput", { stratum: JOBS[jobId]?.stratum })
    ]);
    const upkeepFactor = stackFactor(stacking.jobUpkeep, [...modifierValues("jobUpkeep", { job: jobId }), ...modifierValues("jobUpkeep", { job: "all" })]);
    Object.keys(unit).forEach((resourceId) => {
      if (unit[resourceId] > 0) unit[resourceId] *= efficiencyFactor;
      else if (unit[resourceId] < 0) unit[resourceId] *= upkeepFactor;
    });
    jobUnitOutputs[jobId] = unit;

    const assignedRaw = jobAssignments[jobId] || 0;
    const assigned = divideEffect(assignedRaw);
    Object.entries(unit).forEach(([resourceId, perJob]) => {
      addSignedResource(resourceId, perJob * assigned);
      recordBreakdown(resourceId, "jobsBase", (baseUnit[resourceId] || 0) * assigned);
      recordBreakdown(resourceId, "jobsBonus", ((buildingUnit[resourceId] || 0) - (baseUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "jobWorkforceScaling", ((scaledUnit[resourceId] || 0) - (buildingUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "edictJobFlat", ((bonusedUnit[resourceId] || 0) - (scaledUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "jobsModifier", (perJob - (bonusedUnit[resourceId] || 0)) * assigned);
      if (perJob > 0) jobProduced[resourceId] = (jobProduced[resourceId] || 0) + perJob * assigned;
    });
    if (unit.amenities && assigned) {
      amenitySources.push({ kind: "job", jobId, assignedRaw, amount: unit.amenities * assigned });
    }
  });

  // P10.5: Neural Chips (Synaptic Lathe: all pops, manual count ×100). Job output ×(total chips / 2000) and upkeep
  // ×(total chips / 4000) per chip job (100 chips); their output is job output (it gets the "% from jobs" below). The Lathe
  // districts add per 100 chips per copy (Neural Gate "Research" read as each of the three research types).
  const neuralChipPops = isLatheLayout() ? divideEffect(neuralChipsRaw) : 0;
  if (neuralChipPops > 0) {
    const chip = SPECIAL_BODY_JOBS.neural_chip;
    Object.entries(chip.outputs).forEach(([resourceId, perJob]) => {
      const amount = perJob * neuralChipPops * (neuralChipsRaw / chip.scaling.output);
      addSignedResource(resourceId, amount, "neuralChips");
      jobProduced[resourceId] = (jobProduced[resourceId] || 0) + amount;
    });
    // Job upkeep modifiers (designation, buildings) apply to the chip jobs too.
    const chipUpkeepFactor = stackFactor(stacking.jobUpkeep, [...modifierValues("jobUpkeep", { job: "neural_chip" }), ...modifierValues("jobUpkeep", { job: "all" })]);
    Object.entries(chip.upkeep).forEach(([resourceId, perJob]) => {
      addSignedResource(resourceId, perJob * neuralChipPops * (neuralChipsRaw / chip.scaling.upkeep) * chipUpkeepFactor, "neuralChips");
    });
    const latheCounts = { [bodyRules().latheDistricts[0]]: districtState.urban.count, [bodyRules().latheDistricts[1]]: districtState[RESOURCE_DISTRICT_ORDER[0]].count };
    Object.entries(latheCounts).forEach(([districtId, count]) => {
      if (!count) return;
      Object.entries(SPECIAL_DISTRICTS[districtId].perNeuralChips || {}).forEach(([key, per]) => {
        const resourceIds = key === "research" ? ["physics", "society", "engineering"] : [key];
        resourceIds.forEach((resourceId) => addSignedResource(resourceId, per * neuralChipPops * count, "districts"));
      });
    });
  }

  // P10.2: "+X% resources from jobs" of the body type (Ecumenopolis +20 %) and per staffed job (Clerk +1 % trade).
  // Only resources that jobs actually produce get a modifier, so the panel lists what applies.
  // P10.5: the same for the designation (Synaptic Lathe +15 %).
  const bodyType = bodyRules();
  const addJobResourcePct = (pcts, source) => Object.entries(pcts || {}).forEach(([key, pct]) => {
    const resourceIds = key === "all" ? Object.keys(jobProduced).filter((id) => id !== "amenities") : [key];
    resourceIds.forEach((resourceId) => {
      if (!(jobProduced[resourceId] > 0)) return;
      jobResourceMult[resourceId] = (jobResourceMult[resourceId] || 0) + pct / 100;
      pushModifier(source, "jobResourceMult", { resource: resourceId }, pct / 100);
    });
  });
  addJobResourcePct(bodyType?.jobResourcePct, { kind: "celestial", id: empireState.celestialTypeId });
  if (designation) addJobResourcePct(designation.jobResourcePct, { kind: "designation", id: designation.id });
  activePlanetModifiers().forEach((modifier) => addJobResourcePct(modifier.effects.jobResourcePct, { kind: "planetModifier", id: modifier.id }));
  // P10.6: planet effects of the chosen primary specializations (Central Spire +15 % research), once per option.
  if (districtState.urban.count > 0) {
    new Set(districtState.urban.slots.filter(Boolean)).forEach((optionId) => {
      const option = primaryOption(optionId);
      if (option?.jobResourcePct) addJobResourcePct(option.jobResourcePct, { kind: "specialization", id: option.id });
    });
  }
  buildingJobResourcePcts.forEach(({ pcts, source }) => addJobResourcePct(pcts, source));
  Object.entries(JOB_RESOURCE_MULT).forEach(([jobId, perJob]) => {
    const staffed = divideEffect(jobAssignments[jobId] || 0);
    if (!staffed) return;
    Object.entries(perJob).forEach(([resourceId, fraction]) => {
      jobResourceMult[resourceId] = (jobResourceMult[resourceId] || 0) + fraction * staffed;
      pushModifier({ kind: "job", id: jobId }, "jobResourceMult", { resource: resourceId }, fraction * staffed);
    });
  });

  // "+X % de recurso de los empleos" de edificios (Refinería Antigua, Monumentos): solo sobre lo que producen los empleos.
  Object.keys(jobResourceMult).forEach((resourceId) => {
    const fromJobs = jobProduced[resourceId] || 0;
    const entries = [...modifierMap.values()].filter((modifier) => modifier.category === "jobResourceMult" && modifier.resource === resourceId);
    const fraction = combineFraction(stacking.jobResourceMult, entries.map((modifier) => modifier.value));
    if (fromJobs <= 0) return;
    // En el desglose se separa la parte de las políticas de la de los edificios (con la regla de suma, la parte de cada uno es su propio valor).
    const kindFraction = (kind) => (stacking.jobResourceMult.combine === "add"
      ? entries.filter((modifier) => modifier.source.kind === kind).reduce((sum, modifier) => sum + modifier.value, 0)
      : 0);
    const policyFraction = kindFraction("policy");
    const celestialFraction = kindFraction("celestial");
    const jobFraction = kindFraction("job");
    const designationFraction = kindFraction("designation");
    const specializationFraction = kindFraction("specialization");
    const planetModifierFraction = kindFraction("planetModifier");
    addSignedResource(resourceId, fromJobs * (fraction - policyFraction - celestialFraction - jobFraction - designationFraction - specializationFraction - planetModifierFraction), "jobBuildingMult");
    if (planetModifierFraction) addSignedResource(resourceId, fromJobs * planetModifierFraction, "planetModifierJobMult");
    if (specializationFraction) addSignedResource(resourceId, fromJobs * specializationFraction, "specializationJobMult");
    if (designationFraction) addSignedResource(resourceId, fromJobs * designationFraction, "designationJobMult");
    if (policyFraction) addSignedResource(resourceId, fromJobs * policyFraction, "policyJobMult");
    if (celestialFraction) addSignedResource(resourceId, fromJobs * celestialFraction, "celestialJobMult");
    if (jobFraction) addSignedResource(resourceId, fromJobs * jobFraction, "jobJobMult");
  });

  // P16.12: civiles (pops sin empleo, entrada manual ×100). Producen servicios y comercio (CIVILIAN_OUTPUTS) como un empleo
  // más: su comercio entra en el efecto de la estabilidad y en la conversión de comercio; no reciben eficacia de estrato
  // ni el % de los empleos de edificios y políticas.
  const civilianDef = CIVILIAN_OUTPUTS[gestaltEmpire ? "gestalt" : "individualist"];
  const civilianPops = isLatheLayout() ? 0 : divideEffect(civiliansRaw); // P10.5: every Lathe pop is a Neural Chip
  if (civilianPops > 0) {
    Object.entries(civilianDef.output).forEach(([resourceId, perPop]) => {
      const amount = perPop * civilianPops;
      addSignedResource(resourceId, amount, "civilians");
      jobProduced[resourceId] = (jobProduced[resourceId] || 0) + amount;
    });
    // P18.4: edictos con recursos por civil (Refuerzo sináptico / Mantenimiento industrial: +1 comercio por dron de mantenimiento).
    Object.entries(edictCivilianFlat).forEach(([resourceId, perPop]) => {
      const amount = perPop * civilianPops;
      addSignedResource(resourceId, amount, "edictJobFlat");
      if (amount > 0) jobProduced[resourceId] = (jobProduced[resourceId] || 0) + amount;
    });
    if (civilianDef.output.amenities) amenitySources.push({ kind: "civilians", i18nKey: civilianDef.i18nKey, assignedRaw: civiliansRaw, amount: civilianDef.output.amenities * civilianPops });
  }

  // P9.1: pops (1 por empleo cubierto), vivienda y servicios (wiki 4.5.2, Colony management). Todo en unidades reales;
  // al mostrarse se multiplica por EFFECT_SCALE. Redondeos de la wiki: servicios de edificios al entero más cercano,
  // servicios de empleos hacia abajo, uso de servicios al entero más cercano. Los modificadores de uso de servicios
  // (especie, colonia, imperio) no se modelan: cada pop usa 1.
  const jobPops = Object.values(jobAssignments).reduce((sum, raw) => sum + divideEffect(raw), 0);
  const pops = jobPops + civilianPops + neuralChipPops;
  // P9.4: las condiciones se calculan antes del paso 4a (efecto de la estabilidad), así que se suman aquí los servicios y la
  // vivienda planos de la designación, que el paso 5 añade después a los totales (mismo resultado que calcularlas al final).
  // P10.8: amenities of the active blockers (Blazing Scourge with Fire Cult) and housing / amenities of the planet modifiers
  // (flat ×100 as on the wiki, then % of the planet's housing / amenities), before the conditions.
  activeBlockers().forEach((blocker) => {
    if (!blocker.amenities) return;
    const amount = divideEffect(blocker.amenities);
    amenities += amount;
    amenitySources.push({ kind: "blocker", id: blocker.id, amount });
  });
  const designationHousingPre = designation ? (designation.flat.housing || 0) : 0;
  const designationAmenitiesPre = designation ? (designation.flat.amenities || 0) : 0;
  let modifierHousingUsagePct = 0;
  activePlanetModifiers().forEach((modifier) => {
    const effects = modifier.effects;
    modifierHousingUsagePct += effects.popHousingUsagePct || 0;
    const housingAmount = divideEffect(effects.flat?.housing || 0) + ((effects.pct?.housing || 0) / 100) * (housing + designationHousingPre);
    const amenityAmount = divideEffect(effects.flat?.amenities || 0) + ((effects.pct?.amenities || 0) / 100) * (amenities + (resourceTotals.amenities || 0) + designationAmenitiesPre);
    if (housingAmount) { housing += housingAmount; housingSources.push({ kind: "planetModifier", id: modifier.id, amount: housingAmount }); }
    if (amenityAmount) { amenities += amenityAmount; amenitySources.push({ kind: "planetModifier", id: modifier.id, amount: amenityAmount }); }
  });
  const designationHousing = designationHousingPre;
  const designationAmenities = designationAmenitiesPre;
  const conditionsHousing = housing + designationHousing;
  // P10.5: pop housing usage of the body (Machine World −10 %): housing needed = pops × (1 + pct/100).
  // P10.5: plus the designation's (Synaptic Lathe −10 %).
  const housingUsagePct = (bodyRules()?.popHousingUsagePct || 0) + (designation?.popHousingUsagePct || 0) + modifierHousingUsagePct;
  const housingUsage = pops * (1 + housingUsagePct / 100);
  const amenitiesFromBuildings = Math.round(amenities);
  const amenitiesFromJobs = Math.floor((resourceTotals.amenities || 0) + designationAmenities + 1e-9);
  const amenitiesProvided = amenitiesFromBuildings + amenitiesFromJobs;
  const amenitiesUsage = Math.round(pops);
  // P9.2: efecto de los servicios (wiki 4.5.2: bono máx. +20, penalización máx. −50). Se interpreta el "%" de la wiki como
  // puntos, porque felicidad y estabilidad van de 0 a 100. En un imperio normal actúa sobre la felicidad (P9.2) y en uno
  // gestalt directamente sobre la estabilidad (P9.6). Sin pops no hay nada que medir.
  const amenitiesAvailable = amenitiesProvided - (AMENITIES_LOST + amenitiesUsage);
  const amenitiesEffect = { mode: "none", raw: 0, effect: 0 };
  if (pops > 0 && amenitiesUsage > 0) {
    if (amenitiesAvailable > 0) {
      amenitiesEffect.mode = "bonus";
      amenitiesEffect.raw = (20 * amenitiesAvailable) / amenitiesUsage;
      amenitiesEffect.effect = Math.min(20, amenitiesEffect.raw);
    } else if (amenitiesAvailable < 0) {
      amenitiesEffect.mode = "penalty";
      amenitiesEffect.raw = ((200 / 3) * amenitiesAvailable) / amenitiesUsage;
      amenitiesEffect.effect = Math.max(-50, amenitiesEffect.raw);
    }
  }
  // P10.6: happiness of the body type (Gaia "+10% Happiness", treated as points like the edicts); no happiness in gestalt.
  const bodyHappiness = gestaltEmpire ? 0 : bodyRules()?.happinessPct || 0;
  if (bodyHappiness) pushModifier({ kind: "celestial", id: getPlanetState().celestialTypeId }, "conditionFlat", { stat: "happiness" }, bodyHappiness);
  const happiness = { applicable: !gestaltEmpire && pops > 0, base: HAPPINESS_BASE, ...amenitiesEffect, manual: gestaltEmpire ? 0 : manualConditions.happiness, edicts: gestaltEmpire ? 0 : edictConditions.happiness, body: bodyHappiness, planetModifiers: gestaltEmpire ? 0 : planetModifierConditions.happiness, value: HAPPINESS_BASE };
  if (happiness.applicable) happiness.value = Math.max(0, Math.min(100, HAPPINESS_BASE + amenitiesEffect.effect + happiness.edicts + happiness.body + happiness.planetModifiers + happiness.manual));
  // P9.3 / P9.6: estabilidad automática. Base 50 + (no gestalt) bono de aprobación o (gestalt) efecto de servicios − penalización
  // por vivienda faltante (40 · faltante / necesaria). Aprobación = felicidad (todos los pops son del mismo estrato y tienen la
  // misma felicidad); la wiki redondea hacia abajo la aprobación mostrada y el bono de estabilidad.
  // Estabilidad de los empleos (JOB_EFFECTS.stability × empleos cubiertos, igual que las píldoras de "otros efectos"). Es un
  // modificador, no un recurso: no recibe el efecto de la estabilidad (paso 4a) ni la eficacia de los empleos.
  const stabilityFromJobs = Object.entries(JOB_EFFECTS).reduce((sum, [jobId, effects]) => sum + (effects.stability || 0) * divideEffect(jobAssignments[jobId] || 0), 0);
  const stability = { applicable: pops > 0, gestalt: gestaltEmpire, base: STABILITY_BASE, approval: 0, approvalBonus: 0, amenitiesEffect: 0, jobs: stabilityFromJobs, edicts: edictConditions.stability, planetModifiers: planetModifierConditions.stability, capital: capital.stability || 0, buildings: buildingStability, housingPenalty: 0, manual: manualConditions.stability, value: STABILITY_BASE };
  if (stability.applicable) {
    if (gestaltEmpire) {
      stability.amenitiesEffect = amenitiesEffect.effect;
    } else {
      stability.approval = Math.floor(happiness.value);
      const delta = stability.approval - 50;
      stability.approvalBonus = delta >= 0 ? Math.floor(0.6 * delta + 1e-9) : delta;
    }
    stability.housingPenalty = housingUsage > 0 ? (40 * Math.max(0, housingUsage - conditionsHousing)) / housingUsage : 0;
    stability.value = Math.max(0, Math.min(100, STABILITY_BASE + stability.approvalBonus + stability.amenitiesEffect + stability.jobs + stability.edicts + stability.planetModifiers + stability.capital + stability.buildings + stability.manual - stability.housingPenalty));
  }
  // P9.5: delincuencia por baja felicidad (wiki 4.5.2, Colony management: cada pop produce de 0 con 100 de felicidad a +2 con 0,
  // es decir 0,02 por pop y punto por debajo de 100). Gestalt: se llama desviación y, sin felicidad, no se modela la de los pops.
  // Solo se muestra: no cambia la estabilidad (GDD §9). Las reducciones de los empleos (agentes de la ley, educadores...) se
  // suman aparte con los empleos cubiertos; el total no baja de 0.
  const crimeFromHappiness = happiness.applicable ? pops * 0.02 * (100 - happiness.value) : 0;
  const crimeFromJobs = Object.entries(JOB_EFFECTS).reduce((sum, [jobId, effects]) => sum + (effects.crime || 0) * divideEffect(jobAssignments[jobId] || 0), 0);
  const crimeFromEdicts = pops > 0 ? edictConditions.crime : 0;
  const crimeFromModifiers = pops > 0 ? planetModifierConditions.crime : 0;
  const crime = { gestalt: gestaltEmpire, fromHappiness: crimeFromHappiness, fromJobs: crimeFromJobs, fromEdicts: crimeFromEdicts, fromModifiers: crimeFromModifiers, total: Math.max(0, crimeFromHappiness + crimeFromJobs + crimeFromEdicts + crimeFromModifiers) };
  const conditions = {
    happiness,
    stability,
    crime,
    amenitiesEffect,
    pops,
    housingProvided: conditionsHousing,
    housingUsage,
    housingUsagePct,
    housingMissing: Math.max(0, housingUsage - conditionsHousing),
    amenitiesFromBuildings,
    amenitiesFromJobs,
    amenitiesProvided,
    amenitiesLost: AMENITIES_LOST,
    amenitiesUsage,
    amenitiesAvailable,
    civilians: civilianPops,
    neuralChips: neuralChipPops,
    lathe: isLatheLayout(),
    civilianI18nKey: civilianDef.i18nKey
  };


  // P9.4: efecto de la estabilidad (GDD §6), paso propio 4a. +0,6 % por punto por encima de 50 y −1 % por punto por debajo,
  // solo sobre los recursos que producen los empleos (tras los pasos 1–4). No afecta a los servicios (son un modificador) ni a
  // los modificadores planetarios. Se usa el valor de estabilidad sin redondear. Va antes de la conversión de comercio, así
  // que el comercio de los empleos se convierte ya con el efecto aplicado.
  const stabilityFraction = stability.applicable
    ? (stability.value >= 50 ? 0.006 * (stability.value - 50) : -0.01 * (50 - stability.value))
    : 0;
  if (stabilityFraction) {
    pushModifier({ kind: "stability", id: "stability" }, "stabilityEffect", {}, stabilityFraction);
    Object.keys(jobProduced).forEach((resourceId) => {
      if (resourceId === "amenities") return;
      const amount = jobProduced[resourceId] * stabilityFraction;
      if (Math.abs(amount) < 1e-12) return;
      // Cambia lo producido (no es un coste): se suma a producidos y netos, como la conversión de comercio.
      producedTotals[resourceId] = (producedTotals[resourceId] || 0) + amount;
      resourceTotals[resourceId] = (resourceTotals[resourceId] || 0) + amount;
      recordBreakdown(resourceId, "stabilityEffect", amount);
      jobProduced[resourceId] += amount;
    });
  }
  conditions.stabilityEffect = stabilityFraction;

  // Conversión de comercio (P16.7 = P8.5): el comercio que producen los empleos (tras la eficacia y antes de los multiplicadores
  // porcentuales del imperio) se reparte según las tasas de cambio de la política comercial. La parte no conservada sale de
  // producidos/netos y cada recurso destino recibe su parte (que después recibe los multiplicadores como cualquier producción).
  let tradeConversion = null;
  const tradeFromJobs = jobProduced.trade || 0;
  if (tradePolicy && tradeFromJobs > 0) {
    const kept = tradePolicy.rates.trade ?? 0;
    const lost = tradeFromJobs * (1 - kept);
    if (Math.abs(lost) > 1e-9) {
      producedTotals.trade = (producedTotals.trade || 0) - lost;
      resourceTotals.trade = (resourceTotals.trade || 0) - lost;
      recordBreakdown("trade", "tradeConversion", -lost);
    }
    Object.entries(tradePolicy.rates).forEach(([resourceId, rate]) => {
      if (resourceId === "trade" || !rate) return;
      addSignedResource(resourceId, tradeFromJobs * rate, "tradeConversion");
    });
    tradeConversion = { optionId: tradePolicy.optionId, rates: tradePolicy.rates, amount: tradeFromJobs };
  }

  // P10.8: flat output of the active blockers (Blazing Scourge, Nanite Harvest Basin...); their amenities are counted before the conditions.
  activeBlockers().forEach((blocker) => {
    Object.entries(blocker.flat || {}).forEach(([resourceId, amount]) => {
      addSignedResource(resourceId, amount, "blockers");
      pushModifier({ kind: "blocker", id: blocker.id }, "flat", { resource: resourceId }, amount);
    });
  });

  // Bonos planos de la designación planetaria a servicios/vivienda/unidad.
  if (designation) {
    Object.entries(designation.flat).forEach(([key, amount]) => {
      if (key === "housing") {
        housing += amount;
        if (amount) housingSources.push({ kind: "designation", amount });
      } else {
        addSignedResource(key, amount, "designation");
        if (key === "amenities" && amount) amenitySources.push({ kind: "designation", amount });
      }
    });
  }

  // Éticas y autoridad elegidas en la pestaña Imperio (ver empire-data.js):
  // multiplicadores a la producción positiva de un recurso y bonos planos.
  const empireResources = (category) => [...new Set([...modifierMap.values()].filter((modifier) => modifier.category === category).map((modifier) => modifier.resource))];
  empireResources("resourceMult").forEach((resourceId) => {
    const produced = producedTotals[resourceId] || 0;
    const fraction = combineFraction(stacking.resourceMult, modifierValues("resourceMult", { resource: resourceId }));
    if (produced > 0) addSignedResource(resourceId, produced * fraction, "empireMult");
  });
  // P8.4: los bonos planos mensuales de éticas/autoridad son ingresos del imperio, no producción de este planeta:
  // se calculan aparte y NO entran en producidos/consumidos/netos del planeta.
  const externalTotals = {};
  empireResources("resourceFlat").forEach((resourceId) => {
    const amount = combineFraction(stacking.resourceFlat, modifierValues("resourceFlat", { resource: resourceId }));
    if (amount) externalTotals[resourceId] = amount;
  });

  // Servicios totales = capital + edificios + empleos (+ designación): es lo que muestra la cabecera.
  amenityBuildings.forEach((entry, id) => amenitySources.splice(1, 0, { kind: "building", id, count: entry.count, amount: entry.amount }));
  const amenitiesTotal = amenities + (resourceTotals.amenities || 0);

  const inconsistencies = checkTotalsConsistency(resourceTotals, producedTotals, consumedTotals, breakdown);

  return { jobCapacities, jobUnitOutputs, resourceTotals, producedTotals, consumedTotals, breakdown, inconsistencies, conditions, tradeConversion, externalTotals, modifiers: [...modifierMap.values()], housing, housingSources, amenities, amenitiesTotal, amenitySources };
}

/**
 * P8.7: comprobación interna de coherencia. Para cada recurso, producidos + consumidos y la suma de las líneas del
 * desglose (bruto − costes) deben dar el neto de la columna "Netos". Devuelve la lista de recursos que no cuadran
 * ({ resourceId, net, produced, consumed, breakdownSum }); vacía si todo cuadra.
 */
const CONSISTENCY_TOLERANCE = 0.001;
/** Servicios que se pierden siempre en cada colonia por ineficiencias (wiki 4.5.2, Colony management). */
const AMENITIES_LOST = 5;
const HAPPINESS_BASE = 50;
const STABILITY_BASE = 50;
function checkTotalsConsistency(resourceTotals, producedTotals, consumedTotals, breakdown) {
  const ids = new Set([...Object.keys(resourceTotals), ...Object.keys(producedTotals), ...Object.keys(consumedTotals), ...Object.keys(breakdown)]);
  const problems = [];
  ids.forEach((resourceId) => {
    const net = resourceTotals[resourceId] || 0;
    const produced = producedTotals[resourceId] || 0;
    const consumed = consumedTotals[resourceId] || 0;
    const breakdownSum = Object.values(breakdown[resourceId] || {}).reduce((sum, amount) => sum + amount, 0);
    if (Math.abs(produced + consumed - net) > CONSISTENCY_TOLERANCE || Math.abs(breakdownSum - net) > CONSISTENCY_TOLERANCE) {
      problems.push({ resourceId, net, produced, consumed, breakdownSum });
    }
  });
  return problems;
}

/**
 * Población asignada a cada empleo (jobId -> pops trabajándolo, controlada
 * por el slider de ese empleo). Se guarda en la MISMA escala ×100 que
 * jobCapacities y que los datos de origen (planet-data.js) — no en
 * unidades reales — para que el slider (paso de 10) tenga margen real de
 * movimiento. Solo se convierte a unidades reales una vez, en
 * computeTotals(), al calcular los recursos que produce esa población.
 */
const jobAssignments = {};
// P9.7: felicidad y estabilidad extra introducidas a mano (fuentes no modeladas). Por defecto 0; se guardan con el planeta.
const manualConditions = { happiness: 0, stability: 0 };
// P16.12: civiles introducidos a mano, en unidades ×100 (100 = 1 pop), sin tope.
let civiliansRaw = 0;
// P10.5: Neural Chips of a Synaptic Lathe (all its pops), manual, ×100 like the civilians; saved with the planet.
let neuralChipsRaw = 0;
const MANUAL_CONDITION_LIMIT = 100;
// Última capacidad conocida de cada empleo, para saber si el valor actual
// "seguía" al máximo (sin tocar) o si el usuario lo cambió a mano.
const jobCapacityMemo = {};

/**
 * Sincroniza jobAssignments contra la capacidad actual de cada empleo.
 * Por defecto (empleo nuevo, o su valor coincidía con el máximo anterior)
 * el slider salta al nuevo máximo al añadir/quitar edificios. Si el valor
 * ya era distinto del máximo anterior, se respeta (solo se recorta hacia
 * abajo si ahora supera la nueva capacidad, reducida por ejemplo al
 * demoler un edificio).
 */
function syncJobAssignments(jobCapacities) {
  Object.entries(jobCapacities).forEach(([jobId, capacity]) => {
    const previousCapacity = jobCapacityMemo[jobId];
    const current = jobAssignments[jobId];
    if (current === undefined || (previousCapacity !== undefined && current === previousCapacity)) {
      jobAssignments[jobId] = capacity;
    } else if (current > capacity) {
      jobAssignments[jobId] = capacity;
    }
    jobCapacityMemo[jobId] = capacity;
  });

  Object.keys(jobAssignments).forEach((jobId) => {
    if (!(jobId in jobCapacities)) {
      delete jobAssignments[jobId];
      delete jobCapacityMemo[jobId];
    }
  });
}

/** Reconstruye las opciones del desplegable de designación (agrupadas por categoría y filtradas por el tipo de cuerpo celeste elegido), conservando la selección si sigue siendo válida. */
/** Texto corto de una regla de requisito incumplida ("Requiere ética: Espiritualista"...), para el desplegable de designaciones. */
/**
 * Text, tooltip and disabled state of a select option (specialization, designation): unmet requirements disable it;
 * requirements the simulator does not model never block, but are listed ("Requirement not modelled: ...").
 */
function requirementOptionLabel(name, item, ctx) {
  const unmet = unmetRequirements(item, ctx).map(describeUnmetRule).filter(Boolean);
  const unmodelled = unmodelledRequirements(item).map((rule) => t(currentLang, rule.i18nKey));
  const notes = [...unmet, ...(unmodelled.length ? [t(currentLang, "requirementUnmodelled") + unmodelled.join("; ")] : [])];
  return { text: notes.length ? `${name} — ${notes.join("; ")}` : name, title: notes.join("\n"), disabled: unmet.length > 0 };
}

/** Names a positive rule refers to (civics, celestial bodies, ethics, authorities), for combined rules (P10.10 "notAll"). */
function ruleSubjects(rule) {
  const names = (list) => list.join(", ");
  switch (rule.type) {
    case "civic": return names(rule.keys.map((key) => t(currentLang, key)));
    case "celestial": return names(rule.ids.map((id) => t(currentLang, PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "ethic": return names(rule.ids.map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey)));
    case "authority": return names(rule.ids.map((id) => t(currentLang, AUTHORITIES.find((a) => a.id === id).i18nKey)));
    default: return describeUnmetRule(rule);
  }
}

function describeUnmetRule(rule) {
  const names = (list) => list.join(", ");
  switch (rule.type) {
    case "notGestalt": return t(currentLang, "requirementNotGestalt");
    case "usesConsumerGoods": return t(currentLang, "requirementConsumerGoods");
    case "ethic": return t(currentLang, "requirementEthic") + names(rule.ids.map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey)));
    case "notEthic": return t(currentLang, "requirementNotEthic") + names(rule.ids.map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey)));
    case "authority": return t(currentLang, "requirementAuthority") + names(rule.ids.map((id) => t(currentLang, AUTHORITIES.find((a) => a.id === id).i18nKey)));
    case "civic": return t(currentLang, "requirementCivic") + names(rule.keys.map((key) => t(currentLang, key)));
    case "notCivic": return t(currentLang, "requirementNotCivic") + names(rule.keys.map((key) => t(currentLang, key)));
    case "celestial": return t(currentLang, "requirementCelestial") + names(rule.ids.map((id) => t(currentLang, PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "notCelestial": return t(currentLang, "requirementNotCelestial") + names(rule.ids.map((id) => t(currentLang, PLANET_TYPES.find((type) => type.id === id).i18nKey)));
    case "notSpecies": return t(currentLang, "requirementBiologicalSpecies");
    case "districtBuildable": return t(currentLang, "requirementDistrictBuildable") + districtDisplayName(rule.district);
    case "deposit": return t(currentLang, "requirementDeposit");
    case "notAll": return t(currentLang, "requirementNotAll") + rule.rules.map(ruleSubjects).join(" + ");
    case "notBlocker": return t(currentLang, "requirementNotBlocker") + rule.ids.map((id) => t(currentLang, BLOCKERS.find((blocker) => blocker.id === id).i18nKey)).join(", ");
    default: return "";
  }
}

/**
 * Reconstruye las opciones del desplegable de designación (agrupadas por categoría y
 * filtradas por el tipo de cuerpo celeste elegido). Las que no cumplen sus requisitos
 * (ética, autoridad, principios, tipo de especie... ver designation-data.js) salen
 * desactivadas con el motivo. Si la designación elegida deja de ser válida (por el
 * cuerpo celeste o por el imperio) se restablece a "sin designación" y se avisa; los
 * edificios se conservan (como en P5.4), solo se reinicia la designación.
 */
function renderDesignationSelect() {
  if (!designationSelect) return;
  const state = getPlanetState();
  const allowedCategories = allowedDesignationCategories(state.celestialTypeId);
  const ctx = requirementContext();
  const current = getDesignation(selectedDesignationId);
  if (current && (!allowedCategories.includes(current.category) || !designationAvailable(current, ctx))) {
    selectedDesignationId = "";
    updatePlanetState({ designationId: null });
    showNotice(t(currentLang, "planetSimDesignationResetNotice")(t(currentLang, current.i18nKey)));
  }
  designationSelect.replaceChildren();

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(currentLang, "designationNone");
  designationSelect.append(noneOption);

  DESIGNATION_CATEGORY_ORDER.filter((category) => allowedCategories.includes(category)).forEach((category) => {
    const items = DESIGNATIONS.filter((d) => d.category === category);
    if (!items.length) return;
    const group = document.createElement("optgroup");
    group.label = t(currentLang, DESIGNATION_CATEGORY_I18N_KEYS[category]);
    items.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      const label = requirementOptionLabel(t(currentLang, d.i18nKey), d, ctx);
      opt.textContent = label.text;
      opt.disabled = label.disabled;
      if (label.title) opt.title = label.title;
      group.append(opt);
    });
    designationSelect.append(group);
  });

  designationSelect.value = selectedDesignationId;
}

if (designationSelect) {
  designationSelect.addEventListener("change", () => {
    selectedDesignationId = designationSelect.value;
    updatePlanetState({ designationId: selectedDesignationId || null });
    refresh();
  });
}

function applyTranslations() {
  document.documentElement.lang = currentLang;

  renderDesignationSelect();

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(currentLang, el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(":");
    el.setAttribute(attr, t(currentLang, key));
  });

  langButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

function jobIcon(jobId) {
  const job = JOBS[jobId];
  const img = document.createElement("img");
  img.className = "planet-job-icon";
  img.src = `${IMAGE_BASE}${job.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

/** Icono decorativo de "zona" (img/ui/Tooltip_zone.png) para las líneas de estado de especialización. */
function zoneIcon() {
  const img = document.createElement("img");
  img.className = "ui-icon";
  img.src = "img/ui/Tooltip_zone.png";
  img.alt = "";
  return img;
}

function resourceIcon(resourceId) {
  const resource = RESOURCES[resourceId];
  const img = document.createElement("img");
  img.className = "planet-resource-icon";
  img.src = `${IMAGE_BASE}${resource.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

function jobName(jobId) {
  return t(currentLang, JOBS[jobId].i18nKey);
}

function resourceName(resourceId) {
  return t(currentLang, RESOURCES[resourceId].i18nKey);
}

/** La vivienda y los servicios (amenities) se muestran en escala ×100 como en la wiki; aquí solo los servicios son un "recurso" (la vivienda se multiplica en el sitio donde se muestra). Servicios:  ("+1250" = 12,5); el resto de recursos, en unidades normales. Internamente se calculan en unidades normales. */
function displayAmount(resourceId, amount) {
  return resourceId === "amenities" ? amount * EFFECT_SCALE : amount;
}

function formatAmount(amount, forceSign) {
  const rounded = Math.round(amount * 100) / 100;
  const text = rounded % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(2).replace(/0$/, "");
  if (forceSign) return `${rounded < 0 ? "−" : "+"}${text}`;
  return rounded < 0 ? `−${text}` : text;
}

/** Coste de construcción (wiki 4.5, P7.3) como texto para el tooltip del catálogo; "" si el edificio no tiene dato de coste. */
function formatBuildingCost(building) {
  const cost = building.cost;
  if (!cost) return "";
  const text = (items) => items.map((item) => `${formatAmount(item.amount)} ${resourceName(item.resource)}`).join(", ");
  const now = cost.items.filter((item) => !item.when || item.when === "settled");
  const nomadic = cost.items.filter((item) => item.when === "nomadic");
  let line = `${t(currentLang, "planetSimCostLabel")}: ${text(now)} · ${t(currentLang, "planetSimCostDays")(cost.time)}`;
  if (nomadic.length) line += ` (${t(currentLang, "planetSimCostNomadic")}: ${text(nomadic)})`;
  return line;
}

function buildingDisplayName(building) {
  return t(currentLang, building.i18nKey);
}

/**
 * Fila de un empleo en el resumen: icono+nombre+empleos creados a la
 * izquierda, slider de dotación en el medio, empleos cubiertos y recursos
 * que aporta a la derecha. Plantilla completa asumida (decisión del GDD):
 * por defecto TODOS los empleos creados están cubiertos (100 %); el slider
 * es solo un ajuste opcional (override) para reducir la dotación.
 * `capacity` y `jobAssignments[jobId]` están en la escala ×100 de los
 * datos de origen (no en pops reales): así el slider de paso 10 tiene
 * recorrido real. Los recursos de la derecha SÍ se muestran ya convertidos
 * a unidades reales (única división, con divideEffect, al calcularlos).
 */
function renderJobSliderRow(jobId, capacity, unitOutputs) {
  const assigned = jobAssignments[jobId] || 0;

  const row = document.createElement("div");
  row.className = "planet-job-row";

  const info = document.createElement("div");
  info.className = "planet-job-row-info";
  info.append(jobIcon(jobId));
  const label = document.createElement("span");
  label.textContent = `${jobName(jobId)} · ${t(currentLang, "planetSimJobCreatedLabel")(formatAmount(capacity))}`;
  info.append(label);
  row.append(info);

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-job-step-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.title = t(currentLang, "planetSimJobStepTooltip");

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "planet-job-slider";
  slider.min = "0";
  slider.max = String(capacity);
  slider.step = "10";
  slider.value = String(assigned);
  slider.setAttribute("aria-label", `${jobName(jobId)} — ${t(currentLang, "planetSimJobStaffedLabel")}`);
  slider.title = t(currentLang, "planetSimJobOverrideHint");

  const increaseBtn = document.createElement("button");
  increaseBtn.type = "button";
  increaseBtn.className = "planet-job-step-btn";
  increaseBtn.textContent = "+";
  increaseBtn.title = t(currentLang, "planetSimJobStepTooltip");

  const valueLabel = document.createElement("span");
  valueLabel.className = "planet-job-row-value";
  valueLabel.title = t(currentLang, "planetSimJobStaffedLabel");

  const output = document.createElement("div");
  output.className = "planet-job-row-output";

  /** Repinta solo el valor y los recursos de ESTA fila (sin tocar el slider ni recrearlo), a partir de la dotación recién asignada. */
  function updateRowDisplay(newAssigned) {
    // Los empleos y la población que los ocupa se muestran en escala ×100, como en la wiki.
    valueLabel.textContent = formatAmount(newAssigned);
    row.classList.toggle("is-override", newAssigned < capacity);
    output.replaceChildren();
    // unitOutputs ya incluye los bonos de edificios y la eficacia de la designación.
    Object.entries(unitOutputs || JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, perJob]) => {
      const amount = perJob * divideEffect(newAssigned);
      if (Math.abs(amount) < 0.001) return;
      const pill = document.createElement("span");
      pill.className = `planet-job-output-pill ${amount < 0 ? "is-negative" : "is-positive"}`;
      pill.append(resourceIcon(resourceId));
      const amountLabel = document.createElement("span");
      amountLabel.textContent = formatAmount(displayAmount(resourceId, amount), true);
      pill.append(amountLabel);
      output.append(pill);
    });
    effectPills(jobId, newAssigned, false).forEach((pill) => output.append(pill));
  }
  updateRowDisplay(assigned);

  /** Aplica un nuevo valor de dotación (empleos cubiertos): guarda el estado, repinta esta fila en el sitio y refresca el resto de la economía sin recrear ningún slider (para no interrumpir el arrastre). */
  function commitChange(newValue) {
    const clamped = Math.max(0, Math.min(capacity, newValue));
    jobAssignments[jobId] = clamped;
    slider.value = String(clamped);
    updateRowDisplay(clamped);
    refreshEconomyOnly();
  }

  // "input" (no "change"): se quiere ver el resultado en vivo mientras se
  // arrastra. Como commitChange() no recrea el propio slider (solo llama a
  // refreshEconomyOnly(), que no toca #planet-summary), el arrastre no se
  // interrumpe.
  slider.addEventListener("input", () => {
    commitChange(Number(slider.value));
  });

  // Clic: ±10 · Ctrl/Cmd+clic: ±100 · Mayús+clic: sube al 100 % (+) o baja al 0 % (−).
  function stepFor(event, direction) {
    const current = jobAssignments[jobId] || 0;
    if (event.shiftKey) return direction > 0 ? capacity : 0;
    return current + direction * ((event.ctrlKey || event.metaKey) ? 100 : 10);
  }
  decreaseBtn.addEventListener("click", (event) => commitChange(stepFor(event, -1)));
  increaseBtn.addEventListener("click", (event) => commitChange(stepFor(event, 1)));

  row.append(decreaseBtn, slider, increaseBtn, valueLabel, output);

  return row;
}


function renderJobsMini(jobs) {
  const entries = Object.entries(jobs).filter(([, raw]) => raw > 0);
  const wrapper = document.createElement("span");
  wrapper.className = "planet-catalog-jobs";
  entries.forEach(([jobId, raw]) => {
    const pill = document.createElement("span");
    pill.className = "planet-catalog-job-pill";
    pill.title = `+${formatAmount(raw)} ${jobName(jobId)}`;
    pill.append(jobIcon(jobId));
    const label = document.createElement("span");
    label.textContent = formatAmount(raw);
    pill.append(label);
    wrapper.append(pill);
  });
  return wrapper;
}

/* ── Edificio capital ────────────────────────────────────────────────── */

function renderCapital() {
  const capital = currentCapital();
  const capitalSet = currentCapitalSet();
  // P10.5: requirements the simulator does not check (Cosmogenesis ascension perk of the Lathe capitals III–IV) are shown, never block.
  const requirementNote = (entry) => {
    const rules = entry ? unmodelledRequirements(entry) : [];
    return rules.length ? t(currentLang, "requirementUnmodelled") + rules.map((rule) => t(currentLang, rule.i18nKey)).join("; ") : "";
  };
  if (capitalNameEl) {
    capitalNameEl.textContent = t(currentLang, capital.i18nKey);
    const note = requirementNote(capital);
    capitalNameEl.title = note;
    if (note) {
      const badge = document.createElement("span");
      badge.className = "planet-capital-requirement";
      badge.textContent = ` (${note})`;
      capitalNameEl.append(badge);
    }
  }
  if (capitalTierEl) capitalTierEl.textContent = `${capital.tier} / 5`;
  if (capitalUpgradeBtn) {
    capitalUpgradeBtn.disabled = capitalTierIndex >= capitalSet.length - 1;
    capitalUpgradeBtn.title = capitalUpgradeBtn.disabled ? t(currentLang, "planetSimCapitalMaxTier") : requirementNote(capitalSet[capitalTierIndex + 1]);
  }
  if (capitalDowngradeBtn) {
    capitalDowngradeBtn.disabled = capitalTierIndex <= 0;
    capitalDowngradeBtn.title = capitalDowngradeBtn.disabled ? t(currentLang, "planetSimCapitalMinTier") : "";
  }
}

if (capitalUpgradeBtn) {
  capitalUpgradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.min(currentCapitalSet().length - 1, capitalTierIndex + 1);
    refresh();
  });
}
if (capitalDowngradeBtn) {
  capitalDowngradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.max(0, capitalTierIndex - 1);
    refresh();
  });
}

if (planetSizeInput) {
  planetSizeInput.addEventListener("input", () => {
    const parsed = Math.floor(Number(planetSizeInput.value));
    userPlanetSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    refresh();
  });
}

/* ── Rejilla visual de ranuras (capital + base + urbanos + recursos) ──── */

function makeRegularSlotCell(key, unlocked, lockedTooltip) {
  const isUnlocked = unlocked.includes(key);
  const buildingId = builtMap.get(key);

  if (buildingId) {
    const building = buildingsById.get(buildingId);
    const slot = document.createElement("button");
    slot.type = "button";
    const reason = inactiveReason(key, building, unlocked);
    const isActive = reason === null;
    const stateClass = isActive ? (isLimited(building) ? "is-limited" : "is-standard") : "is-inactive";
    slot.className = `planet-slot is-filled ${stateClass}`;
    const reasonKey = { locked: "planetSimSlotInactive", requirements: "planetSimBuildingRequirementsLost", notPermitted: "planetSimBuildingNotPermittedHere" }[reason];
    slot.title = isActive
      ? `${buildingDisplayName(building)} — ${t(currentLang, "planetSimClickToDemolish")}`
      : `${buildingDisplayName(building)} — ${t(currentLang, reasonKey)} (${t(currentLang, "planetSimClickToDemolish")})`;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${building.img}`;
    img.alt = buildingDisplayName(building);
    img.loading = "lazy";
    slot.append(img);
    slot.addEventListener("click", () => {
      removeBuildingAt(key);
      refresh();
    });
    return slot;
  }

  if (isUnlocked) {
    const slot = document.createElement("button");
    slot.type = "button";
    const isTarget = key === selectedSlotKey;
    slot.className = `planet-slot is-empty${isTarget ? " is-target" : ""}`;
    slot.title = isTarget
      ? t(currentLang, "planetSimSlotTarget")
      : t(currentLang, "planetSimSlotEmpty");
    slot.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedSlotKey = key;
      refresh();
    });
    return slot;
  }

  const slot = document.createElement("span");
  slot.className = "planet-slot is-locked";
  slot.title = lockedTooltip || t(currentLang, "planetSimSlotLocked");
  return slot;
}

function renderCapitalCell() {
  const capital = currentCapital();
  const cell = document.createElement("span");
  cell.className = "planet-slot is-filled is-capital";
  cell.title = `${buildingDisplayName(capital)} — ${t(currentLang, "planetSimCapitalCannotRemove")}`;
  const img = document.createElement("img");
  img.src = `${IMAGE_BASE}${capital.img}`;
  img.alt = buildingDisplayName(capital);
  img.loading = "lazy";
  cell.append(img);
  return cell;
}

function renderSlotsVisual() {
  if (!slotsVisualEl) return;
  slotsVisualEl.replaceChildren();

  const unlocked = unlockedKeys();

  // Fila superior: 6 ranuras base (capital + 5) a la izquierda, distritos urbanos a la derecha.
  const topRow = document.createElement("div");
  topRow.className = "planet-top-row";

  const baseGrid = document.createElement("div");
  baseGrid.className = "planet-base-grid";
  baseGrid.append(renderCapitalCell());
  const lockedTooltip = isLatheLayout() ? t(currentLang, "planetSimLatheSlotLocked") : undefined; // P10.5
  for (let i = 1; i <= 5; i += 1) {
    baseGrid.append(makeRegularSlotCell(`base-${i}`, unlocked, lockedTooltip));
  }
  topRow.append(baseGrid);

  topRow.append(renderUrbanDistrictGroup(unlocked));

  slotsVisualEl.append(topRow);

  // Fila inferior: los 3 distritos de recursos básicos, centrados.
  const bottomRow = document.createElement("div");
  bottomRow.className = "planet-resource-districts-row";

  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (secondaryDistrictDef(cat).unavailable) return; // P10.5: Synaptic Lathe
    bottomRow.append(renderResourceDistrictBox(cat, unlocked));
  });

  slotsVisualEl.append(bottomRow);
}

/**
 * Grupo del distrito urbano en la vista general: cabecera compartida con
 * el recuento de copias construidas y sus controles de +/- (misma copia
 * construye/destruye que en la pestaña Distritos, pero visible aquí
 * directamente, sin tener que cambiar de pestaña), seguida de las 2 cajas
 * de especialización lado a lado.
 */
function renderUrbanDistrictGroup(unlocked) {
  const def = primaryDistrictDef();

  const group = document.createElement("div");
  group.className = "planet-urban-group";

  const summary = document.createElement("div");
  summary.className = "planet-urban-summary";
  summary.addEventListener("click", (event) => {
    if (event.target.closest(".planet-count-btn")) return;
    openDistrictsTab("urban");
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = `${t(currentLang, def.i18nKey)} ${t(currentLang, "planetSimDistrictCount")(districtState.urban.count)}`;
  header.append(icon, title);
  summary.append(header);

  summary.append(renderCountControl(
    districtState.urban.count,
    () => { districtState.urban.count = Math.max(primaryMinCount(), districtState.urban.count - 1); refresh(); },
    () => { districtState.urban.count += 1; refresh(); },
    canAddDistrict(),
    () => { districtState.urban.count = primaryMinCount(); refresh(); },
    () => { while (canAddDistrict()) districtState.urban.count += 1; refresh(); },
    primaryMinCount()
  ));

  group.append(summary);

  const boxesRow = document.createElement("div");
  boxesRow.className = "planet-urban-boxes-row";
  for (let slotIndex = 0; slotIndex < def.specializationSlots; slotIndex += 1) {
    boxesRow.append(renderUrbanSpecializationBox(slotIndex, unlocked));
  }
  group.append(boxesRow);

  return group;
}

/** Caja visual de una de las 2 ranuras de especialización del distrito urbano: icono/estado + sus 3 ranuras de edificio. */
function renderUrbanSpecializationBox(slotIndex, unlocked) {
  const def = primaryDistrictDef();
  const optionId = districtState.urban.slots[slotIndex];
  const option = primaryOption(optionId);

  const box = document.createElement("div");
  box.className = "planet-resource-district-box";
  box.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled")) return;
    openDistrictsTab("urban");
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${option ? option.img : def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = option
    ? t(currentLang, option.i18nKey)
    : t(currentLang, "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  header.append(icon, title);
  box.append(header);

  // El nombre de la especialización ya se muestra en el título de arriba en
  // cuanto hay una elegida; la línea de estado solo hace falta mientras no
  // se ha elegido ninguna.
  if (!option) {
    const statusLine = document.createElement("p");
    statusLine.className = "planet-resource-district-status";
    statusLine.textContent = t(currentLang, "planetSimNotSpecialized");
    statusLine.prepend(zoneIcon());
    box.append(statusLine);
  }

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `urban-spec-${slotIndex}-${i}`;
    row.append(makeRegularSlotCell(key, unlocked, t(currentLang, "planetSimUrbanSlotLockedTooltip")));
  }
  box.append(row);

  return box;
}

function renderResourceDistrictBox(cat, unlocked) {
  const def = secondaryDistrictDef(cat);
  const state = districtState[cat];
  const option = secondaryOption(cat, state.optionId);

  const box = document.createElement("div");
  box.className = "planet-resource-district-box";
  box.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled, .planet-count-btn")) return;
    openDistrictsTab(cat);
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${option ? option.img : def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = `${districtDisplayName(cat)} ${t(currentLang, "planetSimDistrictCount")(state.count)}`;
  header.append(icon, title);
  box.append(header);

  box.append(renderCountControl(
    state.count,
    () => {
      state.count = Math.max(0, state.count - 1);
      if (state.count === 0) state.optionId = null;
      refresh();
    },
    () => { state.count += 1; refresh(); },
    canAddResourceDistrict(cat),
    () => { state.count = 0; state.optionId = null; refresh(); },
    () => { while (canAddResourceDistrict(cat)) state.count += 1; refresh(); }
  ));

  const statusLine = document.createElement("p");
  statusLine.className = "planet-resource-district-status";
  statusLine.textContent = option
    ? t(currentLang, option.i18nKey)
    : t(currentLang, def.lockedTooltipKey);
  statusLine.prepend(zoneIcon());
  box.append(statusLine);

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `${cat}-spec-${i}`;
    const lockedTooltip = t(currentLang, def.lockedTooltipKey);
    row.append(makeRegularSlotCell(key, unlocked, lockedTooltip));
  }
  box.append(row);

  return box;
}

/* ── Pestañas y catálogo de edificios ───────────────────────────────── */

function openDistrictsTab(filter) {
  districtFilter = filter;
  setActiveTab("districts");
}

function setActiveTab(tab) {
  activeTab = tab;
  if (tabBuildingsBtn) tabBuildingsBtn.classList.toggle("is-active", tab === "buildings");
  if (tabDistrictsBtn) tabDistrictsBtn.classList.toggle("is-active", tab === "districts");
  if (catalogEl) catalogEl.hidden = tab !== "buildings";
  if (districtsCatalogEl) districtsCatalogEl.hidden = tab !== "districts";
  renderActiveTabContent();
}

if (tabBuildingsBtn) tabBuildingsBtn.addEventListener("click", () => setActiveTab("buildings"));
if (tabDistrictsBtn) tabDistrictsBtn.addEventListener("click", () => {
  districtFilter = null;
  setActiveTab("districts");
});

/* ── Pestañas principales del planeta (Planeta / Imperio / Cuerpo celeste / Sucursales) ── */

function setMainTab(tab) {
  mainTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mainTab === tab);
  });
  Object.entries(mainTabPanels).forEach(([key, panel]) => {
    if (panel) panel.hidden = key !== tab;
  });
}

mainTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMainTab(btn.dataset.mainTab));
});

function renderActiveTabContent() {
  if (activeTab === "buildings") renderCatalog();
  else renderDistrictsCatalog();
}

/** ¿Este edificio no se puede construir ahora mismo (límite de colonia, sin ranuras libres, o incompatible con la ranura objetivo)? Se usa tanto para desactivar el botón como para decidir si su categoría sale desplegada. */
function isBuildingDisabled(building, slotsFull, targetKey) {
  if (slotsFull) return true;
  if (building.colonyLimit !== "none" && chainBuildingCount(building) >= building.colonyLimit) return true;
  return !slotAcceptsBuilding(targetKey, building);
}

/** Identifica el "tipo" de una ranura (no la ranura exacta): todas las de base son iguales entre sí; las urbanas se distinguen por su especialización elegida; las de recursos por su categoría y especialización elegida. Sirve para no recalcular los desplegables del catálogo cuando el objetivo cambia dentro del mismo tipo (ver renderCatalog). */
function getSlotTypeSignature(key) {
  if (!key) return null;
  const urbanMatch = /^urban-spec-(\d+)-\d+$/.exec(key);
  if (urbanMatch) {
    const slotIndex = Number(urbanMatch[1]);
    return `urban:${districtState.urban.slots[slotIndex] || "none"}`;
  }
  const resourceMatch = /^(generator|mining|agriculture)-spec-\d+$/.exec(key);
  if (resourceMatch) {
    const cat = resourceMatch[1];
    return `${cat}:${districtState[cat].optionId || "none"}`;
  }
  return "base";
}

// Último "tipo" de ranura para el que se calcularon los desplegables
// abiertos/cerrados del catálogo, y su resultado (categoría -> abierto o
// no). Mientras el objetivo se mueva dentro del mismo tipo de ranura, estos
// valores se respetan tal cual (incluidos los cambios manuales del usuario
// vía el evento "toggle"); solo se recalculan desde cero al cambiar de tipo.
let catalogSlotSignature = null;
const catalogCategoryOpenState = {};

function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.replaceChildren();

  const targetKey = resolveSelectedSlot();
  const slotsFull = !targetKey;
  // La firma incluye el contexto de requisitos: si cambian éticas, autoridad,
  // principios, designación, tipo de planeta o capital, se recalcula qué
  // categorías salen abiertas.
  const slotSignature = slotsFull ? null : getSlotTypeSignature(targetKey);
  const signature = `${slotSignature}#${requirementContextKey(requirementContext())}`;

  if (signature !== catalogSlotSignature) {
    catalogSlotSignature = signature;
    CATEGORY_ORDER.forEach((category) => {
      const items = BUILDINGS.filter((b) => b.category === category && isBuildingAvailable(b));
      catalogCategoryOpenState[category] = items.some((building) => !isBuildingDisabled(building, slotsFull, targetKey));
    });
  }

  CATEGORY_ORDER.forEach((category) => {
    // Los edificios cuyos requisitos no se cumplen no se muestran.
    const items = BUILDINGS.filter((b) => b.category === category && isBuildingAvailable(b));
    if (!items.length) return;

    const details = document.createElement("details");
    details.className = "planet-catalog-category";
    details.open = catalogCategoryOpenState[category] ?? true;
    details.addEventListener("toggle", () => {
      catalogCategoryOpenState[category] = details.open;
    });

    const summary = document.createElement("summary");
    summary.className = "entry-heading-sub planet-category-heading";
    summary.textContent = t(currentLang, CATEGORY_I18N_KEYS[category]);
    details.append(summary);

    const list = document.createElement("div");
    list.className = "planet-catalog-list";

    items.forEach((building) => {
      list.append(renderCatalogItem(building, slotsFull, targetKey));
    });

    details.append(list);
    catalogEl.append(details);
  });
}

/** P10.5: unmodelled effects (infoKeys) and requirements of a building, as extra tooltip lines. */
function buildingNotesText(building) {
  const lines = (building.infoKeys || []).map((key) => t(currentLang, key));
  const unmodelled = unmodelledRequirements(building).map((rule) => t(currentLang, rule.i18nKey));
  if (unmodelled.length) lines.push(t(currentLang, "requirementUnmodelled") + unmodelled.join("; "));
  return lines.length ? `\n${lines.join("\n")}` : "";
}

/** slotsFull: no queda ninguna ranura libre en toda la colonia. targetKey: la ranura libre actualmente seleccionada como destino (o null si slotsFull). */
function renderCatalogItem(building, slotsFull, targetKey) {
  const count = buildingCount(building.id);
  const atLimit = building.colonyLimit !== "none" && chainBuildingCount(building) >= building.colonyLimit;
  const incompatible = !slotsFull && !atLimit && !slotAcceptsBuilding(targetKey, building);
  const disabled = isBuildingDisabled(building, slotsFull, targetKey);

  const item = document.createElement("button");
  item.type = "button";
  item.className = `planet-catalog-item ${isLimited(building) ? "is-limited" : "is-standard"}`;
  item.disabled = disabled;

  let reason;
  if (atLimit) {
    reason = t(currentLang, "planetSimLimitReached");
  } else if (slotsFull) {
    reason = t(currentLang, "planetSimSlotsFull");
  } else if (incompatible) {
    const info = slotSpecInfo(targetKey);
    reason = info.sets === null
      ? t(currentLang, "planetSimBuildingNotAllowedBase")(buildingDisplayName(building))
      : t(currentLang, "planetSimBuildingNotAllowed")(buildingDisplayName(building), info.label);
  } else {
    reason = t(currentLang, "planetSimClickToBuild");
  }
  const costText = formatBuildingCost(building);
  item.title = `${buildingDisplayName(building)} — ${reason}${costText ? `\n${costText}` : ""}${buildingNotesText(building)}`;

  const img = document.createElement("img");
  img.className = "planet-catalog-icon";
  img.src = `${IMAGE_BASE}${building.img}`;
  img.alt = "";
  img.loading = "lazy";
  item.append(img);

  const name = document.createElement("span");
  name.className = "planet-catalog-name";
  name.textContent = buildingDisplayName(building);
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "planet-catalog-count";
    badge.textContent = `×${count}`;
    name.append(" ", badge);
  }
  item.append(name);

  if (Object.keys(building.jobs || {}).length) {
    item.append(renderJobsMini(building.jobs));
  } else if (building.housing || building.amenities) {
    const extra = document.createElement("span");
    extra.className = "planet-catalog-extra";
    const parts = [];
    if (building.housing) parts.push(t(currentLang, "planetSimHousingLabel")(formatAmount(building.housing)));
    if (building.amenities) parts.push(t(currentLang, "planetSimAmenitiesLabel")(formatAmount(building.amenities)));
    extra.textContent = parts.join(" · ");
    item.append(extra);
  }

  item.addEventListener("click", () => {
    if (disabled || !targetKey) return;
    builtMap.set(targetKey, building.id);
    refresh();
  });

  return item;
}

/* ── Catálogo de distritos ───────────────────────────────────────────── */

function renderDistrictsCatalog() {
  if (!districtsCatalogEl) return;
  districtsCatalogEl.replaceChildren();

  if (districtFilter) {
    const viewAll = document.createElement("button");
    viewAll.type = "button";
    viewAll.className = "planet-view-all-btn";
    viewAll.textContent = t(currentLang, "planetSimViewAll");
    viewAll.addEventListener("click", () => { districtFilter = null; renderDistrictsCatalog(); });
    districtsCatalogEl.append(viewAll);
  }

  const categories = (districtFilter ? [districtFilter] : ["urban", ...RESOURCE_DISTRICT_ORDER])
    .filter((cat) => cat === "urban" || !secondaryDistrictDef(cat).unavailable); // P10.5: Synaptic Lathe has two district types
  categories.forEach((cat) => {
    districtsCatalogEl.append(cat === "urban" ? renderUrbanDistrictCard() : renderResourceDistrictCard(cat));
  });
}

function renderUrbanDistrictCard() {
  const def = primaryDistrictDef();
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = `${t(currentLang, def.i18nKey)} ${t(currentLang, "planetSimDistrictCount")(districtState.urban.count)}`;
  header.append(icon, name);
  card.append(header);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, def.specializationSlots ? "planetSimUrbanSlotsNote" : "planetSimNoSpecializationTooltip");
  card.append(note);
  const primaryJobs = districtBaseJobs(def);
  if (Object.keys(primaryJobs).length) card.append(renderJobsMini(primaryJobs));

  card.append(renderCountControl(
    districtState.urban.count,
    () => { districtState.urban.count = Math.max(primaryMinCount(), districtState.urban.count - 1); refresh(); },
    () => { districtState.urban.count += 1; refresh(); },
    canAddDistrict(),
    () => { districtState.urban.count = primaryMinCount(); refresh(); },
    () => { while (canAddDistrict()) districtState.urban.count += 1; refresh(); },
    primaryMinCount()
  ));

  for (let slotIndex = 0; slotIndex < def.specializationSlots; slotIndex += 1) {
    card.append(renderUrbanSpecializationPicker(slotIndex));
  }

  return card;
}

/** Selector de una de las 2 ranuras de especialización del distrito urbano, dentro de la ficha de la pestaña Distritos. */
function renderUrbanSpecializationPicker(slotIndex) {
  const def = primaryDistrictDef();
  const currentId = districtState.urban.slots[slotIndex];
  const currentOption = primaryOption(currentId);

  const wrapper = document.createElement("div");
  wrapper.className = "planet-district-spec-row";

  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${currentOption ? currentOption.img : def.img}`;
  icon.alt = "";
  wrapper.append(icon);

  const info = document.createElement("div");
  info.className = "planet-district-spec-info";

  const label = document.createElement("span");
  label.textContent = currentOption
    ? t(currentLang, currentOption.i18nKey)
    : t(currentLang, "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  info.append(label);

  const select = document.createElement("select");
  select.className = "planet-urban-spec-select";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(currentLang, "planetSimNotSpecialized");
  if (!currentId) noneOption.selected = true;
  select.append(noneOption);

  // P10.2: options whose requirements are not met (research specializations on a Habitat) are listed disabled with the reason.
  const specCtx = requirementContext();
  def.specializationOptions.forEach((option) => {
    // P10.6: first-slot-only specializations (Central Spire) are not offered in the second slot.
    if (option.firstSlotOnly && slotIndex > 0) return;
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    const label = requirementOptionLabel(t(currentLang, option.i18nKey), option, specCtx);
    optionEl.textContent = label.text;
    optionEl.disabled = label.disabled;
    if (label.title) optionEl.title = label.title;
    if (option.id === currentId) optionEl.selected = true;
    select.append(optionEl);
  });

  select.addEventListener("change", () => {
    districtState.urban.slots[slotIndex] = select.value || null;
    refresh();
  });
  info.append(select);
  // P10.8: the Collapsed Spire blocker locks the first slot.
  if (slotIndex === 0 && firstSpecializationLocked()) {
    select.disabled = true;
    const note = document.createElement("p");
    note.className = "planet-district-note";
    note.textContent = t(currentLang, "blockerSlotLocked");
    info.append(note);
  }

  if (currentOption) {
    info.append(renderJobsMini(scaleJobs(specializationJobs(currentOption), specializationJobMultiplier())));
    specializationNotes(currentOption).forEach((note) => {
      const noteEl = document.createElement("p");
      noteEl.className = "planet-district-spec-note";
      noteEl.textContent = note;
      info.append(noteEl);
    });
  }

  wrapper.append(info);

  return wrapper;
}

function renderResourceDistrictCard(cat) {
  const def = secondaryDistrictDef(cat);
  const state = districtState[cat];
  const currentOption = secondaryOption(cat, state.optionId);
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${currentOption ? currentOption.img : def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = districtDisplayName(cat);
  header.append(icon, name);
  card.append(header);

  card.append(renderJobsMini(districtBaseJobs(def)));

  card.append(renderCountControl(
    state.count,
    () => {
      state.count = Math.max(0, state.count - 1);
      if (state.count === 0) state.optionId = null;
      refresh();
    },
    () => { state.count += 1; refresh(); },
    canAddResourceDistrict(cat),
    () => { state.count = 0; state.optionId = null; refresh(); },
    () => { while (canAddResourceDistrict(cat)) state.count += 1; refresh(); }
  ));

  if (def.habitatResource) card.append(renderDistrictCapInput(cat));
  if (districtHasNoFeature(cat)) {
    const note = document.createElement("p");
    note.className = "planet-district-note";
    note.textContent = t(currentLang, "featuresNoFeatureForDistrict");
    card.append(note);
  }

  // P10.4: the Habitat Research District has no specializations.
  if (!def.specializationOptions.length) {
    const none = document.createElement("p");
    none.className = "planet-district-note";
    none.textContent = t(currentLang, "planetSimNoSpecializationTooltip");
    card.append(none);
    return card;
  }

  const specRow = document.createElement("div");
  specRow.className = "planet-district-spec-row";

  const select = document.createElement("select");
  select.className = "planet-urban-spec-select";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(currentLang, "planetSimNotSpecialized");
  if (!state.optionId) noneOption.selected = true;
  select.append(noneOption);

  const specCtx = requirementContext();
  def.specializationOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    const label = requirementOptionLabel(t(currentLang, option.i18nKey), option, specCtx);
    optionEl.textContent = label.text;
    optionEl.disabled = label.disabled;
    if (label.title) optionEl.title = label.title;
    if (option.id === state.optionId) optionEl.selected = true;
    select.append(optionEl);
  });

  select.addEventListener("change", () => {
    state.optionId = select.value || null;
    refresh();
  });
  specRow.append(select);

  if (currentOption) {
    specRow.append(renderJobsMini(scaleJobs(specializationJobs(currentOption), specializationJobMultiplier())));
  }

  card.append(specRow);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, def.secondaryUrban ? "planetSimSecondaryUrbanSlotsNote" : "planetSimResourceSlotsNote");
  card.append(note);

  return card;
}

/** P10.4: manual cap input of a Habitat resource district (orbital deposits: 1 + half of the deposit size). Empty = not set. */
function renderDistrictCapInput(cat) {
  const wrapper = document.createElement("label");
  wrapper.className = "planet-district-cap";
  wrapper.title = t(currentLang, "planetSimHabitatCapTooltip");
  const text = document.createElement("span");
  text.textContent = t(currentLang, "planetSimHabitatCapLabel");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(planetSize);
  input.step = "1";
  input.className = "planet-district-cap-input";
  const cap = districtCap(cat);
  input.value = cap === null ? "" : String(cap);
  input.addEventListener("change", () => {
    const parsed = Math.floor(Number(input.value));
    districtState[cat].cap = input.value === "" || !Number.isFinite(parsed) ? null : Math.max(0, parsed);
    renderDesignationSelect(); // a cap of 0 can lock a habitat designation (Generator/Mining/Research Station)
    refresh();
  });
  wrapper.append(text, input);
  return wrapper;
}

/**
 * canIncrease (por defecto true): si es false, el botón "+" sale desactivado
 * con el motivo (límite de distritos del planeta alcanzado) en el tooltip.
 * onDecreaseAll/onIncreaseAll (opcionales): si se indican, Ctrl+clic (Cmd+clic
 * en Mac) sobre "−"/"+" los usa en vez de onDecrease/onIncrease, para
 * destruir todas las copias de ese distrito o construir las máximas
 * posibles de una sola vez. Se refleja también en el tooltip del botón.
 * min (por defecto 0): valor mínimo de count; el botón "−" se desactiva al
 * alcanzarlo. Se usa para el distrito urbano, que siempre debe tener al
 * menos URBAN_MIN_COUNT copias construidas.
 */
function renderCountControl(count, onDecrease, onIncrease, canIncrease = true, onDecreaseAll, onIncreaseAll, min = 0) {
  const wrapper = document.createElement("div");
  wrapper.className = "planet-count-control";

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-count-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.disabled = count <= min;
  decreaseBtn.title = onDecreaseAll
    ? `${t(currentLang, "planetSimDistrictRemove")} (${t(currentLang, "planetSimCtrlClickRemoveAll")})`
    : t(currentLang, "planetSimDistrictRemove");
  decreaseBtn.addEventListener("click", (event) => {
    if ((event.ctrlKey || event.metaKey) && onDecreaseAll) onDecreaseAll();
    else onDecrease();
  });

  const countLabel = document.createElement("span");
  countLabel.className = "planet-count-value";
  countLabel.textContent = String(count);

  const increaseBtn = document.createElement("button");
  increaseBtn.type = "button";
  increaseBtn.className = "planet-count-btn";
  increaseBtn.textContent = "+";
  increaseBtn.disabled = !canIncrease;
  increaseBtn.title = canIncrease
    ? (onIncreaseAll ? `${t(currentLang, "planetSimDistrictAdd")} (${t(currentLang, "planetSimCtrlClickAddAll")})` : t(currentLang, "planetSimDistrictAdd"))
    : t(currentLang, "planetSimDistrictLimitReached");
  increaseBtn.addEventListener("click", (event) => {
    if ((event.ctrlKey || event.metaKey) && onIncreaseAll) onIncreaseAll();
    else onIncrease();
  });

  wrapper.append(decreaseBtn, countLabel, increaseBtn);
  return wrapper;
}

/* ── Paneles de resumen y producción ─────────────────────────────────── */

/** Contador "empleos creados / empleos asumidos cubiertos" (escala ×100, como los datos de la wiki). */
function updateJobsCounter(jobIds, jobCapacities) {
  const created = jobIds.reduce((sum, jobId) => sum + (jobCapacities[jobId] || 0), 0);
  const staffed = jobIds.reduce((sum, jobId) => sum + (jobAssignments[jobId] || 0), 0);
  const createdText = formatAmount(created);
  const staffedText = formatAmount(staffed);
  if (summaryPopulationEl) {
    summaryPopulationEl.textContent = t(currentLang, "planetSimJobsCounter")(createdText, staffedText);
  }
  updatePlanetState({ populationText: staffedText });
}

/** Píldoras con los efectos de JOB_EFFECTS de un empleo (estabilidad, delincuencia...), multiplicados por los empleos cubiertos (escala ×100). withLabel: añade el nombre de la estadística. */
/** Píldora de una estadística sin recurso (estabilidad, delincuencia, ejércitos de defensa...) con su signo y color. */
function statPill(statId, amount, withLabel) {
  const stat = STAT_EFFECTS[statId];
  const pill = document.createElement("span");
  // Para delincuencia, menos es mejor: se pinta en verde cuando baja.
  const good = statId === "crime" ? amount < 0 : amount > 0;
  pill.className = `planet-job-output-pill ${good ? "is-positive" : "is-negative"}`;
  pill.title = t(currentLang, stat.i18nKey);
  const icon = document.createElement("img");
  icon.src = `${IMAGE_BASE}${stat.img}`;
  icon.alt = "";
  icon.loading = "lazy";
  pill.append(icon);
  const text = document.createElement("span");
  text.textContent = `${withLabel ? `${t(currentLang, stat.i18nKey)} ` : ""}${formatAmount(amount, true)}`;
  pill.append(text);
  return pill;
}

/** Píldoras con los efectos de JOB_EFFECTS de un empleo, multiplicados por los empleos cubiertos (escala ×100). withLabel: añade el nombre de la estadística. */
function effectPills(jobId, assignedRaw, withLabel) {
  return Object.entries(JOB_EFFECTS[jobId] || {}).map(([statId, perJob]) => statPill(statId, perJob * divideEffect(assignedRaw), withLabel));
}

function renderNonResourceEffects(jobIds, conditions) {
  const nonResourceEntries = Object.keys(JOB_EFFECTS).filter((jobId) => (jobAssignments[jobId] || 0) > 0);
  const lowHappinessCrime = conditions && conditions.crime ? conditions.crime.fromHappiness : 0;
  const capital = currentCapital();
  const capitalArmies = capital.defenseArmies || 0;
  if ((nonResourceEntries.length || capitalArmies || lowHappinessCrime > 0) && nonResourceEl) {
    nonResourceEl.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "planet-nonresource-heading";
    heading.textContent = t(currentLang, "planetSimNonResourceHeading");
    nonResourceEl.append(heading);
    if (capitalArmies) {
      // Ejércitos de defensa del edificio capital (P7.5): no dependen de la dotación de empleos.
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      const img = document.createElement("img");
      img.className = "planet-nonresource-icon";
      img.src = `${IMAGE_BASE}${capital.img}`;
      img.alt = "";
      line.append(img);
      const text = document.createElement("span");
      text.textContent = `${t(currentLang, capital.i18nKey)} —`;
      line.append(text, statPill("defenseArmies", capitalArmies, true));
      nonResourceEl.append(line);
    }
    nonResourceEntries.forEach((jobId) => {
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      line.append(jobIcon(jobId));
      const text = document.createElement("span");
      text.textContent = `${formatAmount(jobAssignments[jobId])} ${jobName(jobId)} —`;
      line.append(text);
      effectPills(jobId, jobAssignments[jobId], true).forEach((pill) => line.append(pill));
      nonResourceEl.append(line);
    });
    if (lowHappinessCrime > 0) {
      // P9.5: delincuencia que producen los pops por baja felicidad (solo informativa), junto a la de los empleos.
      const line = document.createElement("div");
      line.className = "planet-nonresource-line";
      line.dataset.effect = "crimeFromHappiness";
      const text = document.createElement("span");
      text.textContent = `${t(currentLang, "conditionsCrimeHappiness")} —`;
      line.append(text, statPill("crime", lowHappinessCrime, true));
      nonResourceEl.append(line);
    }
  } else if (nonResourceEl) {
    nonResourceEl.replaceChildren();
  }
}

/** P17.3: panel "i" del resumen de empleos (dotación, escala ×100, controles, estratos con su eficacia actual, efectos no recurso). */
function renderJobsInfo(totals, jobIds) {
  const slot = document.querySelector("#planet-jobs-info-slot");
  if (!slot) return;
  syncInfoButtons(currentLang);
  const info = createInfoPanel("planet-jobs");
  const addLine = (text) => {
    const line = document.createElement("p");
    line.className = "planet-modifier-stacking";
    line.textContent = text;
    info.append(line);
  };
  const created = jobIds.reduce((sum, jobId) => sum + (totals.jobCapacities[jobId] || 0), 0);
  const staffed = jobIds.reduce((sum, jobId) => sum + (jobAssignments[jobId] || 0), 0);
  addLine(t(currentLang, "jobsInfoStaffing")(formatAmount(created), formatAmount(staffed)));
  addLine(t(currentLang, "jobsInfoScale"));
  addLine(t(currentLang, "jobsInfoControls"));
  // Eficacia por estrato: modificadores stratumEfficiency + stratumOutput (Política de producción, tratada como eficacia).
  const byStratum = {};
  (totals.modifiers || []).forEach((modifier) => {
    if ((modifier.category === "stratumEfficiency" || modifier.category === "stratumOutput") && modifier.stratum) {
      byStratum[modifier.stratum] = (byStratum[modifier.stratum] || 0) + modifier.value;
    }
  });
  const list = JOB_STRATA.filter((stratum) => Math.abs(byStratum[stratum] || 0) > 1e-9)
    .map((stratum) => `${t(currentLang, STRATUM_I18N_KEYS[stratum])} ${formatAmount(byStratum[stratum] * 100, true)}%`).join(" · ");
  addLine(t(currentLang, "jobsInfoStrata")(list || t(currentLang, "jobsInfoStrataNone")));
  addLine(t(currentLang, "jobsInfoNonResource"));
  slot.replaceChildren(info);
}

function renderSummary(totals) {
  if (!summaryEl) return;
  summaryEl.replaceChildren();

  const jobIds = Object.keys(totals.jobCapacities).filter((jobId) => totals.jobCapacities[jobId] > 0);
  updateJobsCounter(jobIds, totals.jobCapacities);
  renderJobsInfo(totals, jobIds);

  if (!jobIds.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "planetSimSummaryEmpty");
    summaryEl.append(empty);
    renderNonResourceEffects(jobIds, totals.conditions);
    return;
  }

  // Los empleos se agrupan por estrato (ver JOB_STRATA en planet-data.js).
  JOB_STRATA.forEach((stratum) => {
    const heading = document.createElement("h3");
    heading.className = "planet-stratum-heading";
    heading.textContent = t(currentLang, STRATUM_I18N_KEYS[stratum]);
    summaryEl.append(heading);

    const stratumJobIds = Object.keys(JOBS).filter((jobId) => JOBS[jobId].stratum === stratum && jobIds.includes(jobId));
    if (!stratumJobIds.length) {
      const empty = document.createElement("p");
      empty.className = "planet-stratum-empty";
      empty.textContent = t(currentLang, "stratumEmpty");
      summaryEl.append(empty);
      return;
    }
    stratumJobIds.forEach((jobId) => {
      summaryEl.append(renderJobSliderRow(jobId, totals.jobCapacities[jobId], totals.jobUnitOutputs[jobId]));
    });
  });

  renderNonResourceEffects(jobIds, totals.conditions);
}

/**
 * Versión ligera de refresh() para cuando solo cambia la población asignada
 * a un empleo (arrastre del slider, o botones ±100/±1000): recalcula la
 * economía y repinta el panel de recursos, el contador de población y
 * "otros efectos", pero NUNCA toca #planet-summary (las filas de empleo con
 * sus sliders) ni la rejilla de ranuras ni el catálogo — nada de eso cambia
 * por una reasignación de población, y recrearlo interrumpiría el arrastre
 * del propio slider que disparó esta actualización.
 */
function refreshEconomyOnly() {
  const totals = computeTotals();
  renderProduction(totals);
  renderConditions(totals);
  renderStats(totals);
  const jobIds = Object.keys(totals.jobCapacities).filter((jobId) => totals.jobCapacities[jobId] > 0);
  updateJobsCounter(jobIds, totals.jobCapacities);
  renderJobsInfo(totals, jobIds);
  renderNonResourceEffects(jobIds, totals.conditions);
}


/** Fuentes del desglose por recurso (P8.1), en el orden en que se muestran. `pos`/`neg` son las claves i18n según el signo del importe. */
const BREAKDOWN_SOURCES = [
  { id: "jobsBase", pos: "breakdownJobsBasePos", neg: "breakdownJobsBaseNeg" },
  { id: "jobsBonus", pos: "breakdownJobsBonusPos", neg: "breakdownJobsBonusNeg" },
  { id: "jobWorkforceScaling", pos: "breakdownJobWorkforceScaling", neg: "breakdownJobWorkforceScaling" },
  { id: "edictJobFlat", pos: "breakdownEdictJobFlat", neg: "breakdownEdictJobFlat" },
  { id: "jobsModifier", pos: "breakdownJobsModifierPos", neg: "breakdownJobsModifierNeg" },
  { id: "jobBuildingMult", pos: "breakdownJobBuildingMult", neg: "breakdownJobBuildingMult" },
  { id: "policyJobMult", pos: "breakdownPolicyJobMult", neg: "breakdownPolicyJobMult" },
  { id: "celestialJobMult", pos: "breakdownCelestialJobMult", neg: "breakdownCelestialJobMult" },
  { id: "jobJobMult", pos: "breakdownJobJobMult", neg: "breakdownJobJobMult" },
  { id: "designationJobMult", pos: "breakdownDesignationJobMult", neg: "breakdownDesignationJobMult" },
  { id: "specializationJobMult", pos: "breakdownSpecializationJobMult", neg: "breakdownSpecializationJobMult" },
  { id: "planetModifierJobMult", pos: "breakdownPlanetModifierJobMult", neg: "breakdownPlanetModifierJobMult" },
  { id: "civilians", pos: "breakdownCivilians", neg: "breakdownCivilians" },
  { id: "neuralChips", pos: "breakdownNeuralChips", neg: "breakdownNeuralChips" },
  { id: "stabilityEffect", pos: "breakdownStabilityEffect", neg: "breakdownStabilityEffect" },
  { id: "tradeConversion", pos: "breakdownTradeConversionPos", neg: "breakdownTradeConversionNeg" },
  { id: "buildingFlat", pos: "breakdownBuildingFlat", neg: "breakdownBuildingFlat" },
  { id: "blockers", pos: "breakdownBlockers", neg: "breakdownBlockers" },
  { id: "designation", pos: "breakdownDesignation", neg: "breakdownDesignation" },
  { id: "empireMult", pos: "breakdownEmpireMult", neg: "breakdownEmpireMult" },
  { id: "capital", pos: "breakdownCapital", neg: "breakdownCapital" },
  { id: "districts", pos: "breakdownDistricts", neg: "breakdownDistricts" },
  { id: "buildings", pos: "breakdownBuildings", neg: "breakdownBuildings" }
];

// Recursos de la columna "Netos" con el desglose desplegado (se conserva entre repintados).
const expandedBreakdowns = new Set();

function renderResourceRow(resourceId, amount, forceSign) {
  const row = document.createElement("div");
  row.className = `planet-resource-row ${amount < 0 ? "is-negative" : "is-positive"}`;
  row.append(resourceIcon(resourceId));
  const name = document.createElement("span");
  name.className = "planet-resource-name";
  name.textContent = resourceName(resourceId);
  row.append(name);
  const value = document.createElement("span");
  value.className = "planet-resource-value";
  value.textContent = formatAmount(displayAmount(resourceId, amount), forceSign);
  row.append(value);
  return row;
}

/** Bloque desplegable con las fuentes de un recurso: líneas con signo, bruto (suma de positivos), costes (suma de negativos) y neto. */
function renderBreakdownDetail(resourceId, sources) {
  const detail = document.createElement("div");
  detail.className = "planet-resource-detail";
  let gross = 0;
  let costs = 0;
  const addLine = (label, amount, extraClass) => {
    const line = document.createElement("div");
    line.className = `planet-resource-detail-line${extraClass ? ` ${extraClass}` : ""}${amount < 0 ? " is-negative" : ""}`;
    const text = document.createElement("span");
    text.textContent = label;
    const number = document.createElement("span");
    number.textContent = formatAmount(displayAmount(resourceId, amount), true);
    line.append(text, number);
    detail.append(line);
  };
  BREAKDOWN_SOURCES.forEach((source) => {
    const amount = sources[source.id] || 0;
    if (Math.abs(amount) < 0.001) return;
    if (amount > 0) gross += amount; else costs += amount;
    let label = t(currentLang, amount > 0 ? source.pos : source.neg);
    // Los recursos recibidos por la conversión de comercio indican la política que los produce.
    if (source.id === "tradeConversion" && lastTotals && lastTotals.tradeConversion) {
      label += ` (${t(currentLang, getPolicyOption("trade", lastTotals.tradeConversion.optionId).i18nKey)})`;
    }
    addLine(label, amount);
  });
  addLine(t(currentLang, "breakdownGross"), gross, "is-total");
  addLine(t(currentLang, "breakdownCosts"), costs, "is-total");
  addLine(t(currentLang, "breakdownNet"), gross + costs, "is-total");
  // Comercio: tasas de cambio de la política comercial elegida.
  if (resourceId === "trade" && lastTotals && lastTotals.tradeConversion) {
    const note = document.createElement("div");
    note.className = "planet-resource-detail-line is-total";
    const rates = Object.entries(lastTotals.tradeConversion.rates).map(([id, rate]) => `${Math.round(rate * 10000) / 100}% ${resourceName(id)}`).join(" · ");
    note.textContent = t(currentLang, "policyEffectTradeConversion") + rates;
    detail.append(note);
  }
  return detail;
}

/** Rellena un contenedor con las filas de recurso de `entries` (objeto recurso -> importe), ordenadas por magnitud. Con `breakdown`, cada fila se despliega al pulsarla (P8.1). */
function renderResourceList(container, entries, forceSign, emptyKey, breakdown) {
  if (!container) return;
  container.replaceChildren();

  const rows = Object.entries(entries).filter(([, amount]) => Math.abs(amount) > 0.001);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, emptyKey);
    container.append(empty);
    return;
  }

  rows
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([resourceId, amount]) => {
      const row = renderResourceRow(resourceId, amount, forceSign);
      const sources = breakdown && breakdown[resourceId];
      if (!sources) {
        container.append(row);
        return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "planet-resource-entry";
      row.classList.add("is-expandable");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.title = t(currentLang, "breakdownToggleTooltip");
      const expanded = expandedBreakdowns.has(resourceId);
      row.setAttribute("aria-expanded", String(expanded));
      const toggle = () => {
        if (expandedBreakdowns.has(resourceId)) expandedBreakdowns.delete(resourceId); else expandedBreakdowns.add(resourceId);
        renderProduction(lastTotals);
      };
      row.addEventListener("click", toggle);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); }
      });
      wrapper.append(row);
      if (expanded) wrapper.append(renderBreakdownDetail(resourceId, sources));
      container.append(wrapper);
    });
}

/** Ingresos externos al planeta (P8.4): bonos planos del imperio (éticas/autoridad), con sus fuentes, y el total planeta + externos. */
function renderExternalIncome(totals) {
  if (!externalEl) return;
  externalEl.replaceChildren();
  const ids = Object.keys(totals.externalTotals || {});
  externalEl.hidden = !ids.length;
  if (!ids.length) return;
  const heading = document.createElement("h3");
  heading.className = "planet-production-subheading";
  heading.textContent = t(currentLang, "planetSimExternalHeading");
  const note = document.createElement("p");
  note.className = "planet-modifier-stacking";
  note.textContent = t(currentLang, "planetSimExternalNote");
  externalEl.append(heading, note);
  ids.forEach((resourceId) => {
    const amount = totals.externalTotals[resourceId];
    const entry = document.createElement("div");
    entry.className = "planet-resource-entry";
    entry.append(renderResourceRow(resourceId, amount, true));
    const sources = (totals.modifiers || []).filter((modifier) => modifier.category === "resourceFlat" && modifier.resource === resourceId);
    const detail = document.createElement("div");
    detail.className = "planet-resource-detail";
    sources.forEach((modifier) => {
      const line = document.createElement("div");
      line.className = "planet-resource-detail-line";
      const label = document.createElement("span");
      label.textContent = modifierSourceName(modifier.source);
      const value = document.createElement("span");
      value.textContent = formatAmount(displayAmount(resourceId, modifier.value), true);
      line.append(label, value);
      detail.append(line);
    });
    const planetNet = totals.resourceTotals[resourceId] || 0;
    const total = document.createElement("div");
    total.className = "planet-resource-detail-line is-total";
    const totalLabel = document.createElement("span");
    totalLabel.textContent = `${t(currentLang, "planetSimWithExternalLabel")} (${t(currentLang, "planetSimNetHeading")} ${formatAmount(displayAmount(resourceId, planetNet), true)})`;
    const totalValue = document.createElement("span");
    totalValue.textContent = formatAmount(displayAmount(resourceId, planetNet + amount), true);
    total.append(totalLabel, totalValue);
    detail.append(total);
    entry.append(detail);
    externalEl.append(entry);
  });
}

/** P17.2: panel "i" de producción (columnas, desglose, conversión de comercio con las cifras actuales, ingresos externos). */
function renderProductionInfo(totals) {
  const slot = document.querySelector("#planet-production-info-slot");
  if (!slot) return;
  syncInfoButtons(currentLang);
  const info = createInfoPanel("planet-production");
  const addLine = (text) => {
    const line = document.createElement("p");
    line.className = "planet-modifier-stacking";
    line.textContent = text;
    info.append(line);
  };
  addLine(t(currentLang, "productionInfoColumns"));
  addLine(t(currentLang, "productionInfoBreakdown"));
  const policyId = getPlanetState().policyIds && getPlanetState().policyIds.trade;
  const conversion = totals.tradeConversion;
  if (conversion) {
    const rates = Object.entries(conversion.rates).map(([id, rate]) => `${Math.round(rate * 10000) / 100}% ${resourceName(id)}`).join(" · ");
    addLine(t(currentLang, "productionInfoTrade")(t(currentLang, getPolicyOption("trade", conversion.optionId).i18nKey), formatAmount(conversion.amount, false), rates));
  } else if (policyId && getPolicyOption("trade", policyId)) {
    addLine(t(currentLang, "productionInfoTradeNone")(t(currentLang, getPolicyOption("trade", policyId).i18nKey)));
  }
  addLine(t(currentLang, "productionInfoExternal"));
  addLine(t(currentLang, "productionInfoCheck"));
  slot.replaceChildren(info);
}

let lastTotals = null;
function renderProduction(totals) {
  lastTotals = totals;
  if (checkEl) {
    const problems = totals.inconsistencies || [];
    checkEl.hidden = !problems.length;
    checkEl.textContent = problems.length
      ? t(currentLang, "productionCheckFailed")(problems.map((p) => `${resourceName(p.resourceId)} (${formatAmount(p.net, true)} / ${formatAmount(p.breakdownSum, true)})`).join(", "))
      : "";
  }
  renderProductionInfo(totals);
  renderExternalIncome(totals);
  renderResourceList(producedEl, totals.producedTotals, false, "planetSimProducedEmpty");
  renderResourceList(consumedEl, totals.consumedTotals, false, "planetSimConsumedEmpty");
  renderResourceList(netEl, totals.resourceTotals, true, "planetSimProductionEmpty", totals.breakdown);
}

/**
 * Categorías de modificador del panel (P8.2), en orden de aparición. El texto de apilado sale de las reglas de la
 * versión de datos (js/stacking-rules.js, P8.3); `unit`: "percent" o "flat" para formatear el valor.
 */
const MODIFIER_CATEGORIES = [
  { id: "jobFlat", label: "modifierCatJobFlat", unit: "flat" },
  { id: "jobEfficiency", label: "modifierCatJobEfficiency", unit: "percent" },
  { id: "stratumEfficiency", label: "modifierCatStratumEfficiency", unit: "percent" },
  { id: "stratumOutput", label: "modifierCatStratumOutput", unit: "percent" },
  { id: "jobUpkeep", label: "modifierCatJobUpkeep", unit: "percent" },
  { id: "jobResourceMult", label: "modifierCatJobResourceMult", unit: "percent" },
  { id: "upkeepMult", label: "modifierCatUpkeepMult", unit: "percent" },
  { id: "stabilityEffect", label: "modifierCatStabilityEffect", unit: "percent" },
  { id: "tradeConversion", label: "modifierCatTradeConversion", unit: "percent" },
  { id: "resourceMult", label: "modifierCatResourceMult", unit: "percent" },
  { id: "resourceFlat", label: "modifierCatResourceFlat", unit: "flat" },
  { id: "conditionFlat", label: "modifierCatConditionFlat", unit: "flat" },
  { id: "flat", label: "modifierCatFlat", unit: "flat" }
];

function modifierSourceName(source) {
  if (source.kind === "building") return buildingDisplayName(buildingsById.get(source.id));
  if (source.kind === "designation") return t(currentLang, getDesignation(source.id).i18nKey);
  if (source.kind === "ethic") return t(currentLang, ETHIC_OPTIONS[source.id].i18nKey);
  if (source.kind === "policy") {
    const [groupId, optionId] = source.id.split(":");
    return t(currentLang, getPolicyOption(groupId, optionId).i18nKey);
  }
  if (source.kind === "authority") return t(currentLang, AUTHORITIES.find((entry) => entry.id === source.id).i18nKey);
  if (source.kind === "stability") return t(currentLang, "conditionsStability");
  if (source.kind === "edict") return t(currentLang, getEdict(source.id).i18nKey);
  if (source.kind === "planetModifier") { const modifier = PLANET_MODIFIERS.find((entry) => entry.id === source.id); return modifier ? t(currentLang, modifier.i18nKey) : source.id; }
  if (source.kind === "blocker") { const blocker = BLOCKERS.find((entry) => entry.id === source.id); return blocker ? t(currentLang, blocker.i18nKey) : source.id; }
  if (source.kind === "feature") { const deposit = STRATEGIC_DEPOSITS.find((entry) => entry.id === source.id); return deposit ? t(currentLang, deposit.i18nKey) : source.id; }
  if (source.kind === "specialization") { const option = primaryOption(source.id); return option ? t(currentLang, option.i18nKey) : source.id; }
  if (source.kind === "celestial") { const type = PLANET_TYPES.find((entry) => entry.id === source.id); return type ? t(currentLang, type.i18nKey) : source.id; }
  if (source.kind === "job") return jobName(source.id);
  return source.id;
}

function modifierTargetName(modifier) {
  const parts = [];
  if (modifier.job === "all") parts.push(t(currentLang, "modifierTargetAllJobs"));
  else if (modifier.job === "civilian") parts.push(t(currentLang, CIVILIAN_OUTPUTS[ethicsSatisfy(getPlanetState().ethicIds || [], GESTALT_CONSCIOUSNESS.id) ? "gestalt" : "individualist"].i18nKey));
  else if (modifier.job) parts.push(jobName(modifier.job));
  if (modifier.stratum) parts.push(t(currentLang, STRATUM_I18N_KEYS[modifier.stratum]));
  if (modifier.resource) parts.push(resourceName(modifier.resource));
  const conditionStatKeys = { happiness: "conditionsHappiness", stability: "conditionsStability", crime: "conditionsCrime", buildingUpkeep: "modifierTargetBuildingUpkeep", districtEnergyUpkeep: "modifierTargetDistrictEnergyUpkeep" };
  if (modifier.stat) parts.push(RESOURCES[modifier.stat] ? resourceName(modifier.stat) : (modifier.stat === "housing" ? t(currentLang, "planetSimStatHousingShort") : conditionStatKeys[modifier.stat] ? t(currentLang, conditionStatKeys[modifier.stat]) : modifier.stat));
  return parts.join(" · ");
}

/** P10.8: "Required deposit features" panel of the Cuerpo celeste tab (computed from the built resource districts). */
const depositFeaturesEl = document.querySelector("#celestial-deposit-features");
function renderDepositFeatures() {
  if (!depositFeaturesEl) return;
  depositFeaturesEl.replaceChildren();
  const result = requiredDepositFeatures();
  const addNote = (text, className = "planet-district-note") => {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    depositFeaturesEl.append(p);
    return p;
  };
  if (!result) { addNote(t(currentLang, "featuresNotApplicable")); return; }
  addNote(t(currentLang, "featuresIntro"));
  const list = document.createElement("ul");
  list.className = "celestial-feature-list";
  result.features.forEach((group) => {
    const item = document.createElement("li");
    item.className = "celestial-feature";
    item.dataset.feature = group.feature.id;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${group.feature.img}`;
    img.alt = "";
    img.loading = "lazy";
    const text = document.createElement("span");
    const caps = RESOURCE_DISTRICT_ORDER.filter((cat) => group.feature.caps[cat]).map((cat) => `+${group.feature.caps[cat]} ${districtDisplayName(cat)}`).join(", ");
    text.textContent = `${group.copies > 1 ? `${group.copies}× ` : ""}${t(currentLang, group.feature.i18nKey)} (${caps})`;
    item.append(img, text);
    if (group.alternatives.length) {
      const alt = document.createElement("small");
      alt.textContent = t(currentLang, "featuresAlternatives") + group.alternatives.map((feature) => t(currentLang, feature.i18nKey)).join(", ");
      item.append(alt);
    }
    list.append(item);
  });
  result.strategic.forEach(({ specialization, deposit, candidates }) => {
    const item = document.createElement("li");
    item.className = "celestial-feature is-strategic";
    item.dataset.feature = deposit.id;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${deposit.img}`;
    img.alt = "";
    img.loading = "lazy";
    const label = document.createElement("span");
    label.textContent = t(currentLang, "featuresStrategicFor")(t(currentLang, specialization.i18nKey));
    const select = document.createElement("select");
    select.className = "celestial-strategic-select";
    select.dataset.specialization = specialization.id;
    candidates.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      const caps = RESOURCE_DISTRICT_ORDER.filter((cat) => candidate.caps[cat]).map((cat) => `+${candidate.caps[cat]} ${districtDisplayName(cat)}`).join(", ");
      const bonus = candidate.jobBonus ? `, +${candidate.jobBonus.perJob} ${t(currentLang, RESOURCES[candidate.jobBonus.resource].i18nKey)} / ${t(currentLang, "featuresPerJobCategory_" + candidate.jobBonus.category)}` : "";
      option.textContent = `${t(currentLang, candidate.i18nKey)} (${caps}${bonus})`;
      option.selected = candidate.id === deposit.id;
      select.append(option);
    });
    select.addEventListener("change", () => { strategicDepositChoice[specialization.id] = select.value; refresh(); });
    item.append(img, label, select);
    list.prepend(item);
  });
  if (result.features.length || result.strategic.length) depositFeaturesEl.append(list);
  else addNote(t(currentLang, "featuresNoneNeeded"));
  result.uncapped.forEach((cat) => addNote(t(currentLang, "featuresUncapped")(districtDisplayName(cat))));
  result.uncovered.forEach((cat) => addNote(t(currentLang, "featuresUncovered")(districtDisplayName(cat)), "planet-district-note is-warning"));
  const count = result.count || 0;
  const total = addNote(t(currentLang, "featuresCount")(count), "celestial-feature-count");
  total.dataset.count = String(count);
  if (count < DEPOSIT_FEATURE_COUNT.min || count > DEPOSIT_FEATURE_COUNT.max) {
    const warning = addNote(t(currentLang, count < DEPOSIT_FEATURE_COUNT.min ? "featuresTooFew" : "featuresTooMany")(count, DEPOSIT_FEATURE_COUNT.min, DEPOSIT_FEATURE_COUNT.max), "planet-district-note is-warning");
    warning.id = "celestial-feature-warning";
  }
}

/** P10.8: selectable blockers of the Cuerpo celeste tab (only the useful ones, GDD §4.2). */
const blockersEl = document.querySelector("#celestial-blockers");
function renderBlockers() {
  if (!blockersEl) return;
  blockersEl.replaceChildren();
  const ctx = requirementContext();
  const fitting = BLOCKERS.filter((blocker) => blockerFitsBody(blocker) || selectedBlockers.has(blocker.id));
  if (!fitting.length) {
    const p = document.createElement("p");
    p.className = "planet-district-note";
    p.textContent = t(currentLang, "blockersNone");
    blockersEl.append(p);
    return;
  }
  const list = document.createElement("ul");
  list.className = "celestial-feature-list";
  fitting.forEach((blocker) => {
    const item = document.createElement("li");
    item.className = "celestial-feature celestial-blocker";
    item.dataset.blocker = blocker.id;
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = selectedBlockers.has(blocker.id);
    box.addEventListener("change", () => {
      if (box.checked) selectedBlockers.add(blocker.id); else selectedBlockers.delete(blocker.id);
      refresh();
    });
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${blocker.img}`;
    img.alt = "";
    img.loading = "lazy";
    const name = document.createElement("span");
    const effects = [
      ...Object.entries(blocker.flat || {}).map(([resourceId, amount]) => `+${amount} ${t(currentLang, RESOURCES[resourceId].i18nKey)}`),
      ...(blocker.jobBonus ? [`+${blocker.jobBonus.perJob} ${t(currentLang, RESOURCES[blocker.jobBonus.resource].i18nKey)} / ${t(currentLang, "featuresPerJobCategory_" + blocker.jobBonus.category)}`] : []),
      ...(blocker.amenities ? [`+${blocker.amenities} ${t(currentLang, "resourceAmenities")}`] : []),
      ...(blocker.locksFirstSpecialization ? [t(currentLang, "blockerLocksFirstSlot")] : [])
    ];
    name.textContent = `${t(currentLang, blocker.i18nKey)} (${effects.join(", ")})`;
    label.append(box, img, name);
    item.append(label);
    const notes = [];
    const unmodelled = unmodelledRequirements(blocker).map((rule) => t(currentLang, rule.i18nKey));
    if (unmodelled.length) notes.push(t(currentLang, "requirementUnmodelled") + unmodelled.join("; "));
    const reason = selectedBlockers.has(blocker.id) ? blockerInactiveReason(blocker, ctx) : (unmetRequirements(blocker, ctx).map(describeUnmetRule).filter(Boolean).join("; ") || null);
    if (reason) {
      notes.push(selectedBlockers.has(blocker.id) ? t(currentLang, "blockerInactive")(reason) : reason);
      item.classList.toggle("is-inactive", selectedBlockers.has(blocker.id));
    }
    if (notes.length) {
      const small = document.createElement("small");
      small.textContent = notes.join(" · ");
      item.append(small);
    }
    list.append(item);
  });
  blockersEl.append(list);
}

/** P10.8: planet modifiers of the Cuerpo celeste tab, grouped like the wiki (collapsed groups, the chosen ones listed first). */
const planetModifiersEl = document.querySelector("#celestial-planet-modifiers");
const openModifierGroups = new Set();
function planetModifierEffectText(modifier) {
  const e = modifier.effects;
  const sign = (value) => (value > 0 ? `+${value}` : `${value}`);
  const res = (id) => (id === "all" ? t(currentLang, "planetModifierAllResources") : t(currentLang, RESOURCES[id].i18nKey));
  const parts = [
    ...Object.entries(e.jobResourcePct || {}).map(([id, pct]) => `${sign(pct)}% ${res(id)} ${t(currentLang, "planetModifierFromJobs")}`),
    ...(e.jobCategoryFlat || []).map((bonus) => `${sign(bonus.perJob)} ${res(bonus.resource)} / ${t(currentLang, "featuresPerJobCategory_" + bonus.category)}`),
    ...Object.entries(e.conditions || {}).map(([stat, value]) => `${sign(value)} ${t(currentLang, { happiness: "conditionsHappiness", stability: "conditionsStability", crime: "conditionsCrime" }[stat])}`),
    ...Object.entries(e.conditionsByEmpire || {}).flatMap(([empire, stats]) => Object.entries(stats).map(([stat, value]) => `${sign(value)} ${t(currentLang, { happiness: "conditionsHappiness", stability: "conditionsStability" }[stat])} (${t(currentLang, empire === "gestalt" ? "planetModifierIfGestalt" : "planetModifierIfIndividualist")})`)),
    ...Object.entries(e.flat || {}).map(([stat, value]) => `${sign(value)} ${t(currentLang, stat === "housing" ? "planetSimStatHousingShort" : "resourceAmenities")}`),
    ...Object.entries(e.pct || {}).map(([stat, value]) => `${sign(value)}% ${t(currentLang, stat === "housing" ? "planetSimStatHousingShort" : "resourceAmenities")}`),
    ...Object.entries(e.maxDistricts || {}).map(([cat, value]) => `${sign(value)} ${t(currentLang, "planetModifierMaxDistricts")(districtDisplayName(cat))}`),
    ...Object.entries(e.stratumOutput || {}).map(([stratum, value]) => `${sign(value)}% ${t(currentLang, STRATUM_I18N_KEYS[stratum])} ${t(currentLang, "planetModifierOutput")}`),
    ...Object.entries(e.stratumEfficiency || {}).map(([stratum, value]) => `${sign(value)}% ${t(currentLang, STRATUM_I18N_KEYS[stratum])} ${t(currentLang, "planetModifierJobEfficiency")}`),
    ...(e.jobUpkeepPct ? [`${sign(e.jobUpkeepPct)}% ${t(currentLang, "planetModifierJobUpkeep")}`] : []),
    ...(e.popHousingUsagePct ? [`${sign(e.popHousingUsagePct)}% ${t(currentLang, "planetModifierPopHousingUsage")}`] : [])
  ];
  return parts.join(", ");
}
function renderPlanetModifiers() {
  if (!planetModifiersEl) return;
  planetModifiersEl.replaceChildren();
  const intro = document.createElement("p");
  intro.className = "planet-district-note";
  intro.textContent = t(currentLang, "planetModifiersIntro");
  planetModifiersEl.append(intro);
  PLANET_MODIFIER_GROUPS.forEach((group) => {
    const modifiers = PLANET_MODIFIERS.filter((modifier) => modifier.group === group && (planetModifierFitsBody(modifier) || selectedPlanetModifiers.has(modifier.id)));
    if (!modifiers.length) return;
    const details = document.createElement("details");
    details.className = "celestial-modifier-group";
    details.dataset.group = group;
    const chosen = modifiers.filter((modifier) => selectedPlanetModifiers.has(modifier.id)).length;
    details.open = openModifierGroups.has(group);
    details.addEventListener("toggle", () => { if (details.open) openModifierGroups.add(group); else openModifierGroups.delete(group); });
    const summary = document.createElement("summary");
    summary.textContent = `${t(currentLang, "planetModifierGroup_" + group)}${chosen ? ` (${chosen})` : ""}`;
    details.append(summary);
    const list = document.createElement("ul");
    list.className = "celestial-feature-list";
    modifiers.forEach((modifier) => {
      const item = document.createElement("li");
      item.className = "celestial-feature celestial-blocker";
      item.dataset.modifier = modifier.id;
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selectedPlanetModifiers.has(modifier.id);
      const excludedBy = planetModifierExcludedBy(modifier);
      if (excludedBy && !box.checked) box.disabled = true;
      box.addEventListener("change", () => {
        if (box.checked) selectedPlanetModifiers.add(modifier.id); else selectedPlanetModifiers.delete(modifier.id);
        refresh();
      });
      label.append(box);
      if (modifier.img) {
        const img = document.createElement("img");
        img.src = `${IMAGE_BASE}${modifier.img}`;
        img.alt = "";
        img.loading = "lazy";
        label.append(img);
      }
      const name = document.createElement("span");
      name.textContent = `${t(currentLang, modifier.i18nKey)} (${planetModifierEffectText(modifier)})`;
      label.append(name);
      item.append(label);
      const notes = [];
      if (modifier.notModelled?.length) notes.push(t(currentLang, "planetModifierNotModelled") + modifier.notModelled.join("; "));
      if (modifier.source) notes.push(t(currentLang, "planetModifierSource") + modifier.source);
      if (excludedBy) notes.push(t(currentLang, "planetModifierExcluded")(t(currentLang, excludedBy.i18nKey)));
      if (box.checked && !planetModifierFitsBody(modifier)) notes.push(t(currentLang, "blockerInactive")(t(currentLang, "blockerWrongBody")));
      item.classList.toggle("is-inactive", box.checked && (!planetModifierFitsBody(modifier) || Boolean(excludedBy)));
      if (notes.length) {
        const small = document.createElement("small");
        small.textContent = notes.join(" · ");
        item.append(small);
      }
      list.append(item);
    });
    details.append(list);
    planetModifiersEl.append(details);
  });
}

// P17.1: botones "i" y paneles de explicación (js/info-panels.js).
initInfoButtons(() => currentLang);

/** Panel de modificadores activos (P8.2): origen, categoría afectada, valor y cómo se apila. */
function renderModifiers(totals) {
  if (!modifiersEl) return;
  modifiersEl.replaceChildren();
  syncInfoButtons(currentLang);
  const rulesetId = getPlanetState().rulesetId;
  const stackingRules = getStackingRules(rulesetId);
  // Panel de explicación (oculto hasta pulsar "i"): nota general, orden de cálculo, reglas de apilado y procedencia.
  const info = createInfoPanel("planet-modifiers");
  const infoNote = document.createElement("p");
  infoNote.className = "planet-modifier-stacking";
  infoNote.textContent = t(currentLang, "modifiersNote");
  info.append(infoNote);
  const order = document.createElement("ol");
  order.className = "planet-modifier-order";
  getCalculationOrder(rulesetId).forEach((key) => {
    const item = document.createElement("li");
    item.textContent = t(currentLang, key);
    order.append(item);
  });
  const orderHeading = document.createElement("h3");
  orderHeading.className = "planet-modifier-heading";
  orderHeading.textContent = t(currentLang, "modifierOrderHeading");
  const provenance = document.createElement("p");
  provenance.className = "planet-modifier-stacking";
  provenance.textContent = t(currentLang, "modifierRulesUnverified");
  const rulesHeading = document.createElement("h3");
  rulesHeading.className = "planet-modifier-heading";
  rulesHeading.textContent = t(currentLang, "modifierRulesHeading");
  const rulesList = document.createElement("ul");
  rulesList.className = "planet-modifier-order";
  MODIFIER_CATEGORIES.forEach((category) => {
    const categoryRule = stackingRules[category.id];
    const item = document.createElement("li");
    item.textContent = `${t(currentLang, category.label)}: ${t(currentLang, categoryRule.stacking)} (${t(currentLang, categoryRule.combine === "multiply" ? "modifierCombineMultiply" : "modifierCombineAdd")})`;
    rulesList.append(item);
  });
  info.append(orderHeading, order, rulesHeading, rulesList, provenance);
  modifiersEl.append(info);
  const list = totals.modifiers || [];
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "modifiersEmpty");
    modifiersEl.append(empty);
    return;
  }
  MODIFIER_CATEGORIES.forEach((category) => {
    const items = list.filter((modifier) => modifier.category === category.id);
    if (!items.length) return;
    const heading = document.createElement("h3");
    heading.className = "planet-modifier-heading";
    heading.textContent = t(currentLang, category.label);
    modifiersEl.append(heading);
    items.forEach((modifier) => {
      const row = document.createElement("div");
      row.className = "planet-modifier-row";
      const source = document.createElement("span");
      source.className = "planet-modifier-source";
      source.textContent = modifierSourceName(modifier.source) + (modifier.count > 1 ? ` ×${modifier.count}` : "");
      const kind = document.createElement("span");
      kind.className = "planet-modifier-kind";
      kind.textContent = t(currentLang, `modifierSourceKind_${modifier.source.kind}`);
      const target = document.createElement("span");
      target.className = "planet-modifier-target";
      target.textContent = modifierTargetName(modifier);
      const value = document.createElement("span");
      value.className = `planet-modifier-value ${modifier.value < 0 ? "is-negative" : "is-positive"}`;
      const shown = category.unit === "percent" ? modifier.value * 100 : modifier.value;
      value.textContent = `${formatAmount(shown, true)}${category.unit === "percent" ? "%" : ""}`;
      row.append(source, kind, target, value);
      modifiersEl.append(row);
    });
  });
}

/** Panel de condiciones del planeta (P9.1): pops, vivienda y servicios. Valores en escala ×100 como el resto de la interfaz. */
function renderConditions(totals) {
  if (!conditionsEl) return;
  syncInfoButtons(currentLang);
  conditionsEl.replaceChildren();
  const c = totals.conditions;
  const info = createInfoPanel("planet-conditions");
  // P17.4: cada explicación va seguida de un ejemplo con las cifras actuales ("Now: ..."). Pops, vivienda y servicios en ×100.
  const infoLine = (text, isExample) => {
    const line = document.createElement("p");
    line.className = `planet-modifier-stacking${isExample ? " info-example" : ""}`;
    line.textContent = text;
    info.append(line);
  };
  const x100 = (n) => formatAmount(n * EFFECT_SCALE, false);
  const signed = (n) => (n < 0 ? `− ${formatAmount(-n, false)}` : `+ ${formatAmount(n, false)}`);
  infoLine(t(currentLang, "conditionsInfoPops"));
  infoLine(t(currentLang, "conditionsInfoNowPops")(x100(c.pops - c.civilians), x100(c.civilians), x100(c.pops)), true);
  infoLine(t(currentLang, "conditionsInfoHousing"));
  infoLine(t(currentLang, "conditionsInfoNowHousing")(x100(c.housingProvided), x100(c.pops), x100(c.housingMissing)), true);
  infoLine(t(currentLang, "conditionsInfoAmenities"));
  infoLine(t(currentLang, "conditionsInfoNowAmenities")(x100(c.amenitiesProvided), x100(c.amenitiesLost), x100(c.amenitiesUsage), formatAmount(c.amenitiesAvailable * EFFECT_SCALE, true)), true);
  const ih = c.happiness;
  const ist = c.stability;
  infoLine(t(currentLang, "conditionsInfoHappiness"));
  if (ih.applicable) infoLine(t(currentLang, "conditionsInfoNowHappiness")(signed(ih.effect), signed(ih.manual), formatAmount(ih.value, false)), true);
  infoLine(t(currentLang, "conditionsInfoStability"));
  if (ist.applicable) {
    const main = ist.gestalt ? ist.amenitiesEffect : ist.approvalBonus;
    const mainLabel = t(currentLang, ist.gestalt ? "conditionsInfoNowStabilityAmenities" : "conditionsInfoNowStabilityApproval");
    infoLine(t(currentLang, "conditionsInfoNowStability")(signed(main), mainLabel, signed(ist.jobs), signed(ist.manual), signed(-ist.housingPenalty), formatAmount(ist.value, false), formatAmount(c.stabilityEffect * 100, true)), true);
  }
  const icr = c.crime;
  infoLine(t(currentLang, icr.gestalt ? "conditionsInfoDeviancy" : "conditionsInfoCrime"));
  if (ist.applicable) {
    infoLine(icr.gestalt
      ? t(currentLang, "conditionsInfoNowDeviancy")(formatAmount(icr.fromJobs, true), formatAmount(icr.total, false))
      : t(currentLang, "conditionsInfoNowCrime")(x100(c.pops), formatAmount(c.pops, false), formatAmount(ih.value, false), formatAmount(icr.fromHappiness, false), formatAmount(icr.fromJobs, true), formatAmount(icr.total, false)), true);
  } else {
    infoLine(t(currentLang, "conditionsInfoNoPops"), true);
  }
  if (ih.edicts || ist.edicts || icr.fromEdicts) {
    infoLine(t(currentLang, "conditionsInfoNowEdicts")(signed(ih.edicts || 0), signed(ist.edicts || 0), signed(icr.fromEdicts || 0)), true);
  }
  infoLine(t(currentLang, "conditionsInfoSources"));
  conditionsEl.append(info);
  const rows = [
    c.lathe ? ["neuralChips", "conditionsNeuralChips", c.neuralChips, false] : ["civilians", "conditionsCivilians", c.civilians, false],
    ["pops", "conditionsPops", c.pops, false],
    ["housingProvided", "conditionsHousingProvided", c.housingProvided, false],
    // P10.5: only on bodies that change the pop housing usage (Machine World).
    ...(c.housingUsagePct ? [["housingUsage", "conditionsHousingUsage", -c.housingUsage, true]] : []),
    ["housingMissing", "conditionsHousingMissing", c.housingMissing, true],
    ["amenitiesProvided", "conditionsAmenitiesProvided", c.amenitiesProvided, false],
    ["amenitiesLost", "conditionsAmenitiesLost", -c.amenitiesLost, true],
    ["amenitiesUsage", "conditionsAmenitiesUsage", -c.amenitiesUsage, true],
    ["amenitiesAvailable", "conditionsAmenitiesAvailable", c.amenitiesAvailable, false]
  ];
  rows.forEach(([key, labelKey, value, badWhenPositive]) => {
    const row = document.createElement("div");
    const bad = value < 0 || (badWhenPositive && value > 0);
    row.className = `planet-resource-row ${bad ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    const label = t(currentLang, labelKey);
    name.textContent = typeof label === "function" ? label(c.housingUsagePct) : label;
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value * EFFECT_SCALE, key === "amenitiesAvailable");
    row.append(name, val);
    conditionsEl.append(row);
  });

  // Felicidad (P9.2) y estabilidad (P9.3 / P9.6): cálculo completo con los números actuales.
  const h = c.happiness;
  const st = c.stability;
  const fmt = (n) => formatAmount(n, false);
  const addNote = (text) => {
    const note = document.createElement("p");
    note.className = "planet-modifier-stacking";
    note.textContent = text;
    conditionsEl.append(note);
  };
  const addRows = (list) => list.forEach(([key, labelKey, value, signed]) => {
    const row = document.createElement("div");
    row.className = `planet-resource-row ${value < 0 ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    name.textContent = t(currentLang, labelKey);
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value, signed && value !== 0);
    row.append(name, val);
    conditionsEl.append(row);
  });
  const amenitiesFormula = () => c.amenitiesEffect.mode === "bonus"
    ? t(currentLang, "conditionsFormulaBonus")(fmt(c.amenitiesAvailable), fmt(c.amenitiesUsage), fmt(c.amenitiesEffect.raw), formatAmount(c.amenitiesEffect.effect, true))
    : c.amenitiesEffect.mode === "penalty"
      ? t(currentLang, "conditionsFormulaPenalty")(fmt(c.amenitiesAvailable), fmt(c.amenitiesUsage), fmt(c.amenitiesEffect.raw), formatAmount(c.amenitiesEffect.effect, true))
      : t(currentLang, "conditionsFormulaNone");

  if (h.applicable) {
    addRows([
      ["happinessBase", "conditionsHappinessBase", h.base, false],
      ["happinessAmenities", "conditionsHappinessAmenities", h.effect, true],
      ...(h.body ? [["happinessBody", "conditionsHappinessBody", h.body, true]] : []),
      ...(h.edicts ? [["happinessEdicts", "conditionsHappinessEdicts", h.edicts, true]] : []),
      ...(h.planetModifiers ? [["happinessPlanetModifiers", "conditionsPlanetModifiers", h.planetModifiers, true]] : []),
      ["happinessManual", "conditionsHappinessManual", h.manual, true],
      ["happiness", "conditionsHappiness", h.value, false]
    ]);
    addNote(amenitiesFormula());
  } else if (st.gestalt) {
    addNote(t(currentLang, "conditionsHappinessNA"));
  }

  // Without pops there are no stability/crime rows, but the manual rows (civilians / Neural Chips) still need their inputs.
  if (!st.applicable) {
    decorateConditionRows();
    return;
  }
  if (st.gestalt) {
    addRows([
      ["stabilityBase", "conditionsStabilityBase", st.base, false],
      ["stabilityAmenities", "conditionsStabilityAmenities", st.amenitiesEffect, true],
      ["stabilityJobs", "conditionsStabilityJobs", st.jobs, true],
      ...(st.edicts ? [["stabilityEdicts", "conditionsStabilityEdicts", st.edicts, true]] : []),
      ...(st.planetModifiers ? [["stabilityPlanetModifiers", "conditionsPlanetModifiers", st.planetModifiers, true]] : []),
      ...(st.capital ? [["stabilityCapital", "conditionsStabilityCapital", st.capital, true]] : []),
      ...(st.buildings ? [["stabilityBuildings", "conditionsStabilityBuildings", st.buildings, true]] : []),
      ["stabilityManual", "conditionsStabilityManual", st.manual, true],
      ["stabilityHousing", "conditionsStabilityHousing", -st.housingPenalty, true],
      ["stability", "conditionsStability", st.value, false],
      ["stabilityEffect", "conditionsStabilityEffect", c.stabilityEffect * 100, true]
    ]);
    addNote(amenitiesFormula());
  } else {
    addRows([
      ["stabilityBase", "conditionsStabilityBase", st.base, false],
      ["stabilityApproval", "conditionsStabilityApproval", st.approvalBonus, true],
      ["stabilityJobs", "conditionsStabilityJobs", st.jobs, true],
      ...(st.edicts ? [["stabilityEdicts", "conditionsStabilityEdicts", st.edicts, true]] : []),
      ...(st.planetModifiers ? [["stabilityPlanetModifiers", "conditionsPlanetModifiers", st.planetModifiers, true]] : []),
      ...(st.capital ? [["stabilityCapital", "conditionsStabilityCapital", st.capital, true]] : []),
      ...(st.buildings ? [["stabilityBuildings", "conditionsStabilityBuildings", st.buildings, true]] : []),
      ["stabilityManual", "conditionsStabilityManual", st.manual, true],
      ["stabilityHousing", "conditionsStabilityHousing", -st.housingPenalty, true],
      ["stability", "conditionsStability", st.value, false],
      ["stabilityEffect", "conditionsStabilityEffect", c.stabilityEffect * 100, true]
    ]);
    addNote(st.approval >= 50
      ? t(currentLang, "conditionsFormulaApprovalHigh")(fmt(st.approval), formatAmount(st.approvalBonus, true))
      : t(currentLang, "conditionsFormulaApprovalLow")(fmt(st.approval), formatAmount(st.approvalBonus, true)));
  }
  addNote(t(currentLang, "conditionsFormulaHousing")(fmt(Math.max(0, c.pops - c.housingProvided)), fmt(c.pops), formatAmount(-st.housingPenalty, st.housingPenalty !== 0)));

  // P9.5: delincuencia (desviación en gestalt). Solo informativa; en rojo cuando sube.
  const cr = c.crime;
  const crimeRows = cr.gestalt
    ? [["crimeJobs", "conditionsDeviancyJobs", cr.fromJobs], ["crime", "conditionsDeviancy", cr.total]]
    : [["crimeHappiness", "conditionsCrimeHappiness", cr.fromHappiness], ["crimeJobs", "conditionsCrimeJobs", cr.fromJobs], ...(cr.fromEdicts ? [["crimeEdicts", "conditionsCrimeEdicts", cr.fromEdicts]] : []), ...(cr.fromModifiers ? [["crimePlanetModifiers", "conditionsPlanetModifiers", cr.fromModifiers]] : []), ["crime", "conditionsCrime", cr.total]];
  crimeRows.forEach(([key, labelKey, value]) => {
    const row = document.createElement("div");
    row.className = `planet-resource-row ${value > 0 ? "is-negative" : "is-positive"}`;
    row.dataset.condition = key;
    const name = document.createElement("span");
    name.className = "planet-resource-name";
    name.textContent = t(currentLang, labelKey);
    const val = document.createElement("span");
    val.className = "planet-resource-value";
    val.textContent = formatAmount(value, key !== "crime" && value !== 0);
    row.append(name, val);
    conditionsEl.append(row);
  });
  addNote(cr.gestalt
    ? t(currentLang, "conditionsDeviancyNote")
    : t(currentLang, "conditionsFormulaCrime")(fmt(c.pops), fmt(h.value), formatAmount(cr.fromHappiness, false)));

  decorateConditionRows();
}

/** P9.7: etiqueta de origen de cada valor y campos de los valores manuales. */
function decorateConditionRows() {
  conditionsEl.querySelectorAll(".planet-resource-row[data-condition]").forEach((row) => {
    const key = row.dataset.condition;
    const source = CONDITION_SOURCES[key];
    if (!source) return;
    const badge = document.createElement("span");
    badge.className = `planet-condition-source is-${source}`;
    badge.dataset.source = source;
    badge.textContent = t(currentLang, CONDITION_SOURCE_LABELS[source]);
    badge.title = t(currentLang, `${CONDITION_SOURCE_LABELS[source]}Tooltip`);
    row.querySelector(".planet-resource-name").append(" ", badge);
    if (key === "civilians" || key === "neuralChips") {
      // P16.12: civiles, ×100 como los empleos (100 = 1 pop), mínimo 0 y sin tope. P10.5: Neural Chips, igual.
      const chips = key === "neuralChips";
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.min = "0";
      input.className = "planet-condition-input";
      input.value = String(chips ? neuralChipsRaw : civiliansRaw);
      input.setAttribute("aria-label", t(currentLang, chips ? "conditionsNeuralChips" : "conditionsCivilians"));
      input.addEventListener("change", () => {
        if (chips) neuralChipsRaw = sanitizeCivilians(input.value);
        else civiliansRaw = sanitizeCivilians(input.value);
        refreshEconomyOnly();
      });
      row.querySelector(".planet-resource-value").replaceWith(input);
      return;
    }
    const manualKey = MANUAL_CONDITION_ROWS[key];
    if (!manualKey) return;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.min = String(-MANUAL_CONDITION_LIMIT);
    input.max = String(MANUAL_CONDITION_LIMIT);
    input.className = "planet-condition-input";
    input.value = String(manualConditions[manualKey]);
    input.setAttribute("aria-label", t(currentLang, manualKey === "happiness" ? "conditionsHappinessManual" : "conditionsStabilityManual"));
    input.addEventListener("change", () => {
      const value = Number(input.value);
      manualConditions[manualKey] = Number.isFinite(value) ? Math.max(-MANUAL_CONDITION_LIMIT, Math.min(MANUAL_CONDITION_LIMIT, value)) : 0;
      refreshEconomyOnly();
    });
    row.querySelector(".planet-resource-value").replaceWith(input);
  });
}

/**
 * P9.7: origen de cada valor del panel de condiciones. derived = calculado directamente con los datos y las reglas de la wiki;
 * estimated = depende de una simplificación del simulador (uso de servicios 1 por pop, todos los pops iguales, aprobación =
 * felicidad...); manual = introducido por el usuario.
 */
const CONDITION_SOURCES = {
  civilians: "manual", neuralChips: "manual", pops: "derived", housingProvided: "derived", housingMissing: "derived", amenitiesProvided: "derived", amenitiesLost: "derived",
  amenitiesUsage: "estimated", amenitiesAvailable: "estimated",
  happinessBase: "derived", happinessAmenities: "estimated", happinessManual: "manual", happiness: "estimated",
  stabilityBase: "derived", stabilityAmenities: "estimated", stabilityApproval: "estimated", stabilityJobs: "derived", stabilityManual: "manual",
  stabilityHousing: "derived", stability: "estimated", stabilityEffect: "estimated",
  crimeHappiness: "estimated", crimeJobs: "derived", crime: "estimated",
  happinessEdicts: "derived", happinessBody: "derived", happinessPlanetModifiers: "derived", stabilityPlanetModifiers: "derived", crimePlanetModifiers: "derived", stabilityEdicts: "derived", stabilityCapital: "derived", stabilityBuildings: "derived", crimeEdicts: "derived"
};
const CONDITION_SOURCE_LABELS = { manual: "conditionsSourceManual", estimated: "conditionsSourceEstimated", derived: "conditionsSourceDerived" };
const MANUAL_CONDITION_ROWS = { happinessManual: "happiness", stabilityManual: "stability" };
/** P16.12: civiles válidos = entero ≥ 0 (×100); cualquier otra cosa → 0. */
function sanitizeCivilians(raw) {
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function renderSlots() {
  renderCapital();
  renderSlotsVisual();
}

function renderStats(totals) {
  if (statHousing) {
    statHousing.textContent = formatAmount(totals.housing * EFFECT_SCALE, true);
    // P7.10: tooltip con el desglose de vivienda; cada tecnología aplicada sale en su propia línea.
    const lines = totals.housingSources.map((source) => {
      let label;
      if (source.kind === "capital") label = t(currentLang, "planetSimCapitalHeading");
      else if (source.kind === "district") label = `${districtDisplayName(source.district)} ×${source.count}`;
      else if (source.kind === "technology") label = t(currentLang, "planetSimHousingTechnology")(t(currentLang, source.i18nKey));
      else if (source.kind === "building") label = `${buildingDisplayName(buildingsById.get(source.id))}${source.count > 1 ? ` ×${source.count}` : ""}`;
      else if (source.kind === "planetModifier") label = t(currentLang, PLANET_MODIFIERS.find((modifier) => modifier.id === source.id).i18nKey);
      else label = t(currentLang, "planetSimDesignationHeading");
      return `${label} ${formatAmount(source.amount * EFFECT_SCALE, true)}`;
    });
    lines.push(`${t(currentLang, "planetSimTotalLabel")}: ${formatAmount(totals.housing * EFFECT_SCALE, true)}`);
    const tooltipTarget = statHousing.closest(".planet-header-stat") || statHousing;
    tooltipTarget.title = lines.join("\n");
    tooltipTarget.style.cursor = "help";
  }
  if (statAmenities) {
    statAmenities.textContent = formatAmount(totals.amenitiesTotal * EFFECT_SCALE, true);
    // Tooltip con el desglose de toda la producción de servicios del planeta.
    const lines = totals.amenitySources.map((source) => {
      let label;
      if (source.kind === "capital") label = t(currentLang, "planetSimCapitalHeading");
      else if (source.kind === "building") label = `${buildingDisplayName(buildingsById.get(source.id))}${source.count > 1 ? ` ×${source.count}` : ""}`;
      else if (source.kind === "job") label = `${formatAmount(source.assignedRaw)} ${jobName(source.jobId)}`;
      else if (source.kind === "civilians") label = `${formatAmount(source.assignedRaw)} ${t(currentLang, source.i18nKey)}`;
      else if (source.kind === "blocker") label = t(currentLang, BLOCKERS.find((blocker) => blocker.id === source.id).i18nKey);
      else if (source.kind === "planetModifier") label = t(currentLang, PLANET_MODIFIERS.find((modifier) => modifier.id === source.id).i18nKey);
      else label = t(currentLang, "planetSimDesignationHeading");
      return `${label} ${formatAmount(source.amount * EFFECT_SCALE, true)}`;
    });
    lines.push(`${t(currentLang, "planetSimTotalLabel")}: ${formatAmount(totals.amenitiesTotal * EFFECT_SCALE, true)}`);
    const tooltipTarget = statAmenities.closest(".planet-header-stat") || statAmenities;
    tooltipTarget.title = lines.join("\n");
    tooltipTarget.style.cursor = "help";
  }
  if (districtsUsedLabel) districtsUsedLabel.textContent = `${totalDistrictCount()} / ${planetSize}`;
}

/**
 * Especializaciones elegidas que dejan de cumplir sus requisitos (P7.4) o que el distrito del cuerpo celeste actual ya
 * no ofrece (P10.2: p. ej. al pasar de un planeta normal a una ecumenópolis): se quitan y se avisa. Los edificios de esas
 * ranuras quedan inactivos, no se borran.
 */
function pruneInvalidSpecializations() {
  const ctx = requirementContext();
  const reset = [];
  const allOptions = [...DISTRICTS.urban.specializationOptions, ...RESOURCE_DISTRICT_ORDER.flatMap((cat) => DISTRICTS[cat].specializationOptions)];
  const optionName = (optionId) => { const option = allOptions.find((entry) => entry.id === optionId); return option ? t(currentLang, option.i18nKey) : optionId; };
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
  if (reset.length) showNotice(t(currentLang, "planetSimSpecializationResetNotice")(reset.join(", ")));
  // P10.5: district groups the body does not have (Synaptic Lathe mining / agriculture) are emptied.
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (secondaryDistrictDef(cat).unavailable && districtState[cat].count) districtState[cat].count = 0;
  });
}

/** Size chosen by the user, kept while a megastructure with a fixed size is selected. */
let userPlanetSize = planetSize;

/** P10.3: apply the fixed size of a megastructure (input disabled) or restore the user's size. */
function syncPlanetSize() {
  const fixed = fixedPlanetSize();
  planetSize = fixed || userPlanetSize;
  if (planetSizeInput) {
    planetSizeInput.value = String(planetSize);
    planetSizeInput.disabled = Boolean(fixed);
    // P10.7: editable bodies (regular planets and converted worlds: Ecumenopolis, Hive / Machine / Nanite Worlds) show the
    // wiki size ranges; the input is the district slots, so features, blockers and modifiers can move it outside them.
    planetSizeInput.title = t(currentLang, fixed ? "planetSimFixedSizeTooltip" : "planetSimSizeRangeTooltip");
  }
}

function refresh() {
  syncCapitalToAuthority(); // before the size: the Synaptic Lathe capital adds Max Districts (P10.5)
  syncPlanetSize();
  pruneInvalidSpecializations();
  resolveSelectedSlot();
  const totals = computeTotals();
  renderSlots();
  renderStats(totals);
  renderActiveTabContent();
  renderSummary(totals);
  renderProduction(totals);
  renderConditions(totals);
  renderModifiers(totals);
  renderDepositFeatures();
  renderBlockers();
  renderPlanetModifiers();
  updatePlanetState({ planetSize });
}

function setLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  storeLang(currentLang);
  applyTranslations();
  refresh();
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

if (metaDescription && !metaDescription.dataset.i18nAttr) {
  metaDescription.setAttribute("content", t(currentLang, "planetSimMetaDescription"));
}

// Reacciona a lo que otros módulos escriben en el estado compartido: tipo de
// cuerpo celeste (filtra las designaciones), éticas/autoridad (bonos) y
// principios (requisitos de edificios).
// Solo se recalcula si esos datos han cambiado de verdad, para no entrar en
// bucle con las propias escrituras de este módulo (tamaño/población).
/**
 * Cambio de imperio guardado (P5.4): NO se borra ningún edificio. Los que no
 * cumplen los requisitos del nuevo imperio quedan inactivos (marco amarillo,
 * igual que al editar la pestaña Imperio a mano, P3.4) y se reactivan solos
 * si se vuelve a un imperio que los cumple; demolerlos es decisión del
 * usuario. Solo se avisa de cuántos han quedado inactivos por requisitos.
 */
const noticeEl = document.querySelector("#planet-sim-notice");
let noticeTimer = null;
export function showNotice(text) {
  if (!noticeEl) return;
  noticeEl.textContent = text;
  noticeEl.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { noticeEl.hidden = true; }, 10000);
}

/**
 * Captura de la configuración del planeta para guardarlo en la biblioteca (P6,
 * ver js/planet-library.js para el formato). No incluye el nombre ni el imperio:
 * de eso se ocupa js/planet-library-ui.js, que los toma del estado compartido.
 */
export function capturePlanetConfig() {
  const totals = computeTotals();
  const staffingOverrides = {};
  Object.entries(totals.jobCapacities).forEach(([jobId, capacity]) => {
    const staffed = jobAssignments[jobId];
    if (capacity > 0 && staffed !== undefined && staffed < capacity) staffingOverrides[jobId] = staffed;
  });
  const built = {};
  builtMap.forEach((buildingId, key) => { built[key] = buildingId; });
  return {
    celestialTypeId: getPlanetState().celestialTypeId,
    designationId: selectedDesignationId || null,
    planetSize,
    capitalTier: currentCapital().tier,
    districts: JSON.parse(JSON.stringify(districtState)),
    built,
    staffingOverrides,
    manualConditions: { ...manualConditions },
    civilians: civiliansRaw,
    // P10.5: optional field (Synaptic Lathe).
    neuralChips: neuralChipsRaw,
    // P10.8: optional field, strategic deposit chosen per strategic specialization (missing = the worst one).
    strategicDeposits: { ...strategicDepositChoice },
    // P10.8: optional field, blockers placed on the planet.
    blockerIds: [...selectedBlockers],
    // P10.8: optional field, planet modifiers chosen by the user.
    planetModifierIds: [...selectedPlanetModifiers]
  };
}

/**
 * Aplica un planeta guardado al simulador, sustituyendo lo que hubiera. Antes hay
 * que haber aplicado su imperio y su tipo de cuerpo celeste (la designación se
 * valida contra ese tipo y los requisitos de edificios contra el imperio). Lo que
 * ya no existe (especialización, edificio...) se ignora, nunca se inventa; los
 * edificios que no cumplen requisitos o cuya ranura está bloqueada se conservan
 * como inactivos (P3.4). Devuelve cuántos edificios han quedado inactivos.
 *
 * Simplificaciones: el tamaño se sube hasta el total de distritos si el archivo trae
 * más distritos que tamaño; los empleos con dotación reducida se restauran solo si
 * el empleo sigue existiendo (se recorta a su capacidad actual).
 */
export function applyPlanetConfig(config) {
  selectedDesignationId = getDesignation(config.designationId) ? config.designationId : "";

  // Distritos: solo ids de especialización que existen.
  const urban = config.districts?.urban || {};
  districtState.urban.count = Math.max(primaryMinCount(), Number.isFinite(Number(urban.count)) && urban.count !== undefined ? Number(urban.count) : URBAN_MIN_COUNT);
  districtState.urban.slots = [0, 1].map((index) => (primaryOption(urban.slots?.[index]) ? urban.slots[index] : null));
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const saved = config.districts?.[cat] || {};
    const count = Math.max(0, Number(saved.count) || 0);
    districtState[cat].count = count;
    districtState[cat].optionId = count > 0 && secondaryOption(cat, saved.optionId) ? saved.optionId : null;
    // P10.4: optional field (older planets have no cap → not set).
    districtState[cat].cap = Number.isInteger(saved.cap) && saved.cap >= 0 ? saved.cap : null;
  });
  // P10.3: a megastructure keeps its fixed size (syncPlanetSize); the saved size is the user's size for other bodies.
  userPlanetSize = Math.max(Math.floor(Number(config.planetSize)) || 1, fixedPlanetSize() ? 1 : totalDistrictCount());
  syncPlanetSize();

  // Edificio capital: el nivel guardado, o el más alto que no lo supere si el conjunto de la autoridad no lo tiene.
  const capitalSet = currentCapitalSet();
  let tierIndex = 0;
  capitalSet.forEach((entry, index) => { if (entry.tier <= (Number(config.capitalTier) || 1)) tierIndex = index; });
  capitalTierIndex = tierIndex;
  lastCapitalSet = capitalSet;

  // Edificios y dotación: se parte de cero y se restauran las reducciones tras recalcular capacidades.
  builtMap.clear();
  Object.entries(config.built || {}).forEach(([key, buildingId]) => {
    if (buildingsById.has(buildingId)) builtMap.set(key, buildingId);
  });
  Object.keys(jobAssignments).forEach((jobId) => { delete jobAssignments[jobId]; });
  Object.keys(jobCapacityMemo).forEach((jobId) => { delete jobCapacityMemo[jobId]; });
  selectedSlotKey = null;
  catalogSlotSignature = null;

  // P9.7: valores manuales de condiciones (campo opcional; los planetas antiguos no lo tienen → 0).
  ["happiness", "stability"].forEach((key) => {
    const value = Number(config.manualConditions?.[key]);
    manualConditions[key] = Number.isFinite(value) ? Math.max(-MANUAL_CONDITION_LIMIT, Math.min(MANUAL_CONDITION_LIMIT, value)) : 0;
  });

  // P16.12: civiles (campo opcional; los planetas antiguos no lo tienen → 0).
  civiliansRaw = sanitizeCivilians(config.civilians);
  // P10.5: Neural Chips (optional field; older planets → 0).
  neuralChipsRaw = sanitizeCivilians(config.neuralChips);
  // P10.8: strategic deposits (optional field; unknown ids are ignored, the worst deposit is used instead).
  Object.keys(strategicDepositChoice).forEach((key) => { delete strategicDepositChoice[key]; });
  selectedBlockers.clear();
  selectedPlanetModifiers.clear();
  (Array.isArray(config.planetModifierIds) ? config.planetModifierIds : []).forEach((id) => { if (PLANET_MODIFIERS.some((modifier) => modifier.id === id)) selectedPlanetModifiers.add(id); });
  (Array.isArray(config.blockerIds) ? config.blockerIds : []).forEach((id) => { if (BLOCKERS.some((blocker) => blocker.id === id)) selectedBlockers.add(id); });
  Object.entries(config.strategicDeposits || {}).forEach(([specializationId, depositId]) => {
    if (STRATEGIC_DEPOSITS.some((deposit) => deposit.id === depositId && deposit.unlocks === specializationId)) strategicDepositChoice[specializationId] = depositId;
  });

  updatePlanetState({ designationId: selectedDesignationId || null });
  renderDesignationSelect();
  refresh();

  Object.entries(config.staffingOverrides || {}).forEach(([jobId, staffed]) => {
    const capacity = jobCapacityMemo[jobId];
    if (capacity !== undefined) jobAssignments[jobId] = Math.max(0, Math.min(capacity, Number(staffed) || 0));
  });
  refresh();

  const unlocked = unlockedKeys();
  let inactive = 0;
  builtMap.forEach((buildingId, key) => {
    if (inactiveReason(key, buildingsById.get(buildingId), unlocked)) inactive += 1;
  });
  return inactive;
}

onEmpireSwitched(({ name }) => {
  let inactive = 0;
  builtMap.forEach((buildingId) => {
    if (!isBuildingAvailable(buildingsById.get(buildingId))) inactive += 1;
  });
  refresh();
  showNotice(t(currentLang, "planetSimEmpireSwitchNotice")(name, inactive));
});

// Políticas que se restablecen solas (P16.3): cambio entre imperio normal y gestalt, o requisitos que dejan de cumplirse.
onPoliciesReset(({ typeChange, gestalt, policyIds, changes }) => {
  const optionName = (groupId, optionId) => t(currentLang, getPolicyOption(groupId, optionId).i18nKey);
  if (typeChange) {
    const trade = optionName("trade", policyIds.trade);
    showNotice(t(currentLang, gestalt ? "planetSimPolicyTypeChangeGestalt" : "planetSimPolicyTypeChangeIndividualist")(trade));
    return;
  }
  const parts = changes.map((change) => t(currentLang, "planetSimPolicyResetItem")(t(currentLang, getPolicyGroup(change.group).i18nKey), optionName(change.group, change.from), optionName(change.group, change.to)));
  showNotice(t(currentLang, "planetSimPolicyResetNotice")(parts.join(" ")));
});

// Edictos desactivados solos por requisitos (P18.3).
onEdictsRemoved(({ removed }) => {
  const names = removed.map((id) => { const edict = getEdict(id); return edict ? t(currentLang, edict.i18nKey) : id; });
  showNotice(t(currentLang, "planetSimEdictsRemovedNotice")(names.join(", ")));
});

let lastRelevantKey = "";
onPlanetStateChange((state) => {
  const key = `${state.celestialTypeId}|${(state.ethicIds || []).join(",")}|${state.authorityId}|${(state.civicIds || []).join(",")}|${state.speciesType}|${JSON.stringify(state.policyIds || {})}|${(state.edictIds || []).join(",")}`;
  if (key === lastRelevantKey) return;
  lastRelevantKey = key;
  renderDesignationSelect();
  refresh();
});

applyTranslations();
setActiveTab("buildings");
setMainTab("planet");
refresh();

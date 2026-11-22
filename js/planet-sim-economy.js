/**
 * Planet simulator: economy engine. computeTotals() turns the state into jobs, resources
 * produced/consumed/net with their breakdown, housing, amenities and conditions;
 * syncJobAssignments() keeps the staffing within the job capacities.
 */

import { JOBS, JOB_OUTPUTS, CIVILIAN_OUTPUTS, JOB_EFFECTS, divideEffect, GESTALT_JOB_UPKEEP, JOB_WORKFORCE_SCALING, SPECIES_TYPES, allowedSpeciesTypes, RESOURCE_DISTRICT_ORDER, JOB_RESOURCE_MULT } from "./planet-data.js";
import { resolveJobSwaps, swapMap, stackedSwapChanges, swapGestaltUpkeep, SWAP_BASES } from "./job-swaps.js";
import { SPECIAL_DISTRICTS, SPECIAL_BODY_JOBS } from "./body-type-data.js";
import { getStackingRules, combineFraction, stackFactor } from "./stacking-rules.js";
import { getPlanetState } from "./planet-state.js";
import { getEdict } from "./edict-data.js";
import { getPolicyOption } from "./policy-data.js";
import { ethicsSatisfy, GESTALT_CONSCIOUSNESS, ETHIC_EFFECTS, AUTHORITY_EFFECTS, authorityVariant } from "./empire-data.js";
import { buildingRequirementsMet } from "./building-requirements.js";
import { BRANCH_OFFICE_VALUE, ILLEGAL_BRANCH_RULES, branchBuildingVariant, branchBuildingJobs, branchJobTrade, isIllegalVariant } from "./branch-office-data.js";
import { getDesignation } from "./designation-data.js";
import { unlockedKeys, inactiveReason, currentCapital, primaryDistrictDef, specializationJobMultiplier, primaryOption, secondaryDistrictDef, secondaryOption, secondaryHousingPenaltyMultiplier, districtBaseJobs, specializationJobs, requirementContext, isLatheLayout, activeBranchBuildings, swapContext, activePlanetModifiers, featureJobBonuses, bodyRules, activeBlockers, branchHostBlock } from "./planet-sim-rules.js";
import { builtMap, buildingsById, districtState, branchOffice, jobAssignments, manualConditions, jobCapacityMemo, sim } from "./planet-sim-state.js";

/**
 * Recalcula, a partir del capital, los distritos y las ranuras activas,
 * todo lo que puede derivarse: empleos totales, producción/consumo de
 * recursos, vivienda, comodidades/servicios y efectos sin recurso.
 */
export function computeTotals() {
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

  // P21.2: jobs are added unswapped; the job swaps (js/job-swaps.js) are applied once every source is known (after the
  // branch office), since their conditions depend on buildings, specializations and branch office buildings.
  const addJobCapacity = (jobId, rawAmount) => {
    if (!rawAmount) return;
    jobCapacities[jobId] = (jobCapacities[jobId] || 0) + rawAmount;
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
  const buildingChipPops = isLatheLayout() ? divideEffect(sim.neuralChipsRaw) : 0;
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

  // P19.3: branch office of another empire (GDD §5.2). Its jobs work for this planet; "Per 100 X: +a Trade" is a per-job
  // bonus on every X job of the colony (own breakdown line, before job efficiency); "% Trade from jobs" is step 4;
  // "% Worker pop resource output" is stratum output; happiness and crime are condition points; the building upkeep is
  // paid by this planet (owner decision 2026-11-20). Owner effects are never applied here.
  const branchJobFlat = {}; // jobId -> { resourceId: amount per job }
  const branchConditions = { happiness: 0, crime: 0 };
  const branchBuildings = activeBranchBuildings();
  branchBuildings.forEach((building) => {
    const variant = branchBuildingVariant(building, branchOffice.illegal) || building;
    const source = { kind: "branch", id: variant.id };
    Object.entries(branchBuildingJobs(building, branchOffice.illegal)).forEach(([jobId, raw]) => addJobCapacity(jobId, raw));
    const addFlat = (jobId, resourceId, amount) => {
      if (!amount) return;
      branchJobFlat[jobId] = branchJobFlat[jobId] || {};
      branchJobFlat[jobId][resourceId] = (branchJobFlat[jobId][resourceId] || 0) + amount;
      pushModifier(source, "jobFlat", { job: jobId, resource: resourceId }, amount);
    };
    branchJobTrade(building, branchOffice.illegal, branchOffice.ownerCivicIds).forEach(({ jobs, total }) => jobs.forEach((jobId) => addFlat(jobId, "trade", total)));
    const colony = building.colony || {};
    // "+100 Amenities per 100 Medical Workers": wiki amenities are ×100, so +1 amenity per staffed job.
    if (colony.amenitiesPer100) colony.amenitiesPer100.jobs.forEach((jobId) => addFlat(jobId, "amenities", divideEffect(colony.amenitiesPer100.amount)));
    if (colony.tradeFromJobsPct) buildingJobResourcePcts.push({ pcts: { trade: colony.tradeFromJobsPct }, source });
    if (colony.workerOutputPct) pushModifier(source, "stratumOutput", { stratum: "worker" }, colony.workerOutputPct / 100);
    if (colony.happinessPct) {
      branchConditions.happiness += colony.happinessPct;
      pushModifier(source, "conditionFlat", { stat: "happiness" }, colony.happinessPct);
    }
    const crime = isIllegalVariant(building, branchOffice.illegal) ? ILLEGAL_BRANCH_RULES.crime : (branchOffice.illegal ? building.illegalCrime || 0 : 0);
    if (crime) {
      branchConditions.crime += crime;
      pushModifier(source, "conditionFlat", { stat: "crime" }, crime);
    }
    Object.entries(building.upkeep || {}).forEach(([resourceId, amount]) => addSignedResource(resourceId, -amount, "branchBuildings"));
  });

  // P21.2: job swaps (GDD §6.1). Every job of a base job becomes the winning swap (highest weight among the met ones).
  const swapCtx = swapContext(activeBuildings.map(([, building]) => building.id),
    branchBuildings.map((building) => (branchBuildingVariant(building, branchOffice.illegal) || building).id));
  const resolvedSwaps = resolveJobSwaps(swapCtx);
  const preSwapJobIds = Object.keys(jobCapacities).filter((jobId) => jobCapacities[jobId] > 0);
  const appliedSwaps = swapMap(resolvedSwaps);
  Object.entries(appliedSwaps).forEach(([base, swapped]) => {
    if (!jobCapacities[base]) return;
    jobCapacities[swapped] = (jobCapacities[swapped] || 0) + jobCapacities[base];
    delete jobCapacities[base];
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
  const designation = getDesignation(sim.selectedDesignationId);
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
  // P10.6: a Wilderness Hive Mind has the Mutualistic Intelligence effects instead.
  const authorityShown = authorityVariant(empireModifierState.authorityId, empireModifierState.originId)?.id || empireModifierState.authorityId;
  noteEmpireEffects("authority", authorityShown, AUTHORITY_EFFECTS[authorityShown]);
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
  const swapStackEffects = {}; // P21.2: jobId -> { stat: per job } stacked "With X swap conditions" effects
  Object.keys(jobCapacities).forEach((jobId) => {
    const unit = { ...(JOB_OUTPUTS[jobId] || {}) };
    // P21.2: a swapped job inherits the modifiers of its base job (building bonuses, efficiency, upkeep, edicts, branch).
    const modJobIds = [jobId, ...(SWAP_BASES[jobId] || [])];
    const mergeByJob = (map) => modJobIds.reduce((merged, id) => {
      Object.entries(map[id] || {}).forEach(([resourceId, amount]) => { merged[resourceId] = (merged[resourceId] || 0) + amount; });
      return merged;
    }, {});
    // Conciencia gestalt: el mantenimiento en bienes de consumo se sustituye por el
    // del recurso que consume la especie elegida (ver GESTALT_JOB_UPKEEP).
    // P21.2: a swapped job uses its own wiki variant or inherits its base job's.
    const swapUpkeep = gestaltEmpire ? swapGestaltUpkeep(jobId, { ...swapCtx, speciesType: speciesType.id }) : null;
    const gestaltUpkeep = gestaltEmpire ? (swapUpkeep ? swapUpkeep.inherit || null : GESTALT_JOB_UPKEEP[jobId]) : null;
    if (swapUpkeep?.replace) {
      if (!swapUpkeep.extra) delete unit.consumer_goods;
      Object.entries(swapUpkeep.replace).forEach(([resourceId, amount]) => { unit[resourceId] = (unit[resourceId] || 0) + amount; });
    } else if (gestaltUpkeep?.fixed) {
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
    // P21.2: output changes of the other met swaps listed on this job ("With X swap conditions") and its zone change
    // (Angler under Exotic Gas Capture): part of the job's own output, own breakdown line and modifier source.
    const preStackUnit = { ...unit };
    stackedSwapChanges(jobId, swapCtx).forEach((change) => {
      const source = change.kind === "zone" ? { kind: "specialization", id: change.id } : { kind: "jobSwap", id: change.id };
      Object.entries(change.output).forEach(([resourceId, amount]) => {
        unit[resourceId] = (unit[resourceId] || 0) + amount;
        pushModifier(source, "jobFlat", { job: jobId, resource: resourceId }, amount);
      });
      Object.entries(change.effects).forEach(([stat, amount]) => {
        swapStackEffects[jobId] = swapStackEffects[jobId] || {};
        swapStackEffects[jobId][stat] = (swapStackEffects[jobId][stat] || 0) + amount;
      });
    });
    const baseUnit = { ...unit };
    Object.entries(mergeByJob(jobBonuses)).forEach(([resourceId, amount]) => {
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
    Object.entries(mergeByJob(edictJobFlat)).forEach(([resourceId, amount]) => {
      unit[resourceId] = (unit[resourceId] || 0) + amount;
    });
    const edictUnit = { ...unit };
    // P19.3: per-job bonuses of the branch office buildings (own breakdown line).
    Object.entries(mergeByJob(branchJobFlat)).forEach(([resourceId, amount]) => {
      unit[resourceId] = (unit[resourceId] || 0) + amount;
    });
    const bonusedUnit = { ...unit };
    // Eficacia laboral (designación + edificios): puede ser positiva o negativa
    // (+10%, -5%...) y solo afecta a la producción. El cambio de mantenimiento
    // (p. ej. -10% de mantenimiento) solo afecta al mantenimiento.
    // La eficacia de designación, edificios y estrato forma un solo montón (ver stacking-rules.js).
    const efficiencyFactor = stackFactor(stacking.jobEfficiency, [
      ...modJobIds.flatMap((id) => modifierValues("jobEfficiency", { job: id })),
      ...modifierValues("stratumEfficiency", { stratum: JOBS[jobId]?.stratum }),
      ...modifierValues("stratumOutput", { stratum: JOBS[jobId]?.stratum })
    ]);
    const upkeepFactor = stackFactor(stacking.jobUpkeep, [...modJobIds.flatMap((id) => modifierValues("jobUpkeep", { job: id })), ...modifierValues("jobUpkeep", { job: "all" })]);
    Object.keys(unit).forEach((resourceId) => {
      if (unit[resourceId] > 0) unit[resourceId] *= efficiencyFactor;
      else if (unit[resourceId] < 0) unit[resourceId] *= upkeepFactor;
    });
    jobUnitOutputs[jobId] = unit;

    const assignedRaw = jobAssignments[jobId] || 0;
    const assigned = divideEffect(assignedRaw);
    Object.entries(unit).forEach(([resourceId, perJob]) => {
      addSignedResource(resourceId, perJob * assigned);
      recordBreakdown(resourceId, "jobsBase", (preStackUnit[resourceId] || 0) * assigned);
      recordBreakdown(resourceId, "jobSwapStack", ((baseUnit[resourceId] || 0) - (preStackUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "jobsBonus", ((buildingUnit[resourceId] || 0) - (baseUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "jobWorkforceScaling", ((scaledUnit[resourceId] || 0) - (buildingUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "edictJobFlat", ((edictUnit[resourceId] || 0) - (scaledUnit[resourceId] || 0)) * assigned);
      recordBreakdown(resourceId, "branchJobFlat", ((bonusedUnit[resourceId] || 0) - (edictUnit[resourceId] || 0)) * assigned);
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
  const neuralChipPops = isLatheLayout() ? divideEffect(sim.neuralChipsRaw) : 0;
  if (neuralChipPops > 0) {
    const chip = SPECIAL_BODY_JOBS.neural_chip;
    Object.entries(chip.outputs).forEach(([resourceId, perJob]) => {
      const amount = perJob * neuralChipPops * (sim.neuralChipsRaw / chip.scaling.output);
      addSignedResource(resourceId, amount, "neuralChips");
      jobProduced[resourceId] = (jobProduced[resourceId] || 0) + amount;
    });
    // Job upkeep modifiers (designation, buildings) apply to the chip jobs too.
    const chipUpkeepFactor = stackFactor(stacking.jobUpkeep, [...modifierValues("jobUpkeep", { job: "neural_chip" }), ...modifierValues("jobUpkeep", { job: "all" })]);
    Object.entries(chip.upkeep).forEach(([resourceId, perJob]) => {
      addSignedResource(resourceId, perJob * neuralChipPops * (sim.neuralChipsRaw / chip.scaling.upkeep) * chipUpkeepFactor, "neuralChips");
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
    const branchFraction = kindFraction("branch");
    addSignedResource(resourceId, fromJobs * (fraction - policyFraction - celestialFraction - jobFraction - designationFraction - specializationFraction - planetModifierFraction - branchFraction), "jobBuildingMult");
    if (branchFraction) addSignedResource(resourceId, fromJobs * branchFraction, "branchJobMult");
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
  const civilianPops = isLatheLayout() ? 0 : divideEffect(sim.civiliansRaw); // P10.5: every Lathe pop is a Neural Chip
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
    if (civilianDef.output.amenities) amenitySources.push({ kind: "civilians", i18nKey: civilianDef.i18nKey, assignedRaw: sim.civiliansRaw, amount: civilianDef.output.amenities * civilianPops });
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
  const happiness = { applicable: !gestaltEmpire && pops > 0, base: HAPPINESS_BASE, ...amenitiesEffect, manual: gestaltEmpire ? 0 : manualConditions.happiness, edicts: gestaltEmpire ? 0 : edictConditions.happiness, body: bodyHappiness, planetModifiers: gestaltEmpire ? 0 : planetModifierConditions.happiness, branchOffice: gestaltEmpire ? 0 : branchConditions.happiness, value: HAPPINESS_BASE };
  if (happiness.applicable) happiness.value = Math.max(0, Math.min(100, HAPPINESS_BASE + amenitiesEffect.effect + happiness.edicts + happiness.body + happiness.planetModifiers + happiness.branchOffice + happiness.manual));
  // P9.3 / P9.6: estabilidad automática. Base 50 + (no gestalt) bono de aprobación o (gestalt) efecto de servicios − penalización
  // por vivienda faltante (40 · faltante / necesaria). Aprobación = felicidad (todos los pops son del mismo estrato y tienen la
  // misma felicidad); la wiki redondea hacia abajo la aprobación mostrada y el bono de estabilidad.
  // Estabilidad de los empleos (JOB_EFFECTS.stability × empleos cubiertos, igual que las píldoras de "otros efectos"). Es un
  // modificador, no un recurso: no recibe el efecto de la estabilidad (paso 4a) ni la eficacia de los empleos.
  // P21.2: plus the stacked swap effects (Technophant with Noble conditions...).
  const jobEffect = (stat) => Object.keys(jobCapacities).reduce((sum, jobId) => sum + ((JOB_EFFECTS[jobId]?.[stat] || 0) + (swapStackEffects[jobId]?.[stat] || 0)) * divideEffect(jobAssignments[jobId] || 0), 0);
  const stabilityFromJobs = jobEffect("stability");
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
  const crimeFromJobs = jobEffect("crime");
  const crimeFromEdicts = pops > 0 ? edictConditions.crime : 0;
  const crimeFromModifiers = pops > 0 ? planetModifierConditions.crime : 0;
  const crimeFromBranch = pops > 0 ? branchConditions.crime : 0;
  const crime = { gestalt: gestaltEmpire, fromHappiness: crimeFromHappiness, fromJobs: crimeFromJobs, fromEdicts: crimeFromEdicts, fromModifiers: crimeFromModifiers, fromBranch: crimeFromBranch, total: Math.max(0, crimeFromHappiness + crimeFromJobs + crimeFromEdicts + crimeFromModifiers + crimeFromBranch) };
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
  // P19.3: branch office value (info only): the owner gains a share of the colony's trade, read here as the trade the jobs
  // and civilians produce before the trade conversion (assumption, GDD §5.2). Never charged to this planet.
  const branchValueInfo = branchOffice.present && !branchHostBlock()
    ? { trade: tradeFromJobs, illegal: branchOffice.illegal, value: branchOffice.illegal ? null : tradeFromJobs * BRANCH_OFFICE_VALUE.legal,
      min: tradeFromJobs * BRANCH_OFFICE_VALUE.illegal.min, max: tradeFromJobs * BRANCH_OFFICE_VALUE.illegal.max, buildings: branchBuildings.map((building) => building.id) }
    : null;
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

  return { jobCapacities, jobSwaps: { resolved: resolvedSwaps, applied: appliedSwaps, context: swapCtx, baseJobIds: preSwapJobIds }, jobUnitOutputs, resourceTotals, producedTotals, consumedTotals, breakdown, inconsistencies, conditions, tradeConversion, branchOffice: branchValueInfo, externalTotals, modifiers: [...modifierMap.values()], housing, housingSources, amenities, amenitiesTotal, amenitySources };
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

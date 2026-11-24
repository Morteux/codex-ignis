/**
 * Planet simulator: capture and apply a planet configuration (saved planets of the Library,
 * format in js/planet-library.js).
 */

import { RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { PLANET_MODIFIERS } from "./planet-modifier-data.js";
import { STRATEGIC_DEPOSITS, BLOCKERS } from "./planetary-features-data.js";
import { updatePlanetState, getPlanetState } from "./planet-state.js";
import { getBranchBuilding, sanitizeOwnerCivics } from "./branch-office-data.js";
import { getDesignation } from "./designation-data.js";
import { refresh } from "./planet-sim.js";
import { computeTotals } from "./planet-sim-economy.js";
import { syncBranchOwner } from "./planet-sim-branch-tab.js";
import { syncPlanetSize, renderDesignationSelect } from "./planet-sim-planet-ui.js";
import { currentCapital, primaryMinCount, primaryOption, secondaryOption, fixedPlanetSize, totalDistrictCount, currentCapitalSet, sanitizeCivilians, unlockedKeys, inactiveReason } from "./planet-sim-rules.js";
import { jobAssignments, builtMap, districtState, manualConditions, strategicDepositChoice, selectedBlockers, selectedPlanetModifiers, branchOffice, URBAN_MIN_COUNT, buildingsById, jobCapacityMemo, MANUAL_CONDITION_LIMIT, BRANCH_MAX_SLOTS, sim } from "./planet-sim-state.js";

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
    designationId: sim.selectedDesignationId || null,
    planetSize: sim.planetSize,
    capitalTier: currentCapital().tier,
    districts: JSON.parse(JSON.stringify(districtState)),
    built,
    staffingOverrides,
    manualConditions: { ...manualConditions },
    civilians: sim.civiliansRaw,
    // P10.5: optional field (Synaptic Lathe).
    neuralChips: sim.neuralChipsRaw,
    // P10.8: optional field, strategic deposit chosen per strategic specialization (missing = the worst one).
    strategicDeposits: { ...strategicDepositChoice },
    // P10.8: optional field, blockers placed on the planet.
    blockerIds: [...selectedBlockers],
    // P10.8: optional field, planet modifiers chosen by the user.
    planetModifierIds: [...selectedPlanetModifiers],
    // P19.4: optional field, another empire's branch office (null = none ever set up).
    // P19.6: ownerEmpireId / ownerEmpireName only when the owner is a saved empire profile.
    branchOffice: branchOffice.present || branchOffice.ownerCivicIds.length || branchOffice.ownerEmpireId || branchOffice.slots.some(Boolean)
      ? {
        present: branchOffice.present, illegal: branchOffice.illegal, ownerCivicIds: [...branchOffice.ownerCivicIds],
        ...(branchOffice.ownerEmpireId ? { ownerEmpireId: branchOffice.ownerEmpireId, ownerEmpireName: branchOffice.ownerEmpireName || "" } : {}),
        slots: [...branchOffice.slots]
      }
      : null
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
  sim.selectedDesignationId = getDesignation(config.designationId) ? config.designationId : "";

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
  sim.userPlanetSize = Math.max(Math.floor(Number(config.planetSize)) || 1, fixedPlanetSize() ? 1 : totalDistrictCount());
  syncPlanetSize();

  // Edificio capital: el nivel guardado, o el más alto que no lo supere si el conjunto de la autoridad no lo tiene.
  const capitalSet = currentCapitalSet();
  let tierIndex = 0;
  capitalSet.forEach((entry, index) => { if (entry.tier <= (Number(config.capitalTier) || 1)) tierIndex = index; });
  sim.capitalTierIndex = tierIndex;
  sim.lastCapitalSet = capitalSet;

  // Edificios y dotación: se parte de cero y se restauran las reducciones tras recalcular capacidades.
  builtMap.clear();
  Object.entries(config.built || {}).forEach(([key, buildingId]) => {
    if (buildingsById.has(buildingId)) builtMap.set(key, buildingId);
  });
  Object.keys(jobAssignments).forEach((jobId) => { delete jobAssignments[jobId]; });
  Object.keys(jobCapacityMemo).forEach((jobId) => { delete jobCapacityMemo[jobId]; });
  sim.selectedSlotKey = null;
  sim.catalogSlotSignature = null;

  // P9.7: valores manuales de condiciones (campo opcional; los planetas antiguos no lo tienen → 0).
  ["happiness", "stability"].forEach((key) => {
    const value = Number(config.manualConditions?.[key]);
    manualConditions[key] = Number.isFinite(value) ? Math.max(-MANUAL_CONDITION_LIMIT, Math.min(MANUAL_CONDITION_LIMIT, value)) : 0;
  });

  // P16.12: civiles (campo opcional; los planetas antiguos no lo tienen → 0).
  sim.civiliansRaw = sanitizeCivilians(config.civilians);
  // P10.5: Neural Chips (optional field; older planets → 0).
  sim.neuralChipsRaw = sanitizeCivilians(config.neuralChips);
  // P10.8: strategic deposits (optional field; unknown ids are ignored, the worst deposit is used instead).
  Object.keys(strategicDepositChoice).forEach((key) => { delete strategicDepositChoice[key]; });
  selectedBlockers.clear();
  selectedPlanetModifiers.clear();
  (Array.isArray(config.planetModifierIds) ? config.planetModifierIds : []).forEach((id) => { if (PLANET_MODIFIERS.some((modifier) => modifier.id === id)) selectedPlanetModifiers.add(id); });
  (Array.isArray(config.blockerIds) ? config.blockerIds : []).forEach((id) => { if (BLOCKERS.some((blocker) => blocker.id === id)) selectedBlockers.add(id); });
  Object.entries(config.strategicDeposits || {}).forEach(([specializationId, depositId]) => {
    if (STRATEGIC_DEPOSITS.some((deposit) => deposit.id === depositId && deposit.unlocks === specializationId)) strategicDepositChoice[specializationId] = depositId;
  });

  // P19.4: branch office (optional field; older planets have none). Unknown civics/buildings are dropped, civics past
  // the cap or incompatible with an earlier one are dropped, illegal needs Criminal Heritage.
  const savedBranch = config.branchOffice || {};
  const ownerCivicIds = sanitizeOwnerCivics(savedBranch.ownerCivicIds);
  branchOffice.present = savedBranch.present === true;
  branchOffice.ownerCivicIds = ownerCivicIds;
  branchOffice.illegal = savedBranch.illegal === true && ownerCivicIds.includes("civicCriminalHeritage");
  branchOffice.slots = Array.from({ length: BRANCH_MAX_SLOTS }, (_, index) => (getBranchBuilding(savedBranch.slots?.[index]) ? savedBranch.slots[index] : null));
  // P19.6: owner empire profile (optional); while it exists and is corporate its current civics and name win.
  branchOffice.ownerEmpireId = typeof savedBranch.ownerEmpireId === "string" && savedBranch.ownerEmpireId ? savedBranch.ownerEmpireId : null;
  branchOffice.ownerEmpireName = branchOffice.ownerEmpireId && typeof savedBranch.ownerEmpireName === "string" ? savedBranch.ownerEmpireName : null;
  syncBranchOwner();

  updatePlanetState({ designationId: sim.selectedDesignationId || null });
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

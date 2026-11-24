/**
 * Planet simulator, Branch offices tab: passes the branch office state to js/branch-offices-ui.js.
 *
 * P19.6: the owner can be a saved empire profile that is a megacorporation. While that profile
 * exists and is still corporate, its current civics (only BRANCH_OWNER_CIVICS, at most 3) and name
 * replace the copy in `branchOffice`; if it is deleted or stops being corporate, the copy is kept.
 */

import { getLang } from "./page-shell.js";
import { branchSlotCount, branchOwnerContext, sanitizeOwnerCivics, isBranchOwnerProfile } from "./branch-office-data.js";
import { renderBranchOffices } from "./branch-offices-ui.js";
import { getEmpire, listEmpires, onEmpiresChange } from "./empire-profiles.js";
import { refresh } from "./planet-sim.js";
import { branchHostBlock, currentCapital, requirementContext } from "./planet-sim-rules.js";
import { branchOffice } from "./planet-sim-state.js";
import { describeUnmetRule } from "./planet-sim-text.js";

const branchesEl = document.querySelector("#branch-offices");

/** Copies the owner profile's civics and name into the branch office; returns whether anything changed. */
export function syncBranchOwner() {
  if (!branchOffice.ownerEmpireId) return false;
  const profile = getEmpire(branchOffice.ownerEmpireId);
  if (!isBranchOwnerProfile(profile)) return false;
  const civicIds = sanitizeOwnerCivics(profile.civicIds);
  const illegal = branchOffice.illegal && civicIds.includes("civicCriminalHeritage");
  const changed = profile.name !== branchOffice.ownerEmpireName || illegal !== branchOffice.illegal
    || civicIds.join() !== branchOffice.ownerCivicIds.join();
  Object.assign(branchOffice, { ownerEmpireName: profile.name, ownerCivicIds: civicIds, illegal });
  return changed;
}

function selectOwnerEmpire(empireId) {
  if (!empireId) {
    // Custom owner: the copied civics stay as an editable starting point.
    Object.assign(branchOffice, { ownerEmpireId: null, ownerEmpireName: null });
  } else {
    branchOffice.ownerEmpireId = empireId;
    syncBranchOwner();
  }
  refresh();
}

let lastTotals = null;

// A linked owner may change (civics, name, gone) → full refresh; otherwise only the owner list changes.
onEmpiresChange(() => {
  if (syncBranchOwner() || branchOffice.ownerEmpireId) refresh();
  else renderBranchTab(lastTotals);
});

export function renderBranchTab(totals) {
  if (!branchesEl) return;
  lastTotals = totals;
  const linked = Boolean(branchOffice.ownerEmpireId) && isBranchOwnerProfile(getEmpire(branchOffice.ownerEmpireId));
  renderBranchOffices(branchesEl, {
    value: totals?.branchOffice || null,
    lang: getLang(),
    branch: branchOffice,
    ownerEmpires: listEmpires().filter(isBranchOwnerProfile).map((profile) => ({ id: profile.id, name: profile.name })),
    ownerStatus: branchOffice.ownerEmpireId ? (linked ? "linked" : "missing") : "custom",
    hostBlockKey: branchHostBlock(),
    slotCount: branchSlotCount(currentCapital().tier),
    capitalTier: currentCapital().tier,
    ownerCtx: branchOwnerContext(branchOffice),
    hostCtx: requirementContext(),
    describeRule: describeUnmetRule,
    onChange: (patch) => { Object.assign(branchOffice, patch); refresh(); },
    onOwnerEmpireChange: selectOwnerEmpire,
    onSlotChange: (index, buildingId) => { branchOffice.slots[index] = buildingId; refresh(); }
  });
}

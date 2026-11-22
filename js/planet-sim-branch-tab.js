/**
 * Planet simulator, Branch offices tab: passes the branch office state to js/branch-offices-ui.js.
 */

import { getLang } from "./page-shell.js";
import { branchSlotCount, branchOwnerContext } from "./branch-office-data.js";
import { renderBranchOffices } from "./branch-offices-ui.js";
import { refresh } from "./planet-sim.js";
import { branchHostBlock, currentCapital, requirementContext } from "./planet-sim-rules.js";
import { branchOffice } from "./planet-sim-state.js";
import { describeUnmetRule } from "./planet-sim-text.js";

const branchesEl = document.querySelector("#branch-offices");

export function renderBranchTab(totals) {
  if (!branchesEl) return;
  renderBranchOffices(branchesEl, {
    value: totals?.branchOffice || null,
    lang: getLang(),
    branch: branchOffice,
    hostBlockKey: branchHostBlock(),
    slotCount: branchSlotCount(currentCapital().tier),
    capitalTier: currentCapital().tier,
    ownerCtx: branchOwnerContext(branchOffice),
    hostCtx: requirementContext(),
    describeRule: describeUnmetRule,
    onChange: (patch) => { Object.assign(branchOffice, patch); refresh(); },
    onSlotChange: (index, buildingId) => { branchOffice.slots[index] = buildingId; refresh(); }
  });
}

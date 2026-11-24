/**
 * Sucursales tab (P19.2): a branch office placed on this planet by another
 * (corporate) empire. The state lives in js/planet-sim.js (it is saved with
 * the planet, P19.4); this module only draws it, like js/edicts-ui.js.
 *
 * Layout: host check → "branch office on this planet" toggle → owner (civics,
 * legal / Criminal Heritage illegal) → building slots (by host capital tier).
 * Owner effects are greyed out: they go to the corporate empire, never to
 * this planet (GDD §5.2). Effects on the planet are computed in js/planet-sim.js (P19.3).
 */

import { t } from "./i18n.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { RESOURCES } from "./planet-data.js";
import { num, resourceName as resourceNameIn, jobName } from "./sim-text-helpers.js";
import { civicsConflict, MAX_CIVICS } from "./empire-data.js";
import { unmodelledRequirements } from "./building-requirements.js";
import {
  BRANCH_OFFICE_BUILDINGS, BRANCH_OFFICE_SLOTS_BY_TIER, BRANCH_OWNER_CIVICS, ILLEGAL_BRANCH_RULES,
  branchBuildingVariant, branchBuildingUnmet, getBranchBuilding, branchBuildingJobs, branchJobTrade, isIllegalVariant,
  branchBuildingLimitReached
} from "./branch-office-data.js";

const MAX_SLOTS = Math.max(...Object.values(BRANCH_OFFICE_SLOTS_BY_TIER));
const TIER_NUMERALS = ["I", "II", "III", "IV", "V"];
const KIND_I18N_KEYS = { corporate: "branchKindCorporate", civic: "branchKindCivic", ascension: "branchKindAscension" };

/** Resource name, plus the two owner effects that are not resources (naval capacity, all research). */
function resourceName(lang, resourceId) {
  if (RESOURCES[resourceId]) return resourceNameIn(lang, resourceId);
  return t(lang, resourceId === "navalCapacity" ? "branchNavalCapacity" : "branchResearchAll");
}

function civicNames(lang, keys) {
  return keys.map((key) => t(lang, key)).join(", ");
}

/** Colony effect lines (applied to this planet from P19.3). */
function colonyLines(lang, building, illegal, ownerCivicIds) {
  const lines = [];
  Object.entries(branchBuildingJobs(building, illegal)).forEach(([jobId, amount]) => {
    if (amount) lines.push(t(lang, "branchLineJobs")(num(amount), jobName(lang, jobId)));
  });
  const illegalVariant = isIllegalVariant(building, illegal);
  branchJobTrade(building, illegal, ownerCivicIds).forEach(({ entry, jobs, total }) => {
    const civicPart = entry.civics.length ? t(lang, entry.allCivics ? "branchLineTradeAllCivics" : "branchLineTradePerCivic")(num(entry.perCivic), civicNames(lang, entry.civics)) : "";
    lines.push(t(lang, "branchLineJobTrade")(num(total), jobs.map((jobId) => jobName(lang, jobId)).join(", "), civicPart));
  });
  const colony = building.colony || {};
  if (colony.tradeFromJobsPct) lines.push(t(lang, "branchLineTradeFromJobs")(num(colony.tradeFromJobsPct)));
  if (colony.workerOutputPct) lines.push(t(lang, "branchLineWorkerOutput")(num(colony.workerOutputPct)));
  if (colony.happinessPct) lines.push(t(lang, "branchLineHappiness")(num(colony.happinessPct)));
  if (colony.amenitiesPer100) lines.push(t(lang, "branchLineAmenitiesPerJob")(num(colony.amenitiesPer100.amount), colony.amenitiesPer100.jobs.map((jobId) => jobName(lang, jobId)).join(", ")));
  if (illegalVariant || (illegal && building.illegalCrime)) lines.push(t(lang, "branchLineCrime")(num(building.illegalCrime || ILLEGAL_BRANCH_RULES.crime)));
  const upkeep = Object.entries(building.upkeep || {}).map(([resourceId, amount]) => `−${amount} ${resourceName(lang, resourceId)}`);
  if (upkeep.length) lines.push(t(lang, "branchLineUpkeep")(upkeep.join(", ")));
  return lines;
}

/** Info lines: colony effects not computed, and the corporate owner's effects. */
function infoLines(lang, building, ownerCivicIds) {
  const lines = (building.colony?.info || []).map((key) => t(lang, key));
  const owner = building.owner || {};
  const perValue = Object.entries(owner.perBranchValue || {}).map(([resourceId, amount]) => `${num(amount)} ${resourceName(lang, resourceId)}`);
  if (perValue.length) lines.push(t(lang, "branchLineOwnerPerValue")(perValue.join(", ")));
  if (owner.capitalTraders?.length) {
    const count = owner.capitalTraders.filter((key) => ownerCivicIds.includes(key)).length;
    lines.push(t(lang, "branchLineOwnerCapitalTraders")(count * 200, civicNames(lang, owner.capitalTraders)));
  }
  (owner.info || []).forEach((key) => lines.push(t(lang, key)));
  return lines;
}

function describeBranchRule(lang, { rule }, describeRule) {
  if (rule.type === "noIllegalVariant") return t(lang, "branchReqNoIllegalVariant");
  if (rule.type === "branch") return t(lang, rule.value === "legal" ? "branchReqLegal" : "branchReqIllegal");
  if (rule.type === "anyOf") return rule.rules.map((inner) => describeBranchRule(lang, { rule: inner }, describeRule)).filter(Boolean).join(" / ");
  if (rule.type === "civic") return t(lang, "branchReqOwnerCivic") + civicNames(lang, rule.keys);
  if (rule.type === "notCivic") return t(lang, "branchReqOwnerNotCivic") + civicNames(lang, rule.keys);
  if (rule.type === "capitalTier") return t(lang, "branchReqCapitalTier")(TIER_NUMERALS[rule.min - 1]);
  return describeRule(rule);
}

function buildingLabel(lang, building, illegal) {
  const variant = branchBuildingVariant(building, illegal) || building;
  return t(lang, variant.i18nKey);
}

/** P19.6: "Owner empire" select (saved megacorporation profiles + custom owner) and its status note. */
function renderOwnerEmpire(section, { lang, branch, ownerEmpires = [], ownerStatus = "custom", onOwnerEmpireChange }) {
  const label = document.createElement("label");
  label.className = "branch-legality branch-owner-empire";
  const text = document.createElement("span");
  text.textContent = t(lang, "branchOwnerEmpireLabel");
  const select = document.createElement("select");
  select.id = "branch-owner-empire-select";
  const addOption = (value, name) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    select.append(option);
  };
  addOption("", t(lang, "branchOwnerCustom"));
  ownerEmpires.forEach((profile) => addOption(profile.id, profile.name));
  if (ownerStatus === "missing") addOption(branch.ownerEmpireId, t(lang, "branchOwnerSavedCopy")(branch.ownerEmpireName || "?"));
  select.value = branch.ownerEmpireId || "";
  select.addEventListener("change", () => onOwnerEmpireChange?.(select.value || null));
  label.append(text, select);
  section.append(label);
  if (ownerStatus === "custom") return;
  const status = document.createElement("p");
  status.className = ownerStatus === "missing" ? "empire-authority-lock branch-owner-status" : "empire-note branch-owner-status";
  status.id = "branch-owner-status";
  status.dataset.status = ownerStatus;
  status.textContent = t(lang, ownerStatus === "missing" ? "branchOwnerMissingNote" : "branchOwnerLinkedNote")(branch.ownerEmpireName || "?");
  section.append(status);
}

function renderOwner(container, options) {
  const { lang, branch, onChange } = options;
  // P19.6: civics copied from a saved empire profile are read-only (custom owner = editable).
  const readOnly = Boolean(branch.ownerEmpireId);
  const section = document.createElement("section");
  section.className = "empire-policy-group";
  const title = document.createElement("h3");
  title.textContent = t(lang, "branchOwnerHeading");
  const note = document.createElement("p");
  note.className = "empire-note";
  note.textContent = t(lang, "branchOwnerNote");
  section.append(title, note);
  renderOwnerEmpire(section, options);

  // Legality: illegal needs Criminal Heritage among the owner's civics.
  const hasCriminalHeritage = branch.ownerCivicIds.includes("civicCriminalHeritage");
  const legality = document.createElement("label");
  legality.className = "branch-legality";
  const legalityText = document.createElement("span");
  legalityText.textContent = t(lang, "branchLegalityLabel");
  const select = document.createElement("select");
  select.id = "branch-legality-select";
  [["legal", "branchLegal"], ["illegal", "branchIllegal"]].forEach(([value, key]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === "illegal" && !hasCriminalHeritage ? `${t(lang, key)} — ${t(lang, "branchReqOwnerCivic")}${t(lang, "civicCriminalHeritage")}` : t(lang, key);
    option.disabled = value === "illegal" && !hasCriminalHeritage;
    select.append(option);
  });
  select.value = branch.illegal ? "illegal" : "legal";
  select.addEventListener("change", () => onChange({ illegal: select.value === "illegal" }));
  legality.append(legalityText, select);
  section.append(legality);

  const count = document.createElement("p");
  count.className = "empire-points-label";
  count.textContent = t(lang, "branchOwnerCivicsCount")(branch.ownerCivicIds.length, MAX_CIVICS);
  section.append(count);

  const grid = document.createElement("div");
  grid.className = "branch-civic-grid";
  [...BRANCH_OWNER_CIVICS].sort((a, b) => t(lang, a).localeCompare(t(lang, b))).forEach((key) => {
    const chosen = branch.ownerCivicIds.includes(key);
    const blocked = !chosen && (branch.ownerCivicIds.length >= MAX_CIVICS || branch.ownerCivicIds.some((other) => civicsConflict(key, other)));
    const label = document.createElement("label");
    label.className = "branch-civic";
    label.classList.toggle("is-selected", chosen);
    label.dataset.civic = key;
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = chosen;
    box.disabled = blocked || readOnly;
    label.classList.toggle("is-readonly", readOnly);
    box.addEventListener("change", () => {
      const next = box.checked ? [...branch.ownerCivicIds, key] : branch.ownerCivicIds.filter((other) => other !== key);
      onChange({ ownerCivicIds: next, illegal: branch.illegal && next.includes("civicCriminalHeritage") });
    });
    const name = document.createElement("span");
    name.textContent = t(lang, key);
    label.append(box, name);
    grid.append(label);
  });
  section.append(grid);
  container.append(section);
}

function renderSlot(lang, index, { branch, slotCount, ownerCtx, hostCtx, describeRule, onSlotChange }) {
  const card = document.createElement("div");
  card.className = "empire-authority-card branch-slot";
  card.dataset.branchSlot = String(index);
  const unlocked = index < slotCount;
  const selectedId = branch.slots[index] || "";
  const selected = getBranchBuilding(selectedId);

  const header = document.createElement("div");
  header.className = "empire-authority-header";
  const heading = document.createElement("strong");
  heading.textContent = t(lang, "branchSlotLabel")(index + 1);
  header.append(heading);
  card.append(header);

  if (!unlocked && !selected) {
    card.classList.add("is-locked");
    const lock = document.createElement("em");
    lock.className = "empire-authority-lock";
    const tier = Object.keys(BRANCH_OFFICE_SLOTS_BY_TIER).map(Number).find((tierNumber) => BRANCH_OFFICE_SLOTS_BY_TIER[tierNumber] > index);
    lock.textContent = t(lang, "branchSlotLocked")(TIER_NUMERALS[tier - 1]);
    card.append(lock);
    return card;
  }

  const select = document.createElement("select");
  select.className = "branch-slot-select";
  select.disabled = !unlocked;
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = t(lang, "branchSlotEmpty");
  select.append(empty);
  Object.keys(KIND_I18N_KEYS).forEach((kind) => {
    const group = document.createElement("optgroup");
    group.label = t(lang, KIND_I18N_KEYS[kind]);
    BRANCH_OFFICE_BUILDINGS.filter((building) => building.kind === kind).forEach((building) => {
      const unmet = branchBuildingUnmet(building, ownerCtx, hostCtx);
      const option = document.createElement("option");
      option.value = building.id;
      const reasons = unmet.map((entry) => describeBranchRule(lang, entry, describeRule)).filter(Boolean);
      const overLimit = branchBuildingLimitReached(building, branch.slots, index);
      if (overLimit) reasons.push(t(lang, "branchLimitReached")(building.maxPerColony));
      option.textContent = reasons.length ? `${buildingLabel(lang, building, branch.illegal)} — ${reasons.join("; ")}` : buildingLabel(lang, building, branch.illegal);
      option.disabled = (unmet.length > 0 || overLimit) && building.id !== selectedId;
      group.append(option);
    });
    select.append(group);
  });
  select.value = selectedId;
  select.addEventListener("change", () => onSlotChange(index, select.value || null));
  card.append(select);

  if (!selected) return card;
  const variant = branchBuildingVariant(selected, branch.illegal) || selected;
  const title = document.createElement("div");
  title.className = "branch-building-title";
  const img = document.createElement("img");
  img.src = `${IMAGE_BASE}${variant.img}`;
  img.alt = "";
  img.loading = "lazy";
  const name = document.createElement("span");
  name.textContent = t(lang, variant.i18nKey);
  title.append(img, name);
  card.append(title);

  const unmet = branchBuildingUnmet(selected, ownerCtx, hostCtx);
  const inactiveReasons = [
    ...(unlocked ? [] : [t(lang, "branchSlotLockedShort")]),
    ...(branchBuildingLimitReached(selected, branch.slots.slice(0, index + 1), index) ? [t(lang, "branchLimitReached")(selected.maxPerColony)] : []),
    ...unmet.map((entry) => describeBranchRule(lang, entry, describeRule)).filter(Boolean)
  ];
  if (inactiveReasons.length) {
    card.classList.add("is-inactive");
    const lock = document.createElement("em");
    lock.className = "empire-authority-lock";
    lock.textContent = t(lang, "branchBuildingInactive")(inactiveReasons.join("; "));
    card.append(lock);
  }

  const list = document.createElement("ul");
  list.className = "empire-effect-list";
  colonyLines(lang, selected, branch.illegal, branch.ownerCivicIds).forEach((line) => {
    const item = document.createElement("li");
    item.className = "is-applied";
    item.textContent = line;
    list.append(item);
  });
  infoLines(lang, selected, branch.ownerCivicIds).forEach((line) => {
    const item = document.createElement("li");
    item.className = "is-info";
    item.textContent = line;
    list.append(item);
  });
  card.append(list);

  const unmodelled = unmodelledRequirements(selected).map((rule) => t(lang, rule.i18nKey));
  if (unmodelled.length) {
    const small = document.createElement("p");
    small.className = "empire-policy-federation-note";
    small.textContent = t(lang, "requirementUnmodelled") + unmodelled.join("; ");
    card.append(small);
  }
  return card;
}

/**
 * Draws the Sucursales tab into `container`.
 * options: { lang, branch { present, illegal, ownerCivicIds, ownerEmpireId, ownerEmpireName, slots }, hostBlockKey, slotCount, capitalTier,
 *            ownerEmpires [{ id, name }], ownerStatus ("custom" | "linked" | "missing"),
 *            ownerCtx, hostCtx, describeRule(rule), onChange(patch), onOwnerEmpireChange(id|null), onSlotChange(index, buildingId) }
 */
export function renderBranchOffices(container, options) {
  if (!container) return;
  const { lang, branch, hostBlockKey, slotCount, capitalTier, onChange } = options;
  container.replaceChildren();

  if (hostBlockKey) {
    const block = document.createElement("p");
    block.className = "empire-authority-lock branch-host-block";
    block.textContent = t(lang, hostBlockKey);
    container.append(block);
  }

  const toggle = document.createElement("label");
  toggle.className = "branch-present";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.id = "branch-present-toggle";
  box.checked = branch.present;
  box.disabled = Boolean(hostBlockKey) && !branch.present;
  box.addEventListener("change", () => onChange({ present: box.checked }));
  const text = document.createElement("span");
  text.textContent = t(lang, "branchPresentLabel");
  toggle.append(box, text);
  container.append(toggle);
  if (!branch.present) return;

  if (hostBlockKey) {
    const inactive = document.createElement("p");
    inactive.className = "empire-note";
    inactive.textContent = t(lang, "branchOfficeInactive");
    container.append(inactive);
  }

  renderOwner(container, options);

  const section = document.createElement("section");
  section.className = "empire-policy-group";
  const title = document.createElement("h3");
  title.textContent = t(lang, "branchBuildingsHeading");
  const slotsNote = document.createElement("p");
  slotsNote.className = "empire-points-label";
  slotsNote.id = "branch-slots-label";
  slotsNote.textContent = t(lang, "branchSlotsLabel")(slotCount, TIER_NUMERALS[capitalTier - 1] || String(capitalTier));
  const grid = document.createElement("div");
  grid.className = "empire-policy-grid";
  for (let index = 0; index < MAX_SLOTS; index += 1) grid.append(renderSlot(lang, index, options));
  section.append(title, slotsNote);
  // P19.3: branch office value (info only: the owner's trade).
  if (options.value) {
    const v = options.value;
    const round = (amount) => Math.round(amount * 100) / 100;
    const valueLine = document.createElement("p");
    valueLine.className = "empire-note";
    valueLine.id = "branch-value-line";
    valueLine.textContent = v.illegal
      ? t(lang, "branchValueIllegal")(round(v.min), round(v.max), round(v.trade))
      : t(lang, "branchValueLegal")(round(v.value), round(v.trade));
    section.append(valueLine);
  }
  section.append(grid);
  container.append(section);
}

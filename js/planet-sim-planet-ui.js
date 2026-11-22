/**
 * Planet simulator, Planet tab: designation select, capital building, planet size and the
 * slot board (capital, building slots and district groups).
 */

import { t } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { updatePlanetState, getPlanetState } from "./planet-state.js";
import { unmodelledRequirements } from "./building-requirements.js";
import { allowedDesignationCategories } from "./celestial-data.js";
import { DESIGNATIONS, DESIGNATION_CATEGORY_ORDER, DESIGNATION_CATEGORY_I18N_KEYS, getDesignation, designationAvailable } from "./designation-data.js";
import { refresh } from "./planet-sim.js";
import { renderCountControl } from "./planet-sim-catalog-ui.js";
import { showNotice } from "./planet-sim-dom.js";
import { requirementContext, currentCapital, currentCapitalSet, inactiveReason, isLimited, removeBuildingAt, unlockedKeys, isLatheLayout, secondaryDistrictDef, primaryDistrictDef, primaryMinCount, canAddDistrict, primaryOption, secondaryOption, districtDisplayName, canAddResourceDistrict, fixedPlanetSize } from "./planet-sim-rules.js";
import { builtMap, buildingsById, districtState, sim } from "./planet-sim-state.js";
import { openDistrictsTab } from "./planet-sim-tabs.js";
import { requirementOptionLabel, buildingDisplayName, zoneIcon, formatPlainCost } from "./planet-sim-text.js";

const slotsVisualEl = document.querySelector("#planet-slots-visual");

const capitalNameEl = document.querySelector("#planet-capital-name");
const capitalTierEl = document.querySelector("#planet-capital-tier");
const capitalUpgradeBtn = document.querySelector("#planet-capital-upgrade");
const capitalDowngradeBtn = document.querySelector("#planet-capital-downgrade");
const designationSelect = document.querySelector("#planet-designation-select");
const planetSizeInput = document.querySelector("#planet-size-input");

/**
 * Reconstruye las opciones del desplegable de designación (agrupadas por categoría y
 * filtradas por el tipo de cuerpo celeste elegido). Las que no cumplen sus requisitos
 * (ética, autoridad, principios, tipo de especie... ver designation-data.js) salen
 * desactivadas con el motivo. Si la designación elegida deja de ser válida (por el
 * cuerpo celeste o por el imperio) se restablece a "sin designación" y se avisa; los
 * edificios se conservan (como en P5.4), solo se reinicia la designación.
 */
export function renderDesignationSelect() {
  if (!designationSelect) return;
  const state = getPlanetState();
  const allowedCategories = allowedDesignationCategories(state.celestialTypeId);
  const ctx = requirementContext();
  const current = getDesignation(sim.selectedDesignationId);
  if (current && (!allowedCategories.includes(current.category) || !designationAvailable(current, ctx))) {
    sim.selectedDesignationId = "";
    updatePlanetState({ designationId: null });
    showNotice(t(getLang(), "planetSimDesignationResetNotice")(t(getLang(), current.i18nKey)));
  }
  designationSelect.replaceChildren();

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(getLang(), "designationNone");
  designationSelect.append(noneOption);

  DESIGNATION_CATEGORY_ORDER.filter((category) => allowedCategories.includes(category)).forEach((category) => {
    const items = DESIGNATIONS.filter((d) => d.category === category);
    if (!items.length) return;
    const group = document.createElement("optgroup");
    group.label = t(getLang(), DESIGNATION_CATEGORY_I18N_KEYS[category]);
    items.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      const label = requirementOptionLabel(t(getLang(), d.i18nKey), d, ctx);
      opt.textContent = label.text;
      opt.disabled = label.disabled;
      if (label.title) opt.title = label.title;
      group.append(opt);
    });
    designationSelect.append(group);
  });

  designationSelect.value = sim.selectedDesignationId;
}

if (designationSelect) {
  designationSelect.addEventListener("change", () => {
    sim.selectedDesignationId = designationSelect.value;
    updatePlanetState({ designationId: sim.selectedDesignationId || null });
    refresh();
  });
}

/* ── Edificio capital ────────────────────────────────────────────────── */

function renderCapital() {
  const capital = currentCapital();
  const capitalSet = currentCapitalSet();
  // P10.5: requirements the simulator does not check (Cosmogenesis ascension perk of the Lathe capitals III–IV) are shown, never block.
  const requirementNote = (entry) => {
    const rules = entry ? unmodelledRequirements(entry) : [];
    return rules.length ? t(getLang(), "requirementUnmodelled") + rules.map((rule) => t(getLang(), rule.i18nKey)).join("; ") : "";
  };
  if (capitalNameEl) {
    capitalNameEl.textContent = t(getLang(), capital.i18nKey);
    const note = requirementNote(capital);
    capitalNameEl.title = [note, formatPlainCost(capital.cost)].filter(Boolean).join("\n");
    if (note) {
      const badge = document.createElement("span");
      badge.className = "planet-capital-requirement";
      badge.textContent = ` (${note})`;
      capitalNameEl.append(badge);
    }
  }
  if (capitalTierEl) capitalTierEl.textContent = `${capital.tier} / 5`;
  if (capitalUpgradeBtn) {
    capitalUpgradeBtn.disabled = sim.capitalTierIndex >= capitalSet.length - 1;
    capitalUpgradeBtn.title = capitalUpgradeBtn.disabled ? t(getLang(), "planetSimCapitalMaxTier") : requirementNote(capitalSet[sim.capitalTierIndex + 1]);
  }
  if (capitalDowngradeBtn) {
    capitalDowngradeBtn.disabled = sim.capitalTierIndex <= 0;
    capitalDowngradeBtn.title = capitalDowngradeBtn.disabled ? t(getLang(), "planetSimCapitalMinTier") : "";
  }
}

if (capitalUpgradeBtn) {
  capitalUpgradeBtn.addEventListener("click", () => {
    sim.capitalTierIndex = Math.min(currentCapitalSet().length - 1, sim.capitalTierIndex + 1);
    refresh();
  });
}
if (capitalDowngradeBtn) {
  capitalDowngradeBtn.addEventListener("click", () => {
    sim.capitalTierIndex = Math.max(0, sim.capitalTierIndex - 1);
    refresh();
  });
}

if (planetSizeInput) {
  planetSizeInput.addEventListener("input", () => {
    const parsed = Math.floor(Number(planetSizeInput.value));
    sim.userPlanetSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
      ? `${buildingDisplayName(building)} — ${t(getLang(), "planetSimClickToDemolish")}`
      : `${buildingDisplayName(building)} — ${t(getLang(), reasonKey)} (${t(getLang(), "planetSimClickToDemolish")})`;
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
    const isTarget = key === sim.selectedSlotKey;
    slot.className = `planet-slot is-empty${isTarget ? " is-target" : ""}`;
    slot.title = isTarget
      ? t(getLang(), "planetSimSlotTarget")
      : t(getLang(), "planetSimSlotEmpty");
    slot.addEventListener("click", (event) => {
      event.stopPropagation();
      sim.selectedSlotKey = key;
      refresh();
    });
    return slot;
  }

  const slot = document.createElement("span");
  slot.className = "planet-slot is-locked";
  slot.title = lockedTooltip || t(getLang(), "planetSimSlotLocked");
  return slot;
}

function renderCapitalCell() {
  const capital = currentCapital();
  const cell = document.createElement("span");
  cell.className = "planet-slot is-filled is-capital";
  const costText = formatPlainCost(capital.cost);
  cell.title = `${buildingDisplayName(capital)} — ${t(getLang(), "planetSimCapitalCannotRemove")}${costText ? `\n${costText}` : ""}`;
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
  const lockedTooltip = isLatheLayout() ? t(getLang(), "planetSimLatheSlotLocked") : undefined; // P10.5
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
  title.textContent = `${t(getLang(), def.i18nKey)} ${t(getLang(), "planetSimDistrictCount")(districtState.urban.count)}`;
  header.append(icon, title);
  summary.append(header);

  summary.append(renderCountControl(
    districtState.urban.count,
    () => { districtState.urban.count = Math.max(primaryMinCount(), districtState.urban.count - 1); refresh(); },
    () => { districtState.urban.count += 1; refresh(); },
    canAddDistrict(),
    () => { districtState.urban.count = primaryMinCount(); refresh(); },
    () => { while (canAddDistrict()) districtState.urban.count += 1; refresh(); },
    primaryMinCount(),
    t(getLang(), def.i18nKey)
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
    ? t(getLang(), option.i18nKey)
    : t(getLang(), "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  header.append(icon, title);
  box.append(header);

  // El nombre de la especialización ya se muestra en el título de arriba en
  // cuanto hay una elegida; la línea de estado solo hace falta mientras no
  // se ha elegido ninguna.
  if (!option) {
    const statusLine = document.createElement("p");
    statusLine.className = "planet-resource-district-status";
    statusLine.textContent = t(getLang(), "planetSimNotSpecialized");
    statusLine.prepend(zoneIcon());
    box.append(statusLine);
  }

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `urban-spec-${slotIndex}-${i}`;
    row.append(makeRegularSlotCell(key, unlocked, t(getLang(), "planetSimUrbanSlotLockedTooltip")));
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
  title.textContent = `${districtDisplayName(cat)} ${t(getLang(), "planetSimDistrictCount")(state.count)}`;
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
    () => { while (canAddResourceDistrict(cat)) state.count += 1; refresh(); },
    0,
    districtDisplayName(cat)
  ));

  const statusLine = document.createElement("p");
  statusLine.className = "planet-resource-district-status";
  statusLine.textContent = option
    ? t(getLang(), option.i18nKey)
    : t(getLang(), def.lockedTooltipKey);
  statusLine.prepend(zoneIcon());
  box.append(statusLine);

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `${cat}-spec-${i}`;
    const lockedTooltip = t(getLang(), def.lockedTooltipKey);
    row.append(makeRegularSlotCell(key, unlocked, lockedTooltip));
  }
  box.append(row);

  return box;
}

export function renderSlots() {
  renderCapital();
  renderSlotsVisual();
}

/** P10.3: apply the fixed size of a megastructure (input disabled) or restore the user's size. */
export function syncPlanetSize() {
  const fixed = fixedPlanetSize();
  sim.planetSize = fixed || sim.userPlanetSize;
  if (planetSizeInput) {
    planetSizeInput.value = String(sim.planetSize);
    planetSizeInput.disabled = Boolean(fixed);
    // P10.7: editable bodies (regular planets and converted worlds: Ecumenopolis, Hive / Machine / Nanite Worlds) show the
    // wiki size ranges; the input is the district slots, so features, blockers and modifiers can move it outside them.
    planetSizeInput.title = t(getLang(), fixed ? "planetSimFixedSizeTooltip" : "planetSimSizeRangeTooltip");
  }
}

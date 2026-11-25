/**
 * Planet simulator, Planet tab: the buildings catalog and the districts catalog (cards,
 * specialization pickers, count controls and district caps).
 */

import { t, gameName } from "./i18n.js";
import { getLang } from "./page-shell.js";
import { BUILDINGS, CATEGORY_ORDER, CATEGORY_I18N_KEYS, RESOURCE_DISTRICT_ORDER } from "./planet-data.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { requirementContextKey, unmodelledRequirements } from "./building-requirements.js";
import { refresh } from "./planet-sim.js";
import { catalogEl, districtsCatalogEl } from "./planet-sim-dom.js";
import { renderJobsMini } from "./planet-sim-jobs-ui.js";
import { TECH_UNLOCK_LINKS } from "./tech-unlock-links.js";
import { renderDesignationSelect } from "./planet-sim-planet-ui.js";
import { chainBuildingCount, slotAcceptsBuilding, resolveSelectedSlot, requirementContext, isBuildingAvailable, buildingCount, isLimited, slotSpecInfo, secondaryDistrictDef, primaryDistrictDef, districtBaseJobs, primaryMinCount, canAddDistrict, primaryOption, firstSpecializationLocked, scaleJobs, specializationJobs, specializationJobMultiplier, specializationNotes, secondaryOption, districtDisplayName, canAddResourceDistrict, districtHasNoFeature, districtCap } from "./planet-sim-rules.js";
import { districtState, builtMap, sim } from "./planet-sim-state.js";
import { buildingDisplayName, formatBuildingCost, formatPlainCost, formatAmount, requirementOptionLabel } from "./planet-sim-text.js";

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

const catalogCategoryOpenState = {};

export function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.replaceChildren();

  const targetKey = resolveSelectedSlot();
  const slotsFull = !targetKey;
  // La firma incluye el contexto de requisitos: si cambian éticas, autoridad,
  // principios, designación, tipo de planeta o capital, se recalcula qué
  // categorías salen abiertas.
  const slotSignature = slotsFull ? null : getSlotTypeSignature(targetKey);
  const signature = `${slotSignature}#${requirementContextKey(requirementContext())}`;

  if (signature !== sim.catalogSlotSignature) {
    sim.catalogSlotSignature = signature;
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
    summary.textContent = t(getLang(), CATEGORY_I18N_KEYS[category]);
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
  const lines = (building.infoKeys || []).map((key) => t(getLang(), key));
  const unmodelled = unmodelledRequirements(building).map((rule) => t(getLang(), rule.i18nKey));
  if (unmodelled.length) lines.push(t(getLang(), "requirementUnmodelled") + unmodelled.join("; "));
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
    reason = t(getLang(), "planetSimLimitReached");
  } else if (slotsFull) {
    reason = t(getLang(), "planetSimSlotsFull");
  } else if (incompatible) {
    const info = slotSpecInfo(targetKey);
    reason = info.sets === null
      ? t(getLang(), "planetSimBuildingNotAllowedBase")(buildingDisplayName(building))
      : t(getLang(), "planetSimBuildingNotAllowed")(buildingDisplayName(building), info.label);
  } else {
    reason = t(getLang(), "planetSimClickToBuild");
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
    if (building.housing) parts.push(t(getLang(), "planetSimHousingLabel")(formatAmount(building.housing)));
    if (building.amenities) parts.push(t(getLang(), "planetSimAmenitiesLabel")(formatAmount(building.amenities)));
    extra.textContent = parts.join(" · ");
    item.append(extra);
  }

  item.addEventListener("click", () => {
    if (disabled || !targetKey) return;
    builtMap.set(targetKey, building.id);
    refresh();
  });

  const entry = document.createElement("div");
  entry.className = "planet-catalog-entry";
  entry.dataset.buildingId = building.id; // T3405: target of planet-sim.html#building=<id>
  if (sim.deepLink?.type === "building" && sim.deepLink.id === building.id) entry.classList.add("is-deep-linked");
  entry.append(item);
  const techLinks = renderTechLinks(TECH_UNLOCK_LINKS.buildings[building.id]);
  if (techLinks) entry.append(techLinks);
  return entry;
}

/** Page of the tech tree; `#<tech id>` opens that technology (T3205). */
const TECH_TREE_URL = "tech-tree.html";

/**
 * T3402: "Researched with: <technology>" under a catalogue entry, one link per technology that
 * unlocks it (js/tech-unlock-links.js, made from the tech tree data). Opens the tech tree in a new
 * tab so the planet being edited stays open. Technology names are game names: English (lang=en).
 */
function renderTechLinks(techs) {
  if (!techs || !techs.length) return null;
  const line = document.createElement("p");
  line.className = "planet-catalog-tech";
  line.append(t(getLang(), "planetSimTechLinkLabel") + " ");
  techs.forEach((tech, index) => {
    const link = document.createElement("a");
    link.className = "planet-catalog-tech-link";
    link.href = `${TECH_TREE_URL}#${tech.id}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.dataset.techId = tech.id;
    const name = gameName(getLang(), "technologies", tech.id) ?? tech.name; // official name of the language (P15)
    link.textContent = name;
    link.title = t(getLang(), "planetSimTechLinkTitle").replace("{tech}", name);
    link.setAttribute("aria-label", link.title); // says that it opens a new tab
    line.append(index ? ", " : "", link);
  });
  return line;
}

/* ── Catálogo de distritos ───────────────────────────────────────────── */

export function renderDistrictsCatalog() {
  if (!districtsCatalogEl) return;
  districtsCatalogEl.replaceChildren();

  if (sim.districtFilter) {
    const viewAll = document.createElement("button");
    viewAll.type = "button";
    viewAll.className = "planet-view-all-btn";
    viewAll.textContent = t(getLang(), "planetSimViewAll");
    viewAll.addEventListener("click", () => { sim.districtFilter = null; renderDistrictsCatalog(); });
    districtsCatalogEl.append(viewAll);
  }

  const categories = (sim.districtFilter ? [sim.districtFilter] : ["urban", ...RESOURCE_DISTRICT_ORDER])
    .filter((cat) => cat === "urban" || !secondaryDistrictDef(cat).unavailable); // P10.5: Synaptic Lathe has two district types
  categories.forEach((cat) => {
    const card = cat === "urban" ? renderUrbanDistrictCard() : renderResourceDistrictCard(cat);
    card.dataset.districtGroup = cat; // T3405: target of planet-sim.html#district=<id>
    if (sim.deepLink?.type === "district" && sim.deepLink.group === cat) card.classList.add("is-deep-linked");
    districtsCatalogEl.append(card);
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
  name.textContent = `${t(getLang(), def.i18nKey)} ${t(getLang(), "planetSimDistrictCount")(districtState.urban.count)}`;
  header.append(icon, name);
  header.title = formatPlainCost(def.cost);
  card.append(header);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(getLang(), def.specializationSlots ? "planetSimUrbanSlotsNote" : "planetSimNoSpecializationTooltip");
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
    primaryMinCount(),
    t(getLang(), def.i18nKey)
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
    ? t(getLang(), currentOption.i18nKey)
    : t(getLang(), "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  info.append(label);

  const select = document.createElement("select");
  select.className = "planet-urban-spec-select";
  select.setAttribute("aria-label", t(getLang(), "planetSimUrbanSpecializationSlot")(slotIndex + 1));

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(getLang(), "planetSimNotSpecialized");
  if (!currentId) noneOption.selected = true;
  select.append(noneOption);

  // P10.2: options whose requirements are not met (research specializations on a Habitat) are listed disabled with the reason.
  const specCtx = requirementContext();
  def.specializationOptions.forEach((option) => {
    // P10.6: first-slot-only specializations (Central Spire) are not offered in the second slot.
    if (option.firstSlotOnly && slotIndex > 0) return;
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    const label = requirementOptionLabel(t(getLang(), option.i18nKey), option, specCtx);
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
    note.textContent = t(getLang(), "blockerSlotLocked");
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
  header.title = formatPlainCost(def.cost);
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
    () => { while (canAddResourceDistrict(cat)) state.count += 1; refresh(); },
    0,
    districtDisplayName(cat)
  ));

  if (def.habitatResource) card.append(renderDistrictCapInput(cat));
  if (districtHasNoFeature(cat)) {
    const note = document.createElement("p");
    note.className = "planet-district-note";
    note.textContent = t(getLang(), "featuresNoFeatureForDistrict");
    card.append(note);
  }

  // P10.4: the Habitat Research District has no specializations.
  if (!def.specializationOptions.length) {
    const none = document.createElement("p");
    none.className = "planet-district-note";
    none.textContent = t(getLang(), "planetSimNoSpecializationTooltip");
    card.append(none);
    return card;
  }

  const specRow = document.createElement("div");
  specRow.className = "planet-district-spec-row";

  const select = document.createElement("select");
  select.className = "planet-urban-spec-select";
  select.setAttribute("aria-label", t(getLang(), "a11ySpecializationOf")(districtDisplayName(cat)));

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(getLang(), "planetSimNotSpecialized");
  if (!state.optionId) noneOption.selected = true;
  select.append(noneOption);

  const specCtx = requirementContext();
  def.specializationOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    const label = requirementOptionLabel(t(getLang(), option.i18nKey), option, specCtx);
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
  note.textContent = t(getLang(), def.secondaryUrban ? "planetSimSecondaryUrbanSlotsNote" : "planetSimResourceSlotsNote");
  card.append(note);

  return card;
}

/** P10.4: manual cap input of a Habitat resource district (orbital deposits: 1 + half of the deposit size). Empty = not set. */
function renderDistrictCapInput(cat) {
  const wrapper = document.createElement("label");
  wrapper.className = "planet-district-cap";
  wrapper.title = t(getLang(), "planetSimHabitatCapTooltip");
  const text = document.createElement("span");
  text.textContent = t(getLang(), "planetSimHabitatCapLabel");
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = String(sim.planetSize);
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
 * name (P13.4): district name for the screen-reader labels of "−"/"+" and the count.
 */
export function renderCountControl(count, onDecrease, onIncrease, canIncrease = true, onDecreaseAll, onIncreaseAll, min = 0, name = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "planet-count-control";

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-count-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.disabled = count <= min;
  decreaseBtn.title = onDecreaseAll
    ? `${t(getLang(), "planetSimDistrictRemove")} (${t(getLang(), "planetSimCtrlClickRemoveAll")})`
    : t(getLang(), "planetSimDistrictRemove");
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
    ? (onIncreaseAll ? `${t(getLang(), "planetSimDistrictAdd")} (${t(getLang(), "planetSimCtrlClickAddAll")})` : t(getLang(), "planetSimDistrictAdd"))
    : t(getLang(), "planetSimDistrictLimitReached");
  increaseBtn.addEventListener("click", (event) => {
    if ((event.ctrlKey || event.metaKey) && onIncreaseAll) onIncreaseAll();
    else onIncrease();
  });

  decreaseBtn.setAttribute("aria-label", t(getLang(), "a11yCountRemove")(name));
  increaseBtn.setAttribute("aria-label", t(getLang(), "a11yCountAdd")(name));
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", t(getLang(), "a11yCountValue")(name, count));

  wrapper.append(decreaseBtn, countLabel, increaseBtn);
  return wrapper;
}

/**
 * Simulador de Planetas (v1.3).
 *
 * Novedades de esta versión, a petición de Morteux:
 *  - Edificio capital: siempre presente, ocupa la primera ranura del
 *    distrito principal, nunca se puede demoler ni desactivar — solo
 *    mejorar o degradar de nivel (5 niveles reales, ver planet-data.js).
 *  - Distritos de verdad en vez de un contador manual: 2 distritos urbanos
 *    (3 ranuras cada uno) a la derecha de las 6 ranuras base, y debajo, en
 *    una fila centrada, los 3 distritos de recursos básicos (generador,
 *    minería, agricultura), cada uno especializable para desbloquear 3
 *    ranuras más.
 *  - Pestañas en la barra lateral: "Edificios" (catálogo de siempre) y
 *    "Distritos" (añadir/quitar distritos y elegir su especialización).
 *    Pulsar sobre un grupo de distritos en la rejilla cambia a la pestaña
 *    de Distritos.
 *
 * Modelo de ranuras: cada ranura no-capital tiene una "clave" estable
 * (p. ej. "urban-2-1", "generator-spec-3") en vez de una simple posición en
 * un array. Así, si quitas un distrito urbano o le retiras la
 * especialización a una categoría, sus ranuras (y lo que hubiera
 * construido en ellas) no se borran: simplemente dejan de contar para
 * empleos/recursos hasta que las recuperes, sin desplazar ni afectar a las
 * ranuras de ningún otro grupo.
 *
 * Ver js/planet-data.js para el origen de todos los números.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import {
  IMAGE_BASE,
  BUILDINGS,
  JOBS,
  JOB_OUTPUTS,
  JOB_EFFECT_NOTES,
  RESOURCES,
  CATEGORY_ORDER,
  CATEGORY_I18N_KEYS,
  BUILDING_SLOT_RULES,
  calculateBuildingSlots,
  divideEffect,
  CAPITAL_TIERS,
  DISTRICTS,
  RESOURCE_DISTRICT_ORDER
} from "./planet-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const slotsLabel = document.querySelector("#planet-slots-label");
const slotsVisualEl = document.querySelector("#planet-slots-visual");
const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const catalogEl = document.querySelector("#planet-catalog");
const districtsCatalogEl = document.querySelector("#planet-districts-catalog");
const tabBuildingsBtn = document.querySelector("#planet-tab-buildings");
const tabDistrictsBtn = document.querySelector("#planet-tab-districts");
const summaryEl = document.querySelector("#planet-summary");
const productionEl = document.querySelector("#planet-production");
const upkeepEl = document.querySelector("#planet-upkeep");
const nonResourceEl = document.querySelector("#planet-nonresource");
const capitalIconEl = document.querySelector("#planet-capital-icon");
const capitalNameEl = document.querySelector("#planet-capital-name");
const capitalTierEl = document.querySelector("#planet-capital-tier");
const capitalUpgradeBtn = document.querySelector("#planet-capital-upgrade");
const capitalDowngradeBtn = document.querySelector("#planet-capital-downgrade");
const metaDescription = document.querySelector('meta[name="description"]');

let currentLang = detectInitialLang();
let activeTab = "buildings";
let districtFilter = null; // null = todas, o "urban"/"generator"/"mining"/"agriculture"

let capitalTierIndex = 0;

// Estado de distritos: urban es un número de copias; cada categoría de
// recurso básico tiene su propio número de copias y si está especializada.
const districtState = {
  urban: 2,
  generator: { count: 0, specialized: false },
  mining: { count: 0, specialized: false },
  agriculture: { count: 0, specialized: false }
};

// Ranuras no-capital construidas: clave de ranura estable -> id de edificio.
// Ver cabecera del archivo para qué es una "clave de ranura".
const builtMap = new Map();

const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

function specializedCategoryCount() {
  return RESOURCE_DISTRICT_ORDER.filter((cat) => districtState[cat].specialized).length;
}

function totalSlots() {
  return calculateBuildingSlots(districtState.urban, specializedCategoryCount());
}

/** Ranuras que no son la del capital: la ranura 0 de las 6 base siempre es suya. */
function buildableCapacity() {
  return totalSlots() - 1;
}

/** Claves de ranura, en orden canónico estable, dentro del límite actual (incluido el tope real de 21). */
function unlockedKeys() {
  const keys = [];
  for (let i = 1; i <= 5; i += 1) keys.push(`base-${i}`);
  for (let d = 1; d <= districtState.urban; d += 1) {
    for (let i = 1; i <= 3; i += 1) keys.push(`urban-${d}-${i}`);
  }
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (districtState[cat].specialized) {
      for (let i = 1; i <= 3; i += 1) keys.push(`${cat}-spec-${i}`);
    }
  });
  return keys.slice(0, buildableCapacity());
}

function isKeyUnlocked(key, unlocked) {
  return unlocked.includes(key);
}

function buildingCount(id) {
  let n = 0;
  builtMap.forEach((buildingId) => { if (buildingId === id) n += 1; });
  return n;
}

function activeBuildingCount() {
  const unlocked = unlockedKeys();
  let n = 0;
  unlocked.forEach((key) => { if (builtMap.has(key)) n += 1; });
  return n;
}

function isLimited(building) {
  return building.colonyLimit !== "none";
}

function canAddBuilding(building) {
  const unlocked = unlockedKeys();
  const freeKey = unlocked.find((key) => !builtMap.has(key));
  if (!freeKey) return false;
  if (building.colonyLimit !== "none" && buildingCount(building.id) >= building.colonyLimit) return false;
  return true;
}

function addBuilding(id) {
  const unlocked = unlockedKeys();
  const freeKey = unlocked.find((key) => !builtMap.has(key));
  if (!freeKey) return;
  builtMap.set(freeKey, id);
}

function removeBuildingAt(key) {
  builtMap.delete(key);
}

/** Cuántas filas de distrito urbano hay que dibujar: las que existen ahora, más las que tengan datos huérfanos por haber reducido el número. */
function urbanRowsToRender() {
  let maxIndex = districtState.urban;
  builtMap.forEach((_, key) => {
    const match = /^urban-(\d+)-/.exec(key);
    if (match) maxIndex = Math.max(maxIndex, Number(match[1]));
  });
  return maxIndex;
}

/**
 * Recalcula, a partir del capital, los distritos y las ranuras activas,
 * todo lo que puede derivarse: empleos totales, producción/consumo de
 * recursos, vivienda, comodidades/servicios y efectos sin recurso.
 */
function computeTotals() {
  const jobsTotals = {};
  const resourceTotals = {};
  const upkeepTotals = {};
  let housing = 0;
  let amenities = 0;

  const addResource = (bucket, resourceId, amount) => {
    bucket[resourceId] = (bucket[resourceId] || 0) + amount;
  };

  const addJobRaw = (jobId, rawAmount) => {
    if (!rawAmount) return;
    jobsTotals[jobId] = (jobsTotals[jobId] || 0) + rawAmount;
    const jobCount = divideEffect(rawAmount);
    Object.entries(JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, perJob]) => {
      addResource(resourceTotals, resourceId, perJob * jobCount);
    });
  };

  // Edificio capital (fijo, siempre presente).
  const capital = CAPITAL_TIERS[capitalTierIndex];
  housing += divideEffect(capital.housing || 0);
  amenities += divideEffect(capital.amenities || 0);
  Object.entries(capital.jobs || {}).forEach(([jobId, raw]) => addJobRaw(jobId, raw));

  // Distritos de recursos básicos: empleo base por copia, y bonus de
  // especialización por copia si la categoría está especializada.
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const state = districtState[cat];
    const def = DISTRICTS[cat];
    if (state.count > 0) {
      Object.entries(def.jobs || {}).forEach(([jobId, raw]) => addJobRaw(jobId, raw * state.count));
      if (state.specialized) {
        Object.entries(def.specialization.jobs || {}).forEach(([jobId, raw]) => addJobRaw(jobId, raw * state.count));
      }
    }
  });

  // Edificios normales, solo los que caen en una ranura actualmente activa.
  const unlocked = unlockedKeys();
  builtMap.forEach((id, key) => {
    if (!unlocked.includes(key)) return;
    const building = buildingsById.get(id);
    Object.entries(building.jobs || {}).forEach(([jobId, raw]) => addJobRaw(jobId, raw));
    housing += divideEffect(building.housing || 0);
    amenities += divideEffect(building.amenities || 0);
    Object.entries(building.upkeep || {}).forEach(([resourceId, amount]) => {
      addResource(upkeepTotals, resourceId, amount);
      addResource(resourceTotals, resourceId, amount);
    });
  });

  return { jobsTotals, resourceTotals, upkeepTotals, housing, amenities };
}

function applyTranslations() {
  document.documentElement.lang = currentLang;

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

function formatAmount(amount, forceSign) {
  const rounded = Math.round(amount * 100) / 100;
  const text = rounded % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(2).replace(/0$/, "");
  if (forceSign) return `${rounded < 0 ? "−" : "+"}${text}`;
  return rounded < 0 ? `−${text}` : text;
}

function buildingDisplayName(building) {
  return t(currentLang, building.i18nKey);
}

function renderJobsList(jobs) {
  const entries = Object.entries(jobs).filter(([, amount]) => amount > 0);
  const wrapper = document.createElement("div");
  wrapper.className = "planet-jobs-list";

  if (!entries.length) {
    const note = document.createElement("p");
    note.className = "planet-jobs-empty";
    note.textContent = t(currentLang, "planetSimNoJobs");
    wrapper.append(note);
    return wrapper;
  }

  entries.forEach(([jobId, amount]) => {
    const row = document.createElement("span");
    row.className = "planet-job-pill";
    row.append(jobIcon(jobId));
    const label = document.createElement("span");
    label.textContent = `+${formatAmount(amount)} ${jobName(jobId)}`;
    row.append(label);
    wrapper.append(row);
  });

  return wrapper;
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
  const capital = CAPITAL_TIERS[capitalTierIndex];
  if (capitalIconEl) {
    capitalIconEl.src = `${IMAGE_BASE}${capital.img}`;
    capitalIconEl.alt = t(currentLang, capital.i18nKey);
  }
  if (capitalNameEl) capitalNameEl.textContent = t(currentLang, capital.i18nKey);
  if (capitalTierEl) capitalTierEl.textContent = `${capitalTierIndex + 1} / ${CAPITAL_TIERS.length}`;
  if (capitalUpgradeBtn) {
    capitalUpgradeBtn.disabled = capitalTierIndex >= CAPITAL_TIERS.length - 1;
    capitalUpgradeBtn.title = capitalUpgradeBtn.disabled ? t(currentLang, "planetSimCapitalMaxTier") : "";
  }
  if (capitalDowngradeBtn) {
    capitalDowngradeBtn.disabled = capitalTierIndex <= 0;
    capitalDowngradeBtn.title = capitalDowngradeBtn.disabled ? t(currentLang, "planetSimCapitalMinTier") : "";
  }
}

if (capitalUpgradeBtn) {
  capitalUpgradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.min(CAPITAL_TIERS.length - 1, capitalTierIndex + 1);
    refresh();
  });
}
if (capitalDowngradeBtn) {
  capitalDowngradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.max(0, capitalTierIndex - 1);
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
    const stateClass = isUnlocked ? (isLimited(building) ? "is-limited" : "is-standard") : "is-inactive";
    slot.className = `planet-slot is-filled ${stateClass}`;
    slot.title = isUnlocked
      ? `${buildingDisplayName(building)} — ${t(currentLang, "planetSimClickToDemolish")}`
      : `${buildingDisplayName(building)} — ${t(currentLang, "planetSimSlotInactive")}`;
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
    const slot = document.createElement("span");
    slot.className = "planet-slot is-empty";
    slot.title = t(currentLang, "planetSimSlotEmpty");
    return slot;
  }

  const slot = document.createElement("span");
  slot.className = "planet-slot is-locked";
  slot.title = lockedTooltip || t(currentLang, "planetSimSlotLocked");
  return slot;
}

function renderCapitalCell() {
  const capital = CAPITAL_TIERS[capitalTierIndex];
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
  for (let i = 1; i <= 5; i += 1) {
    baseGrid.append(makeRegularSlotCell(`base-${i}`, unlocked));
  }
  topRow.append(baseGrid);

  const urbanWrapper = document.createElement("div");
  urbanWrapper.className = "planet-urban-wrapper";
  urbanWrapper.title = t(currentLang, "planetSimUrbanSlotsNote");
  urbanWrapper.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled")) return;
    openDistrictsTab("urban");
  });

  const urbanRows = urbanRowsToRender();
  if (urbanRows === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "planet-district-placeholder";
    placeholder.textContent = t(currentLang, "districtUrban");
    urbanWrapper.append(placeholder);
  } else {
    const urbanGrid = document.createElement("div");
    urbanGrid.className = "planet-urban-grid";
    for (let d = 1; d <= urbanRows; d += 1) {
      for (let i = 1; i <= 3; i += 1) {
        urbanGrid.append(makeRegularSlotCell(`urban-${d}-${i}`, unlocked));
      }
    }
    urbanWrapper.append(urbanGrid);
  }
  topRow.append(urbanWrapper);

  slotsVisualEl.append(topRow);

  // Fila inferior: los 3 distritos de recursos básicos, centrados.
  const bottomRow = document.createElement("div");
  bottomRow.className = "planet-resource-districts-row";

  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    bottomRow.append(renderResourceDistrictBox(cat, unlocked));
  });

  slotsVisualEl.append(bottomRow);
}

function renderResourceDistrictBox(cat, unlocked) {
  const def = DISTRICTS[cat];
  const state = districtState[cat];

  const box = document.createElement("div");
  box.className = "planet-resource-district-box";
  box.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled")) return;
    openDistrictsTab(cat);
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = `${t(currentLang, def.i18nKey)} ${t(currentLang, "planetSimDistrictCount")(state.count)}`;
  header.append(icon, title);
  box.append(header);

  const statusLine = document.createElement("p");
  statusLine.className = "planet-resource-district-status";
  statusLine.textContent = state.specialized
    ? t(currentLang, "planetSimSpecializedAs")(t(currentLang, def.specialization.i18nKey))
    : t(currentLang, def.specialization.techI18nKey);
  box.append(statusLine);

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `${cat}-spec-${i}`;
    const lockedTooltip = t(currentLang, def.specialization.techI18nKey);
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

function renderActiveTabContent() {
  if (activeTab === "buildings") renderCatalog();
  else renderDistrictsCatalog();
}

function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.replaceChildren();

  const full = !unlockedKeys().some((key) => !builtMap.has(key));

  CATEGORY_ORDER.forEach((category) => {
    const items = BUILDINGS.filter((b) => b.category === category);
    if (!items.length) return;

    const heading = document.createElement("h3");
    heading.className = "entry-heading-sub planet-category-heading";
    heading.textContent = t(currentLang, CATEGORY_I18N_KEYS[category]);
    catalogEl.append(heading);

    const list = document.createElement("div");
    list.className = "planet-catalog-list";

    items.forEach((building) => {
      list.append(renderCatalogItem(building, full));
    });

    catalogEl.append(list);
  });
}

function renderCatalogItem(building, slotsFull) {
  const count = buildingCount(building.id);
  const atLimit = building.colonyLimit !== "none" && count >= building.colonyLimit;
  const disabled = slotsFull || atLimit;

  const item = document.createElement("button");
  item.type = "button";
  item.className = `planet-catalog-item ${isLimited(building) ? "is-limited" : "is-standard"}`;
  item.disabled = disabled;

  const reason = atLimit ? t(currentLang, "planetSimLimitReached") : (slotsFull ? t(currentLang, "planetSimSlotsFull") : t(currentLang, "planetSimClickToBuild"));
  item.title = `${buildingDisplayName(building)} — ${reason}`;

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
    if (building.housing) parts.push(t(currentLang, "planetSimHousingLabel")(formatAmount(divideEffect(building.housing))));
    if (building.amenities) parts.push(t(currentLang, "planetSimAmenitiesLabel")(formatAmount(divideEffect(building.amenities))));
    extra.textContent = parts.join(" · ");
    item.append(extra);
  }

  item.addEventListener("click", () => {
    if (!canAddBuilding(building)) return;
    addBuilding(building.id);
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

  const categories = districtFilter ? [districtFilter] : ["urban", ...RESOURCE_DISTRICT_ORDER];
  categories.forEach((cat) => {
    districtsCatalogEl.append(cat === "urban" ? renderUrbanDistrictCard() : renderResourceDistrictCard(cat));
  });
}

function renderUrbanDistrictCard() {
  const def = DISTRICTS.urban;
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = t(currentLang, def.i18nKey);
  header.append(icon, name);
  card.append(header);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, "planetSimUrbanSlotsNote");
  card.append(note);

  card.append(renderCountControl(
    districtState.urban,
    () => { districtState.urban = Math.max(0, districtState.urban - 1); refresh(); },
    () => { districtState.urban = Math.min(6, districtState.urban + 1); refresh(); }
  ));

  return card;
}

function renderResourceDistrictCard(cat) {
  const def = DISTRICTS[cat];
  const state = districtState[cat];
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = t(currentLang, def.i18nKey);
  header.append(icon, name);
  card.append(header);

  card.append(renderJobsMini(def.jobs));

  card.append(renderCountControl(
    state.count,
    () => {
      state.count = Math.max(0, state.count - 1);
      if (state.count === 0) state.specialized = false;
      refresh();
    },
    () => { state.count = Math.min(20, state.count + 1); refresh(); }
  ));

  const specRow = document.createElement("div");
  specRow.className = "planet-district-spec-row";

  const specIcon = document.createElement("img");
  specIcon.className = "planet-district-icon";
  specIcon.src = `${IMAGE_BASE}${def.specialization.img}`;
  specIcon.alt = "";
  specRow.append(specIcon);

  const specInfo = document.createElement("div");
  specInfo.className = "planet-district-spec-info";
  const specName = document.createElement("span");
  specName.textContent = t(currentLang, def.specialization.i18nKey);
  const specStatus = document.createElement("span");
  specStatus.className = "planet-district-spec-status";
  specStatus.textContent = state.specialized ? t(currentLang, "planetSimSpecializedAs")(t(currentLang, def.specialization.i18nKey)) : t(currentLang, "planetSimNotSpecialized");
  specInfo.append(specName, specStatus);
  specRow.append(specInfo);

  const specButton = document.createElement("button");
  specButton.type = "button";
  specButton.className = "planet-add-btn";
  specButton.textContent = state.specialized ? t(currentLang, "planetSimUnspecializeButton") : t(currentLang, "planetSimSpecializeButton");
  specButton.disabled = !state.specialized && state.count < 1;
  specButton.addEventListener("click", () => {
    state.specialized = !state.specialized;
    refresh();
  });
  specRow.append(specButton);

  card.append(specRow);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, "planetSimResourceSlotsNote");
  card.append(note);

  return card;
}

function renderCountControl(count, onDecrease, onIncrease) {
  const wrapper = document.createElement("div");
  wrapper.className = "planet-count-control";

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-count-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.disabled = count <= 0;
  decreaseBtn.title = t(currentLang, "planetSimDistrictRemove");
  decreaseBtn.addEventListener("click", onDecrease);

  const countLabel = document.createElement("span");
  countLabel.className = "planet-count-value";
  countLabel.textContent = String(count);

  const increaseBtn = document.createElement("button");
  increaseBtn.type = "button";
  increaseBtn.className = "planet-count-btn";
  increaseBtn.textContent = "+";
  increaseBtn.title = t(currentLang, "planetSimDistrictAdd");
  increaseBtn.addEventListener("click", onIncrease);

  wrapper.append(decreaseBtn, countLabel, increaseBtn);
  return wrapper;
}

/* ── Paneles de resumen y producción ─────────────────────────────────── */

function renderSummary(totals) {
  if (!summaryEl) return;
  summaryEl.replaceChildren();

  const hasAny = Object.values(totals.jobsTotals).some((amount) => amount > 0);
  if (!hasAny) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "planetSimSummaryEmpty");
    summaryEl.append(empty);
    if (nonResourceEl) nonResourceEl.replaceChildren();
    return;
  }

  summaryEl.append(renderJobsList(totals.jobsTotals));

  const nonResourceEntries = Object.keys(JOB_EFFECT_NOTES).filter((jobId) => (totals.jobsTotals[jobId] || 0) > 0);
  if (nonResourceEntries.length && nonResourceEl) {
    nonResourceEl.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "planet-nonresource-heading";
    heading.textContent = t(currentLang, "planetSimNonResourceHeading");
    nonResourceEl.append(heading);
    nonResourceEntries.forEach((jobId) => {
      const line = document.createElement("p");
      line.className = "planet-nonresource-line";
      line.textContent = `${formatAmount(totals.jobsTotals[jobId])} ${jobName(jobId)} — ${t(currentLang, JOB_EFFECT_NOTES[jobId])}`;
      nonResourceEl.append(line);
    });
  } else if (nonResourceEl) {
    nonResourceEl.replaceChildren();
  }
}

function renderResourceRow(resourceId, amount) {
  const row = document.createElement("div");
  row.className = `planet-resource-row ${amount < 0 ? "is-negative" : "is-positive"}`;
  row.append(resourceIcon(resourceId));
  const name = document.createElement("span");
  name.className = "planet-resource-name";
  name.textContent = resourceName(resourceId);
  row.append(name);
  const value = document.createElement("span");
  value.className = "planet-resource-value";
  value.textContent = formatAmount(amount, true);
  row.append(value);
  return row;
}

function renderProduction(totals) {
  if (!productionEl) return;
  productionEl.replaceChildren();

  const entries = Object.entries(totals.resourceTotals).filter(([, amount]) => Math.abs(amount) > 0.001);
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "planetSimProductionEmpty");
    productionEl.append(empty);
    return;
  }

  entries
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([resourceId, amount]) => {
      productionEl.append(renderResourceRow(resourceId, amount));
    });
}

function renderUpkeep(totals) {
  if (!upkeepEl) return;
  upkeepEl.replaceChildren();

  const entries = Object.entries(totals.upkeepTotals).filter(([, amount]) => amount < 0);
  if (!entries.length) return;

  const heading = document.createElement("p");
  heading.className = "planet-nonresource-heading";
  heading.textContent = t(currentLang, "planetSimUpkeepHeading");
  upkeepEl.append(heading);

  entries.forEach(([resourceId, amount]) => {
    upkeepEl.append(renderResourceRow(resourceId, amount));
  });
}

function renderSlots() {
  if (slotsLabel) {
    slotsLabel.textContent = t(currentLang, "planetSimSlotsLabel")(activeBuildingCount() + 1, totalSlots());
  }
  renderCapital();
  renderSlotsVisual();
}

function renderStats(totals) {
  if (statHousing) statHousing.textContent = formatAmount(totals.housing, true);
  if (statAmenities) statAmenities.textContent = formatAmount(totals.amenities, true);
}

function refresh() {
  const totals = computeTotals();
  renderSlots();
  renderStats(totals);
  renderActiveTabContent();
  renderSummary(totals);
  renderProduction(totals);
  renderUpkeep(totals);
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

applyTranslations();
setActiveTab("buildings");
refresh();

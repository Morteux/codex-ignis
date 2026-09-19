/**
 * Simulador de Planetas (v1.2).
 *
 * Cambios de esta versión (a petición de Morteux, para acercarse más a la
 * pantalla real de "Distritos y Edificios" del juego):
 *  - Las ranuras de edificios se ven como una rejilla real: los grupos de 3
 *    ranuras de cada especialización de distrito aparecen bloqueados
 *    (rayados) hasta que subes el contador de especializaciones; al
 *    construir un edificio, ocupa la siguiente ranura libre en orden.
 *  - El catálogo de edificios ahora vive en la barra lateral derecha, en
 *    filas compactas; cada fila ES el botón de construir (ya no hay un
 *    botón "Construir" aparte).
 *  - Los edificios con límite de colonia se distinguen por color (borde
 *    azulado) en vez de con un texto aparte.
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
  divideEffect
} from "./planet-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const specInput = document.querySelector("#planet-spec-input");
const slotsLabel = document.querySelector("#planet-slots-label");
const slotsGridEl = document.querySelector("#planet-slots-grid");
const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const catalogEl = document.querySelector("#planet-catalog");
const summaryEl = document.querySelector("#planet-summary");
const productionEl = document.querySelector("#planet-production");
const upkeepEl = document.querySelector("#planet-upkeep");
const nonResourceEl = document.querySelector("#planet-nonresource");
const metaDescription = document.querySelector('meta[name="description"]');

let currentLang = detectInitialLang();
let specializations = 0;
// Cada elemento es el id de un edificio: una ranura ocupada, en el orden en
// que se construyó. La posición en el array ES la posición en la rejilla.
let builtSlots = [];

const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

function totalSlots() {
  return calculateBuildingSlots(specializations);
}

/** Ranuras realmente activas: si se reduce el nº de especializaciones, el
 * exceso de edificios construidos en ranuras ahora bloqueadas deja de
 * contar (quedan como "cola inactiva"), sin borrarse del array. */
function activeSlotCount() {
  return Math.min(builtSlots.length, totalSlots());
}

function usedSlots() {
  return activeSlotCount();
}

function buildingCount(id) {
  return builtSlots.filter((slotId) => slotId === id).length;
}

function canAdd(building) {
  if (activeSlotCount() >= totalSlots()) return false;
  if (builtSlots.length >= BUILDING_SLOT_RULES.max) return false;
  if (building.colonyLimit !== "none" && buildingCount(building.id) >= building.colonyLimit) return false;
  return true;
}

/** Añade un edificio justo después de la última ranura activa, empujando
 * hacia atrás cualquier cola inactiva en lugar de ponerse detrás de ella. */
function addBuilding(id) {
  builtSlots.splice(activeSlotCount(), 0, id);
}

function isLimited(building) {
  return building.colonyLimit !== "none";
}

/**
 * Recalcula, a partir de las ranuras ACTIVAS (excluye la cola inactiva que
 * haya quedado tras reducir especializaciones), todo lo que puede derivarse:
 * empleos totales, producción/consumo de recursos por esos empleos,
 * mantenimiento de los propios edificios, vivienda, comodidades y efectos
 * sin recurso asociado (Agente, Educador, Soldado).
 */
function computeTotals() {
  const counts = new Map();
  builtSlots.slice(0, activeSlotCount()).forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));

  const jobsTotals = {};
  const resourceTotals = {};
  const upkeepTotals = {};
  let housing = 0;
  let amenities = 0;

  const addResource = (bucket, resourceId, amount) => {
    bucket[resourceId] = (bucket[resourceId] || 0) + amount;
  };

  counts.forEach((count, id) => {
    const building = buildingsById.get(id);

    Object.entries(building.jobs || {}).forEach(([jobId, rawAmount]) => {
      // jobsTotals se guarda en crudo (×100, tal cual la wiki) para mostrarlo
      // sin dividir. Para la producción de recursos, en cambio, cada 100
      // (jobCount) es un empleo real, así que ahí sí se divide.
      jobsTotals[jobId] = (jobsTotals[jobId] || 0) + rawAmount * count;
      const jobCount = divideEffect(rawAmount) * count;

      Object.entries(JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, perJob]) => {
        addResource(resourceTotals, resourceId, perJob * jobCount);
      });

      if (building.jobBonus) {
        Object.entries(building.jobBonus).forEach(([resourceId, perJob]) => {
          addResource(resourceTotals, resourceId, perJob * jobCount);
        });
      }
    });

    housing += divideEffect(building.housing || 0) * count;
    amenities += divideEffect(building.amenities || 0) * count;

    Object.entries(building.upkeep || {}).forEach(([resourceId, amount]) => {
      addResource(upkeepTotals, resourceId, amount * count);
      addResource(resourceTotals, resourceId, amount * count);
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

  if (specInput) {
    specInput.setAttribute("aria-label", t(currentLang, "planetSimSpecInputLabel"));
  }
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

/** Formatea una cantidad, sin decimales innecesarios (2 en vez de 2.0), con signo cuando corresponde. */
function formatAmount(amount, forceSign) {
  const rounded = Math.round(amount * 100) / 100;
  const text = rounded % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(2).replace(/0$/, "");
  if (forceSign) return `${rounded < 0 ? "−" : "+"}${text}`;
  return rounded < 0 ? `−${text}` : text;
}

function buildingDisplayName(building) {
  return t(currentLang, building.i18nKey);
}

/** Lista de empleos completa (icono + nombre + cantidad), usada en los paneles de resumen/producción. */
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

/** Mini lista de empleos (solo icono + número, con el nombre como tooltip) para las filas compactas del catálogo. */
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

/** Rejilla visual de ranuras: base (siempre disponible) + un grupo de 3 por cada especialización posible. */
function renderSlotsGrid() {
  if (!slotsGridEl) return;
  slotsGridEl.replaceChildren();

  const used = usedSlots();
  let cursor = 0;

  const groups = [{ size: BUILDING_SLOT_RULES.base, locked: false }];
  for (let g = 1; g <= BUILDING_SLOT_RULES.maxSpecializations; g += 1) {
    groups.push({ size: BUILDING_SLOT_RULES.perSpecialization, locked: g > specializations });
  }

  groups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = `planet-slot-group${group.locked ? " is-locked-group" : ""}`;

    for (let i = 0; i < group.size; i += 1) {
      const slotIndex = cursor;
      cursor += 1;

      if (group.locked) {
        const inactiveId = builtSlots[slotIndex];
        if (inactiveId) {
          const building = buildingsById.get(inactiveId);
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "planet-slot is-locked is-inactive";
          slot.title = `${buildingDisplayName(building)} — ${t(currentLang, "planetSimSlotInactive")}`;
          const img = document.createElement("img");
          img.src = `${IMAGE_BASE}${building.img}`;
          img.alt = buildingDisplayName(building);
          img.loading = "lazy";
          slot.append(img);
          slot.addEventListener("click", () => {
            builtSlots.splice(slotIndex, 1);
            refresh();
          });
          groupEl.append(slot);
        } else {
          const slot = document.createElement("span");
          slot.className = "planet-slot is-locked";
          slot.title = t(currentLang, "planetSimSlotLocked");
          groupEl.append(slot);
        }
        continue;
      }

      if (slotIndex < used) {
        const buildingId = builtSlots[slotIndex];
        const building = buildingsById.get(buildingId);
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = `planet-slot is-filled ${isLimited(building) ? "is-limited" : "is-standard"}`;
        slot.title = `${buildingDisplayName(building)} — ${t(currentLang, "planetSimClickToDemolish")}`;
        const img = document.createElement("img");
        img.src = `${IMAGE_BASE}${building.img}`;
        img.alt = buildingDisplayName(building);
        img.loading = "lazy";
        slot.append(img);
        slot.addEventListener("click", () => {
          builtSlots.splice(slotIndex, 1);
          refresh();
        });
        groupEl.append(slot);
      } else {
        const slot = document.createElement("span");
        slot.className = "planet-slot is-empty";
        slot.title = t(currentLang, "planetSimSlotEmpty");
        groupEl.append(slot);
      }
    }

    slotsGridEl.append(groupEl);
  });
}

function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.replaceChildren();

  const full = usedSlots() >= totalSlots();

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
    if (!canAdd(building)) return;
    addBuilding(building.id);
    refresh();
  });

  return item;
}

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
  const used = usedSlots();
  const total = totalSlots();

  if (slotsLabel) {
    slotsLabel.textContent = t(currentLang, "planetSimSlotsLabel")(used, total);
  }

  renderSlotsGrid();
}

function renderStats(totals) {
  if (statHousing) statHousing.textContent = formatAmount(totals.housing, true);
  if (statAmenities) statAmenities.textContent = formatAmount(totals.amenities, true);
}

function refresh() {
  const totals = computeTotals();
  renderSlots();
  renderStats(totals);
  renderCatalog();
  renderSummary(totals);
  renderProduction(totals);
  renderUpkeep(totals);
}

if (specInput) {
  specInput.min = "0";
  specInput.max = String(BUILDING_SLOT_RULES.maxSpecializations);
  specInput.value = String(specializations);
  specInput.addEventListener("input", () => {
    const value = Number.parseInt(specInput.value, 10);
    specializations = Number.isNaN(value) ? 0 : Math.max(0, Math.min(BUILDING_SLOT_RULES.maxSpecializations, value));
    refresh();
  });
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
refresh();

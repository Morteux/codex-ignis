/**
 * Simulador de Planetas (v1.1).
 *
 * Cubre: elegir edificios para una colonia respetando el límite real de
 * ranuras de edificios, ver los empleos que aporta cada uno, y ver la
 * producción y el mantenimiento totales de recursos que resultan de esos
 * empleos y edificios. Ver js/planet-data.js para el origen de cada número.
 *
 * Esta página no usa js/legal.js: al construir la interfaz dinámicamente,
 * este módulo también aplica las traducciones (mismo mecanismo data-i18n /
 * data-i18n-attr que el resto del sitio) para mantenerlo todo sincronizado.
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
const slotsBar = document.querySelector("#planet-slots-bar");
const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const catalogEl = document.querySelector("#planet-catalog");
const selectedEl = document.querySelector("#planet-selected-list");
const selectedEmptyEl = document.querySelector("#planet-selected-empty");
const summaryEl = document.querySelector("#planet-summary");
const productionEl = document.querySelector("#planet-production");
const upkeepEl = document.querySelector("#planet-upkeep");
const nonResourceEl = document.querySelector("#planet-nonresource");
const metaDescription = document.querySelector('meta[name="description"]');

let currentLang = detectInitialLang();
let specializations = 0;
// buildingId -> número de copias construidas
const built = new Map();

const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

function totalSlots() {
  return calculateBuildingSlots(specializations);
}

function usedSlots() {
  let sum = 0;
  built.forEach((count) => { sum += count; });
  return sum;
}

function buildingCount(id) {
  return built.get(id) || 0;
}

function canAdd(building) {
  if (usedSlots() >= totalSlots()) return false;
  if (building.colonyLimit !== "none" && buildingCount(building.id) >= building.colonyLimit) return false;
  return true;
}

/**
 * Recalcula, a partir de los edificios construidos, todo lo que puede
 * derivarse de ellos: empleos totales, producción/consumo de recursos por
 * esos empleos, mantenimiento de los propios edificios, vivienda,
 * comodidades y efectos sin recurso asociado (Agente, Educador, Soldado).
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

  built.forEach((count, id) => {
    if (count <= 0) return;
    const building = buildingsById.get(id);

    Object.entries(building.jobs || {}).forEach(([jobId, rawAmount]) => {
      const jobCount = divideEffect(rawAmount) * count;
      jobsTotals[jobId] = (jobsTotals[jobId] || 0) + jobCount;

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

function buildingDisplayName(building) {
  return t(currentLang, building.i18nKey);
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

    const row = document.createElement("div");
    row.className = "planet-building-row";

    items.forEach((building) => {
      row.append(renderBuildingCard(building, full));
    });

    catalogEl.append(row);
  });
}

function renderBuildingCard(building, slotsFull) {
  const card = document.createElement("article");
  card.className = "planet-building-card";

  const count = buildingCount(building.id);
  if (count > 0) card.classList.add("is-built");

  const img = document.createElement("img");
  img.className = "planet-building-icon";
  img.src = `${IMAGE_BASE}${building.img}`;
  img.alt = "";
  img.loading = "lazy";
  card.append(img);

  const body = document.createElement("div");
  body.className = "planet-building-body";

  const title = document.createElement("h4");
  title.className = "planet-building-title";
  title.textContent = buildingDisplayName(building);
  if (count > 1) {
    const badge = document.createElement("span");
    badge.className = "planet-building-count";
    badge.textContent = `×${count}`;
    title.append(" ", badge);
  }
  body.append(title);

  const limitNote = document.createElement("p");
  limitNote.className = "planet-building-limit";
  limitNote.textContent = building.colonyLimit === "none"
    ? t(currentLang, "planetSimLimitNone")
    : t(currentLang, "planetSimLimitOnePerColony");
  body.append(limitNote);

  body.append(renderJobsList(
    Object.fromEntries(Object.entries(building.jobs || {}).map(([jobId, raw]) => [jobId, divideEffect(raw)]))
  ));

  if (building.housing || building.amenities) {
    const extra = document.createElement("p");
    extra.className = "planet-building-extra";
    const parts = [];
    if (building.housing) parts.push(t(currentLang, "planetSimHousingLabel")(formatAmount(divideEffect(building.housing))));
    if (building.amenities) parts.push(t(currentLang, "planetSimAmenitiesLabel")(formatAmount(divideEffect(building.amenities))));
    extra.textContent = parts.join(" · ");
    body.append(extra);
  }

  card.append(body);

  const atLimit = building.colonyLimit !== "none" && count >= building.colonyLimit;
  const disabled = slotsFull || atLimit;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "planet-add-btn";
  button.textContent = t(currentLang, "planetSimAddButton");
  button.disabled = disabled;
  button.title = atLimit ? t(currentLang, "planetSimLimitReached") : (slotsFull ? t(currentLang, "planetSimSlotsFull") : "");
  button.addEventListener("click", () => {
    if (!canAdd(building)) return;
    built.set(building.id, buildingCount(building.id) + 1);
    refresh();
  });
  card.append(button);

  return card;
}

function renderSelected() {
  if (!selectedEl) return;
  selectedEl.replaceChildren();

  const ids = [...built.keys()].filter((id) => built.get(id) > 0);

  if (selectedEmptyEl) selectedEmptyEl.hidden = ids.length > 0;

  ids.forEach((id) => {
    const building = buildingsById.get(id);
    const count = buildingCount(id);
    const item = document.createElement("div");
    item.className = "planet-selected-item";

    const header = document.createElement("div");
    header.className = "planet-selected-header";
    const name = document.createElement("span");
    name.textContent = `${buildingDisplayName(building)}${count > 1 ? ` ×${count}` : ""}`;
    header.append(name);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "planet-remove-btn";
    removeButton.textContent = t(currentLang, "planetSimRemoveButton");
    removeButton.addEventListener("click", () => {
      const next = buildingCount(id) - 1;
      if (next <= 0) built.delete(id);
      else built.set(id, next);
      refresh();
    });
    header.append(removeButton);

    item.append(header);
    item.append(renderJobsList(
      Object.fromEntries(Object.entries(building.jobs || {}).map(([jobId, amount]) => [jobId, divideEffect(amount) * count]))
    ));
    selectedEl.append(item);
  });
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

  if (slotsBar) {
    slotsBar.replaceChildren();
    for (let i = 0; i < total; i += 1) {
      const seg = document.createElement("span");
      seg.className = `planet-slot-segment${i < used ? " is-filled" : ""}`;
      slotsBar.append(seg);
    }
  }
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
  renderSelected();
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

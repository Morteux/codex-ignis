/**
 * Simulador de Planetas (primera versión).
 *
 * Cubre lo básico: elegir edificios para una colonia, respetar el límite
 * real de ranuras de edificios (ver js/planet-data.js) y mostrar los empleos
 * que aporta cada edificio construido, con un resumen total de empleos.
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
  CATEGORY_ORDER,
  CATEGORY_I18N_KEYS,
  BUILDING_SLOT_RULES,
  calculateBuildingSlots
} from "./planet-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const specInput = document.querySelector("#planet-spec-input");
const slotsLabel = document.querySelector("#planet-slots-label");
const catalogEl = document.querySelector("#planet-catalog");
const selectedEl = document.querySelector("#planet-selected-list");
const selectedEmptyEl = document.querySelector("#planet-selected-empty");
const summaryEl = document.querySelector("#planet-summary");
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

function jobName(jobId) {
  return t(currentLang, JOBS[jobId].i18nKey);
}

/** Formatea una cantidad de empleos, sin decimales innecesarios (2 en vez de 2.0). */
function formatAmount(amount) {
  const rounded = Math.round(amount * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
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

    const grid = document.createElement("div");
    grid.className = "planet-building-grid";

    items.forEach((building) => {
      grid.append(renderBuildingCard(building, full));
    });

    catalogEl.append(grid);
  });
}

function renderBuildingCard(building, slotsFull) {
  const card = document.createElement("article");
  card.className = "planet-building-card";

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
  body.append(title);

  const limitNote = document.createElement("p");
  limitNote.className = "planet-building-limit";
  limitNote.textContent = building.colonyLimit === "none"
    ? t(currentLang, "planetSimLimitNone")
    : t(currentLang, "planetSimLimitOnePerColony");
  body.append(limitNote);

  body.append(renderJobsList(building.jobs));

  if (building.housing || building.amenities) {
    const extra = document.createElement("p");
    extra.className = "planet-building-extra";
    const parts = [];
    if (building.housing) parts.push(t(currentLang, "planetSimHousingLabel")(building.housing));
    if (building.amenities) parts.push(t(currentLang, "planetSimAmenitiesLabel")(building.amenities));
    extra.textContent = parts.join(" · ");
    body.append(extra);
  }

  card.append(body);

  const atLimit = building.colonyLimit !== "none" && buildingCount(building.id) >= building.colonyLimit;
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
      Object.fromEntries(Object.entries(building.jobs).map(([jobId, amount]) => [jobId, amount * count]))
    ));
    selectedEl.append(item);
  });
}

function renderSummary() {
  if (!summaryEl) return;
  summaryEl.replaceChildren();

  const totals = {};
  built.forEach((count, id) => {
    const building = buildingsById.get(id);
    Object.entries(building.jobs).forEach(([jobId, amount]) => {
      totals[jobId] = (totals[jobId] || 0) + amount * count;
    });
  });

  const hasAny = Object.values(totals).some((amount) => amount > 0);
  if (!hasAny) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "planetSimSummaryEmpty");
    summaryEl.append(empty);
    return;
  }

  summaryEl.append(renderJobsList(totals));
}

function renderSlots() {
  if (slotsLabel) {
    slotsLabel.textContent = t(currentLang, "planetSimSlotsLabel")(usedSlots(), totalSlots());
  }
}

function refresh() {
  renderSlots();
  renderCatalog();
  renderSelected();
  renderSummary();
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

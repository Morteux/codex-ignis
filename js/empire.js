/**
 * Pestaña "Imperio" del simulador de planetas: autoridades (sistema de
 * puntos de ética), forma de gobierno (Authority) y principios (Civics).
 *
 * Igual que bingo.js o legal.js, este módulo mantiene su propio idioma y
 * sus propios listeners sobre los botones .lang-btn (compartidos con
 * planet-sim.js en esta misma página): las etiquetas estáticas con
 * data-i18n de este panel ya las traduce el barrido genérico de
 * planet-sim.js, así que aquí solo hace falta volver a pintar el
 * contenido generado dinámicamente (ejes de autoridad, formas de
 * gobierno, principios) cuando cambia el idioma o la selección.
 *
 * Ver js/empire-data.js para el origen de los datos y las simplificaciones
 * documentadas (autoridades de ascensión, requisitos de origen/otros
 * principios, etc.).
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { PRINCIPLE_BINGO, IMAGE_BASE } from "./bingo-data.js";
import {
  ETHICS_MAX_POINTS,
  ETHIC_AXES,
  GESTALT_CONSCIOUSNESS,
  ETHIC_OPTIONS,
  AUTHORITIES,
  authorityAvailable,
  MAX_CIVICS,
  civicAvailable
} from "./empire-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const pointsLabelEl = document.querySelector("#empire-points-label");
const axesContainer = document.querySelector("#empire-ethics-axes");
const gestaltCheckbox = document.querySelector("#empire-gestalt-checkbox");
const authorityListEl = document.querySelector("#empire-authority-list");
const civicsLabelEl = document.querySelector("#empire-civics-label");
const civicsListEl = document.querySelector("#empire-civics-list");

let currentLang = detectInitialLang();

// Una opción elegida (o null) por cada eje de ETHIC_AXES.
const axisSelection = new Map(ETHIC_AXES.map((axis) => [axis.id, null]));
let gestaltActive = false;
let selectedAuthorityId = null;
const selectedCivics = new Set();

/** Ids de las éticas actualmente activas (las de los 4 ejes, o solo consciencia gestalt si está activa). */
function currentEthicIds() {
  if (gestaltActive) return [GESTALT_CONSCIOUSNESS.id];
  return [...axisSelection.values()].filter(Boolean);
}

function pointsUsed() {
  if (gestaltActive) return GESTALT_CONSCIOUSNESS.cost;
  let total = 0;
  axisSelection.forEach((optionId) => {
    if (optionId) total += ETHIC_OPTIONS[optionId].cost;
  });
  return total;
}

function selectAxisOption(axisId, optionId) {
  const current = axisSelection.get(axisId);
  if (current === optionId) {
    axisSelection.set(axisId, null);
  } else {
    const option = ETHIC_OPTIONS[optionId];
    const currentCost = current ? ETHIC_OPTIONS[current].cost : 0;
    if (pointsUsed() - currentCost + option.cost > ETHICS_MAX_POINTS) return;
    axisSelection.set(axisId, optionId);
  }
  onEthicsChanged();
}

function setGestalt(active) {
  gestaltActive = active;
  if (active) {
    axisSelection.forEach((_, axisId) => axisSelection.set(axisId, null));
  }
  onEthicsChanged();
}

/** Al cambiar de éticas, la forma de gobierno y los principios elegidos pueden dejar de ser válidos. */
function onEthicsChanged() {
  if (selectedAuthorityId) {
    const authority = AUTHORITIES.find((a) => a.id === selectedAuthorityId);
    if (!authority || !authorityAvailable(authority, currentEthicIds())) {
      selectedAuthorityId = null;
    }
  }
  pruneUnavailableCivics();
  refresh();
}

function selectAuthority(authorityId) {
  selectedAuthorityId = selectedAuthorityId === authorityId ? null : authorityId;
  pruneUnavailableCivics();
  refresh();
}

function pruneUnavailableCivics() {
  const ethics = currentEthicIds();
  [...selectedCivics].forEach((key) => {
    if (!civicAvailable(key, ethics, selectedAuthorityId)) selectedCivics.delete(key);
  });
}

function toggleCivic(i18nKey) {
  if (selectedCivics.has(i18nKey)) {
    selectedCivics.delete(i18nKey);
  } else if (selectedCivics.size < MAX_CIVICS) {
    selectedCivics.add(i18nKey);
  }
  refresh();
}

function renderEthicsAxes() {
  if (!axesContainer) return;
  axesContainer.replaceChildren();
  const used = pointsUsed();
  ETHIC_AXES.forEach((axis) => {
    const row = document.createElement("div");
    row.className = "empire-axis-row";
    const selected = axisSelection.get(axis.id);
    axis.options.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "empire-ethic-btn";
      const isSelected = selected === option.id;
      btn.classList.toggle("is-selected", isSelected);
      const freeBudget = used - (selected ? ETHIC_OPTIONS[selected].cost : 0);
      btn.disabled = gestaltActive || (!isSelected && freeBudget + option.cost > ETHICS_MAX_POINTS);
      btn.textContent = `${t(currentLang, option.i18nKey)} (${option.cost})`;
      btn.addEventListener("click", () => selectAxisOption(axis.id, option.id));
      row.append(btn);
    });
    axesContainer.append(row);
  });
}

function renderAuthorityList() {
  if (!authorityListEl) return;
  authorityListEl.replaceChildren();
  const ethics = currentEthicIds();
  if (!ethics.length) {
    const note = document.createElement("p");
    note.className = "empire-note";
    note.textContent = t(currentLang, "empireChooseEthicsFirst");
    authorityListEl.append(note);
    return;
  }
  AUTHORITIES.forEach((authority) => {
    const available = authorityAvailable(authority, ethics);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-authority-card";
    card.classList.toggle("is-selected", selectedAuthorityId === authority.id);
    card.disabled = !available;

    const title = document.createElement("strong");
    title.textContent = t(currentLang, authority.i18nKey);
    card.append(title);

    const blurb = document.createElement("span");
    blurb.className = "empire-authority-blurb";
    blurb.textContent = t(currentLang, authority.blurbI18nKey);
    card.append(blurb);

    if (!available) {
      const lock = document.createElement("em");
      lock.className = "empire-authority-lock";
      const names = authority.requiresEthicsAnyOf.map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey));
      lock.textContent = t(currentLang, "empireAuthorityLockedPrefix") + names.join(t(currentLang, "empireOrWord"));
      card.append(lock);
    }

    card.addEventListener("click", () => { if (available) selectAuthority(authority.id); });
    authorityListEl.append(card);
  });
}

function renderCivicsList() {
  if (civicsLabelEl) civicsLabelEl.textContent = t(currentLang, "empireCivicsSlotsLabel")(selectedCivics.size, MAX_CIVICS);
  if (!civicsListEl) return;
  civicsListEl.replaceChildren();

  if (!selectedAuthorityId) {
    const note = document.createElement("p");
    note.className = "empire-note";
    note.textContent = t(currentLang, "empireChooseAuthorityFirst");
    civicsListEl.append(note);
    return;
  }

  const ethics = currentEthicIds();
  const available = PRINCIPLE_BINGO.filter((entry) => civicAvailable(entry.i18nKey, ethics, selectedAuthorityId));
  if (!available.length) {
    const note = document.createElement("p");
    note.className = "empire-note";
    note.textContent = t(currentLang, "empireCivicsEmpty");
    civicsListEl.append(note);
    return;
  }

  const atLimit = selectedCivics.size >= MAX_CIVICS;
  available.forEach((entry) => {
    const isSelected = selectedCivics.has(entry.i18nKey);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-civic-card";
    card.classList.toggle("is-selected", isSelected);
    card.disabled = !isSelected && atLimit;
    card.title = !isSelected && atLimit ? t(currentLang, "empireCivicsLimitReached") : "";

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${entry.img}`;
    img.alt = "";
    img.loading = "lazy";
    card.append(img);

    const name = document.createElement("span");
    name.textContent = t(currentLang, entry.i18nKey);
    card.append(name);

    card.addEventListener("click", () => toggleCivic(entry.i18nKey));
    civicsListEl.append(card);
  });
}

function refresh() {
  if (pointsLabelEl) pointsLabelEl.textContent = t(currentLang, "empirePointsLabel")(pointsUsed(), ETHICS_MAX_POINTS);
  if (gestaltCheckbox) gestaltCheckbox.checked = gestaltActive;
  renderEthicsAxes();
  renderAuthorityList();
  renderCivicsList();
}

if (gestaltCheckbox) {
  gestaltCheckbox.addEventListener("change", () => setGestalt(gestaltCheckbox.checked));
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    refresh();
  });
});

refresh();

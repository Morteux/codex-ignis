/**
 * Pestaña "Imperio": éticas (sistema de 3 puntos, mostradas como la rueda
 * de éticas del juego), autoridades (según tus éticas) y principios
 * (según tus éticas y autoridad).
 *
 * Igual que bingo.js o legal.js, este módulo mantiene su propio idioma y
 * sus propios listeners sobre los botones .lang-btn (compartidos con
 * planet-sim.js en esta misma página): las etiquetas estáticas con
 * data-i18n de este panel ya las traduce el barrido genérico de
 * planet-sim.js, así que aquí solo hace falta volver a pintar el
 * contenido generado dinámicamente cuando cambia el idioma o la selección.
 *
 * Las éticas y la autoridad elegidas se publican en el estado compartido
 * (js/planet-state.js) para que planet-sim.js les aplique sus bonos a los
 * cálculos del planeta (ver collectAppliedEffects en empire-data.js).
 *
 * Ver js/empire-data.js para el origen de los datos y las simplificaciones.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { PRINCIPLE_BINGO, IMAGE_BASE } from "./bingo-data.js";
import { updatePlanetState } from "./planet-state.js";
import {
  ETHICS_MAX_POINTS,
  ETHIC_AXES,
  GESTALT_CONSCIOUSNESS,
  ETHIC_OPTIONS,
  ETHIC_WHEEL,
  ETHIC_ICONS,
  ETHIC_EFFECTS,
  AUTHORITY_EFFECTS,
  AUTHORITIES,
  authorityAvailable,
  blockingEthics,
  ethicsComplete,
  MAX_CIVICS,
  civicAvailable
} from "./empire-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const pointsLabelEl = document.querySelector("#empire-points-label");
const wheelEl = document.querySelector("#empire-ethics-wheel");
const ethicsEffectsEl = document.querySelector("#empire-ethics-effects");
const authorityListEl = document.querySelector("#empire-authority-list");
const civicsLabelEl = document.querySelector("#empire-civics-label");
const civicsListEl = document.querySelector("#empire-civics-list");

let currentLang = detectInitialLang();

// Una opción elegida (o null) por cada eje de ETHIC_AXES.
const axisSelection = new Map(ETHIC_AXES.map((axis) => [axis.id, null]));
const axisOfOption = new Map(ETHIC_AXES.flatMap((axis) => axis.options.map((option) => [option.id, axis.id])));
let gestaltActive = false;
let selectedAuthorityId = null;
const selectedCivics = new Set();

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

function selectEthic(optionId) {
  if (optionId === GESTALT_CONSCIOUSNESS.id) {
    gestaltActive = !gestaltActive;
    if (gestaltActive) axisSelection.forEach((_, axisId) => axisSelection.set(axisId, null));
  } else {
    const axisId = axisOfOption.get(optionId);
    const current = axisSelection.get(axisId);
    if (current === optionId) {
      axisSelection.set(axisId, null);
    } else {
      const currentCost = current ? ETHIC_OPTIONS[current].cost : 0;
      if (pointsUsed() - currentCost + ETHIC_OPTIONS[optionId].cost > ETHICS_MAX_POINTS) return;
      axisSelection.set(axisId, optionId);
    }
  }
  onEthicsChanged();
}

/** Al cambiar de éticas, la autoridad y los principios elegidos pueden dejar de ser válidos. */
function onEthicsChanged() {
  if (selectedAuthorityId) {
    const authority = AUTHORITIES.find((a) => a.id === selectedAuthorityId);
    if (!authority || !authorityAvailable(authority, currentEthicIds())) selectedAuthorityId = null;
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
  if (selectedCivics.has(i18nKey)) selectedCivics.delete(i18nKey);
  else if (selectedCivics.size < MAX_CIVICS) selectedCivics.add(i18nKey);
  refresh();
}

/** "+10%", "−20%", "+1", "−1" (con signo menos tipográfico). */
function formatEffectValue(effect) {
  const raw = effect.unit === "percent" ? Math.round(effect.value * 1000) / 10 : effect.value;
  const text = `${Math.abs(raw)}${effect.unit === "percent" ? "%" : ""}`;
  return `${raw < 0 ? "−" : "+"}${text}`;
}

/** Lista de efectos de una ética/autoridad; los que se aplican a los cálculos del planeta salen resaltados. */
function renderEffectList(effects) {
  const list = document.createElement("ul");
  list.className = "empire-effect-list";
  effects.forEach((effect) => {
    const item = document.createElement("li");
    item.className = effect.apply ? "is-applied" : "is-info";
    item.title = effect.apply ? "" : t(currentLang, "empireEffectNotApplied");
    const value = document.createElement("strong");
    value.textContent = formatEffectValue(effect);
    item.append(value, ` ${t(currentLang, `effect_${effect.label}`)}`);
    list.append(item);
  });
  return list;
}

function renderWheel() {
  if (!wheelEl) return;
  wheelEl.replaceChildren();
  const used = pointsUsed();
  const selectedIds = new Set(currentEthicIds());
  Object.entries(ETHIC_WHEEL).forEach(([optionId, [row, col]]) => {
    const option = ETHIC_OPTIONS[optionId];
    const isSelected = selectedIds.has(optionId);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "empire-ethic-btn";
    btn.style.gridRow = String(row);
    btn.style.gridColumn = String(col);
    btn.classList.toggle("is-selected", isSelected);
    btn.classList.toggle("is-fanatic", option.cost === 2);

    let disabled;
    if (optionId === GESTALT_CONSCIOUSNESS.id) {
      disabled = !isSelected && used > 0;
    } else {
      const current = axisSelection.get(axisOfOption.get(optionId));
      const freeBudget = used - (current ? ETHIC_OPTIONS[current].cost : 0);
      disabled = gestaltActive || (!isSelected && freeBudget + option.cost > ETHICS_MAX_POINTS);
    }
    btn.disabled = disabled;

    const name = t(currentLang, option.i18nKey);
    btn.title = `${name} (${option.cost})`;
    btn.setAttribute("aria-label", btn.title);
    btn.setAttribute("aria-pressed", String(isSelected));

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${ETHIC_ICONS[optionId]}`;
    img.alt = "";
    btn.append(img);
    btn.addEventListener("click", () => selectEthic(optionId));
    wheelEl.append(btn);
  });
}

function renderEthicsEffects() {
  if (!ethicsEffectsEl) return;
  ethicsEffectsEl.replaceChildren();
  currentEthicIds().forEach((id) => {
    const block = document.createElement("div");
    block.className = "empire-effect-block";
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${ETHIC_ICONS[id]}`;
    img.alt = "";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = t(currentLang, ETHIC_OPTIONS[id].i18nKey);
    body.append(title, renderEffectList(ETHIC_EFFECTS[id] || []));
    block.append(img, body);
    ethicsEffectsEl.append(block);
  });
}

function lockReason(authority, ethics) {
  if (!ethicsComplete(ethics)) return t(currentLang, "empireSpendAllPoints");
  const isGestalt = ethics.includes(GESTALT_CONSCIOUSNESS.id);
  if (authority.gestalt !== isGestalt) {
    return t(currentLang, authority.gestalt ? "empireRequiresGestalt" : "empireNotWithGestalt");
  }
  const names = blockingEthics(authority, ethics).map((id) => t(currentLang, ETHIC_OPTIONS[id].i18nKey));
  return t(currentLang, "empireBlockedBy") + names.join(", ");
}

function renderAuthorityList() {
  if (!authorityListEl) return;
  authorityListEl.replaceChildren();
  const ethics = currentEthicIds();
  AUTHORITIES.forEach((authority) => {
    const available = authorityAvailable(authority, ethics);
    const isSelected = selectedAuthorityId === authority.id;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "empire-authority-card";
    card.classList.toggle("is-selected", isSelected);
    card.disabled = !available;

    const header = document.createElement("div");
    header.className = "empire-authority-header";
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${authority.img}`;
    img.alt = "";
    const title = document.createElement("strong");
    title.textContent = t(currentLang, authority.i18nKey);
    header.append(img, title);
    card.append(header);

    const blurb = document.createElement("span");
    blurb.className = "empire-authority-blurb";
    blurb.textContent = t(currentLang, authority.blurbI18nKey);
    card.append(blurb);

    if (!available) {
      const lock = document.createElement("em");
      lock.className = "empire-authority-lock";
      lock.textContent = lockReason(authority, ethics);
      card.append(lock);
    } else if (isSelected) {
      card.append(renderEffectList(AUTHORITY_EFFECTS[authority.id] || []));
    }

    card.addEventListener("click", () => { if (available) selectAuthority(authority.id); });
    authorityListEl.append(card);
  });
}

function renderCivicsList() {
  if (civicsLabelEl) civicsLabelEl.textContent = t(currentLang, "empireCivicsSlotsLabel")(selectedCivics.size, MAX_CIVICS);
  if (!civicsListEl) return;
  civicsListEl.replaceChildren();

  const note = (key) => {
    const p = document.createElement("p");
    p.className = "empire-note";
    p.textContent = t(currentLang, key);
    civicsListEl.append(p);
  };

  if (!selectedAuthorityId) return note("empireChooseAuthorityFirst");

  const ethics = currentEthicIds();
  const available = PRINCIPLE_BINGO.filter((entry) => civicAvailable(entry.i18nKey, ethics, selectedAuthorityId));
  if (!available.length) return note("empireCivicsEmpty");

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
    const name = document.createElement("span");
    name.textContent = t(currentLang, entry.i18nKey);
    card.append(img, name);
    card.addEventListener("click", () => toggleCivic(entry.i18nKey));
    civicsListEl.append(card);
  });
}

let lastPublishedKey = null;
/** Publica éticas y autoridad en el estado compartido (solo si cambian) para que planet-sim.js les aplique sus bonos. */
function publishSelection() {
  const ethicIds = currentEthicIds();
  const key = `${ethicIds.join(",")}|${selectedAuthorityId}`;
  if (key === lastPublishedKey) return;
  lastPublishedKey = key;
  updatePlanetState({ ethicIds, authorityId: selectedAuthorityId });
}

function refresh() {
  if (pointsLabelEl) pointsLabelEl.textContent = t(currentLang, "empirePointsLabel")(pointsUsed(), ETHICS_MAX_POINTS);
  renderWheel();
  renderEthicsEffects();
  renderAuthorityList();
  renderCivicsList();
  publishSelection();
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    refresh();
  });
});

refresh();

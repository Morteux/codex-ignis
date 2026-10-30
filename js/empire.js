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
 * Perfiles de imperio guardados (P5): la pestaña puede guardarse con nombre
 * (js/empire-profiles.js) y cambiarse desde el desplegable de la barra de
 * resumen. Editar con un imperio seleccionado NO guarda solo: hace falta
 * pulsar Guardar (se indica con "cambios sin guardar").
 *
 * Ver js/empire-data.js para el origen de los datos y las simplificaciones.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { PRINCIPLE_BINGO } from "./bingo-data.js";
import { updatePlanetState, emitEmpireSwitched } from "./planet-state.js";
import { getEmpire, createEmpire, updateEmpireConfig, renameEmpire, deleteEmpire, onEmpiresChange, configsEqual } from "./empire-profiles.js";
import { confirmChoice } from "./confirm-dialog.js";
import { SPECIES_TYPES, allowedSpeciesTypes } from "./planet-data.js";
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
const speciesSelectEl = document.querySelector("#empire-species-select");
const civicsLabelEl = document.querySelector("#empire-civics-label");
const civicsListEl = document.querySelector("#empire-civics-list");
const profileNameEl = document.querySelector("#empire-profile-name");
const profileSaveNewBtn = document.querySelector("#empire-profile-save-new");
const profileSaveBtn = document.querySelector("#empire-profile-save");
const profileRenameBtn = document.querySelector("#empire-profile-rename");
const profileDeleteBtn = document.querySelector("#empire-profile-delete");
const profileStateEl = document.querySelector("#empire-profile-state");
const profileMessageEl = document.querySelector("#empire-profile-message");

let currentLang = detectInitialLang();

// Una opción elegida (o null) por cada eje de ETHIC_AXES.
const axisSelection = new Map(ETHIC_AXES.map((axis) => [axis.id, null]));
const axisOfOption = new Map(ETHIC_AXES.flatMap((axis) => axis.options.map((option) => [option.id, axis.id])));
let gestaltActive = false;
let selectedAuthorityId = null;
const selectedCivics = new Set();
let selectedSpeciesType = "organic";
let selectedEmpireId = null; // imperio guardado seleccionado (null = borrador sin guardar)

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
    if (!civicAvailable(key, ethics, selectedAuthorityId, [...selectedCivics])) selectedCivics.delete(key);
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

/**
 * Tipo de especie: solo cambia el mantenimiento de los empleos de conciencia
 * gestalt. Una Inteligencia de Máquina solo puede ser especie máquina y una
 * Mente Colmena no puede serlo (ver allowedSpeciesTypes en planet-data.js).
 */
function renderSpeciesSelect() {
  if (!speciesSelectEl) return;
  const allowed = allowedSpeciesTypes(selectedAuthorityId);
  if (!allowed.includes(selectedSpeciesType)) selectedSpeciesType = allowed[0];
  speciesSelectEl.replaceChildren();
  SPECIES_TYPES.filter((type) => allowed.includes(type.id)).forEach((type) => {
    const option = document.createElement("option");
    option.value = type.id;
    option.textContent = t(currentLang, type.i18nKey);
    speciesSelectEl.append(option);
  });
  speciesSelectEl.value = selectedSpeciesType;
}

if (speciesSelectEl) {
  speciesSelectEl.addEventListener("change", () => {
    selectedSpeciesType = speciesSelectEl.value;
    refresh();
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
  const chosen = [...selectedCivics];
  const available = PRINCIPLE_BINGO.filter((entry) => civicAvailable(entry.i18nKey, ethics, selectedAuthorityId, chosen));
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
/** Publica éticas, autoridad, principios e imperio seleccionado en el estado compartido (solo si cambian) para que planet-sim.js y la barra de resumen los usen. */
function publishSelection() {
  const ethicIds = currentEthicIds();
  const civicIds = [...selectedCivics];
  const modified = isModified();
  const key = `${ethicIds.join(",")}|${selectedAuthorityId}|${[...civicIds].sort().join(",")}|${selectedSpeciesType}|${selectedEmpireId}|${modified}`;
  if (key === lastPublishedKey) return;
  lastPublishedKey = key;
  updatePlanetState({ ethicIds, authorityId: selectedAuthorityId, civicIds, speciesType: selectedSpeciesType, empireId: selectedEmpireId, empireModified: modified });
}

function refresh() {
  if (pointsLabelEl) pointsLabelEl.textContent = t(currentLang, "empirePointsLabel")(pointsUsed(), ETHICS_MAX_POINTS);
  renderWheel();
  renderEthicsEffects();
  renderAuthorityList();
  renderSpeciesSelect();
  renderCivicsList();
  renderProfilePanel();
  publishSelection();
}

/* ── Perfiles de imperio guardados (P5) ─────────────────────────────── */

/** Configuración actual de la pestaña Imperio, con la misma forma que un perfil guardado. */
function currentConfig() {
  return { ethicIds: currentEthicIds(), authorityId: selectedAuthorityId, civicIds: [...selectedCivics], speciesType: selectedSpeciesType };
}

/** ¿Hay un imperio guardado seleccionado y la pestaña ya no coincide con lo guardado? (sin imperio seleccionado no hay "cambios sin guardar": es un borrador) */
function isModified() {
  if (!selectedEmpireId) return false;
  const profile = getEmpire(selectedEmpireId);
  return Boolean(profile) && !configsEqual(profile, currentConfig());
}

/** Vuelca un perfil guardado en la pestaña Imperio. Ignora (no inventa) lo que ya no sea válido, p. ej. un principio incompatible. */
function applyConfig(config) {
  axisSelection.forEach((_, axisId) => axisSelection.set(axisId, null));
  gestaltActive = false;
  const ethicIds = (config.ethicIds || []).filter((id) => ETHIC_OPTIONS[id]);
  if (ethicIds.includes(GESTALT_CONSCIOUSNESS.id)) {
    gestaltActive = true;
  } else {
    let used = 0;
    ethicIds.forEach((id) => {
      const axisId = axisOfOption.get(id);
      if (!axisId || axisSelection.get(axisId)) return;
      const cost = ETHIC_OPTIONS[id].cost;
      if (used + cost > ETHICS_MAX_POINTS) return;
      axisSelection.set(axisId, id);
      used += cost;
    });
  }
  const authority = AUTHORITIES.find((entry) => entry.id === config.authorityId);
  selectedAuthorityId = authority && authorityAvailable(authority, currentEthicIds()) ? authority.id : null;
  selectedCivics.clear();
  (config.civicIds || []).forEach((key) => {
    if (selectedCivics.size >= MAX_CIVICS) return;
    if (civicAvailable(key, currentEthicIds(), selectedAuthorityId, [...selectedCivics, key])) selectedCivics.add(key);
  });
  pruneUnavailableCivics();
  selectedSpeciesType = SPECIES_TYPES.some((type) => type.id === config.speciesType) ? config.speciesType : "organic";
}

let messageTimer = null;
/** Mensaje breve de resultado de una acción de perfil (se borra solo a los 6 s). */
function showProfileMessage(text) {
  if (!profileMessageEl) return;
  profileMessageEl.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { profileMessageEl.textContent = ""; }, 6000);
}

function reportResult(result, successKey) {
  if (!result.ok) {
    showProfileMessage(t(currentLang, { empty: "empireProfileErrorEmpty", duplicate: "empireProfileErrorDuplicate", notFound: "empireProfileErrorNotFound" }[result.error]));
    return false;
  }
  const base = t(currentLang, successKey)(result.profile.name);
  showProfileMessage(result.persisted ? base : `${base} ${t(currentLang, "empireProfileWarnNotPersisted")}`);
  return true;
}

let lastSyncedEmpireId;
function renderProfilePanel() {
  const profile = selectedEmpireId ? getEmpire(selectedEmpireId) : null;
  // El campo de nombre solo se rellena al cambiar de imperio seleccionado, para no pisar lo que el usuario esté escribiendo.
  if (lastSyncedEmpireId !== selectedEmpireId) {
    lastSyncedEmpireId = selectedEmpireId;
    if (profileNameEl) profileNameEl.value = profile ? profile.name : "";
  }
  const modified = isModified();
  if (profileStateEl) {
    profileStateEl.textContent = !profile
      ? t(currentLang, "empireProfileStateDraft")
      : t(currentLang, modified ? "empireProfileStateModified" : "empireProfileStateSaved")(profile.name);
    profileStateEl.classList.toggle("is-modified", modified);
  }
  if (profileSaveBtn) profileSaveBtn.disabled = !(profile && modified);
  if (profileRenameBtn) profileRenameBtn.disabled = !profile;
  if (profileDeleteBtn) profileDeleteBtn.disabled = !profile;
}

/**
 * Si hay un imperio seleccionado con cambios sin guardar, pregunta qué hacer
 * (Guardar / No guardar / Cancelar). Devuelve true si se puede continuar
 * (guardado o descartado) y false si el usuario cancela. Reutilizable al
 * cargar un planeta (P6).
 */
export async function resolveUnsavedEmpireChanges() {
  if (!isModified()) return true;
  const profile = getEmpire(selectedEmpireId);
  const choice = await confirmChoice({
    title: t(currentLang, "empireUnsavedTitle"),
    message: t(currentLang, "empireUnsavedMessage")(profile.name),
    buttons: [
      { id: "save", label: t(currentLang, "empireUnsavedSave"), variant: "primary" },
      { id: "discard", label: t(currentLang, "empireUnsavedDiscard") },
      { id: "cancel", label: t(currentLang, "empireDialogCancel") }
    ],
    cancelId: "cancel"
  });
  if (choice === "save") {
    updateEmpireConfig(selectedEmpireId, currentConfig());
    return true;
  }
  return choice === "discard";
}

/**
 * Cambia de imperio guardado (null = dejar la configuración actual como
 * borrador sin guardar). Con cambios sin guardar pide confirmación; al
 * aplicar otro imperio, planet-sim.js avisa de los edificios que quedan
 * inactivos por requisitos, sin borrarlos (ver emitEmpireSwitched). Cambiar a "ninguno" no
 * toca la configuración ni los edificios, así que no pide confirmación.
 */
export async function requestSwitchEmpire(targetId) {
  const target = targetId ? getEmpire(targetId) : null;
  if (targetId && !target) { refresh(); return; }
  if ((target ? target.id : null) === selectedEmpireId) return;
  if (target && !(await resolveUnsavedEmpireChanges())) { refresh(); return; }
  selectedEmpireId = target ? target.id : null;
  if (target) applyConfig(target);
  refresh();
  if (target) emitEmpireSwitched({ empireId: target.id, name: target.name });
}

/**
 * Aplica el imperio de un planeta que se está cargando de la biblioteca (P6).
 * Si el imperio guardado sigue existiendo se usa su versión ACTUAL; si ya no
 * existe (o el planeta se guardó con un borrador), se aplica la copia en bruto
 * del planeta (`snapshot`) como borrador sin guardar. Con cambios sin guardar
 * en el imperio actual pide confirmación (Guardar / No guardar / Cancelar).
 * Devuelve false si el usuario cancela. No emite el aviso de cambio de imperio:
 * quien carga el planeta informa de los edificios inactivos.
 */
export async function loadPlanetEmpire(empireId, snapshot) {
  if (!(await resolveUnsavedEmpireChanges())) return false;
  const target = empireId ? getEmpire(empireId) : null;
  if (target) {
    selectedEmpireId = target.id;
    applyConfig(target);
  } else {
    selectedEmpireId = null;
    if (snapshot) applyConfig(snapshot);
  }
  refresh();
  return true;
}

if (profileSaveNewBtn) {
  profileSaveNewBtn.addEventListener("click", () => {
    const result = createEmpire(profileNameEl ? profileNameEl.value : "", currentConfig());
    if (!reportResult(result, "empireProfileMsgCreated")) return;
    selectedEmpireId = result.profile.id;
    refresh();
  });
}

if (profileSaveBtn) {
  profileSaveBtn.addEventListener("click", () => {
    if (!selectedEmpireId) return;
    reportResult(updateEmpireConfig(selectedEmpireId, currentConfig()), "empireProfileMsgSaved");
  });
}

if (profileRenameBtn) {
  profileRenameBtn.addEventListener("click", () => {
    if (!selectedEmpireId) return;
    reportResult(renameEmpire(selectedEmpireId, profileNameEl ? profileNameEl.value : ""), "empireProfileMsgRenamed");
  });
}

if (profileDeleteBtn) {
  profileDeleteBtn.addEventListener("click", async () => {
    const profile = selectedEmpireId ? getEmpire(selectedEmpireId) : null;
    if (!profile) return;
    const choice = await confirmChoice({
      title: t(currentLang, "empireDeleteTitle"),
      message: t(currentLang, "empireDeleteMessage")(profile.name),
      buttons: [
        { id: "delete", label: t(currentLang, "empireDeleteConfirm"), variant: "danger" },
        { id: "cancel", label: t(currentLang, "empireDialogCancel") }
      ],
      cancelId: "cancel"
    });
    if (choice === "delete") reportResult(deleteEmpire(profile.id), "empireProfileMsgDeleted");
  });
}

// Si el imperio seleccionado desaparece de la lista, la configuración actual se conserva como borrador.
onEmpiresChange(() => {
  if (selectedEmpireId && !getEmpire(selectedEmpireId)) selectedEmpireId = null;
  refresh();
});

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    refresh();
  });
});

refresh();

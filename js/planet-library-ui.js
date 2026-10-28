/**
 * Pestaña "Biblioteca" (P6) y botón "Guardar" de la barra de resumen.
 *
 * Muestra todos los planetas y todos los imperios guardados como tarjetas, con sus
 * acciones (abrir, duplicar, exportar, renombrar, eliminar) e importa archivos JSON.
 * Los datos viven en js/planet-library.js (planetas) y js/empire-profiles.js
 * (imperios); capturar y aplicar un planeta en el simulador lo hacen
 * capturePlanetConfig()/applyPlanetConfig() de js/planet-sim.js.
 *
 * Igual que empire.js, este módulo mantiene su propio idioma y sus listeners sobre
 * los .lang-btn compartidos: las etiquetas estáticas (data-i18n) las traduce el
 * barrido genérico de planet-sim.js, y aquí solo se repinta lo generado dinámicamente.
 *
 * Reglas de nombre (planetas e imperios): recortado, no vacío, único sin distinguir
 * mayúsculas. Renombrar un planeta y editar el nombre en la barra de resumen es lo
 * mismo: ambos pasan por checkPlanetName() al guardar. Editar el nombre en la barra
 * NO guarda solo: hace falta pulsar Guardar.
 *
 * Simplificación: cargar un planeta sustituye el planeta que se estaba editando sin
 * preguntar (solo se pide confirmación por los cambios sin guardar del IMPERIO).
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { getPlanetState, onPlanetStateChange, updatePlanetState } from "./planet-state.js";
import { PLANET_TYPES } from "./celestial-data.js";
import { getDesignation } from "./designation-data.js";
import { AUTHORITIES, ETHIC_ICONS, ETHIC_OPTIONS } from "./empire-data.js";
import { PRINCIPLE_BINGO } from "./bingo-data.js";
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";
import { SCHEMA_VERSION, checkRuleset } from "./data-version.js";
import { confirmChoice, promptText } from "./confirm-dialog.js";
import {
  listEmpires,
  getEmpire,
  createEmpire,
  renameEmpire,
  deleteEmpire,
  duplicateEmpire,
  exportEmpire,
  sanitizeEmpireConfig,
  isEmpireNameTaken,
  makeUniqueName,
  onEmpiresChange,
  MAX_EMPIRE_NAME_LENGTH
} from "./empire-profiles.js";
import {
  listPlanets,
  getPlanet,
  createPlanet,
  updatePlanet,
  renamePlanet,
  duplicatePlanet,
  deletePlanet,
  exportPlanet,
  checkPlanetName,
  uniquePlanetName,
  sanitizePlanetData,
  isSupportedSchema,
  onPlanetsChange,
  MAX_PLANET_NAME_LENGTH
} from "./planet-library.js";
import { capturePlanetConfig, applyPlanetConfig, showNotice } from "./planet-sim.js";
import { loadPlanetEmpire, resolveUnsavedEmpireChanges } from "./empire.js";
import { setCelestialType } from "./celestial.js";

const langButtons = document.querySelectorAll(".lang-btn");
const planetsEl = document.querySelector("#library-planets");
const empiresEl = document.querySelector("#library-empires");
const currentEl = document.querySelector("#library-current");
const messageEl = document.querySelector("#library-message");
const saveBtn = document.querySelector("#library-save");
const saveNewBtn = document.querySelector("#library-save-new");
const importBtn = document.querySelector("#library-import");
const importFileEl = document.querySelector("#library-import-file");
const summarySaveBtn = document.querySelector("#planet-summary-save");
const summaryNameInput = document.querySelector("#planet-summary-name");
const libraryTabBtn = document.querySelector('.planet-main-tab[data-main-tab="library"]');
const planetTabBtn = document.querySelector('.planet-main-tab[data-main-tab="planet"]');

let currentLang = detectInitialLang();

/* ── Utilidades ──────────────────────────────────────────────────────── */

let messageTimer = null;
/** Mensaje breve de resultado de una acción (se borra solo a los 8 s). */
function showMessage(text) {
  if (!messageEl) return;
  messageEl.textContent = text;
  clearTimeout(messageTimer);
  if (text) messageTimer = setTimeout(() => { messageEl.textContent = ""; }, 8000);
}

function errorText(error) {
  const key = {
    empty: "libraryErrorEmpty",
    duplicate: "libraryErrorDuplicate",
    notFound: "libraryErrorNotFound",
    invalid: "libraryImportErrorInvalid"
  }[error];
  return t(currentLang, key || "libraryImportErrorInvalid");
}

function empireErrorText(error) {
  return error === "duplicate" ? t(currentLang, "empireProfileErrorDuplicate") : errorText(error);
}

/** Añade al mensaje de éxito el aviso de "no se ha podido guardar en este navegador" si hace falta. */
function withPersistWarning(text, persisted) {
  return persisted ? text : `${text} ${t(currentLang, "empireProfileWarnNotPersisted")}`;
}

function assetUrl(path) {
  return `${STELLARIS_ASSETS_BASE}${path}`;
}

function iconImg(path, title) {
  const img = document.createElement("img");
  img.className = "library-icon";
  img.src = assetUrl(path);
  img.alt = title || "";
  img.title = title || "";
  img.loading = "lazy";
  return img;
}

function slugify(name, fallback) {
  const slug = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre un cuadro para escribir un nombre, con las mismas comprobaciones que al guardar. Devuelve el nombre o null. */
function askName({ title, message, value, validate, max }) {
  return promptText({
    title,
    message,
    value,
    maxLength: max,
    acceptLabel: t(currentLang, "libraryDialogAccept"),
    cancelLabel: t(currentLang, "empireDialogCancel"),
    validate
  });
}

function planetNameValidator(ignoreId) {
  return (rawName) => {
    const checked = checkPlanetName(rawName, ignoreId);
    return checked.error ? errorText(checked.error) : null;
  };
}

function empireNameValidator(ignoreId) {
  return (rawName) => {
    const name = String(rawName ?? "").trim();
    if (!name) return errorText("empty");
    return isEmpireNameTaken(name, ignoreId) ? empireErrorText("duplicate") : null;
  };
}

/* ── Guardar el planeta actual ───────────────────────────────────────── */

/**
 * Guarda el planeta actual en la biblioteca. Con un planeta guardado cargado lo
 * sobrescribe (y su nombre pasa por las mismas comprobaciones que renombrar);
 * con asNew (o sin planeta cargado) crea uno nuevo. La copia del imperio se toma de
 * la pestaña Imperio: si el imperio elegido tiene cambios sin guardar se pregunta
 * primero (y, si se descartan, el planeta guarda esa configuración como borrador,
 * sin vincularse al imperio guardado).
 */
async function saveCurrentPlanet({ asNew = false } = {}) {
  if (getPlanetState().empireModified && !(await resolveUnsavedEmpireChanges())) return;

  const state = getPlanetState();
  const stillModified = Boolean(state.empireModified);
  const empire = state.empireId ? getEmpire(state.empireId) : null;
  const linked = empire && !stillModified ? empire : null;
  const data = {
    ...capturePlanetConfig(),
    empireId: linked ? linked.id : null,
    empireSnapshot: {
      name: empire ? empire.name : null,
      ethicIds: state.ethicIds || [],
      authorityId: state.authorityId,
      civicIds: state.civicIds || [],
      speciesType: state.speciesType
    }
  };

  const existing = !asNew && state.planetId ? getPlanet(state.planetId) : null;
  const result = existing
    ? updatePlanet(existing.id, state.planetName, data)
    : createPlanet(state.planetName, data);

  if (!result.ok) {
    showMessage(errorText(result.error));
    showNotice(errorText(result.error));
    return;
  }
  updatePlanetState({ planetId: result.planet.id, planetName: result.planet.name });
  const text = withPersistWarning(t(currentLang, existing ? "libraryMsgPlanetSaved" : "libraryMsgPlanetCreated")(result.planet.name), result.persisted);
  showMessage(text);
  showNotice(text);
}

/* ── Acciones de las tarjetas de planeta ─────────────────────────────── */

async function openPlanet(id) {
  const planet = getPlanet(id);
  if (!planet) return;
  // Imperio primero (los requisitos de edificios dependen de él), luego el tipo de cuerpo (valida la designación) y al final el planeta.
  if (!(await loadPlanetEmpire(planet.empireId, planet.empireSnapshot))) return;
  setCelestialType(planet.celestialTypeId);
  const inactive = applyPlanetConfig(planet);
  updatePlanetState({ planetName: planet.name, planetId: planet.id });
  if (planetTabBtn) planetTabBtn.click();
  showNotice(t(currentLang, "libraryMsgPlanetLoaded")(planet.name, inactive));
}

function duplicatePlanetCard(id) {
  const source = getPlanet(id);
  if (!source) return;
  const name = uniquePlanetName(`${source.name} (${t(currentLang, "libraryCopySuffix")})`);
  const result = duplicatePlanet(id, name);
  showMessage(result.ok ? withPersistWarning(t(currentLang, "libraryMsgPlanetDuplicated")(result.planet.name), result.persisted) : errorText(result.error));
}

function exportPlanetCard(id) {
  const data = exportPlanet(id);
  if (!data) return;
  downloadJson(`planeta-${slugify(data.name, "planeta")}.json`, data);
  showMessage(t(currentLang, "libraryMsgExported")(data.name));
}

async function renamePlanetCard(id) {
  const planet = getPlanet(id);
  if (!planet) return;
  const name = await askName({
    title: t(currentLang, "libraryRenamePlanetTitle"),
    message: t(currentLang, "libraryRenameMessage"),
    value: planet.name,
    validate: planetNameValidator(id),
    max: MAX_PLANET_NAME_LENGTH
  });
  if (name === null) return;
  const result = renamePlanet(id, name);
  if (!result.ok) { showMessage(errorText(result.error)); return; }
  // Renombrar el planeta que se está editando es lo mismo que cambiar el nombre de la barra de resumen.
  if (getPlanetState().planetId === id) updatePlanetState({ planetName: result.planet.name });
  showMessage(withPersistWarning(t(currentLang, "libraryMsgRenamed")(result.planet.name), result.persisted));
}

async function deletePlanetCard(id) {
  const planet = getPlanet(id);
  if (!planet) return;
  const choice = await confirmChoice({
    title: t(currentLang, "libraryDeletePlanetTitle"),
    message: t(currentLang, "libraryDeletePlanetMessage")(planet.name),
    buttons: [
      { id: "delete", label: t(currentLang, "empireDeleteConfirm"), variant: "danger" },
      { id: "cancel", label: t(currentLang, "empireDialogCancel") }
    ],
    cancelId: "cancel"
  });
  if (choice !== "delete") return;
  const result = deletePlanet(id);
  if (!result.ok) { showMessage(errorText(result.error)); return; }
  // El planeta que se estaba editando se conserva en pantalla como borrador sin guardar.
  if (getPlanetState().planetId === id) updatePlanetState({ planetId: null });
  showMessage(withPersistWarning(t(currentLang, "libraryMsgDeleted")(planet.name), result.persisted));
}

/* ── Acciones de las tarjetas de imperio ─────────────────────────────── */

function duplicateEmpireCard(id) {
  const source = getEmpire(id);
  if (!source) return;
  const name = makeUniqueName(`${source.name} (${t(currentLang, "libraryCopySuffix")})`, (candidate) => isEmpireNameTaken(candidate), MAX_EMPIRE_NAME_LENGTH);
  const result = duplicateEmpire(id, name);
  showMessage(result.ok ? withPersistWarning(t(currentLang, "libraryMsgEmpireDuplicated")(result.profile.name), result.persisted) : empireErrorText(result.error));
}

function exportEmpireCard(id) {
  const data = exportEmpire(id);
  if (!data) return;
  downloadJson(`imperio-${slugify(data.name, "imperio")}.json`, data);
  showMessage(t(currentLang, "libraryMsgExported")(data.name));
}

async function renameEmpireCard(id) {
  const empire = getEmpire(id);
  if (!empire) return;
  const name = await askName({
    title: t(currentLang, "libraryRenameEmpireTitle"),
    message: t(currentLang, "libraryRenameMessage"),
    value: empire.name,
    validate: empireNameValidator(id),
    max: MAX_EMPIRE_NAME_LENGTH
  });
  if (name === null) return;
  const result = renameEmpire(id, name);
  showMessage(result.ok ? withPersistWarning(t(currentLang, "empireProfileMsgRenamed")(result.profile.name), result.persisted) : empireErrorText(result.error));
}

async function deleteEmpireCard(id) {
  const empire = getEmpire(id);
  if (!empire) return;
  const choice = await confirmChoice({
    title: t(currentLang, "empireDeleteTitle"),
    message: t(currentLang, "libraryDeleteEmpireMessage")(empire.name),
    buttons: [
      { id: "delete", label: t(currentLang, "empireDeleteConfirm"), variant: "danger" },
      { id: "cancel", label: t(currentLang, "empireDialogCancel") }
    ],
    cancelId: "cancel"
  });
  if (choice !== "delete") return;
  const result = deleteEmpire(id);
  showMessage(result.ok ? withPersistWarning(t(currentLang, "empireProfileMsgDeleted")(empire.name), result.persisted) : empireErrorText(result.error));
}

/* ── Importar JSON ───────────────────────────────────────────────────── */

/**
 * Importa un planeta o un imperio exportado. Un archivo sin rulesetId, con una
 * versión de datos no soportada o con un esquema más nuevo se rechaza con aviso
 * (nunca se reinterpreta en silencio). Siempre se crea con id nuevo; si el nombre
 * ya existe se ofrece importarlo con un nombre libre.
 */
async function importFromText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    showMessage(t(currentLang, "libraryImportErrorParse"));
    return;
  }
  if (!data || typeof data !== "object" || (data.type !== "planet" && data.type !== "empire")) {
    showMessage(t(currentLang, "libraryImportErrorType"));
    return;
  }
  const ruleset = checkRuleset(data);
  if (ruleset.status === "missing") { showMessage(t(currentLang, "libraryImportErrorMissingVersion")); return; }
  if (ruleset.status === "unsupported") { showMessage(t(currentLang, "libraryImportErrorUnsupportedVersion")(ruleset.rulesetId)); return; }
  if (!isSupportedSchema(data)) { showMessage(t(currentLang, "libraryImportErrorSchema")(String(data.schemaVersion), String(SCHEMA_VERSION))); return; }

  const isPlanet = data.type === "planet";
  const rawName = String(data.name ?? "").trim();
  const payload = isPlanet ? sanitizePlanetData(data) : sanitizeEmpireConfig(data);
  if (!rawName || !payload) { showMessage(t(currentLang, "libraryImportErrorInvalid")); return; }

  const taken = isPlanet ? checkPlanetName(rawName).error === "duplicate" : isEmpireNameTaken(rawName);
  let name = rawName;
  if (taken) {
    name = isPlanet
      ? uniquePlanetName(rawName)
      : makeUniqueName(rawName, (candidate) => isEmpireNameTaken(candidate), MAX_EMPIRE_NAME_LENGTH);
    const choice = await confirmChoice({
      title: t(currentLang, "libraryImportConflictTitle"),
      message: t(currentLang, isPlanet ? "libraryImportConflictPlanet" : "libraryImportConflictEmpire")(rawName, name),
      buttons: [
        { id: "import", label: t(currentLang, "libraryImportConflictConfirm")(name), variant: "primary" },
        { id: "cancel", label: t(currentLang, "empireDialogCancel") }
      ],
      cancelId: "cancel"
    });
    if (choice !== "import") return;
  }

  const result = isPlanet ? createPlanet(name, payload) : createEmpire(name, payload);
  if (!result.ok) { showMessage(isPlanet ? errorText(result.error) : empireErrorText(result.error)); return; }
  const savedName = isPlanet ? result.planet.name : result.profile.name;
  showMessage(withPersistWarning(t(currentLang, isPlanet ? "libraryMsgImportedPlanet" : "libraryMsgImportedEmpire")(savedName), result.persisted));
}

/* ── Pintado ─────────────────────────────────────────────────────────── */

function actionButton(labelKey, onClick, variant) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `planet-capital-btn${variant ? ` is-${variant}` : ""}`;
  btn.textContent = t(currentLang, labelKey);
  btn.addEventListener("click", onClick);
  return btn;
}

function fact(...children) {
  const span = document.createElement("span");
  span.className = "library-fact";
  span.append(...children);
  return span;
}

function textNode(text, title) {
  const span = document.createElement("span");
  span.textContent = text;
  if (title) span.title = title;
  return span;
}

function renderPlanetCard(planet, state) {
  const type = PLANET_TYPES.find((entry) => entry.id === planet.celestialTypeId);
  const designation = getDesignation(planet.designationId);
  const empire = planet.empireId ? getEmpire(planet.empireId) : null;
  const snapshot = planet.empireSnapshot;
  const empireName = empire ? empire.name : (snapshot && snapshot.name) || null;
  const authority = AUTHORITIES.find((entry) => entry.id === (empire ? empire.authorityId : snapshot && snapshot.authorityId));

  const card = document.createElement("article");
  card.className = "library-card";
  card.classList.toggle("is-current", state.planetId === planet.id);

  const head = document.createElement("div");
  head.className = "library-card-head";
  if (type) {
    const body = iconImg(type.img, t(currentLang, type.i18nKey));
    body.classList.add("library-icon-round");
    head.append(body);
  }
  const title = document.createElement("strong");
  title.className = "library-card-title";
  title.textContent = planet.name;
  head.append(title);
  card.append(head);

  const facts = document.createElement("div");
  facts.className = "library-card-facts";

  // Designación
  facts.append(designation
    ? fact(iconImg(designation.img, t(currentLang, designation.i18nKey)), textNode(t(currentLang, designation.i18nKey)))
    : fact(textNode("—", t(currentLang, "designationNone")), textNode(t(currentLang, "designationNone"))));

  // Imperio
  const empireFact = fact();
  empireFact.title = t(currentLang, "libraryEmpireLabel");
  if (authority) empireFact.append(iconImg(authority.img, t(currentLang, authority.i18nKey)));
  empireFact.append(textNode(empireName || t(currentLang, "empireProfileNone")));
  if (planet.noEmpire) {
    const badge = document.createElement("span");
    badge.className = "library-badge";
    badge.textContent = t(currentLang, "libraryNoEmpireBadge");
    badge.title = t(currentLang, "libraryNoEmpireTooltip");
    empireFact.append(badge);
  }
  facts.append(empireFact);

  // Tamaño
  const sizeIcon = document.createElement("img");
  sizeIcon.className = "library-icon";
  sizeIcon.src = "img/ui/Planet_Size.png";
  sizeIcon.alt = "";
  facts.append(fact(sizeIcon, textNode(String(planet.planetSize), t(currentLang, "planetSummarySizeLabel"))));
  facts.lastChild.title = t(currentLang, "planetSummarySizeLabel");
  card.append(facts);

  const actions = document.createElement("div");
  actions.className = "library-card-actions";
  actions.append(
    actionButton("libraryActionOpen", () => openPlanet(planet.id), "primary"),
    actionButton("libraryActionDuplicate", () => duplicatePlanetCard(planet.id)),
    actionButton("libraryActionExport", () => exportPlanetCard(planet.id)),
    actionButton("libraryActionRename", () => renamePlanetCard(planet.id)),
    actionButton("libraryActionDelete", () => deletePlanetCard(planet.id), "danger")
  );
  card.append(actions);
  return card;
}

function renderEmpireCard(empire, state) {
  const card = document.createElement("article");
  card.className = "library-card";
  card.classList.toggle("is-current", state.empireId === empire.id);

  const title = document.createElement("strong");
  title.className = "library-card-title";
  title.textContent = empire.name;
  card.append(title);

  // Solo iconos (sin etiquetas de texto): éticas, autoridad y principios; el nombre va en el tooltip de cada uno.
  const icons = document.createElement("div");
  icons.className = "library-icon-row";
  (empire.ethicIds || []).filter((id) => ETHIC_ICONS[id]).forEach((id) => {
    icons.append(iconImg(ETHIC_ICONS[id], t(currentLang, ETHIC_OPTIONS[id].i18nKey)));
  });
  const authority = AUTHORITIES.find((entry) => entry.id === empire.authorityId);
  if (authority) icons.append(iconImg(authority.img, t(currentLang, authority.i18nKey)));
  (empire.civicIds || []).forEach((key) => {
    const civic = PRINCIPLE_BINGO.find((entry) => entry.i18nKey === key);
    if (civic) icons.append(iconImg(civic.img, t(currentLang, key)));
  });
  card.append(icons);

  const actions = document.createElement("div");
  actions.className = "library-card-actions";
  actions.append(
    actionButton("libraryActionDuplicate", () => duplicateEmpireCard(empire.id)),
    actionButton("libraryActionExport", () => exportEmpireCard(empire.id)),
    actionButton("libraryActionRename", () => renameEmpireCard(empire.id)),
    actionButton("libraryActionDelete", () => deleteEmpireCard(empire.id), "danger")
  );
  card.append(actions);
  return card;
}

function renderGrid(container, items, renderCard, emptyKey) {
  if (!container) return;
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empire-note";
    empty.textContent = t(currentLang, emptyKey);
    container.append(empty);
    return;
  }
  const state = getPlanetState();
  items.forEach((item) => container.append(renderCard(item, state)));
}

/** ¿El nombre de la barra de resumen choca con otro planeta guardado? (se marca en rojo; el error exacto sale al guardar) */
function renderNameValidity(state) {
  if (!summaryNameInput) return;
  const name = String(state.planetName || "").trim();
  const clash = name !== "" && checkPlanetName(name, state.planetId).error === "duplicate";
  summaryNameInput.classList.toggle("is-invalid", clash);
  summaryNameInput.setAttribute("aria-invalid", String(clash));
}

function renderCurrent() {
  const state = getPlanetState();
  const saved = state.planetId ? getPlanet(state.planetId) : null;
  if (currentEl) currentEl.textContent = saved
    ? t(currentLang, "libraryCurrentSaved")(saved.name)
    : t(currentLang, "libraryCurrentDraft");
  if (saveBtn) saveBtn.textContent = t(currentLang, saved ? "librarySaveChanges" : "librarySaveCurrent");
  if (saveNewBtn) saveNewBtn.disabled = !saved;
  renderNameValidity(state);
}

function render() {
  renderCurrent();
  renderGrid(planetsEl, listPlanets(), renderPlanetCard, "libraryPlanetsEmpty");
  renderGrid(empiresEl, listEmpires(), renderEmpireCard, "libraryEmpiresEmpty");
}

/* ── Eventos ─────────────────────────────────────────────────────────── */

if (saveBtn) saveBtn.addEventListener("click", () => saveCurrentPlanet());
if (saveNewBtn) saveNewBtn.addEventListener("click", () => saveCurrentPlanet({ asNew: true }));
if (summarySaveBtn) summarySaveBtn.addEventListener("click", () => saveCurrentPlanet());

if (importBtn && importFileEl) {
  importBtn.addEventListener("click", () => importFileEl.click());
  importFileEl.addEventListener("change", async () => {
    const file = importFileEl.files && importFileEl.files[0];
    importFileEl.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch (error) {
      showMessage(t(currentLang, "libraryImportErrorParse"));
      return;
    }
    await importFromText(text);
  });
}

if (libraryTabBtn) libraryTabBtn.addEventListener("click", render);

onPlanetsChange(render);
onEmpiresChange(render);
onPlanetStateChange(() => {
  // El estado cambia a menudo (población, tamaño...): solo se repinta lo que depende de él.
  renderCurrent();
  planetsEl?.querySelectorAll(".library-card").forEach((card, index) => {
    const planet = listPlanets()[index];
    if (planet) card.classList.toggle("is-current", getPlanetState().planetId === planet.id);
  });
});

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    render();
  });
});

render();

/**
 * Planetas guardados (P6): configuración completa de un planeta del simulador
 * con un nombre, persistida en localStorage.
 *
 * Este módulo solo guarda y valida datos (igual que js/empire-profiles.js); quien
 * captura/aplica el estado del simulador es js/planet-sim.js y quien muestra la
 * biblioteca es js/planet-library-ui.js.
 *
 * Formato de cada planeta (ver PLANET_SIM_GDD.md §6): { schemaVersion, rulesetId,
 * id, name, celestialTypeId, designationId, planetSize, capitalTier, districts,
 * built, staffingOverrides, empireId, empireSnapshot, noEmpire }.
 *  - districts: { urban: { count, slots: [id|null, id|null] }, generator|mining|
 *    agriculture: { count, optionId } } (mismo formato que districtState).
 *  - built: { claveDeRanura: idDeEdificio } de las ranuras no capital. Los
 *    edificios de ranuras bloqueadas o sin requisitos se conservan (inactivos).
 *  - staffingOverrides: { idEmpleo: empleosCubiertos (escala ×100) } SOLO de los
 *    empleos cuya dotación se redujo; lo que no aparece está al 100 %.
 *  - empireId + empireSnapshot: el imperio elegido y una copia en bruto de su
 *    configuración ({ name, ethicIds, authorityId, civicIds, speciesType }). Si el
 *    imperio se elimina, el planeta conserva la copia y se marca noEmpire.
 *
 * Decisiones (documentadas, no son reglas del juego):
 *  - El nombre se recorta, no puede estar vacío (máx. 60 caracteres) y es único
 *    entre los planetas guardados, sin distinguir mayúsculas. Las mismas
 *    comprobaciones valen al guardar, renombrar, duplicar e importar.
 *  - noEmpire no se fía de lo guardado: se recalcula cada vez que cambia la lista
 *    de imperios (un planeta con empireId que ya no existe queda marcado).
 *  - Los planetas de una versión de datos no soportada (o sin versión) NO se
 *    borran ni se reinterpretan: se conservan tal cual, pero no se listan.
 *  - Si localStorage no está disponible, los cambios viven solo en memoria hasta
 *    recargar; los mutadores devuelven persisted: false para avisar.
 */

import { SCHEMA_VERSION, stampRuleset, checkRuleset } from "./data-version.js";
import { getEmpire, onEmpiresChange, makeUniqueName, sanitizeEmpireConfig } from "./empire-profiles.js";

const STORAGE_KEY = "codex-ignis-planets";
export const MAX_PLANET_NAME_LENGTH = 60;
const MAX_PLANET_SIZE = 999;

/** Claves de ranura de edificio válidas (ver unlockedKeys en planet-sim.js). */
const SLOT_KEY_PATTERN = /^(base-[1-5]|urban-spec-[01]-[1-3]|(generator|mining|agriculture)-spec-[1-3])$/;
const RESOURCE_DISTRICTS = ["generator", "mining", "agriculture"];

let planets = [];
let foreign = []; // planetas con versión de datos no soportada: se conservan sin tocar
const listeners = new Set();

function isPlanetShaped(value) {
  return value && typeof value === "object" && typeof value.id === "string" && typeof value.name === "string";
}

function load() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return;
    const valid = parsed.filter(isPlanetShaped);
    planets = valid.filter((planet) => checkRuleset(planet).status === "ok");
    foreign = valid.filter((planet) => checkRuleset(planet).status !== "ok");
  } catch (error) {
    // Almacenamiento no disponible o JSON corrupto: se empieza vacío.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...planets, ...foreign]));
    return true;
  } catch (error) {
    return false;
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

function newId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `planet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampInt(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function textOrNull(value) {
  return typeof value === "string" && value ? value : null;
}

/**
 * Datos de planeta saneados a partir de un objeto que no es de fiar (importado o
 * leído de localStorage): solo se copian los campos conocidos, con su tipo
 * comprobado. Devuelve null si no tiene la forma mínima esperada (districts y built
 * como objetos). Que cada id exista de verdad (edificio, especialización, tipo de
 * cuerpo...) lo comprueba después planet-sim.js al aplicarlo, ignorando lo
 * desconocido en vez de inventarlo.
 */
export function sanitizePlanetData(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.districts || typeof raw.districts !== "object" || !raw.built || typeof raw.built !== "object") return null;

  const districts = {
    urban: {
      count: clampInt(raw.districts.urban?.count, 1, MAX_PLANET_SIZE, 1),
      slots: [0, 1].map((index) => textOrNull(raw.districts.urban?.slots?.[index]))
    }
  };
  RESOURCE_DISTRICTS.forEach((cat) => {
    districts[cat] = {
      count: clampInt(raw.districts[cat]?.count, 0, MAX_PLANET_SIZE, 0),
      optionId: textOrNull(raw.districts[cat]?.optionId)
    };
  });

  const built = {};
  Object.entries(raw.built).forEach(([key, buildingId]) => {
    if (SLOT_KEY_PATTERN.test(key) && typeof buildingId === "string" && buildingId) built[key] = buildingId;
  });

  const staffingOverrides = {};
  if (raw.staffingOverrides && typeof raw.staffingOverrides === "object") {
    Object.entries(raw.staffingOverrides).forEach(([jobId, value]) => {
      const amount = Number(value);
      if (Number.isFinite(amount) && amount >= 0) staffingOverrides[jobId] = amount;
    });
  }

  const snapshotConfig = sanitizeEmpireConfig(raw.empireSnapshot);
  const empireSnapshot = snapshotConfig
    ? { name: typeof raw.empireSnapshot.name === "string" ? raw.empireSnapshot.name.slice(0, MAX_PLANET_NAME_LENGTH) : null, ...snapshotConfig }
    : null;

  return {
    celestialTypeId: textOrNull(raw.celestialTypeId),
    designationId: textOrNull(raw.designationId),
    planetSize: clampInt(raw.planetSize, 1, MAX_PLANET_SIZE, 20),
    capitalTier: clampInt(raw.capitalTier, 1, 5, 1),
    districts,
    built,
    staffingOverrides,
    empireId: textOrNull(raw.empireId),
    empireSnapshot
  };
}

function validateName(rawName, ignoreId) {
  const name = String(rawName ?? "").trim();
  if (!name) return { error: "empty" };
  const lower = name.toLocaleLowerCase();
  if (planets.some((planet) => planet.id !== ignoreId && planet.name.toLocaleLowerCase() === lower)) {
    return { error: "duplicate" };
  }
  return { name: name.slice(0, MAX_PLANET_NAME_LENGTH) };
}

/** Comprobación de nombre compartida por guardar, renombrar, duplicar e importar: { name } o { error: "empty" | "duplicate" }. */
export function checkPlanetName(rawName, ignoreId) {
  return validateName(rawName, ignoreId);
}

export function isPlanetNameTaken(rawName, ignoreId) {
  return validateName(rawName, ignoreId).error === "duplicate";
}

/** Nombre libre a partir de `base` (añade " 2", " 3"... si hace falta). */
export function uniquePlanetName(base) {
  return makeUniqueName(base, (candidate) => isPlanetNameTaken(candidate), MAX_PLANET_NAME_LENGTH);
}

/** Recalcula noEmpire de todos los planetas; persiste y avisa solo si algo cambia. */
function syncNoEmpire() {
  let changed = false;
  planets = planets.map((planet) => {
    const flag = Boolean(planet.empireId) && !getEmpire(planet.empireId);
    if (Boolean(planet.noEmpire) === flag) return planet;
    changed = true;
    return { ...planet, noEmpire: flag };
  });
  if (changed) {
    persist();
    notify();
  }
}

/** Lista de planetas guardados (copia superficial, en orden de creación). */
export function listPlanets() {
  return [...planets];
}

export function getPlanet(id) {
  return planets.find((planet) => planet.id === id) || null;
}

function buildPlanet(id, name, data) {
  const clean = sanitizePlanetData(data);
  if (!clean) return null;
  return stampRuleset({ id, name, ...clean, noEmpire: Boolean(clean.empireId) && !getEmpire(clean.empireId) });
}

/** Resultado de los mutadores: { ok: true, planet, persisted } o { ok: false, error: "empty" | "duplicate" | "notFound" | "invalid" }. */
export function createPlanet(rawName, data) {
  const checked = validateName(rawName);
  if (checked.error) return { ok: false, error: checked.error };
  const planet = buildPlanet(newId(), checked.name, data);
  if (!planet) return { ok: false, error: "invalid" };
  planets.push(planet);
  const persisted = persist();
  notify();
  return { ok: true, planet, persisted };
}

/** Sobrescribe un planeta existente (datos y nombre). El nombre pasa por las mismas comprobaciones que al crearlo. */
export function updatePlanet(id, rawName, data) {
  const index = planets.findIndex((planet) => planet.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  const checked = validateName(rawName, id);
  if (checked.error) return { ok: false, error: checked.error };
  const planet = buildPlanet(id, checked.name, data);
  if (!planet) return { ok: false, error: "invalid" };
  planets[index] = planet;
  const persisted = persist();
  notify();
  return { ok: true, planet, persisted };
}

export function renamePlanet(id, rawName) {
  const index = planets.findIndex((planet) => planet.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  const checked = validateName(rawName, id);
  if (checked.error) return { ok: false, error: checked.error };
  planets[index] = { ...planets[index], name: checked.name };
  const persisted = persist();
  notify();
  return { ok: true, planet: planets[index], persisted };
}

/** Duplica un planeta guardado con el nombre dado (debe ser único). */
export function duplicatePlanet(id, rawName) {
  const source = getPlanet(id);
  if (!source) return { ok: false, error: "notFound" };
  return createPlanet(rawName, source);
}

export function deletePlanet(id) {
  const index = planets.findIndex((planet) => planet.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  const [removed] = planets.splice(index, 1);
  const persisted = persist();
  notify();
  return { ok: true, planet: removed, persisted };
}

/** Objeto listo para exportar a JSON (P6.8): el planeta con su versión de datos y un `type` para distinguirlo de un imperio al importar. */
export function exportPlanet(id) {
  const planet = getPlanet(id);
  if (!planet) return null;
  return { type: "planet", ...planet };
}

/** ¿Es posible importar una versión de esquema como esta? (una más nueva que la conocida no se reinterpreta). */
export function isSupportedSchema(data) {
  const version = data && typeof data === "object" ? data.schemaVersion : undefined;
  return typeof version === "number" && version <= SCHEMA_VERSION;
}

/** Se llama a `fn` cada vez que cambia la lista de planetas guardados. */
export function onPlanetsChange(fn) {
  listeners.add(fn);
}

load();
onEmpiresChange(syncNoEmpire);
syncNoEmpire();

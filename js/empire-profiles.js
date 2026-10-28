/**
 * Perfiles de imperio guardados (P5): éticas, autoridad, principios y tipo
 * de especie con un nombre, persistidos en localStorage.
 *
 * Este módulo solo guarda y valida datos; quien aplica un perfil a la
 * pestaña Imperio es js/empire.js, y quien lo muestra en la barra de resumen
 * es js/planet-summary.js.
 *
 * Formato de cada perfil (ver PLANET_SIM_GDD.md §6): { schemaVersion,
 * rulesetId, id, name, ethicIds, authorityId, civicIds, speciesType }.
 *
 * Decisiones (documentadas, no son reglas del juego):
 *  - El nombre se recorta, no puede estar vacío (máx. 60 caracteres) y es
 *    único entre los imperios guardados, sin distinguir mayúsculas.
 *  - Los perfiles de una versión de datos no soportada (o sin versión) NO se
 *    borran ni se reinterpretan: se conservan tal cual en localStorage, pero
 *    no se listan (ver data-version.js).
 *  - Si localStorage no está disponible, los cambios viven solo en memoria
 *    hasta recargar; los mutadores devuelven persisted: false para avisar.
 */

import { SCHEMA_VERSION, CURRENT_RULESET_ID, stampRuleset, checkRuleset } from "./data-version.js";

const STORAGE_KEY = "codex-ignis-empires";
export const MAX_EMPIRE_NAME_LENGTH = 60;

let profiles = [];
let foreign = []; // perfiles con versión de datos no soportada: se conservan sin tocar
const listeners = new Set();

function isProfileShaped(value) {
  return value && typeof value === "object" && typeof value.id === "string" && typeof value.name === "string";
}

function load() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return;
    const valid = parsed.filter(isProfileShaped);
    profiles = valid.filter((profile) => checkRuleset(profile).status === "ok");
    foreign = valid.filter((profile) => checkRuleset(profile).status !== "ok");
  } catch (error) {
    // Almacenamiento no disponible o JSON corrupto: se empieza vacío.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...profiles, ...foreign]));
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
  return `empire-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Configuración canónica (ordenada) de un perfil o de la pestaña Imperio, para guardar y comparar. */
/** Los principios se guardaban con claves "principleXxx"; ahora son "civicXxx". Convierte las antiguas para no romper imperios ya guardados. */
export function migrateCivicKey(key) {
  return typeof key === "string" ? key.replace(/^principle(?=[A-Z])/, "civic") : key;
}

export function normalizeConfig(config) {
  return {
    ethicIds: [...(config.ethicIds || [])].sort(),
    authorityId: config.authorityId || null,
    civicIds: [...(config.civicIds || [])].map(migrateCivicKey).sort(),
    speciesType: config.speciesType || "organic"
  };
}

export function configsEqual(a, b) {
  return JSON.stringify(normalizeConfig(a)) === JSON.stringify(normalizeConfig(b));
}

function validateName(rawName, ignoreId) {
  const name = String(rawName ?? "").trim();
  if (!name) return { error: "empty" };
  const lower = name.toLocaleLowerCase();
  if (profiles.some((profile) => profile.id !== ignoreId && profile.name.toLocaleLowerCase() === lower)) {
    return { error: "duplicate" };
  }
  return { name: name.slice(0, MAX_EMPIRE_NAME_LENGTH) };
}

/** Lista de imperios guardados (copia superficial, en orden de creación). */
export function listEmpires() {
  return [...profiles];
}

export function getEmpire(id) {
  return profiles.find((profile) => profile.id === id) || null;
}

/** Resultado de los mutadores: { ok: true, profile, persisted } o { ok: false, error: "empty" | "duplicate" | "notFound" }. */
export function createEmpire(rawName, config) {
  const checked = validateName(rawName);
  if (checked.error) return { ok: false, error: checked.error };
  const profile = stampRuleset({ id: newId(), name: checked.name, ...normalizeConfig(config) });
  profiles.push(profile);
  const persisted = persist();
  notify();
  return { ok: true, profile, persisted };
}

/** Sobrescribe la configuración de un imperio existente (conserva su nombre). */
export function updateEmpireConfig(id, config) {
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  profiles[index] = { ...profiles[index], schemaVersion: SCHEMA_VERSION, rulesetId: CURRENT_RULESET_ID, ...normalizeConfig(config) };
  const persisted = persist();
  notify();
  return { ok: true, profile: profiles[index], persisted };
}

export function renameEmpire(id, rawName) {
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  const checked = validateName(rawName, id);
  if (checked.error) return { ok: false, error: checked.error };
  profiles[index] = { ...profiles[index], name: checked.name };
  const persisted = persist();
  notify();
  return { ok: true, profile: profiles[index], persisted };
}

export function deleteEmpire(id) {
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index === -1) return { ok: false, error: "notFound" };
  const [removed] = profiles.splice(index, 1);
  const persisted = persist();
  notify();
  return { ok: true, profile: removed, persisted };
}

/** ¿Ya hay un imperio guardado con ese nombre (sin distinguir mayúsculas)? `ignoreId` excluye al propio imperio al renombrar. */
export function isEmpireNameTaken(rawName, ignoreId) {
  return validateName(rawName, ignoreId).error === "duplicate";
}

/**
 * Nombre libre a partir de `base`: si está ocupado añade " 2", " 3"... (recortando la
 * base para no pasar de `maxLength`). `isTaken(nombre)` decide qué está ocupado; se
 * reutiliza para los planetas (js/planet-library.js).
 */
export function makeUniqueName(base, isTaken, maxLength = MAX_EMPIRE_NAME_LENGTH) {
  const clean = String(base ?? "").trim().slice(0, maxLength);
  if (!isTaken(clean)) return clean;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = ` ${n}`;
    const candidate = `${clean.slice(0, maxLength - suffix.length)}${suffix}`;
    if (!isTaken(candidate)) return candidate;
  }
  return clean;
}

/** Duplica un imperio guardado con el nombre dado (debe ser único). Mismo resultado que createEmpire. */
export function duplicateEmpire(id, rawName) {
  const source = getEmpire(id);
  if (!source) return { ok: false, error: "notFound" };
  return createEmpire(rawName, source);
}

/** Objeto listo para exportar a JSON (P6.8): el perfil con su versión de datos y un `type` para distinguirlo de un planeta al importar. */
export function exportEmpire(id) {
  const profile = getEmpire(id);
  if (!profile) return null;
  return { type: "empire", ...profile };
}

/**
 * Configuración de imperio saneada a partir de un objeto importado (que no es de fiar):
 * solo se aceptan listas de textos y textos. Devuelve null si no tiene la forma esperada.
 * Que cada id exista de verdad lo comprueba después la pestaña Imperio al aplicarlo.
 */
export function sanitizeEmpireConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const strings = (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : null);
  const ethicIds = strings(raw.ethicIds);
  const civicIds = strings(raw.civicIds);
  if (!ethicIds || !civicIds) return null;
  return normalizeConfig({
    ethicIds,
    authorityId: typeof raw.authorityId === "string" ? raw.authorityId : null,
    civicIds,
    speciesType: typeof raw.speciesType === "string" ? raw.speciesType : "organic"
  });
}

/** Se llama a `fn` cada vez que cambia la lista de imperios guardados. */
export function onEmpiresChange(fn) {
  listeners.add(fn);
}

load();

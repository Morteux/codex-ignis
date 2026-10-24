/**
 * Estado compartido del planeta actual, para el panel fijo de resumen
 * (js/planet-summary.js). Cada módulo dueño de un dato lo escribe aquí
 * cuando cambia (planet-sim.js para tamaño/población, celestial.js para el
 * tipo de cuerpo celeste); al ser un módulo ES, cualquier archivo que lo
 * importe recibe la MISMA instancia de `state`, así que no hace falta
 * pasarse referencias entre scripts.
 */

import { CURRENT_RULESET_ID } from "./data-version.js";

const state = {
  rulesetId: CURRENT_RULESET_ID,
  celestialTypeId: null,
  designationId: null,
  ethicIds: [],
  authorityId: null,
  civicIds: [],
  speciesType: "organic",
  empireId: null,
  empireModified: false,
  planetId: null, // id del planeta guardado que se está editando (null = borrador sin guardar), ver js/planet-library.js
  planetName: "",
  planetSize: null,
  populationText: null
};

const listeners = new Set();

/** Lectura directa del estado actual (no reactiva: para pintar una vez). */
export function getPlanetState() {
  return state;
}

/** Aplica cambios parciales al estado y avisa a quien esté suscrito. */
export function updatePlanetState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

/** Se llama a `fn` cada vez que el estado cambia (no en el momento de suscribirse). */
export function onPlanetStateChange(fn) {
  listeners.add(fn);
}

/**
 * Aviso de "se acaba de cambiar de imperio" (P5.4): lo emite js/empire.js
 * cuando el usuario elige otro imperio guardado, DESPUÉS de haber publicado
 * su configuración en el estado. js/planet-sim.js lo escucha para avisar de
 * cuántos edificios han quedado inactivos por requisitos (no se borra
 * ninguno). Editar la pestaña Imperio a mano NO lo emite.
 */
const empireSwitchListeners = new Set();

export function onEmpireSwitched(fn) {
  empireSwitchListeners.add(fn);
}

export function emitEmpireSwitched(detail) {
  empireSwitchListeners.forEach((fn) => fn(detail));
}

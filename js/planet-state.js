/**
 * Estado compartido del planeta actual, para el panel fijo de resumen
 * (js/planet-summary.js). Cada módulo dueño de un dato lo escribe aquí
 * cuando cambia (planet-sim.js para tamaño/población, celestial.js para el
 * tipo de cuerpo celeste); al ser un módulo ES, cualquier archivo que lo
 * importe recibe la MISMA instancia de `state`, así que no hace falta
 * pasarse referencias entre scripts.
 */

const state = {
  celestialTypeId: null,
  designationId: null,
  ethicIds: [],
  authorityId: null,
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

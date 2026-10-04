/**
 * Panel fijo de resumen del planeta: visible en las 4 pestañas (no vive
 * dentro de ninguna), muestra tipo de cuerpo celeste, designación
 * planetaria, nombre, tamaño y población trabajando.
 *
 * El tipo de cuerpo celeste lo escribe js/celestial.js y el tamaño/
 * población los escribe js/planet-sim.js, ambos a través del estado
 * compartido de js/planet-state.js; este módulo solo lee ese estado y
 * dibuja el panel. El nombre del planeta es el único dato que este propio
 * panel posee y escribe (campo de texto editable).
 *
 * La designación planetaria todavía no tiene datos (pendiente de que
 * Morteux pase la lista de designaciones y sus efectos — ver el
 * desplegable correspondiente en la pestaña Planeta, que de momento no
 * existe); este panel solo refleja "Sin elegir" hasta entonces.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { getPlanetState, onPlanetStateChange, updatePlanetState } from "./planet-state.js";
import { PLANET_TYPES } from "./celestial-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const typeEl = document.querySelector("#planet-summary-type");
const designationEl = document.querySelector("#planet-summary-designation");
const nameInput = document.querySelector("#planet-summary-name");
const sizeEl = document.querySelector("#planet-summary-size");
const populationEl = document.querySelector("#planet-summary-population");

let currentLang = detectInitialLang();

function render() {
  const state = getPlanetState();
  const type = PLANET_TYPES.find((entry) => entry.id === state.celestialTypeId);

  if (typeEl) typeEl.textContent = type ? t(currentLang, type.i18nKey) : t(currentLang, "planetSummaryNotChosen");
  if (designationEl) designationEl.textContent = state.designationId || t(currentLang, "planetSummaryNotChosen");
  if (sizeEl) sizeEl.textContent = state.planetSize != null ? String(state.planetSize) : "—";
  if (populationEl) populationEl.textContent = state.populationText != null ? state.populationText : "—";
  // No se toca nameInput.value aquí si el usuario está escribiendo en él
  // ahora mismo, para no interrumpirle mientras teclea.
  if (nameInput && document.activeElement !== nameInput) {
    nameInput.value = state.planetName || "";
  }
}

if (nameInput) {
  nameInput.addEventListener("input", () => {
    updatePlanetState({ planetName: nameInput.value });
  });
}

onPlanetStateChange(render);

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    render();
  });
});

render();

/**
 * Panel fijo de resumen del planeta: visible en las 4 pestañas (no vive
 * dentro de ninguna). Sin títulos de texto a petición de Morteux: cada
 * campo con un valor "elegible" (tipo de cuerpo celeste, designación) se
 * muestra como su propio icono; el nombre es un campo de texto libre; el
 * tamaño y la población no tienen un icono natural que los represente, así
 * que se muestran como número sin más (con un title nativo para quien pase
 * el ratón por encima).
 *
 * El tipo de cuerpo celeste lo escribe js/celestial.js y el tamaño/
 * población los escribe js/planet-sim.js, ambos a través del estado
 * compartido de js/planet-state.js; este módulo solo lee ese estado y
 * dibuja el panel. El nombre del planeta es el único dato que este propio
 * panel posee y escribe (campo de texto editable).
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { getPlanetState, onPlanetStateChange, updatePlanetState } from "./planet-state.js";
import { PLANET_TYPES, IMAGE_BASE as CELESTIAL_IMAGE_BASE } from "./celestial-data.js";
import { getDesignation } from "./designation-data.js";
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

const langButtons = document.querySelectorAll(".lang-btn");
const typeIconEl = document.querySelector("#planet-summary-type-icon");
const designationIconEl = document.querySelector("#planet-summary-designation-icon");
const nameInput = document.querySelector("#planet-summary-name");
const sizeEl = document.querySelector("#planet-summary-size");
const populationEl = document.querySelector("#planet-summary-population");

let currentLang = detectInitialLang();

function render() {
  const state = getPlanetState();
  const type = PLANET_TYPES.find((entry) => entry.id === state.celestialTypeId);
  const designation = getDesignation(state.designationId);

  if (typeIconEl) {
    typeIconEl.src = type ? `${CELESTIAL_IMAGE_BASE}${type.img}` : "";
    typeIconEl.alt = type ? t(currentLang, type.i18nKey) : "";
    typeIconEl.title = type ? t(currentLang, type.i18nKey) : t(currentLang, "planetSummaryNotChosen");
  }

  if (designationIconEl) {
    designationIconEl.src = designation ? `${STELLARIS_ASSETS_BASE}${designation.img}` : "";
    designationIconEl.alt = designation ? t(currentLang, designation.i18nKey) : "";
    designationIconEl.title = designation ? t(currentLang, designation.i18nKey) : t(currentLang, "designationNone");
    designationIconEl.hidden = !designation;
  }

  if (sizeEl) {
    sizeEl.textContent = state.planetSize != null ? String(state.planetSize) : "—";
    sizeEl.title = t(currentLang, "planetSummarySizeLabel");
  }
  if (populationEl) {
    populationEl.textContent = state.populationText != null ? state.populationText : "—";
    populationEl.title = t(currentLang, "planetSummaryPopulationLabel");
  }

  if (nameInput) {
    nameInput.title = t(currentLang, "planetSummaryNameLabel");
    // No se toca nameInput.value si el usuario está escribiendo en él ahora
    // mismo, para no interrumpirle mientras teclea.
    if (document.activeElement !== nameInput) {
      nameInput.value = state.planetName || "";
    }
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

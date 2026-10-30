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
import { PLANET_TYPES } from "./celestial-data.js";
import { getDesignation } from "./designation-data.js";
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";
import { listEmpires, onEmpiresChange } from "./empire-profiles.js";
import { requestSwitchEmpire } from "./empire.js";
import { DATA_VERSIONS, VERIFICATION_I18N_KEYS, getDataVersion, verificationSummary } from "./data-version.js";

const langButtons = document.querySelectorAll(".lang-btn");
const typeIconEl = document.querySelector("#planet-summary-type-icon");
const designationIconEl = document.querySelector("#planet-summary-designation-icon");
const nameInput = document.querySelector("#planet-summary-name");
const sizeEl = document.querySelector("#planet-summary-size");
const populationEl = document.querySelector("#planet-summary-population");
const empireSelect = document.querySelector("#planet-summary-empire");
const dataVersionSelect = document.querySelector("#planet-summary-data-version");

let currentLang = detectInitialLang();

/** Selector de versión de datos (P4.3): alimentado por el registro de data-version.js; hoy solo tiene una opción. */
function renderDataVersion(state) {
  if (!dataVersionSelect) return;
  dataVersionSelect.replaceChildren();
  DATA_VERSIONS.forEach((version) => {
    const option = document.createElement("option");
    option.value = version.id;
    option.textContent = version.label;
    dataVersionSelect.append(option);
  });
  dataVersionSelect.value = state.rulesetId;
  dataVersionSelect.setAttribute("aria-label", t(currentLang, "dataVersionLabel"));
  // Tooltip: nombre del selector + estado de verificación de los datos.
  const summary = Object.entries(verificationSummary())
    .map(([status, count]) => `${t(currentLang, VERIFICATION_I18N_KEYS[status])}: ${count}`)
    .join(" · ");
  dataVersionSelect.title = `${t(currentLang, "dataVersionLabel")}\n${t(currentLang, "dataVersionCollections")(summary)}`;
}

/** Desplegable de imperios guardados (P5.2): "ninguno" = borrador sin guardar; el seleccionado lleva "●" si tiene cambios sin guardar. */
let empireSignature = null;
function renderEmpireSelect(state) {
  if (!empireSelect) return;
  const empires = listEmpires();
  const signature = JSON.stringify([currentLang, state.empireId, state.empireModified, empires.map((empire) => [empire.id, empire.name])]);
  if (signature !== empireSignature) {
    empireSignature = signature;
    empireSelect.replaceChildren();
    const none = document.createElement("option");
    none.value = "";
    none.textContent = t(currentLang, "empireProfileNone");
    empireSelect.append(none);
    empires.forEach((empire) => {
      const option = document.createElement("option");
      option.value = empire.id;
      option.textContent = state.empireModified && empire.id === state.empireId ? `● ${empire.name}` : empire.name;
      empireSelect.append(option);
    });
    empireSelect.setAttribute("aria-label", t(currentLang, "empireProfileSelectLabel"));
    empireSelect.title = t(currentLang, "empireProfileSelectLabel");
  }
  // Se vuelve a fijar siempre: si el usuario cancela un cambio, el desplegable recupera el imperio vigente.
  empireSelect.value = state.empireId || "";
  empireSelect.classList.toggle("is-modified", Boolean(state.empireModified));
}

function render() {
  const state = getPlanetState();
  renderEmpireSelect(state);
  renderDataVersion(state);
  const type = PLANET_TYPES.find((entry) => entry.id === state.celestialTypeId);
  const designation = getDesignation(state.designationId);

  if (typeIconEl) {
    typeIconEl.src = type ? `${STELLARIS_ASSETS_BASE}${type.img}` : "";
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
    populationEl.title = t(currentLang, "planetSummaryStaffedJobsLabel");
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

if (dataVersionSelect) {
  dataVersionSelect.addEventListener("change", () => {
    // Un valor fuera del registro no se acepta: se vuelve a pintar con la versión vigente.
    if (getDataVersion(dataVersionSelect.value)) updatePlanetState({ rulesetId: dataVersionSelect.value });
    else render();
  });
}

if (nameInput) {
  nameInput.addEventListener("input", () => {
    updatePlanetState({ planetName: nameInput.value });
  });
}

if (empireSelect) {
  empireSelect.addEventListener("change", () => {
    requestSwitchEmpire(empireSelect.value || null).finally(render);
  });
}

onEmpiresChange(render);
onPlanetStateChange(render);

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    render();
  });
});

render();

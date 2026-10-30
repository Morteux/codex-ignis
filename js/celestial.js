/**
 * Pestaña "Cuerpo celeste": de momento, solo el selector de tipo de
 * planeta (natural/artificial). Los modificadores y características
 * planetarias quedan para una futura iteración (ver js/celestial-data.js).
 *
 * Mismo patrón que js/empire.js: módulo independiente con su propio idioma
 * y sus propios listeners sobre los .lang-btn compartidos de la página.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import { STELLARIS_ASSETS_BASE as IMAGE_BASE } from "./asset-config.js";
import { PLANET_TYPES } from "./celestial-data.js";
import { updatePlanetState } from "./planet-state.js";

const langButtons = document.querySelectorAll(".lang-btn");
const naturalListEl = document.querySelector("#celestial-natural-list");
const artificialListEl = document.querySelector("#celestial-artificial-list");

let currentLang = detectInitialLang();

// Por defecto se elige al azar uno de los 9 planetas normales (a petición de Morteux),
// en vez de dejar el resumen del planeta vacío hasta que el usuario entre
// en esta pestaña.
const standardTypes = PLANET_TYPES.filter((type) => type.standard);
let selectedTypeId = standardTypes[Math.floor(Math.random() * standardTypes.length)].id;
updatePlanetState({ celestialTypeId: selectedTypeId });

function renderGroup(container, category) {
  if (!container) return;
  container.replaceChildren();
  PLANET_TYPES.filter((type) => type.category === category).forEach((type) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "celestial-type-card";
    card.classList.toggle("is-selected", selectedTypeId === type.id);

    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${type.img}`;
    img.alt = "";
    img.loading = "lazy";
    card.append(img);

    const name = document.createElement("span");
    name.textContent = t(currentLang, type.i18nKey);
    card.append(name);

    card.addEventListener("click", () => {
      selectedTypeId = selectedTypeId === type.id ? null : type.id;
      updatePlanetState({ celestialTypeId: selectedTypeId });
      refresh();
    });
    container.append(card);
  });
}

/** Fija el tipo de cuerpo celeste desde fuera (p. ej. al cargar un planeta de la biblioteca, P6). Un id desconocido o null deja el tipo sin elegir. */
export function setCelestialType(typeId) {
  selectedTypeId = PLANET_TYPES.some((type) => type.id === typeId) ? typeId : null;
  updatePlanetState({ celestialTypeId: selectedTypeId });
  refresh();
}

function refresh() {
  renderGroup(naturalListEl, "natural");
  renderGroup(artificialListEl, "artificial");
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = SUPPORTED_LANGS.includes(btn.dataset.lang) ? btn.dataset.lang : DEFAULT_LANG;
    storeLang(currentLang);
    refresh();
  });
});

refresh();

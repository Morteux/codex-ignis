/**
 * Simulador de Planetas (v1.5).
 *
 * Resumen del modelo actual (a petición de Morteux, iteración a iteración):
 *  - Ranuras: 6 base (una es el edificio capital) + 3 por cada
 *    especialización de distrito elegida (2 ranuras de especialización
 *    urbanas y 1 por cada categoría de recursos), con tope real de 21. Ver
 *    unlockedKeys() y calculateBuildingSlots() en planet-data.js.
 *  - Distritos: el urbano tiene 2 ranuras de especialización; generador,
 *    minería y agricultura tienen 1 cada una, todas con varias opciones
 *    (DISTRICTS[...].specializationOptions). Construir copias de distrito
 *    solo escala los empleos de las especializaciones elegidas. El total de
 *    copias de todos los tipos no puede superar planetSize (por defecto 20,
 *    editable).
 *  - Edificios: cada uno tiene "sets" y cada especialización "permittedSets"
 *    (ver planet-data.js); slotAcceptsBuilding() decide dónde se puede
 *    construir. Hay una ranura objetivo (selectedSlotKey, borde amarillo)
 *    que avanza sola a la siguiente libre; el catálogo desactiva lo que no
 *    encaja en ella y sus desplegables por categoría solo se recalculan al
 *    cambiar el TIPO de ranura objetivo (getSlotTypeSignature), no al
 *    moverse entre ranuras del mismo tipo.
 *  - Empleos: cada empleo tiene un slider de población (escala ×100 de los
 *    datos, paso 10) con botones ±100 (Mayús: ±1000). Los recursos se
 *    calculan a partir de la población asignada, no de la capacidad; el
 *    slider actualiza en vivo vía refreshEconomyOnly(), que nunca recrea
 *    los propios sliders para no interrumpir el arrastre.
 *  - Recursos: tres columnas siempre visibles (producidos, consumidos,
 *    netos), calculadas en computeTotals().
 *  - Pestañas de planeta (Planeta/Imperio/Cuerpo celeste/Sucursales):
 *    todo lo anterior vive bajo "Planeta"; Sucursales (P19) guarda la
 *    sucursal de otro imperio en `branchOffice` y la pinta js/branch-offices-ui.js.
 *
 * Modelo de ranuras: cada ranura no-capital tiene una "clave" estable
 * (p. ej. "urban-spec-0-1", "generator-spec-3") en vez de una simple
 * posición en un array. Así, si le retiras la especialización a una ranura,
 * sus edificios no se borran: dejan de contar hasta que la recuperes.
 *
 * Ver js/planet-data.js para el origen de todos los números.
 *
 * Módulos (P23.3): este archivo es la entrada de la página y solo tiene refresh() y el
 * arranque; el resto vive en js/planet-sim-*.js por responsabilidad: estado (state),
 * reglas (rules), motor económico (economy), textos e iconos (text), elementos y avisos
 * (dom), barras de pestañas (tabs), una vista por pestaña o panel (planet-ui, catalog-ui,
 * jobs-ui, production-ui, conditions-ui, body-tab, branch-tab), guardado (config) y
 * eventos (events). Ver PLANET_SIM_GDD.md §3.
 */

import "./i18n-simulator.js";
import "./i18n-empire-names.js";
import "./planet-sim-state.js";
import { applyPageTranslations } from "./page-shell.js";
import { updatePlanetState } from "./planet-state.js";
import { renderDepositFeatures, renderBlockers, renderPlanetModifiers } from "./planet-sim-body-tab.js";
import { renderBranchTab } from "./planet-sim-branch-tab.js";
import { renderConditions, renderModifiers } from "./planet-sim-conditions-ui.js";
import { computeTotals } from "./planet-sim-economy.js";
import { syncPlanetSize, renderSlots, renderDesignationSelect } from "./planet-sim-planet-ui.js";
import { renderStats, renderSummary, renderProduction } from "./planet-sim-production-ui.js";
import { syncCapitalToAuthority, pruneInvalidSpecializations, resolveSelectedSlot } from "./planet-sim-rules.js";
import { sim } from "./planet-sim-state.js";
import { renderActiveTabContent, setActiveTab, setMainTab } from "./planet-sim-tabs.js";
// Reactions to the rest of the page, registered after every module above (as before the split).
import "./planet-sim-events.js";

export { showNotice } from "./planet-sim-dom.js";
export { capturePlanetConfig, applyPlanetConfig } from "./planet-sim-config.js";

export function refresh() {
  syncCapitalToAuthority(); // before the size: the Synaptic Lathe capital adds Max Districts (P10.5)
  syncPlanetSize();
  pruneInvalidSpecializations();
  resolveSelectedSlot();
  const totals = computeTotals();
  renderSlots();
  renderStats(totals);
  renderActiveTabContent();
  renderSummary(totals);
  renderProduction(totals);
  renderConditions(totals);
  renderModifiers(totals);
  renderDepositFeatures();
  renderBlockers();
  renderPlanetModifiers();
  renderBranchTab(totals);
  updatePlanetState({ planetSize: sim.planetSize });
}

renderDesignationSelect();
applyPageTranslations();
setActiveTab("buildings");
setMainTab("planet");
refresh();

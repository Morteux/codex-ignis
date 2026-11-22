/**
 * Planet simulator: state of the planet being edited (districts, buildings, capital tier,
 * designation, size, staffing, conditions, blockers, modifiers, branch office).
 *
 * Constants, Maps and Sets are shared as they are; the values that several modules reassign
 * live in `sim` (an imported `let` is read-only in the importing module).
 * The swapped jobs are registered here, before any other simulator module reads JOBS.
 */

import { BUILDINGS, CAPITAL_SETS } from "./planet-data.js";
import { registerSwapJobs } from "./job-swaps.js";

// P21.2: swapped jobs join JOBS / JOB_OUTPUTS / JOB_EFFECTS / JOB_CATEGORIES (js/job-swaps.js).
registerSwapJobs();

/**
 * Mutable values of the simulator that several modules reassign (an imported `let` is read-only).
 */
export const sim = {
  activeTab: "buildings",
  districtFilter: null, // null = todas, o "urban"/"generator"/"mining"/"agriculture"
  capitalTierIndex: 0,
  lastCapitalSet: CAPITAL_SETS.standard,
  /** Designación planetaria elegida (id de DESIGNATIONS en designation-data.js, o "" si no hay ninguna). */
  selectedDesignationId: "",
  /** Tamaño del planeta: por ahora, límite del total de copias de distrito (urbano + recursos) que se pueden construir en la colonia. Editable por el usuario. */
  planetSize: 20,
  /**
   * Ranura actualmente seleccionada como destino de construcción (se resalta
   * con borde amarillo en la rejilla, y el catálogo desactiva los edificios
   * que no encajan en ella). Se recalcula en cada refresh() con
   * resolveSelectedSlot(): si sigue siendo una ranura libre y desbloqueada se
   * respeta tal cual (el usuario puede haberla elegido a mano pulsándola);
   * si no, se recalcula automáticamente a la primera ranura libre disponible.
   */
  selectedSlotKey: null,
  // P16.12: civiles introducidos a mano, en unidades ×100 (100 = 1 pop), sin tope.
  civiliansRaw: 0,
  // P10.5: Neural Chips of a Synaptic Lathe (all its pops), manual, ×100 like the civilians; saved with the planet.
  neuralChipsRaw: 0,
  // Último "tipo" de ranura para el que se calcularon los desplegables
  // abiertos/cerrados del catálogo, y su resultado (categoría -> abierto o
  // no). Mientras el objetivo se mueva dentro del mismo tipo de ranura, estos
  // valores se respetan tal cual (incluidos los cambios manuales del usuario
  // vía el evento "toggle"); solo se recalculan desde cero al cambiar de tipo.
  catalogSlotSignature: null,
  /** Size chosen by the user, kept while a megastructure with a fixed size is selected. */
  userPlanetSize: 20,
};

/**
 * Estado de distritos: el urbano guarda cuántas copias hay construidas
 * (count, solo escala empleos) y, por separado, qué especialización tiene
 * elegida cada una de sus 2 ranuras de especialización (slots: array de 2
 * posiciones, cada una null o el id de una DISTRICTS.urban.specializationOptions).
 * Elegir una especialización es lo único que desbloquea sus 3 ranuras de
 * edificio; el número de copias del distrito NO desbloquea ranuras.
 *
 * Cada categoría de recurso básico (generador/minería/agricultura) tiene
 * una única ranura de especialización (no dos como el urbano), con varias
 * opciones entre las que elegir (optionId: null o un id de
 * DISTRICTS[cat].specializationOptions) — igual que el urbano, pero con
 * un solo hueco de elección en vez de dos.
 */
// Mínimo de copias del distrito urbano: siempre tiene que haber al menos
// una construida, ocupando su espacio dentro del número máximo de
// distritos del planeta (planetSize).
export const URBAN_MIN_COUNT = 1;

export const districtState = {
  urban: { count: 2, slots: [null, null] },
  // cap (P10.4): manual limit of Habitat resource districts (orbital deposits); null = not set.
  generator: { count: 0, optionId: null, cap: null },
  mining: { count: 0, optionId: null, cap: null },
  agriculture: { count: 0, optionId: null, cap: null }
};

// Ranuras no-capital construidas: clave de ranura estable -> id de edificio.
// Ver cabecera del archivo para qué es una "clave de ranura".
export const builtMap = new Map();

export const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

/** P10.8: blockers placed by the user (saved with the planet); only the ones whose body and requirements fit have effects. */
export const selectedBlockers = new Set();

/** P10.8: planet modifiers chosen by the user (saved with the planet). */
export const selectedPlanetModifiers = new Set();

/** P10.8: user's choice of strategic deposit per strategic specialization (saved with the planet); missing = the worst one. */
export const strategicDepositChoice = {};

/**
 * P19: branch office another (corporate) empire placed on this planet. Owner civics and legality are the owner's,
 * not the host empire's (GDD §5.2); `slots` keeps every chosen building, also in slots the capital no longer unlocks
 * (they stay inactive, never deleted).
 */
export const BRANCH_MAX_SLOTS = 4;
export const branchOffice = { present: false, illegal: false, ownerCivicIds: [], slots: Array(BRANCH_MAX_SLOTS).fill(null) };

/**
 * Población asignada a cada empleo (jobId -> pops trabajándolo, controlada
 * por el slider de ese empleo). Se guarda en la MISMA escala ×100 que
 * jobCapacities y que los datos de origen (planet-data.js) — no en
 * unidades reales — para que el slider (paso de 10) tenga margen real de
 * movimiento. Solo se convierte a unidades reales una vez, en
 * computeTotals(), al calcular los recursos que produce esa población.
 */
export const jobAssignments = {};
// P9.7: felicidad y estabilidad extra introducidas a mano (fuentes no modeladas). Por defecto 0; se guardan con el planeta.
export const manualConditions = { happiness: 0, stability: 0 };

export const MANUAL_CONDITION_LIMIT = 100;
// Última capacidad conocida de cada empleo, para saber si el valor actual
// "seguía" al máximo (sin tocar) o si el usuario lo cambió a mano.
export const jobCapacityMemo = {};

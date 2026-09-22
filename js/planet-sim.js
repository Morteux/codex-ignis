/**
 * Simulador de Planetas (v1.4).
 *
 * Novedades de esta versión, a petición de Morteux:
 *  - Corregido el distrito urbano: construir copias YA NO da ranuras de
 *    edificio. El distrito urbano tiene 2 ranuras de especialización fijas
 *    (districtState.urban.slots); elegir una especialización en una de
 *    ellas es lo que desbloquea sus 3 ranuras de edificio, y sus empleos se
 *    multiplican por el número de copias de distrito construidas
 *    (districtState.urban.count). Si una ranura no tiene especialización
 *    elegida, no aporta ranuras ni empleos. Las 5 especializaciones
 *    disponibles (Industria Mixta/Pesada/Civil, Defensas Militares, Nexo
 *    Comercial) están en DISTRICTS.urban.specializationOptions.
 *  - Panel de recursos con 3 vistas: por defecto se ve el neto (como
 *    antes); un botón cambia a un desglose en dos columnas — producidos
 *    (solo positivos) y consumidos (solo negativos) — calculadas en
 *    computeTotals() como producedTotals/consumedTotals además del
 *    resourceTotals neto de siempre. El antiguo panel separado de
 *    "Mantenimiento" desaparece: su contenido queda dentro de "Consumidos".
 *  - Las pestañas Edificios/Distritos de la barra lateral ahora están
 *    fuera del contenedor con scroll (.planet-catalog-scroll), para no
 *    tener que desplazarse hasta arriba para cambiar de pestaña.
 *  - Nueva barra de pestañas de planeta (Planeta/Gestión/Economía/
 *    Ejércitos/Sucursales) por encima de todo lo anterior; todo lo ya
 *    existente vive bajo "Planeta", el resto son marcadores de posición
 *    ("Ejércitos" deshabilitada) a falta de contenido futuro.
 *  - Edificio capital: siempre presente, ocupa la primera ranura del
 *    distrito principal, nunca se puede demoler ni desactivar — solo
 *    mejorar o degradar de nivel (5 niveles reales, ver planet-data.js).
 *  - Distritos de recursos básicos (generador, minería, agricultura): cada
 *    uno especializable para desbloquear 3 ranuras más, sin cambios en
 *    esta versión.
 *
 * Modelo de ranuras: cada ranura no-capital tiene una "clave" estable
 * (p. ej. "urban-spec-0-1", "generator-spec-3") en vez de una simple
 * posición en un array. Así, si le retiras la especialización a una ranura
 * urbana o a una categoría de recursos, sus ranuras (y lo que hubiera
 * construido en ellas) no se borran: simplemente dejan de contar para
 * empleos/recursos hasta que las recuperes, sin desplazar ni afectar a las
 * ranuras de ningún otro grupo.
 *
 * Ver js/planet-data.js para el origen de todos los números.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";
import {
  IMAGE_BASE,
  BUILDINGS,
  JOBS,
  JOB_OUTPUTS,
  JOB_EFFECT_NOTES,
  RESOURCES,
  CATEGORY_ORDER,
  CATEGORY_I18N_KEYS,
  BUILDING_SLOT_RULES,
  calculateBuildingSlots,
  divideEffect,
  CAPITAL_TIERS,
  DISTRICTS,
  RESOURCE_DISTRICT_ORDER
} from "./planet-data.js";

const langButtons = document.querySelectorAll(".lang-btn");
const slotsLabel = document.querySelector("#planet-slots-label");
const slotsVisualEl = document.querySelector("#planet-slots-visual");
const statHousing = document.querySelector("#planet-stat-housing");
const statAmenities = document.querySelector("#planet-stat-amenities");
const catalogEl = document.querySelector("#planet-catalog");
const districtsCatalogEl = document.querySelector("#planet-districts-catalog");
const tabBuildingsBtn = document.querySelector("#planet-tab-buildings");
const tabDistrictsBtn = document.querySelector("#planet-tab-districts");
const summaryEl = document.querySelector("#planet-summary");
const summaryPopulationEl = document.querySelector("#planet-summary-population");
const producedEl = document.querySelector("#planet-production-produced");
const consumedEl = document.querySelector("#planet-production-consumed");
const netEl = document.querySelector("#planet-production-net");
const nonResourceEl = document.querySelector("#planet-nonresource");
const capitalIconEl = document.querySelector("#planet-capital-icon");
const capitalNameEl = document.querySelector("#planet-capital-name");
const capitalTierEl = document.querySelector("#planet-capital-tier");
const capitalUpgradeBtn = document.querySelector("#planet-capital-upgrade");
const capitalDowngradeBtn = document.querySelector("#planet-capital-downgrade");
const metaDescription = document.querySelector('meta[name="description"]');
const mainTabButtons = document.querySelectorAll(".planet-main-tab[data-main-tab]");
const mainTabPanels = {
  planet: document.querySelector("#planet-tab-panel-planet"),
  management: document.querySelector("#planet-tab-panel-management"),
  economy: document.querySelector("#planet-tab-panel-economy"),
  branches: document.querySelector("#planet-tab-panel-branches")
};

let currentLang = detectInitialLang();
let activeTab = "buildings";
let districtFilter = null; // null = todas, o "urban"/"generator"/"mining"/"agriculture"

let capitalTierIndex = 0;

/**
 * Estado de distritos: el urbano guarda cuántas copias hay construidas
 * (count, solo escala empleos) y, por separado, qué especialización tiene
 * elegida cada una de sus 2 ranuras de especialización (slots: array de 2
 * posiciones, cada una null o el id de una DISTRICTS.urban.specializationOptions).
 * Elegir una especialización es lo único que desbloquea sus 3 ranuras de
 * edificio; el número de copias del distrito NO desbloquea ranuras. Cada
 * categoría de recurso básico sigue teniendo su propio número de copias y
 * si está especializada (mecánica sin cambios).
 */
const districtState = {
  urban: { count: 2, slots: [null, null] },
  generator: { count: 0, specialized: false },
  mining: { count: 0, specialized: false },
  agriculture: { count: 0, specialized: false }
};

/** Mapa id -> definición de especialización de distrito urbano, para búsquedas rápidas. */
const urbanSpecOptionsById = new Map(DISTRICTS.urban.specializationOptions.map((option) => [option.id, option]));

// Ranuras no-capital construidas: clave de ranura estable -> id de edificio.
// Ver cabecera del archivo para qué es una "clave de ranura".
const builtMap = new Map();

const buildingsById = new Map(BUILDINGS.map((b) => [b.id, b]));

function specializedCategoryCount() {
  return RESOURCE_DISTRICT_ORDER.filter((cat) => districtState[cat].specialized).length;
}

/** Cuántas de las 2 ranuras de especialización del distrito urbano tienen ya una especialización elegida. */
function specializedUrbanSlotCount() {
  return districtState.urban.slots.filter(Boolean).length;
}

function totalSlots() {
  return calculateBuildingSlots(specializedUrbanSlotCount(), specializedCategoryCount());
}

/** Ranuras que no son la del capital: la ranura 0 de las 6 base siempre es suya. */
function buildableCapacity() {
  return totalSlots() - 1;
}

/** Claves de ranura, en orden canónico estable, dentro del límite actual (incluido el tope real de 21). */
function unlockedKeys() {
  const keys = [];
  for (let i = 1; i <= 5; i += 1) keys.push(`base-${i}`);
  districtState.urban.slots.forEach((optionId, slotIndex) => {
    if (!optionId) return;
    for (let i = 1; i <= 3; i += 1) keys.push(`urban-spec-${slotIndex}-${i}`);
  });
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    if (districtState[cat].specialized) {
      for (let i = 1; i <= 3; i += 1) keys.push(`${cat}-spec-${i}`);
    }
  });
  return keys.slice(0, buildableCapacity());
}

function isKeyUnlocked(key, unlocked) {
  return unlocked.includes(key);
}

function buildingCount(id) {
  let n = 0;
  builtMap.forEach((buildingId) => { if (buildingId === id) n += 1; });
  return n;
}

function activeBuildingCount() {
  const unlocked = unlockedKeys();
  let n = 0;
  unlocked.forEach((key) => { if (builtMap.has(key)) n += 1; });
  return n;
}

function isLimited(building) {
  return building.colonyLimit !== "none";
}

/** Building sets que solo se pueden construir en su distrito de recursos especializado a juego, nunca en las ranuras base (ver doc de BUILDINGS en planet-data.js). */
const EXTRACTION_BUILDING_SETS = ["energy", "minerals", "food"];

/**
 * Qué building sets admite una ranura, y una etiqueta legible de su
 * especialización (para el aviso cuando un edificio no encaja ahí).
 * sets === null significa "ranura base": admite cualquier cosa salvo los
 * building sets de extracción (energy/minerals/food), que exigen su propio
 * distrito de recursos especializado.
 */
function slotSpecInfo(key) {
  const urbanMatch = /^urban-spec-(\d+)-\d+$/.exec(key);
  if (urbanMatch) {
    const slotIndex = Number(urbanMatch[1]);
    const optionId = districtState.urban.slots[slotIndex];
    const option = optionId ? urbanSpecOptionsById.get(optionId) : null;
    return {
      sets: option ? option.permittedSets : [],
      label: option ? t(currentLang, option.i18nKey) : t(currentLang, "planetSimNotSpecialized")
    };
  }

  const resourceMatch = /^(generator|mining|agriculture)-spec-\d+$/.exec(key);
  if (resourceMatch) {
    const def = DISTRICTS[resourceMatch[1]];
    return {
      sets: def.specialization.permittedSets || [],
      label: t(currentLang, def.specialization.i18nKey)
    };
  }

  // Ranura base (base-1..5 o capital): sin especialización que la restrinja.
  return { sets: null, label: null };
}

/** ¿Puede este edificio construirse en esta ranura, según su especialización? */
function slotAcceptsBuilding(key, building) {
  const info = slotSpecInfo(key);
  if (info.sets === null) {
    return !building.sets.some((set) => EXTRACTION_BUILDING_SETS.includes(set));
  }
  return building.sets.some((set) => info.sets.includes(set));
}

/**
 * Ranura actualmente seleccionada como destino de construcción (se resalta
 * con borde amarillo en la rejilla, y el catálogo desactiva los edificios
 * que no encajan en ella). Se recalcula en cada refresh() con
 * resolveSelectedSlot(): si sigue siendo una ranura libre y desbloqueada se
 * respeta tal cual (el usuario puede haberla elegido a mano pulsándola);
 * si no, se recalcula automáticamente a la primera ranura libre disponible.
 */
let selectedSlotKey = null;

/** Mantiene selectedSlotKey apuntando a una ranura libre y desbloqueada válida (o null si no queda ninguna). Se llama al principio de refresh(). */
function resolveSelectedSlot() {
  const unlocked = unlockedKeys();
  if (selectedSlotKey && unlocked.includes(selectedSlotKey) && !builtMap.has(selectedSlotKey)) {
    return selectedSlotKey;
  }
  selectedSlotKey = unlocked.find((key) => !builtMap.has(key)) || null;
  return selectedSlotKey;
}

function removeBuildingAt(key) {
  builtMap.delete(key);
}

/**
 * Recalcula, a partir del capital, los distritos y las ranuras activas,
 * todo lo que puede derivarse: empleos totales, producción/consumo de
 * recursos, vivienda, comodidades/servicios y efectos sin recurso.
 */
function computeTotals() {
  // jobCapacities y jobAssignments viven en la MISMA escala ×100 que los
  // datos de origen (planet-data.js): así el slider (que avanza de 10 en
  // 10) tiene margen real para moverse — la mayoría de capacidades reales
  // (2, 3 pops...) apenas dejarían mover un slider de paso 10. La única
  // división por EFFECT_SCALE ocurre una vez, al final, al convertir la
  // población asignada en la tasa de recursos por trabajo (JOB_OUTPUTS,
  // que sí está en unidades reales por trabajo, confirmadas contra la wiki).
  const jobCapacities = {}; // jobId -> capacidad máxima, en unidades ×100
  const resourceTotals = {};
  const producedTotals = {};
  const consumedTotals = {};
  let housing = 0;
  let amenities = 0;

  // Suma un importe con signo al total neto de un recurso, y además lo
  // reparte en "producido" (solo la parte positiva) o "consumido" (solo la
  // parte negativa), para los paneles de desglose.
  const addSignedResource = (resourceId, amount) => {
    if (!amount) return;
    resourceTotals[resourceId] = (resourceTotals[resourceId] || 0) + amount;
    if (amount > 0) {
      producedTotals[resourceId] = (producedTotals[resourceId] || 0) + amount;
    } else {
      consumedTotals[resourceId] = (consumedTotals[resourceId] || 0) + amount;
    }
  };

  const addJobCapacity = (jobId, rawAmount) => {
    if (!rawAmount) return;
    jobCapacities[jobId] = (jobCapacities[jobId] || 0) + rawAmount;
  };

  // Edificio capital (fijo, siempre presente).
  const capital = CAPITAL_TIERS[capitalTierIndex];
  housing += divideEffect(capital.housing || 0);
  amenities += divideEffect(capital.amenities || 0);
  Object.entries(capital.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw));

  // Distritos de recursos básicos: empleo base por copia, y bonus de
  // especialización por copia si la categoría está especializada.
  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    const state = districtState[cat];
    const def = DISTRICTS[cat];
    if (state.count > 0) {
      Object.entries(def.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * state.count));
      if (state.specialized) {
        Object.entries(def.specialization.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * state.count));
      }
    }
  });

  // Distrito urbano: construirlo no aporta nada por sí mismo. Cada una de
  // sus 2 ranuras de especialización que tenga una especialización elegida
  // aporta sus empleos, multiplicados por el número de copias construidas.
  if (districtState.urban.count > 0) {
    districtState.urban.slots.forEach((optionId) => {
      if (!optionId) return;
      const option = urbanSpecOptionsById.get(optionId);
      if (!option) return;
      Object.entries(option.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw * districtState.urban.count));
    });
  }

  // Edificios normales, solo los que caen en una ranura actualmente activa.
  const unlocked = unlockedKeys();
  builtMap.forEach((id, key) => {
    if (!unlocked.includes(key)) return;
    const building = buildingsById.get(id);
    Object.entries(building.jobs || {}).forEach(([jobId, raw]) => addJobCapacity(jobId, raw));
    housing += divideEffect(building.housing || 0);
    amenities += divideEffect(building.amenities || 0);
    Object.entries(building.upkeep || {}).forEach(([resourceId, amount]) => {
      addSignedResource(resourceId, amount);
    });
  });

  // La población asignada a cada empleo (slider) se ajusta a la nueva
  // capacidad antes de calcular recursos: ver syncJobAssignments más abajo.
  syncJobAssignments(jobCapacities);

  // Los recursos se calculan a partir de la población REALMENTE asignada a
  // cada empleo (jobAssignments, en unidades ×100 igual que jobCapacities),
  // convertida a trabajos reales con divideEffect() justo aquí — la única
  // división por 100 de todo el cálculo.
  Object.entries(jobCapacities).forEach(([jobId, capacity]) => {
    const assigned = divideEffect(jobAssignments[jobId] || 0);
    Object.entries(JOB_OUTPUTS[jobId] || {}).forEach(([resourceId, perJob]) => {
      addSignedResource(resourceId, perJob * assigned);
    });
  });

  return { jobCapacities, resourceTotals, producedTotals, consumedTotals, housing, amenities };
}

/**
 * Población asignada a cada empleo (jobId -> pops trabajándolo, controlada
 * por el slider de ese empleo). Se guarda en la MISMA escala ×100 que
 * jobCapacities y que los datos de origen (planet-data.js) — no en
 * unidades reales — para que el slider (paso de 10) tenga margen real de
 * movimiento. Solo se convierte a unidades reales una vez, en
 * computeTotals(), al calcular los recursos que produce esa población.
 */
const jobAssignments = {};
// Última capacidad conocida de cada empleo, para saber si el valor actual
// "seguía" al máximo (sin tocar) o si el usuario lo cambió a mano.
const jobCapacityMemo = {};

/**
 * Sincroniza jobAssignments contra la capacidad actual de cada empleo.
 * Por defecto (empleo nuevo, o su valor coincidía con el máximo anterior)
 * el slider salta al nuevo máximo al añadir/quitar edificios. Si el valor
 * ya era distinto del máximo anterior, se respeta (solo se recorta hacia
 * abajo si ahora supera la nueva capacidad, reducida por ejemplo al
 * demoler un edificio).
 */
function syncJobAssignments(jobCapacities) {
  Object.entries(jobCapacities).forEach(([jobId, capacity]) => {
    const previousCapacity = jobCapacityMemo[jobId];
    const current = jobAssignments[jobId];
    if (current === undefined || (previousCapacity !== undefined && current === previousCapacity)) {
      jobAssignments[jobId] = capacity;
    } else if (current > capacity) {
      jobAssignments[jobId] = capacity;
    }
    jobCapacityMemo[jobId] = capacity;
  });

  Object.keys(jobAssignments).forEach((jobId) => {
    if (!(jobId in jobCapacities)) {
      delete jobAssignments[jobId];
      delete jobCapacityMemo[jobId];
    }
  });
}

function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(currentLang, el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(":");
    el.setAttribute(attr, t(currentLang, key));
  });

  langButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

function jobIcon(jobId) {
  const job = JOBS[jobId];
  const img = document.createElement("img");
  img.className = "planet-job-icon";
  img.src = `${IMAGE_BASE}${job.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

function resourceIcon(resourceId) {
  const resource = RESOURCES[resourceId];
  const img = document.createElement("img");
  img.className = "planet-resource-icon";
  img.src = `${IMAGE_BASE}${resource.img}`;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

function jobName(jobId) {
  return t(currentLang, JOBS[jobId].i18nKey);
}

function resourceName(resourceId) {
  return t(currentLang, RESOURCES[resourceId].i18nKey);
}

function formatAmount(amount, forceSign) {
  const rounded = Math.round(amount * 100) / 100;
  const text = rounded % 1 === 0 ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(2).replace(/0$/, "");
  if (forceSign) return `${rounded < 0 ? "−" : "+"}${text}`;
  return rounded < 0 ? `−${text}` : text;
}

function buildingDisplayName(building) {
  return t(currentLang, building.i18nKey);
}

/**
 * Fila de un empleo en el resumen: icono+nombre+capacidad a la izquierda,
 * slider de población en el medio, recursos que aporta a la derecha.
 * `capacity` y `jobAssignments[jobId]` están en la escala ×100 de los
 * datos de origen (no en pops reales): así el slider de paso 10 tiene
 * recorrido real. Los recursos de la derecha SÍ se muestran ya convertidos
 * a unidades reales (única división, con divideEffect, al calcularlos).
 */
function renderJobSliderRow(jobId, capacity) {
  const assigned = jobAssignments[jobId] || 0;

  const row = document.createElement("div");
  row.className = "planet-job-row";

  const info = document.createElement("div");
  info.className = "planet-job-row-info";
  info.append(jobIcon(jobId));
  const label = document.createElement("span");
  label.textContent = `${jobName(jobId)} · ${t(currentLang, "planetSimJobMaxLabel")(formatAmount(capacity))}`;
  info.append(label);
  row.append(info);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "planet-job-slider";
  slider.min = "0";
  slider.max = String(capacity);
  slider.step = "10";
  slider.value = String(assigned);
  slider.setAttribute("aria-label", jobName(jobId));
  // Se usa "change" (no "input") para no forzar un refresco completo del
  // panel (que recrearía este mismo control) mientras el usuario arrastra
  // el slider, ya que eso interrumpiría el propio arrastre.
  slider.addEventListener("change", () => {
    jobAssignments[jobId] = Number(slider.value);
    refresh();
  });
  row.append(slider);

  const valueLabel = document.createElement("span");
  valueLabel.className = "planet-job-row-value";
  valueLabel.textContent = formatAmount(assigned);
  row.append(valueLabel);

  const output = document.createElement("div");
  output.className = "planet-job-row-output";
  const outputs = Object.entries(JOB_OUTPUTS[jobId] || {});
  if (outputs.length) {
    outputs.forEach(([resourceId, perJob]) => {
      const amount = perJob * divideEffect(assigned);
      const pill = document.createElement("span");
      pill.className = `planet-job-output-pill ${amount < 0 ? "is-negative" : "is-positive"}`;
      pill.append(resourceIcon(resourceId));
      const amountLabel = document.createElement("span");
      amountLabel.textContent = formatAmount(amount, true);
      pill.append(amountLabel);
      output.append(pill);
    });
  } else if (JOB_EFFECT_NOTES[jobId]) {
    const note = document.createElement("span");
    note.className = "planet-job-output-note";
    note.textContent = t(currentLang, JOB_EFFECT_NOTES[jobId]);
    output.append(note);
  }
  row.append(output);

  return row;
}

function renderJobsMini(jobs) {
  const entries = Object.entries(jobs).filter(([, raw]) => raw > 0);
  const wrapper = document.createElement("span");
  wrapper.className = "planet-catalog-jobs";
  entries.forEach(([jobId, raw]) => {
    const pill = document.createElement("span");
    pill.className = "planet-catalog-job-pill";
    pill.title = `+${formatAmount(raw)} ${jobName(jobId)}`;
    pill.append(jobIcon(jobId));
    const label = document.createElement("span");
    label.textContent = formatAmount(raw);
    pill.append(label);
    wrapper.append(pill);
  });
  return wrapper;
}

/* ── Edificio capital ────────────────────────────────────────────────── */

function renderCapital() {
  const capital = CAPITAL_TIERS[capitalTierIndex];
  if (capitalIconEl) {
    capitalIconEl.src = `${IMAGE_BASE}${capital.img}`;
    capitalIconEl.alt = t(currentLang, capital.i18nKey);
  }
  if (capitalNameEl) capitalNameEl.textContent = t(currentLang, capital.i18nKey);
  if (capitalTierEl) capitalTierEl.textContent = `${capitalTierIndex + 1} / ${CAPITAL_TIERS.length}`;
  if (capitalUpgradeBtn) {
    capitalUpgradeBtn.disabled = capitalTierIndex >= CAPITAL_TIERS.length - 1;
    capitalUpgradeBtn.title = capitalUpgradeBtn.disabled ? t(currentLang, "planetSimCapitalMaxTier") : "";
  }
  if (capitalDowngradeBtn) {
    capitalDowngradeBtn.disabled = capitalTierIndex <= 0;
    capitalDowngradeBtn.title = capitalDowngradeBtn.disabled ? t(currentLang, "planetSimCapitalMinTier") : "";
  }
}

if (capitalUpgradeBtn) {
  capitalUpgradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.min(CAPITAL_TIERS.length - 1, capitalTierIndex + 1);
    refresh();
  });
}
if (capitalDowngradeBtn) {
  capitalDowngradeBtn.addEventListener("click", () => {
    capitalTierIndex = Math.max(0, capitalTierIndex - 1);
    refresh();
  });
}

/* ── Rejilla visual de ranuras (capital + base + urbanos + recursos) ──── */

function makeRegularSlotCell(key, unlocked, lockedTooltip) {
  const isUnlocked = unlocked.includes(key);
  const buildingId = builtMap.get(key);

  if (buildingId) {
    const building = buildingsById.get(buildingId);
    const slot = document.createElement("button");
    slot.type = "button";
    const stateClass = isUnlocked ? (isLimited(building) ? "is-limited" : "is-standard") : "is-inactive";
    slot.className = `planet-slot is-filled ${stateClass}`;
    slot.title = isUnlocked
      ? `${buildingDisplayName(building)} — ${t(currentLang, "planetSimClickToDemolish")}`
      : `${buildingDisplayName(building)} — ${t(currentLang, "planetSimSlotInactive")}`;
    const img = document.createElement("img");
    img.src = `${IMAGE_BASE}${building.img}`;
    img.alt = buildingDisplayName(building);
    img.loading = "lazy";
    slot.append(img);
    slot.addEventListener("click", () => {
      removeBuildingAt(key);
      refresh();
    });
    return slot;
  }

  if (isUnlocked) {
    const slot = document.createElement("button");
    slot.type = "button";
    const isTarget = key === selectedSlotKey;
    slot.className = `planet-slot is-empty${isTarget ? " is-target" : ""}`;
    slot.title = isTarget
      ? t(currentLang, "planetSimSlotTarget")
      : t(currentLang, "planetSimSlotEmpty");
    slot.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedSlotKey = key;
      refresh();
    });
    return slot;
  }

  const slot = document.createElement("span");
  slot.className = "planet-slot is-locked";
  slot.title = lockedTooltip || t(currentLang, "planetSimSlotLocked");
  return slot;
}

function renderCapitalCell() {
  const capital = CAPITAL_TIERS[capitalTierIndex];
  const cell = document.createElement("span");
  cell.className = "planet-slot is-filled is-capital";
  cell.title = `${buildingDisplayName(capital)} — ${t(currentLang, "planetSimCapitalCannotRemove")}`;
  const img = document.createElement("img");
  img.src = `${IMAGE_BASE}${capital.img}`;
  img.alt = buildingDisplayName(capital);
  img.loading = "lazy";
  cell.append(img);
  return cell;
}

function renderSlotsVisual() {
  if (!slotsVisualEl) return;
  slotsVisualEl.replaceChildren();

  const unlocked = unlockedKeys();

  // Fila superior: 6 ranuras base (capital + 5) a la izquierda, distritos urbanos a la derecha.
  const topRow = document.createElement("div");
  topRow.className = "planet-top-row";

  const baseGrid = document.createElement("div");
  baseGrid.className = "planet-base-grid";
  baseGrid.append(renderCapitalCell());
  for (let i = 1; i <= 5; i += 1) {
    baseGrid.append(makeRegularSlotCell(`base-${i}`, unlocked));
  }
  topRow.append(baseGrid);

  for (let slotIndex = 0; slotIndex < DISTRICTS.urban.specializationSlots; slotIndex += 1) {
    topRow.append(renderUrbanSpecializationBox(slotIndex, unlocked));
  }

  slotsVisualEl.append(topRow);

  // Fila inferior: los 3 distritos de recursos básicos, centrados.
  const bottomRow = document.createElement("div");
  bottomRow.className = "planet-resource-districts-row";

  RESOURCE_DISTRICT_ORDER.forEach((cat) => {
    bottomRow.append(renderResourceDistrictBox(cat, unlocked));
  });

  slotsVisualEl.append(bottomRow);
}

/** Caja visual de una de las 2 ranuras de especialización del distrito urbano: icono/estado + sus 3 ranuras de edificio. */
function renderUrbanSpecializationBox(slotIndex, unlocked) {
  const def = DISTRICTS.urban;
  const optionId = districtState.urban.slots[slotIndex];
  const option = optionId ? urbanSpecOptionsById.get(optionId) : null;

  const box = document.createElement("div");
  box.className = "planet-resource-district-box";
  box.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled")) return;
    openDistrictsTab("urban");
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${option ? option.img : def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = t(currentLang, "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  header.append(icon, title);
  box.append(header);

  const statusLine = document.createElement("p");
  statusLine.className = "planet-resource-district-status";
  statusLine.textContent = option ? t(currentLang, option.i18nKey) : t(currentLang, "planetSimNotSpecialized");
  box.append(statusLine);

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `urban-spec-${slotIndex}-${i}`;
    row.append(makeRegularSlotCell(key, unlocked, t(currentLang, "planetSimUrbanSlotLockedTooltip")));
  }
  box.append(row);

  return box;
}

function renderResourceDistrictBox(cat, unlocked) {
  const def = DISTRICTS[cat];
  const state = districtState[cat];

  const box = document.createElement("div");
  box.className = "planet-resource-district-box";
  box.addEventListener("click", (event) => {
    if (event.target.closest(".planet-slot.is-filled")) return;
    openDistrictsTab(cat);
  });

  const header = document.createElement("div");
  header.className = "planet-resource-district-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const title = document.createElement("span");
  title.textContent = `${t(currentLang, def.i18nKey)} ${t(currentLang, "planetSimDistrictCount")(state.count)}`;
  header.append(icon, title);
  box.append(header);

  const statusLine = document.createElement("p");
  statusLine.className = "planet-resource-district-status";
  statusLine.textContent = state.specialized
    ? t(currentLang, "planetSimSpecializedAs")(t(currentLang, def.specialization.i18nKey))
    : t(currentLang, def.specialization.techI18nKey);
  box.append(statusLine);

  const row = document.createElement("div");
  row.className = "planet-district-slot-row";
  for (let i = 1; i <= 3; i += 1) {
    const key = `${cat}-spec-${i}`;
    const lockedTooltip = t(currentLang, def.specialization.techI18nKey);
    row.append(makeRegularSlotCell(key, unlocked, lockedTooltip));
  }
  box.append(row);

  return box;
}

/* ── Pestañas y catálogo de edificios ───────────────────────────────── */

function openDistrictsTab(filter) {
  districtFilter = filter;
  setActiveTab("districts");
}

function setActiveTab(tab) {
  activeTab = tab;
  if (tabBuildingsBtn) tabBuildingsBtn.classList.toggle("is-active", tab === "buildings");
  if (tabDistrictsBtn) tabDistrictsBtn.classList.toggle("is-active", tab === "districts");
  if (catalogEl) catalogEl.hidden = tab !== "buildings";
  if (districtsCatalogEl) districtsCatalogEl.hidden = tab !== "districts";
  renderActiveTabContent();
}

if (tabBuildingsBtn) tabBuildingsBtn.addEventListener("click", () => setActiveTab("buildings"));
if (tabDistrictsBtn) tabDistrictsBtn.addEventListener("click", () => {
  districtFilter = null;
  setActiveTab("districts");
});

/* ── Pestañas principales del planeta (Planeta / Gestión / Economía / Ejércitos / Sucursales) ── */

function setMainTab(tab) {
  mainTabButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mainTab === tab);
  });
  Object.entries(mainTabPanels).forEach(([key, panel]) => {
    if (panel) panel.hidden = key !== tab;
  });
}

mainTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMainTab(btn.dataset.mainTab));
});

function renderActiveTabContent() {
  if (activeTab === "buildings") renderCatalog();
  else renderDistrictsCatalog();
}

function renderCatalog() {
  if (!catalogEl) return;
  catalogEl.replaceChildren();

  const targetKey = resolveSelectedSlot();
  const slotsFull = !targetKey;

  CATEGORY_ORDER.forEach((category) => {
    const items = BUILDINGS.filter((b) => b.category === category);
    if (!items.length) return;

    const heading = document.createElement("h3");
    heading.className = "entry-heading-sub planet-category-heading";
    heading.textContent = t(currentLang, CATEGORY_I18N_KEYS[category]);
    catalogEl.append(heading);

    const list = document.createElement("div");
    list.className = "planet-catalog-list";

    items.forEach((building) => {
      list.append(renderCatalogItem(building, slotsFull, targetKey));
    });

    catalogEl.append(list);
  });
}

/** slotsFull: no queda ninguna ranura libre en toda la colonia. targetKey: la ranura libre actualmente seleccionada como destino (o null si slotsFull). */
function renderCatalogItem(building, slotsFull, targetKey) {
  const count = buildingCount(building.id);
  const atLimit = building.colonyLimit !== "none" && count >= building.colonyLimit;
  const incompatible = !slotsFull && !slotAcceptsBuilding(targetKey, building);
  const disabled = slotsFull || atLimit || incompatible;

  const item = document.createElement("button");
  item.type = "button";
  item.className = `planet-catalog-item ${isLimited(building) ? "is-limited" : "is-standard"}`;
  item.disabled = disabled;

  let reason;
  if (atLimit) {
    reason = t(currentLang, "planetSimLimitReached");
  } else if (slotsFull) {
    reason = t(currentLang, "planetSimSlotsFull");
  } else if (incompatible) {
    const info = slotSpecInfo(targetKey);
    reason = info.sets === null
      ? t(currentLang, "planetSimBuildingNotAllowedBase")(buildingDisplayName(building))
      : t(currentLang, "planetSimBuildingNotAllowed")(buildingDisplayName(building), info.label);
  } else {
    reason = t(currentLang, "planetSimClickToBuild");
  }
  item.title = `${buildingDisplayName(building)} — ${reason}`;

  const img = document.createElement("img");
  img.className = "planet-catalog-icon";
  img.src = `${IMAGE_BASE}${building.img}`;
  img.alt = "";
  img.loading = "lazy";
  item.append(img);

  const name = document.createElement("span");
  name.className = "planet-catalog-name";
  name.textContent = buildingDisplayName(building);
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "planet-catalog-count";
    badge.textContent = `×${count}`;
    name.append(" ", badge);
  }
  item.append(name);

  if (Object.keys(building.jobs || {}).length) {
    item.append(renderJobsMini(building.jobs));
  } else if (building.housing || building.amenities) {
    const extra = document.createElement("span");
    extra.className = "planet-catalog-extra";
    const parts = [];
    if (building.housing) parts.push(t(currentLang, "planetSimHousingLabel")(formatAmount(divideEffect(building.housing))));
    if (building.amenities) parts.push(t(currentLang, "planetSimAmenitiesLabel")(formatAmount(divideEffect(building.amenities))));
    extra.textContent = parts.join(" · ");
    item.append(extra);
  }

  item.addEventListener("click", () => {
    if (disabled || !targetKey) return;
    builtMap.set(targetKey, building.id);
    refresh();
  });

  return item;
}

/* ── Catálogo de distritos ───────────────────────────────────────────── */

function renderDistrictsCatalog() {
  if (!districtsCatalogEl) return;
  districtsCatalogEl.replaceChildren();

  if (districtFilter) {
    const viewAll = document.createElement("button");
    viewAll.type = "button";
    viewAll.className = "planet-view-all-btn";
    viewAll.textContent = t(currentLang, "planetSimViewAll");
    viewAll.addEventListener("click", () => { districtFilter = null; renderDistrictsCatalog(); });
    districtsCatalogEl.append(viewAll);
  }

  const categories = districtFilter ? [districtFilter] : ["urban", ...RESOURCE_DISTRICT_ORDER];
  categories.forEach((cat) => {
    districtsCatalogEl.append(cat === "urban" ? renderUrbanDistrictCard() : renderResourceDistrictCard(cat));
  });
}

function renderUrbanDistrictCard() {
  const def = DISTRICTS.urban;
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = `${t(currentLang, def.i18nKey)} ${t(currentLang, "planetSimDistrictCount")(districtState.urban.count)}`;
  header.append(icon, name);
  card.append(header);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, "planetSimUrbanSlotsNote");
  card.append(note);

  card.append(renderCountControl(
    districtState.urban.count,
    () => { districtState.urban.count = Math.max(0, districtState.urban.count - 1); refresh(); },
    () => { districtState.urban.count = Math.min(20, districtState.urban.count + 1); refresh(); }
  ));

  for (let slotIndex = 0; slotIndex < def.specializationSlots; slotIndex += 1) {
    card.append(renderUrbanSpecializationPicker(slotIndex));
  }

  return card;
}

/** Selector de una de las 2 ranuras de especialización del distrito urbano, dentro de la ficha de la pestaña Distritos. */
function renderUrbanSpecializationPicker(slotIndex) {
  const def = DISTRICTS.urban;
  const currentId = districtState.urban.slots[slotIndex];
  const currentOption = currentId ? urbanSpecOptionsById.get(currentId) : null;

  const wrapper = document.createElement("div");
  wrapper.className = "planet-district-spec-row";

  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${currentOption ? currentOption.img : def.img}`;
  icon.alt = "";
  wrapper.append(icon);

  const info = document.createElement("div");
  info.className = "planet-district-spec-info";

  const label = document.createElement("span");
  label.textContent = t(currentLang, "planetSimUrbanSpecializationSlot")(slotIndex + 1);
  info.append(label);

  const select = document.createElement("select");
  select.className = "planet-urban-spec-select";

  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = t(currentLang, "planetSimNotSpecialized");
  if (!currentId) noneOption.selected = true;
  select.append(noneOption);

  def.specializationOptions.forEach((option) => {
    const optionEl = document.createElement("option");
    optionEl.value = option.id;
    optionEl.textContent = t(currentLang, option.i18nKey);
    if (option.id === currentId) optionEl.selected = true;
    select.append(optionEl);
  });

  select.addEventListener("change", () => {
    districtState.urban.slots[slotIndex] = select.value || null;
    refresh();
  });
  info.append(select);

  if (currentOption) {
    info.append(renderJobsMini(currentOption.jobs));
  }

  wrapper.append(info);

  return wrapper;
}

function renderResourceDistrictCard(cat) {
  const def = DISTRICTS[cat];
  const state = districtState[cat];
  const card = document.createElement("div");
  card.className = "planet-district-card";

  const header = document.createElement("div");
  header.className = "planet-district-card-header";
  const icon = document.createElement("img");
  icon.className = "planet-district-icon";
  icon.src = `${IMAGE_BASE}${def.img}`;
  icon.alt = "";
  const name = document.createElement("span");
  name.textContent = t(currentLang, def.i18nKey);
  header.append(icon, name);
  card.append(header);

  card.append(renderJobsMini(def.jobs));

  card.append(renderCountControl(
    state.count,
    () => {
      state.count = Math.max(0, state.count - 1);
      if (state.count === 0) state.specialized = false;
      refresh();
    },
    () => { state.count = Math.min(20, state.count + 1); refresh(); }
  ));

  const specRow = document.createElement("div");
  specRow.className = "planet-district-spec-row";

  const specIcon = document.createElement("img");
  specIcon.className = "planet-district-icon";
  specIcon.src = `${IMAGE_BASE}${def.specialization.img}`;
  specIcon.alt = "";
  specRow.append(specIcon);

  const specInfo = document.createElement("div");
  specInfo.className = "planet-district-spec-info";
  const specName = document.createElement("span");
  specName.textContent = t(currentLang, def.specialization.i18nKey);
  const specStatus = document.createElement("span");
  specStatus.className = "planet-district-spec-status";
  specStatus.textContent = state.specialized ? t(currentLang, "planetSimSpecializedAs")(t(currentLang, def.specialization.i18nKey)) : t(currentLang, "planetSimNotSpecialized");
  specInfo.append(specName, specStatus);
  specRow.append(specInfo);

  const specButton = document.createElement("button");
  specButton.type = "button";
  specButton.className = "planet-add-btn";
  specButton.textContent = state.specialized ? t(currentLang, "planetSimUnspecializeButton") : t(currentLang, "planetSimSpecializeButton");
  specButton.disabled = !state.specialized && state.count < 1;
  specButton.addEventListener("click", () => {
    state.specialized = !state.specialized;
    refresh();
  });
  specRow.append(specButton);

  card.append(specRow);

  const note = document.createElement("p");
  note.className = "planet-district-note";
  note.textContent = t(currentLang, "planetSimResourceSlotsNote");
  card.append(note);

  return card;
}

function renderCountControl(count, onDecrease, onIncrease) {
  const wrapper = document.createElement("div");
  wrapper.className = "planet-count-control";

  const decreaseBtn = document.createElement("button");
  decreaseBtn.type = "button";
  decreaseBtn.className = "planet-count-btn";
  decreaseBtn.textContent = "−";
  decreaseBtn.disabled = count <= 0;
  decreaseBtn.title = t(currentLang, "planetSimDistrictRemove");
  decreaseBtn.addEventListener("click", onDecrease);

  const countLabel = document.createElement("span");
  countLabel.className = "planet-count-value";
  countLabel.textContent = String(count);

  const increaseBtn = document.createElement("button");
  increaseBtn.type = "button";
  increaseBtn.className = "planet-count-btn";
  increaseBtn.textContent = "+";
  increaseBtn.title = t(currentLang, "planetSimDistrictAdd");
  increaseBtn.addEventListener("click", onIncrease);

  wrapper.append(decreaseBtn, countLabel, increaseBtn);
  return wrapper;
}

/* ── Paneles de resumen y producción ─────────────────────────────────── */

function renderSummary(totals) {
  if (!summaryEl) return;
  summaryEl.replaceChildren();

  const jobIds = Object.keys(totals.jobCapacities).filter((jobId) => totals.jobCapacities[jobId] > 0);

  if (summaryPopulationEl) {
    const totalPopulation = jobIds.reduce((sum, jobId) => sum + (jobAssignments[jobId] || 0), 0);
    summaryPopulationEl.textContent = t(currentLang, "planetSimPlanetPopulation")(formatAmount(totalPopulation));
  }

  if (!jobIds.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, "planetSimSummaryEmpty");
    summaryEl.append(empty);
    if (nonResourceEl) nonResourceEl.replaceChildren();
    return;
  }

  jobIds.forEach((jobId) => {
    summaryEl.append(renderJobSliderRow(jobId, totals.jobCapacities[jobId]));
  });

  const nonResourceEntries = Object.keys(JOB_EFFECT_NOTES).filter((jobId) => (jobAssignments[jobId] || 0) > 0);
  if (nonResourceEntries.length && nonResourceEl) {
    nonResourceEl.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "planet-nonresource-heading";
    heading.textContent = t(currentLang, "planetSimNonResourceHeading");
    nonResourceEl.append(heading);
    nonResourceEntries.forEach((jobId) => {
      const line = document.createElement("p");
      line.className = "planet-nonresource-line";
      line.textContent = `${formatAmount(jobAssignments[jobId])} ${jobName(jobId)} — ${t(currentLang, JOB_EFFECT_NOTES[jobId])}`;
      nonResourceEl.append(line);
    });
  } else if (nonResourceEl) {
    nonResourceEl.replaceChildren();
  }
}

function renderResourceRow(resourceId, amount, forceSign) {
  const row = document.createElement("div");
  row.className = `planet-resource-row ${amount < 0 ? "is-negative" : "is-positive"}`;
  row.append(resourceIcon(resourceId));
  const name = document.createElement("span");
  name.className = "planet-resource-name";
  name.textContent = resourceName(resourceId);
  row.append(name);
  const value = document.createElement("span");
  value.className = "planet-resource-value";
  value.textContent = formatAmount(amount, forceSign);
  row.append(value);
  return row;
}

/** Rellena un contenedor con las filas de recurso de `entries` (objeto recurso -> importe), ordenadas por magnitud. */
function renderResourceList(container, entries, forceSign, emptyKey) {
  if (!container) return;
  container.replaceChildren();

  const rows = Object.entries(entries).filter(([, amount]) => Math.abs(amount) > 0.001);
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "planet-summary-empty";
    empty.textContent = t(currentLang, emptyKey);
    container.append(empty);
    return;
  }

  rows
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .forEach(([resourceId, amount]) => {
      container.append(renderResourceRow(resourceId, amount, forceSign));
    });
}

function renderProduction(totals) {
  renderResourceList(producedEl, totals.producedTotals, false, "planetSimProducedEmpty");
  renderResourceList(consumedEl, totals.consumedTotals, false, "planetSimConsumedEmpty");
  renderResourceList(netEl, totals.resourceTotals, true, "planetSimProductionEmpty");
}

function renderSlots() {
  if (slotsLabel) {
    slotsLabel.textContent = t(currentLang, "planetSimSlotsLabel")(activeBuildingCount() + 1, totalSlots());
  }
  renderCapital();
  renderSlotsVisual();
}

function renderStats(totals) {
  if (statHousing) statHousing.textContent = formatAmount(totals.housing, true);
  if (statAmenities) statAmenities.textContent = formatAmount(totals.amenities, true);
}

function refresh() {
  resolveSelectedSlot();
  const totals = computeTotals();
  renderSlots();
  renderStats(totals);
  renderActiveTabContent();
  renderSummary(totals);
  renderProduction(totals);
}

function setLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  storeLang(currentLang);
  applyTranslations();
  refresh();
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

if (metaDescription && !metaDescription.dataset.i18nAttr) {
  metaDescription.setAttribute("content", t(currentLang, "planetSimMetaDescription"));
}

applyTranslations();
setActiveTab("buildings");
setMainTab("planet");
refresh();

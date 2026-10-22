/**
 * Registro de versiones de datos (P4) y procedencia de los datos del
 * simulador de planetas.
 *
 * ── Versión ─────────────────────────────────────────────────────────────
 * Por ahora solo existe un conjunto de datos: Stellaris PC 4.5.2 "Cygnus"
 * (decisión de Morteux: TODOS los datos se etiquetan como 4.5.2). El
 * selector de versión de la barra de resumen se alimenta de este registro,
 * así que añadir otra versión en el futuro es añadir una entrada aquí.
 *
 * ── Procedencia ─────────────────────────────────────────────────────────
 * Cada dato (edificio, empleo, ética, principio...) pertenece a una
 * "colección". En vez de repetir `rulesetId` + `source` + `verification` en
 * cientos de entradas de planet-data.js, empire-data.js, etc., la
 * procedencia se declara UNA vez por colección (DATA_COLLECTIONS) y
 * getProvenance(coleccion, idEntrada) la resuelve para cualquier entrada,
 * aplicando PROVENANCE_OVERRIDES si una entrada concreta se verifica (o se
 * marca como aproximada/no soportada) por separado. Así los archivos de
 * datos no se tocan y el estado de verificación vive en un único sitio.
 *
 * Estados de verificación (VERIFICATION):
 *  - unverified: transcrito de la wiki (páginas de 4.3/4.4), pendiente de
 *    la revisión final contra 4.5.2 (fase P13). Estado inicial de TODO.
 *  - wiki-verified: revisado contra la wiki de 4.5.2.
 *  - game-data-verified: revisado contra los archivos del juego.
 *  - approximated: valor aproximado/estimado, no exacto.
 *  - unsupported: mecánica reconocida pero no modelada.
 *
 * ── Guardado ────────────────────────────────────────────────────────────
 * stampRuleset() añade schemaVersion + rulesetId a cualquier objeto que se
 * vaya a guardar/exportar (planetas, imperios), y checkRuleset() valida lo
 * que se importa: una versión no soportada da un aviso, nunca se
 * reinterpreta en silencio. Aún no hay guardado de planetas (fase P6); estas
 * funciones son la base que usará.
 */

export const SCHEMA_VERSION = 1;

export const VERIFICATION = {
  UNVERIFIED: "unverified",
  WIKI_VERIFIED: "wiki-verified",
  GAME_DATA_VERIFIED: "game-data-verified",
  APPROXIMATED: "approximated",
  UNSUPPORTED: "unsupported"
};

/** Claves i18n del nombre de cada estado de verificación. */
export const VERIFICATION_I18N_KEYS = {
  [VERIFICATION.UNVERIFIED]: "verificationUnverified",
  [VERIFICATION.WIKI_VERIFIED]: "verificationWikiVerified",
  [VERIFICATION.GAME_DATA_VERIFIED]: "verificationGameDataVerified",
  [VERIFICATION.APPROXIMATED]: "verificationApproximated",
  [VERIFICATION.UNSUPPORTED]: "verificationUnsupported"
};

/** Registro de versiones: id -> { id, label, game, version, codename, isCurrent }. `label` es un nombre propio y no se traduce. */
export const DATA_VERSIONS = [
  {
    id: "stellaris-pc-4.5.2",
    label: "Stellaris PC 4.5.2 — Cygnus (Current Dataset)",
    game: "Stellaris",
    platform: "PC",
    version: "4.5.2",
    codename: "Cygnus",
    isCurrent: true
  }
];

export const CURRENT_RULESET_ID = DATA_VERSIONS.find((version) => version.isCurrent).id;

export function getDataVersion(id) {
  return DATA_VERSIONS.find((version) => version.id === id) || null;
}

export function isSupportedRuleset(id) {
  return getDataVersion(id) !== null;
}

const WIKI = "https://stellaris.paradoxwikis.com/";

/**
 * Colecciones de datos y su procedencia. `file`: dónde viven los datos.
 * `sources`: de dónde se transcribieron (páginas de la wiki; todas
 * `unverified` hasta la fase P13).
 */
export const DATA_COLLECTIONS = {
  buildings: {
    file: "js/planet-data.js",
    sources: ["Buildings", "Resource_buildings", "Industry_buildings", "Research_buildings", "Unity_buildings"].map((page) => WIKI + page),
    verification: VERIFICATION.UNVERIFIED
  },
  capitalBuildings: {
    file: "js/planet-data.js",
    sources: [WIKI + "Capital_building"],
    verification: VERIFICATION.UNVERIFIED
  },
  districts: {
    file: "js/planet-data.js",
    sources: [WIKI + "Districts", WIKI + "District_specialization"],
    verification: VERIFICATION.UNVERIFIED
  },
  jobs: {
    file: "js/planet-data.js",
    sources: [WIKI + "Jobs"],
    verification: VERIFICATION.UNVERIFIED
  },
  resources: {
    file: "js/planet-data.js",
    sources: [WIKI + "Resources"],
    verification: VERIFICATION.UNVERIFIED
  },
  designations: {
    file: "js/designation-data.js",
    sources: [WIKI + "Designation"],
    verification: VERIFICATION.UNVERIFIED
  },
  ethics: {
    file: "js/empire-data.js",
    sources: [WIKI + "Ethics"],
    verification: VERIFICATION.UNVERIFIED
  },
  authorities: {
    file: "js/empire-data.js",
    sources: [WIKI + "Government"],
    verification: VERIFICATION.UNVERIFIED
  },
  civicRules: {
    file: "js/civic-rules.js",
    sources: ["Civics", "Hive_mind_civics", "Machine_intelligence_civics", "Corporate_civics"].map((page) => WIKI + page),
    verification: VERIFICATION.UNVERIFIED
  },
  celestialTypes: {
    file: "js/celestial-data.js",
    // No hay una página de la wiki dedicada a tipos de planeta entre las aportadas: la lista sale de los iconos de la carpeta planets/ de la API de assets.
    sources: ["https://morteux.github.io/StellarisAssets/planets/"],
    verification: VERIFICATION.UNVERIFIED
  }
};

/** Correcciones por entrada: clave "coleccion:idEntrada" -> { verification?, sources? }. Vacío hasta que se verifique algo por separado. */
export const PROVENANCE_OVERRIDES = {};

/** Procedencia de una entrada concreta: { rulesetId, collection, file, sources, verification }. null si la colección no existe. */
export function getProvenance(collectionId, entryId) {
  const collection = DATA_COLLECTIONS[collectionId];
  if (!collection) return null;
  const override = (entryId != null && PROVENANCE_OVERRIDES[`${collectionId}:${entryId}`]) || {};
  return {
    rulesetId: CURRENT_RULESET_ID,
    collection: collectionId,
    file: collection.file,
    sources: override.sources || collection.sources,
    verification: override.verification || collection.verification
  };
}

/** Recuento de colecciones por estado de verificación (solo a nivel de colección; los overrides por entrada no se cuentan). */
export function verificationSummary() {
  const counts = {};
  Object.values(DATA_COLLECTIONS).forEach((collection) => {
    counts[collection.verification] = (counts[collection.verification] || 0) + 1;
  });
  return counts;
}

/** Añade schemaVersion y rulesetId a un objeto que se va a guardar o exportar (sin modificar el original). */
export function stampRuleset(data, rulesetId = CURRENT_RULESET_ID) {
  return { schemaVersion: SCHEMA_VERSION, rulesetId, ...data };
}

/**
 * Valida el rulesetId de un objeto importado.
 * status: "ok" (versión soportada) | "missing" (no trae versión) |
 * "unsupported" (versión desconocida). Quien importe debe avisar al usuario
 * en los dos últimos casos y nunca reinterpretar los datos en silencio.
 */
export function checkRuleset(data) {
  const rulesetId = data && typeof data === "object" ? data.rulesetId : undefined;
  if (!rulesetId) return { status: "missing", rulesetId: null };
  return { status: isSupportedRuleset(rulesetId) ? "ok" : "unsupported", rulesetId };
}

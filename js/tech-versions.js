/**
 * Data versions of the tech tree (TECH_TREE_GDD.md section 5, T3301).
 *
 * One entry per data file of `js/tech-data/` (one file per game version, never overwritten): the
 * page offers them in its version selector and loads only the chosen file (dynamic import). Adding
 * a version is adding its data file and one entry here (procedure: T3302); the newest one gets
 * `isCurrent` and is the default. `file` is relative to this module. `verification` is the
 * verification state of that data file (same values as js/data-version.js).
 *
 * The chosen version comes from the `?version=<id>` query of the page, then from the last choice
 * stored in the browser, then the current version; an unknown id falls back to the current one.
 */

export const TECH_VERSIONS = [
  {
    id: "stellaris-pc-4.5.4",
    label: "Stellaris PC 4.5.4",
    file: "./tech-data/stellaris-pc-4.5.4.js",
    // T1406: rebuilt from data/generated/stellaris-pc-4.5.4/ byte for byte; every technology
    // matches the extractor output (name, area, field, tier, cost, prerequisites, DLC, icon).
    verification: "game-data-verified",
  },
  {
    id: "stellaris-pc-4.6.0",
    label: "Stellaris PC 4.6.0",
    file: "./tech-data/stellaris-pc-4.6.0.js",
    // T2526: built from data/generated/stellaris-pc-4.6.0/ (683 technologies); not reviewed yet.
    verification: "unverified",
    isCurrent: true,
  },
];

export const VERSION_STORAGE_KEY = "techTreeVersion";

export function currentTechVersion() {
  return TECH_VERSIONS.find((version) => version.isCurrent) || TECH_VERSIONS[0];
}

export function getTechVersion(id) {
  return TECH_VERSIONS.find((version) => version.id === id) || null;
}

/**
 * Picks the version to show. Returns { version, unknownId }: `unknownId` is the requested id when
 * the query asked for a version that does not exist (the page says so), otherwise null. A stale
 * stored id is ignored silently.
 */
export function pickTechVersion(search, storedId) {
  const requested = new URLSearchParams(search || "").get("version");
  if (requested) {
    const version = getTechVersion(requested);
    if (version) return { version, unknownId: null };
    return { version: currentTechVersion(), unknownId: requested };
  }
  return { version: getTechVersion(storedId) || currentTechVersion(), unknownId: null };
}

/** Loads the data file of a version. Rejects if the file declares another rulesetId. */
export async function loadTechData(version) {
  const module = await import(new URL(version.file, import.meta.url).href);
  const data = module.TECH_DATA;
  if (!data || data.rulesetId !== version.id) {
    throw new Error(`Tech data file ${version.file} does not hold version ${version.id}`);
  }
  return data;
}

/** URL of the page showing `id` (keeps the path and the hash, sets or replaces ?version=). */
export function versionUrl(href, id) {
  const url = new URL(href);
  if (id === currentTechVersion().id) url.searchParams.delete("version");
  else url.searchParams.set("version", id);
  return url.href;
}

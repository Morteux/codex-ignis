/**
 * Simulator text helpers shared by the planet simulator (js/planet-sim-text.js), the Edicts tab
 * (js/edicts-ui.js) and the Sucursales tab (js/branch-offices-ui.js) (P23.9): signed numbers and
 * percentages, and resource and job names. Only depends on the i18n strings and the base data, so
 * any module can import it without pulling in the simulator.
 */

import { t } from "./i18n.js";
import { JOBS, RESOURCES } from "./planet-data.js";

/** "−" (U+2212) for negative values, "+" otherwise. */
export const sign = (value) => (value < 0 ? "−" : "+");
/** Signed number: +2, −0.5. */
export const num = (value) => `${sign(value)}${Math.abs(value)}`;
/** Signed percentage of a fraction, two decimals at most: 0.125 → +12.5%. */
export const pct = (fraction) => `${sign(fraction)}${Math.round(Math.abs(fraction) * 10000) / 100}%`;

const pascal = (id) => id.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("");

/** i18n key of a job built from its id ("job" + PascalCase id): swapped jobs (P13.8) and the branch office jobs of P19.3. */
export const swapJobI18nKey = (id) => `job${pascal(id)}`;

/** Resource name in `lang`; the id itself if it is not a resource. */
export function resourceName(lang, resourceId) {
  return RESOURCES[resourceId] ? t(lang, RESOURCES[resourceId].i18nKey) : resourceId;
}

/** Job name in `lang`: its JOBS entry, or the key built from its id for jobs the simulator does not model. */
export function jobName(lang, jobId) {
  return t(lang, JOBS[jobId] ? JOBS[jobId].i18nKey : swapJobI18nKey(jobId));
}

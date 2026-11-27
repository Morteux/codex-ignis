/**
 * Tech tree card: game icons of the concepts (ICONS.md, T2608) for the unlocked buildings and districts
 * (type icon and build time from the 4.5.4 game data) and the effect modifiers (build speed, upkeep,
 * production, housing, amenities, stability, crime, pop upkeep, job efficiency). The concept word stays
 * as the icon's tooltip and alt text.
 */

import { t } from "./i18n.js";
import { conceptIconUrl, resourceModifierIconUrl, MODIFIER_RESOURCE_KEYS } from "./concept-icons.js";
import { BUILDING_BUILD_TIMES, DISTRICT_BUILD_TIMES } from "./build-time-data.js";

/** Game building / district id → base build time in days (4.5.4 data of T2601); first value found wins. */
const GAME_BUILD_DAYS = (() => {
  const days = new Map();
  const add = (game, value) => { if (game && Number.isFinite(value) && !days.has(game)) days.set(game, value); };
  Object.values(BUILDING_BUILD_TIMES).forEach((entry) => ((entry && entry.steps) || []).forEach(([game, value]) => add(game, value)));
  const addDistrict = (entry) => {
    if (!entry) return;
    add(entry.game, entry.days);
    Object.values(entry.byAuthority || {}).forEach(addDistrict);
    (entry.sets || []).forEach(addDistrict);
  };
  Object.values(DISTRICT_BUILD_TIMES).forEach(addDistrict);
  return days;
})();

/** Base build time (days) of a game building or district, or null when the 4.5.4 data has none. */
export function gameBuildDays(gameId) {
  return GAME_BUILD_DAYS.has(gameId) ? GAME_BUILD_DAYS.get(gameId) : null;
}

const RESOURCE_KEYS = Object.values(MODIFIER_RESOURCE_KEYS).sort((a, b) => b.length - a.length);
const RESOURCE_PATTERN = new RegExp(`_(${RESOURCE_KEYS.join("|")})_(produces|upkeep)_(add|mult)$`);

/** i18n key of each concept / resource modifier kind (tooltip and alt of the effect icons). */
const WORD_KEYS = {
  buildSpeed: "techTreeIconBuildSpeed", housing: "techTreeIconHousing", amenities: "techTreeIconAmenities",
  stability: "techTreeIconStability", crime: "techTreeIconCrime", popUpkeep: "techTreeIconPopUpkeep", job: "techTreeIconJobEfficiency",
  produces_add: "techTreeIconProduction", produces_mult: "techTreeIconEfficiency", upkeep_add: "techTreeIconUpkeep", upkeep_mult: "techTreeIconUpkeepChange",
  building: "techTreeUnlockBuilding", district: "techTreeUnlockDistrict", buildTime: "techTreeIconBuildTime",
};

/**
 * Concept of an effect line ("planet_jobs_energy_produces_mult = 0.1"): { concept } or { resource, kind },
 * or null when the modifier has no concept icon (ship, army, leader, country modifiers…).
 */
export function effectConcept(line) {
  const key = String(line).split(/\s*=/)[0].trim();
  if (/^planet_\w*build_speed_mult$/.test(key)) return { concept: "buildSpeed" };
  if (/housing/.test(key)) return { concept: "housing" };
  if (/amenities/.test(key)) return { concept: "amenities" };
  if (/stability/.test(key)) return { concept: "stability" };
  if (/crime/.test(key)) return { concept: "crime" };
  if (/^pop_\w*upkeep|_pop_upkeep/.test(key)) return { concept: "popUpkeep" };
  const resource = key.match(RESOURCE_PATTERN);
  if (resource) return { resource: resource[1], kind: `${resource[2]}_${resource[3]}` };
  if (/^planet_\w+_produces_mult$|_workforce_mult$/.test(key)) return { concept: "job" };
  return null;
}

function iconImg(src, word, concept) {
  const img = document.createElement("img");
  img.className = "concept-icon tech-card-concept-icon";
  img.src = src;
  img.loading = "lazy";
  img.alt = word;
  img.title = word;
  img.dataset.concept = concept;
  return img;
}

/** Icon of an effect line (word as tooltip and alt), or null. */
export function effectIcon(line, lang) {
  const found = effectConcept(line);
  if (!found) return null;
  if (found.concept) return iconImg(conceptIconUrl(found.concept), t(lang, WORD_KEYS[found.concept]), found.concept);
  const src = resourceModifierIconUrl(found.resource, found.kind);
  return src ? iconImg(src, t(lang, WORD_KEYS[found.kind]), `${found.kind}:${found.resource}`) : null;
}

/** Building / district type icon of an unlock (word as tooltip and alt), or null for other unlock types. */
export function unlockTypeIcon(type, lang) {
  return type === "building" || type === "district" ? iconImg(conceptIconUrl(type), t(lang, WORD_KEYS[type]), type) : null;
}

/** Build time pill (clock icon + "360 d") of an unlocked building or district, or null when the data has none. */
export function buildTimePill(gameId, lang) {
  const days = gameBuildDays(gameId);
  if (days === null) return null;
  const word = `${t(lang, "techTreeIconBuildTime")}: ${t(lang, "techTreeDays").replace("{days}", days)}`;
  const pill = document.createElement("span");
  pill.className = "tech-card-build-time";
  pill.title = word;
  const img = iconImg(conceptIconUrl("buildTime"), word, "buildTime");
  img.removeAttribute("title");
  pill.append(img, t(lang, "techTreeDaysShort").replace("{days}", days));
  return pill;
}

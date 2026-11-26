/**
 * Game icons of the site's concepts (ICONS.md, T2602). Shared by the planet simulator, wiki, tech tree card,
 * Testellaris and bingo (T2605-T2609). Paths are relative to STELLARIS_ASSETS_BASE.
 * Rule: the icon replaces or precedes the word, the word stays as the icon's tooltip and accessible name.
 */

import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

const CONCEPT_PATHS = {
  housing: "text_icons/tooltip_housing.png",
  amenities: "text_icons/tooltip_amenities.png",
  amenitiesGestalt: "text_icons/tooltip_amenities_no_happiness.png",
  stability: "text_icons/tooltip_stability.png",
  crime: "text_icons/tooltip_crime.png",
  happiness: "text_icons/tooltip_happiness.png",
  pop: "text_icons/icon_text_pop.png",
  popUpkeep: "text_icons/pop_modifier.png",
  job: "text_icons/tooltip_job.png",
  unemployed: "text_icons/unemployed.png",
  buildTime: "text_icons/time.png",
  buildSpeed: "modifiers/mod_planet_building_build_speed_mult.png",
  upgrade: "text_icons/tooltip_upgrade.png",
  district: "text_icons/tooltip_district.png",
  zone: "text_icons/tooltip_zone.png",
  building: "text_icons/tooltip_building.png",
  tradeValue: "text_icons/trade_value.png",
  empireModifier: "text_icons/empire_modifier.png",
  civilian: "pop_categories/pop_cat_civilian.png",
  civilianGestalt: "pop_categories/pop_cat_maintenance_drone.png",
  ruler: "pop_categories/pop_cat_ruler.png",
  specialist: "pop_categories/pop_cat_specialist.png",
  worker: "pop_categories/pop_cat_worker.png",
  complexDrone: "pop_categories/pop_cat_complex_drone.png",
  simpleDrone: "pop_categories/pop_cat_simple_drone.png",
  slave: "pop_categories/pop_cat_slave.png",
  bioTrophy: "pop_categories/pop_cat_bio_trophy.png"
};

/** Gestalt empires have no happiness: amenities and civilians use their gestalt sprites. */
const GESTALT_VARIANTS = { amenities: "amenitiesGestalt", civilian: "civilianGestalt" };

/** Stratum (simulator JOB_STRATA id) → concept; gestalt rulers and specialists are complex drones, workers simple drones. */
const STRATUM_CONCEPTS = { ruler: "ruler", specialist: "specialist", worker: "worker", special: "civilian" };
const GESTALT_STRATUM_CONCEPTS = { ruler: "complexDrone", specialist: "complexDrone", worker: "simpleDrone", special: "civilianGestalt" };

export function conceptIconPath(concept, { gestalt = false } = {}) {
  const key = gestalt && GESTALT_VARIANTS[concept] ? GESTALT_VARIANTS[concept] : concept;
  return CONCEPT_PATHS[key] || null;
}

export function conceptIconUrl(concept, options) {
  const path = conceptIconPath(concept, options);
  return path ? `${STELLARIS_ASSETS_BASE}${path}` : null;
}

/** Game resource key of the modifier icons (StellarisAssets modifiers/mod_<key>_<suffix>.png) for each simulator resource id. */
export const MODIFIER_RESOURCE_KEYS = {
  energy: "energy", minerals: "minerals", food: "food", alloys: "alloys", consumer_goods: "consumer_goods", unity: "unity",
  physics: "physics_research", society: "society_research", engineering: "engineering_research", trade: "trade", influence: "influence",
  volatile_motes: "volatile_motes", rare_crystals: "rare_crystals", exotic_gases: "exotic_gases", minor_artifacts: "minor_artifacts",
  astral_threads: "astral_threads", advanced_logic: "advanced_logic", nanites: "nanites", zro: "sr_zro", biomass: "biomass"
};

/**
 * StellarisAssets path of the modifier icon of a resource (simulator id or game key); kind: upkeep_add, upkeep_mult,
 * produces_add, produces_mult. Amenities use the planet amenities modifier; null for an unknown resource.
 */
export function resourceModifierIconPath(resource, kind) {
  if (resource === "amenities") return `modifiers/mod_planet_amenities_${kind.endsWith("mult") ? "mult" : "add"}.png`;
  const key = MODIFIER_RESOURCE_KEYS[resource] || (Object.values(MODIFIER_RESOURCE_KEYS).includes(resource) ? resource : null);
  return key ? `modifiers/mod_${key}_${kind}.png` : null;
}

export function resourceModifierIconUrl(resource, kind) {
  const path = resourceModifierIconPath(resource, kind);
  return path ? `${STELLARIS_ASSETS_BASE}${path}` : null;
}

export function stratumConcept(stratum, { gestalt = false } = {}) {
  return (gestalt ? GESTALT_STRATUM_CONCEPTS : STRATUM_CONCEPTS)[stratum] || null;
}

/**
 * <img> of a concept. `label` is the word the icon stands for: it becomes the tooltip and, unless `decorative`
 * (the word is also visible next to the icon), the alt text.
 */
export function conceptIcon(concept, { label = "", gestalt = false, decorative = false, className = "concept-icon" } = {}) {
  const url = conceptIconUrl(concept, { gestalt });
  if (!url) return null;
  const img = document.createElement("img");
  img.className = className;
  img.src = url;
  img.loading = "lazy";
  img.alt = decorative ? "" : label;
  if (label) img.title = label;
  img.dataset.concept = gestalt && GESTALT_VARIANTS[concept] ? GESTALT_VARIANTS[concept] : concept;
  return img;
}

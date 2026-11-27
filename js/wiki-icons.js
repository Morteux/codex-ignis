/**
 * Wiki: game icons of the concepts (ICONS.md, T2607) inside article texts.
 *
 * Syntax in js/content.js texts: `[[icon:<concept>]]`, `[[icon:<kind>:<resource>]]` or either with `|<label>`:
 *   [[icon:housing]] · [[icon:stability|Estabilidad]] · [[icon:upkeep:energy]] · [[icon:production:minerals|+2 minerales]]
 * `[[icon+:…]]` shows the icon next to its word (the icon is then decorative: empty alt, word as tooltip);
 * without `+` the icon stands instead of the word.
 * Concepts are the ones of js/concept-icons.js (housing, amenities, amenitiesGestalt, stability, crime, happiness, pop,
 * popUpkeep, job, unemployed, buildTime, buildSpeed, upgrade, district, zone, building, tradeValue, empireModifier and
 * the strata ruler, specialist, worker, complexDrone, simpleDrone, civilian, slave, bioTrophy). Resource kinds: upkeep,
 * production (flat bonus), efficiency (% of output), upkeepChange, with a simulator resource id (energy, minerals,
 * physics…) or game key. The label (default: the translated concept word) is the icon's tooltip and alt text, so
 * hover and screen readers keep the word. An unknown concept or resource is left as plain label text.
 */

import { t } from "./i18n.js";
import { conceptIconUrl, resourceModifierIconUrl } from "./concept-icons.js";

const TOKEN = /\[\[icon(\+)?:([A-Za-z]+)(?::([a-z_]+))?(?:\|([^\]]+))?\]\]/g;

const RESOURCE_KINDS = { upkeep: "upkeep_add", production: "produces_add", efficiency: "produces_mult", upkeepChange: "upkeep_mult" };

const LABEL_KEYS = {
  upkeep: "wikiIconUpkeep", production: "wikiIconProduction", efficiency: "wikiIconEfficiency", upkeepChange: "wikiIconUpkeepChange",
  housing: "wikiIconHousing", amenities: "wikiIconAmenities", amenitiesGestalt: "wikiIconAmenities", stability: "wikiIconStability",
  crime: "wikiIconCrime", happiness: "wikiIconHappiness", pop: "wikiIconPop", popUpkeep: "wikiIconPopUpkeep", job: "wikiIconJob",
  unemployed: "wikiIconUnemployed", buildTime: "wikiIconBuildTime", buildSpeed: "wikiIconBuildSpeed", upgrade: "wikiIconUpgrade",
  district: "wikiIconDistrict", zone: "wikiIconZone", building: "wikiIconBuilding", tradeValue: "wikiIconTradeValue",
  empireModifier: "wikiIconEmpireModifier", ruler: "wikiIconRuler", specialist: "wikiIconSpecialist", worker: "wikiIconWorker",
  complexDrone: "wikiIconComplexDrone", simpleDrone: "wikiIconSimpleDrone", civilian: "wikiIconCivilian", slave: "wikiIconSlave",
  bioTrophy: "wikiIconBioTrophy"
};

const escapeAttr = (text) => String(text).replace(/&(?!#?\w+;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tokenParts(lang, concept, resource, label) {
  const src = resource ? (RESOURCE_KINDS[concept] ? resourceModifierIconUrl(resource, RESOURCE_KINDS[concept]) : null) : conceptIconUrl(concept);
  const word = label || (LABEL_KEYS[concept] ? t(lang, LABEL_KEYS[concept]) : concept);
  return { src, word };
}

/** Icon tokens of an already escaped HTML text → <img> with the word as alt and title (plain word if unknown). */
export function formatWikiIcons(html, lang) {
  return html.replace(TOKEN, (match, withWord, concept, resource, label) => {
    const { src, word } = tokenParts(lang, concept, resource, label);
    if (!src) return word;
    const alt = withWord ? "" : escapeAttr(word);
    const img = `<img class="wiki-concept-icon" src="${src}" alt="${alt}" title="${escapeAttr(word)}" data-concept="${concept}${resource ? `:${resource}` : ""}" loading="lazy" />`;
    return withWord ? `${img}${word}` : img;
  });
}

/** Icon tokens → their words, for the search text of an entry. */
export function wikiIconText(text, lang) {
  return String(text || "").replace(TOKEN, (match, withWord, concept, resource, label) => tokenParts(lang, concept, resource, label).word);
}

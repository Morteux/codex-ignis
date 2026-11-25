/**
 * Official names of the tech tree in the current language (P15, LOCALISATION_PLAN.md §3).
 *
 * The data files (js/tech-data/<rulesetId>.js) hold the English names. localizeTechData() puts
 * the official name of the language on every technology, variant, field and unlock (from
 * js/game-names/<lang>.js, loaded by page-shell.js on pages marked <html data-game-names>) and
 * keeps the English one in `nameEn` for the search; a name not loaded stays English.
 */
import { gameName, htmlLangCode } from "./i18n.js";

let areaLang = "en";

function pick(item, lang, group, id) {
  if (item.nameEn === undefined) item.nameEn = item.name;
  item.name = gameName(lang, group, id) ?? item.nameEn;
}

/** Puts the names of `lang` on `data` (in place) and returns it. */
export function localizeTechData(data, lang) {
  areaLang = lang;
  data.fields.forEach((field) => pick(field, lang, "techFields", field.id));
  data.technologies.forEach((tech) => {
    pick(tech, lang, "technologies", tech.id);
    (tech.variants || []).forEach((variant) => pick(variant, lang, "technologies", variant.id));
    (tech.unlocks || []).forEach((unlock) => pick(unlock, lang, "unlocks", unlock.type + "/" + unlock.id));
  });
  return data;
}

/** Name of a research area ("physics") in the language of the last localizeTechData(). */
export function areaName(area) {
  return gameName(areaLang, "techAreas", area) ?? area.charAt(0).toUpperCase() + area.slice(1);
}

/** Compares two names in the collation of `lang`. */
export function byLocalName(lang) {
  const locale = htmlLangCode(lang);
  return (a, b) => a.localeCompare(b, locale);
}

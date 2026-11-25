/**
 * Official game names (P15, LOCALISATION_PLAN.md §3).
 *
 * Loads the generated js/game-names/<lang>.js of the current language (written by
 * tools/extract/build_game_names.py from the extractor localisation) on top of the
 * hand-written texts before the page first draws; on a language change, page-shell.js
 * draws at once and again when the new module arrives. page-shell.js imports it on the
 * pages marked <html data-game-names>; if a module cannot be loaded, the hand-written
 * names stay.
 */

import { addGameNames, addLanguageLoader, detectInitialLang } from "./i18n.js";

const loaded = new Set();
const loading = new Map();

/** null if the language is loaded, else the promise of its load. */
export function loadGameNames(lang) {
    if (loaded.has(lang)) return null;
    if (!loading.has(lang)) {
        loading.set(lang, import(`./game-names/${lang}.js`)
            .then((module) => {
                addGameNames(lang, module.names);
                loaded.add(lang);
            })
            .catch((error) => console.warn(`Official game names (${lang}) not loaded; the hand-written names are shown.`, error))
            .finally(() => loading.delete(lang)));
    }
    return loading.get(lang);
}

addLanguageLoader(loadGameNames);
await loadGameNames(detectInitialLang());

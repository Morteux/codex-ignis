/**
 * Interface texts of the game languages the site is not written in (T1505,
 * LOCALISATION_PLAN.md §5).
 *
 * js/ui-texts/<lang>.js holds, by i18n key, the translations of the texts of the
 * planet simulator and the tech tree (js/i18n-common.js, -simulator.js,
 * -tech-tree.js) for pt, fr, de, ko, pl, ru and zh. Only the current language is
 * downloaded, before the page first draws; page-shell.js imports this module
 * together with js/game-names.js and draws again when a language change has
 * loaded its module. A missing key, or a module that cannot be loaded, shows the
 * English text. es, en and jp stay in the area files.
 */

import { addStrings, addLanguageLoader, detectInitialLang, GAME_LANGS, SITE_LANGS } from "./i18n.js";

const loaded = new Set();
const loading = new Map();

/** null if the language needs no module or is loaded, else the promise of its load. */
export function loadUiTexts(lang) {
    if (SITE_LANGS.includes(lang) || !GAME_LANGS.includes(lang) || loaded.has(lang)) return null;
    if (!loading.has(lang)) {
        loading.set(lang, import(`./ui-texts/${lang}.js`)
            .then(({ strings }) => {
                addStrings({ [lang]: strings });
                loaded.add(lang);
            })
            .catch((error) => console.warn(`Interface texts (${lang}) not loaded; the English ones are shown.`, error))
            .finally(() => loading.delete(lang)));
    }
    return loading.get(lang);
}

addLanguageLoader(loadUiTexts);
await loadUiTexts(detectInitialLang());

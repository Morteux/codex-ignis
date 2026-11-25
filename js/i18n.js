/**
 * Interface texts and language utilities.
 *
 * The texts are split by area (P23.4) so every page loads only what it uses:
 * js/i18n-common.js is always loaded, and each page script imports the areas it
 * needs (js/i18n-wiki.js, -bingo.js, -empire-names.js, -simulator.js,
 * -tech-tree.js, -legal.js), which register their texts with addStrings().
 * Every area file has the same keys in es, en and jp (tests/i18n-audit.mjs).
 *
 * Languages (P15, LOCALISATION_PLAN.md §4): the site is written in es, en and jp
 * (SITE_LANGS). The planet simulator and the tech tree also offer the other
 * official game languages (GAME_LANGS): their game names are official
 * (js/game-names.js) and their interface texts are English until translated
 * (T1505). A page offers the languages of its own selector (pageLangs()).
 *
 * To translate the interface into a game language: add its block (e.g. "fr") to
 * every area file the simulator and the tech tree load. Article translations live
 * in content.js, inside `i18n`.
 */

import { strings as commonStrings } from "./i18n-common.js";

/** Languages the whole site is written in. */
export const SITE_LANGS = ["es", "en", "jp"];
/** Every official Stellaris language, with the site's code (game folder in tools/extract/build_game_names.py). */
export const GAME_LANGS = ["es", "en", "jp", "pt", "fr", "de", "ko", "pl", "ru", "zh"];
export const SUPPORTED_LANGS = GAME_LANGS;
export const DEFAULT_LANG = "es";
/** Interface texts missing in a language fall back to English, then to the default language. */
const FALLBACK_LANG = "en";
const STORAGE_KEY = "codex-ignis-lang";

/** Texts of the areas loaded by the page: the common ones, plus each js/i18n-<area>.js the page imports. */
const strings = Object.fromEntries(SUPPORTED_LANGS.map((lang) => [lang, { ...commonStrings[lang] }]));

/** Called by every js/i18n-<area>.js when it is imported. */
export function addStrings(area) {
    for (const lang of SUPPORTED_LANGS) Object.assign(strings[lang], area[lang]);
}

/** Languages the current page offers: its language buttons and the options of its language selector. */
let offered = null;
export function pageLangs() {
    if (offered) return offered;
    if (typeof document === "undefined") return SITE_LANGS;
    const codes = [...document.querySelectorAll(".lang-btn[data-lang], .lang-select option[value]")]
        .map((el) => el.dataset.lang || el.value)
        .filter((code) => code && SUPPORTED_LANGS.includes(code));
    offered = codes.length ? [...new Set(codes)] : SITE_LANGS;
    return offered;
}

function getStoredLang() {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
    } catch (error) {
        // localStorage no disponible (modo privado, etc.): se ignora.
    }
    return null;
}

export function storeLang(lang) {
    try {
        window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
        // Ignorar si no se puede persistir.
    }
}

/** Browser language → site code ("ja" → "jp", "pt-BR" → "pt", "zh-CN" → "zh"). */
function browserLang() {
    const code = ((typeof navigator !== "undefined" && navigator.language) || "").slice(0, 2).toLowerCase();
    return code === "ja" ? "jp" : code;
}

/**
 * Language of the page: the stored choice, else the browser language, if the page
 * offers it. A game language the page does not offer gives English; anything else
 * the default language. The stored choice is kept for the pages that offer it.
 */
export function detectInitialLang(available = pageLangs()) {
    for (const lang of [getStoredLang(), browserLang()]) {
        if (!lang) continue;
        if (available.includes(lang)) return lang;
        if (GAME_LANGS.includes(lang)) return available.includes(FALLBACK_LANG) ? FALLBACK_LANG : DEFAULT_LANG;
    }
    return DEFAULT_LANG;
}

/** BCP 47 tag for <html lang>: the site's codes "jp", "pt" and "zh" are "ja", "pt-BR" and "zh-Hans". */
const HTML_LANGS = { jp: "ja", pt: "pt-BR", zh: "zh-Hans" };
export function htmlLangCode(lang) {
    return HTML_LANGS[lang] || lang;
}

const OG_LOCALES = { es: "es_ES", en: "en_US", jp: "ja_JP", pt: "pt_BR", fr: "fr_FR", de: "de_DE", ko: "ko_KR", pl: "pl_PL", ru: "ru_RU", zh: "zh_CN" };

/**
 * Keeps the Open Graph tags in step with the page: og:title follows <title>,
 * og:description follows the meta description and og:locale the language.
 * Call it after the title and the description have been translated.
 */
export function syncSocialMeta(lang) {
    const set = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.setAttribute("content", value);
    };
    set('meta[property="og:title"]', document.title);
    set('meta[property="og:description"]', document.querySelector('meta[name="description"]')?.getAttribute("content"));
    set('meta[property="og:locale"]', OG_LOCALES[lang] || OG_LOCALES[DEFAULT_LANG]);
}

/**
 * Official game names (P15, LOCALISATION_PLAN.md): js/game-names.js adds the
 * generated js/game-names/<lang>.js on top of the hand-written texts, which stay
 * as the fallback. Kept apart so an area imported later does not overwrite them.
 * `names` are i18n keys (t()); the other groups (technologies, techAreas,
 * techFields, unlocks) are read by id with gameName().
 */
const gameNames = {};
export function addGameNames(lang, groups) {
    gameNames[lang] = gameNames[lang] || {};
    for (const [group, names] of Object.entries(groups)) gameNames[lang][group] = { ...gameNames[lang][group], ...names };
}

/** Official name of a game item of `group` in `lang`, or undefined if it is not loaded. */
export function gameName(lang, group, id) {
    return gameNames[lang]?.[group]?.[id];
}

/** Loaders of the extra texts of a language: each returns null if already loaded, else a promise (js/game-names.js registers one). */
const languageLoaders = [];
export function addLanguageLoader(loader) {
    languageLoaders.push(loader);
}
/** null when every loader already has the language, else a promise of the loads. */
export function loadLanguage(lang) {
    const pending = languageLoaders.map((loader) => loader(lang)).filter(Boolean);
    return pending.length ? Promise.all(pending) : null;
}

export function t(lang, key) {
    const official = gameNames[lang]?.names?.[key];
    if (official !== undefined) return official;
    return strings[lang]?.[key] ?? strings[FALLBACK_LANG][key] ?? strings[DEFAULT_LANG][key];
}

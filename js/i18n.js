/**
 * Interface texts and language utilities.
 *
 * The texts are split by area (P23.4) so every page loads only what it uses:
 * js/i18n-common.js is always loaded, and each page script imports the areas it
 * needs (js/i18n-wiki.js, -bingo.js, -empire-names.js, -simulator.js,
 * -tech-tree.js, -legal.js), which register their texts with addStrings().
 * Every area file has the same keys in es, en and jp (tests/i18n-audit.mjs).
 *
 * To add a language: copy the "en" block of every area file, translate it and
 * add its code (e.g. "fr") to SUPPORTED_LANGS. Article translations live in
 * content.js, inside `i18n`.
 */

import { strings as commonStrings } from "./i18n-common.js";

export const SUPPORTED_LANGS = ["es", "en", "jp"];
export const DEFAULT_LANG = "es";
const STORAGE_KEY = "codex-ignis-lang";

/** Texts of the areas loaded by the page: the common ones, plus each js/i18n-<area>.js the page imports. */
const strings = { es: { ...commonStrings.es }, en: { ...commonStrings.en }, jp: { ...commonStrings.jp } };

/** Called by every js/i18n-<area>.js when it is imported. */
export function addStrings(area) {
    for (const lang of SUPPORTED_LANGS) Object.assign(strings[lang], area[lang]);
}

export function getStoredLang() {
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

export function detectInitialLang() {
    const stored = getStoredLang();
    if (stored) return stored;
    let browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
    if (browserLang === "ja") browserLang = "jp"; // the site's code for Japanese
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
}

/** BCP 47 tag for <html lang>: the site calls Japanese "jp", but its language tag is "ja". */
export function htmlLangCode(lang) {
    return lang === "jp" ? "ja" : lang;
}

const OG_LOCALES = { es: "es_ES", en: "en_US", jp: "ja_JP" };

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

export function t(lang, key) {
    const dict = strings[lang] || strings[DEFAULT_LANG];
    return dict[key] ?? strings[DEFAULT_LANG][key];
}

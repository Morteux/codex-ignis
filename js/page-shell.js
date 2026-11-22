/**
 * Shared page shell: language selector and translation of the static markup.
 *
 * Every page imports this module (directly or through its own page script).
 * The header, language buttons and footer stay as static HTML, so they show
 * before any script runs; this module only drives them:
 * - keeps the current language (stored choice, then the browser language),
 * - fills `data-i18n` (inner HTML) and `data-i18n-attr` ("attr:key", several
 *   pairs separated by ";") from js/i18n.js, plus <html lang> and Open Graph,
 * - marks the pressed `.lang-btn` and listens to its clicks once per page.
 *
 * Page scripts read the language with getLang() and redraw their dynamic
 * parts in onLanguageChange(); listeners run in the order they subscribed,
 * after the static markup has been translated.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t, htmlLangCode, syncSocialMeta } from "./i18n.js";

let currentLang = detectInitialLang();
const listeners = [];

export function getLang() {
  return currentLang;
}

/** Translates the static markup of the page into the current language. */
export function applyPageTranslations() {
  document.documentElement.lang = htmlLangCode(currentLang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(currentLang, el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":");
      el.setAttribute(attr, t(currentLang, key));
    });
  });

  syncSocialMeta(currentLang);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

/** Runs `callback(lang)` every time the user picks another language. */
export function onLanguageChange(callback) {
  listeners.push(callback);
}

export function setLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  storeLang(currentLang);
  applyPageTranslations();
  listeners.forEach((callback) => callback(currentLang));
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

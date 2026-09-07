/**
 * Script de traducción para páginas simples (privacy.html, cookies.html, 404.html).
 *
 * Funciona leyendo atributos `data-i18n` (contenido interno, admite HTML) y
 * `data-i18n-attr` (formato "atributo:clave", para cosas como el meta
 * description) directamente del HTML, y rellenándolos con el diccionario de
 * js/i18n.js. Así estas páginas no necesitan lógica propia de traducción.
 */

import { SUPPORTED_LANGS, DEFAULT_LANG, detectInitialLang, storeLang, t } from "./i18n.js";

const langButtons = document.querySelectorAll(".lang-btn");
let currentLang = detectInitialLang();

function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(currentLang, el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(":");
    el.setAttribute(attr, t(currentLang, key));
  });

  langButtons.forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === currentLang));
  });
}

function setLanguage(lang) {
  currentLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  storeLang(currentLang);
  applyTranslations();
}

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

applyTranslations();

/**
 * Page script for the simple pages (privacy.html, cookies.html, 404.html, tech-tree.html).
 *
 * They only have static markup with `data-i18n` / `data-i18n-attr`, so the
 * shared page shell (js/page-shell.js) does all the work.
 */

import { applyPageTranslations } from "./page-shell.js";

applyPageTranslations();

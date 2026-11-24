/**
 * Page script of the tech tree (tech-tree.html, TECH_TREE_GDD.md section 6).
 *
 * The static markup (shell, area panels, credits, footer) is translated by the shared page shell
 * (js/page-shell.js). This script adds the dynamic parts: the data version line and the area tabs
 * (three areas side by side on desktop, one at a time behind tabs on mobile).
 */

import { applyPageTranslations, getLang, onLanguageChange } from "./page-shell.js";
import { t } from "./i18n.js";
import { DATA_COLLECTIONS } from "./data-version.js";
import { TECH_DATA } from "./tech-data/stellaris-pc-4.5.4.js";
import "./i18n-tech-tree.js";

const COLLECTION = DATA_COLLECTIONS.technologies;
const VERIFICATION_KEYS = {
  unverified: "techTreeVerificationUnverified",
  "wiki-verified": "techTreeVerificationWikiVerified",
  "game-data-verified": "techTreeVerificationGameDataVerified",
};

/** "Data version: stellaris-pc-4.5.4 · Cygnus v4.5.4 (1b4f) · unverified (…)" */
function renderDataVersion(lang) {
  const el = document.getElementById("tech-data-version");
  const status = VERIFICATION_KEYS[COLLECTION.verification] || VERIFICATION_KEYS.unverified;
  el.textContent = t(lang, "techTreeDataVersion")
    .replace("{label}", TECH_DATA.rulesetId)
    .replace("{game}", TECH_DATA.gameVersion)
    .replace("{status}", t(lang, status));
  el.dataset.rulesetId = TECH_DATA.rulesetId;
  el.dataset.verification = COLLECTION.verification;
}

/** Area tabs (visible on mobile only): one active panel, arrow keys move between tabs. */
function setupAreaTabs() {
  const tabs = [...document.querySelectorAll(".tech-area-tab")];
  const select = (tab, focus = false) => {
    tabs.forEach((other) => {
      const on = other === tab;
      other.setAttribute("aria-selected", String(on));
      other.tabIndex = on ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).classList.toggle("is-active", on);
    });
    if (focus) tab.focus();
    document.dispatchEvent(new CustomEvent("tech-area-change", { detail: tab.dataset.area }));
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        select(tabs[event.key === "Home" ? 0 : tabs.length - 1], true);
      } else if (step) {
        event.preventDefault();
        select(tabs[(index + step + tabs.length) % tabs.length], true);
      }
    });
  });
}

applyPageTranslations();
setupAreaTabs();
renderDataVersion(getLang());
onLanguageChange(renderDataVersion);

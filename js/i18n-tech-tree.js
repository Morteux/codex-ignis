/**
 * Interface texts of the tech tree (tech-tree.html), es/en/jp.
 * Imported by the page scripts that need it; importing it registers the texts in js/i18n.js.
 */

import { addStrings } from "./i18n.js";

export const strings = {
    es: {
        techTreePageTitle: "Tech Tree · Codex Ignis",
        techTreeMetaDescription: "Árbol de tecnología de Stellaris.",
        techTreeHeading: "Tech Tree",
        techTreeComingSoon: "En construcción: el árbol de tecnología interactivo llegará pronto.",
    },
    en: {
        techTreePageTitle: "Tech Tree · Codex Ignis",
        techTreeMetaDescription: "Stellaris technology tree.",
        techTreeHeading: "Tech Tree",
        techTreeComingSoon: "Under construction: the interactive technology tree is coming soon.",
    },
    jp: {
        techTreePageTitle: "Tech Tree · Codex Ignis",
        techTreeMetaDescription: "Stellarisの技術ツリー。",
        techTreeHeading: "Tech Tree",
        techTreeComingSoon: "準備中：インタラクティブな技術ツリーは近日公開予定です。",
    },
};

addStrings(strings);

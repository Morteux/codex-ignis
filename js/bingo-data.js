/**
 * Data of every bingo of bingo.html (P24.1).
 *
 * BINGOS lists the bingos in the order of the selector. Each bingo is:
 *   {
 *     id: "origins",                 // value of the selector, key of the marks
 *     titleKey, descriptionKey,      // i18n keys of its name and its one-line description
 *     fileSlug: "origenes",          // name of the PNG download: bingo-<fileSlug>-stellaris.png
 *     iconSize: 110,                 // minimum cell width on screen, in px (80% of it on mobile)
 *     showNames: true,               // name always visible under the icon (otherwise tooltip only)
 *     layout: { type, ... },         // see below
 *     items: [...]                   // the cells
 *   }
 *
 * Layouts:
 *   { type: "grid", columns: 9 }     items in array order; the screen fills as many columns as fit
 *                                    and the PNG uses `columns` (default layout)
 *   { type: "ordered", order: [...], columns: 9 }
 *                                    like "grid", but the cells follow the explicit list of i18n
 *                                    keys of `order` (as in the game); items not listed go last
 *   { type: "shape", rows, columns, cells: { i18nKey: [row, col] } }
 *                                    every cell at a fixed position (1-based), on screen and in the
 *                                    PNG; items without a position are not shown
 *
 * Each item: { img, i18nKey, tags?, dlc? }
 * - img: path inside the StellarisAssets API, relative to STELLARIS_ASSETS_BASE
 *   (js/asset-config.js), or null when there is no icon yet: the cell keeps a fixed-size empty slot.
 *   The images are always served from the API, never locally.
 * - i18nKey: text key of the name, with the same key in es/en/jp (js/i18n*.js); it is also the
 *   identity of the cell inside its bingo.
 * - tags: optional list of free labels (e.g. "hive", "fanatic"), written on the card as data-tags.
 * - dlc: optional DLC id the item needs; null or missing = base game.
 */

import { ORIGIN_BINGO, PRINCIPLE_BINGO } from "./bingo-items.js";

/** Tags of a civic from its icon name: the gestalt and corporate variants share the base name. */
function civicTags(img) {
  const match = /^civics\/Civic_(corporate|hive|machine|individual_machine)_/.exec(img) || /_corporate\.png$/.exec(img);
  if (!match) return [];
  return [match[1] === undefined ? "corporate" : match[1].replace("individual_machine", "machine")];
}

export const BINGOS = [
  {
    id: "origins",
    titleKey: "bingoTypeOrigins",
    descriptionKey: "bingoOriginsDescription",
    fileSlug: "origenes",
    iconSize: 110,
    showNames: true,
    layout: { type: "ordered", order: ORIGIN_BINGO.map((item) => item.i18nKey), columns: 9 },
    items: ORIGIN_BINGO
  },
  {
    id: "principles",
    titleKey: "bingoTypePrinciples",
    descriptionKey: "bingoPrinciplesDescription",
    fileSlug: "principios",
    iconSize: 58,
    showNames: false,
    layout: { type: "grid", columns: 9 },
    items: PRINCIPLE_BINGO.map((item) => ({ ...item, tags: civicTags(item.img) }))
  }
];

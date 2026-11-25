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
 *                                    like "grid", but the cells follow the explicit list of item
 *                                    ids of `order` (as in the game); items not listed go last
 *   { type: "shape", rows, columns, cells: { itemId: [row, col] } }
 *                                    every cell at a fixed position (1-based), on screen and in the
 *                                    PNG; items without a position are not shown
 *
 * Each item: { img, i18nKey, id?, variantKey?, tags?, dlc? }
 * - img: path inside the StellarisAssets API, relative to STELLARIS_ASSETS_BASE
 *   (js/asset-config.js), or null when there is no icon yet: the cell keeps a fixed-size empty slot.
 *   The images are always served from the API, never locally.
 * - i18nKey: text key of the name, with the same key in es/en/jp (js/i18n*.js).
 * - id: identity of the cell inside its bingo (marks, `order`, `cells`); defaults to i18nKey.
 *   Needed when the identity must not depend on the name (e.g. two cells with the same name).
 * - detailKey: optional text key shown after the name, after a dash, to tell apart cells that share
 *   their game name ("Dictatorial Alignment – Commander (Dictatorial)").
 * - variantKey: optional text key shown after the name, in brackets ("Democratic Surrogacy (Democratic)").
 * - tags: optional list of free labels (e.g. "hive", "fanatic"), written on the card as data-tags.
 * - dlc: optional DLC id the item needs; null or missing = base game.
 * - origin: game id of an origin cell (origins bingo only), used for the in-game order.
 * - frame: optional colour of the cell border, on screen and in the PNG: "rare" (purple) or
 *   "dangerous" (red), as in the tech tree.
 */

import { ORIGIN_BINGO, PRINCIPLE_BINGO } from "./bingo-items.js";
import { ETHIC_WHEEL, ETHIC_ICONS } from "./ethic-wheel.js";
import { ORIGIN_GAME_ORDER } from "./bingo-origin-order.js";
import { TECH_BINGO } from "./bingo-game-items.js";

/**
 * Origins (P24.2): cell ids in the in-game order, from the game id (`origin`) of each item and
 * js/bingo-origin-order.js (generated from the extractor's origins.json, T2402). An origin missing
 * from the game order goes last.
 */
const originRank = (item) => {
  const index = ORIGIN_GAME_ORDER.indexOf(item.origin);
  return index < 0 ? Infinity : index;
};
const ORIGIN_ORDER = [...ORIGIN_BINGO].sort((a, b) => originRank(a) - originRank(b)).map((item) => item.i18nKey);

/** Tags of a civic from its icon name: the gestalt and corporate variants share the base name. */
function civicTags(img) {
  const match = /^civics\/Civic_(corporate|hive|machine|individual_machine)_/.exec(img) || /_corporate\.png$/.exec(img);
  if (!match) return [];
  return [match[1] === undefined ? "corporate" : match[1].replace("individual_machine", "machine")];
}

/** i18n key of an ethic id of js/ethic-wheel.js ("fanaticXenophile" -> "ethicFanaticXenophile"). */
const ethicKey = (id) => `ethic${id[0].toUpperCase()}${id.slice(1)}`;

/** Ethics (P24.3): the 17 ethics of the wheel, at their in-game wheel position. */
const ETHIC_BINGO = Object.keys(ETHIC_WHEEL).map((id) => ({
  img: ETHIC_ICONS[id],
  i18nKey: ethicKey(id),
  tags: id === "gestaltConsciousness" ? ["gestalt"] : id.startsWith("fanatic") ? ["fanatic"] : []
}));

/**
 * Authorities (P24.4): one cell per icon of authorities/ (75). The 10 base authorities first,
 * then the ascension variants of each authority, by ascension path (file name Auth_<path>_
 * <authority>_<variant>.png: bio, cyber, cyber_creed, synth, shroud). The icon of a cell is the
 * one of the game authority (or advanced_authority_swap) "auth_<id>"; a variant cell is named
 * with the game name of that swap, followed by its base authority in brackets (T2405).
 * "cyber_dictatorial_collectivist" has no game id of its own: the game splits it by ruler class
 * (_official, _commander, _scientist, _vacant), all named "Dictatorial Alignment", one cell each
 * after the generic icon, told apart by their ruler class (detailKey, T2406): 79 cells.
 */
const AUTHORITY_BINGO = [
  { id: "democratic", img: "authorities/Auth_democratic.png", i18nKey: "authorityDemocratic" },
  { id: "oligarchic", img: "authorities/Auth_oligarchic.png", i18nKey: "authorityOligarchic" },
  { id: "dictatorial", img: "authorities/Auth_dictatorial.png", i18nKey: "authorityDictatorial" },
  { id: "imperial", img: "authorities/Auth_imperial.png", i18nKey: "authorityImperial" },
  { id: "corporate", img: "authorities/Auth_corporate.png", i18nKey: "authorityCorporate" },
  { id: "hive_mind", img: "authorities/Auth_hive_mind.png", i18nKey: "authorityHiveMind" },
  { id: "machine_intelligence", img: "authorities/Auth_machine_intelligence.png", i18nKey: "authorityMachineIntelligence" },
  { id: "mutualistic_intelligence", img: "authorities/Auth_mutualistic_intelligence.png", i18nKey: "authorityMutualisticIntelligence" },
  { id: "memory_aggregator", img: "authorities/Auth_memory_aggregator.png", i18nKey: "authorityMemoryAggregator" },
  { id: "neural_chorus", img: "authorities/Auth_neural_chorus.png", i18nKey: "authorityNeuralChorus" },
  { id: "bio_democratic_cloning", img: "authorities/Auth_bio_democratic_cloning.png", i18nKey: "authorityBioDemocraticCloning", variantKey: "authorityDemocratic", tags: ["biological"] },
  { id: "bio_democratic_evopred", img: "authorities/Auth_bio_democratic_evopred.png", i18nKey: "authorityBioDemocraticEvopred", variantKey: "authorityDemocratic", tags: ["biological"] },
  { id: "bio_democratic_mutation", img: "authorities/Auth_bio_democratic_mutation.png", i18nKey: "authorityBioDemocraticMutation", variantKey: "authorityDemocratic", tags: ["biological"] },
  { id: "bio_democratic_purity", img: "authorities/Auth_bio_democratic_purity.png", i18nKey: "authorityBioDemocraticPurity", variantKey: "authorityDemocratic", tags: ["biological"] },
  { id: "bio_oligarchic_cloning", img: "authorities/Auth_bio_oligarchic_cloning.png", i18nKey: "authorityBioOligarchicCloning", variantKey: "authorityOligarchic", tags: ["biological"] },
  { id: "bio_oligarchic_evopred", img: "authorities/Auth_bio_oligarchic_evopred.png", i18nKey: "authorityBioOligarchicEvopred", variantKey: "authorityOligarchic", tags: ["biological"] },
  { id: "bio_oligarchic_mutation", img: "authorities/Auth_bio_oligarchic_mutation.png", i18nKey: "authorityBioOligarchicMutation", variantKey: "authorityOligarchic", tags: ["biological"] },
  { id: "bio_oligarchic_purity", img: "authorities/Auth_bio_oligarchic_purity.png", i18nKey: "authorityBioOligarchicPurity", variantKey: "authorityOligarchic", tags: ["biological"] },
  { id: "bio_dictatorial_cloning", img: "authorities/Auth_bio_dictatorial_cloning.png", i18nKey: "authorityBioDictatorialCloning", variantKey: "authorityDictatorial", tags: ["biological"] },
  { id: "bio_dictatorial_evopred", img: "authorities/Auth_bio_dictatorial_evopred.png", i18nKey: "authorityBioDictatorialEvopred", variantKey: "authorityDictatorial", tags: ["biological"] },
  { id: "bio_dictatorial_mutation", img: "authorities/Auth_bio_dictatorial_mutation.png", i18nKey: "authorityBioDictatorialMutation", variantKey: "authorityDictatorial", tags: ["biological"] },
  { id: "bio_dictatorial_purity", img: "authorities/Auth_bio_dictatorial_purity.png", i18nKey: "authorityBioDictatorialPurity", variantKey: "authorityDictatorial", tags: ["biological"] },
  { id: "bio_imperial_cloning", img: "authorities/Auth_bio_imperial_cloning.png", i18nKey: "authorityBioImperialCloning", variantKey: "authorityImperial", tags: ["biological"] },
  { id: "bio_imperial_evopred", img: "authorities/Auth_bio_imperial_evopred.png", i18nKey: "authorityBioImperialEvopred", variantKey: "authorityImperial", tags: ["biological"] },
  { id: "bio_imperial_mutation", img: "authorities/Auth_bio_imperial_mutation.png", i18nKey: "authorityBioImperialMutation", variantKey: "authorityImperial", tags: ["biological"] },
  { id: "bio_imperial_purity", img: "authorities/Auth_bio_imperial_purity.png", i18nKey: "authorityBioImperialPurity", variantKey: "authorityImperial", tags: ["biological"] },
  { id: "bio_corporate_cloning", img: "authorities/Auth_bio_corporate_cloning.png", i18nKey: "authorityBioCorporateCloning", variantKey: "authorityCorporate", tags: ["biological"] },
  { id: "bio_corporate_evopred", img: "authorities/Auth_bio_corporate_evopred.png", i18nKey: "authorityBioCorporateEvopred", variantKey: "authorityCorporate", tags: ["biological"] },
  { id: "bio_corporate_mutation", img: "authorities/Auth_bio_corporate_mutation.png", i18nKey: "authorityBioCorporateMutation", variantKey: "authorityCorporate", tags: ["biological"] },
  { id: "bio_corporate_purity", img: "authorities/Auth_bio_corporate_purity.png", i18nKey: "authorityBioCorporatePurity", variantKey: "authorityCorporate", tags: ["biological"] },
  { id: "bio_hive_cloning", img: "authorities/Auth_bio_hive_cloning.png", i18nKey: "authorityBioHiveCloning", variantKey: "authorityHiveMind", tags: ["biological"] },
  { id: "bio_hive_mind_evopred", img: "authorities/Auth_bio_hive_mind_evopred.png", i18nKey: "authorityBioHiveMindEvopred", variantKey: "authorityHiveMind", tags: ["biological"] },
  { id: "bio_hive_mutation", img: "authorities/Auth_bio_hive_mutation.png", i18nKey: "authorityBioHiveMutation", variantKey: "authorityHiveMind", tags: ["biological"] },
  { id: "bio_hive_purity", img: "authorities/Auth_bio_hive_purity.png", i18nKey: "authorityBioHivePurity", variantKey: "authorityHiveMind", tags: ["biological"] },
  { id: "cyber_democratic_collectivist", img: "authorities/Auth_cyber_democratic_collectivist.png", i18nKey: "authorityCyberDemocraticCollectivist", variantKey: "authorityDemocratic", tags: ["cybernetic"] },
  { id: "cyber_democratic_individualist", img: "authorities/Auth_cyber_democratic_individualist.png", i18nKey: "authorityCyberDemocraticIndividualist", variantKey: "authorityDemocratic", tags: ["cybernetic"] },
  { id: "cyber_oligarchic_collectivist", img: "authorities/Auth_cyber_oligarchic_collectivist.png", i18nKey: "authorityCyberOligarchicCollectivist", variantKey: "authorityOligarchic", tags: ["cybernetic"] },
  { id: "cyber_oligarchic_individualist", img: "authorities/Auth_cyber_oligarchic_individualist.png", i18nKey: "authorityCyberOligarchicIndividualist", variantKey: "authorityOligarchic", tags: ["cybernetic"] },
  { id: "cyber_dictatorial_collectivist", img: "authorities/Auth_cyber_dictatorial_collectivist.png", i18nKey: "authorityCyberDictatorialCollectivist", variantKey: "authorityDictatorial", tags: ["cybernetic"] },
  ...["official", "commander", "scientist", "vacant"].map((ruler) => ({
    id: `cyber_dictatorial_collectivist_${ruler}`,
    img: `authorities/Auth_cyber_dictatorial_collectivist_${ruler}.png`,
    i18nKey: "authorityCyberDictatorialCollectivist",
    detailKey: `authorityRuler${ruler[0].toUpperCase()}${ruler.slice(1)}`,
    variantKey: "authorityDictatorial",
    tags: ["cybernetic"]
  })),
  { id: "cyber_dictatorial_individualist", img: "authorities/Auth_cyber_dictatorial_individualist.png", i18nKey: "authorityCyberDictatorialIndividualist", variantKey: "authorityDictatorial", tags: ["cybernetic"] },
  { id: "cyber_imperial_collectivist", img: "authorities/Auth_cyber_imperial_collectivist.png", i18nKey: "authorityCyberImperialCollectivist", variantKey: "authorityImperial", tags: ["cybernetic"] },
  { id: "cyber_imperial_individualist", img: "authorities/Auth_cyber_imperial_individualist.png", i18nKey: "authorityCyberImperialIndividualist", variantKey: "authorityImperial", tags: ["cybernetic"] },
  { id: "cyber_corporate_collectivist", img: "authorities/Auth_cyber_corporate_collectivist.png", i18nKey: "authorityCyberCorporateCollectivist", variantKey: "authorityCorporate", tags: ["cybernetic"] },
  { id: "cyber_corporate_individualist", img: "authorities/Auth_cyber_corporate_individualist.png", i18nKey: "authorityCyberCorporateIndividualist", variantKey: "authorityCorporate", tags: ["cybernetic"] },
  { id: "cyber_hive_integrated", img: "authorities/Auth_cyber_hive_integrated.png", i18nKey: "authorityCyberHiveIntegrated", variantKey: "authorityHiveMind", tags: ["cybernetic"] },
  { id: "cyber_hive_volitional", img: "authorities/Auth_cyber_hive_volitional.png", i18nKey: "authorityCyberHiveVolitional", variantKey: "authorityHiveMind", tags: ["cybernetic"] },
  { id: "cyber_creed_democratic", img: "authorities/Auth_cyber_creed_democratic.png", i18nKey: "authorityCyberCreedDemocratic", variantKey: "authorityDemocratic", tags: ["cybernetic"] },
  { id: "cyber_creed_oligarchic", img: "authorities/Auth_cyber_creed_oligarchic.png", i18nKey: "authorityCyberCreedOligarchic", variantKey: "authorityOligarchic", tags: ["cybernetic"] },
  { id: "cyber_creed_dictatorial", img: "authorities/Auth_cyber_creed_dictatorial.png", i18nKey: "authorityCyberCreedDictatorial", variantKey: "authorityDictatorial", tags: ["cybernetic"] },
  { id: "cyber_creed_imperial", img: "authorities/Auth_cyber_creed_imperial.png", i18nKey: "authorityCyberCreedImperial", variantKey: "authorityImperial", tags: ["cybernetic"] },
  { id: "cyber_creed_corporate", img: "authorities/Auth_cyber_creed_corporate.png", i18nKey: "authorityCyberCreedCorporate", variantKey: "authorityCorporate", tags: ["cybernetic"] },
  { id: "synth_democratic_physical", img: "authorities/Auth_synth_democratic_physical.png", i18nKey: "authoritySynthDemocraticPhysical", variantKey: "authorityDemocratic", tags: ["synthetic"] },
  { id: "synth_democratic_virtual", img: "authorities/Auth_synth_democratic_virtual.png", i18nKey: "authoritySynthDemocraticVirtual", variantKey: "authorityDemocratic", tags: ["synthetic"] },
  { id: "synth_oligarchic_physical", img: "authorities/Auth_synth_oligarchic_physical.png", i18nKey: "authoritySynthOligarchicPhysical", variantKey: "authorityOligarchic", tags: ["synthetic"] },
  { id: "synth_oligarchic_virtual", img: "authorities/Auth_synth_oligarchic_virtual.png", i18nKey: "authoritySynthOligarchicVirtual", variantKey: "authorityOligarchic", tags: ["synthetic"] },
  { id: "synth_dictatorial_physical", img: "authorities/Auth_synth_dictatorial_physical.png", i18nKey: "authoritySynthDictatorialPhysical", variantKey: "authorityDictatorial", tags: ["synthetic"] },
  { id: "synth_dictatorial_virtual", img: "authorities/Auth_synth_dictatorial_virtual.png", i18nKey: "authoritySynthDictatorialVirtual", variantKey: "authorityDictatorial", tags: ["synthetic"] },
  { id: "synth_imperial_physical", img: "authorities/Auth_synth_imperial_physical.png", i18nKey: "authoritySynthImperialPhysical", variantKey: "authorityImperial", tags: ["synthetic"] },
  { id: "synth_imperial_virtual", img: "authorities/Auth_synth_imperial_virtual.png", i18nKey: "authoritySynthImperialVirtual", variantKey: "authorityImperial", tags: ["synthetic"] },
  { id: "synth_corporate_physical", img: "authorities/Auth_synth_corporate_physical.png", i18nKey: "authoritySynthCorporatePhysical", variantKey: "authorityCorporate", tags: ["synthetic"] },
  { id: "synth_corporate_virtual", img: "authorities/Auth_synth_corporate_virtual.png", i18nKey: "authoritySynthCorporateVirtual", variantKey: "authorityCorporate", tags: ["synthetic"] },
  { id: "shroud_democratic_corporeal", img: "authorities/Auth_shroud_democratic_corporeal.png", i18nKey: "authorityShroudDemocraticCorporeal", variantKey: "authorityDemocratic", tags: ["psionic"] },
  { id: "shroud_democratic_transcendent", img: "authorities/Auth_shroud_democratic_transcendent.png", i18nKey: "authorityShroudDemocraticTranscendent", variantKey: "authorityDemocratic", tags: ["psionic"] },
  { id: "shroud_oligarchic_corporeal", img: "authorities/Auth_shroud_oligarchic_corporeal.png", i18nKey: "authorityShroudOligarchicCorporeal", variantKey: "authorityOligarchic", tags: ["psionic"] },
  { id: "shroud_oligarchic_transcendent", img: "authorities/Auth_shroud_oligarchic_transcendent.png", i18nKey: "authorityShroudOligarchicTranscendent", variantKey: "authorityOligarchic", tags: ["psionic"] },
  { id: "shroud_dictatorial_corporeal", img: "authorities/Auth_shroud_dictatorial_corporeal.png", i18nKey: "authorityShroudDictatorialCorporeal", variantKey: "authorityDictatorial", tags: ["psionic"] },
  { id: "shroud_dictatorial_transcendent", img: "authorities/Auth_shroud_dictatorial_transcendent.png", i18nKey: "authorityShroudDictatorialTranscendent", variantKey: "authorityDictatorial", tags: ["psionic"] },
  { id: "shroud_imperial_corporeal", img: "authorities/Auth_shroud_imperial_corporeal.png", i18nKey: "authorityShroudImperialCorporeal", variantKey: "authorityImperial", tags: ["psionic"] },
  { id: "shroud_imperial_transcendent", img: "authorities/Auth_shroud_imperial_transcendent.png", i18nKey: "authorityShroudImperialTranscendent", variantKey: "authorityImperial", tags: ["psionic"] },
  { id: "shroud_corporate_corporeal", img: "authorities/Auth_shroud_corporate_corporeal.png", i18nKey: "authorityShroudCorporateCorporeal", variantKey: "authorityCorporate", tags: ["psionic"] },
  { id: "shroud_corporate_transcendent", img: "authorities/Auth_shroud_corporate_transcendent.png", i18nKey: "authorityShroudCorporateTranscendent", variantKey: "authorityCorporate", tags: ["psionic"] },
  { id: "shroud_hive_corporeal", img: "authorities/Auth_shroud_hive_corporeal.png", i18nKey: "authorityShroudHiveCorporeal", variantKey: "authorityHiveMind", tags: ["psionic"] },
  { id: "shroud_hive_transcendent", img: "authorities/Auth_shroud_hive_transcendent.png", i18nKey: "authorityShroudHiveTranscendent", variantKey: "authorityHiveMind", tags: ["psionic"] },
  { id: "shroud_machine_corporeal", img: "authorities/Auth_shroud_machine_corporeal.png", i18nKey: "authorityShroudMachineCorporeal", variantKey: "authorityMachineIntelligence", tags: ["psionic"] },
  { id: "shroud_machine_transcendent", img: "authorities/Auth_shroud_machine_transcendent.png", i18nKey: "authorityShroudMachineTranscendent", variantKey: "authorityMachineIntelligence", tags: ["psionic"] },
];

export const BINGOS = [
  {
    id: "origins",
    titleKey: "bingoTypeOrigins",
    descriptionKey: "bingoOriginsDescription",
    fileSlug: "origenes",
    iconSize: 110,
    showNames: true,
    layout: { type: "ordered", order: ORIGIN_ORDER, columns: 9 },
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
  },
  {
    id: "ethics",
    titleKey: "bingoTypeEthics",
    descriptionKey: "bingoEthicsDescription",
    fileSlug: "eticas",
    iconSize: 90,
    showNames: true,
    layout: {
      type: "shape",
      rows: 5,
      columns: 5,
      cells: Object.fromEntries(Object.entries(ETHIC_WHEEL).map(([id, position]) => [ethicKey(id), position]))
    },
    items: ETHIC_BINGO
  },
  {
    id: "authorities",
    titleKey: "bingoTypeAuthorities",
    descriptionKey: "bingoAuthoritiesDescription",
    fileSlug: "autoridades",
    iconSize: 70,
    showNames: false,
    layout: { type: "ordered", order: AUTHORITY_BINGO.map((item) => item.id), columns: 10 },
    items: AUTHORITY_BINGO
  },
  {
    // T3501: rare and dangerous technologies of the game data (js/bingo-game-items.js, generated by
    // tools/extract/build_bingo_game_items.py), rare first. Icons from technologies/ (T3008); an
    // icon that does not load keeps its empty slot with the name.
    id: "technologies",
    titleKey: "bingoTypeTechnologies",
    descriptionKey: "bingoTechnologiesDescription",
    fileSlug: "tecnologias",
    iconSize: 70,
    showNames: false,
    layout: { type: "grid", columns: 12 },
    items: TECH_BINGO
  }
];

/**
 * Datos del bingo (orígenes y principios de Stellaris).
 *
 * Cada casilla es un objeto:
 *   { img: "img/bingo/....png", i18nKey: "originXxx" }
 * - "img" es la ruta a la imagen, relativa a IMAGE_BASE (ver más abajo).
 * - "i18nKey" es la clave de texto que se busca en los tres bloques de
 *   idioma (es/en/jp) dentro de js/i18n.js. Debe existir en los tres.
 *
 * ── Cómo servir las imágenes desde otro sitio ─────────────────────────────
 * Si en el futuro sirves las imágenes del bingo (u otras) desde otro
 * dominio o repositorio (por ejemplo, un repo de solo assets publicado en
 * GitHub Pages, para no acercarte a límites de despliegue como el de
 * Vercel), cambia únicamente IMAGE_BASE por la URL base de ese origen
 * (terminada en "/"). No hace falta tocar nada más: todas las rutas de
 * "img" de este archivo son relativas a IMAGE_BASE.
 */
export const IMAGE_BASE = "";

/** Bingo de orígenes. */
export const ORIGIN_BINGO = [
  { img: "img/origins/GFX_origin_default.png", i18nKey: "originDefault" },
  { img: "img/origins/GFX_origin_nomad_default.png", i18nKey: "originNomadDefault" },
  { img: "img/origins/GFX_origin_sacred_path.png", i18nKey: "originSacredPath" },
  { img: "img/origins/GFX_origin_heirs_of_the_khan.png", i18nKey: "originHeirsOfTheKhan" },
  { img: "img/origins/GFX_origin_forever_cruise.png", i18nKey: "originForeverCruise" },
  { img: "img/origins/GFX_origin_red_giant.png", i18nKey: "originRedGiant" },
  { img: "img/origins/GFX_origin_cosmic_dawn.png", i18nKey: "originCosmicDawn" },
  { img: "img/origins/GFX_origin_shroud_forged.png", i18nKey: "originShroudForged" },
  { img: "img/origins/GFX_origin_mindwardens.png", i18nKey: "originMindwardens" },
  { img: "img/origins/GFX_origin_endbringers.png", i18nKey: "originEndbringers" },
  { img: "img/origins/GFX_origin_evolutionary_predators.png", i18nKey: "originEvolutionaryPredators" },
  { img: "img/origins/GFX_origin_starlit_citadel.png", i18nKey: "originStarlitCitadel" },
  { img: "img/origins/GFX_origin_wilderness.png", i18nKey: "originWilderness" },
  { img: "img/origins/GFX_origin_treasure_hunters.png", i18nKey: "originTreasureHunters" },
  { img: "img/origins/GFX_origin_primal_calling.png", i18nKey: "originPrimalCalling" },
  { img: "img/origins/GFX_origin_storm_chasers.png", i18nKey: "originStormChasers" },
  { img: "img/origins/GFX_origin_cybernetic_creed.png", i18nKey: "originCyberneticCreed" },
  { img: "img/origins/GFX_origin_synthetic_fertility.png", i18nKey: "originSyntheticFertility" },
  { img: "img/origins/GFX_origin_arc_welders.png", i18nKey: "originArcWelders" },
  { img: "img/origins/GFX_origin_riftworld.png", i18nKey: "originRiftworld" },
  { img: "img/origins/GFX_origin_legendary_leader.png", i18nKey: "originLegendaryLeader" },
  { img: "img/origins/GFX_origin_payback.png", i18nKey: "originPayback" },
  { img: "img/origins/GFX_origin_broken_shackles.png", i18nKey: "originBrokenShackles" },
  { img: "img/origins/GFX_origin_fear_of_the_dark.png", i18nKey: "originFearOfTheDark" },
  { img: "img/origins/GFX_origin_overtuned.png", i18nKey: "originOvertuned" },
  { img: "img/origins/GFX_origin_toxic_knights.png", i18nKey: "originToxicKnights" },
  { img: "img/origins/GFX_origin_progenitor_hive.png", i18nKey: "originProgenitorHive" },
  { img: "img/origins/GFX_origin_subterranean.png", i18nKey: "originSubterranean" },
  { img: "img/origins/GFX_origin_star_slingshot.png", i18nKey: "originStarSlingshot" },
  { img: "img/origins/GFX_origin_shroudwalker_apprentice.png", i18nKey: "originShroudwalkerApprentice" },
  { img: "img/origins/GFX_origin_imperial_vassal.png", i18nKey: "originImperialVassal" },
  { img: "img/origins/GFX_origin_here_be_dragons.png", i18nKey: "originHereBeDragons" },
  { img: "img/origins/GFX_origin_ocean_paradise.png", i18nKey: "originOceanParadise" },
  { img: "img/origins/GFX_origin_necrophage.png", i18nKey: "originNecrophage" },
  { img: "img/origins/GFX_origin_remnants.png", i18nKey: "originRemnants" },
  { img: "img/origins/GFX_origin_shattered_ring.png", i18nKey: "originShatteredRing" },
  { img: "img/origins/GFX_origin_void_dwellers.png", i18nKey: "originVoidDwellers" },
  { img: "img/origins/GFX_origin_scion.png", i18nKey: "originScion" },
  { img: "img/origins/GFX_origin_shoulders.png", i18nKey: "originShoulders" },
  { img: "img/origins/GFX_origin_common_ground.png", i18nKey: "originCommonGround" },
  { img: "img/origins/GFX_origin_hegemon.png", i18nKey: "originHegemon" },
  { img: "img/origins/GFX_origin_doomsday.png", i18nKey: "originDoomsday" },
  { img: "img/origins/GFX_origin_calamitous.png", i18nKey: "originCalamitous" },
  { img: "img/origins/GFX_origin_life_seeded.png", i18nKey: "originLifeSeeded" },
  { img: "img/origins/GFX_origin_post_apocalyptic.png", i18nKey: "originPostApocalyptic" },
  { img: "img/origins/GFX_origin_clone_army.png", i18nKey: "originCloneArmy" },
  { img: "img/origins/GFX_origin_resource_consolidation.png", i18nKey: "originResourceConsolidation" },
  { img: "img/origins/GFX_origin_unplugged.png", i18nKey: "originUnplugged" },
  { img: "img/origins/GFX_origin_mechanist.png", i18nKey: "originMechanist" },
  { img: "img/origins/GFX_origin_syncretic_evolution.png", i18nKey: "originSyncreticEvolution" },
  { img: "img/origins/GFX_origin_tree.png", i18nKey: "originTree" },
  { img: "img/origins/GFX_origin_fruitful.png", i18nKey: "originFruitful" },
  { img: "img/origins/GFX_origin_galactic_doorstep.png", i18nKey: "originGalacticDoorstep" },
  { img: "img/origins/GFX_origin_lost_colony.png", i18nKey: "originLostColony" },
];

/**
 * Bingo de principios (civics). TODO (Morteux): rellena esta lista.
 *
 * Por cada principio que quieras incluir:
 *  1. Añade su imagen en img/bingo/principios/ (o la carpeta que prefieras)
 *     — puede ser el mismo icono GFX_civic_xxx.png que usa el juego.
 *  2. Añade una línea aquí con el mismo formato que ORIGIN_BINGO, por
 *     ejemplo: { img: "img/bingo/principios/GFX_civic_xxx.png", i18nKey: "principleXxx" }.
 *  3. Añade la clave "principleXxx" con su texto en los tres bloques de
 *     idioma (es/en/jp) de js/i18n.js, junto al resto de "principleXxx".
 *
 * Mientras esta lista esté vacía, la página de bingo mostrará un aviso en
 * lugar de la rejilla al seleccionar "Principios".
 */
export const PRINCIPLE_BINGO = [];

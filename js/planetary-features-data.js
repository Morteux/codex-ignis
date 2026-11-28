/**
 * P10.8: deposit features (wiki 4.5.2 *Planetary features*, "Deposit features"). Every natural planet has between 4 and
 * 15 of them, depending on its size; they set how many generator / mining / agriculture districts it can hold.
 *
 * The simulator works the other way round (owner decision 2026-11-20): it does not ask which features the planet has,
 * it computes the fewest features the built resource districts need on this planet type (see requiredDepositFeatures in
 * planet-sim.js) and warns when that number is outside 4–15. A district group with no feature on the planet type cannot
 * be built (Relic Worlds have no agriculture feature).
 *
 * caps: max districts added per district group key (generator / mining / agriculture). On Volcanic Worlds the mining
 * key is the Magma Conduit and the agriculture key the Thermotechnic Forum (P10.6); their features list no planet type
 * on the wiki ("Volcanic Worlds only"). Sulfuric Lava is listed under both (+2 Magma Conduits, +2 Thermotechnic Forums)
 * and is read as one feature with both caps. bodies: planet type ids (js/celestial-data.js).
 * Not modelled (GDD §10): district-cap buildings (Industrial Mining Site...), features that grant caps by event,
 * planet modifiers or traditions; the Alien Zoo feature (Isolated Valley).
 */
export const DEPOSIT_FEATURES = [
  { id: "hotSprings", i18nKey: "featureHotSprings", img: "planetary_features/D_hot_springs.png", caps: { generator: 1 }, bodies: ["continental", "ocean", "tropical", "alpine", "arctic", "tundra", "tomb"] },
  { id: "aridHighlands", i18nKey: "featureAridHighlands", img: "planetary_features/D_arid_highlands.png", caps: { generator: 1 }, bodies: ["arid", "desert", "savannah"] },
  { id: "buzzingPlains", i18nKey: "featureBuzzingPlains", img: "planetary_features/D_buzzing_plains.png", caps: { generator: 1 }, bodies: ["gaia"] },
  { id: "frozenGasLake", i18nKey: "featureFrozenGasLake", img: "planetary_features/D_frozen_gas_lake.png", caps: { generator: 2 }, bodies: ["alpine", "arctic", "tundra", "gaia", "relic"] },
  { id: "searingDesert", i18nKey: "featureSearingDesert", img: "planetary_features/D_searing_desert.png", caps: { generator: 2 }, bodies: ["arid", "desert", "savannah", "gaia", "tomb", "relic"] },
  { id: "rushingWaterfalls", i18nKey: "featureRushingWaterfalls", img: "planetary_features/D_rushing_waterfalls.png", caps: { generator: 2 }, bodies: ["continental", "ocean", "tropical"] },
  { id: "geothermalVents", i18nKey: "featureGeothermalVents", img: "planetary_features/D_geothermal_vent.png", caps: { generator: 3 }, bodies: ["arid", "desert", "savannah", "arctic", "tundra", "volcanic"] },
  { id: "tempestuousMountain", i18nKey: "featureTempestuousMountain", img: "planetary_features/D_tempestous_mountain.png", caps: { generator: 3 }, bodies: ["continental", "tropical", "alpine", "gaia", "relic", "volcanic"] },
  { id: "underwaterVents", i18nKey: "featureUnderwaterVents", img: "planetary_features/D_underwater_vent.png", caps: { generator: 3 }, bodies: ["ocean", "gaia", "tomb", "relic"] },
  { id: "greenHills", i18nKey: "featureGreenHills", img: "planetary_features/D_green_hills.png", caps: { agriculture: 1 }, bodies: ["ocean", "tropical"] },
  { id: "boggyFens", i18nKey: "featureBoggyFens", img: "planetary_features/D_boggy_fens.png", caps: { agriculture: 1 }, bodies: ["ocean"] },
  { id: "ruggedWoods", i18nKey: "featureRuggedWoods", img: "planetary_features/D_rugged_woods.png", caps: { agriculture: 1 }, bodies: ["continental"] },
  { id: "bountifulPlains", i18nKey: "featureBountifulPlains", img: "planetary_features/D_bountiful_plains.png", caps: { agriculture: 1 }, bodies: ["arid", "savannah"] },
  { id: "nutritiousMudlands", i18nKey: "featureNutritiousMudlands", img: "planetary_features/D_nutritious_mudland.png", caps: { agriculture: 1 }, bodies: ["desert"] },
  { id: "fairTundra", i18nKey: "featureFairTundra", img: "planetary_features/D_forgiving_tundra.png", caps: { agriculture: 1 }, bodies: ["alpine", "tundra"] },
  { id: "lichenFields", i18nKey: "featureLichenFields", img: "planetary_features/D_lichen_fields.png", caps: { agriculture: 1 }, bodies: ["arctic", "tomb"] },
  { id: "naturalFarmland", i18nKey: "featureNaturalFarmland", img: "planetary_features/D_natural_farmland.png", caps: { agriculture: 1 }, bodies: ["gaia"] },
  { id: "fertileLands", i18nKey: "featureFertileLands", img: "planetary_features/D_fertile_lands.png", caps: { agriculture: 2 }, bodies: ["continental", "arid", "savannah", "gaia"] },
  { id: "fungalCaves", i18nKey: "featureFungalCaves", img: "planetary_features/D_fungal_caves.png", caps: { agriculture: 2 }, bodies: ["alpine", "arctic", "tundra", "tomb"] },
  { id: "greatRiver", i18nKey: "featureGreatRiver", img: "planetary_features/D_great_river.png", caps: { agriculture: 2 }, bodies: ["arid", "desert"] },
  { id: "lushJungle", i18nKey: "featureLushJungle", img: "planetary_features/D_lush_jungle.png", caps: { agriculture: 2 }, bodies: ["ocean", "tropical", "gaia"] },
  { id: "blackSoil", i18nKey: "featureBlackSoil", img: "planetary_features/D_black_soil.png", caps: { agriculture: 3 }, bodies: ["continental", "savannah", "gaia"] },
  { id: "fungalForest", i18nKey: "featureFungalForest", img: "planetary_features/D_fungal_forest.png", caps: { agriculture: 3 }, bodies: ["alpine", "arctic", "tundra"] },
  { id: "marvelousOasis", i18nKey: "featureMarvelousOasis", img: "planetary_features/D_marvelous_oasis.png", caps: { agriculture: 3 }, bodies: ["arid", "desert"] },
  { id: "tropicalIsland", i18nKey: "featureTropicalIsland", img: "planetary_features/D_tropical_island.png", caps: { agriculture: 3 }, bodies: ["arid", "desert", "tropical"] },
  { id: "teemingReef", i18nKey: "featureTeemingReef", img: "planetary_features/D_teeming_reef.png", caps: { agriculture: 3 }, bodies: ["ocean", "gaia"] },
  { id: "mineralFields", i18nKey: "featureMineralFields", img: "planetary_features/D_mineral_fields.png", caps: { mining: 1 }, bodies: ["ocean", "tropical", "desert", "savannah", "tundra"] },
  { id: "oreVeinedCliffs", i18nKey: "featureOreVeinedCliffs", img: "planetary_features/D_veiny_cliffs.png", caps: { mining: 1 }, bodies: ["continental", "arid", "alpine", "arctic", "tomb"] },
  { id: "mineralStriations", i18nKey: "featureMineralStriations", img: "planetary_features/D_mineral_striations.png", caps: { mining: 1 }, bodies: ["gaia"] },
  { id: "prosperousMesa", i18nKey: "featureProsperousMesa", img: "planetary_features/D_prosperous_mesa.png", caps: { mining: 2 }, bodies: ["continental", "tropical", "desert", "savannah", "relic"] },
  { id: "oreRichCaverns", i18nKey: "featureOreRichCaverns", img: "planetary_features/D_ore_rich_caverns.png", caps: { mining: 2 }, bodies: ["ocean", "arid", "alpine", "arctic", "tundra", "gaia", "tomb", "relic"] },
  { id: "richMountain", i18nKey: "featureRichMountain", img: "planetary_features/D_rich_mountain.png", caps: { mining: 3 }, bodies: ["continental", "arid", "desert", "alpine", "arctic", "tundra", "gaia", "relic"] },
  { id: "submergedOreVeins", i18nKey: "featureSubmergedOreVeins", img: "planetary_features/D_submerged_ore_veins.png", caps: { mining: 3 }, bodies: ["ocean", "tropical", "savannah", "gaia", "tomb", "relic"] },
  { id: "oreRichHills", i18nKey: "featureOreRichHills", img: "planetary_features/D_mineral_fields.png", caps: { mining: 1 }, bodies: ["volcanic"] },
  { id: "volcanicOreVeins", i18nKey: "featureVolcanicOreVeins", img: "planetary_features/D_veiny_cliffs.png", caps: { mining: 1 }, bodies: ["volcanic"] },
  { id: "sulfuricLava", i18nKey: "featureSulfuricLava", img: "planetary_features/D_blue_lava.png", caps: { mining: 2, agriculture: 2 }, bodies: ["volcanic"] },
  { id: "volcanicMineralFields", i18nKey: "featureVolcanicMineralFields", img: "planetary_features/D_mineral_fields.png", caps: { mining: 2 }, bodies: ["volcanic"] },
  { id: "volcanicMineralLayers", i18nKey: "featureVolcanicMineralLayers", img: "planetary_features/D_mineral_striations.png", caps: { mining: 2 }, bodies: ["volcanic"] },
  { id: "volcanicOreRichCaverns", i18nKey: "featureVolcanicOreRichCaverns", img: "planetary_features/D_ore_rich_caverns.png", caps: { mining: 2 }, bodies: ["volcanic"] },
  { id: "volcanicRichMountain", i18nKey: "featureVolcanicRichMountain", img: "planetary_features/D_volcanic_rich_mountain.png", caps: { mining: 2 }, bodies: ["volcanic"] },
  { id: "weakCrust", i18nKey: "featureWeakCrust", img: "planetary_features/D_deep_sinkhole.png", caps: { mining: 2 }, bodies: ["volcanic"] },
  { id: "lavaRivers", i18nKey: "featureLavaRivers", img: "planetary_features/D_volcanic_world.png", caps: { mining: 3 }, bodies: ["volcanic"] },
  { id: "driedUpLavaRiver", i18nKey: "featureDriedUpLavaRiver", img: "planetary_features/D_massive_crevice.png", caps: { agriculture: 1 }, bodies: ["volcanic"] },
  { id: "basaltPlains", i18nKey: "featureBasaltPlains", img: "planetary_features/D_volcanic_basalt_plains.png", caps: { agriculture: 2 }, bodies: ["volcanic"] },
  { id: "isolatedTunnels", i18nKey: "featureIsolatedTunnels", img: "planetary_features/D_ancient_vault.png", caps: { agriculture: 2 }, bodies: ["volcanic"] },
  { id: "stablePlateaus", i18nKey: "featureStablePlateaus", img: "planetary_features/D_volcanic_basalt_plains.png", caps: { agriculture: 2 }, bodies: ["volcanic"] },
  { id: "sturdyIntraplate", i18nKey: "featureSturdyIntraplate", img: "planetary_features/D_geothermal_vent.png", caps: { agriculture: 2 }, bodies: ["volcanic"] },
  { id: "tranquilFlatlands", i18nKey: "featureTranquilFlatlands", img: "planetary_features/D_forgiving_tundra.png", caps: { agriculture: 2 }, bodies: ["volcanic"] }
];

/** Planet types whose resource districts are limited by deposit features (natural planets that keep their features). */
export const DEPOSIT_FEATURE_BODIES = ["continental", "ocean", "tropical", "savannah", "arid", "desert", "tundra", "arctic", "alpine", "volcanic", "gaia", "tomb", "relic"];

/** Uncapped district groups (wiki *Districts*, "Uncapped if either"): Anglers civics on an Ocean World make agriculture uncapped. */
export const UNCAPPED_DISTRICTS = [
  { district: "agriculture", bodies: ["ocean"], civics: ["civicAnglers", "civicCorporateAnglers"] }
];

/** Deposit features a planet has according to the wiki (warning outside this range). */
export const DEPOSIT_FEATURE_COUNT = { min: 4, max: 15 };

const NATURAL_NOT_VOLCANIC = ["continental", "ocean", "tropical", "savannah", "arid", "desert", "tundra", "arctic", "alpine", "gaia", "tomb", "relic"];

/**
 * P10.8 (part 2): strategic resource deposits (wiki *Planetary features*, "Strategic resource deposits"). A strategic
 * specialization needs one of its deposits on the planet; the simulator adds the worst one by default (lowest bonus,
 * owner decision 2026-11-20) and the user can pick another (saved with the planet, optional field `strategicDeposits`
 * { specializationId: depositId }). Their caps count towards the required deposit features.
 * jobBonus: "+X <resource> per 100 <job category>" = +X per staffed job of the category (JOB_CATEGORIES), applied as a
 * per-job bonus (all extraction technologies are researched). bodies: Fumaroles and Stifling Atmosphere are Volcanic
 * only ("Volcanic" climate, the mining features of the other deposits cannot appear on Volcanic Worlds); the others may
 * appear on any natural planet (the favoured climate only changes their chance).
 * Fumaroles unlocks Exotic Gas Capture, an agriculture specialization that the Thermotechnic Forum (agriculture group of
 * a Volcanic World) cannot take: it is never required.
 */
export const STRATEGIC_DEPOSITS = [
  { id: "betharianFields", i18nKey: "featureBetharianFields", img: "planetary_features/D_betharian_deposit.png", caps: { mining: 4 }, unlocks: "betharianProcessing", bodies: NATURAL_NOT_VOLCANIC },
  { id: "dustCaverns", i18nKey: "featureDustCaverns", img: "planetary_features/D_dust_caverns.png", caps: { generator: 3 }, unlocks: "volatileMotesHarvesting", jobBonus: { category: "technicians", resource: "volatile_motes", perJob: 0.05 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "dustDesert", i18nKey: "featureDustDesert", img: "planetary_features/D_dust_desert.png", caps: { generator: 3 }, unlocks: "volatileMotesHarvesting", jobBonus: { category: "technicians", resource: "volatile_motes", perJob: 0.1 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "bubblingSwamp", i18nKey: "featureBubblingSwamp", img: "planetary_features/D_bubbling_swamp.png", caps: { agriculture: 3 }, unlocks: "exoticGasCapture", jobBonus: { category: "farmers", resource: "exotic_gases", perJob: 0.05 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "fumingBog", i18nKey: "featureFumingBog", img: "planetary_features/D_fuming_bog.png", caps: { agriculture: 3 }, unlocks: "exoticGasCapture", jobBonus: { category: "farmers", resource: "exotic_gases", perJob: 0.1 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "crystallineCaverns", i18nKey: "featureCrystallineCaverns", img: "planetary_features/D_crystalline_caverns.png", caps: { mining: 3 }, unlocks: "rareCrystalExtraction", jobBonus: { category: "miners", resource: "rare_crystals", perJob: 0.05 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "crystalForest", i18nKey: "featureCrystalForest", img: "planetary_features/D_crystal_forest.png", caps: { mining: 3 }, unlocks: "rareCrystalExtraction", jobBonus: { category: "miners", resource: "rare_crystals", perJob: 0.1 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "crystalReef", i18nKey: "featureCrystalReef", img: "planetary_features/D_crystal_reef.png", caps: { mining: 3 }, unlocks: "rareCrystalExtraction", jobBonus: { category: "miners", resource: "rare_crystals", perJob: 0.1 }, bodies: NATURAL_NOT_VOLCANIC },
  { id: "fumaroles", i18nKey: "featureFumaroles", img: "planetary_features/D_gaseous_eruption.png", caps: { mining: 3 }, unlocks: "exoticGasCapture", jobBonus: { category: "miners", resource: "exotic_gases", perJob: 0.2 }, bodies: ["volcanic"] },
  { id: "stiflingAtmosphere", i18nKey: "featureStiflingAtmosphere", img: "planetary_features/D_tempestous_mountain.png", caps: { mining: 3 }, unlocks: "volatileMotesHarvesting", jobBonus: { category: "miners", resource: "volatile_motes", perJob: 0.2 }, bodies: ["volcanic"] }
];

/**
 * Job categories used by "per 100 <category>" effects (wiki *Jobs*: Technicians, Miners, Farmers categories), limited to
 * the jobs the simulator has.
 */
export const JOB_CATEGORIES = {
  technicians: ["technician", "mote_harvester"],
  miners: ["miner", "crystal_miner", "thermoforger"],
  farmers: ["farmer", "gas_extractor", "angler"],
  thermoforgers: ["thermoforger"]
};

const BLAZING_SCOURGE_BODIES = ["continental", "ocean", "tropical", "savannah", "arid", "desert", "tundra", "arctic", "alpine", "volcanic", "tomb", "relic"];
const blazingScourge = (id, i18nKey, img, effect) => ({
  id, i18nKey, img: `planetary_features/${img}`, group: "blazingScourge", bodies: BLAZING_SCOURGE_BODIES,
  requires: [{ type: "civic", keys: ["civicPyrolatry"] }], amenities: 500, ...effect
});

/**
 * P10.8 (part 3): blockers the user can place on the planet (owner decision 2026-11-20: only the useful ones; blockers
 * that only remove districts are covered by the manual size). Saved with the planet (optional field `blockerIds`).
 * - Collapsed Spire (Relic World): while present, the first primary specialization slot is locked and the Central
 *   Spire is not available (it is set when the blocker is cleared).
 * - Blazing Scourge (Blazing Scourge decision: Fire Cult civic, not Gaia, artificial or converted worlds): their
 *   resources ("+5 Energy" flat for the planet; "+0.25 per 100 Miners / Technicians" per staffed job of the category)
 *   and +500 amenities each with Fire Cult. The −20 % habitability is not modelled.
 * - Nanite Harvest Basin, Shroudstone, Ruined Sanctum of the Dreamer: their flat output; their origin (situation,
 *   psionic aura, conquest) is an unmodelled requirement. Shroudstone's Covenant bonus (+0.05 Zro per 100 Miners, +1
 *   max mining district) is not modelled.
 * flat: planet output per month (step 5, own breakdown line); jobBonus: as STRATEGIC_DEPOSITS.
 */
export const BLOCKERS = [
  { id: "collapsedSpire", i18nKey: "blockerCollapsedSpire", img: "planetary_features/D_broken_spire.png", bodies: ["relic"], locksFirstSpecialization: true },
  blazingScourge("chargedAtmosphere", "blockerChargedAtmosphere", "D_tempestous_mountain.png", { flat: { energy: 5 } }),
  blazingScourge("largeVolcano", "blockerLargeVolcano", "D_active_volcano.png", { flat: { unity: 5 } }),
  blazingScourge("seasonalLavaFlooding", "blockerSeasonalLavaFlooding", "D_lava_flooding.png", { flat: { minerals: 5 } }),
  blazingScourge("toxicAtmosphere", "blockerToxicAtmosphere", "D_unpleasant_atmosphere_blocker.png", { jobBonus: { category: "miners", resource: "exotic_gases", perJob: 0.25 } }),
  blazingScourge("ashStorms", "blockerAshStorms", "D_ash_storms.png", { jobBonus: { category: "technicians", resource: "volatile_motes", perJob: 0.25 } }),
  { id: "naniteHarvestBasin", bodies: DEPOSIT_FEATURE_BODIES, i18nKey: "blockerNaniteHarvestBasin", img: "planetary_features/D_buried_lithoids.png", requires: [{ type: "unmodelled", i18nKey: "reqExtractNanitesSituation" }], flat: { nanites: 0.5 } },
  { id: "shroudstone", bodies: DEPOSIT_FEATURE_BODIES, i18nKey: "blockerShroudstone", img: "planetary_features/D_shroudstone.png", requires: [{ type: "unmodelled", i18nKey: "reqAuraOfStrands" }], flat: { zro: 1 } },
  { id: "ruinedSanctumOfTheDreamer", bodies: DEPOSIT_FEATURE_BODIES, i18nKey: "blockerRuinedSanctumOfTheDreamer", img: "planetary_features/D_ruined_sanctum_of_the_lost.png", requires: [{ type: "unmodelled", i18nKey: "reqConquerMindwardens" }], flat: { zro: 1 } }
];

/**
 * Catálogo de tipos de cuerpo celeste para la pestaña "Cuerpo celeste".
 *
 * Fuente: la carpeta "planets/" de la API de assets de Stellaris
 * (StellarisAssetsTree.txt), que trae un icono por cada clase de planeta
 * jugable del juego. No hay una página de la Wiki dedicada a "tipos de
 * planeta" entre las que me ha pasado Morteux, así que esta lista sale
 * directamente de qué iconos existen ahí (igual que el bingo de orígenes/
 * principios sale de qué iconos hay en sus carpetas), no de texto inventado.
 *
 * category: "natural" (cuerpos que se encuentran así, aunque hayan sufrido
 * un evento especial: mundo Gaia, mundo tumba, mundo reliquia, mundo
 * colmena) o "artificial" (construido o transformado por completo por una
 * civilización: hábitat, ecumenópolis, anillo mundial, mundo máquina,
 * mundo nanorrobot, telar sináptico).
 */
import { STELLARIS_ASSETS_BASE } from "./asset-config.js";

export const IMAGE_BASE = STELLARIS_ASSETS_BASE;

export const PLANET_TYPES = [
  { id: "continental", img: "planets/Planet_continental.png", i18nKey: "planetTypeContinental", category: "natural" },
  { id: "ocean", img: "planets/Planet_ocean.png", i18nKey: "planetTypeOcean", category: "natural" },
  { id: "tropical", img: "planets/Planet_tropical.png", i18nKey: "planetTypeTropical", category: "natural" },
  { id: "savannah", img: "planets/Planet_savannah.png", i18nKey: "planetTypeSavannah", category: "natural" },
  { id: "arid", img: "planets/Planet_arid.png", i18nKey: "planetTypeArid", category: "natural" },
  { id: "desert", img: "planets/Planet_desert.png", i18nKey: "planetTypeDesert", category: "natural" },
  { id: "tundra", img: "planets/Planet_tundra.png", i18nKey: "planetTypeTundra", category: "natural" },
  { id: "arctic", img: "planets/Planet_arctic.png", i18nKey: "planetTypeArctic", category: "natural" },
  { id: "alpine", img: "planets/Planet_alpine.png", i18nKey: "planetTypeAlpine", category: "natural" },
  { id: "volcanic", img: "planets/Planet_volcanic.png", i18nKey: "planetTypeVolcanic", category: "natural" },
  { id: "gaia", img: "planets/Planet_gaia.png", i18nKey: "planetTypeGaia", category: "natural" },
  { id: "tomb", img: "planets/Planet_tomb.png", i18nKey: "planetTypeTomb", category: "natural" },
  { id: "relic", img: "planets/Planet_relic.png", i18nKey: "planetTypeRelic", category: "natural" },
  { id: "hive", img: "planets/Planet_hive.png", i18nKey: "planetTypeHive", category: "natural" },
  { id: "habitat", img: "planets/Planet_habitat.png", i18nKey: "planetTypeHabitat", category: "artificial" },
  { id: "city", img: "planets/Planet_city.png", i18nKey: "planetTypeCity", category: "artificial" },
  { id: "ringworld", img: "planets/Planet_ringworld.png", i18nKey: "planetTypeRingworld", category: "artificial" },
  { id: "shatteredRingworld", img: "planets/Planet_shattered_ringworld.png", i18nKey: "planetTypeShatteredRingworld", category: "artificial" },
  { id: "machine", img: "planets/Planet_machine.png", i18nKey: "planetTypeMachine", category: "artificial" },
  { id: "nanite", img: "planets/Planet_nanite.png", i18nKey: "planetTypeNanite", category: "artificial" },
  { id: "synapticLathe", img: "planets/Planet_synaptic_lathe.png", i18nKey: "planetTypeSynapticLathe", category: "artificial" }
];

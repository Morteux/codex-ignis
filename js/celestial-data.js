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
 * standard: true marca los 9 planetas normales por defecto (Continental, Oceánico,
 * Tropical, Sabana, Árido, Desértico, Tundra, Ártico, Alpino): el tipo inicial
 * aleatorio sale de ahí y son los que admiten las designaciones "normales".
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
  { id: "continental", standard: true, img: "planets/Planet_continental.png", i18nKey: "planetTypeContinental", category: "natural" },
  { id: "ocean", standard: true, img: "planets/Planet_ocean.png", i18nKey: "planetTypeOcean", category: "natural" },
  { id: "tropical", standard: true, img: "planets/Planet_tropical.png", i18nKey: "planetTypeTropical", category: "natural" },
  { id: "savannah", standard: true, img: "planets/Planet_savannah.png", i18nKey: "planetTypeSavannah", category: "natural" },
  { id: "arid", standard: true, img: "planets/Planet_arid.png", i18nKey: "planetTypeArid", category: "natural" },
  { id: "desert", standard: true, img: "planets/Planet_desert.png", i18nKey: "planetTypeDesert", category: "natural" },
  { id: "tundra", standard: true, img: "planets/Planet_tundra.png", i18nKey: "planetTypeTundra", category: "natural" },
  { id: "arctic", standard: true, img: "planets/Planet_arctic.png", i18nKey: "planetTypeArctic", category: "natural" },
  { id: "alpine", standard: true, img: "planets/Planet_alpine.png", i18nKey: "planetTypeAlpine", category: "natural" },
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

/** Categorías de designación (designation-data.js) que admite cada tipo de cuerpo celeste. Los 9 normales + el resto de naturales admiten las designaciones de planeta normal. */
const NORMAL_DESIGNATION_CATEGORIES = ["unity", "urban", "standard", "specialized"];
export function allowedDesignationCategories(typeId) {
  switch (typeId) {
    case "hive": return ["hiveWorld"];
    case "machine":
    case "nanite": return ["machineWorld"];
    case "habitat": return ["habitat"];
    case "city": return ["ecumenopolis"];
    case "ringworld":
    case "shatteredRingworld": return ["ringWorld"];
    case "synapticLathe": return ["synapticLathe"];
    default: {
      const type = PLANET_TYPES.find((entry) => entry.id === typeId);
      if (!type) return NORMAL_DESIGNATION_CATEGORIES;
      // Volcánico/Gaia/Tumba/Reliquia: también admiten las del origen Naturaleza salvaje.
      return type.standard ? NORMAL_DESIGNATION_CATEGORIES : [...NORMAL_DESIGNATION_CATEGORIES, "wilderness"];
    }
  }
}

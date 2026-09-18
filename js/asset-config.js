/**
 * Configuración central del origen de las imágenes de Stellaris usadas en
 * el sitio. Hay DOS orígenes independientes:
 *
 * 1. ASSET_BASE → para las imágenes de las entradas del codex (content.js,
 *    vía js/app.js). Se deja vacío ("") porque en content.js decides tú,
 *    entrada por entrada, si pegas una ruta local del propio proyecto
 *    (ej. "img/naves/Corbeta.png") o una URL absoluta completa, ya sea de
 *    la API de assets (ver STELLARIS_ASSETS_BASE) o de donde despliegues en
 *    Vercel. resolveAssetUrl() deja intacta cualquier URL absoluta
 *    (http/https) o data URI, así que ambos casos funcionan sin tocar nada
 *    aquí; solo se usa ASSET_BASE para completar rutas relativas.
 *
 * 2. STELLARIS_ASSETS_BASE → para las imágenes que SIEMPRE se sirven desde
 *    la API de assets (repo StellarisAssets en GitHub Pages): por ahora
 *    bingo.html (js/bingo-data.js, vía IMAGE_BASE) y, en el futuro,
 *    planet-sim.html. La estructura de esa API es siempre
 *    "https://morteux.github.io/StellarisAssets/<carpeta>/<archivo>.png",
 *    por ejemplo:
 *    https://morteux.github.io/StellarisAssets/buildings/aesthetic_wonders_holomuseum.png
 *    Las rutas guardadas en bingo-data.js son relativas a esta base (por
 *    ejemplo "origins/GFX_origin_default.png" o "civics/Civic_x.png"), sin
 *    el prefijo "img/" que sí se usa en las rutas locales del proyecto.
 */
export const ASSET_BASE = "";

export const STELLARIS_ASSETS_BASE = "https://morteux.github.io/StellarisAssets/";

/**
 * Antepone ASSET_BASE a una ruta de imagen relativa. Si la ruta ya es una
 * URL absoluta (http/https) o un data URI, se devuelve tal cual, para no
 * romper enlaces que ya se hayan guardado como URL completa a otro origen.
 */
export function resolveAssetUrl(path) {
  if (!path) return path;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${ASSET_BASE}${path}`;
}

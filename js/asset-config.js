/**
 * Configuración central del origen de las imágenes de Stellaris (naves,
 * orígenes, principios/civics, fauna, citas, etc.) usadas en todo el sitio.
 *
 * Ahora mismo todas las imágenes viven en la carpeta img/ de este mismo
 * repositorio, así que ASSET_BASE se deja vacío ("") y las rutas guardadas
 * en content.js y bingo-data.js (por ejemplo "img/naves/Corbeta.png") se
 * sirven tal cual, en local.
 *
 * ── Cuando muevas las imágenes a un repositorio de solo assets ────────────
 * (por ejemplo, publicado con GitHub Pages, o servido directamente desde
 * GitHub vía jsDelivr sin necesidad de activar Pages), solo tienes que
 * cambiar esta constante por la URL base de ese origen, terminada en "/".
 * Por ejemplo:
 *
 *   export const ASSET_BASE = "https://tu-usuario.github.io/stellaris-assets/";
 *   // o, sirviendo el repo directamente vía jsDelivr:
 *   export const ASSET_BASE = "https://cdn.jsdelivr.net/gh/tu-usuario/stellaris-assets@main/";
 *
 * No hace falta tocar nada más: ni content.js, ni bingo-data.js, ni el resto
 * del sitio. Todas las rutas de imagen relativas ("img/...") se resuelven a
 * través de esta constante mediante resolveAssetUrl(), tanto para las
 * imágenes de las entradas del codex (js/app.js) como para las del bingo
 * (js/bingo.js, a través de IMAGE_BASE en js/bingo-data.js, que reexporta
 * este mismo valor).
 *
 * Esto es independiente de dónde se despliegue el propio sitio (GitHub
 * Pages, Vercel, etc.): ASSET_BASE solo controla de dónde vienen las
 * imágenes, no dónde vive el código del sitio.
 */
export const ASSET_BASE = "";

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

/**
 * Diccionario de resaltado automático de palabras.
 *
 * Cada clave es la palabra tal y como quieres que se vea escrita (se usará
 * el texto original del artículo, no esta clave, así que mayúsculas/minúsculas
 * del propio artículo se respetan). El valor es el color en hexadecimal que
 * se le aplicará.
 *
 * La búsqueda de coincidencias ignora mayúsculas/minúsculas y solo colorea
 * la palabra completa (p. ej. "aura" no coloreará "auras" ni "auradas").
 * Si quieres cubrir singular y plural, o con y sin tilde, añade ambas
 * entradas por separado.
 *
 * Ejemplo rápido: descomenta y ajusta las líneas de abajo.
 */
export const highlightWords = {
  "Emperador": "#f5c344",
  "titán": "#7fd1ff",
  "titanes": "#7fd1ff",
  "aura": "#a7f56a",
  "auras": "#a7f56a",
  "ofensiva": "#ff8a65",
  "ofensivas": "#ff8a65",
  "defensiva": "#63c7ff",
  "defensivas": "#63c7ff"
};

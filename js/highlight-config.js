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
  "corbeta": "#d3d3d3",
  "corbetas": "#d3d3d3",
  "destructor": "#55ff37",
  "destructores": "#55ff37",
  "crucero": "#375cff",
  "cruceros": "#375cff",
  "acorazado": "#ca29ff",
  "acorazados": "#ca29ff",
  "titán": "#fff42b",
  "titanes": "#fff42b",
  
  "aura": "#ff2c2c",
  "auras": "#ff2c2c"
};

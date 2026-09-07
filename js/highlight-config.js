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

    ////////////////////////////////////////////////////////// Español
    "corbeta": "#d3d3d3",
    "corbetas": "#d3d3d3",
    "fragata": "#beffa0",
    "fragatas": "#beffa0",
    "destructor": "#55ff37",
    "destructores": "#55ff37",
    "crucero": "#375cff",
    "cruceros": "#375cff",
    "acorazado": "#ca29ff",
    "acorazados": "#ca29ff",
    "titán": "#fff42b",
    "titanes": "#fff42b",

    "base estelar": "#2bff2b",
    "bases estelares": "#2bff2b",
    "plataforma de defensa": "#20c420",
    "plataformas de defensa": "#20c420",
    "coloso": "#ff2b2b",
    "colosos": "#ff2b2b",
    "cañón de iones": "#20c420",
    "cañones de iones": "#20c420",
    "ciudadela de espacio profundo": "#75ff75",
    "ciudadelas de espacio profundo": "#75ff75",

    "inesperados": "#332cff",
    "vehements": "#fbff2c",
    "aberrantes": "#2cff30",
    "prethoryn": "#ffb92c",
    "contingencia": "#ff0000",
    "cetana": "#fff42c",
    "reina sintetica": "#fff42c",

    "cinetica": "#ffae2c",
    "cineticas": "#ffae2c",
    "energia": "#2c33ff",
    "energias": "#2c33ff",
    "penetración": "#ff2cce",
    "endurecimiento": "#ad208c",

    "casco": "#ff5752",
    "cascos": "#ff5752",
    "blindaje": "#ffae2c",
    "blindajes": "#ffae2c",
    "escudo": "#2c33ff",
    "escudos": "#2c33ff",

    "materia oscura": "#8900af",
    "psionico": "#8900af",
    "psionicos": "#8900af",

    ////////////////////////////////////////////////////////// English
    "corvette": "#d3d3d3",
    "corvettes": "#d3d3d3",
    "destroyer": "#55ff37",
    "destroyers": "#55ff37",
    "cruiser": "#375cff",
    "cruisers": "#375cff",
    "battleship": "#ca29ff",
    "battleships": "#ca29ff",
    "titan": "#fff42b",
    "titans": "#fff42b",

    "unbidden": "#332cff",
    "vehement": "#fbff2c",
    "aberrant": "#2cff30",
    "prethoryn": "#ffb92c",
    "contingency": "#ff0000",
    "cetana": "#fff42c",
    "synthetic queen": "#fff42c",

    "kinetic": "#ffae2c",
    "kinetics": "#ffae2c",
    "energy": "#2c33ff",
    "energies": "#2c33ff",

    "hull": "#ffae2c",
    "hulls": "#ffae2c",
    "shield": "#2c33ff",
    "shields": "#2c33ff",

    "dark matter": "#8900af",
    "psionic": "#8900af",
    "psionics": "#8900af",

    ////////////////////////////////////////////////////////// 日本語
    "コルベット": "#d3d3d3",
    "駆逐艦": "#55ff37",
    "巡洋艦": "#375cff",
    "戦艦": "#ca29ff",
    "タイタン": "#fff42b",

    "予想外": "#332cff",
    "ヴェーメント": "#fbff2c",
    "アベラント": "#2cff30",
    "プレスリン": "#ffb92c",
    "コンティンジェンシー": "#ff0000",
    "セタナ": "#fff42c",
    "合成の女王": "#fff42c",

    "運動": "#ffae2c",
    "エネルギー": "#2c33ff",

    "船体": "#ffae2c",
    "シールド": "#2c33ff",

    "ダークマター": "#8900af",
    "サイオニック": "#8900af"
};

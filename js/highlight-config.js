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
    
    "macero": "#d3d3d3",
    "maceros": "#d3d3d3",
    "tejedor": "#55ff37",
    "tejedores": "#55ff37",
    "heraldo": "#375cff",
    "heraldos": "#375cff",
    "aguijon": "#ca29ff",
    "aguijones": "#ca29ff",

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
    "vehementes": "#fbff2c",
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
    "frigate": "#beffa0",
    "frigates": "#beffa0",
    "destroyer": "#55ff37",
    "destroyers": "#55ff37",
    "cruiser": "#375cff",
    "cruisers": "#375cff",
    "battleship": "#ca29ff",
    "battleships": "#ca29ff",
    "titan": "#fff42b",
    "titans": "#fff42b",
    
    "mace": "#d3d3d3",
    "maces": "#d3d3d3",
    "weaver": "#55ff37",
    "weavers": "#55ff37",
    "herald": "#375cff",
    "heralds": "#375cff",
    "stinger": "#ca29ff",
    "stingers": "#ca29ff",

    "starbase": "#2bff2b",
    "starbases": "#2bff2b",
    "defense platform": "#20c420",
    "defense platforms": "#20c420",
    "colossus": "#ff2b2b",
    "colossi": "#ff2b2b",
    "ion cannon": "#20c420",
    "ion cannons": "#20c420",
    "deep space citadel": "#75ff75",
    "deep space citadels": "#75ff75",

    "unbidden": "#332cff",
    "vehement": "#fbff2c",
    "aberrant": "#2cff30",
    "prethoryn": "#ffb92c",
    "contingency": "#ff0000",
    "Cetana": "#fff42c",
    "synthetic queen": "#fff42c",

    "kinetic": "#ffae2c",
    "kinetics": "#ffae2c",
    "energy": "#2c33ff",
    "energies": "#2c33ff",
    "penetration": "#ff2cce",
    "hardening": "#ad208c",

    "hull": "#ff5752",
    "hulls": "#ff5752",
    "armor": "#ffae2c",
    "armors": "#ffae2c",
    "shield": "#2c33ff",
    "shields": "#2c33ff",

    "dark matter": "#8900af",
    "psionic": "#8900af",
    "psionics": "#8900af",

    ////////////////////////////////////////////////////////// 日本語
    "コルベット": "#d3d3d3",
    "コルベット": "#d3d3d3",
    "フリゲート": "#beffa0",
    "フリゲート": "#beffa0",
    "駆逐艦": "#55ff37",
    "駆逐艦": "#55ff37",
    "巡洋艦": "#375cff",
    "巡洋艦": "#375cff",
    "戦艦": "#ca29ff",
    "戦艦": "#ca29ff",
    "タイタン": "#fff42b",
    "タイタン": "#fff42b",
    
    "メイス": "#d3d3d3",
    "メイス": "#d3d3d3",
    "ウィーバー": "#55ff37",
    "ウィーバー": "#55ff37",
    "ヘラルド": "#375cff",
    "ヘラルド": "#375cff",
    "スティンガー": "#ca29ff",
    "スティンガー": "#ca29ff",

    "星系基地": "#2bff2b",
    "星系基地": "#2bff2b",
    "防衛プラットフォーム": "#20c420",
    "防衛プラットフォーム": "#20c420",
    "コロッサス": "#ff2b2b",
    "コロッサス": "#ff2b2b",
    "イオンキャノン": "#20c420",
    "イオンキャノン": "#20c420",
    "深宇宙要塞": "#75ff75",
    "深宇宙要塞": "#75ff75",

    "アンビデン": "#332cff",
    "ヴェヘメント": "#fbff2c",
    "アベラント": "#2cff30",
    "プレソリン": "#ffb92c",
    "コンティンジェンシー": "#ff0000",
    "セタナ": "#fff42c",
    "人工生命体の女王": "#fff42c",

    "運動エネルギー": "#ffae2c",
    "運動エネルギー": "#ffae2c",
    "エネルギー": "#2c33ff",
    "エネルギー": "#2c33ff",
    "貫通": "#ff2cce",
    "硬化": "#ad208c",

    "船体": "#ff5752",
    "船体": "#ff5752",
    "装甲": "#ffae2c",
    "装甲": "#ffae2c",
    "シールド": "#2c33ff",
    "シールド": "#2c33ff",

    "ダークマター": "#8900af",
    "サイオニック": "#8900af",
    "サイオニック": "#8900af",};

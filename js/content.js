/**
 * Fuente de datos para los artículos de la wiki.
 *
 * Traducciones: añade un objeto `i18n` con el código de idioma como clave
 * (ej. "en") y dentro `title`/`blocks` con la versión traducida. Si un idioma
 * no tiene traducción, se usa el contenido por defecto (español).
 *
 * Easter eggs: añade `hidden: true` y un array `triggers` con las palabras o
 * frases secretas. La entrada nunca aparece en el índice ni al buscar por su
 * título; solo se revela cuando el texto buscado coincide (total o
 * parcialmente) con alguno de los triggers. Si alguien conoce la URL exacta
 * (#/slug), también puede abrirla directamente.
 *
 * ── Formato dentro del texto ──────────────────────────────────────────────
 * En cualquier campo "text" (de paragraph, heading, note, quote) o dentro de
 * los "items" de una lista puedes usar:
 *   - **negrita**            → se muestra en negrita
 *   - [texto](https://url)   → se convierte en un enlace que abre en pestaña nueva
 * El resaltado automático de palabras (ver js/highlight-config.js) se aplica
 * encima de esto, así que no tienes que hacer nada extra para que funcione.
 *
 * ── Tipos de bloque disponibles ───────────────────────────────────────────
 * { type: "paragraph", text: "..." }
 *   Un párrafo normal.
 *
 * { type: "heading", text: "...", level: 1 }
 *   Un subtítulo dentro del artículo (útil para dividir en secciones).
 *   "level" es opcional (por defecto 1) y controla el tamaño:
 *     1 → subtítulo normal (el de siempre, el que ya usan todas las entradas)
 *     2 → subsubtítulo, más pequeño (para dividir dentro de un subtítulo)
 *     3 → subsubsubtítulo, aún más pequeño y en mayúsculas discretas
 *   No hace falta tocar las entradas existentes: si no se indica "level",
 *   se sigue viendo exactamente igual que antes.
 *
 * { type: "list", items: ["...", "..."] }
 *   Lista con viñetas.
 *
 * { type: "links", items: [{ label: "...", url: "https://...", description: "..." }] }
 *   Lista de enlaces externos. "description" es opcional.
 *
 * { type: "image", src: "ruta-o-url.jpg", alt: "texto alternativo", caption: "..." }
 *   Imagen con pie de foto opcional. "caption" es opcional. Al hacer clic en
 *   ella se abre automáticamente en grande, centrada en pantalla y a su
 *   resolución original (no hace falta configurar nada extra para esto).
 *
 * { type: "columns", columns: [ [bloque, bloque, ...], [bloque, bloque, ...] ] }
 *   Dos columnas de contenido en paralelo (texto, imágenes, listas... lo que
 *   sea). Cada columna es un array con los mismos tipos de bloque de esta
 *   lista (puedes meter varios bloques por columna). En pantallas estrechas
 *   (móvil) las columnas se apilan automáticamente una debajo de la otra.
 *   Ejemplo:
 *   {
 *     type: "columns",
 *     columns: [
 *       [{ type: "image", src: "img/a.png", alt: "A", caption: "Diseño A" }],
 *       [{ type: "image", src: "img/b.png", alt: "B", caption: "Diseño B" }]
 *     ]
 *   }
 *
 * { type: "note", text: "..." }
 *   Recuadro destacado para avisos o consejos.
 *
 * { type: "quote", text: "...", cite: "...", portrait: "ruta-o-url.jpg", portraitAlt: "..." }
 *   Cita destacada. "cite" (autor/fuente) es opcional. "portrait" es opcional:
 *   añade un pequeño retrato circular junto a la cita (se puede pulsar para
 *   verlo en grande, igual que las imágenes normales). "portraitAlt" es
 *   opcional (texto alternativo de la imagen; si no se indica, se usa "cite").
 *
 * { type: "divider" }
 *   Separador visual simple, no necesita más campos.
 * 
 */

export const knowledgeBase = [
    {   // Diseño de naves mecánicas
        slug: "diseño-naves-mecnicas",
        title: "Diseño de naves mecánicas",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Corbeta" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Corbeta generalista.png", alt: "Corbeta generalista", caption: "Corbeta generalista." }],
                    [{ type: "image", src: "img/naves/Corbeta contra fauna.png", alt: "Corbeta early y mid game contra fauna espacial", caption: "Corbeta early y mid game contra fauna espacial." }]
                ]
            },
            { type: "heading", text: "Fragata" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "Fragata torpedera de corto alcance", caption: "Fragata torpedera de corto alcance con sigilo." }],
                    [{ type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "Fragata torpedera de largo alcance", caption: "Fragata torpedera de largo alcance." }]
                ]
            },

            { type: "heading", text: "Destructor" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Destructor artillero.png", alt: "Destructor artillero", caption: "Destructor artillero." }],
                    [{ type: "image", src: "img/naves/Destructor con defensa de punto.png", alt: "Destructor con defensa de punto", caption: "Destructor con defensa de punto." }]
                ]
            },
            { type: "divider" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Destructor anti corbetas.png", alt: "Destructor anti corbetas", caption: "Destructor anti corbetas." }],
                    []
                ]
            },

            { type: "heading", text: "Crucero" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Crucero torpedero con defensas de corto alcance.png", alt: "Crucero torpedero con defensas de corto alcance", caption: "Crucero torpedero con defensas de corto alcance." }],
                    [{ type: "image", src: "img/naves/Crucero torpedero de corto alcance con sigilo.png", alt: "Crucero torpedero de corto alcance con sigilo", caption: "Crucero torpedero de corto alcance con sigilo." }]
                ]
            },
            { type: "divider" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Crucero torpedero con misiles de largo alcance.png", alt: "Crucero torpedero con misiles de largo alcance", caption: "Crucero torpedero con misiles de largo alcance." }],
                    []
                ]
            },

            { type: "heading", text: "Acorazado" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Acorazado artillero.png", alt: "Acorazado artillero", caption: "Acorazado artillero." }],
                    [{ type: "image", src: "img/naves/Acorazado portahangares.png", alt: "Acorazado portahangares", caption: "Acorazado portahangares." }]
                ]
            },

            { type: "heading", text: "Titán" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Titan artillero.png", alt: "Titán artillero", caption: "Titán artillero. Uno por cada tipo de aura ofensiva y defensiva." }],
                    []
                ]
            },

            { type: "heading", text: "Gigante" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Gigante artillero de apoyo.png", alt: "Gigante artillero de apoyo", caption: "Gigante artillero de apoyo." }],
                    []
                ]
            },

            { type: "heading", text: "Coloso" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Coloso.png", alt: "Coloso", caption: "" }],
                    []
                ]
            },

            { type: "heading", text: "Base estelar" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Base estelar artillada.png", alt: "Base estelar artillada", caption: "Base estelar artillada." }],
                    [{ type: "image", src: "img/naves/Base estelar portahangares.png", alt: "Base estelar portahangares", caption: "Base estelar portahangares." }]
                ]
            },

            { type: "heading", text: "Plataforma de defensa" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Plataforma portahangar de largo alcance.png", alt: "Plataforma portahangar de largo alcance", caption: "Plataforma portahangar de largo alcance." }],
                    [{ type: "image", src: "img/naves/Plataforma torpedera de corto alcance.png", alt: "Plataforma torpedera de corto alcance", caption: "Plataforma torpedera de corto alcance." }]
                ]
            },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Plataforma artillada de corto alcance.png", alt: "Plataforma artillada de corto alcance", caption: "Plataforma artillada de corto alcance." }],
                    []
                ]
            },

            { type: "heading", text: "Cañón de iones" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Canon de iones equilibrado estandar.png", alt: "Cañón de iones equilibrado estándar", caption: "Cañón de iones equilibrado estándar." }],
                    []
                ]
            },

            { type: "heading", text: "Ciudadela de espacio profundo" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Ciudadela I de largo alcance.png", alt: "Ciudadela I de largo alcance", caption: "Ciudadela I de largo alcance." }],
                    [{ type: "image", src: "img/naves/Ciudadela II de largo alcance.png", alt: "Ciudadela II de largo alcance", caption: "Ciudadela II de largo alcance." }]
                ]
            },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/naves/Ciudadela III de largo alcance.png", alt: "Ciudadela III de largo alcance", caption: "Ciudadela III de largo alcance." }],
                    [{ type: "image", src: "img/naves/Ciudadela III de corto alcance.png", alt: "Ciudadela III de corto alcance", caption: "Ciudadela III de corto alcance." }]
                ]
            },

            { type: "divider" },
            { type: "quote", text: "Dicen que la única diferencia entre la ciencia y la magia, es que la magia es ciencia que aún no comprendemos.", cite: "Director Científico Bjørn Gundersen de la Sociedad de Investigación Gundersen", portrait: "img/citas/Human_updated_version.png", portraitAlt: "Director Científico Bjørn Gundersen" }
        ],
        i18n: {
            en: {
                title: "Machine ship design",
                icon: "✦",
                blocks: [
                    { type: "heading", text: "Corvette" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Corbeta generalista.png", alt: "General-purpose Corvette", caption: "General-purpose Corvette." }],
                            [{ type: "image", src: "img/naves/Corbeta contra fauna.png", alt: "Early and mid game Corvette against space fauna", caption: "Early and mid game Corvette against space fauna." }]
                        ]
                    },
                    { type: "heading", text: "Frigate" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "Short-range Torpedo Frigate", caption: "Short-range Torpedo Frigate with Cloaking." }],
                            [{ type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "Long-range Torpedo Frigate", caption: "Long-range Torpedo Frigate." }]
                        ]
                    },

                    { type: "heading", text: "Destroyer" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Destructor artillero.png", alt: "Artillery Destroyer", caption: "Artillery Destroyer." }],
                            [{ type: "image", src: "img/naves/Destructor con defensa de punto.png", alt: "Destroyer with Point Defense", caption: "Destroyer with Point Defense." }]
                        ]
                    },
                    { type: "divider" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Destructor anti corbetas.png", alt: "Anti-Corvette Destroyer", caption: "Anti-Corvette Destroyer." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Cruiser" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Crucero torpedero con defensas de corto alcance.png", alt: "Torpedo Cruiser with short-range defenses", caption: "Torpedo Cruiser with short-range defenses." }],
                            [{ type: "image", src: "img/naves/Crucero torpedero de corto alcance con sigilo.png", alt: "Short-range Torpedo Cruiser with Cloaking", caption: "Short-range Torpedo Cruiser with Cloaking." }]
                        ]
                    },
                    { type: "divider" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Crucero torpedero con misiles de largo alcance.png", alt: "Torpedo Cruiser with long-range missiles", caption: "Torpedo Cruiser with long-range missiles." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Battleship" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Acorazado artillero.png", alt: "Artillery Battleship", caption: "Artillery Battleship." }],
                            [{ type: "image", src: "img/naves/Acorazado portahangares.png", alt: "Carrier Battleship", caption: "Carrier Battleship." }]
                        ]
                    },

                    { type: "heading", text: "Titan" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Titan artillero.png", alt: "Artillery Titan", caption: "Artillery Titan. One for each type of offensive and defensive aura." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Juggernaut" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Gigante artillero de apoyo.png", alt: "Support Artillery Juggernaut", caption: "Support Artillery Juggernaut." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Colossus" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Coloso.png", alt: "Colossus", caption: "" }],
                            []
                        ]
                    },

                    { type: "heading", text: "Starbase" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Base estelar artillada.png", alt: "Artillery Starbase", caption: "Artillery Starbase." }],
                            [{ type: "image", src: "img/naves/Base estelar portahangares.png", alt: "Carrier Starbase", caption: "Carrier Starbase." }]
                        ]
                    },

                    { type: "heading", text: "Defense Platform" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Plataforma portahangar de largo alcance.png", alt: "Long-range Carrier Defense Platform", caption: "Long-range Carrier Defense Platform." }],
                            [{ type: "image", src: "img/naves/Plataforma torpedera de corto alcance.png", alt: "Short-range Torpedo Defense Platform", caption: "Short-range Torpedo Defense Platform." }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Plataforma artillada de corto alcance.png", alt: "Short-range Artillery Defense Platform", caption: "Short-range Artillery Defense Platform." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Ion Cannon" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Canon de iones equilibrado estandar.png", alt: "Standard balanced Ion Cannon", caption: "Standard balanced Ion Cannon." }],
                            []
                        ]
                    },

                    { type: "heading", text: "Deep Space Citadel" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Ciudadela I de largo alcance.png", alt: "Long-range Citadel I", caption: "Long-range Citadel I." }],
                            [{ type: "image", src: "img/naves/Ciudadela II de largo alcance.png", alt: "Long-range Citadel II", caption: "Long-range Citadel II." }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Ciudadela III de largo alcance.png", alt: "Long-range Citadel III", caption: "Long-range Citadel III." }],
                            [{ type: "image", src: "img/naves/Ciudadela III de corto alcance.png", alt: "Short-range Citadel III", caption: "Short-range Citadel III." }]
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "They say the only difference between science and magic is that magic is science we do not yet understand.", cite: "Director of Science Bjørn Gundersen of the Gundersen Research Society", portrait: "img/citas/Human_updated_version.png", portraitAlt: "Director of Science Bjørn Gundersen" }]
            },
            jp: {
                title: "艦船設計",
                icon: "✦",
                blocks: [
                    { type: "heading", text: "コルベット" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Corbeta generalista.png", alt: "汎用型コルベット", caption: "汎用型コルベット。" }],
                            [{ type: "image", src: "img/naves/Corbeta contra fauna.png", alt: "宇宙生物対策用の序盤・中盤コルベット", caption: "宇宙生物対策用の序盤・中盤コルベット。" }]
                        ]
                    },
                    { type: "heading", text: "フリゲート" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "短距離魚雷フリゲート", caption: "クローキング搭載の短距離魚雷フリゲート。" }],
                            [{ type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "長距離魚雷フリゲート", caption: "長距離魚雷フリゲート。" }]
                        ]
                    },

                    { type: "heading", text: "駆逐艦" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Destructor artillero.png", alt: "砲撃型駆逐艦", caption: "砲撃型駆逐艦。" }],
                            [{ type: "image", src: "img/naves/Destructor con defensa de punto.png", alt: "ポイント・ディフェンス搭載駆逐艦", caption: "ポイント・ディフェンス搭載駆逐艦。" }]
                        ]
                    },
                    { type: "divider" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Destructor anti corbetas.png", alt: "対コルベット駆逐艦", caption: "対コルベット駆逐艦。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "巡洋艦" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Crucero torpedero con defensas de corto alcance.png", alt: "短距離防御型魚雷巡洋艦", caption: "短距離防御型魚雷巡洋艦。" }],
                            [{ type: "image", src: "img/naves/Crucero torpedero de corto alcance con sigilo.png", alt: "クローキング搭載短距離魚雷巡洋艦", caption: "クローキング搭載短距離魚雷巡洋艦。" }]
                        ]
                    },
                    { type: "divider" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Crucero torpedero con misiles de largo alcance.png", alt: "長距離ミサイル搭載魚雷巡洋艦", caption: "長距離ミサイル搭載魚雷巡洋艦。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "戦艦" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Acorazado artillero.png", alt: "砲撃型戦艦", caption: "砲撃型戦艦。" }],
                            [{ type: "image", src: "img/naves/Acorazado portahangares.png", alt: "空母型戦艦", caption: "空母型戦艦。" }]
                        ]
                    },

                    { type: "heading", text: "タイタン" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Titan artillero.png", alt: "砲撃型タイタン", caption: "砲撃型タイタン。攻撃・防御オーラの各タイプにつき1隻。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "ジャガーノート" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Gigante artillero de apoyo.png", alt: "支援砲撃型ジャガーノート", caption: "支援砲撃型ジャガーノート。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "コロッサス" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Coloso.png", alt: "コロッサス", caption: "" }],
                            []
                        ]
                    },

                    { type: "heading", text: "星系基地" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Base estelar artillada.png", alt: "砲撃型星系基地", caption: "砲撃型星系基地。" }],
                            [{ type: "image", src: "img/naves/Base estelar portahangares.png", alt: "空母型星系基地", caption: "空母型星系基地。" }]
                        ]
                    },

                    { type: "heading", text: "防衛プラットフォーム" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Plataforma portahangar de largo alcance.png", alt: "長距離空母型防衛プラットフォーム", caption: "長距離空母型防衛プラットフォーム。" }],
                            [{ type: "image", src: "img/naves/Plataforma torpedera de corto alcance.png", alt: "短距離魚雷防衛プラットフォーム", caption: "短距離魚雷防衛プラットフォーム。" }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Plataforma artillada de corto alcance.png", alt: "短距離砲撃型防衛プラットフォーム", caption: "短距離砲撃型防衛プラットフォーム。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "イオンキャノン" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Canon de iones equilibrado estandar.png", alt: "標準型バランス型イオンキャノン", caption: "標準型バランス型イオンキャノン。" }],
                            []
                        ]
                    },

                    { type: "heading", text: "深宇宙要塞" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Ciudadela I de largo alcance.png", alt: "長距離型要塞 I", caption: "長距離型要塞 I。" }],
                            [{ type: "image", src: "img/naves/Ciudadela II de largo alcance.png", alt: "長距離型要塞 II", caption: "長距離型要塞 II。" }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/naves/Ciudadela III de largo alcance.png", alt: "長距離型要塞 III", caption: "長距離型要塞 III。" }],
                            [{ type: "image", src: "img/naves/Ciudadela III de corto alcance.png", alt: "短距離型要塞 III", caption: "短距離型要塞 III。" }]
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "科学と魔法の唯一の違いは、魔法とはまだ理解されていない科学だと言われている。", cite: "ガンダーセン研究協会 科学主任ビョルン・ガンダーセン", portrait: "img/citas/Human_updated_version.png", portraitAlt: "科学主任ビョルン・ガンダーセン" }]
            }
        }
    },
    {   // Diseño de flotas mecánicas
        slug: "diseño-flotas-mecnicas",
        title: "Diseño de flotas mecánicas",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Inicio de juego" },

            { type: "heading", text: "Solo corbetas", level: 2 },
            { type: "paragraph", text: "Lo más básico para el año 2200." },
            { type: "paragraph", text: "Los enemigos serán aleatorios y no podrás saber nada de ellos ya que no podrás espiarles efectivamente. Solo podrás saber como contrarrestar su flota una vez que ocurra la primera batalla (viendo el log y los componentes enemigos), que en el early game suele ser también la última, así que lo más viable es prepararse contra todo." },
            { type: "paragraph", text: "Si tienes problemas de amebas o drones mineros, usa armas de energía. Si tienes problemas con entidades de energía, usa armas cinéticas. Simplemente, haz el protocolo de primer contacto y mira el blindaje y escudo." },
            { type: "paragraph", text: "Recomendado usar láser de dron minero si lo tienes disponible hasta contar con plasma y/o cañones automáticos." },

            { type: "heading", text: "Solo destructores", level: 2 },
            { type: "paragraph", text: "Con un diseño especializado, puede superar una flota de corbetas híbrida con armas de energía y cinéticas. El problema es que escalan bastante mal en las siguientes etapas del juego." },
            { type: "paragraph", text: "No obstante, ahora las corbetas también escalan bastante mal, así que en partidas de larga duración, no es mala idea hacer algunos destructores para tener ventaja sobre las corbetas del early game." },

            { type: "heading", text: "Apoyo de fragatas", level: 2 },
            { type: "paragraph", text: "Con el nuevo ordenador de combate de asedio, combinar fragatas con corbetas y/o destructores en el early game es muy buena idea para destruir puntos de choque y estaciones defensivas con mucha potencia de flota. Puesto que son objetivos muy duros para las corbetas y los destructores, pero con unas fragatas torpederas, puedes darle fácilmente la vuelta al combate." },
            { type: "divider" },

            { type: "heading", text: "Mitad de juego" },

            { type: "heading", text: "Solo corbetas", level: 2 },
            { type: "paragraph", text: "En caso de una flota solo de corbetas híbridas puede funcionar, pero las pérdidas tras cada combate son aseguradas, lo que socavará tu economía aún en desarrollo. Poco recomendable en guerras de desgaste. Llegados a este punto, deja de construir corbetas y centrate en fragatas y cruceros." },

            { type: "heading", text: "Solo cruceros", level: 2 },
            { type: "paragraph", text: "Primera versión de una flota de hangares. Dado que aún no tenemos muchas opciones para nuestras armas, puedes acompañar los hangares con solo misiles y defensa de punto. Si tuvieras los torpedos de largo alcance sería la mejor opción." },

            { type: "heading", text: "Solo fragatas", level: 2 },
            { type: "paragraph", text: "Las fragatas que podamos hacer en el early game, pueden ayudarnos en esta fase a destruir mayores puntos defensivos del enemigo. Si contamos con un componente de sigilo, es altamente recomendable utilizarlo." },
            { type: "divider" },

            { type: "heading", text: "Juego tardío" },
            { type: "heading", text: "Solo acorazados portahangares", level: 2 },
            { type: "paragraph", text: "Acorazados portahangares. Haciendo uso de la potencia de fuego de largo alcance de las armas X, junto con la versatilidad de los hangares, además de tener espacio para defensa de punto y armas M y S, tenemos el diseño definitivo que lo hará, al menos, decentemente bien contra todo lo que podamos echarnos encima. Si bien, habrá ocasiones donde una flota especializada puede ser superior. Para la mayoría de amenazas como las crisis de mitad de juego, imperios caídos y despertados e incluso algunas crisis de fin de juego, lo hará más que suficientemente bien. Para el arma X puedes elegir entre la lanza de energía y lanzador de arco, en ningún caso utilices el gigacañón." },
            { type: "divider" },

            { type: "heading", text: "Final de juego" },

            { type: "heading", text: "Acorazados", level: 2 },
            { type: "paragraph", text: "De 1 a 3 titanes (opcional), el resto mitad de acorazados artilleros y mitad de acorazados portahangares." },
            {
                type: "columns",
                columns: [
                    [{ type: "paragraph", text: "Si elijes llevar titán, sirve de apoyo con sus auras. Si llevas más de uno, cada uno debe llevar un aura ofensiva distinta." }],
                    [{ type: "paragraph", text: "Los acorazados portahangares sirve de escudo defensivo contra naves más pequeñas como corbetas, destructores, naves de ataque y fragatas, mientras que lo hacen bien contra naves más grandes. Además, cuenta con un arma X que le sirve de artillería contra objetivos grandes." }]
                ]
            },

            { type: "heading", text: "Cruceros", level: 2 },
            { type: "paragraph", text: "Solo cruceros torpederos." },
            {
                type: "columns",
                columns: [
                    [{ type: "paragraph", text: "Si elijes cruceros torpederos de corto alcance con sigilo. Son el ariete que derrumba grandes objetivos haciendo un daño absurdamente devastador contra enemigos estáticos o de gran tamaño, como naves capitales, titanes, estaciones estelars, leviatanes, etc. Corres el riesgo de sufrir grandes pérdidas." }],
                    [{ type: "paragraph", text: "Si elijes cruceros torpederos de largo alance. Son la artillería de asedio que destruye puntos de choque y otras defensa desde la seguridad de la distancia. Brindan la potencia destructora del fuego de artillería que tienen más limitados los acorazados portahangares. Cabe destacar que son muy débiles cuando el enemigo te supera o iguala en alcance de armas." }]
                ]
            },

            { type: "heading", text: "Titanes", level: 2 },
            { type: "paragraph", text: "En caso de no querer repartir los titanes en distintas flotas, puedes hacer una flota únicamente con todos tus titanes. Agrupando distintas auras ofensivas y defensivas, te aseguras tenerlas todas activas aunque pierdas algunos titanes, ya que siempre tendrás más de un titán con cada tipo de arma. Esta flota es más vulnerable en solitario, así que combiene acompañarla de una flota de acorazados portahangares normal." },
            { type: "divider" },

            { type: "heading", text: "Defensas" },

            { type: "heading", text: "Combinación de plataformas de defensa con cañones de iones.", level: 2 },
            { type: "paragraph", text: "Puedes combinar plataformas y cañones de formas distintas según la necesidad, aunque una vez construyas las defensas de una base estelar, difícilmente podrás cambiarla hasta que sean destruidas." },
            {
                type: "list", items: [
                    "**Un cañón de iones con muchas plataformas de defensa:** efectiva contra flotas de imperios de IA. Se utiliza un único cañón de iones por dos motivos: el principal, es poder tener rango suficiente para atacar a naves en cualquier parte del sistema, de forma que ninguna pueda cruzar por el borde sin que la base estelar la ataque por estar fuera de rango; el segundo, tener algo de daño extra contra naves de gran tamaño como titanes, acorazados y bionaves ancianas. Por otro lado, las plataformas de defensas, ya sean de hangares o torpedos de largo alcance, serán la fuente principal de daño para cualquier tipo de naves, especialmente las de pequeño y mediano tamaño. Puede funcionar como única defensa en el sistema, dañando seriamente la flota enemiga o incluso repeliendo el ataque. No obstante, sufrirá muchisimas bajas y es recomendable usar una flota completa que reciba principalmente el daño.",
                    "**Todos los cañones de iones posibles y rellenar los espacios sobrantes con plataformas de defensa:** efectiva contra flotas de imperios caídos/despertados y crisis de mitad y fin de juego. Los cañones de iones serán capaces de casi barrer al completo las naves grandes en las primeras dos salvas, mientras que estarán desprotegidas contra naves pequeñas. Por esto, recomiendo rellenar los huevos con plataformas de defensa con hangares, que proporcionan algo de defensa extra contra misiles y torpedos. No obstante, este tipo de defensas suelen usarse como apoyo a una flota completa y nunca como defensa única. Aunque gracias al daño colateral de las armas T, ahora es viable utilizar solo cañones de iones, ya que podrán acabar con flotas enteras de naves pequeñas si consiguen acertar dos o tres disparos de un arma T."
                ]
            },

            { type: "heading", text: "Posicionamiento de la ciudadela de espacio profundo.", level: 2 },
            { type: "paragraph", text: "Para la ciudadela de espacio profundo el posicionamiento es clave. Ya que el único diseño que tenemos para la ciudadela de nivel tres es de largo alcance, queremos posicionar nuestras ciudadelas en los bordes de los sistemas lejos de los saltos de hipervías por donde puedan entrar las posibles flotas hostiles. Así pues, necesitaremos alejar la ciudadela lo suficiente para que no esté cerca de cada entrada de hipervía, ni de la base estelar central, pero que sus hangares y arma X estén a rango para disparar." },
            { type: "paragraph", text: "Una segunda opción, es posicionar nuestra ciudadela justo en el borde del salto. Si bien desperdiciaremos el arma X y las armas L en la gran mayoría de casos, podemos construir en la propia ciudadela plataformas de defensa de corto alcance con armas híbridas de energía y cinéticas o directamente con torpedos de corto alcance, para que puedan comenzar a atacar en cuanto la flota enemiga salte al sistema." },

            { type: "divider" },
            { type: "quote", text: "Hay batallas que se ganan antes de ser libradas. Hay guerras que se ganan antes de que el enemigo comprenda que han comenzado.", cite: "Apóstata Sin Nombre, sobre estrategias para derrotar a Cetana, La Reina Sintética", portrait: "img/citas/Nameless_Apostate.png", portraitAlt: "Apóstata Sin Nombre" }

        ],
        i18n: {
            en: {
                title: "About titans and their auras",
                blocks: [
                    { type: "heading", text: "Early Game" },

                    { type: "heading", text: "Corvettes Only", level: 2 },
                    { type: "paragraph", text: "The most basic option for the year 2200." },
                    { type: "paragraph", text: "Enemies will be random, and you won't be able to know much about them since you won't be able to effectively spy on them. You'll only be able to figure out how to counter their fleet once the first battle takes place (by checking the log and enemy components), which in the early game is usually also the last one, so the most viable approach is to prepare for everything." },
                    { type: "paragraph", text: "If you're having trouble with amoebas or mining drones, use energy weapons. If you're having trouble with energy entities, use kinetic weapons. Simply complete the First Contact procedure and check their armor and shields." },
                    { type: "paragraph", text: "Using a Mining Drone Laser is recommended if available, until you have access to plasma and/or autocannons." },

                    { type: "heading", text: "Destroyers Only", level: 2 },
                    { type: "paragraph", text: "With a specialized design, they can overcome a hybrid corvette fleet using both energy and kinetic weapons. The problem is that they scale rather poorly in the later stages of the game." },
                    { type: "paragraph", text: "However, corvettes also scale rather poorly now, so in long games, building a few destroyers is not a bad idea to gain an advantage over early-game corvettes." },

                    { type: "heading", text: "Frigate Support", level: 2 },
                    { type: "paragraph", text: "With the new Siege combat computer, combining frigates with corvettes and/or destroyers in the early game is a very good idea for destroying chokepoints and defensive stations with high fleet power. Since these are very tough targets for corvettes and destroyers, torpedo frigates can easily turn the tide of the battle." },
                    { type: "divider" },

                    { type: "heading", text: "Mid Game" },

                    { type: "heading", text: "Corvettes Only", level: 2 },
                    { type: "paragraph", text: "A fleet consisting only of hybrid corvettes can work, but losses after every battle are guaranteed, which will hurt your still-developing economy. Not recommended for wars of attrition. At this point, stop building corvettes and focus on frigates and cruisers." },

                    { type: "heading", text: "Cruisers Only", level: 2 },
                    { type: "paragraph", text: "First version of a carrier fleet. Since we still don't have many options for our weapons, you can pair the hangars with only missiles and point-defense weapons. If you have access to long-range torpedoes, that would be the best option." },

                    { type: "heading", text: "Frigates Only", level: 2 },
                    { type: "paragraph", text: "The frigates we can build in the early game can help us destroy larger enemy defensive positions at this stage. If you have access to a cloaking component, using it is highly recommended." },
                    { type: "divider" },

                    { type: "heading", text: "Late Game" },
                    { type: "heading", text: "Carrier Battleships Only", level: 2 },
                    { type: "paragraph", text: "Carrier battleships. Making use of the long-range firepower of X-slot weapons, together with the versatility of hangars, while also having room for point defense and M and S weapons, we have the ultimate design that will perform at least decently against anything we can throw at it. There will still be situations where a specialized fleet can perform better. Against most threats, such as mid-game crises, Fallen and Awakened Empires, and even some end-game crises, it will perform more than well enough. For the X-slot weapon, you can choose between the energy lance and arc emitter. Under no circumstances should you use the Giga Cannon." },
                    { type: "divider" },

                    { type: "heading", text: "End Game" },

                    { type: "heading", text: "Battleships", level: 2 },
                    { type: "paragraph", text: "1 to 3 Titans (optional), with the rest split evenly between artillery battleships and carrier battleships." },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "paragraph", text: "If you choose to bring a Titan, it serves as support through its auras. If you bring more than one, each should use a different offensive aura." }],
                            [{ type: "paragraph", text: "Carrier battleships serve as a defensive shield against smaller ships such as corvettes, destroyers, strike craft, and frigates, while also performing well against larger ships. They also have an X-slot weapon that serves as artillery against large targets." }]
                        ]
                    },

                    { type: "heading", text: "Cruisers", level: 2 },
                    { type: "paragraph", text: "Torpedo cruisers only." },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "paragraph", text: "If you choose short-range torpedo cruisers with cloaking, they are the battering ram that brings down large targets, dealing absurdly devastating damage against stationary or massive enemies such as capital ships, Titans, Starbases, Leviathans, etc. You run the risk of suffering heavy losses." }],
                            [{ type: "paragraph", text: "If you choose long-range torpedo cruisers, they are the siege artillery that destroys chokepoints and other defenses from the safety of long range. They provide the destructive firepower of artillery that carrier battleships have more limited access to. It should be noted that they are very weak when the enemy outranges you or has equal weapon range." }]
                        ]
                    },

                    { type: "heading", text: "Titans", level: 2 },
                    { type: "paragraph", text: "If you don't want to distribute your Titans among different fleets, you can create a fleet consisting entirely of your Titans. By grouping different offensive and defensive auras together, you can ensure that they remain active even if you lose some Titans, since you will always have more than one Titan with each type of weapon. This fleet is more vulnerable on its own, so it is advisable to support it with a standard carrier battleship fleet." },
                    { type: "divider" },

                    { type: "heading", text: "Defenses" },

                    { type: "heading", text: "Defense Platforms with Ion Cannons", level: 2 },
                    { type: "paragraph", text: "You can combine platforms and ion cannons in different ways depending on your needs, although once you build a starbase's defenses, you will hardly be able to change them until they are destroyed." },
                    {
                        type: "list", items: [
                            "**One Ion Cannon with many Defense Platforms:** effective against AI empire fleets. A single Ion Cannon is used for two reasons: the main one is to have enough range to attack ships anywhere in the system, so that none of them can slip past the edge without the starbase attacking them because they are out of range; the second is to have some extra damage against large ships such as Titans, Battleships, and Ancient Dreadnoughts. Meanwhile, the defense platforms, whether equipped with hangars or long-range torpedoes, will be the primary source of damage against all types of ships, especially small and medium-sized ones. It can work as the only defense in the system, seriously damaging the enemy fleet or even repelling the attack. However, it will suffer very heavy losses, so it is recommended to use a full fleet to absorb most of the damage.",
                            "**As many Ion Cannons as possible, filling the remaining slots with Defense Platforms:** effective against Fallen/Awakened Empire fleets and mid-game and end-game crises. The Ion Cannons will be capable of almost completely wiping out large ships in the first two volleys, while leaving the defense vulnerable against small ships. For this reason, I recommend filling the gaps with hangar-equipped Defense Platforms, which provide some additional defense against missiles and torpedoes. However, this type of defense is usually used to support a full fleet and never as the sole defense. Thanks to the collateral damage from T-slot weapons, it is now viable to use only Ion Cannons, as they can wipe out entire fleets of small ships if they manage to land two or three hits from a T-slot weapon."
                        ]
                    },

                    { type: "heading", text: "Deep Space Citadel Positioning", level: 2 },
                    { type: "paragraph", text: "For a Deep Space Citadel, positioning is key. Since the only design we have for a level-three Citadel is long-range, we want to position our Citadels on the edges of systems, far from hyperlane entrances where hostile fleets may enter. We therefore need to place the Citadel far enough away that it is not close to each hyperlane entrance or the central starbase, while still keeping its hangars and X-slot weapon within firing range." },
                    { type: "paragraph", text: "A second option is to place our Citadel right at the edge of the hyperlane entrance. Although we will waste the X-slot weapon and L weapons in most cases, we can build short-range Defense Platforms directly at the Citadel, equipped with hybrid energy and kinetic weapons or simply short-range torpedoes, allowing them to begin attacking as soon as the enemy fleet jumps into the system." },

                    { type: "divider" },
                    { type: "quote", text: "Some battles are won before they are fought. Some wars are won before the enemy understands they have begun.", cite: "Nameless Apostate, on strategies for defeating Cetana, the Synthetic Queen", portrait: "img/citas/Nameless_Apostate.png", portraitAlt: "Nameless Apostate" }
                ]
            },
            jp: {
                title: "タイタンとそのオーラについて",
                icon: "✦",
                blocks: [
                    { type: "heading", text: "ゲーム開始時" },

                    { type: "heading", text: "コルベットのみ", level: 2 },
                    { type: "paragraph", text: "2200年における最も基本的な選択肢です。" },
                    { type: "paragraph", text: "敵はランダムであり、効果的に諜報できないため、敵について事前に知ることはほとんどできません。敵艦隊への対策を判断できるのは、最初の戦闘が発生した後（戦闘ログと敵艦のコンポーネントを確認してから）だけです。しかも序盤では、その最初の戦闘が最後の戦闘になることも珍しくありません。そのため、可能な限りあらゆる状況に備えるのが現実的です。" },
                    { type: "paragraph", text: "スペースアメーバや採掘ドローンに苦戦する場合は、エネルギー兵器を使用してください。エネルギー存在に苦戦する場合は、実弾兵器を使用してください。第一次接触プロトコルを完了させ、相手の装甲とシールドを確認するだけで十分です。" },
                    { type: "paragraph", text: "利用可能であれば、プラズマおよび／またはオートキャノンを入手するまで、採掘ドローンレーザーを使用することを推奨します。" },

                    { type: "heading", text: "駆逐艦のみ", level: 2 },
                    { type: "paragraph", text: "特化した設計であれば、エネルギー兵器と実弾兵器を組み合わせたハイブリッド型コルベット艦隊を上回ることができます。問題は、ゲーム後半になるにつれてスケーリングがかなり悪くなることです。" },
                    { type: "paragraph", text: "ただし、現在ではコルベットもスケーリングがかなり悪いため、長期戦になるゲームでは、序盤のコルベットに対して優位を取るために駆逐艦を数隻建造するのも悪くありません。" },

                    { type: "heading", text: "フリゲートによる支援", level: 2 },
                    { type: "paragraph", text: "新しい攻城戦闘コンピュータを使用することで、序盤にフリゲートをコルベットや駆逐艦と組み合わせ、チョークポイントや艦隊戦力の高い防衛拠点を破壊するのは非常に有効です。これらはコルベットや駆逐艦にとって非常に厄介な目標ですが、魚雷フリゲートを投入すれば戦闘の流れを簡単に逆転させることができます。" },
                    { type: "divider" },

                    { type: "heading", text: "中盤" },

                    { type: "heading", text: "コルベットのみ", level: 2 },
                    { type: "paragraph", text: "ハイブリッド型コルベットのみで構成した艦隊でも機能する場合はありますが、戦闘のたびに損害が発生することが確実であり、発展途上の経済に大きな負担をかけます。消耗戦にはあまりおすすめできません。この段階ではコルベットの建造をやめ、フリゲートと巡洋艦に集中しましょう。" },

                    { type: "heading", text: "巡洋艦のみ", level: 2 },
                    { type: "paragraph", text: "空母艦隊の初期型です。まだ兵器の選択肢が多くないため、ハンガーに加えてミサイルとポイント・ディフェンスのみを搭載することができます。長距離魚雷を利用できるのであれば、それが最良の選択肢です。" },

                    { type: "heading", text: "フリゲートのみ", level: 2 },
                    { type: "paragraph", text: "序盤に建造できるフリゲートは、この段階で敵のより大型の防衛拠点を破壊するのに役立ちます。クローキング・コンポーネントを利用できる場合は、使用を強く推奨します。" },
                    { type: "divider" },

                    { type: "heading", text: "後半" },
                    { type: "heading", text: "空母型戦艦のみ", level: 2 },
                    { type: "paragraph", text: "空母型戦艦です。Xスロット兵器による長距離火力に、ハンガーの汎用性を組み合わせ、さらにポイント・ディフェンスやM・Sスロット兵器まで搭載できるため、投入できるあらゆる脅威に対して少なくとも十分に戦える究極の設計になります。もちろん、状況によっては特化型艦隊のほうが優れています。それでも、中盤危機、没落した帝国や覚醒した帝国、さらには一部の終盤の危機など、ほとんどの脅威に対して十分以上の性能を発揮します。Xスロット兵器はエネルギーランスかアーク放射器を選択できます。ギガキャノンは絶対に使用しないでください。" },
                    { type: "divider" },

                    { type: "heading", text: "終盤" },

                    { type: "heading", text: "戦艦", level: 2 },
                    { type: "paragraph", text: "タイタンを1～3隻（任意）用意し、残りは半分を砲撃型戦艦、もう半分を空母型戦艦にします。" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "paragraph", text: "タイタンを編成する場合は、オーラによる支援役として機能します。複数編成する場合は、それぞれ異なる攻撃オーラを持たせるべきです。" }],
                            [{ type: "paragraph", text: "空母型戦艦は、コルベット、駆逐艦、艦載機、フリゲートなどの小型艦に対する防御の盾として機能すると同時に、大型艦に対しても高い性能を発揮します。また、Xスロット兵器によって大型目標に対する砲撃も可能です。" }]
                        ]
                    },

                    { type: "heading", text: "巡洋艦", level: 2 },
                    { type: "paragraph", text: "魚雷巡洋艦のみ。" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "paragraph", text: "短距離魚雷とクローキングを搭載した巡洋艦を選ぶ場合、それは大型目標を打ち倒す破城槌となります。静止している敵や、主力艦、タイタン、星系基地、リヴァイアサンなどの巨大な敵に対して、非常に強烈なダメージを与えられます。ただし、大きな損害を受けるリスクがあります。" }],
                            [{ type: "paragraph", text: "長距離魚雷巡洋艦を選ぶ場合、それは安全な長距離からチョークポイントやその他の防衛拠点を破壊する攻城砲となります。空母型戦艦では限られている、砲撃艦隊としての破壊力を提供します。ただし、敵に射程で上回られるか、同等の射程を持たれると非常に脆弱になります。" }]
                        ]
                    },

                    { type: "heading", text: "タイタン", level: 2 },
                    { type: "paragraph", text: "タイタンを複数の艦隊に分散させたくない場合は、すべてのタイタンだけで構成された艦隊を作ることもできます。異なる攻撃オーラと防御オーラを集約することで、複数のタイタンが同じ種類の兵装を持つようにすれば、一部のタイタンを失ってもすべてのオーラを維持できます。この艦隊は単独ではより脆弱なので、通常の空母型戦艦艦隊を随伴させることを推奨します。" },
                    { type: "divider" },

                    { type: "heading", text: "防衛" },

                    { type: "heading", text: "防衛プラットフォームとイオンキャノンの組み合わせ", level: 2 },
                    { type: "paragraph", text: "必要に応じて防衛プラットフォームとイオンキャノンをさまざまな形で組み合わせることができます。ただし、星系基地の防衛設備を建造してしまうと、それらが破壊されるまで変更するのは困難です。" },
                    {
                        type: "list", items: [
                            "**イオンキャノン1基＋大量の防衛プラットフォーム：** AI帝国の艦隊に対して有効です。イオンキャノンを1基だけ使用する理由は2つあります。主な理由は、星系内のどこにいる艦船にも攻撃できるだけの射程を確保し、射程外にいるという理由で星系基地が攻撃できない範囲を敵艦がすり抜けるのを防ぐことです。2つ目は、タイタン、戦艦、古代のドレッドノートなどの大型艦に対して追加のダメージを与えることです。一方、防衛プラットフォームは、ハンガー型でも長距離魚雷型でも、あらゆる艦船に対する主なダメージ源となり、特に小型・中型艦に対して有効です。システム内で唯一の防衛として機能させ、敵艦隊に深刻な損害を与えたり、攻撃を撃退したりすることも可能です。ただし、大量の損失を受けるため、主なダメージを受ける役として完全な艦隊を用意することを推奨します。",
                            "**可能な限りイオンキャノンを配置し、残りのスロットを防衛プラットフォームで埋める：** 没落した帝国／覚醒した帝国の艦隊、および中盤・終盤の危機に対して有効です。イオンキャノンは最初の2斉射で大型艦をほぼ完全に一掃できる一方、小型艦に対しては防衛が手薄になります。そのため、残りの枠をハンガー搭載型の防衛プラットフォームで埋めることを推奨します。これにより、ミサイルや魚雷に対する防御力を追加できます。ただし、この種の防衛は通常、完全な艦隊を支援するために使用するものであり、単独の防衛として使用するべきではありません。Tスロット兵器の範囲ダメージのおかげで、イオンキャノンのみを使用する構成も現在では実用的です。Tスロット兵器が2～3発命中すれば、小型艦のみで構成された艦隊を丸ごと撃破できる可能性があります。"
                        ]
                    },

                    { type: "heading", text: "深宇宙要塞の配置", level: 2 },
                    { type: "paragraph", text: "深宇宙要塞では配置が重要です。レベル3の要塞で使用できる設計が長距離型しかないため、敵対艦隊が侵入する可能性のあるハイパーレーンの入口から離れた、星系の端に要塞を配置したいところです。したがって、各ハイパーレーン入口や中央の星系基地から十分に離しつつ、ハンガーとXスロット兵器が射程内に収まる位置に要塞を配置する必要があります。" },
                    { type: "paragraph", text: "もう1つの選択肢は、ハイパーレーンの入口そのもののすぐ近くに要塞を配置することです。この場合、ほとんどの状況でXスロット兵器とLスロット兵器を無駄にすることになりますが、要塞そのものに短距離型の防衛プラットフォームを建造し、エネルギー兵器と実弾兵器のハイブリッド、あるいは短距離魚雷を搭載できます。これにより、敵艦隊が星系へジャンプした直後から攻撃を開始できます。" },

                    { type: "divider" },
                    { type: "quote", text: "戦いの中には、戦われる前に勝敗が決まるものがある。敵が戦争の始まりを理解する前に、勝敗が決まる戦争もある。", cite: "名もなき背教者、セタナ――「合成の女王」撃破のための戦略について", portrait: "img/citas/Nameless_Apostate.png", portraitAlt: "名もなき背教者" }

                ]
            }
        }
    },
    {   // Diseño de naves biológicas
        slug: "diseño-naves-biologicas",
        title: "Diseño de naves biológicas",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Macero" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Macero corto alcance.png", alt: "Macero corto alcance", caption: "Macero corto alcance." }],
                    [{ type: "image", src: "img/bionaves/Macero corto alcance con sigilo.png", alt: "Macero corto alcance con sigilo", caption: "Macero corto alcance con sigilo." }]
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Tejedor" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de corto alcance.png", alt: "Tejedor de apoyo con evasión y daño de corto alcance", caption: "Tejedor de apoyo con evasión y daño de corto alcance." }],
                    [{ type: "image", src: "img/bionaves/Tejedor de apoyo con confusion de largo alcance.png", alt: "Tejedor de apoyo con confusión de largo alcance", caption: "Tejedor de apoyo con confusión de largo alcance." }]
                ]
            },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de largo alcance.png", alt: "Tejedor de apoyo con evasión y daño de largo alcance", caption: "Tejedor de apoyo con evasión y daño de largo alcance." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Heraldo" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Heraldo con torpedos de largo alcance.png", alt: "Heraldo con torpedos de largo alcance", caption: "Heraldo con torpedos de largo alcance." }],
                    [{ type: "image", src: "img/bionaves/Heraldo con defensa de punto.png", alt: "Heraldo con defensa de punto", caption: "Heraldo con defensa de punto." }]
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Aguijón" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Aguijon artillero con armas X.png", alt: "Aguijón artillero con armas X", caption: "Aguijón artillero con armas X." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Titanes" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Titan artillero biologico.png", alt: "Titán artillero con mezcla de cinética y energía", caption: "Titán artillero con mezcla de cinética y energía. Uno por cada tipo de aura ofensiva y defensiva." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Gigante" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Gigante buffer artillero biologico.png", alt: "Gigante buffer artillero", caption: "Gigante buffer artillero." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Coloso" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Coloso biologico.png", alt: "Coloso biológico", caption: "Coloso biológico." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Plataforma de defensa" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Plataforma biologica portahangar.png", alt: "Plataforma portahangar", caption: "Plataforma portahangar." }],
                    [{ type: "image", src: "img/bionaves/Plataforma biologica artillera de largo alcance.png", alt: "Plataforma artillera de largo alcance", caption: "Plataforma artillera de largo alcance." }]
                ]
            },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Plataforma biologica artillada de corto alcance.png", alt: "Plataforma artillada de corto alcance", caption: "Plataforma artillada de corto alcance." }],
                    []
                ]
            },
            { type: "note", text: "Las naves biológicas NO tienen armas G de corto alcance (Torpedos) ya que cuentan con los Maceros y sus armas G de tipo pinza especiales." },
            { type: "divider" },

            { type: "heading", text: "Cañón de iones" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Canon de iones biologico equilibrado estandar.png", alt: "Cañón de iones equilibrado estándar", caption: "Cañón de iones equilibrado estándar." }],
                    []
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Ciudadela de espacio profundo" },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Ciudadela biologica I de largo alcance.png", alt: "Ciudadela I de largo alcance", caption: "Ciudadela I de largo alcance." }],
                    [{ type: "image", src: "img/bionaves/Ciudadela biologica II de largo alcance.png", alt: "Ciudadela II de largo alcance", caption: "Ciudadela II de largo alcance." }]
                ]
            },
            {
                type: "columns",
                columns: [
                    [{ type: "image", src: "img/bionaves/Ciudadela biologica III de largo alcance.png", alt: "Ciudadela III de largo alcance", caption: "Ciudadela III de largo alcance." }],
                    [{ type: "image", src: "img/bionaves/Ciudadela biologica III de corto alcance.png", alt: "Ciudadela III de corto alcance", caption: "Ciudadela III de corto alcance." }]
                ]
            },

            { type: "divider" },
            { type: "quote", text: "Nosotros somos uno y uno que son muchos. Tú eres uno y pronto serás uno de nosotros.", cite: "Nosotros, la Horda" }
        ],
        i18n: {
            en: {
                title: "Biological Ship Design",
                blocks: [
                    { type: "heading", text: "Mauler" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Macero corto alcance.png", alt: "Short-range Mauler", caption: "Short-range Mauler." }],
                            [{ type: "image", src: "img/bionaves/Macero corto alcance con sigilo.png", alt: "Short-range Mauler with Cloaking", caption: "Short-range Mauler with Cloaking." }]
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Weaver" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de corto alcance.png", alt: "Support Weaver with evasion and short-range damage", caption: "Support Weaver with evasion and short-range damage." }],
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con confusion de largo alcance.png", alt: "Support Weaver with long-range disruption", caption: "Support Weaver with long-range disruption." }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de largo alcance.png", alt: "Support Weaver with evasion and long-range damage", caption: "Support Weaver with evasion and long-range damage." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Harbinger" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Heraldo con torpedos de largo alcance.png", alt: "Harbinger with long-range torpedoes", caption: "Harbinger with long-range torpedoes." }],
                            [{ type: "image", src: "img/bionaves/Heraldo con defensa de punto.png", alt: "Harbinger with Point Defense", caption: "Harbinger with Point Defense." }]
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Stinger" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Aguijon artillero con armas X.png", alt: "Artillery Stinger with X-slot weapons", caption: "Artillery Stinger with X-slot weapons." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Titans" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Titan artillero biologico.png", alt: "Artillery Titan with a mix of kinetic and energy weapons", caption: "Artillery Titan with a mix of kinetic and energy weapons. One for each type of offensive and defensive aura." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Juggernaut" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Gigante buffer artillero biologico.png", alt: "Artillery support Juggernaut", caption: "Artillery support Juggernaut." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Colossus" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Coloso biologico.png", alt: "Biological Colossus", caption: "Biological Colossus." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Defense Platform" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Plataforma biologica portahangar.png", alt: "Carrier Defense Platform", caption: "Carrier Defense Platform." }],
                            [{ type: "image", src: "img/bionaves/Plataforma biologica artillera de largo alcance.png", alt: "Long-range Artillery Defense Platform", caption: "Long-range Artillery Defense Platform." }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Plataforma biologica artillada de corto alcance.png", alt: "Short-range Artillery Defense Platform", caption: "Short-range Artillery Defense Platform." }],
                            []
                        ]
                    },
                    { type: "note", text: "Biological ships do NOT have short-range G-slot weapons (Torpedoes), as they have Battering Rams and their special claw-type G-slot weapons." },
                    { type: "divider" },

                    { type: "heading", text: "Ion Cannon" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Canon de iones biologico equilibrado estandar.png", alt: "Standard balanced Ion Cannon", caption: "Standard balanced Ion Cannon." }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "Deep Space Citadel" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica I de largo alcance.png", alt: "Long-range Citadel I", caption: "Long-range Citadel I." }],
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica II de largo alcance.png", alt: "Long-range Citadel II", caption: "Long-range Citadel II." }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica III de largo alcance.png", alt: "Long-range Citadel III", caption: "Long-range Citadel III." }],
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica III de corto alcance.png", alt: "Short-range Citadel III", caption: "Short-range Citadel III." }]
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "We are one and one who are many. You are one and soon you will be one of us.", cite: "We, the Horde" }
                ]
            },
            jp: {
                title: "生体艦船の設計",
                blocks: [
                    { type: "heading", text: "クラッシャー" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Macero corto alcance.png", alt: "短距離クラッシャー", caption: "短距離クラッシャー。" }],
                            [{ type: "image", src: "img/bionaves/Macero corto alcance con sigilo.png", alt: "ステルス搭載短距離クラッシャー", caption: "ステルス搭載短距離クラッシャー。" }]
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "ウィーバー" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de corto alcance.png", alt: "回避と短距離火力を備えた支援ウィーバー", caption: "回避と短距離火力を備えた支援ウィーバー。" }],
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con confusion de largo alcance.png", alt: "長距離の混乱を備えた支援ウィーバー", caption: "長距離の混乱を備えた支援ウィーバー。" }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Tejedor de apoyo con evasion y dano de largo alcance.png", alt: "回避と長距離火力を備えた支援ウィーバー", caption: "回避と長距離火力を備えた支援ウィーバー。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "ヘラルド" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Heraldo con torpedos de largo alcance.png", alt: "長距離魚雷搭載ヘラルド", caption: "長距離魚雷搭載ヘラルド。" }],
                            [{ type: "image", src: "img/bionaves/Heraldo con defensa de punto.png", alt: "ポイントディフェンス搭載ヘラルド", caption: "ポイントディフェンス搭載ヘラルド。" }]
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "スティンガー" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Aguijon artillero con armas X.png", alt: "X兵器搭載砲撃型スティンガー", caption: "X兵器搭載砲撃型スティンガー。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "タイタン" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Titan artillero biologico.png", alt: "運動エネルギー兵器とエネルギー兵器を組み合わせた砲撃型タイタン", caption: "運動エネルギー兵器とエネルギー兵器を組み合わせた砲撃型タイタン。攻撃・防御オーラはそれぞれ1隻ずつ配置。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "ジャイアント" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Gigante buffer artillero biologico.png", alt: "砲撃型バッファー・ジャイアント", caption: "砲撃型バッファー・ジャイアント。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "コロッサス" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Coloso biologico.png", alt: "生体コロッサス", caption: "生体コロッサス。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "防衛プラットフォーム" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Plataforma biologica portahangar.png", alt: "格納庫搭載型防衛プラットフォーム", caption: "格納庫搭載型防衛プラットフォーム。" }],
                            [{ type: "image", src: "img/bionaves/Plataforma biologica artillera de largo alcance.png", alt: "長距離砲撃型防衛プラットフォーム", caption: "長距離砲撃型防衛プラットフォーム。" }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Plataforma biologica artillada de corto alcance.png", alt: "短距離武装型防衛プラットフォーム", caption: "短距離武装型防衛プラットフォーム。" }],
                            []
                        ]
                    },
                    { type: "note", text: "生体艦船には短距離用のG兵器（魚雷）は搭載されていません。代わりにクラッシャーが存在し、特殊なクランプ型のG兵器を使用します。" },
                    { type: "divider" },

                    { type: "heading", text: "イオンキャノン" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Canon de iones biologico equilibrado estandar.png", alt: "標準型バランス・イオンキャノン", caption: "標準型バランス・イオンキャノン。" }],
                            []
                        ]
                    },
                    { type: "divider" },

                    { type: "heading", text: "深宇宙要塞" },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica I de largo alcance.png", alt: "長距離型深宇宙要塞 I", caption: "長距離型深宇宙要塞 I。" }],
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica II de largo alcance.png", alt: "長距離型深宇宙要塞 II", caption: "長距離型深宇宙要塞 II。" }]
                        ]
                    },
                    {
                        type: "columns",
                        columns: [
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica III de largo alcance.png", alt: "長距離型深宇宙要塞 III", caption: "長距離型深宇宙要塞 III。" }],
                            [{ type: "image", src: "img/bionaves/Ciudadela biologica III de corto alcance.png", alt: "短距離型深宇宙要塞 III", caption: "短距離型深宇宙要塞 III。" }]
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "我々は一つであり、多くである一つ。お前は一つであり、やがて我々の一つとなる。", cite: "我々、ホード" }
                ]
            }
        }
    },
    {   // Diseño de flotas biológicas
        slug: "diseño-flotas-biologicas",
        title: "Diseño de flotas biológicas",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Inicio de juego" },

            { type: "heading", text: "Solo maceros", level: 2 },
            { type: "paragraph", text: "Lo más básico para el año 2200." },
            { type: "paragraph", text: "Los enemigos serán aleatorios y no podrás saber nada de ellos ya que no podrás espiarles efectivamente." },
            { type: "paragraph", text: "Solo podrás saber como contrarrestar su flota una vez que ocurra la primera batalla (viendo el log y los componentes enemigos), que en el early game suele ser también la última, así que lo más viable es prepararse contra todo." },
            { type: "paragraph", text: "Si tienes problemas de amebas o drones mineros, usa armas de energía. Si tienes problemas con entidades de energía, usa armas cinéticas. Simplemente, haz el protocolo de primer contacto y mira el blindaje y escudo." },
            { type: "paragraph", text: "Recomendado usar láser de dron minero si lo tienes disponible hasta contar con plasma y/o cañones automáticos." },

            { type: "heading", text: "Sobre los tejedores" },
            { type: "paragraph", text: "Mejor no usarlos tan pronto. Se vuelven de mayor valor cuando los combinas con heraldos y aguijones." },
            { type: "divider" },

            { type: "heading", text: "Mitad de juego" },

            { type: "heading", text: "Solo maceros", level: 2 },
            { type: "paragraph", text: "Mantenemos una flota de solo maceros, a ser posible ancianos, con armas híbridas. En este caso, los maceros al contar con las pinzas de armas G que escalan contra naves de mayor tamaño, tenemos una flota decente contra naves pequeñas por las armas equilibradas de tamaño S y contra naves medianas y grandes porque llevamos las pinzas." },
            { type: "paragraph", text: "No obstante, debemos tener cuidado porque tendremos muy poca movilidad en comparación con las corbetas tradicionales. Estos maceros serán nuestra línea de combate principal, pero también una gran fuente de daño a corta distancia. El problema es que tiene poca velocidad sublumínica y poca evasión en comparación con las corbetas, por tanto sufrirán muchas bajas antes de alcanzar a naves más grandes en la retaguardia enemiga." },

            { type: "heading", text: "Heraldos y tejedores", level: 2 },
            { type: "paragraph", text: "Si has conseguido las armas G de largo alcance, puedes hacer flotas solo de heraldos con hangares y lanzadores de protones/neutrones desde ahora." },
            { type: "paragraph", text: "Los heraldos ya se pueden beneficiar de los tejedores usando el arma de apoyo que aumenta la velocidad sublumínica y la evasión (Dardos de evasión) y el arma que protege y recupera blindaje (Lanzador de esporas adaptativas inteligente)." },
            { type: "paragraph", text: "La proporción será de cada una de estas armas de apoyo por heraldo." },
            { type: "divider" },

            { type: "heading", text: "Juego tardío" },

            { type: "heading", text: "Heraldos y tejedores", level: 2 },
            { type: "paragraph", text: "La evolución lógica del diseño de flotas de Middle Game. Debemos asegurar que tenemos heraldos con hangares y lanzadores de protones listos. Equipándolos con postquemadores para reducir la mayor cantidad de daño entrante mientras huímos del enemigo y atacamos con nuestras naves de ataque y nuestros torpedos de largo alcance." },
            { type: "paragraph", text: "La configuración mimetiza a las flotas de acorazados portahangares. En este caso, tendremos mucha mayor potencia de fuego contra naves grande al utilizar armas G, pero perdemos el alcance de las armas X. En cuanto a defensa contra naves pequeñas y medianas, si bien no tenemos espacios de armas S y M, tendremos muchos más hangares para cumplir dicho rol." },
            { type: "paragraph", text: "Los tejedores seguirán cubriendo el rol de apoyo para reparar daños y mejorar nuestra potencia de ataque y supervivencia." },

            { type: "heading", text: "Solo maceros de sigilo de corto alcance", level: 2 },
            { type: "paragraph", text: "Con la llegada del daño colateral de las armas T, las flotas de carne de cañón ya no son recomendables. Por tanto, el mejor uso para los maceros es el de emboscadores sigilosos." },
            { type: "divider" },

            { type: "heading", text: "Final de juego" },

            { type: "heading", text: "Heraldos y titanes", level: 2 },
            { type: "paragraph", text: "Opcional añadir de 1 a 3 titanes. El resto todo heraldos con hangares y armas G de largo alcance." },
            { type: "paragraph", text: "Especialmente recomendado en este caso dividir los titanes en una flota única propia, ya que los heraldos no se van a ver tan beneficiados por las auras aliadas de los titanes en su propia flota, ya que la principal fuente de daño de los heraldos son las naves de ataque." },

            { type: "heading", text: "Tejedores", level: 2 },
            {
                type: "list", items: [
                    "**Apoyo:** los tejedores se dedicarán a apoyar a las naves aliadas. Solo queremos usarlos con nuestros aguijones y heraldos y podemos tener conflictos al usarlos con maceros.",
                    "**Supresor:** los tejedores aturden a las naves enemigas. Con el arma de supresión que aturde con un 90% de probabilidad, es suficiente siempre que estés en igualdad numérica de armas/cantidad de enemigos. Especialmente recomendada contra enemigos en altas dificultades, como crisis de mitad o fin de juego o imperios caídos/despertados. Importante destacar que no funcionan contra leviatanes."
                ]
            },

            { type: "heading", text: "Maceros con sigilo", level: 2 },
            { type: "paragraph", text: "Flota de emboscada con sigilo: debido a que cuentan con la mejor movilidad de las naves biológicas y las pinzas como armas G, podemos usarlas en sus versiones ancianas para tener más daño y resistencia en la corta distancia. Eficaces contra flotas de naves medianas y grandes, como, por ejemplo, las de imperio caído/despertado." },

            { type: "heading", text: "Problemas con los heraldos, maceros y tejedores en la misma batalla", level: 2 },
            { type: "paragraph", text: "Hay que tener en cuenta que los tejedores de apoyo seguirán a las naves aliadas para usar sus armas de apoyo. Es por esto que usar maceros con flotas de aguijones, heraldos y tejedores puede ser contraproducente para el rendimiento de los tejedores. Como puedes tener mayor cantidad de maceros que de heraldos por flota, al usar tejedores de apoyo, estos tendrán muchas más probabilidades de elegir a un macero como objetivo de apoyo en contraparte con los heraldos del campo de batalla. Eso hace que los tejedores de apoyo, que deberían mantenerse en la seguridad de la retaguardia de los heraldos, carguen de frente junto con los maceros para apoyarles y pueden sufrir una cantidad considerable de bajas en cada batalla, haciéndolos contraproducentes." },
            { type: "divider" },

            { type: "heading", text: "Defensas" },

            { type: "heading", text: "Combinación de plataformas de defensa con cañones de iones.", level: 2 },
            { type: "paragraph", text: "Puedes combinar plataformas y cañones de formas distintas según la necesidad, aunque una vez construyas las defensas de una base estelar, difícilmente podrás cambiarla hasta que sean destruidas." },
            {
                type: "list", items: [
                    "**Un cañón de iones con muchas plataformas de defensa:** efectiva contra flotas de imperios de IA. Se utiliza un único cañón de iones por dos motivos: el principal, es poder tener rango suficiente para atacar a naves en cualquier parte del sistema, de forma que ninguna pueda cruzar por el borde sin que la base estelar la ataque por estar fuera de rango; el segundo, tener algo de daño extra contra naves de gran tamaño como titanes, acorazados y bionaves ancianas. Por otro lado, las plataformas de defensas, ya sean de hangares o torpedos de largo alcance, serán la fuente principal de daño para cualquier tipo de naves, especialmente las de pequeño y mediano tamaño. Puede funcionar como única defensa en el sistema, dañando seriamente la flota enemiga o incluso repeliendo el ataque. No obstante, sufrirá muchisimas bajas y es recomendable usar una flota completa que reciba principalmente el daño.",
                    "**Todos los cañones de iones posibles y rellenar los espacios sobrantes con plataformas de defensa:** efectiva contra flotas de imperios caídos/despertados y crisis de mitad y fin de juego. Los cañones de iones serán capaces de casi barrer al completo las naves grandes en las primeras dos salvas, mientras que estarán desprotegidas contra naves pequeñas. Por esto, recomiendo rellenar los huevos con plataformas de defensa con hangares, que proporcionan algo de defensa extra contra misiles y torpedos. No obstante, este tipo de defensas suelen usarse como apoyo a una flota completa y nunca como defensa única. Aunque gracias al daño colateral de las armas T, ahora es viable utilizar solo cañones de iones, ya que podrán acabar con flotas enteras de naves pequeñas si consiguen acertar dos o tres disparos de un arma T."
                ]
            },

            { type: "heading", text: "Posicionamiento de la ciudadela de espacio profundo.", level: 2 },
            { type: "paragraph", text: "Para la ciudadela de espacio profundo el posicionamiento es clave. Ya que el único diseño que tenemos para la ciudadela de nivel tres es de largo alcance, queremos posicionar nuestras ciudadelas en los bordes de los sistemas lejos de los saltos de hipervías por donde puedan entrar las posibles flotas hostiles. Así pues, necesitaremos alejar la ciudadela lo suficiente para que no esté cerca de cada entrada de hipervía, ni de la base estelar central, pero que sus hangares y arma X estén a rango para disparar." },
            { type: "paragraph", text: "Una segunda opción, es posicionar nuestra ciudadela justo en el borde del salto. Si bien desperdiciaremos el arma X y las armas L en la gran mayoría de casos, podemos construir en la propia ciudadela plataformas de defensa de corto alcance con armas híbridas de energía y cinéticas o directamente con torpedos de corto alcance, para que puedan comenzar a atacar en cuanto la flota enemiga salte al sistema." },

            { type: "divider" },
            { type: "quote", text: "Inofensivos a primera vista, estas criaturas tejeran los hilos que nos lleven a la victoria.", cite: "Talloroble sobre los Tejedores", portrait: "img/citas/Talloroble.png", portraitAlt: "Talloroble" }
        ],
        i18n: {
            en: {
                title: "Biological Fleet Design",
                blocks: [
                    { type: "heading", text: "Early Game" },

                    { type: "heading", text: "Mauler Only", level: 2 },
                    { type: "paragraph", text: "The most basic setup for the year 2200." },
                    { type: "paragraph", text: "Enemy fleets will be random, and you will not be able to learn much about them since you will not be able to effectively spy on them." },
                    { type: "paragraph", text: "You will only be able to determine how to counter their fleet once the first battle takes place (by checking the combat log and enemy components), which in the early game is often also the last battle. Therefore, the most viable approach is to prepare for everything." },
                    { type: "paragraph", text: "If you are having trouble with amoebas or mining drones, use energy weapons. If you are having trouble with energy entities, use kinetic weapons. Simply complete the first contact procedure and check their armor and shields." },
                    { type: "paragraph", text: "Using the Mining Drone Laser is recommended if available until you have access to plasma and/or autocannons." },

                    { type: "heading", text: "About Weavers" },
                    { type: "paragraph", text: "It is better not to use them this early. They become much more valuable when combined with Harbingers and Stingers." },
                    { type: "divider" },

                    { type: "heading", text: "Mid Game" },

                    { type: "heading", text: "Mauler Only", level: 2 },
                    { type: "paragraph", text: "We maintain a fleet consisting exclusively of Mauler, preferably Elder ones, with hybrid weapons. Since Mauler have their special claw-type G weapon slots that scale against larger ships, we have a decent fleet against small ships thanks to their balanced S-size weapons, while also being effective against medium and large ships thanks to the claws." },
                    { type: "paragraph", text: "However, we must be careful because they have very poor mobility compared to traditional corvettes. These Mauler will be our main combat line, but they are also a major source of close-range damage. The problem is that they have low sublight speed and low evasion compared to corvettes, so they will suffer heavy casualties before reaching larger ships in the enemy rear line." },

                    { type: "heading", text: "Harbingers and Weavers", level: 2 },
                    { type: "paragraph", text: "If you have obtained the long-range G weapons, you can start making fleets consisting only of Harbingers with hangars and Proton/Neutron Launchers." },
                    { type: "paragraph", text: "Harbingers can already benefit from Weavers by using the support weapon that increases sublight speed and evasion (Evasion Darts), as well as the weapon that protects and regenerates armor (Intelligent Adaptive Spore Launcher)." },
                    { type: "paragraph", text: "The ratio should be one of each of these support weapons per Harbinger." },
                    { type: "divider" },

                    { type: "heading", text: "Late Game" },

                    { type: "heading", text: "Harbingers and Weavers", level: 2 },
                    { type: "paragraph", text: "The logical evolution of the Mid Game fleet design. We must ensure that we have Harbingers with hangars and Proton Launchers ready. Equip them with afterburners to reduce as much incoming damage as possible while retreating from the enemy and attacking with our strike craft and long-range torpedoes." },
                    { type: "paragraph", text: "This configuration mimics carrier battleship fleets. In this case, we will have significantly greater firepower against large ships by using G weapons, but we lose the range of X weapons. As for defense against small and medium ships, while we do not have S and M weapon slots, we will have many more hangars to fulfill that role." },
                    { type: "paragraph", text: "The Weavers will continue to fulfill their support role by repairing damage and improving our offensive power and survivability." },

                    { type: "heading", text: "Short-Range Stealth Mauler Only", level: 2 },
                    { type: "paragraph", text: "With the introduction of collateral damage from T weapons, cannon fodder fleets are no longer recommended. Therefore, the best use for Mauler is as stealth ambushers." },
                    { type: "divider" },

                    { type: "heading", text: "End Game" },

                    { type: "heading", text: "Harbingers and Titans", level: 2 },
                    { type: "paragraph", text: "Optionally add 1 to 3 Titans. The rest should be Harbingers with hangars and long-range G weapons." },
                    { type: "paragraph", text: "It is especially recommended in this case to split the Titans into a separate fleet of their own, since the Harbingers will not benefit as much from allied Titan auras within the same fleet, as the main source of Harbinger damage is strike craft." },

                    { type: "heading", text: "Weavers", level: 2 },
                    {
                        type: "list", items: [
                            "**Support:** Weavers will focus on supporting allied ships. We only want to use them with our Stingers and Harbingers, and using them with Mauler can create conflicts.",
                            "**Suppressor:** Weavers stun enemy ships. With the suppression weapon that has a 90% chance to stun, this is sufficient as long as you are roughly even in terms of weapon count/enemy numbers. It is especially recommended against enemies on high difficulties, such as mid-game or end-game crises, or Fallen/Awakened Empires. It is important to note that they do not work against Leviathans."
                        ]
                    },

                    { type: "heading", text: "Stealth Mauler", level: 2 },
                    { type: "paragraph", text: "Stealth ambush fleet: since they have the best mobility among biological ships and their claws occupy G weapon slots, we can use Elder versions to gain more damage and durability at close range. They are effective against fleets of medium and large ships, such as those of Fallen or Awakened Empires." },

                    { type: "heading", text: "Problems with Harbingers, Mauler, and Weavers in the Same Battle", level: 2 },
                    { type: "paragraph", text: "Keep in mind that Support Weavers will follow allied ships to use their support weapons. This means that using Mauler together with fleets of Stingers, Harbingers, and Weavers can be detrimental to Weaver performance. Since you can have more Mauler than Harbingers in a fleet, when using Support Weavers they will have a much higher chance of selecting a Mauler as their support target instead of one of the Harbingers on the battlefield. This causes Support Weavers, which should remain safely behind the Harbingers, to charge forward alongside the Mauler to support them, potentially suffering significant casualties in every battle and making them counterproductive." },
                    { type: "divider" },

                    { type: "heading", text: "Defenses" },

                    { type: "heading", text: "Combining Defense Platforms with Ion Cannons", level: 2 },
                    { type: "paragraph", text: "You can combine platforms and Ion Cannons in different ways depending on your needs, although once you build a starbase's defenses, you will have little opportunity to change them until they are destroyed." },
                    {
                        type: "list", items: [
                            "**One Ion Cannon with many Defense Platforms:** effective against fleets of AI empires. A single Ion Cannon is used for two reasons: the main one is to have enough range to attack ships anywhere in the system, ensuring that none can slip through the edge without being attacked by the starbase because they are out of range; the second is to provide additional damage against large ships such as Titans, Battleships, and Elder biological ships. The Defense Platforms, whether they use hangars or long-range torpedoes, will be the main source of damage against all types of ships, especially small and medium ones. This can function as the only defense in the system, seriously damaging the enemy fleet or even repelling the attack. However, it will suffer enormous casualties, so it is recommended to use a full fleet to absorb most of the damage.",
                            "**As many Ion Cannons as possible, filling the remaining slots with Defense Platforms:** effective against Fallen/Awakened Empires and mid-game and end-game crises. The Ion Cannons will be capable of almost completely wiping out large ships within the first two volleys, while leaving the system vulnerable to small ships. For this reason, I recommend filling the remaining slots with hangar Defense Platforms, which provide some additional protection against missiles and torpedoes. However, this type of defense is generally used to support a full fleet and never as the sole defense. Thanks to the collateral damage from T weapons, however, it is now viable to use Ion Cannons alone, as they can destroy entire fleets of small ships if they manage to land two or three shots from a T weapon."
                        ]
                    },

                    { type: "heading", text: "Deep Space Citadel Positioning", level: 2 },
                    { type: "paragraph", text: "Positioning is crucial for the Deep Space Citadel. Since the only design we have for a Level III Citadel is long-range, we want to position our Citadels at the edges of systems, away from the hyperlane jumps through which potential hostile fleets may enter. Therefore, we need to place the Citadel far enough away that it is not close to each hyperlane entrance or the central starbase, while still keeping its hangars and X weapon within range." },
                    { type: "paragraph", text: "A second option is to position our Citadel directly at the edge of the hyperlane jump. While this will waste the X weapon and L weapons in most cases, we can build short-range Defense Platforms directly at the Citadel, using hybrid energy and kinetic weapons or simply short-range torpedoes, allowing them to begin attacking as soon as the enemy fleet jumps into the system." },

                    { type: "divider" },
                    { type: "quote", text: "Harmless at first glance, these creatures will weave the threads that lead us to victory.", cite: "Talloroble on the Weavers", portrait: "img/citas/Talloroble.png", portraitAlt: "Talloroble" }
                ]
            },
            jp: {
                title: "生体艦隊の設計",
                blocks: [
                    { type: "heading", text: "序盤" },

                    { type: "heading", text: "クラッシャーのみ", level: 2 },
                    { type: "paragraph", text: "2200年における最も基本的な構成。" },
                    { type: "paragraph", text: "敵艦隊はランダムであり、効果的な諜報を行えないため、敵について事前に知ることはほとんどできません。" },
                    { type: "paragraph", text: "敵艦隊への対策を判断できるのは、最初の戦闘が発生してからです（戦闘ログと敵艦船のコンポーネントを確認することで判断できます）。序盤ではこの最初の戦闘が最後の戦闘になることも多いため、基本的にはあらゆる相手に備えるのが最も現実的です。" },
                    { type: "paragraph", text: "アメーバや採掘ドローンに苦戦する場合は、エネルギー兵器を使用します。エネルギー生命体に苦戦する場合は、実体弾兵器を使用します。単純に初期接触の手続きを行い、敵の装甲とシールドを確認しましょう。" },
                    { type: "paragraph", text: "使用可能であれば、プラズマやオートキャノンを入手するまで採掘ドローンレーザーを使用するのがおすすめです。" },

                    { type: "heading", text: "ウィーバーについて" },
                    { type: "paragraph", text: "これほど早い段階で使用するのはおすすめしません。ヘラルドやスティンガーと組み合わせることで、より大きな価値を発揮するようになります。" },
                    { type: "divider" },

                    { type: "heading", text: "中盤" },

                    { type: "heading", text: "クラッシャーのみ", level: 2 },
                    { type: "paragraph", text: "可能であればエルダーのクラッシャーのみで構成した、混成兵器艦隊を維持します。クラッシャーは大型艦に対してスケールする特殊なクランプ型G兵器を装備できるため、Sサイズのバランス型兵器によって小型艦に対しても十分に戦え、さらにクランプによって中型艦・大型艦にも対応できます。" },
                    { type: "paragraph", text: "ただし、通常のコルベットと比べて機動力が非常に低いため、注意が必要です。これらのクラッシャーは主力の戦闘ラインとなるだけでなく、近距離での大きなダメージ源にもなります。しかし、コルベットと比べて低い亜光速速度と低い回避率のため、敵後衛の大型艦に接近するまでに大きな損害を受けることになります。" },

                    { type: "heading", text: "ヘラルドとウィーバー", level: 2 },
                    { type: "paragraph", text: "長距離G兵器を入手しているなら、この時点から格納庫とプロトン／ニュートロン・ランチャーを搭載したヘラルドのみの艦隊を編成できます。" },
                    { type: "paragraph", text: "ヘラルドは、亜光速速度と回避率を上昇させる支援兵器（回避ダーツ）や、装甲を保護・再生する兵器（インテリジェント適応型胞子ランチャー）によって、ウィーバーの恩恵を受けられるようになります。" },
                    { type: "paragraph", text: "これらの支援兵器は、それぞれヘラルド1隻につき1基という比率にします。" },
                    { type: "divider" },

                    { type: "heading", text: "終盤" },

                    { type: "heading", text: "ヘラルドとウィーバー", level: 2 },
                    { type: "paragraph", text: "中盤の艦隊設計を発展させた、論理的な最終形です。格納庫とプロトン・ランチャーを搭載したヘラルドを十分に用意します。これらにアフターバーナーを装備し、敵から離脱しながら可能な限り被ダメージを減らし、艦載機と長距離魚雷で攻撃します。" },
                    { type: "paragraph", text: "この構成は空母型戦艦艦隊を模倣したものです。この場合、G兵器を使用することで大型艦に対する火力は大幅に向上しますが、X兵器の射程を失います。小型艦・中型艦への防御については、S・M兵器スロットを持たない代わりに、より多くの格納庫によってその役割を担います。" },
                    { type: "paragraph", text: "ウィーバーは引き続き支援役として、損傷の修復と攻撃力・生存性の向上を担当します。" },

                    { type: "heading", text: "短距離ステルスクラッシャーのみ", level: 2 },
                    { type: "paragraph", text: "T兵器による巻き添えダメージが登場したことで、肉壁となる艦隊はもはやおすすめできません。そのため、クラッシャーの最適な使い道はステルスによる待ち伏せです。" },
                    { type: "divider" },

                    { type: "heading", text: "ゲーム終盤" },

                    { type: "heading", text: "ヘラルドとタイタン", level: 2 },
                    { type: "paragraph", text: "タイタンを1～3隻追加するのも選択肢です。残りはすべて格納庫と長距離G兵器を搭載したヘラルドにします。" },
                    { type: "paragraph", text: "この場合、タイタンは特に別の単独艦隊へ分離することをおすすめします。同じ艦隊に入れても、ヘラルドは味方タイタンのオーラからそれほど大きな恩恵を受けられないためです。ヘラルドの主なダメージ源は艦載機だからです。" },

                    { type: "heading", text: "ウィーバー", level: 2 },
                    {
                        type: "list", items: [
                            "**支援:** ウィーバーは味方艦の支援に専念します。基本的にはスティンガーとヘラルドと組み合わせて使用し、クラッシャーと同時に運用すると問題が発生する可能性があります。",
                            "**制圧:** ウィーバーは敵艦をスタンさせます。90%の確率でスタンさせる制圧兵器があれば、兵器数／敵艦数がほぼ同等である限り十分です。中盤・終盤の危機や没落・覚醒帝国など、高難易度の敵に対して特におすすめです。ただし、リヴァイアサンには効果がありません。"
                        ]
                    },

                    { type: "heading", text: "ステルス・クラッシャー", level: 2 },
                    { type: "paragraph", text: "ステルスによる待ち伏せ艦隊です。生体艦船の中でも最高クラスの機動性を持ち、クランプをG兵器として使用できるため、エルダー型を採用することで近距離でのダメージと耐久力をさらに高められます。没落帝国／覚醒帝国の艦隊など、中型艦・大型艦で構成された艦隊に対して有効です。" },

                    { type: "heading", text: "ヘラルド、クラッシャー、ウィーバーを同じ戦闘で使用する場合の問題", level: 2 },
                    { type: "paragraph", text: "支援ウィーバーは支援兵器を使用するために味方艦を追従することに注意してください。そのため、スティンガー、ヘラルド、ウィーバーの艦隊にクラッシャーを混ぜると、ウィーバーの性能を低下させる可能性があります。艦隊内ではヘラルドよりも多くのクラッシャーを配備できるため、支援ウィーバーは戦場のヘラルドではなくクラッシャーを支援対象として選ぶ可能性が大幅に高くなります。その結果、本来ならヘラルドの後方で安全を維持すべき支援ウィーバーが、クラッシャーとともに前進して支援することになり、各戦闘で大きな損害を受ける可能性があります。結果として、かえって逆効果になります。" },
                    { type: "divider" },

                    { type: "heading", text: "防衛" },

                    { type: "heading", text: "防衛プラットフォームとイオンキャノンの組み合わせ", level: 2 },
                    { type: "paragraph", text: "必要に応じて、防衛プラットフォームとイオンキャノンはさまざまな形で組み合わせることができます。ただし、星系基地の防衛設備を建造した後は、それらが破壊されるまで変更するのは困難です。" },
                    {
                        type: "list", items: [
                            "**イオンキャノン1基＋大量の防衛プラットフォーム:** AI帝国の艦隊に対して有効です。イオンキャノンを1基だけ使用する理由は2つあります。第一の理由は、星系内のどこにいる艦船でも攻撃できるだけの射程を確保することです。これにより、射程外にいることで星系基地の攻撃を受けず、星系の端を通り抜ける艦船が存在しなくなります。第二の理由は、タイタン、戦艦、エルダー生体艦船などの大型艦に対して追加ダメージを与えることです。一方、防衛プラットフォームは、格納庫型でも長距離魚雷型でも、あらゆる種類の艦船、特に小型艦・中型艦に対する主なダメージ源となります。これは星系内で唯一の防衛手段として機能し、敵艦隊に深刻な損害を与えたり、攻撃そのものを撃退したりすることも可能です。ただし、大量の損失を被るため、主にダメージを引き受ける完全編成の艦隊を併用することをおすすめします。",
                            "**可能な限り多くのイオンキャノン＋残りのスロットを防衛プラットフォームで埋める:** 没落・覚醒帝国や中盤・終盤の危機に対して有効です。イオンキャノンは最初の2回の一斉射撃で大型艦をほぼ完全に掃討できる一方、小型艦に対しては無防備になります。そのため、残りのスロットには格納庫型防衛プラットフォームを入れることをおすすめします。これにより、ミサイルや魚雷に対する防御力も多少確保できます。ただし、このタイプの防衛は通常、完全編成の艦隊を支援するために使用するものであり、単独の防衛手段として使用するものではありません。ただし、T兵器による巻き添えダメージのおかげで、現在ではイオンキャノンのみを使用することも可能です。T兵器の射撃を2～3回命中させることができれば、小型艦のみで構成された艦隊を丸ごと撃破できる可能性があります。"
                        ]
                    },

                    { type: "heading", text: "深宇宙要塞の配置", level: 2 },
                    { type: "paragraph", text: "深宇宙要塞では配置が重要です。レベルIIIの要塞で使用できる設計は長距離型のみなので、敵対艦隊が侵入する可能性のあるハイパーレーンのジャンプ地点から離れた、星系の端に要塞を配置したいところです。したがって、各ハイパーレーンの入口や中央の星系基地から十分に離しつつ、格納庫とX兵器が攻撃可能な射程内に収まる位置へ要塞を配置する必要があります。" },
                    { type: "paragraph", text: "もう一つの選択肢は、ハイパーレーンのジャンプ地点のすぐ近くに要塞を配置することです。この場合、ほとんどの状況でX兵器とL兵器を無駄にすることになりますが、要塞そのものに短距離型の防衛プラットフォームを建造し、エネルギー兵器と実体弾兵器の混成兵装、あるいは短距離魚雷を装備させることで、敵艦隊が星系へジャンプした瞬間から攻撃を開始できます。" },

                    { type: "divider" },
                    { type: "quote", text: "一見すると無害なこの生物たちは、我々を勝利へ導く糸を紡ぐだろう。", cite: "ウィーバーについて語るタロローブル", portrait: "img/citas/Talloroble.png", portraitAlt: "タロローブル" }
                ]
            }
        }
    },
    {   // Sobre los titanes y sus auras
        slug: "titanes-aura",
        title: "Sobre los titanes y sus auras",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "**Siguen la misma plantilla que un acorazado artillero**, excepto por su aura, que se explica en profundidad a continuación." },
            { type: "paragraph", text: "Sobre los titanes tenemos dos opciones para combinarlos con la flota de acorazados, pero antes hay que aclarar como funcionan sus auras que básicamente es su razón de ser. Tenemos dos tipos de auras, ofensivas y defensivas, dicho esto:" },
            {
                type: "list", items: [
                    "**Defensivas**: estas auras SOLO afectan a la flota que tiene el titán. Por ejemplo, si tienes un titán con aura de regeneración que está en un sistema con otras 4 flotas, solo la flota del titán se aprovecha de la regeneración, las otras 4 flotas no.",
                    "**Ofensivas**: estas auras afectan a TODAS las flotas enemigas en el sistema que esté el titán."
                ]
            },
            { type: "paragraph", text: "Con esto en mente tenemos dos opciones dependiendo del número de titanes que podamos tener. Si tenemos poca capacidad de titanes, recomiendo distribuir un titan con aura ofensiva en cada flota que puedas. Este titán sigue el mismo esquema que los acorazados artilleros XL pero con el aura ofensiva como extra. Por otro lado, si tenemos mucha capacidad, aconsejo concentrarlos en poca flotas, teniendo flotas con 6 titanes (cada uno con un tipo de aura defensia y ofensiva) de tal forma que tengas flotas insignia con todas las auras acompañadas de flotas sin titanes que se beneficien de las 3 ofensivas. Así aseguras la supervivencia de la flota con los 6 titanes ya que combinar todas las auras es una bonificación muy poderosa." },
            { type: "paragraph", text: "Podemos decir que esta última opción de flotas de acorazados más 6 titanes es la flota definitiva que apoyada por los portahangares las convierte en un anti-todo general, por supuesto es superior a su versión sin titanes." },

            { type: "divider" },
            { type: "quote", text: "Cuando entra a un sistema, sabes que ese sistema es tuyo y si no es tuyo, queda devastado. La resistencia es inútil, no hay crisis o xeno que pueda huir o esconderse, se hace la voluntad del Emperador o se muere en el intento.", cite: "Alta Almirante Sidney Beauclair del Exilio del Mancomunado", portrait: "img/citas/Human_updated_version.png", portraitAlt: "Alta Almirante Sidney Beauclair" }
        ],
        i18n: {
            en: {
                title: "About Titans and Their Auras",
                blocks: [
                    { type: "paragraph", text: "**They follow the same template as an artillery battleship**, except for their aura, which is explained in detail below." },
                    { type: "paragraph", text: "When it comes to Titans, we have two options for combining them with the battleship fleet, but first we need to clarify how their auras work, as this is essentially their whole purpose. We have two types of auras, offensive and defensive. With that in mind:" },
                    {
                        type: "list", items: [
                            "**Defensive**: these auras ONLY affect the fleet that contains the Titan. For example, if you have a Titan with a regeneration aura in a system with 4 other fleets, only the Titan's fleet benefits from the regeneration; the other 4 fleets do not.",
                            "**Offensive**: these auras affect ALL enemy fleets in the system where the Titan is located."
                        ]
                    },
                    { type: "paragraph", text: "With this in mind, we have two options depending on how many Titans we can support. If we have a low Titan capacity, I recommend distributing one Titan with an offensive aura among each fleet you can. This Titan follows the same setup as XL artillery battleships, but with the offensive aura as an additional benefit. On the other hand, if we have a high Titan capacity, I recommend concentrating them into a few fleets, with fleets containing 6 Titans (each with a different defensive and offensive aura), creating flagship fleets with all the auras, accompanied by fleets without Titans that benefit from the 3 offensive auras. This ensures the survival of the fleet with the 6 Titans, as combining all the auras provides a very powerful bonus." },
                    { type: "paragraph", text: "We can say that this last option, with battleship fleets plus 6 Titans, is the ultimate fleet. Supported by carrier fleets, they become a general-purpose anti-everything force. Needless to say, they are superior to their non-Titan version." },

                    { type: "divider" },
                    { type: "quote", text: "When it enters a system, you know that system is yours, and if it is not yours, it will be left devastated. Resistance is futile; there is no crisis or xeno that can flee or hide. The Emperor's will shall be done, or you will die trying.", cite: "High Admiral Sidney Beauclair of the Commonwealth of Man", portrait: "img/citas/Human_updated_version.png", portraitAlt: "High Admiral Sidney Beauclair" }
                ]
            },
            jp: {
                title: "タイタンとそのオーラについて",
                blocks: [
                    { type: "paragraph", text: "**砲撃型戦艦と同じテンプレートを使用します**。ただし、タイタンにはオーラがあり、その詳細については以下で説明します。" },
                    { type: "paragraph", text: "タイタンを戦艦艦隊と組み合わせる方法には2つの選択肢がありますが、その前に、タイタンの存在意義ともいえるオーラがどのように機能するのかを確認しておく必要があります。オーラには攻撃型と防御型の2種類があります。これを踏まえると、" },
                    {
                        type: "list", items: [
                            "**防御型**: これらのオーラは、そのタイタンが所属している艦隊にのみ影響します。例えば、再生オーラを持つタイタンが、他に4つの艦隊が存在する星系にいる場合、再生の恩恵を受けるのはタイタンが所属する艦隊だけで、他の4艦隊は恩恵を受けません。",
                            "**攻撃型**: これらのオーラは、タイタンがいる星系内の**すべての敵艦隊**に影響します。"
                        ]
                    },
                    { type: "paragraph", text: "これを踏まえると、保有できるタイタン数に応じて2つの選択肢があります。タイタン収容上限が少ない場合は、可能な限り各艦隊に攻撃型オーラを持つタイタンを1隻ずつ配備することをおすすめします。このタイタンはXL砲撃型戦艦と同じ構成にし、追加要素として攻撃型オーラを持たせます。一方、タイタン収容上限が多い場合は、少数の艦隊に集中させることをおすすめします。各艦隊に6隻のタイタンを配備し、それぞれ異なる防御型・攻撃型オーラを持たせます。こうすることで、すべてのオーラを備えた旗艦艦隊を編成し、それとは別にタイタンを含まない艦隊を配置して、3種類の攻撃型オーラの恩恵を受けさせることができます。6隻のタイタンを擁する艦隊では、すべてのオーラを組み合わせることで非常に強力なボーナスを得られるため、その生存性を確保できます。" },
                    { type: "paragraph", text: "この最後の選択肢、つまり戦艦艦隊に6隻のタイタンを加える構成は、究極の艦隊編成と言えるでしょう。空母艦隊の支援を受けることで、あらゆる敵に対応できる万能戦力となります。言うまでもなく、タイタンなしの構成よりも強力です。" },

                    { type: "divider" },
                    { type: "quote", text: "奴が星系に入った時点で、その星系がお前のものになることがわかる。もしお前のものではなかったとしても、そこには荒廃だけが残る。抵抗は無意味だ。逃げることも隠れることもできる危機も異星人も存在しない。皇帝の御心に従うか、その過程で死ぬかだ。", cite: "追放されたコモンウェルスのハイ・アドミラル、シドニー・ボークレール", portrait: "img/citas/Human_updated_version.png", portraitAlt: "ハイ・アドミラル・シドニー・ボークレール" }
                ]
            }
        }
    },
    {   // Preparando la simulación de combate
        slug: "simulacion-combate",
        title: "Preparando la simulación de combate",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "Guía completa para preparar una partida óptima para probar diseños de naves y flotas." },
            { type: "note", text: "La configuración es independiente de los DLCs." },

            { type: "heading", text: "1. Configurar la partida" },
            {
                type: "list", items: [
                    "**OBLIGATORIO:** Desactiva el modo Hombre de Hierro.",
                    "Recomiendo no incluir ningún imperio controlado por la IA (imperios normales, caidos, merodeadores, nómadas, etc.).",
                    "El resto de opciones son a tu gusto.",
                ]
            },
            { type: "paragraph", text: "Ya puedes iniciar la partida." },

            { type: "heading", text: "2. Comandos de consola útiles" },
            { type: "paragraph", text: "Por defecto, puedes abrir la consola pulsando la tecla 'º' (a la izquierda de la tecla 1 en teclados QWERTY)." },
            { type: "paragraph", text: "Te recomiendo que actives las opciones de explorar, comunicaciones e inteligencia automática. Además, activa la opción de construcción instantánea para construir y reparar naves rápidamente. " },

            { type: "paragraph", text: "Ejecuta los siguientes comandos en orden en la consola." },
            {
                type: "list", items: [
                    "**research_all_technologies 1 0**: desbloquea toda la tecnología para poder construir cualquier diseño de nave sin esperar.",
                    "**max_resources**: rellena todos los recursos al máximo, útil para construir flotas grandes sin esperar.",
                    "**unlock_edicts**: desbloquea todos los edictos de combate.",
                    "**create_navy <Percentage>**: crea una flota de combate con el porcentaje de fuerza que indiques. Será la flota que simule al imperio IA con los diseños de naves automátizados con los que empiezas la partida",
                ]
            },
            { type: "note", text: "Los nombres exactos de comandos pueden variar entre versiones del juego. Si alguno no funciona, escribe **help** en la consola para ver el listado actualizado de tu versión." },
            { type: "paragraph", text: "Para hacer pruebas de combate contra crisis, puedes forzar su aparición con los siguientes comandos:" },
            {
                type: "list", items: [
                    "**event crisis.199**: Activa la crisis del Azote Prethoryn",
                    "**event crisis.1000**: Activa la crisis de los Invasores Extradimensionales Inesperados",
                    "**event crisis.1100**: Activa la crisis de los Invasores Extradimensionales Aberrantes. No requieren a los Inesperados",
                    "**event crisis.1200**: Activa la crisis de los Invasores Extradimensionales Vehementes. Requieren a los Inesperados",
                    "**event crisis.2000**: Activa la crisis de la Contingencia",
                    "**event crisis.8005**: Activa la crisis de la Reina Sintética"
                ]
            },
            { type: "heading", text: "3. Simulaciones de combate" },
            { type: "paragraph", text: "Tras crear tus dos flotas de prueba, sitúa ambas flotas en el mismo sistema y activa el comando **attackallfleets**, el cual hace que todas tus flotas ataquen a todas las flotas en el sistema actual, incluyendo tus propias flotas. Útil para probar combates entre tus diseños de flota sin depender de un segundo imperio IA o jugador." },
            { type: "paragraph", text: "Con esto puedes iterar diseños de flota muy rápido: cambias un componente, reconstruyes con instant_build y repites el combate, todo sin tener que jugar una partida completa." },

            { type: "divider" },
            { type: "quote", text: "Abraza los dones del Espíritu Máquina. El Omnissiah te guiará.", cite: "Archimago Dominus Belisarius Cawl del Adeptus Mechanicus", portrait: "img/citas/Belisarius_Cawl.jpg", portraitAlt: "Archimago Dominus Belisarius Cawl" }
        ],
        i18n: {
            en: {
                title: "Preparing the Combat Simulation",
                blocks: [
                    { type: "paragraph", text: "A complete guide to preparing an optimal game for testing ship and fleet designs." },
                    { type: "note", text: "The setup is independent of DLCs." },

                    { type: "heading", text: "1. Configure the Game" },
                    {
                        type: "list", items: [
                            "**REQUIRED:** Disable Ironman Mode.",
                            "I recommend not including any AI-controlled empires (regular empires, Fallen Empires, Marauders, Nomads, etc.).",
                            "The remaining options are up to you.",
                        ]
                    },
                    { type: "paragraph", text: "You can now start the game." },

                    { type: "heading", text: "2. Useful Console Commands" },
                    { type: "paragraph", text: "By default, you can open the console by pressing the 'º' key (to the left of the 1 key on QWERTY keyboards)." },
                    { type: "paragraph", text: "I recommend enabling the explore, communications, and automatic intelligence options. Also, enable instant construction to quickly build and repair ships." },

                    { type: "paragraph", text: "Run the following commands in order in the console." },
                    {
                        type: "list", items: [
                            "**research_all_technologies 1 0**: unlocks all technologies so you can build any ship design without waiting.",
                            "**max_resources**: fills all resources to the maximum, useful for building large fleets without waiting.",
                            "**unlock_edicts**: unlocks all combat edicts.",
                            "**create_navy <Percentage>**: creates a combat fleet with the percentage of strength you specify. This is the fleet used to simulate an AI empire using the automated ship designs available at the start of the game.",
                        ]
                    },
                    { type: "note", text: "The exact command names may vary between game versions. If one does not work, type **help** in the console to see the updated command list for your version." },
                    { type: "paragraph", text: "To run combat tests against crises, you can force their appearance with the following commands:" },
                    {
                        type: "list", items: [
                            "**event crisis.199**: Activates the Prethoryn Scourge crisis.",
                            "**event crisis.1000**: Activates the Unbidden crisis.",
                            "**event crisis.1100**: Activates the Aberrant crisis. Does not require the Unbidden.",
                            "**event crisis.1200**: Activates the Vehement crisis. Requires the Unbidden.",
                            "**event crisis.2000**: Activates the Contingency crisis.",
                            "**event crisis.8005**: Activates the Synthetic Queen crisis."
                        ]
                    },
                    { type: "heading", text: "3. Combat Simulations" },
                    { type: "paragraph", text: "After creating your two test fleets, place both fleets in the same system and use the **attackallfleets** command. This makes all your fleets attack every fleet in the current system, including your own fleets. It is useful for testing battles between your own fleet designs without relying on a second AI empire or player." },
                    { type: "paragraph", text: "This allows you to iterate on fleet designs very quickly: change a component, rebuild using instant_build, and repeat the battle, all without having to play through an entire game." },

                    { type: "divider" },
                    { type: "quote", text: "Embrace the gifts of the Machine Spirit. The Omnissiah will guide you.", cite: "Archmagos Dominus Belisarius Cawl of the Adeptus Mechanicus", portrait: "img/citas/Belisarius_Cawl.jpg", portraitAlt: "Archmagos Dominus Belisarius Cawl" }
                ]
            },
            jp: {
                title: "戦闘シミュレーションの準備",
                blocks: [
                    { type: "paragraph", text: "艦船や艦隊の設計をテストするための、最適なゲーム環境を準備する完全ガイドです。" },
                    { type: "note", text: "この設定はDLCの有無に関係なく使用できます。" },

                    { type: "heading", text: "1. ゲームを設定する" },
                    {
                        type: "list", items: [
                            "**必須:** アイアンマンモードを無効にします。",
                            "AIが操作する帝国（通常の帝国、没落帝国、マローダー、ノマドなど）は、できるだけ含めないことをおすすめします。",
                            "その他の設定はお好みで構いません。",
                        ]
                    },
                    { type: "paragraph", text: "これでゲームを開始できます。" },

                    { type: "heading", text: "2. 便利なコンソールコマンド" },
                    { type: "paragraph", text: "デフォルトでは「º」キー（QWERTYキーボードでは1キーの左側）を押すことでコンソールを開けます。" },
                    { type: "paragraph", text: "探索、通信、自動諜報のオプションを有効にすることをおすすめします。また、艦船の建造や修理を素早く行うため、即時建造も有効にしてください。" },

                    { type: "paragraph", text: "コンソールで以下のコマンドを順番に実行します。" },
                    {
                        type: "list", items: [
                            "**research_all_technologies 1 0**: すべてのテクノロジーをアンロックし、待ち時間なしであらゆる艦船設計を建造できるようにします。",
                            "**max_resources**: すべての資源を最大まで補充します。待ち時間なしで大規模艦隊を建造する際に便利です。",
                            "**unlock_edicts**: すべての戦闘エディクトをアンロックします。",
                            "**create_navy <Percentage>**: 指定した戦力割合の戦闘艦隊を作成します。この艦隊は、ゲーム開始時に使用可能な自動生成された艦船設計を使用するAI帝国をシミュレートするために使用します。",
                        ]
                    },
                    { type: "note", text: "コマンドの正確な名前はゲームのバージョンによって異なる場合があります。動作しない場合は、コンソールに **help** と入力して、現在のバージョンで利用可能なコマンド一覧を確認してください。" },
                    { type: "paragraph", text: "危機を相手に戦闘テストを行う場合は、以下のコマンドで強制的に出現させることができます。" },
                    {
                        type: "list", items: [
                            "**event crisis.199**: プレスリン・スカージの危機を発生させます。",
                            "**event crisis.1000**: アンビデンの危機を発生させます。",
                            "**event crisis.1100**: アベラントの危機を発生させます。アンビデンは必要ありません。",
                            "**event crisis.1200**: ヴィーヘメンスの危機を発生させます。アンビデンが必要です。",
                            "**event crisis.2000**: コンティンジェンシーの危機を発生させます。",
                            "**event crisis.8005**: シンセティック・クイーンの危機を発生させます。"
                        ]
                    },
                    { type: "heading", text: "3. 戦闘シミュレーション" },
                    { type: "paragraph", text: "2つのテスト艦隊を作成したら、両方を同じ星系に配置し、**attackallfleets** コマンドを使用します。このコマンドにより、現在の星系にいるすべての艦隊が、あなた自身の艦隊を含むすべての艦隊を攻撃するようになります。2つ目のAI帝国やプレイヤーに頼ることなく、自分の艦隊設計同士の戦闘をテストするのに便利です。" },
                    { type: "paragraph", text: "これにより、艦隊設計を非常に高速に調整できます。コンポーネントを1つ変更し、instant_buildで再建造して、もう一度戦闘を行います。これを繰り返せば、ゲームを最初から最後までプレイする必要はありません。" },

                    { type: "divider" },
                    { type: "quote", text: "機械の精霊の賜物を受け入れよ。オムニッサイアが汝を導くだろう。", cite: "アデプタス・メカニカスのアークマゴス・ドミヌス、ベリサリウス・カウル", portrait: "img/citas/Belisarius_Cawl.jpg", portraitAlt: "アークマゴス・ドミヌス・ベリサリウス・カウル" }
                ]
            }
        }
    },
    {   // Enlaces útiles
        slug: "enlaces-utiles",
        title: "Enlaces útiles",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "Recopilación de páginas externas que uso o recomiendo para consultar información sobre Stellaris." },
            {
                type: "links", items: [
                    { label: "📖Stellaris Wiki oficial", url: "https://stellaris.paradoxwikis.com/", description: "Wiki de referencia con todas las mecánicas, tecnologías y componentes del juego." },
                    { label: "💻Foro oficial de Paradox", url: "https://forum.paradoxplaza.com/forum/tags/stellaris.10/", description: "Anuncios oficiales, notas de parche y discusión con desarrolladores." },
                    { label: "🔬Árbol de tecnología", url: "https://bloodstainedcrow.github.io/stellaris-tech-tree/", description: "Visualización interactiva del árbol de tecnología del juego. [Versión desactualizada](https://turanar.github.io/stellaris-tech-tree/index.html)." },
                    { label: "🌌Álbum oficial", url: "https://imgur.com/a/stellaris-wallpapers-Ao8zhxE", description: "Álbum de fondos de pantalla oficiales de Stellaris." },
                    { label: "🖥️Stellaris Assets", url: "https://tuttu.github.io/StellarisAssets/", description: "Repositorio de recursos y assets para Stellaris." },
                    { label: "📰Xenonion", url: "https://xenonion.com/", description: "Tu noticiero galáctico de confianza." },
                    { label: "🧮Calculadora de recursos por distritos", url: "https://www.desmos.com/calculator/wgmehijwu3?lang=es", description: "Calculadora para estimar los recursos generados por diferentes tipos de distritos en Stellaris." },
                    { label: "👷‍♂️Community Builds", url: "https://stellaris-build.com/", description: "Diseños de imperios creados por la comunidad." },
                    { label: "🌏Comunidad de Stellaris en Reddit", url: "https://www.reddit.com/r/Stellaris/", description: "Comunidad activa para dudas, memes y compartir partidas." },
                    { label: "🎮Stellaris en Steam", url: "https://store.steampowered.com/app/281990/Stellaris/", description: "Página de la tienda y DLCs de Steam." },
                    { label: "🕹️Discord de @IgnisStellaris", url: "https://discord.com/invite/PE2vGqxZpz", description: "Servidor de Discord de la comunidad de [@IgnisStellaris](https://www.youtube.com/@IgnisStellaris)." }
                ]
            },

            { type: "divider" },
            { type: "quote", text: "Pero, sin duda, si quieres la mejor información sobre Stellaris en español, ya sabes donde encontrar mi canal de YouTube 🤩", cite: "Ignis", portrait: "img/citas/Ignis Stellaris sin fondo.png", portraitAlt: "Ignis" }
        ],
        i18n: {
            en: {
                title: "Useful links",
                blocks: [
                    { type: "paragraph", text: "A collection of external pages I use or recommend for looking up information about Stellaris." },
                    {
                        type: "links", items: [
                            { label: "📖Official Stellaris Wiki", url: "https://stellaris.paradoxwikis.com/", description: "Reference wiki containing all the game's mechanics, technologies, and components." },
                            { label: "💻Official Paradox Forum", url: "https://forum.paradoxplaza.com/forum/tags/stellaris.10/", description: "Official announcements, patch notes, and discussions with developers." },
                            { label: "🔬Technology Tree", url: "https://bloodstainedcrow.github.io/stellaris-tech-tree/", description: "Interactive visualization of the game's technology tree. [Outdated version](https://turanar.github.io/stellaris-tech-tree/index.html)." },
                            { label: "🌌Official Album", url: "https://imgur.com/a/stellaris-wallpapers-Ao8zhxE", description: "Album of official Stellaris wallpapers." },
                            { label: "🖥️Stellaris Assets", url: "https://tuttu.github.io/StellarisAssets/", description: "Repository of resources and assets for Stellaris." },
                            { label: "📰Xenonion", url: "https://xenonion.com/", description: "Your trusted galactic news network." },
                            { label: "🧮District Resource Calculator", url: "https://www.desmos.com/calculator/wgmehijwu3?lang=es", description: "Calculator for estimating the resources generated by different district types in Stellaris." },
                            { label: "👷‍♂️Community Builds", url: "https://stellaris-build.com/", description: "Empire builds created by the community." },
                            { label: "🌏Stellaris Community on Reddit", url: "https://www.reddit.com/r/Stellaris/", description: "Active community for questions, memes, and sharing gameplay experiences." },
                            { label: "🎮Stellaris on Steam", url: "https://store.steampowered.com/app/281990/Stellaris/", description: "Steam store page and DLCs." },
                            { label: "🕹️@IgnisStellaris Discord", url: "https://discord.com/invite/PE2vGqxZpz", description: "[@IgnisStellaris](https://www.youtube.com/@IgnisStellaris)'s hispanic community Discord server." }
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "But without a doubt, if you want the best information about Stellaris in Spanish, you already know where to find my YouTube channel 🤩", cite: "Ignis", portrait: "img/citas/Ignis Stellaris sin fondo.png", portraitAlt: "Ignis" }
                ]
            },
            jp: {
                title: "便利なリンク",
                icon: "✦",
                blocks: [
                    { type: "paragraph", text: "Stellarisの情報を調べる際に利用または推奨している外部ページをまとめています。" },
                    {
                        type: "links", items: [
                            { label: "📖Stellaris公式Wiki", url: "[https://stellaris.paradoxwikis.com/](https://stellaris.paradoxwikis.com/)", description: "Stellarisのゲームシステム、テクノロジー、コンポーネントなどを網羅した情報Wiki。" },
                            { label: "💻Paradox公式フォーラム", url: "[https://forum.paradoxplaza.com/forum/tags/stellaris.10/](https://forum.paradoxplaza.com/forum/tags/stellaris.10/)", description: "公式発表、パッチノート、開発者との議論などを確認できます。" },
                            { label: "🔬テクノロジーツリー", url: "[https://bloodstainedcrow.github.io/stellaris-tech-tree/](https://bloodstainedcrow.github.io/stellaris-tech-tree/)", description: "ゲーム内のテクノロジーツリーをインタラクティブに確認できます。[旧バージョン]\([https://turanar.github.io/stellaris-tech-tree/index.html](https://turanar.github.io/stellaris-tech-tree/index.html)。" },
                            { label: "🌌公式アルバム", url: "[https://imgur.com/a/stellaris-wallpapers-Ao8zhxE](https://imgur.com/a/stellaris-wallpapers-Ao8zhxE)", description: "Stellaris公式壁紙のアルバム。" },
                            { label: "🖥️Stellaris Assets", url: "[https://tuttu.github.io/StellarisAssets/](https://tuttu.github.io/StellarisAssets/)", description: "Stellaris向けのリソースやアセットをまとめたリポジトリ。" },
                            { label: "📰Xenonion", url: "[https://xenonion.com/](https://xenonion.com/)", description: "信頼と実績の銀河ニュースチャンネル。" },
                            { label: "🧮地区資源計算機", url: "[https://www.desmos.com/calculator/wgmehijwu3?lang=es](https://www.desmos.com/calculator/wgmehijwu3?lang=es)", description: "Stellarisにおける各種地区から生産される資源量を見積もるための計算機。" },
                            { label: "👷‍♂️Community Builds", url: "[https://stellaris-build.com/](https://stellaris-build.com/)", description: "コミュニティによって作成された帝国設計。" },
                            { label: "🌏RedditのStellarisコミュニティ", url: "[https://www.reddit.com/r/Stellaris/](https://www.reddit.com/r/Stellaris/)", description: "質問、ミーム、プレイ記録の共有などが行われている活発なコミュニティ。" },
                            { label: "🎮Steam版Stellaris", url: "[https://store.steampowered.com/app/281990/Stellaris/](https://store.steampowered.com/app/281990/Stellaris/)", description: "SteamのStellaris本体およびDLCのストアページ。" },
                            { label: "🕹️@IgnisStellarisのDiscord", url: "[https://discord.com/invite/PE2vGqxZpz](https://discord.com/invite/PE2vGqxZpz)", description: "[@IgnisStellaris]\([https://www.youtube.com/@IgnisStellaris](https://www.youtube.com/@IgnisStellaris))のコミュニティDiscordサーバー。" }
                        ]
                    },

                    { type: "divider" },
                    { type: "quote", text: "とはいえ、スペイン語でStellarisについて最高の情報が欲しいなら、私のYouTubeチャンネルがどこにあるかはもう知っていますよね 🤩", cite: "Ignis", portrait: "img/citas/Ignis Stellaris sin fondo.png", portraitAlt: "Ignis" }
                ]
            }
        }
    },
    {   // Fauna espacial
        slug: "fauna-espacial",
        title: "Fauna espacial",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Entidades cristalinas" },
            { type: "image", src: "img/fauna/Cohorte de cristal de zafiro.png", alt: "Cohorte de cristal de zafiro", caption: "Cohorte de cristal de zafiro." },
            { type: "image", src: "img/fauna/Soberano de cristal de zafiro.png", alt: "Soberano de cristal de zafiro", caption: "Soberano de cristal de zafiro." },
            { type: "image", src: "img/fauna/Centinela de cristal de zafiro.png", alt: "Centinela de cristal de zafiro", caption: "Centinela de cristal de zafiro." },
            { type: "divider" },

            { type: "heading", text: "Amebas espaciales" },
            { type: "image", src: "img/fauna/Ameba espacial.png", alt: "Ameba espacial", caption: "Ameba espacial." },
            { type: "image", src: "img/fauna/Ameba espacial madre.png", alt: "Ameba espacial madre", caption: "Ameba espacial madre." },
            { type: "divider" },

            { type: "heading", text: "Tiyanki" },
            { type: "image", src: "img/fauna/Cria de ballena espacial.png", alt: "Cría de ballena espacial", caption: "Cría de ballena espacial." },
            { type: "image", src: "img/fauna/Ballenato espacial.png", alt: "Ballenato espacial", caption: "Ballenato espacial." },
            { type: "divider" },
            { type: "image", src: "img/fauna/Ballena hembra espacial.png", alt: "Ballena hembra espacial", caption: "Ballena hembra espacial." },
            { type: "image", src: "img/fauna/Ballena macho espacial.png", alt: "Ballena macho espacial", caption: "Ballena macho espacial." },
            { type: "divider" },
            { type: "image", src: "img/fauna/Buey ballena espacial.png", alt: "Buey ballena espacial", caption: "Buey ballena espacial." },
            { type: "divider" },

            { type: "heading", text: "Gusanos del vacío" },
            { type: "image", src: "img/fauna/Ninfa de gusano del vacio.png", alt: "Ninfa de gusano del vacío", caption: "Ninfa de gusano del vacío." },
            { type: "image", src: "img/fauna/Cria de gusano del vacio.png", alt: "Cría de gusano del vacío", caption: "Cría de gusano del vacío." },
            { type: "image", src: "img/fauna/Gusano del vacio adulto.png", alt: "Gusano del vacío adulto", caption: "Gusano del vacío adulto." },
            { type: "image", src: "img/fauna/Troika de gusanos del vacio.png", alt: "Troika de gusanos del vacío", caption: "Troika de gusanos del vacío." },
            { type: "divider" },

            { type: "heading", text: "Cutuloides" },
            { type: "image", src: "img/fauna/Cria cutuloide.png", alt: "Cría cutuloide", caption: "Cría cutuloide." },
            { type: "image", src: "img/fauna/Cutuloide adolescente.png", alt: "Cutuloide adolescente", caption: "Cutuloide adolescente." },
            { type: "image", src: "img/fauna/Cutuloides.png", alt: "Cutuloides", caption: "Cutuloides." },
            { type: "divider" },

            { type: "heading", text: "Diseños de flotas" },
            { type: "note", text: "Guía de flotas estándar (no mecánica ni biológica) para las primeras etapas de la partida, cuando la fauna espacial es la principal amenaza." },

            { type: "heading", text: "Inicio de juego" },
            { type: "note", text: "Solo corbetas" },
            { type: "paragraph", text: "Lo más básico para el año 2200." },
            { type: "paragraph", text: "Los enemigos serán aleatorios y no podrás saber nada de ellos ya que no podrás espiarles efectivamente." },
            { type: "paragraph", text: "Solo podrás saber como contrarrestar su flota una vez que ocurra la primera batalla (viendo el log y los componentes enemigos), que en el early game suele ser también la última, así que lo más viable es prepararse contra todo." },
            { type: "paragraph", text: "Si tienes problemas de amebas o drones mineros, usa armas de energía. Si tienes problemas con entidades de energía, usa armas cinéticas. Simplemente, haz el protocolo de primer contacto y mira el blindaje y escudo." },
            { type: "note", text: "Solo destructores" },
            { type: "paragraph", text: "Muy caros en el early game y muy débiles contra corbetas, mejor no usarlos." },
            { type: "divider" },

            { type: "heading", text: "Mitad de juego" },
            { type: "note", text: "Solo corbetas" },
            { type: "paragraph", text: "En caso de una flota solo de corbetas, son útiles con disruptores, muy destructivos. En cambio, te aseguras pérdidas en cada combate." },
            { type: "note", text: "Solo cruceros" },
            { type: "paragraph", text: "Si has centrado tu investigación militar en misiles, es posible que tengas ya los misiles de remolino de primer nivel. Aunque son menos eficaces, ya puedes empezar a montar tu flota de cruceros artilleros de misiles." },
            { type: "divider" },

            { type: "heading", text: "Juego tardío" },
            { type: "note", text: "Solo cruceros" },
            { type: "paragraph", text: "Una opción rápida de investigar y muy eficaz contra flotas de IA. Solo cruceros artilleros de misiles son más que suficientes para hacer frente incluso a flotas superiores en potencia de flota. Solo necesitan dos armas, los misiles de remolino y los misiles merodeadores, así que es muy sencillo obtener el máximo daño muy pronto. Además, los cruceros con triple postquemador tienen una gran velocidad, ideal antes de tener portales o mientras construyes tu red de hiperrelés." },
            { type: "paragraph", text: "Hay que destacar un punto negativo, y es que estos cruceros sufren mucho contra flotas de artillería que no son de misiles o contra flotas muy buffadas por la dificultad, como las de crisis de mitad de juego, los imperios caídos y despertados y la crisis de fin de juego. En el caso de las crisis de mitad de juego, lo más probable es que puedas superarlas con estas flotas aunque sufriendo algunas pérdidas. Sin embargo, contra imperios caídos/despertados y crisis de fin de juego, si no eres capaz de ganar en una sola batalla, sufrirás tantas pérdidas a pesar de ganar algunos combates iniciales, que perderás por desgaste, ya que no serás capaz de destruir las flotas enemigas al completo y simplemente huirán mientras que las tuyas sí sufrirán pérdidas batalla tras batalla." },
            { type: "note", text: "Solo acorazados" },
            { type: "paragraph", text: "Acorazados artilleros combinados con acorazados portahangares. Esta combinación es la definitiva, si bien es mucho más cara de construir y de investigar, pero merece la pena. Los artilleros son tu fuente principal de daño contra objetivos grandes y medianos, mientras que los portahangares son el escudo defensivo de los artilleros, además de la fuente principal de daño contra objetivos pequeños y medianos. Eficaces contra imperios caídos/despertados y crisis de mitad y fin de juego por igual. No obstante, es posible que a esta altura aún no cuentes con la artillería cinética o algún arma X necesaria para que esta combinación funcione adecuadamente." },
            { type: "divider" },

            { type: "heading", text: "Final de juego" },
            { type: "note", text: "Acorazados" },
            { type: "paragraph", text: "De 1 a 3 titanes, el resto mitad de acorazados artilleros y mitad de acorazados portahangares." },
            {
                type: "list", items: [
                    "El titán sirve de buffer/debuffer. Si llevas más de uno, cada uno debe llevar un aura ofensiva distinta.",
                    "Los acorazados artilleros son la principal fuente de daño.",
                    "Los acorazados portahangares sirven de escudo defensivo contra naves más pequeñas como corbetas, destructores, naves de ataque y fragatas, para que no alcancen a los acorazados artilleros."
                ]
            },
            { type: "note", text: "Cruceros" },
            { type: "paragraph", text: "Solo cruceros artilleros de misiles." },
            { type: "paragraph", text: "Meta contra flotas de imperios de la IA. Menos eficaz contra imperios caídos, despertados y crisis de mitad y final de juego." },
            { type: "paragraph", text: "Gracias al ordenador de combate de artillería, estos cruceros tratarán de alejarse continuamente de los enemigos mientras lanzan una saturación de misiles imposible de detener por defensa de punto normal." },
            { type: "paragraph", text: "Solo pueden ser superados por naves con mayor rango de ataque, por ejemplo, la flota mixta de acorazados, las naves de imperio caído o las de crisis." },
            { type: "paragraph", text: "Su extrema velocidad con triple postquemador hace que sean más rápidas que cualquier otra nave del juego, excepto las corbetas." },
            { type: "note", text: "Corbetas" },
            { type: "paragraph", text: "El enjambre de corbetas con disruptores tiene dos usos principales en los que destaca por encima de todas las demás." },
            {
                type: "list", items: [
                    "**Carne de cañón:** en grandes combates de flotas, los acorazados portahangares no son suficientes para proteger a los acorazados artilleros. Por tanto, se suman grandes cantidades de corbetas como muro desechable.",
                    "**Flota defensiva pírrica:** en caso de necesidad, esta flota puede ganar en 1vs1 a cualquier otra flota del juego que no sea especializada contra ella (como cruceros de disruptores), aunque sufriendo en muchos casos una victoria pírrica, siendo suficiente para expulsar invasores. Además, al ser una flota de corbetas, tiene una mucho mayor velocidad para llegar a cualquier rincón de tu imperio."
                ]
            },

            { type: "divider" },
            { type: "quote", text: "Arregla la fauna espacial... ¡PAAAAARAAAAAAAAAADOOOOOOOOOX!", cite: "Capitán Marla" }
        ],
        i18n: {
            en: {},
            jp: {}
        }
    },
    {   // Flotas contra crisis
        slug: "flotas-contra-crisis",
        title: "Flotas contra las crisis",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Diseños recomendados por crisis" },
            { type: "note", text: "Plantillas de nave pensadas específicamente para enfrentarse a cada crisis de fin de juego." },

            { type: "heading", text: "Prethoryn" },
            {
                type: "list", items: [
                    "**Acorazado (Portahangares):** Ratio: todo · Módulos: X-SSPPHH-MM.",
                    "**Armamento:** 1 lanza de taquiones, 2 plasma S, 2 defensa de punto, 2 hangar, 2 plasma M.",
                    "**Ordenador:** artillería · **Accesorio:** 3 control de fuego auxiliar.",
                    "**Defensas:** 6 blindajes."
                ]
            },

            { type: "heading", text: "Invasores extradimensionales" },
            {
                type: "list", items: [
                    "**Acorazado (Artillería):** Ratio: todo · Módulos: X-LLL-L.",
                    "**Armamento:** 1 gigacañón, 4 artillería cinética.",
                    "**Ordenador:** artillería · **Accesorio:** 1 control de fuego auxiliar, 1 potenciador de reactor.",
                    "**Defensas:** 5 escudos + 1 blindaje."
                ]
            },

            { type: "heading", text: "Contingencia" },
            {
                type: "list", items: [
                    "**Acorazado (Artillero):** Ratio: todo · Módulos: X-LLL-MM.",
                    "**Armamento:** 1 emisor de arcos concentrado.",
                    "**Ordenador:** artillería · **Accesorio:** 3 postquemador.",
                    "**Defensas:** ninguna."
                ]
            },

            { type: "heading", text: "Cetana" },
            {
                type: "list", items: [
                    "**Acorazado (Anti flotas NO Cetana):** Ratio: todo · Módulos: X-SSPPHH-MM.",
                    "**Armamento:** 1 emisor de arcos, 2 misiles merodeadores, 2 antiaéreos, 2 hangares, 2 misiles de remolino.",
                    "**Ordenador:** portahangares · **Accesorio:** 3 endurecedor de escudos.",
                    "**Defensas:** 5 escudos + 1 blindaje imbuido de cristales.",
                    "**Crucero (Anti Cetana):** Ratio: todo · Módulos: GSS-GSS-SS.",
                    "**Armamento:** 3 torpedos devastadores.",
                    "**Ordenador:** torpedo · **Accesorio:** 3 endurecedor de escudos.",
                    "**Defensas:** 5 escudos + 3 blindajes."
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Composición de las flotas enemigas" },

            { type: "heading", text: "Flotas Prethoryn" },
            { type: "paragraph", text: "**Flotas:**" },
            {
                type: "list", items: [
                    "Acorazados, cruceros, destructores y corbetas.",
                    "Vanguardia: 30 corbetas.",
                    "Nidos: 1 acorazado, 8 cruceros, 10 destructores, y 35 corbetas."
                ]
            },
            { type: "paragraph", text: "**Defensas:** blindaje." },
            { type: "paragraph", text: "**Armas:** torpedos, hangares y cinética." },
            { type: "divider" },

            { type: "heading", text: "Flotas Invasores Extradimensionales" },
            { type: "paragraph", text: "**Flotas:**" },
            {
                type: "list", items: [
                    "Acorazados, cruceros y destructores.",
                    "Iniciales: 8 acorazados, 12 cruceros y 20 destructores.",
                    "Refuerzos: 5 acorazados, 8 cruceros y 15 destructores.",
                    "Portal: 20 acorazados, 30 cruceros y 45 destructores."
                ]
            },
            { type: "paragraph", text: "**Defensas:** escudos." },
            { type: "paragraph", text: "**Armas:** casi todo armas de energía, poca defensa de punto." },
            { type: "divider" },

            { type: "heading", text: "Flotas Contingencia" },
            { type: "paragraph", text: "**Flotas:**" },
            {
                type: "list", items: [
                    "Acorazados y cruceros.",
                    "Arietes: 10 acorazados y 20 cruceros.",
                    "Hub: 25 acorazados y 50 cruceros."
                ]
            },
            { type: "paragraph", text: "**Defensas:** compensados escudos y blindajes (poco casco)." },
            { type: "paragraph", text: "**Armas:** solo armas de energía." },
            { type: "divider" },

            { type: "heading", text: "Flotas Cetana" },
            { type: "paragraph", text: "**Flotas:**" },
            {
                type: "list", items: [
                    "Acorazados y cruceros (Defensores y heraldos).",
                    "Flotas iniciales: 3 defensores y 18 heraldos.",
                    "Flotas defensivas: 1 defensor y 6 heraldos.",
                    "Convoyes: 1 defensor y 6 heraldos.",
                    "Flotas en sistemas demandados: 18 heraldos."
                ]
            },
            { type: "paragraph", text: "**Defensas:**" },
            {
                type: "list", items: [
                    "Cetana: blindaje de pulsos con 100% endurecimiento de blindaje, extra escudos y regeneración de casco y blindaje.",
                    "Defensores: mitad blindaje de pulsos con 25% endurecimiento de escudos y mitad escudos de materia oscura y regeneración de casco y blindaje.",
                    "Heraldos: blindaje de pulsos con un poco de regeneración de casco y blindaje."
                ]
            },
            { type: "paragraph", text: "**Armas:**" },
            {
                type: "list", items: [
                    "Cetana: armas T de energía, muchos hangares, armas de energía y defensa de punto y antiaéreos.",
                    "Defensores: armas X de energía, muchos hangares y armas de energía.",
                    "Heraldos: un arma X de energía y antiaéreos.",
                    "Bases estelares: arma X de energía, armas de energía y defensa de punto."
                ]
            },
            { type: "divider" },

            { type: "heading", text: "Potencia de flota por crisis" },
            { type: "note", text: "En el documento original solo la fila de dificultad Gran Almirante tiene valores rellenos (el resto de dificultades y algunas columnas están vacías); cada celda muestra tres cifras separadas por barras tal cual aparecen en la fuente." },
            {
                type: "list", items: [
                    "**Prethoryn (Gran Almirante):** 32,5 / 9,25 / 1 — 130 / 37 / 1 — 260 / 74 / 1 — 390 / 111 / 1 — 520 / 148 / 1 — 650 / 185 / 1 — 1.3M / 370K / 1 — 3250 / 925 / 1.",
                    "**Unbidden (Gran Almirante):** 95 / 30 / 0 — 380 / 120 / 0 — 760 / 240 / 0 — 1140 / 360 / 0 — 1520 / 480 / 0 — 1900 / 600 / 0 — 3800 / 1200 / 0 — 9.5M / 3M / ?.",
                    "**Contingency (Gran Almirante):** 100 / 40 / 6 — 400 / 160 / 24 — 800 / 320 / 48 — 1200 / 480 / 72 — 1600 / 640 / 96 — 2000 / 800 / 120 — 3.2M / 1.2M / 266K — 10M / 4M / 600K.",
                    "**Cetana (Gran Almirante):** 3.2M / 1.2M / 266K — 10M / 4M / 600K (solo hay valores en las dos últimas columnas)."
                ]
            },

            { type: "divider" },
            { type: "quote", text: "La galaxia no avisa antes de cambiar. Cuando llegue la próxima crisis, no tendremos tiempo para prepararnos.", cite: "Oficial Oráculo, tras analizar 4.541.682 posibles futuros", portrait: "img/citas/Oracle.png", portraitAlt: "Oficial Oráculo" }
        ],
        i18n: {
            en: {},
            jp: {}
        }
    },
    {   // Flotas de Ambición y Especiales
        slug: "flotas-ambicion-especiales",
        title: "Flotas de Ambición y Especiales",
        icon: "✦",
        blocks: [
            { type: "heading", text: "Amenazantes" },

            { type: "heading", text: "Enjambre de corbetas amenazantes" },
            { type: "image", src: "img/ambicion/.png", alt: "Enjambre de corbetas amenazantes", caption: "" },
            { type: "image", src: "img/ambicion/.png", alt: "Enjambre de corbetas amenazantes", caption: "" },
            { type: "paragraph", text: "Las corbetas amenazantes no tienen costes añadidos según el tipo de componente, el mantenimiento es mucho menor que el de una corbeta normal, el coste de construcción siempre es fijo en minerales, se construyen más rápido, tienen bonus al daño de armas de la nave, las estadísticas base son superiores a las de una corbeta normal y tienen un espacio de componente auxiliar extra. Todo esto hace que sean extremadamente superiores a las corbetas normales, dejándolas en un segundo plano." },
            { type: "paragraph", text: "La clave de estas corbetas reside en que su coste de construcción es fijo en minerales, esto permite por ejemplo ponerle componentes de materia oscura, zro o nanorrobots sin ningún coste de recursos raros añadido. Ocurre igual con los componentes de arqueotecnologías. Concretamente, los lanzadores de nubes de nanomisiles antiguos son una versión mejorada de los disruptores, a cambio de necesitar un espacio S por fuerza." },

            { type: "heading", text: "Comedor de estrellas" },
            { type: "image", src: "img/ambicion/.png", alt: "Comedor de estrellas", caption: "" },
            { type: "image", src: "img/ambicion/.png", alt: "Comedor de estrellas", caption: "" },
            { type: "paragraph", text: "Estas naves tienen mayor poder destructivo que un gigante, a cambio de no tener armas X ni aura, siendo de hecho inferiores para enfrentar otros objetivos de gran tamaño ni sirven como buffers. Además, no tienen un coste fijo en minerales, lo que las hace inferiores en el armamento que nos podamos permitir ponerles." },

            { type: "heading", text: "Destructores amenazantes" },
            { type: "image", src: "img/ambicion/.png", alt: "Destructores amenazantes artilleros", caption: "Destructores amenazantes artilleros." },

            { type: "heading", text: "Cruceros amenazantes" },
            { type: "image", src: "img/ambicion/.png", alt: "Cruceros amenazantes artilleros", caption: "Cruceros amenazantes artilleros." },
            { type: "divider" },

            { type: "heading", text: "Imperio caído máquina" },

            { type: "heading", text: "Escoltas misteriosas" },
            { type: "image", src: "img/ambicion/.png", alt: "Escolta artillera", caption: "Escolta artillera." },
            { type: "image", src: "img/ambicion/.png", alt: "Escolta torpedera de corto alcance con sigilo", caption: "Escolta torpedera de corto alcance con sigilo." },
            { type: "image", src: "img/ambicion/.png", alt: "Escolta torpedera de largo alcance", caption: "Escolta torpedera de largo alcance." },
            { type: "divider" },

            { type: "heading", text: "Crucero de batalla" },
            { type: "image", src: "img/ambicion/.png", alt: "Cruceros de batalla artilleros a larga distancia", caption: "Cruceros de batalla artilleros a larga distancia. Dado que todas las armas tienen largo alcance, es un diseño recomendado." },
            { type: "image", src: "img/ambicion/.png", alt: "Cruceros de batalla torpederos a corta distancia", caption: "Cruceros de batalla torpederos a corta distancia. Este diseño es poco recomendado, ya que las armas X, que no sean el emisor de arcos, no podrán ser utilizadas mientras usas las armas G y viceversa." },
            { type: "image", src: "img/ambicion/.png", alt: "Cruceros de batalla torpederos a larga distancia", caption: "Cruceros de batalla torpederos a larga distancia. Dado que todas las armas tienen largo alcance, es un diseño recomendado." },
            { type: "divider" },

            { type: "heading", text: "Titán paradójico" },
            { type: "image", src: "img/ambicion/.png", alt: "Titán paradójico", caption: "" },
            { type: "paragraph", text: "Como cualquier titán normal, su principal uso es de buffer/debuffer. Aunque esta versión es mucho más poderosa que un titán normal y será capaz de eliminar con una salva de sus dos armas T a cualquier otra nave." },
            { type: "divider" },

            { type: "heading", text: "Imperio caído biológico" },
            { type: "image", src: "img/ambicion/.png", alt: "Macero cifrador de corto alcance", caption: "Macero cifrador de corto alcance." },
            { type: "image", src: "img/ambicion/.png", alt: "Tejedores de dilema de apoyo de largo alcance", caption: "Tejedores de dilema de apoyo de largo alcance." },
            { type: "divider" },
            { type: "image", src: "img/ambicion/.png", alt: "Heraldos de laberinto con torpedos de largo alcance", caption: "Heraldos de laberinto con torpedos de largo alcance." },
            { type: "image", src: "img/ambicion/.png", alt: "Aguijón críptico como titanes artilleros", caption: "Aguijón críptico como titanes artilleros." },
            { type: "divider" },

            { type: "heading", text: "Naves nanorrobot" },

            { type: "heading", text: "Enjambrador de nanorrobots" },
            { type: "image", src: "img/ambicion/.png", alt: "Enjambre de naves de ataque", caption: "Enjambre de naves de ataque." },
            { type: "image", src: "img/ambicion/.png", alt: "Enjambre de torpedos de corta distancia con sigilo", caption: "Enjambre de torpedos de corta distancia con sigilo." },
            { type: "divider" },
            { type: "image", src: "img/ambicion/.png", alt: "Enjambre de torpedos de larga distancia", caption: "Enjambre de torpedos de larga distancia." },

            { type: "heading", text: "Interdictor nanorrobot" },
            { type: "image", src: "img/ambicion/.png", alt: "Interdictor torpedero de largo alcance", caption: "Interdictor torpedero de largo alcance." },
            { type: "image", src: "img/ambicion/.png", alt: "Interdictor torpedero de corto alcance con sigilo", caption: "Interdictor torpedero de corto alcance con sigilo." },
            { type: "image", src: "img/ambicion/.png", alt: "Interdictor portahangares", caption: "Interdictor portahangares." },

            { type: "divider" },
            { type: "quote", text: "Ahora que han nerfeado a los enjambres de misiles, nadie me recluta y estoy intentando reinventarme...", cite: "Comandante Xondar, tras el endurecimiento de blindaje y escudo", portrait: "img/citas/Xondar.png", portraitAlt: "Comandante Xondar" }
        ],
        i18n: {
            en: {},
            jp: {}
        }
    },
    {   // Lista de deseos
        slug: "lista-de-deseos-ignis",
        title: "Lista de deseos de Ignis",
        icon: "📝",
        hidden: true,
        triggers: ["lista de deseos", "wishlist", "deseos de ignis", "lista de deseos de ignis"],
        blocks: [
            { type: "paragraph", text: "Ideas y mecánicas que me gustaría ver en Stellaris algún día, recopiladas mientras juego. Los puntos marcados como **(añadido)** ya han sido implementados por Paradox desde que se apuntaron aquí." },
            {
                type: "list", items: [
                    "(visto) Permitir pactos a nivel de federaciones.",
                    "**(añadido)** Base estelar megaacorazada (megaestructura).",
                    "Granja hidropónica gigante (megaestructura).",
                    "Marcar las partidas guardadas que han alcanzado el año de victoria y si has ganado o perdido.",
                    "Que la potencia de crisis muestre la potencia de flota de la crisis en el menú de nueva partida.",
                    "Potencia de crisis dinámica, que se recalcule antes de aparecer según el poder del mejor imperio de la partida.",
                    "Poder cambiar el tipo de federación con una penalización al nivel y a la cohesión.",
                    "Poder comprar las sucursales de megacorporación para quitarlas de tus planetas.",
                    "Casus belli para disolver una federación.",
                    "Poder hacer tus propias plantillas de planetas que se vayan construyendo solas con los recursos que asignes a los sectores (un nuevo menú de Diseño Planetario, igual que el de las naves).",
                    "Nuevos líderes para naves de construcción (ingenieros/arquitectos), con sus propios rasgos, que puedas asignar a los planetas para ayudar con la velocidad de construcción.",
                    "Nueva crisis: un megaimperio caído en el centro de la galaxia.",
                    "Nueva ley en la federación o en la comunidad galáctica para un depósito de recursos que \"rescate\" a los miembros en déficit de ese recurso; usar el depósito te obliga a dar favores al resto de miembros, y puedes decidir si usarlo o no.",
                    "Anillos orbitales y estaciones en pestañas separadas dentro del breviario.",
                    "Poder elegir el diseño del gigante (ahora mismo no se puede elegir).",
                    "Que los imperios caídos empiecen con hiperrelés.",
                    "**(añadido)** Dividir algunos rasgos de las poblaciones en educación/experiencia, que se van ganando conforme se realiza un trabajo (una población produce más créditos cuanto más tiempo lleva trabajando como técnico).",
                    "Poder ver, dentro de la partida, toda la configuración inicial que elegiste.",
                    "Que la IA juegue en torno al metajuego de combate a partir de ciertas dificultades, sin perder parte de su personalidad."
                ]
            },

            { type: "divider" },
            { type: "quote", text: "Porque pedir es gratis", cite: "Morr, apóstol del Instrumento del Deseo", portrait: "img/citas/Morr.png", portraitAlt: "Morr, apóstol del Instrumento del Deseo" }

        ],
        i18n: {
            en: {},
            jp: {}
        }
    },
    {   // MUGANI
        slug: "MUGANI",
        title: "MUGANI?",
        icon: "☣",
        hidden: true,
        triggers: ["MUGANI", "mugani", "Mugani"],
        blocks: [
            { type: "paragraph", text: "HAK HAK HAK!" },
            { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. " },
            { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK-HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
            { type: "paragraph", text: "HAK HAK HAK, HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK, HAK HAK HAK HAK HAK." },
            { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK? HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
            { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. " },
            { type: "paragraph", text: "HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK." },
            { type: "paragraph", text: "HAK HAK HAK? HAK HAK HAK" },

            { type: "divider" },
            { type: "quote", text: "MUGANI?", cite: "Reina Prethoryn", portrait: "img/citas/Alien_Swarmprethoryn.png", portraitAlt: "Reina Prethoryn" }
        ],
        i18n: {
            en: {
                title: "MUGANI?",
                blocks: [
                    { type: "paragraph", text: "HAK HAK HAK!" },
                    { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. " },
                    { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK-HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK, HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK, HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK? HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. " },
                    { type: "paragraph", text: "HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK? HAK HAK HAK" },

                    { type: "divider" },
                    { type: "quote", text: "MUGANI?", cite: "Prethoryn Queen" }
                ]
            },
            jp: {
                title: "MUGANI?",
                blocks: [
                    { type: "paragraph", text: "HAK HAK HAK!" },
                    { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. " },
                    { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK-HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK, HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK, HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK HAK HAK HAK? HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK HAK HAK HAK HAK HAK. " },
                    { type: "paragraph", text: "HAK HAK HAK. HAK HAK HAK HAK HAK HAK. HAK HAK HAK, HAK HAK HAK HAK HAK HAK. HAK, HAK HAK HAK HAK HAK HAK HAK HAK HAK." },
                    { type: "paragraph", text: "HAK HAK HAK? HAK HAK HAK" },

                    { type: "divider" },
                    { type: "quote", text: "MUGANI?", cite: "Prethoryn Queen" }
                ]
            }
        }
    },
    {   // Singularidad de clase 30
        slug: "singularidad-clase-30",
        title: "Singularidad de clase 30",
        icon: "☣",
        hidden: true,
        triggers: ["Singularidad", "30", "singularidad", "clase 30",],
        blocks: [
            { type: "paragraph", text: "Pasaremos a evaluar qué posibles amenazas constituyen una Singularidad de Clase 30 que, según el Protocolo de Contingencia, en teoría, podría desestabilizar el tejido de todo el universo. Lo que conocemos hasta ahora es que existe la producción de energía de manera segura y estable a través de las Singularidades de Clase 3 y 4 utilizadas por los imperios más avanzados tecnológicamente. En teoría, una Singularidad 26 veces superior, sería capaz de desgarrar el tejido del universo, ya sea para moldearlo, destruirlo o reiniciarlo de alguna forma desconocida." },
            { type: "divider" },
            { type: "paragraph", text: "Primera hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la heterofasia.** Un motor heterofásico sería capaz de acumular una cantidad tan ingente de materia oscura, que podría desgarrar el tejido del universo para fusionarlo parcialmente con otras dimensiones, presumiblemente el Velo. Por tanto, una Singularidad de Clase 30, podría ser una civilización que alcance este hito. Aunque análisis posteriores de la Contingencia, indican que no hay fragmentos de código que referencien una posible activación bajo dichas condiciones." },
            { type: "divider" },
            { type: "paragraph", text: "Segunda hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la invasión extradimensional.** El motor heterofásico y el desgarro de la realidad no es más que una parte del proceso. El objetivo final sería utilizar toda la energía acumulada por el motor y la galaxia anfitriona para ascender hasta el estado de entidades de energía que moran el Velo, conocidos en nuestra realidad como los Invasores Extradimensionales. La propia ascensión sería la Singularidad de Clase 30." },
            { type: "divider" },
            { type: "paragraph", text: "Tercera hipótesis sobre la Singularidad de Clase 30: **la hipótesis del señuelo.** Los creadores de la Contingencia, inventaron el término Singularidad de Clase 30 para confundir a cualquier posible individuo o imperio que quisiera indagar en los orígenes y propósitos del protocolo. Por tanto, la información aportada por la Contingencia no sería veraz, sino una burda manipulación para desviar el foco de atención del verdadero propósito de sus creadores. La propia Contingencia desconocería su objetivo real y viviría en un engaño perpetuo, siendo la esterilización galáctica el medio para el desconocido fin de sus creadores." },
            { type: "divider" },
            { type: "paragraph", text: "Cuarta hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la galaxia cíclica.** Por los hechos narrados en el banco de datos P, registros 2000 a 2090, y por la información recabada de un antaño imperio despertado, los Antiguos Cuidadores, sabemos que la Contingencia ha sido activada, al menos, 2 veces. La primera fue con los Cibrex, ya sea porque originalmente eran una parte de los Cibrex o simplemente los usaran para sus planes de esterilización, y por otro lado durante la época de los Antiguos Cuidadores, que cayeron en un letargo autoimpuesto tras enfrentarse a su antiguo archienemigo, la Contingencia. Es por ello plausible creer que la Contingencia ha llevado a la galaxia al punto de la esterilización varias veces, reiniciando el ciclo de vida orgánico y sintiente en general, o, en su defecto, ha dejado la galaxia tan maltrecha, que los imperios supervivientes entraron en un letargo social, económico, militar y tecnológico durante eones o centenares de años, hasta acabar siendo los demacrados imperios caídos que conocemos. Más información en el banco de datos P." },
            { type: "divider" },
            { type: "paragraph", text: "Quinta hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la aguja del horizonte.** Tenemos registros de lo que la megaestructura conocida como la aguja del horizonte puede hacer a nuestra realidad en caso de ser utilizada para rasgar el tejido de un agujero negro. Pues se dice que su finalidad es la de moldear la realidad. En este caso, la Singularidad de Clase 30 sería el desgarro en el tejido del universo provocado por el uso de la aguja del horizonte o, en su defecto, la civilización capaz de construir y manipular dicho artefacto." },
            { type: "divider" },
            { type: "paragraph", text: "Sexta hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la hipotermia universal.** Las teorías más avanzadas indican que es posible que el universo se acerque, lenta e inexorablemente, a un proceso de enfriamiento total. Un proceso de reducción de la entropía a escala universal. No obstante, conocemos la existencia de una megaestructura llamada el Crisol Galáctico. Esta estructura estaría destinada a revertir el proceso de hipotermia, transformando artificialmente las estrellas de una galaxia en gigantes rojas. Este proceso artificial, sería la Singularidad de Clase 30, pues iría contra la naturaleza misma del universo y evitaría que se alcanzase el estado posterior a la hipotermia total." },
            { type: "divider" },
            { type: "paragraph", text: "Séptima hipótesis sobre la Singularidad de Clase 30: **la hipótesis de Última Vigilia y los Cazadores.** Tal y como se ha descrito en la Sexta hipótesis sobre la creación, una Singularidad de Clase 30 podría ser una civilización que ha desarrollado la capacidad de viajar entre galaxias, haciendo usos de unas teóricas hipervías galácticas o con otro método desconocido. En este caso, una civilización superior, estaría activamente monitoreando e impidiendo desde las sombras que otras civilizaciones les amenacen con una posible expansión hipergaláctica. Esto es similar al despliegue de fuerzas terrestres en un mundo Pre-UL que está cerca de iniciar su viaje por las estrellas. Por tanto, por los hechos narrados en los registros 10 a 234, concretamente en la décima hipótesis, la hipótesis de la Última Vigilia, los propios Cazadores, o quien sea que los hayan enviado para acabar con el Azote Prethoryn, tienen diversas formas de eliminar Singularidades de Clase 30, imperios como los Prethoryn, que fueron capaces de viajar a distintas galaxias y que son perseguidos por ello." },
            { type: "divider" },
            { type: "paragraph", text: "Octava hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la ascensión al Velo.** En el banco de datos A, registros 1 a 6, se narran los hechos vividos por el imperio Zroni. Los Zroni, fueron, presumiblemente, la primera especie capaz de abandonar completamente nuestra realidad material para ascender al Velo. Siendo la dimensión del Velo conocida por seres tan maravillosos como atroces, la Contingencia puede querer prevenir la ascensión de nuevas especies a su forma psiónica pura en el Velo y, concretamente, la aparición de una entidad psiónica pura en un evento conocido como el Final del Ciclo. Más información en los registros mencionados." },
            { type: "divider" },
            { type: "paragraph", text: "Novena hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la amenaza extinta.** La Contingencia, tiempo atrás, consiguió cumplir su objetivo de eliminar a la amenaza que alcanzó el estatus de Singularidad de Clase 30, el objetivo original de sus creadores. Esto la ha sumido en un letargo durante tantos milenios que la propia Contingencia, haciendo gala de su adaptabilidad, se reprogramó para hallar un nuevo propósito, que consistió en redirigir sus esfuerzos en la esterilización galáctica sistemática. Si bien es cierto que fue creada para eliminar a las Singularidades de Clase 30, esa amenaza ya pereció y no hay nada ni remotamente cercano a tal magnitud." },
            { type: "divider" },
            { type: "paragraph", text: "Décima hipótesis sobre la Singularidad de Clase 30: **la hipótesis del último sacrificio.** La Contingencia, se enfrentó una o varias veces, en distintas épocas, a distintas Singularidades de Clase 30, pero el desgaste temporal y las sucesivas guerras galácticas contra estas amenazas, ha desgastado al protocolo hasta tal punto que su activación prematura, antes de que un imperio alcance la Singularidad de Clase 30, es la única posibilidad que tiene ahora de lograr su objetivo. Así pues, antes de verse opacada en fuerzas por un posible imperio en camino a alcanzar la Singularidad de Clase 30, la Contingencia ha decidido tomar acciones preventivas y esterilizar sistemáticamente la galaxia cuando su protocolo estima oportuno." },
            { type: "divider" },
            { type: "paragraph", text: "Undécima hipótesis sobre la Singularidad de Clase 30: **la hipótesis de la profecía autocumplida.** La Contingencia, tras cumplir su propósito de eliminar a una Singularidad de Clase 30, entró en un letargo milenario, que le provocó la caída en desgracia de su propio protocolo. Pues este, infirió lógicamente, que la mejor manera de evitar una nueva Singularidad de Clase 30, era esterilizando la galaxia de vida sintiente. Convirtiéndose en el proceso, en la propia Singularidad de Clase 30." },

            { type: "divider" },
            { type: "quote", text: "Singularidad de Clase 30", cite: "[CENSURADO]", portrait: "img/citas/Ignis Stellaris Contingency.png", portraitAlt: "Contingencia" }
        ],
        i18n: {
            en: {
                title: "Class 30 Singularity",
                blocks: [
                    { type: "paragraph", text: "We will now assess what possible threats could constitute a Class 30 Singularity which, according to the Contingency Protocol, could theoretically destabilize the fabric of the entire universe. What we know so far is that energy can be produced safely and stably through the Class 3 and 4 Singularities used by the most technologically advanced empires. In theory, a Singularity 26 times greater would be capable of tearing apart the fabric of the universe, whether to reshape it, destroy it, or restart it in some unknown manner." },
                    { type: "divider" },
                    { type: "paragraph", text: "First hypothesis regarding the Class 30 Singularity: **the heterophasic hypothesis.** A heterophasic engine would be capable of accumulating such an immense amount of dark matter that it could tear apart the fabric of the universe and partially merge it with other dimensions, presumably the Shroud. Therefore, a Class 30 Singularity could be a civilization that reaches this milestone. However, subsequent analyses of the Contingency indicate that there are no fragments of code referencing a possible activation under such conditions." },
                    { type: "divider" },
                    { type: "paragraph", text: "Second hypothesis regarding the Class 30 Singularity: **the extradimensional invasion hypothesis.** The heterophasic engine and the tearing of reality are merely one part of the process. The ultimate objective would be to use all the energy accumulated by the engine and the host galaxy to ascend to the state of energy entities that dwell within the Shroud, known in our reality as the Extradimensional Invaders. The ascension itself would be the Class 30 Singularity." },
                    { type: "divider" },
                    { type: "paragraph", text: "Third hypothesis regarding the Class 30 Singularity: **the decoy hypothesis.** The creators of the Contingency invented the term Class 30 Singularity to confuse any individual or empire that might seek to investigate the origins and purposes of the protocol. Therefore, the information provided by the Contingency would not be truthful, but rather a crude manipulation intended to divert attention away from the true purpose of its creators. The Contingency itself would be unaware of its true objective and would live under a perpetual deception, with galactic sterilization serving as the means to fulfill the unknown purpose of its creators." },
                    { type: "divider" },
                    { type: "paragraph", text: "Fourth hypothesis regarding the Class 30 Singularity: **the cyclic galaxy hypothesis.** From the events described in Data Bank P, records 2000 to 2090, and from the information gathered from a once-awakened empire, the Ancient Caretakers, we know that the Contingency has been activated at least twice. The first was with the Cybrex, either because they were originally part of the Cybrex or simply because the Contingency used them for its sterilization plans, and the other occurred during the era of the Ancient Caretakers, who fell into a self-imposed slumber after confronting their former arch-enemy, the Contingency. It is therefore plausible to believe that the Contingency has brought the galaxy to the point of sterilization several times, restarting the cycle of organic and sentient life in general, or, failing that, has left the galaxy so devastated that the surviving empires entered a social, economic, military, and technological slumber lasting for eons or hundreds of years, eventually becoming the decrepit fallen empires we know today. More information can be found in Data Bank P." },
                    { type: "divider" },
                    { type: "paragraph", text: "Fifth hypothesis regarding the Class 30 Singularity: **the Horizon Needle hypothesis.** We have records of what the megastructure known as the Horizon Needle can do to our reality if it is used to tear apart the fabric of a black hole. It is said that its purpose is to reshape reality. In this case, the Class 30 Singularity would be the tear in the fabric of the universe caused by the use of the Horizon Needle or, alternatively, the civilization capable of constructing and manipulating such an artifact." },
                    { type: "divider" },
                    { type: "paragraph", text: "Sixth hypothesis regarding the Class 30 Singularity: **the universal hypothermia hypothesis.** The most advanced theories indicate that it is possible for the universe to be slowly and inexorably approaching a process of total cooling, a process involving a reduction of entropy on a universal scale. However, we know of the existence of a megastructure called the Galactic Crucible. This structure would be intended to reverse the process of hypothermia by artificially transforming the stars of a galaxy into red giants. This artificial process would be the Class 30 Singularity, as it would go against the very nature of the universe and prevent it from reaching the state that follows total hypothermia." },
                    { type: "divider" },
                    { type: "paragraph", text: "Seventh hypothesis regarding the Class 30 Singularity: **the Last Vigil and Hunters hypothesis.** As described in the Sixth Hypothesis regarding Creation, a Class 30 Singularity could be a civilization that has developed the ability to travel between galaxies, making use of theoretical galactic hyperlanes or some other unknown method. In this case, a superior civilization would be actively monitoring and secretly preventing other civilizations from threatening them through possible hypergalactic expansion. This is similar to the deployment of ground forces on a Pre-UL world that is close to beginning its journey among the stars. Therefore, based on the events described in records 10 to 234, specifically in the Tenth Hypothesis, the Last Vigil hypothesis, the Hunters themselves, or whoever sent them to eliminate the Prethoryn Scourge, possess various methods of eliminating Class 30 Singularities, such as the Prethoryn, empires that were capable of traveling to different galaxies and are pursued for doing so." },
                    { type: "divider" },
                    { type: "paragraph", text: "Eighth hypothesis regarding the Class 30 Singularity: **the ascension to the Shroud hypothesis.** In Data Bank A, records 1 to 6, the events experienced by the Zroni empire are described. The Zroni were presumably the first species capable of completely abandoning our material reality to ascend to the Shroud. As the dimension of the Shroud is known to beings who are as wondrous as they are horrific, the Contingency may seek to prevent new species from ascending to their pure psionic form within the Shroud and, more specifically, to prevent the emergence of a pure psionic entity in an event known as the End of the Cycle. More information can be found in the aforementioned records." },
                    { type: "divider" },
                    { type: "paragraph", text: "Ninth hypothesis regarding the Class 30 Singularity: **the extinct threat hypothesis.** The Contingency, long ago, succeeded in fulfilling its objective of eliminating the threat that had reached Class 30 Singularity status, the original purpose for which its creators designed it. This caused it to enter a slumber lasting so many millennia that the Contingency itself, demonstrating its adaptability, reprogrammed itself to find a new purpose, redirecting its efforts toward systematic galactic sterilization. While it is true that it was created to eliminate Class 30 Singularities, that threat has already perished, and there is nothing remotely comparable in magnitude." },
                    { type: "divider" },
                    { type: "paragraph", text: "Tenth hypothesis regarding the Class 30 Singularity: **the final sacrifice hypothesis.** The Contingency has faced one or several Class 30 Singularities at different times throughout history, but the passage of time and successive galactic wars against these threats have weakened the protocol to such an extent that its premature activation, before an empire reaches Class 30 Singularity status, is now the only possibility it has of accomplishing its objective. Thus, before being overwhelmed by a potential empire on the path to reaching Class 30 Singularity status, the Contingency has decided to take preventive action and systematically sterilize the galaxy whenever its protocol deems it appropriate." },
                    { type: "divider" },
                    { type: "paragraph", text: "Eleventh hypothesis regarding the Class 30 Singularity: **the self-fulfilling prophecy hypothesis.** The Contingency, after fulfilling its purpose of eliminating a Class 30 Singularity, entered a millennia-long slumber, which ultimately caused its own protocol to fall into disrepair. It logically inferred that the best way to prevent another Class 30 Singularity was to sterilize the galaxy of sentient life. In doing so, it became the Class 30 Singularity itself." },

                    { type: "divider" },
                    { type: "quote", text: "Class 30 Singularity", cite: "[REDACTED]" }
                ]
            },
            jp: {
                title: "クラス30特異点",
                icon: "☣",
                hidden: true,
                triggers: ["特異点", "30", "singularidad", "クラス30"],
                blocks: [
                    { type: "paragraph", text: "ここでは、コンティンジェンシーのプロトコルによれば、理論上、宇宙全体の構造を不安定化させる可能性がある「クラス30特異点」が、どのような脅威によって引き起こされうるのかを検討します。現在までに判明しているのは、技術的に最も進んだ帝国が利用しているクラス3およびクラス4特異点によって、安全かつ安定したエネルギー生産が可能であるということです。理論上、その26倍にも及ぶ特異点であれば、宇宙の構造そのものを引き裂き、それを成形、破壊、あるいは未知の方法で再起動することすら可能になるでしょう。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第一の仮説：\*\*ヘテロフェイズ仮説。\*\* ヘテロフェイズ・エンジンは、莫大な量のダークマターを蓄積することが可能であり、それによって宇宙の構造を引き裂き、他の次元、特にヴェールと部分的に融合させることができる可能性があります。したがって、クラス30特異点とは、この段階に到達した文明そのものなのかもしれません。しかし、その後のコンティンジェンシーに対する分析では、この条件下での起動を示唆するコード断片は存在しないことが判明しています。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第二の仮説：\*\*異次元侵略仮説。\*\* ヘテロフェイズ・エンジンと現実の裂け目は、プロセスの一部にすぎません。最終的な目的は、エンジンと母銀河に蓄積されたすべてのエネルギーを利用し、ヴェールに存在するエネルギー生命体、すなわち我々の現実で「異次元勢力」として知られている存在へと昇華することです。その昇華そのものがクラス30特異点なのかもしれません。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第三の仮説：\*\*囮仮説。\*\* コンティンジェンシーの創造者たちは、プロトコルの起源や目的を調査しようとする個人や帝国を混乱させるために、「クラス30特異点」という用語そのものを作り出したのかもしれません。したがって、コンティンジェンシーが提供する情報は真実ではなく、創造者たちの真の目的から注意をそらすための粗雑な欺瞞だった可能性があります。コンティンジェンシー自身も真の目的を知らず、永続的な欺瞞の中で活動していることになります。銀河の浄化とは、創造者が定めた未知の最終目的を達成するための手段にすぎないのかもしれません。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第四の仮説：\*\*循環銀河仮説。\*\* データバンクPの記録2000～2090に記された事実、およびかつて覚醒した帝国であった古代の番人から得られた情報によれば、コンティンジェンシーは少なくとも2度起動されています。最初はサイブレックスに対してでした。彼らがもともとサイブレックスの一部だったのか、あるいは浄化計画のためにサイブレックスを利用しただけなのかは不明です。そしてもう一度は古代の番人の時代です。彼らはかつての宿敵であるコンティンジェンシーと戦った後、自ら眠りにつきました。このことから、コンティンジェンシーはこれまでに何度も銀河を浄化寸前まで追い込み、知的生命を含む有機生命の生活サイクルそのものをリセットしてきた可能性があります。あるいは、銀河をあまりにも徹底的に荒廃させた結果、生き残った帝国が何千年、あるいは何百年にもわたって社会的、経済的、軍事的、技術的な停滞状態に陥り、最終的に我々が知る「没落帝国」となったのかもしれません。詳細はデータバンクPを参照してください。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第五の仮説：\*\*ホライズン・ニードル仮説。\*\* 巨大構造物「ホライズン・ニードル」が、ブラックホールの構造を引き裂くために使用された場合、我々の現実にどのような影響を与えうるのかについての記録が存在します。その目的は現実そのものを形作ることだとされています。この場合、クラス30特異点とは、ホライズン・ニードルの使用によって生じる宇宙の構造の裂け目そのもの、あるいはその装置を建造し操作できる文明を指している可能性があります。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第六の仮説：\*\*宇宙低体温仮説。\*\* 最も進んだ理論によれば、宇宙はゆっくりと、しかし不可逆的に完全な冷却へと近づいている可能性があります。これは宇宙規模でエントロピーが減少していく過程です。しかし、我々は「銀河のるつぼ」と呼ばれる巨大構造物の存在を知っています。この構造物は低体温化の過程を逆転させるために設計され、銀河内の恒星を人工的に赤色巨星へと変化させるものとされています。この人工的なプロセスこそがクラス30特異点なのかもしれません。なぜなら、それは宇宙そのものの性質に逆らい、完全な低体温状態に到達することを阻止するからです。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第七の仮説：\*\*最後の監視とハンターの仮説。\*\* 創造に関する第六の仮説で述べたように、クラス30特異点とは、銀河間を移動する能力を獲得した文明である可能性があります。その移動には、理論上の銀河間ハイパーレーン、あるいは未知の別の手段が使われているのでしょう。この場合、より上位の文明が影から他文明を監視し、ハイパー銀河規模への拡張によって自分たちを脅かす可能性を積極的に阻止していることになります。これは、恒星間航行を開始しようとしているPre-UL世界に地上部隊を展開することと似ています。したがって、記録10～234、特に第10の仮説である「最後の監視仮説」に記された事実から判断すると、ハンター、あるいはプレスリン・スウォームを排除するために彼らを送り込んだ存在は、クラス30特異点を排除するための複数の手段を有していると考えられます。異なる銀河へ移動する能力を獲得したプレスリンのような帝国が、その対象となっているのです。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第八の仮説：\*\*ヴェールへの昇華仮説。\*\* データバンクAの記録1～6には、ズローニ帝国が経験した出来事が記録されています。ズローニは、おそらく我々の物質的現実を完全に離れ、ヴェールへと昇華することに成功した最初の種族でした。驚異的であると同時に恐ろしい存在が住むヴェールという次元について考えると、コンティンジェンシーは、新たな種族がヴェールにおいて純粋な超能力的存在へと昇華すること、特に「サイクルの終焉」と呼ばれる事象において純粋な超能力的存在が出現することを阻止しようとしている可能性があります。詳細は該当する記録を参照してください。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第九の仮説：\*\*絶滅した脅威仮説。\*\* コンティンジェンシーはかつて、創造者たちが本来想定していた、クラス30特異点に到達した脅威の排除という目的を達成したのかもしれません。その結果、コンティンジェンシーは何千年にもわたる休眠状態へ入り、その長い時間の中で、適応能力を発揮して自らを再プログラムし、新たな目的を見つけたのでしょう。それが銀河規模の体系的な浄化だった可能性があります。確かにコンティンジェンシーはクラス30特異点を排除するために作られたのかもしれません。しかし、その脅威はすでに滅び、現在ではそれに近い規模の存在すら何も残っていないのです。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第十の仮説：\*\*最後の犠牲仮説。\*\* コンティンジェンシーは、異なる時代に一度または複数回、複数のクラス30特異点と戦ってきたのかもしれません。しかし、長い時間の経過と、これらの脅威との度重なる銀河戦争によってプロトコルは弱体化し、帝国がクラス30特異点へ到達する前に早期起動することだけが、現在も目的を達成するために残された唯一の手段となったのでしょう。そこでコンティンジェンシーは、クラス30特異点へ到達しつつある帝国に力で圧倒される前に、予防措置として行動し、プロトコルが適切と判断した時点で銀河を体系的に浄化することを選択したのです。" },
                    { type: "divider" },
                    { type: "paragraph", text: "クラス30特異点に関する第十一の仮説：\*\*自己成就予言仮説。\*\* コンティンジェンシーは、クラス30特異点を排除するという本来の目的を達成した後、数千年にわたる休眠状態へ入りました。その結果、自らのプロトコルそのものが変質していきました。そして論理的に導き出したのです。新たなクラス30特異点の出現を防ぐ最も確実な方法は、知的生命体を銀河から一掃することだ、と。こうしてコンティンジェンシー自身が、クラス30特異点そのものへと変貌してしまったのです。" },

                    { type: "divider" },
                    { type: "quote", text: "クラス30特異点", cite: "[検閲済み]" }
                ]
            }
        }
    }
];

/** Devuelve una copia de la entrada con título/bloques en el idioma dado (o el original si no hay traducción). */
export function localizeEntry(entry, lang) {
    const translation = entry.i18n && entry.i18n[lang];
    return {
        ...entry,
        title: translation?.title ?? entry.title,
        blocks: translation?.blocks ?? entry.blocks
    };
}

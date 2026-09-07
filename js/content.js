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
 * { type: "heading", text: "..." }
 *   Un subtítulo dentro del artículo (útil para dividir en secciones).
 *
 * { type: "list", items: ["...", "..."] }
 *   Lista con viñetas.
 *
 * { type: "links", items: [{ label: "...", url: "https://...", description: "..." }] }
 *   Lista de enlaces externos. "description" es opcional.
 *
 * { type: "image", src: "ruta-o-url.jpg", alt: "texto alternativo", caption: "..." }
 *   Imagen con pie de foto opcional. "caption" es opcional.
 *
 * { type: "note", text: "..." }
 *   Recuadro destacado para avisos o consejos.
 *
 * { type: "quote", text: "...", cite: "..." }
 *   Cita destacada. "cite" (autor/fuente) es opcional.
 *
 * { type: "divider" }
 *   Separador visual simple, no necesita más campos.
 * 
 */

export const knowledgeBase = [
    {
        slug: "diseño-corbetas",
        title: "Diseño de naves máquina: corbetas",
        icon: "✦",
        blocks: [
            { type: "image", src: "img/naves/Corbeta generalista.png", alt: "Corbeta generalista", caption: "Corbeta generalista." },
            { type: "divider" },
            { type: "image", src: "img/naves/Corbeta contra fauna.png", alt: "Corbeta early y mid game contra fauna espacial", caption: "Corbeta early y mid game contra fauna espacial." },
        ],
        i18n: {
            en: {
                title: "Machine ship design: corvettes",
                blocks: [
                    { type: "image", src: "img/naves/Corbeta generalista.png", alt: "General use corvette", caption: "General use corvette." },
                    { type: "divider" },
                    { type: "image", src: "img/naves/Corbeta contra fauna.png", alt: "Early and mid game corvette against space fauna", caption: "Early and mid game corvette against space fauna." },
                ]
            }
        }
    },
    {
        slug: "diseño-fragatas",
        title: "Diseño de naves máquina: fragatas",
        icon: "✦",
        blocks: [
            { type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "Fragata torpedera de corto alcance", caption: "Fragata torpedera de corto alcance con sigilo." },
            { type: "divider" },
            { type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "Fragata torpedera de largo alcance", caption: "Fragata torpedera de largo alcance." },
        ],
        i18n: {
            en: {
                title: "Machine ship design: frigates",
                blocks: [
                    { type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "Short-range torpedo frigate", caption: "Short-range torpedo frigate with stealth." },
                    { type: "divider" },
                    { type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "Long-range torpedo frigate", caption: "Long-range torpedo frigate." },
                ]
            }
        }
    },
    {
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
            { type: "quote", text: "Cuando entra a un sistema, sabes que ese sistema es tuyo y si no es tuyo, queda devastado. La resistencia es inútil, no hay crisis o xeno que pueda huir o esconderse, se hace la voluntad del Emperador o se muere en el intento.", cite: "Alto Almirante del Exilio del Mancomunado" }
        ],
        i18n: {
            en: {
                title: "About titans and their auras",
                blocks: [
                    { type: "paragraph", text: "**They follow the same build as an artillery battleship**, except for their aura, which is explained in detail below." },
                    { type: "paragraph", text: "For titans we have two options to combine them with the battleship fleet, but first we need to clarify how their auras work, since that's basically their whole reason to exist. There are two types of auras, offensive and defensive:" },
                    {
                        type: "list", items: [
                            "**Defensive**: these auras ONLY affect the fleet the titan belongs to. For example, if you have a titan with a regeneration aura sitting in a system with 4 other fleets, only the titan's own fleet benefits from the regeneration; the other 4 fleets don't.",
                            "**Offensive**: these auras affect ALL enemy fleets in the system the titan is in."
                        ]
                    },
                    { type: "paragraph", text: "With this in mind, there are two approaches depending on how many titans you can field. If titan capacity is low, spread one titan with an offensive aura across as many fleets as you can. This titan follows the same build as an XL artillery battleship but with the offensive aura as a bonus. If you have high capacity instead, concentrate them into fewer fleets, building fleets of 6 titans (each with a defensive and an offensive aura type), so you get flagship fleets with every aura, accompanied by titan-less fleets that still benefit from the 3 offensive auras. That way you protect the 6-titan fleet, since stacking every aura is an extremely powerful bonus." },
                    { type: "paragraph", text: "This last option — battleship fleets plus 6 titans — is arguably the ultimate fleet, which combined with carriers turns it into a general anti-everything force; naturally it's superior to the version without titans." },

                    { type: "divider" },
                    { type: "quote", text: "When it enters a system, you know that system is yours, and if it wasn't, it's left devastated. Resistance is futile — no crisis or xeno can flee or hide. The Emperor's will is done, or you die trying.", cite: "High Admiral of the Exiled Commonwealth" }
                ]
            }
        }
    },
    {
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
                    "**event crisis.2000**: Activa la crisis de la Contigencia",
                    "**event crisis.8005**: Activa la crisis de la Reina Sintética"
                ]
            },
            { type: "heading", text: "3. Simulaciones de combate" },
            { type: "paragraph", text: "Tras crear tus dos flotas de prueba, sitúa ambas flotas en el mismo sistema y activa el comando **attackallfleets**, el cual hace que todas tus flotas ataquen a todas las flotas en el sistema actual, incluyendo tus propias flotas. Útil para probar combates entre tus diseños de flota sin depender de un segundo imperio IA o jugador." },
            { type: "paragraph", text: "Con esto puedes iterar diseños de flota muy rápido: cambias un componente, reconstruyes con instant_build y repites el combate, todo sin tener que jugar una partida completa." },

            { type: "divider" },
            { type: "quote", text: "El Omnissiah estaría orgulloso de tí...", cite: "Archimago Dominus Belisarius Cawl del Adeptus Mechanicus" }
        ],
        i18n: {
            en: {
                title: "Preparing the combat simulation",
                blocks: [
                    { type: "paragraph", text: "Complete guide to setting up an optimal game for testing ship and fleet designs." },
                    { type: "note", text: "The setup is independent of DLCs." },

                    { type: "heading", text: "1. Setting up the game" },
                    {
                        type: "list", items: [
                            "**REQUIRED:** Disable Ironman Mode.",
                            "I recommend not including any AI-controlled empires (normal empires, fallen empires, marauders, nomads, etc.).",
                            "The rest of the options are up to you.",
                        ]
                    },
                    { type: "paragraph", text: "You can now start the game." },

                    { type: "heading", text: "2. Useful console commands" },
                    { type: "paragraph", text: "By default, you can open the console by pressing the 'º' key (to the left of the 1 key on QWERTY keyboards)." },
                    { type: "paragraph", text: "I recommend enabling the exploration, communications, and automatic intelligence options. Also enable the instant construction option to build and repair ships quickly." },

                    { type: "paragraph", text: "Run the following commands in order in the console." },
                    {
                        type: "list", items: [
                            "**research_all_technologies 1 0**: unlocks all technologies so you can build any ship design without waiting.",
                            "**max_resources**: fills all resources to their maximum, which is useful for building large fleets without waiting.",
                            "**unlock_edicts**: unlocks all combat edicts.",
                            "**create_navy <Percentage>**: creates a combat fleet with the percentage of fleet power you specify. This will be the fleet used to simulate an AI empire using the automated ship designs you start the game with.",
                        ]
                    },
                    { type: "note", text: "The exact command names may vary between game versions. If a command does not work, type **help** in the console to see the updated list for your version." },
                    { type: "paragraph", text: "To test combat against crises, you can force them to appear with the following commands:" },
                    {
                        type: "list", items: [
                            "**event crisis.199**: Activates the Prethoryn Scourge crisis.",
                            "**event crisis.1000**: Activates the Unbidden crisis.",
                            "**event crisis.1100**: Activates the Aberrant crisis. They do not require the Unbidden.",
                            "**event crisis.1200**: Activates the Vehement crisis. They require the Unbidden.",
                            "**event crisis.2000**: Activates the Contingency crisis.",
                            "**event crisis.8005**: Activates the Synthetic Queen crisis."
                        ]
                    },

                    { type: "heading", text: "3. Combat simulations" },
                    { type: "paragraph", text: "After creating your two test fleets, place both fleets in the same system and use the **attackallfleets** command. This makes all your fleets attack every fleet in the current system, including your own fleets. This is useful for testing battles between your fleet designs without relying on a second AI empire or player." },
                    { type: "paragraph", text: "This allows you to iterate through fleet designs very quickly: change a component, rebuild using instant_build, and repeat the battle, all without having to play through an entire game." },

                    { type: "divider" },
                    { type: "quote", text: "The Omnissiah would be proud of you...", cite: "Archmagos Dominus Belisarius Cawl of the Adeptus Mechanicus" }
                ]
            }
        }
    },
    {
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
            { type: "quote", text: "Pero, sin duda, si quieres la mejor información sobre Stellaris en español, ya sabes donde encontrar mi canal de YouTube 🤩", cite: "Ignis" }
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
                    { type: "quote", text: "But without a doubt, if you want the best information about Stellaris in Spanish, you already know where to find my YouTube channel 🤩", cite: "Ignis" }
                ]
            }
        }
    },
    {
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
            { type: "quote", text: "MUGANI?", cite: "Reina Prethoryn" }
        ],
        i18n: {
            en: {
                title: "Preparing the combat simulation",
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
    {
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
            { type: "quote", text: "Singularidad de Clase 30", cite: "[CENSURADO]" }
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

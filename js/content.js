/**
 * Fuente de datos para los artículos de la wiki.
 *
 * Ejemplo rápido: elimina las barras // del bloque inferior y cambia el slug,
 * título y bloques. El slug crea una URL como #/mi-registro.
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
        ]
    },
    {
        slug: "diseño-fragatas",
        title: "Diseño de naves máquina: fragatas",
        icon: "✦",
        blocks: [
            { type: "image", src: "img/naves/Fragata torpedera de corto alcance.png", alt: "Fragata torpedera de corto alcance", caption: "Fragata torpedera de corto alcance con sigilo." },
            { type: "divider" },
            { type: "image", src: "img/naves/Fragata torpedera de largo alcance.png", alt: "Fragata torpedera de largo alcance", caption: "Fragata torpedera de largo alcance." },
        ]
    },
    {
        slug: "titanes-aura",
        title: "Sobre los titanes y sus auras",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "**Siguen la misma plantilla que un acorazado artillero**, excepto por su aura, que se explica en profundidad a continuación." },
            { type: "paragraph", text: "Sobre los titanes tenemos dos opciones para combinarlos con la flota de acorazados, pero antes hay que aclarar como funcionan sus auras que básicamente es su razón de ser. Tenemos dos tipos de auras, ofensivas y defensivas, dicho esto:" },
            { type: "list", items: ["**Defensivas**: estas auras SOLO afectan a la flota que tiene el titán. Por ejemplo, si tienes un titán con aura de regeneración que está en un sistema con otras 4 flotas, solo la flota del titán se aprovecha de la regeneración, las otras 4 flotas no.", "**Ofensivas**: estas auras afectan a TODAS las flotas enemigas en el sistema que esté el titán."] },
            { type: "paragraph", text: "Con esto en mente tenemos dos opciones dependiendo del número de titanes que podamos tener. Si tenemos poca capacidad de titanes, recomiendo distribuir un titan con aura ofensiva en cada flota que puedas. Este titán sigue el mismo esquema que los acorazados artilleros XL pero con el aura ofensiva como extra. Por otro lado, si tenemos mucha capacidad, aconsejo concentrarlos en poca flotas, teniendo flotas con 6 titanes (cada uno con un tipo de aura defensia y ofensiva) de tal forma que tengas flotas insignia con todas las auras acompañadas de flotas sin titanes que se beneficien de las 3 ofensivas. Así aseguras la supervivencia de la flota con los 6 titanes ya que combinar todas las auras es una bonificación muy poderosa." },
            { type: "paragraph", text: "Podemos decir que esta última opción de flotas de acorazados más 6 titanes es la flota definitiva que apoyada por los portahangares las convierte en un anti-todo general, por supuesto es superior a su versión sin titanes." },
            { type: "note", text: "Cuando entra a un sistema, sabes que ese sistema es tuyo y, si no es tuyo, queda devastado. La resistencia es inútil. No hay crisis o xeno que pueda huir o esconderse. Se hace la voluntad del **Emperador** o se muere en el intento." },
        ]
    },
    {
        slug: "simulacion-combate",
        title: "Preparando la simulación de combate",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "Guía rápida para montar una partida de pruebas y comprobar diseños de flota, auras de titán o composiciones de combate sin depender del avance normal de una partida." },
            { type: "note", text: "Necesitas tener activado el modo de comandos: inicia la partida con **-debug_mode** en las opciones de lanzamiento de Steam, o simplemente escribe los comandos con la consola abierta (**Mayús + ²** / **Mayús + `** según el teclado)." },
            { type: "heading", text: "1. Preparar el escenario" },
            {
                type: "list", items: [
                    "Crea una partida nueva con un mapa pequeño (1 estrella o pocas) para minimizar variables externas.",
                    "Desactiva crisis, invasiones y eventos aleatorios en las opciones avanzadas de la galaxia si solo quieres testear combate directo.",
                    "Añade una segunda potencia (IA o jugador) que sea la que reciba tu flota de pruebas."
                ]
            },
            { type: "heading", text: "2. Comandos de consola útiles" },
            {
                type: "list", items: [
                    "**research_all_technologies** — desbloquea toda la tecnología para poder construir cualquier diseño de nave sin esperar.",
                    "**activate_all_traditions** — activa todas las tradiciones, útil si quieres testear con bonificaciones de combate concretas.",
                    "**effect add_resource = { energy = 99999 minerals = 99999 alloys = 99999 influence = 999 }** — te da recursos de sobra para construir flotas grandes al instante.",
                    "**instant_build** — construye edificios, naves y estructuras de forma instantánea.",
                    "**debugtooltip** — muestra información extendida en los tooltips, útil para comparar valores de daño y escudo entre diseños.",
                    "**observe** — pasas a modo observador, útil para ver el combate desde fuera sin controlar ningún bando."
                ]
            },
            { type: "note", text: "Los nombres exactos de comandos pueden variar entre versiones del juego. Si alguno no funciona, escribe **help** en la consola para ver el listado actualizado de tu versión." },
            { type: "heading", text: "3. Configuración recomendada para pruebas" },
            {
                type: "list", items: [
                    "Diseña las dos flotas que quieras comparar en el diseñador de naves antes de abrir la consola.",
                    "Usa **instant_build** después de encolar la construcción de ambas flotas para tenerlas listas al momento.",
                    "Sitúa ambas flotas en el mismo sistema y deja que el combate se resuelva automáticamente, o usa **observe** para verlo en directo.",
                    "Repite el combate varias veces (guardando y cargando la partida) si quieres comprobar la variabilidad del daño aleatorio."
                ]
            },
            { type: "paragraph", text: "Con esto puedes iterar diseños de flota muy rápido: cambias un componente, reconstruyes con instant_build y repites el combate, todo sin tener que jugar una partida completa." }
        ]
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
            }
        ]
    }
];

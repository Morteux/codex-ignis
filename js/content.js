/**
 * Fuente de datos para los artículos de la wiki.
 *
 * Ejemplo rápido: elimina las barras // del bloque inferior y cambia el slug,
 * título y bloques. El slug crea una URL como #/mi-registro.
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
 */
export const knowledgeBase = [
    {
        slug: "mi-registro",
        title: "Mi registro",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "Contenido de prueba para el articulo en formato de párrafo." },
            { type: "list", items: ["Primer apunte", "Segundo apunte"] }
        ],
        i18n: {
            en: {
                title: "My record",
                blocks: [
                    { type: "paragraph", text: "Sample content for the article in paragraph format." },
                    { type: "list", items: ["First note", "Second note"] }
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
            { type: "list", items: ["**Defensivas**: estas auras SOLO afectan a la flota que tiene el titán. Por ejemplo, si tienes un titán con aura de regeneración que está en un sistema con otras 4 flotas, solo la flota del titán se aprovecha de la regeneración, las otras 4 flotas no.", "**Ofensivas**: estas auras afectan a TODAS las flotas enemigas en el sistema que esté el titán."] },
            { type: "paragraph", text: "Con esto en mente tenemos dos opciones dependiendo del número de titanes que podamos tener. Si tenemos poca capacidad de titanes, recomiendo distribuir un titan con aura ofensiva en cada flota que puedas. Este titán sigue el mismo esquema que los acorazados artilleros XL pero con el aura ofensiva como extra. Por otro lado, si tenemos mucha capacidad, aconsejo concentrarlos en poca flotas, teniendo flotas con 6 titanes (cada uno con un tipo de aura defensia y ofensiva) de tal forma que tengas flotas insignia con todas las auras acompañadas de flotas sin titanes que se beneficien de las 3 ofensivas. Así aseguras la supervivencia de la flota con los 6 titanes ya que combinar todas las auras es una bonificación muy poderosa." },
            { type: "paragraph", text: "Podemos decir que esta última opción de flotas de acorazados más 6 titanes es la flota definitiva que apoyada por los portahangares las convierte en un anti-todo general, por supuesto es superior a su versión sin titanes." },
            { type: "paragraph", text: "Cuando entra a un sistema, sabes que ese sistema es tuyo y si no es tuyo, queda devastado. La resistencia es inútil, no hay crisis o xeno que pueda huir o esconderse, se hace la voluntad del Emperador o se muere en el intento." },
        ],
        i18n: {
            en: {
                title: "About titans and their auras",
                blocks: [
                    { type: "paragraph", text: "**They follow the same build as an artillery battleship**, except for their aura, which is explained in detail below." },
                    { type: "paragraph", text: "For titans we have two options to combine them with the battleship fleet, but first we need to clarify how their auras work, since that's basically their whole reason to exist. There are two types of auras, offensive and defensive:" },
                    { type: "list", items: ["**Defensive**: these auras ONLY affect the fleet the titan belongs to. For example, if you have a titan with a regeneration aura sitting in a system with 4 other fleets, only the titan's own fleet benefits from the regeneration; the other 4 fleets don't.", "**Offensive**: these auras affect ALL enemy fleets in the system the titan is in."] },
                    { type: "paragraph", text: "With this in mind, there are two approaches depending on how many titans you can field. If titan capacity is low, spread one titan with an offensive aura across as many fleets as you can. This titan follows the same build as an XL artillery battleship but with the offensive aura as a bonus. If you have high capacity instead, concentrate them into fewer fleets, building fleets of 6 titans (each with a defensive and an offensive aura type), so you get flagship fleets with every aura, accompanied by titan-less fleets that still benefit from the 3 offensive auras. That way you protect the 6-titan fleet, since stacking every aura is an extremely powerful bonus." },
                    { type: "paragraph", text: "This last option — battleship fleets plus 6 titans — is arguably the ultimate fleet, which combined with carriers turns it into a general anti-everything force; naturally it's superior to the version without titans." },
                    { type: "paragraph", text: "When it enters a system, you know that system is yours, and if it wasn't, it's left devastated. Resistance is futile — no crisis or xeno can flee or hide. The Emperor's will is done, or you die trying." }
                ]
            }
        }
    }

    // Ejemplo de easter egg (descomenta y personaliza):
    // {
    //     slug: "secreto-1",
    //     title: "Registro clasificado",
    //     icon: "☣",
    //     hidden: true,
    //     triggers: ["ave imperial", "por el emperador"],
    //     blocks: [
    //         { type: "paragraph", text: "Has encontrado un registro oculto. Nada que ver aquí, soldado." }
    //     ],
    //     i18n: {
    //         en: {
    //             title: "Classified record",
    //             blocks: [
    //                 { type: "paragraph", text: "You found a hidden record. Nothing to see here, soldier." }
    //             ]
    //         }
    //     }
    // }
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

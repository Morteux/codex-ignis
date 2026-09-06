/**
 * Fuente de datos para los artículos de la wiki.
 *
 * Ejemplo rápido: elimina las barras // del bloque inferior y cambia el slug,
 * título y bloques. El slug crea una URL como #/mi-registro.
 */
export const knowledgeBase = [
    {
        slug: "mi-registro",
        title: "Mi registro",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "Contenido de prueba para el articulo en formato de párrafo." },
            { type: "list", items: ["Primer apunte", "Segundo apunte"] }
        ]
    },
    {
        slug: "titanes-aura",
        title: "Sobre los titanes y sus auras",
        icon: "✦",
        blocks: [
            { type: "paragraph", text: "**Siguen la misma plantilla que un acorazado artillero**, excepto por su aura, que se explica en profundidad a continuación.</br>Sobre los titanes tenemos dos opciones para combinarlos con la flota de acorazados, pero antes hay que aclarar como funcionan sus auras que básicamente es su razón de ser. Tenemos dos tipos de auras, ofensivas y defensivas, dicho esto:" },
            { type: "list", items: ["**Defensivas**: estas auras SOLO afectan a la flota que tiene el titán. Por ejemplo, si tienes un titán con aura de regeneración que está en un sistema con otras 4 flotas, solo la flota del titán se aprovecha de la regeneración, las otras 4 flotas no.", "**Ofensivas**: estas auras afectan a TODAS las flotas enemigas en el sistema que esté el titán."] },
            { type: "paragraph", text: "Con esto en mente tenemos dos opciones dependiendo del número de titanes que podamos tener. Si tenemos poca capacidad de titanes, recomiendo distribuir un titan con aura ofensiva en cada flota que puedas. Este titán sigue el mismo esquema que los acorazados artilleros XL pero con el aura ofensiva como extra. Por otro lado, si tenemos mucha capacidad, aconsejo concentrarlos en poca flotas, teniendo flotas con 6 titanes (cada uno con un tipo de aura defensia y ofensiva) de tal forma que tengas flotas insignia con todas las auras acompañadas de flotas sin titanes que se beneficien de las 3 ofensivas. Así aseguras la supervivencia de la flota con los 6 titanes ya que combinar todas las auras es una bonificación muy poderosa.</br>Podemos decir que esta última opción de flotas de acorazados más 6 titanes es la flota definitiva que apoyada por los portahangares las convierte en un anti-todo general, por supuesto es superior a su versión sin titanes.</br>**Cuando entra a un sistema, sabes que ese sistema es tuyo y si no es tuyo, queda devastado. La resistencia es inútil, no hay crisis o xeno que pueda huir o esconderse, se hace la voluntad del Emperador o se muere en el intento.**" },
        ]
    }
];

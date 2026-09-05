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
      { type: "paragraph", text: "Escribe aquí tu contenido." },
      { type: "list", items: ["Primer apunte", "Segundo apunte"] }
    ]
  }
];

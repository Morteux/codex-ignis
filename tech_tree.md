# TECH_TREE — Árbol de tecnologías explorable de Codex Ignis

**Estado:** sin empezar (0/26). **Cuándo se desarrolla:** al completo cuando termine el Planet Sim (ver `PLANET_SIM_GDD.md`). Hasta entonces `tech-tree.html` es un marcador vacío.
**Regla nº 1 (igual que en el Planet Sim):** no inventar reglas, cifras ni nombres. Todo sale de la wiki que aporte Morteux; si falta o es ambiguo, se pregunta.

---

## 1. Objetivo

Convertir las páginas de tecnologías de la wiki de Stellaris (4.5.x) en un **árbol de tecnologías explorable** dentro de Codex Ignis: ver las tecnologías por área y nivel, seguir los prerrequisitos y lo que desbloquea cada una, buscar y filtrar, y poder **consultar versiones anteriores** del árbol conforme el juego se actualice.

## 2. Créditos e inspiración

La idea y la forma de explorar el árbol se inspiran en el *Stellaris Tech Tree* de **BloodStainedCrow**: https://bloodstainedcrow.github.io/stellaris-tech-tree/ . La web ya enlaza también su versión anterior, desactualizada: https://turanar.github.io/stellaris-tech-tree/index.html (usuario *turanar*), en «Enlaces útiles» de `js/content.js`.

- **No se reutiliza su código ni sus datos:** el árbol de Codex Ignis se escribe desde cero y se alimenta de la wiki. Solo se toma la inspiración (disposición por áreas y niveles, líneas de prerrequisitos, exploración al pulsar).
- Los créditos se muestran de forma visible: sección «Créditos» en `tech-tree.html` (con enlaces a ambos proyectos), mención en `README.md` y en el pie de la propia página.
- Los datos y nombres del juego pertenecen a Paradox Interactive; se mantiene el aviso legal ya incluido en `privacy.html`. Los datos proceden de la wiki de Stellaris (`WIKI_URLS.md`): **pendiente revisar sus condiciones de uso antes de publicar** y citarla como fuente.

## 3. Principios (heredados del Planet Sim)

- **Orientado a datos y versionado:** los datos viven en ficheros propios, uno por versión del juego, nunca dentro de la lógica de dibujo. Se reutiliza el registro `js/data-version.js` (`DATA_VERSIONS`, `rulesetId`, estados de verificación `unverified` → `wiki-verified`…).
- **Honesto:** lo no modelado se marca como tal; nada se rellena «a ojo».
- **Sin build, JS en módulos ES**, mismo estilo de terminal, es/en/jp ahora y todos los idiomas oficiales cuando llegue P15 del GDD (las traducciones oficiales saldrán de los ficheros del juego que aportará Morteux; hasta entonces el nombre se muestra en inglés).
- **Iconos** desde la API de assets (`STELLARIS_ASSETS_BASE`, `js/asset-config.js`); si faltan iconos de tecnologías, se pregunta qué hacer antes de poner marcadores.
- **Comprobable:** cada fase termina con pruebas de navegador (cargar la página, abrir un nodo, cambiar de versión) como las del Planet Sim.

## 4. Datos de partida y modelo propuesto

Entrada: las páginas de la wiki de tecnologías que pasará Morteux (`Technology`, `Physics_research`, `Society_research`, `Engineering_research`, ya listadas en `WIKI_URLS.md`) para la versión vigente (4.5.2 «Cygnus»).

Campos que se intentarán extraer (a confirmar con las páginas reales, no se asume que existan todos): id estable, nombre, área (Física / Sociedad / Ingeniería), categoría, nivel (*tier*), coste, prerrequisitos, qué desbloquea (edificios, componentes, naves, decretos…), si es tecnología inicial / rara / peligrosa / repetible, DLC requerido, icono y descripción.

Validaciones de datos (automáticas): todos los prerrequisitos existen, no hay ciclos, no hay ids repetidos, cada tecnología tiene área y nivel.

## 5. Versionado

- Un fichero de datos por versión (`rulesetId`, p. ej. `stellaris-pc-4.5.2`); al actualizar la wiki se **guarda una versión nueva y no se sobrescribe la anterior**.
- Selector de versión en la propia página (mismo patrón que el Planet Sim) y versión visible en cada ficha.
- Más adelante: comparar dos versiones (tecnologías añadidas, eliminadas, con coste o prerrequisitos cambiados).

## 6. Fases y tareas

Leyenda: `[x]` hecha, `[ ]` pendiente.

### T0 — Preparación (0/3)
- [ ] T0.1 Esperar a que el Planet Sim esté cerrado (o decidir adelantar parte del trabajo)
- [ ] T0.2 Morteux aporta las páginas de la wiki de tecnologías (4.5.x) y, si existen, los iconos
- [ ] T0.3 Analizar las páginas y confirmar el modelo de datos de la sección 4 (preguntar lo ambiguo)

### T1 — Datos (0/4)
- [ ] T1.1 Extraer las tecnologías de la wiki a un fichero de datos versionado (`rulesetId`)
- [ ] T1.2 Validaciones automáticas (prerrequisitos existentes, sin ciclos, sin duplicados)
- [ ] T1.3 Registrar la colección en `data-version.js` con su estado de verificación
- [ ] T1.4 Relacionar tecnologías con lo que desbloquean (edificios del Planet Sim, componentes…) solo donde la wiki lo diga

### T2 — Visualización (0/5)
- [ ] T2.1 Diseño de la página `tech-tree.html` (estilo terminal, cabecera común) con las tres áreas
- [ ] T2.2 Disposición por niveles y columnas, nodos con icono y nombre
- [ ] T2.3 Líneas de prerrequisitos entre nodos (SVG o canvas)
- [ ] T2.4 Estados visuales: normal, seleccionada, prerrequisito, desbloquea, rara/peligrosa
- [ ] T2.5 Adaptación a móvil

### T3 — Exploración (0/5)
- [ ] T3.1 Pulsar una tecnología: ficha con coste, descripción, prerrequisitos y desbloqueos
- [ ] T3.2 Resaltar toda la cadena de prerrequisitos y todo lo que depende de ella
- [ ] T3.3 Buscador por nombre (insensible a tildes, como la wiki) y filtros (área, nivel, DLC, rara)
- [ ] T3.4 Zoom y desplazamiento del árbol
- [ ] T3.5 Enlace directo a una tecnología (hash en la URL, como las entradas de la wiki)

### T4 — Versiones (0/3)
- [ ] T4.1 Selector de versión y carga de datos por versión
- [ ] T4.2 Procedimiento para añadir una versión nueva sin perder las anteriores
- [ ] T4.3 Vista de comparación entre dos versiones

### T5 — Integración y cierre (0/6)
- [ ] T5.1 i18n: textos de la interfaz en es/en/jp y nombres oficiales cuando llegue P15
- [ ] T5.2 Sección de créditos y enlaces a los proyectos que inspiraron la idea (sección 2)
- [ ] T5.3 Enlaces desde la wiki y el Planet Sim hacia las tecnologías
- [ ] T5.4 README y aviso de fuentes actualizados
- [ ] T5.5 Accesibilidad (teclado, contraste, lectores de pantalla)
- [ ] T5.6 Revisión final de datos contra la wiki actualizada (misma idea que P14 del Planet Sim)

## 7. Ideas para más adelante
- Marcar tecnologías como «investigadas» y calcular lo que queda por investigar hasta una meta.
- Exportar/guardar un camino de investigación (JSON, como los planetas del Planet Sim).
- Que el Planet Sim use las tecnologías para ocultar edificios aún no desbloqueados (hoy asume toda la investigación hecha).

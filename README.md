# Codex Ignis

Wiki personal estática de Stellaris con una interfaz de terminal navegable, más dos proyectos independientes: un bingo y un simulador de planetas.

## Desarrollo y despliegue

El sitio no requiere compilación: abre `index.html` o sírvelo con cualquier servidor estático. No se usa GitHub Actions: el sitio se publica manualmente (`vercel.json` mínimo incluido por si se despliega en Vercel).

## Estructura

| Parte | Páginas / módulos |
|---|---|
| Wiki | `index.html`, `js/app.js`, `js/content.js` (artículos), `js/highlight-config.js` |
| Bingo | `bingo.html`, `js/bingo.js`, `js/bingo-data.js` |
| Simulador de planetas | `planet-sim.html`, `js/planet-sim.js`, `empire.js`, `celestial.js`, `planet-summary.js`, `planet-library*.js`, datos en `*-data.js` y `civic-rules.js` |
| Árbol de tecnologías | `tech-tree.html` (marcador; plan en `tech_tree.md`) |
| Comunes | `js/i18n.js` (es/en/jp), `js/asset-config.js`, `js/data-version.js`, `styles.css` |
| Legal | `privacy.html`, `cookies.html`, `404.html`, `js/legal.js` |

Documentación del proyecto: `PLANET_SIM_GDD.md` (fases y progreso del simulador), `tech_tree.md` (plan del árbol de tecnologías), `principios_del_juego.md` (nombres e iconos de los principios), `WIKI_URLS.md` (páginas de la wiki de Stellaris usadas como fuente) y `StellarisAssetsFileTree.txt` (árbol del repositorio de assets).

## Contenido de la wiki

Los artículos se definen en `js/content.js` por bloques (párrafo, subtítulo, lista, enlaces, imagen, columnas, nota, cita, separador); la cabecera del propio archivo explica el formato, las traducciones (`i18n`) y los easter eggs.

## Bingo (orígenes y principios)

`bingo.html` permite elegir entre el bingo de **orígenes** y el de **principios**; los datos viven en `js/bingo-data.js` (`ORIGIN_BINGO` y `PRINCIPLE_BINGO`, este último con 226 entradas, una por icono de `civics/`). Cada casilla se ve en blanco y negro y pasa a color al pulsarla (el marcado dura solo la visita). El nombre sale como tooltip y está traducido vía `js/i18n.js`. El botón de descarga genera un PNG en alta resolución del bingo visible.

**Claves `civicXxx`:** la clave sale del nombre de archivo del icono (`civics/Civic_xxx.png`), no del nombre del principio en la wiki 4.5.2, que cambia entre variantes (p. ej. `civicCorporateAscensionists` es «Gigacorp»). El inglés de `js/i18n.js` es el nombre de la wiki; hay claves que agrupan varios principios que comparten icono y se muestran unidos con « / ». Los textos en español y japonés de los principios renombrados en la 4.5 muestran el nombre en inglés hasta que se incorporen las traducciones oficiales (fase P15 del GDD).

## Imágenes de Stellaris

Hay dos orígenes, ambos definidos en `js/asset-config.js`:

- **Imágenes de los artículos** (`content.js`): rutas locales de `img/` o URLs absolutas; `ASSET_BASE` queda vacío y solo completa rutas relativas.
- **Imágenes de Stellaris del bingo y del simulador** (orígenes, principios, edificios, empleos, planetas...): siempre desde el repositorio de assets (`STELLARIS_ASSETS_BASE`, GitHub Pages). Si esa URL cambia, solo hay que editar esa constante.

## Google AdSense

La integración está desactivada en `js/ads-config.js`. Solo debe activarse con contenido suficiente, aprobación del sitio, un ID de editor `ca-pub-…`, unidades publicitarias y el consentimiento configurado cuando corresponda. Añade `ads.txt` en la raíz únicamente con el valor oficial de Google.

## Créditos

Contenido y marcas de Stellaris © Paradox Interactive (ver `privacy.html`). El futuro árbol de tecnologías se inspira en el *Stellaris Tech Tree* de BloodStainedCrow (https://bloodstainedcrow.github.io/stellaris-tech-tree/); ver `tech_tree.md`.

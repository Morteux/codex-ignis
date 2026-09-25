# Codex Ignis

Una wiki personal estática de Stellaris con una interfaz de terminal navegable.

## Desarrollo y despliegue

El sitio no requiere compilación: abre `index.html` o sírvelo con cualquier servidor estático. El flujo de GitHub Actions publica la rama `main` en GitHub Pages.

## Contenido

Las futuras entradas se definen en `js/content.js`. La interfaz está preparada para indexarlas y buscarlas sin cambiar su estructura.

## Bingo (orígenes y principios)

Mini proyecto independiente (`bingo.html`) migrado al codex como un endpoint adicional del sitio, enlazado desde el pie de página del índice. Un desplegable permite elegir entre el bingo de **orígenes** y el de **principios**; los datos de cada uno viven en `js/bingo-data.js` (arrays `ORIGIN_BINGO` y `PRINCIPLE_BINGO`, este último con las 226 civics de `img/civics/`), separados del HTML. Cada casilla se ve en blanco y negro por defecto y pasa a color al pulsarla, marcándola como conseguida (el marcado se conserva solo durante la visita, no entre recargas). El nombre de cada casilla no se muestra como texto: aparece como tooltip nativo al pasar el ratón por encima, y está traducido a ES/EN/JP vía `js/i18n.js` (claves `originXxx` / `principleXxx`). El botón de descarga genera una imagen PNG en alta resolución del bingo actualmente visible (orígenes o principios) con el estado de marcado.

**Nota sobre las traducciones de `principleXxx`:** se generaron automáticamente a partir del nombre de archivo de cada civic (incluyendo las variantes corporativas/mente colmena/máquina). Si alguna no coincide exactamente con el texto oficial del juego, ajústala directamente en `js/i18n.js`; no hace falta tocar `js/bingo-data.js`.

## Imágenes de Stellaris y futura migración a un repo de assets

Todas las rutas de imagen de Stellaris (naves, orígenes, principios, fauna, citas...) pasan por `js/asset-config.js`, tanto las del codex (`js/app.js`) como las del bingo (`js/bingo-data.js`, que reexporta `ASSET_BASE` como `IMAGE_BASE`). Mientras las imágenes vivan en `img/` de este mismo repositorio, `ASSET_BASE` se deja vacío. Cuando muevas las imágenes a un repositorio de solo assets (por ejemplo, servido con GitHub Pages o vía jsDelivr), cambia únicamente esa constante por la URL base del nuevo origen — no hay que tocar `content.js`, `bingo-data.js` ni el resto del sitio.

Esto es independiente de dónde se despliegue el propio sitio (GitHub Pages o, más adelante, Vercel): incluye un `vercel.json` mínimo por si en algún momento se despliega ahí directamente.

## Google AdSense

La integración está deliberadamente desactivada en `js/ads-config.js`. Solo se debe activar después de tener contenido suficiente, aprobación del sitio, un ID de editor `ca-pub-…`, unidades publicitarias y el consentimiento configurado cuando corresponda. Añade `ads.txt` en la raíz únicamente con el valor oficial de Google.
# Codex Ignis

Una wiki personal estática de Stellaris con una interfaz de terminal navegable.

## Desarrollo y despliegue

El sitio no requiere compilación: abre `index.html` o sírvelo con cualquier servidor estático. El flujo de GitHub Actions publica la rama `main` en GitHub Pages.

## Contenido

Las futuras entradas se definen en `js/content.js`. La interfaz está preparada para indexarlas y buscarlas sin cambiar su estructura.

## Bingo (orígenes y principios)

Mini proyecto independiente (`bingo.html`) migrado al codex como un endpoint adicional del sitio, enlazado desde el pie de página del índice. Un desplegable permite elegir entre el bingo de **orígenes** y el de **principios**; los datos de cada uno viven en `js/bingo-data.js` (arrays `ORIGIN_BINGO` y `PRINCIPLE_BINGO`), separados del HTML. Las casillas usan las imágenes referenciadas ahí (por defecto en `img/bingo/`) y se marcan/desmarcan al pulsarlas (el marcado se conserva solo durante la visita, no entre recargas). Los nombres están traducidos a ES/EN/JP vía `js/i18n.js`. El botón de descarga genera una imagen PNG del bingo actualmente visible (orígenes o principios) con el estado de marcado.

**Pendiente:** `PRINCIPLE_BINGO` está vacío — hay que añadir una entrada por principio (imagen + clave i18n) siguiendo las instrucciones del propio archivo `js/bingo-data.js`, más sus traducciones en `js/i18n.js`.

Si en el futuro las imágenes se sirven desde otro dominio o repositorio (por ejemplo, para no acercarse a límites de tamaño de despliegue como el de Vercel), basta con cambiar la constante `IMAGE_BASE` en `js/bingo-data.js`.

## Google AdSense

La integración está deliberadamente desactivada en `js/ads-config.js`. Solo se debe activar después de tener contenido suficiente, aprobación del sitio, un ID de editor `ca-pub-…`, unidades publicitarias y el consentimiento configurado cuando corresponda. Añade `ads.txt` en la raíz únicamente con el valor oficial de Google.

## TO DO
- Quiero meter easter eggs, así que crea un tipo de entry en content que solo se muestre cuando buscas palabras y alguna coincide con lo que haya escrito dentro, pero por defecto no aparezca en la lista
- Quiero que se resalte en el texto de los contents como si estuviera pintado con un marcador (cuando buscas con ctrl+f en navegador) las palabras que pongas en el cuadro de busqueda
- Implementa la opcion de cambiar entre español e inglés y quizás a futuro más idiomas.
- Quiero preparar la inclusion de ads con google adsense

- Quiero que puedas pulsar en una imagen y se abra más grande, como haciendo un zoom
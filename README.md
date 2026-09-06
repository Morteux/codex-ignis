# Codex Ignis

Una wiki personal estática de Stellaris con una interfaz de terminal navegable.

## Desarrollo y despliegue

El sitio no requiere compilación: abre `index.html` o sírvelo con cualquier servidor estático. El flujo de GitHub Actions publica la rama `main` en GitHub Pages.

## Contenido

Las futuras entradas se definen en `js/content.js`. La interfaz está preparada para indexarlas y buscarlas sin cambiar su estructura.

## Google AdSense

La integración está deliberadamente desactivada en `js/ads-config.js`. Solo se debe activar después de tener contenido suficiente, aprobación del sitio, un ID de editor `ca-pub-…`, unidades publicitarias y el consentimiento configurado cuando corresponda. Añade `ads.txt` en la raíz únicamente con el valor oficial de Google.

## TO DO
- Quiero meter easter eggs, así que crea un tipo de entry en content que solo se muestre cuando buscas palabras y alguna coincide con lo que haya escrito dentro, pero por defecto no aparezca en la lista
- Quiero que se resalte en el texto de los contents como si estuviera pintado con un marcador (cuando buscas con ctrl+f en navegador) las palabras que pongas en el cuadro de busqueda
- Implementa la opcion de cambiar entre español e inglés y quizás a futuro más idiomas.
- Quiero preparar la inclusion de ads con google adsense

- Quiero que puedas pulsar en una imagen y se abra más grande, como haciendo un zoom
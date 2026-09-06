# Codex Ignis

Una wiki personal estática de Stellaris con una interfaz de terminal navegable.

## Desarrollo y despliegue

El sitio no requiere compilación: abre `index.html` o sírvelo con cualquier servidor estático. El flujo de GitHub Actions publica la rama `main` en GitHub Pages.

## Contenido

Las futuras entradas se definen en `js/content.js`. La interfaz está preparada para indexarlas y buscarlas sin cambiar su estructura.

## Google AdSense

La integración está deliberadamente desactivada en `js/ads-config.js`. Solo se debe activar después de tener contenido suficiente, aprobación del sitio, un ID de editor `ca-pub-…`, unidades publicitarias y el consentimiento configurado cuando corresponda. Añade `ads.txt` en la raíz únicamente con el valor oficial de Google.

## TO DO
- Un endpoint "Simulación de Combate" donde explicaré con un texto estático que configuración usar para configurar una partida usando consola de comandos para hacer pruebas de combate dentro del juego.
- Quiero muchos más type dentro de blocks (enlaces, letras en negrita, insertar imagenes y otras cosas utiles que se te ocurran)
- Quiero que la web auto coloree ciertas palabras dentro de cada entrada de la base de conocimiento. Quiero una lista que asocie una palabra con un color y se busque dicha palabra ignorando mayusculas o minisculas y se aplique dicho color automáticamente solo a esa palabra.
- Quiero un buscador de palabras no solo de titulos, también que busque dentro de cada block/entry
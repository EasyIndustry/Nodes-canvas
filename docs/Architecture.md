# Architecture - Nodes Canvas Studio

## Introducción
Este documento explica la estructura interna del editor de nodos para colaborar con IAs o nuevos desarrolladores.

## Estructura de Clases (Namespaced UI)
Utilizamos un objeto global `window.NodesCanvas` para evitar problemas de CORS originados por usar módulos ES6 locales (`file://`).

- **Canvas (`js/core/Canvas.js`)**: Modifica la transformación del DIV principal emitiendo *pan* y *zoom*. El fondo cuadriculado está atado vía CSS al offset (`backgroundPosition`).
- **Node (`js/core/Node.js`)**: Crea nodos arrastrables del DOM. Tienen conectores de entrada / salida llamados "sockets".
- **ConnectionManager y Connection (`js/core/Connection.js`)**: Dibuja en un `<svg>` ubicado sobre la capa base del canvas. Las curvas matemáticas (Bezier Cúbico) adaptan sus puntos de control basado en si el socket es `in` o `out`.
- **BottomMenu (`js/ui/BottomMenu.js`)**: Capta clicks de botones y lanza instancias nuevas en el centro del viewport del canvas.

## Modificaciones Futuras
Si decides incorporar un build tool (`Vite`/`Webpack`), elimina el namespace global `window.NodesCanvas` y sustitúyelo por `export / import`.

# Nodes Canvas Studio

![Canvas Preview](./docs/captura%20canvas.JPG)

Entorno de programación visual basado en nodos. Construye lógica gráficamente, manipula datos y genera código JavaScript limpio.

## 🚀 Novedades de esta Rama (`LocalStorageMode`)

- **Local Workspace (File System)**: Guarda todos tus tableros, nodos creados y configuración directo en una carpeta en tu computadora (usando la API de *File System Access*).
- **Gestor de Librerías Descentralizado**: Buscador NPM/CDN integrado. Encuentra, descarga e inyecta librerías localmente para desarrollo *offline*.
- **Sin Backend Requerido**: El modo Independiente es 100% privacidad-first y todo se guarda en tu propia máquina.

> [!NOTE]
> **Modo Colaborativo en la Nube (Cloud):** Actualmente se encuentra **EN DESARROLLO**. Esta rama enfoca todos los esfuerzos en conseguir un entorno Standalone estable y persistente localmente.

## 🛠️ Características Principales

- **Tableros Visuales**: Sistema *drag & drop* de nodos para generar grafos de lógica.
- **Ejecución Continua o Debug**: Modo "Run" para correr el grafo según modificas inputs, o paso-por-paso mediante Breakpoints.
- **Data Nativa**: Nodos rápidos de variables, textos, números y lectura estructurada tipo Arrays y Objetos.
- **Code Inspector**: Observa el output y las transformaciones a Vanilla JS en tiempo real.

## 📂 Cómo Iniciar

1. Clona el repositorio.
2. Abre `index.html` en Chrome, Edge u otro navegador que soporte *File System API*.
3. Selecciona el **Modo Independiente**.
4. ¡Elige una carpeta vacía de tu PC para que sirva de *Workspace* y empieza a programar!

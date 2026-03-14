# Nodes Canvas Studio

A visual node-based programming environment inspired by Rhino's Grasshopper and visual flow editors. Build logic graphically, manipulate data, and export clean JavaScript code.

## 🚀 Features

- **Visual Canvas**: Drag, drop, and connect nodes in a responsive, zoomed environment.
- **Manual Data Nodes**: Create constants or variables with live type detection (Boolean, Number, Text, Objects, Arrays).
- **Functional Nodes**: Build your own library of reusable JavaScript functions.
- **Continuous Execution**: "Run Mode" evaluates the graph in real-time as you modify values.
- **Debug Mode**: Step through execution with breakpoints and visual feedback.
- **Code Inspector**: Live preview and download of the generated JavaScript code.
- **Persistence**: Your board is automatically saved to LocalStorage.
- **Clipboard Support**: Copy and paste nodes (Ctrl+C / Ctrl+V) to build complex patterns quickly.

## 🛠️ Technology Stack

- **Vanilla JavaScript**: Core logic and DOM manipulation.
- **SVG**: For high-performance connection rendering.
- **Monaco Editor**: Integrated for code editing tasks.
- **Lucide Icons**: Modern, consistent iconography.
- **CSS3**: Custom glassmorphism-inspired UI.

## 📂 Project Structure

- `/js/core`: Functional logic (Engine, Nodes, Connections, Persistence).
- `/js/ui`: UI components (Sidebar, Menus, Popups, Inspector).
- `/css`: Styling layers.
- `index.html`: Main entry point.

## 🚀 Getting Started

1. Clone this repository.
2. Open `index.html` in any modern browser.
3. Start dragging nodes from the sidebar onto the canvas!

---

Developed with ❤️ as a visual coding experiment.

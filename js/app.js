// app.js - Main Entry Point
window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas._clipboard = []; // Global clipboard for nodes

document.addEventListener("DOMContentLoaded", () => {
    console.log("Nodes Canvas Studio Initializing...");

    // Initialize Core Components
    const canvasContainer = document.getElementById("canvas-container");
    const canvasLayer = document.getElementById("canvas-layer");

    // 1. Setup Canvas
    window.NodesCanvas.canvas = new window.NodesCanvas.Canvas(canvasContainer, canvasLayer);
    window.NodesCanvas.popupManager = new window.NodesCanvas.PopupManager();

    // 2. Setup UI Menu
    window.NodesCanvas.bottomMenu = new window.NodesCanvas.BottomMenu();

    /** Centralized Deletion Logic */
    window.NodesCanvas.deleteSelectedNodes = () => {
        const selectedNodes = document.querySelectorAll('.node.selected');
        selectedNodes.forEach(nodeEl => {
            const nodeId = nodeEl.id;
            // 1. Remove Connections
            if (window.NodesCanvas.ConnectionManager) {
                window.NodesCanvas.ConnectionManager.removeConnectionsByNodeId(nodeId);
            }

            // 2. Clean up instances
            delete (window.NodesCanvas._nodeInstances || {})[nodeId];
            delete (window.NodesCanvas._panelInstances || {})[nodeId];
            delete (window.NodesCanvas._callInstances || {})[nodeId];

            // 3. Remove DOM
            nodeEl.remove();
        });

        // 4. Update State and UI
        window.NodesCanvas.CanvasState.scheduleSave();
        if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
            window.NodesCanvas.CodeInspector.refresh();
        }
    };

    // 3. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // 'Delete' or 'Backspace' key to delete selected nodes
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Check if user is typing in an input
            if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') {
                return;
            }
            window.NodesCanvas.deleteSelectedNodes();
        }

        // --- Duplication Logic (Ctrl+C / Ctrl+V) ---
        if (e.ctrlKey) {
            // COPY
            if (e.key === 'c' || e.key === 'C') {
                // If focus is in input, allow default browser copy
                if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;

                const selected = document.querySelectorAll('.node.selected');
                window.NodesCanvas._clipboard = Array.from(selected).map(nodeEl => {
                    const inst = window.NodesCanvas._nodeInstances[nodeEl.id] ||
                        window.NodesCanvas._panelInstances?.[nodeEl.id] ||
                        window.NodesCanvas._callInstances?.[nodeEl.id];
                    return inst;
                }).filter(Boolean);

                if (window.NodesCanvas._clipboard.length) {
                    console.log(`[App] Copied ${window.NodesCanvas._clipboard.length} nodes to clipboard`);
                }
            }

            // PASTE
            if (e.key === 'v' || e.key === 'V') {
                // If focus is in input, allow default browser paste
                if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea') return;

                if (!window.NodesCanvas._clipboard || !window.NodesCanvas._clipboard.length) return;

                // Deselect current
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));

                const newSelections = [];
                window.NodesCanvas._clipboard.forEach(inst => {
                    const duplicate = window.NodesCanvas.NodeFactory.duplicate(inst);
                    if (duplicate && duplicate.element) {
                        duplicate.element.classList.add('selected');
                        newSelections.push(duplicate.element);
                    }
                });

                // Update clipboard to the NEW nodes so repeat paste offsets them cumulatively
                window.NodesCanvas._clipboard = newSelections.map(el => {
                    return window.NodesCanvas._nodeInstances[el.id] ||
                        window.NodesCanvas._panelInstances?.[el.id] ||
                        window.NodesCanvas._callInstances?.[el.id];
                }).filter(Boolean);

                window.NodesCanvas.CanvasState.scheduleSave();
                if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                    window.NodesCanvas.CodeInspector.refresh();
                }
                console.log(`[App] Pasted ${newSelections.length} nodes`);
            }
        }
    });

    // 4. Auto-save hooks
    // Save when registry changes (new node templates, folders, etc.)
    window.NodesCanvas.Registry.onChange(() => {
        window.NodesCanvas.CanvasState.scheduleSave();
    });

    // Save when canvas is panned or zoomed
    const canvasContainerEl = document.getElementById('canvas-container');
    if (canvasContainerEl) {
        canvasContainerEl.addEventListener('mouseup', () => window.NodesCanvas.CanvasState.scheduleSave());
        canvasContainerEl.addEventListener('wheel', () => window.NodesCanvas.CanvasState.scheduleSave(), { passive: true });
    }

    // Save when a node stops being dragged (mouseup on window)
    window.addEventListener('mouseup', () => {
        // Small delay to let node position settle
        setTimeout(() => window.NodesCanvas.CanvasState.scheduleSave(), 100);
    });

    // 5. Restore saved board if it exists
    const restored = window.NodesCanvas.CanvasState.load();
    if (restored) {
        console.log('[App] Board restored from localStorage');
    }
});

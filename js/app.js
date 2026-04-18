// app.js - Main Entry Point
window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas._clipboard = []; // Global clipboard for nodes

document.addEventListener("DOMContentLoaded", () => {
    console.log("Nodes Canvas Studio Initializing... [v1.5]");

    // ── Standalone mode setup ──────────────────────────────────────────────────
    if (localStorage.getItem('nc_standalone_mode') === 'true') {
        const bar = document.getElementById('standalone-bar');
        const boardLabel = document.getElementById('standalone-board-name');
        if (bar) bar.style.display = 'flex';
        const boardName = localStorage.getItem('nc_active_board_name');
        if (boardLabel && boardName) boardLabel.textContent = '· ' + boardName;

        // Restore workspace dir handle so Save writes to file (not just localStorage)
        const wm = window.NodesCanvas.workspaceManager;
        if (wm && wm.isSupported) {
            wm.tryRestore().then(restored => {
                if (restored) console.log('[App] Workspace restored:', restored);
            });
        }

        let _dirtyCount = 0;
        let _lastCleanTime = Date.now();

        window.NodesCanvas._markDirty = () => {
            _dirtyCount++;
            
            // Add tiny indicator strictly for the settings menu if open
            const dropSaveStatus = document.getElementById('btn-save-status');
            if (dropSaveStatus) {
                dropSaveStatus.style.opacity = '1';
                dropSaveStatus.textContent = '● Pndg';
                dropSaveStatus.style.color = '#f59e0b';
            }
        };

        window.NodesCanvas._markClean = () => {
            _dirtyCount = 0;
            _lastCleanTime = Date.now();
            
            const dropSaveStatus = document.getElementById('btn-save-status');
            if (dropSaveStatus) {
                dropSaveStatus.style.opacity = '1';
                dropSaveStatus.textContent = '✓ Saved';
                dropSaveStatus.style.color = '#00dc82';
                setTimeout(() => { if (dropSaveStatus.textContent === '✓ Saved') dropSaveStatus.style.opacity = '0'; }, 2000);
            }
        };
    }

    // Verify critical components
    const hasSetTransform = window.NodesCanvas.Canvas && window.NodesCanvas.Canvas.prototype.setTransform;
    console.log(`[App] Canvas.setTransform verified: ${!!hasSetTransform}`);

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

            // 2. Clean up instances via Registry
            if (window.NodesCanvas.NodeRegistry) {
                window.NodesCanvas.NodeRegistry.unregister(nodeId);
            }

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
                    return window.NodesCanvas.NodeRegistry.get(nodeEl.id);
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
                    return window.NodesCanvas.NodeRegistry.get(el.id);
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
    window.NodesCanvas.Registry.syncBuiltInFolders();

    // Safety check to ensure canvas is ready before loading state
    if (window.NodesCanvas.canvas) {
        const restored = window.NodesCanvas.CanvasState.load();
        if (restored) {
            console.log('[App] Board restored from localStorage');
        }
    } else {
        console.error('[App] Canvas component forgot to initialize!');
    }

    console.log("Nodes Canvas Studio Ready! Use F12 -> Console to see debug messages.");
});

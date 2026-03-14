// CanvasState.js - Auto-saves and restores the full canvas state to/from localStorage
// Saves: Registry folders, canvas nodes, panel nodes, connections, canvas transform

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.CanvasState = {
    KEY: 'nodescanvas_board_v1',
    _saveTimer: null,

    /** Call this after any canvas mutation to schedule a debounced auto-save */
    scheduleSave() {
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.save(), 800);
    },

    /** Serialize and save the full board state */
    save() {
        try {
            const state = {
                savedAt: Date.now(),
                registry: JSON.parse(JSON.stringify(window.NodesCanvas.Registry.folders)),
                transform: window.NodesCanvas.canvas ? { ...window.NodesCanvas.canvas.transform } : null,
                nodes: this._serializeNodes(),
                panels: this._serializePanels(),
                callNodes: this._serializeCallNodes(),
                sliders: this._serializeSliders(),
                viewers: this._serializeViewers(),
                connections: this._serializeConnections(),
            };
            localStorage.setItem(this.KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[CanvasState] Save failed:', e);
        }
    },

    /** Load saved state and restore the board */
    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return false;
            const state = JSON.parse(raw);

            // 1. Restore Registry
            if (state.registry) {
                this._applyProtection(state.registry);
                window.NodesCanvas.Registry.folders = state.registry;
                if (window.NodesCanvas.Registry.syncBuiltInFolders) {
                    window.NodesCanvas.Registry.syncBuiltInFolders();
                }
                if (window.NodesCanvas.Registry.triggerUpdate) {
                    window.NodesCanvas.Registry.triggerUpdate();
                }
            }

            // 2. Restore Canvas Transform
            if (state.transform && window.NodesCanvas.canvas) {
                const t = state.transform;
                window.NodesCanvas.canvas.transform = t;
                const layer = document.getElementById('canvas-layer');
                if (layer) layer.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
            }

            // 3. Restore regular Nodes
            if (state.nodes) {
                state.nodes.forEach(cfg => {
                    new window.NodesCanvas.Node(cfg);
                });
            }

            // 4. Restore Manual Data Nodes
            if (state.panels) {
                state.panels.forEach(cfg => {
                    new window.NodesCanvas.ManualDataNode(cfg);
                });
            }

            // 5. Restore Call Data Nodes
            if (state.callNodes) {
                state.callNodes.forEach(cfg => {
                    new window.NodesCanvas.CallDataNode(cfg);
                });
            }

            // 6. Restore Slider Nodes
            if (state.sliders) {
                state.sliders.forEach(cfg => {
                    new window.NodesCanvas.SliderNode(cfg);
                });
            }

            // 7. Restore Viewer Nodes
            if (state.viewers) {
                state.viewers.forEach(cfg => {
                    new window.NodesCanvas.ViewerNode(cfg);
                });
            }

            // 8. Restore Connections (after nodes are in DOM)
            if (state.connections) {
                requestAnimationFrame(() => {
                    state.connections.forEach(conn => {
                        const fromSocket = document.querySelector(`[data-portid="${conn.fromPort}"]`);
                        const toSocket = document.querySelector(`[data-portid="${conn.toPort}"]`);
                        if (fromSocket && toSocket && window.NodesCanvas.ConnectionManager) {
                            window.NodesCanvas.ConnectionManager.createConnection(fromSocket, toSocket);
                        }
                    });
                });
            }

            console.log(`[CanvasState] Loaded board from ${new Date(state.savedAt).toLocaleTimeString()}`);
            return true;
        } catch (e) {
            console.warn('[CanvasState] Load failed:', e);
            return false;
        }
    },

    /** Wipe localStorage board data and reload the page */
    clearAndReset() {
        localStorage.removeItem(this.KEY);
        location.reload();
    },

    // --- Serializers ---

    _serializeNodes() {
        const nodes = [];
        Object.values(window.NodesCanvas._nodeInstances || {}).forEach(inst => {
            nodes.push({
                id: inst.id,
                x: inst.x,
                y: inst.y,
                title: inst.title,
                description: inst.description || '',
                icon: inst.icon || 'default',
                code: inst.code || '',
                inputs: JSON.parse(JSON.stringify(inst.inputs)),
                outputs: JSON.parse(JSON.stringify(inst.outputs)),
            });
        });
        return nodes;
    },

    _serializePanels() {
        const panels = [];
        const instances = window.NodesCanvas._panelInstances || {};
        Object.values(instances).forEach(panel => {
            panels.push({
                id: panel.id,
                x: panel.x,
                y: panel.y,
                label: panel.label,
                value: panel.value,
                arrayMode: panel.arrayMode,
                isConstant: panel.isConstant,
            });
        });
        return panels;
    },

    _serializeCallNodes() {
        const calls = [];
        const instances = window.NodesCanvas._callInstances || {};
        Object.values(instances).forEach(call => {
            calls.push({
                id: call.id,
                x: call.x,
                y: call.y,
                label: call.label,
                sourceId: call.sourceId,
            });
        });
        return calls;
    },

    _serializeSliders() {
        const sliders = [];
        const instances = window.NodesCanvas._nodeInstances || {};
        Object.values(instances).forEach(node => {
            if (node instanceof window.NodesCanvas.SliderNode) {
                sliders.push({
                    id: node.id,
                    x: node.x,
                    y: node.y,
                    label: node.label,
                    min: node.min,
                    max: node.max,
                    step: node.step,
                    value: node.value,
                    rounding: node.rounding,
                    precision: node.precision,
                });
            }
        });
        return sliders;
    },

    _serializeConnections() {
        const conns = [];
        document.querySelectorAll('.connection-path:not(.temp-path)').forEach(path => {
            const from = path.dataset.fromPort;
            const to = path.dataset.toPort;
            if (from && to) conns.push({ fromPort: from, toPort: to });
        });
        return conns;
    },

    _serializeViewers() {
        const viewers = [];
        const instances = window.NodesCanvas._viewerInstances || {};
        Object.values(instances).forEach(viewer => {
            viewers.push({
                id: viewer.id,
                x: viewer.x,
                y: viewer.y,
                label: viewer.label
            });
        });
        return viewers;
    },

    /** Recursively re-apply editable: false to built-in IDs */
    _applyProtection(folders) {
        const protectedFolders = ['f_data', 'f_math', 'f_logic'];
        const protectedNodes = ['n_manual_data', 'n_call_data', 'n_add', 'n_mult', 'n_and'];

        folders.forEach(f => {
            if (protectedFolders.includes(f.id)) f.editable = false;
            if (f.nodes) {
                f.nodes.forEach(n => {
                    if (protectedNodes.includes(n.id)) n.editable = false;
                });
            }
            if (f.subfolders) this._applyProtection(f.subfolders);
        });
    },
};

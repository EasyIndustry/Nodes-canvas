// CanvasState.js - Logic for saving and restoring the workspace from localStorage
// Refactored to use the unified NodeRegistry

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.CanvasState = {
    _saveTimeout: null,
    _lastRemoteSave: 0,
    _remoteSaveMinInterval: 15000, // 15s — Xano free tier: 10 req / 20s
    projectId: 'default_board',

    /** Schedule a debounced save (local only, fast) */
    scheduleSave() {
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this.save(), 800);
    },

    /** Save current state to localStorage and optionally Cloud */
    async save() {
        console.log('[CanvasState] Saving workspace...');
        const state = {
            nodes: this._serializeNodes(),
            connections: window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [],
            transform: window.NodesCanvas.canvas ? window.NodesCanvas.canvas.transform : { x: 0, y: 0, scale: 1 },
            updatedAt: Date.now()
        };

        // Local Storage
        localStorage.setItem(`nodes_canvas_${this.projectId}`, JSON.stringify(state));

        // Cloud Storage — throttled to respect Xano free tier rate limits
        if (this.currentBoardId && window.NodesCanvas.AuthManager.isLoggedIn()) {
            const now = Date.now();
            if (now - this._lastRemoteSave >= this._remoteSaveMinInterval) {
                this._lastRemoteSave = now;
                this.saveRemote(this.currentBoardTitle || 'Auto-saved Board');
            } else {
                // Schedule a deferred remote save for when the window opens
                if (!this._remoteDeferred) {
                    const remaining = this._remoteSaveMinInterval - (now - this._lastRemoteSave);
                    this._remoteDeferred = setTimeout(() => {
                        this._remoteDeferred = null;
                        this._lastRemoteSave = Date.now();
                        this.saveRemote(this.currentBoardTitle || 'Auto-saved Board');
                    }, remaining);
                }
            }
        }
    },

    async saveRemote(title) {
        if (!window.NodesCanvas.AuthManager.isLoggedIn()) return;

        const state = {
            nodes: this._serializeNodes(),
            connections: window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [],
            transform: window.NodesCanvas.canvas ? window.NodesCanvas.canvas.transform : { x: 0, y: 0, scale: 1 }
        };

        const result = await window.NodesCanvas.AuthManager.saveBoard({
            id: this.currentBoardId,
            title: title || this.currentBoardTitle || 'New Board',
            settings: state
        });

        if (result.success) {
            this.currentBoardId = result.data.id;
            this.currentBoardTitle = result.data.title;
            console.log('[CanvasState] Remote save successful');
            return true;
        }
        return false;
    },

    async loadRemote(boardId) {
        const board = await window.NodesCanvas.AuthManager.getBoardDetails(boardId);
        if (board && board.settings) {
            this.currentBoardId = board.id;
            this.currentBoardTitle = board.title;
            this._restoreState(board.settings);
            this.save(); // Sync to local storage too
            return true;
        }
        return false;
    },

    /** Load state from localStorage */
    load() {
        const raw = localStorage.getItem(`nodes_canvas_${this.projectId}`);
        if (!raw) return false;

        try {
            const state = JSON.parse(raw);
            this._restoreState(state);
            return true;
        } catch (e) {
            console.warn('[CanvasState] Load failed:', e);
            return false;
        }
    },

    /** Wipe board and reset */
    clearAndReset() {
        localStorage.removeItem(`nodes_canvas_${this.projectId}`);
        location.reload();
    },

    // --- Serializers ---

    _serializeNodes() {
        if (!window.NodesCanvas.NodeRegistry) return [];

        return window.NodesCanvas.NodeRegistry.getAll().map(inst => {
            const baseData = {
                id: inst.id,
                type: this._getNodeType(inst),
                x: inst.x,
                y: inst.y,
                title: inst.title
            };

            // Specialized data based on type
            if (inst instanceof window.NodesCanvas.ManualDataNode) {
                return { ...baseData, label: inst.label, value: inst.value, arrayMode: inst.arrayMode, isConstant: inst.isConstant };
            } else if (inst instanceof window.NodesCanvas.CallDataNode) {
                return { ...baseData, label: inst.label, sourceId: inst.sourceId };
            } else if (inst instanceof window.NodesCanvas.SliderNode) {
                return { ...baseData, settings: inst.config, value: inst.value };
            } else if (inst instanceof window.NodesCanvas.ViewerNode) {
                return { ...baseData };
            } else if (inst instanceof window.NodesCanvas.DataHolderNode) {
                return { ...baseData, _live: inst._live };
            } else if (inst instanceof window.NodesCanvas.HttpRequestNode) {
                return { ...baseData, settings: { isAuto: inst.isAuto } };
            } else if (inst instanceof window.NodesCanvas.ValueListNode) {
                return { ...baseData, manualOptions: inst.manualOptions, selectedIndex: inst.selectedIndex };
            } else {
                // Generic Function Node
                return {
                    ...baseData,
                    description: inst.description || '',
                    icon: inst.icon || 'box',
                    code: inst.code || '',
                    inputs: window.NodesCanvas.Utils.clone(inst.inputs || []),
                    outputs: window.NodesCanvas.Utils.clone(inst.outputs || [])
                };
            }
        });
    },

    _getNodeType(inst) {
        if (inst instanceof window.NodesCanvas.ManualDataNode) return 'manual-data';
        if (inst instanceof window.NodesCanvas.CallDataNode) return 'call-data';
        if (inst instanceof window.NodesCanvas.SliderNode) return 'slider';
        if (inst instanceof window.NodesCanvas.ViewerNode) return 'viewer';
        if (inst instanceof window.NodesCanvas.DataHolderNode) return 'data-holder';
        if (inst instanceof window.NodesCanvas.HttpRequestNode) return 'http-request';
        if (inst instanceof window.NodesCanvas.ValueListNode) return 'value-list';
        return 'function';
    },

    // --- Restoration ---

    _restoreState(state) {
        if (!state) return;

        // 1. Clear current registry
        if (window.NodesCanvas.NodeRegistry) window.NodesCanvas.NodeRegistry.clear();

        // 2. Clear current DOM nodes (but preserve the connections-layer SVG)
        const layer = document.getElementById('canvas-layer');
        if (layer) {
            // Remove all children EXCEPT the connections-layer SVG
            Array.from(layer.children).forEach(child => {
                if (child.id !== 'connections-layer') {
                    child.remove();
                }
            });
            // Also clear the SVG content
            const svg = document.getElementById('connections-layer');
            if (svg) svg.innerHTML = '';
        }

        // 3. Restore Transform
        if (state.transform && window.NodesCanvas.canvas) {
            window.NodesCanvas.canvas.setTransform(state.transform.x, state.transform.y, state.transform.scale);
        }

        // 4. Create Nodes
        if (state.nodes && Array.isArray(state.nodes)) {
            state.nodes.forEach(config => {
                window.NodesCanvas.NodeFactory.createNode(config);
            });
        }

        // 5. Restore Connections
        if (state.connections && window.NodesCanvas.ConnectionManager) {
            window.NodesCanvas.ConnectionManager.restoreConnections(state.connections);
        }

        console.log(`[CanvasState] Restored ${state.nodes?.length || 0} nodes`);
    }
};

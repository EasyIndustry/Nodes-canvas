// CanvasState.js - Logic for saving and restoring the workspace from localStorage
// Refactored to use the unified NodeRegistry

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.CanvasState = {
    _saveTimeout: null,
    _lastRemoteSave: 0,
    _remoteSaveMinInterval: 15000,
    projectId: 'default_board',

    get _SK() { return window.NodesCanvas.StorageKeys; },

    get isStandaloneMode() {
        return localStorage.getItem(this._SK.STANDALONE_MODE) === 'true';
    },

    get activeBoardName() {
        return localStorage.getItem(this._SK.ACTIVE_BOARD_NAME) || 'default';
    },

    /** Schedule a debounced save (cache only, fast) */
    scheduleSave() {
        if (window.NodesCanvas._markDirty) window.NodesCanvas._markDirty();
        if (this._saveTimeout) clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => this.saveToCache(), 800);
    },

    /** Saves purely to localStorage memory cache, avoiding disk writes */
    saveToCache() {
        if (this.isRestoring) return;
        const state = {
            nodes: this._serializeNodes(),
            connections: window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [],
            transform: window.NodesCanvas.canvas ? window.NodesCanvas.canvas.transform : { x: 0, y: 0, scale: 1 },
            updatedAt: Date.now()
        };
        localStorage.setItem(this._SK.boardState(this.projectId), JSON.stringify(state));
    },

    /** Save current state to localStorage and optionally workspace file / Cloud */
    async save() {
        const state = {
            nodes: this._serializeNodes(),
            connections: window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [],
            transform: window.NodesCanvas.canvas ? window.NodesCanvas.canvas.transform : { x: 0, y: 0, scale: 1 },
            updatedAt: Date.now()
        };

        // Always save to localStorage (fast, immediate)
        localStorage.setItem(this._SK.boardState(this.projectId), JSON.stringify(state));

        // Standalone mode: also write to workspace file
        if (this.isStandaloneMode) {
            const wm = window.NodesCanvas.workspaceManager;
            if (wm && wm.isReady) {
                try {
                    await wm.saveBoard(this.activeBoardName, state);
                    if (window.NodesCanvas.Registry) {
                        await window.NodesCanvas.Registry.saveLocal();
                    }
                    if (window.NodesCanvas._markClean) window.NodesCanvas._markClean();
                } catch (e) {
                    console.error('[CanvasState] Save to workspace failed:', e);
                }
            } else {
                // No file handle — still mark clean (localStorage saved)
                if (window.NodesCanvas._markClean) window.NodesCanvas._markClean();
            }
            return;
        }

        // Mark clean for localStorage-only saves in cloud mode
        if (window.NodesCanvas._markClean) window.NodesCanvas._markClean();

        // Cloud Storage (Xano) — only in cloud mode
        if (this.currentBoardId && window.NodesCanvas.AuthManager && window.NodesCanvas.AuthManager.isLoggedIn()) {
            const now = Date.now();
            if (now - this._lastRemoteSave >= this._remoteSaveMinInterval) {
                this._lastRemoteSave = now;
                this.saveRemote(this.currentBoardTitle || 'Auto-saved Board');
            } else {
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

    /** Load state from localStorage (or standalone board data) */
    load() {
        // Standalone mode: board data was injected by the dashboard
        if (this.isStandaloneMode) {
            const raw = localStorage.getItem(this._SK.BOARD_DATA);
            if (raw) {
                try {
                    const state = JSON.parse(raw);
                    // Clear injected data so refresh doesn't double-load
                    localStorage.removeItem(this._SK.BOARD_DATA);
                    // Also seed localStorage slot so subsequent saves work
                    localStorage.setItem(this._SK.boardState(this.projectId), raw);
                    this._restoreState(state);
                    console.log('[CanvasState] Standalone board loaded:', this.activeBoardName);
                    return true;
                } catch (e) {
                    console.warn('[CanvasState] Standalone board parse failed:', e);
                }
            }
            // Fallback to localStorage slot
        }

        const raw = localStorage.getItem(this._SK.boardState(this.projectId));
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
        localStorage.removeItem(this._SK.boardState(this.projectId));
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
            } else if (inst instanceof window.NodesCanvas.BranchNode) {
                return { ...baseData, branches: window.NodesCanvas.Utils.clone(inst.branches) };
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
        if (inst instanceof window.NodesCanvas.ExpressionNode) return 'expression';
        if (inst instanceof window.NodesCanvas.BranchNode) return 'branch';
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
            // Also clear the SVG content, but preserve temp-path
            const svg = document.getElementById('connections-layer');
            if (svg) {
                Array.from(svg.children).forEach(child => {
                    if (!child.classList.contains('temp-path')) {
                        child.remove();
                    }
                });
            }
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

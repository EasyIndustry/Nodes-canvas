// GraphEngine.js - Execution engine for the node canvas graph
// Run mode: continuous evaluation. Debug mode: step-through with breakpoints.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.GraphEngine = {

    // ── State ────────────────────────────────────────────────────────────────
    _runListeners: [],        // panel input listeners bound in run mode
    _debugState: null,        // { order, nodes, connections, step, breakpoints }

    // ── Value parsing ─────────────────────────────────────────────────────────
    _parseValue(str) {
        if (typeof str !== 'string') return str;
        str = str.trim();
        if (str === 'true') return true;
        if (str === 'false') return false;
        if (str === 'null') return null;
        if (str === '') return '';

        // Attempt to parse JSON if it looks like an array or object
        if ((str.startsWith('[') && str.endsWith(']')) || (str.startsWith('{') && str.endsWith('}'))) {
            try {
                return JSON.parse(str);
            } catch (e) {
                // If parsing fails, fall back to treats as string
            }
        }

        const n = Number(str);
        return isNaN(n) ? str : n;
    },

    // Convert a label to a valid JS identifier
    _toVar(label) {
        return (label || 'v').replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^([0-9])/, '_$1');
    },

    // ── Graph building ────────────────────────────────────────────────────────
    _buildGraph() {
        const nodes = {};
        const conns = window.NodesCanvas.ConnectionManager?.connections || [];

        // --- Manual Data nodes (constants / variables) ---
        Object.values(window.NodesCanvas._panelInstances || {}).forEach(dataNode => {
            const rawValue = dataNode.value;
            const value = dataNode.arrayMode
                ? rawValue.split('\n').map(v => this._parseValue(v))
                : this._parseValue(rawValue);

            // Get port id from the data node's output socket
            const outSocket = document.getElementById(dataNode.id)?.querySelector('.socket[data-type="out"]');
            const outPortId = outSocket?.dataset.portid || (dataNode.id + '_out');

            nodes[dataNode.id] = {
                id: dataNode.id,
                type: 'manual-data',
                label: dataNode.label,
                isConstant: dataNode.isConstant !== false,
                value,
                outPortId,
                inputs: [],
                outputs: [outPortId],
                resolvedOutputs: {},
                error: null,
            };
        });

        // --- Manual Data nodes (constants / variables) ---
        // (keeping previous logic)

        // --- Call Data nodes (references) ---
        Object.values(window.NodesCanvas._callInstances || {}).forEach(callNode => {
            // Get port id
            const outSocket = document.getElementById(callNode.id)?.querySelector('.socket[data-type="out"]');
            const outPortId = outSocket?.dataset.portid || (callNode.id + '_out');

            nodes[callNode.id] = {
                id: callNode.id,
                type: 'call-data',
                label: callNode.label,
                sourceId: callNode.sourceId,
                outPortId,
                inputs: [],
                outputs: [outPortId],
                resolvedOutputs: {},
                error: null,
            };
        });

        // --- Regular function nodes ---
        Object.values(window.NodesCanvas._nodeInstances || {}).forEach(node => {
            const inputPorts = node.inputs.map(i => i.id);
            const outputPorts = node.outputs.map(o => o.id);

            nodes[node.id] = {
                id: node.id,
                type: 'function',
                label: node.title,
                code: node.code || '',
                inputPorts,
                outputPorts,
                inputLabels: node.inputs.map(i => i.label),
                outputLabels: node.outputs.map(o => o.label),
                resolvedInputs: {},
                resolvedOutputs: {},
                error: null,
            };
        });

        return { nodes, conns };
    },

    // ── Topological sort (Kahn's algorithm) ──────────────────────────────────
    _topoSort(nodes, conns) {
        const inDegree = {};
        const adj = {};  // nodeId → [nodeId]

        Object.keys(nodes).forEach(id => { inDegree[id] = 0; adj[id] = []; });

        conns.forEach(conn => {
            const src = conn.sourceNodeId;
            const tgt = conn.targetNodeId;
            if (nodes[src] && nodes[tgt]) {
                adj[src].push(tgt);
                inDegree[tgt]++;
            }
        });

        const queue = Object.keys(nodes).filter(id => inDegree[id] === 0);
        const sorted = [];

        while (queue.length) {
            const cur = queue.shift();
            sorted.push(cur);
            (adj[cur] || []).forEach(next => {
                if (--inDegree[next] === 0) queue.push(next);
            });
        }

        return sorted;
    },

    // ── Execute a single node ─────────────────────────────────────────────────
    _execNode(nodeData, conns, allNodes) {
        try {
            if (nodeData.type === 'manual-data') {
                nodeData.resolvedOutputs[nodeData.outPortId] = nodeData.value;
                return;
            }
            if (nodeData.type === 'call-data') {
                const inst = window.NodesCanvas._callInstances?.[nodeData.id];
                nodeData.resolvedOutputs[nodeData.outPortId] = inst ? inst.getValue() : undefined;
                return;
            }

            if (!nodeData.code || !nodeData.code.trim()) {
                console.warn(`[GraphEngine] No code for node "${nodeData.label}"`);
                return;
            }

            // Resolve inputs from upstream connections
            const inputObj = {};
            conns.forEach(conn => {
                if (conn.targetNodeId !== nodeData.id) return;
                const upstream = allNodes[conn.sourceNodeId];
                if (!upstream) return;
                const val = upstream.resolvedOutputs[conn.sourcePortId];

                const idx = nodeData.inputPorts.indexOf(conn.targetPortId);
                const varName = this._toVar(idx >= 0 ? (nodeData.inputLabels[idx] || conn.targetPortId) : conn.targetPortId);
                inputObj[varName] = val;
            });

            nodeData.resolvedInputs = inputObj;
            console.log(`[GraphEngine] Executing "${nodeData.label}" with:`, inputObj);

            // Execute: code defines function execute({...}) {...}
            const fn = new Function(nodeData.code + '\nreturn execute;')();
            const result = fn(inputObj);
            console.log(`[GraphEngine] "${nodeData.label}" result:`, result);

            // Map result keys → output port ids by label then by position
            if (result && typeof result === 'object') {
                const resultKeys = Object.keys(result);
                nodeData.outputPorts.forEach((portId, idx) => {
                    const label = nodeData.outputLabels?.[idx];
                    const varName = label ? this._toVar(label) : null;

                    let resolved;
                    if (varName && Object.prototype.hasOwnProperty.call(result, varName)) {
                        resolved = result[varName];
                    } else if (idx < resultKeys.length) {
                        resolved = result[resultKeys[idx]];   // positional fallback
                    } else {
                        resolved = undefined;
                    }
                    nodeData.resolvedOutputs[portId] = resolved;
                });
            }
        } catch (err) {
            nodeData.error = err.message;
            console.error(`[GraphEngine] Node "${nodeData.label}" threw:`, err);
        }
    },

    // ── Full execution ────────────────────────────────────────────────────────
    execute() {
        this._clearVisuals();

        const { nodes, conns } = this._buildGraph();
        if (!Object.keys(nodes).length) return;

        const order = this._topoSort(nodes, conns);

        order.forEach(id => this._execNode(nodes[id], conns, nodes));

        this._showResults(nodes);
        return nodes;
    },

    // ── RUN MODE ─────────────────────────────────────────────────────────────
    startRunMode() {
        this.stopRunMode();
        this.execute();  // initial run

        // Re-run on every Panel textarea change (debounced 300ms)
        let runTimer = null;
        const rerun = () => {
            clearTimeout(runTimer);
            runTimer = setTimeout(() => this.execute(), 300);
        };

        document.querySelectorAll('.panel-textarea').forEach(ta => {
            ta.addEventListener('input', rerun);
            this._runListeners.push({ el: ta, fn: rerun });
        });

        // Also listen to future data nodes being added (MutationObserver)
        this._runObserver = new MutationObserver(() => {
            // re-bind any new textareas
            document.querySelectorAll('.panel-textarea').forEach(ta => {
                if (!this._runListeners.find(l => l.el === ta)) {
                    ta.addEventListener('input', rerun);
                    this._runListeners.push({ el: ta, fn: rerun });
                }
            });
        });
        const layer = document.getElementById('canvas-layer');
        if (layer) this._runObserver.observe(layer, { childList: true, subtree: true });

        console.log('[GraphEngine] Run mode started');
    },

    stopRunMode() {
        this._runListeners.forEach(({ el, fn }) => el.removeEventListener('input', fn));
        this._runListeners = [];
        if (this._runObserver) { this._runObserver.disconnect(); this._runObserver = null; }
        this._clearVisuals();
        console.log('[GraphEngine] Run mode stopped');
    },

    // ── DEBUG MODE ────────────────────────────────────────────────────────────
    startDebugMode() {
        this.stopDebugMode();
        this._clearVisuals();

        const { nodes, conns } = this._buildGraph();
        const order = this._topoSort(nodes, conns);

        this._debugState = {
            nodes,
            conns,
            order,
            step: 0,
            breakpoints: new Set(),  // node ids
        };

        this._renderDebugOverlays();
        console.log('[GraphEngine] Debug mode started. Use Step buttons or set breakpoints.');
    },

    stopDebugMode() {
        if (!this._debugState) return;
        this._debugState = null;
        document.querySelectorAll('.debug-overlay').forEach(el => el.remove());
        this._clearVisuals();
        console.log('[GraphEngine] Debug mode stopped');
    },

    debugStep() {
        const ds = this._debugState;
        if (!ds || ds.step >= ds.order.length) {
            console.log('[GraphEngine] Debug: execution complete');
            this._showResults(ds?.nodes || {});
            return false;
        }

        const nodeId = ds.order[ds.step];
        const nodeData = ds.nodes[nodeId];

        this._execNode(nodeData, ds.conns, ds.nodes);
        this._highlightDebugNode(nodeId);
        this._updateDebugOverlays(ds);

        ds.step++;
        return ds.step < ds.order.length;
    },

    debugRunToBreakpoint() {
        const ds = this._debugState;
        if (!ds) return;

        let hasMore = true;
        while (hasMore) {
            const nodeId = ds.order[ds.step];
            if (!nodeId) { hasMore = false; break; }

            hasMore = this.debugStep();

            const nextId = ds.order[ds.step];
            if (nextId && ds.breakpoints.has(nextId)) break;
        }

        this._showResults(ds.nodes);
    },

    toggleBreakpoint(nodeId) {
        const ds = this._debugState;
        if (!ds) return;
        if (ds.breakpoints.has(nodeId)) {
            ds.breakpoints.delete(nodeId);
        } else {
            ds.breakpoints.add(nodeId);
        }
        this._updateDebugOverlays(ds);
    },

    // ── Debug overlay rendering ───────────────────────────────────────────────
    _renderDebugOverlays() {
        document.querySelectorAll('.debug-overlay').forEach(el => el.remove());

        const ds = this._debugState;
        const canvasLayer = document.getElementById('canvas-layer');

        ds.order.forEach((nodeId, stepIdx) => {
            const nodeEl = document.getElementById(nodeId);
            if (!nodeEl) return;

            const overlay = document.createElement('div');
            overlay.className = 'debug-overlay';
            overlay.dataset.nodeId = nodeId;
            overlay.innerHTML = `
                <button class="dbg-bp-btn" title="Toggle Breakpoint" data-node="${nodeId}">🔴</button>
                <span class="dbg-step-num">#${stepIdx + 1}</span>
                <button class="dbg-step-btn" title="Step to here" data-node="${nodeId}">▶ Step</button>
            `;

            overlay.querySelector('.dbg-bp-btn').addEventListener('click', e => {
                e.stopPropagation();
                this.toggleBreakpoint(nodeId);
            });
            overlay.querySelector('.dbg-step-btn').addEventListener('click', e => {
                e.stopPropagation();
                // Advance until this node is executed
                while (ds.step < ds.order.length && ds.order[ds.step - 1] !== nodeId) {
                    this.debugStep();
                }
                this._showResults(ds.nodes);
            });

            canvasLayer.appendChild(overlay);
            this._positionOverlay(overlay, nodeEl);
        });

        // Global debug toolbar
        this._renderDebugToolbar();
    },

    _positionOverlay(overlay, nodeEl) {
        const match = nodeEl.style.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (!match) return;
        const nx = parseFloat(match[1]);
        const ny = parseFloat(match[2]);
        const nw = nodeEl.offsetWidth || 160;
        overlay.style.transform = `translate(${nx}px, ${ny - 32}px)`;
        overlay.style.width = nw + 'px';
    },

    _updateDebugOverlays(ds) {
        ds.order.forEach((nodeId, stepIdx) => {
            const overlay = document.querySelector(`.debug-overlay[data-node-id="${nodeId}"]`);
            if (!overlay) return;

            const hasBP = ds.breakpoints.has(nodeId);
            const isDone = stepIdx < ds.step;
            const isCurrent = stepIdx === ds.step - 1;

            overlay.classList.toggle('dbg-breakpoint', hasBP);
            overlay.classList.toggle('dbg-done', isDone);
            overlay.classList.toggle('dbg-current', isCurrent);
        });
    },

    _renderDebugToolbar() {
        document.getElementById('debug-toolbar')?.remove();
        const toolbar = document.createElement('div');
        toolbar.id = 'debug-toolbar';
        toolbar.innerHTML = `
            <button id="dbg-step-one">▶ Step</button>
            <button id="dbg-run-bp">⏩ Run to Breakpoint</button>
            <button id="dbg-run-all">⏭ Run All</button>
        `;
        document.body.appendChild(toolbar);

        toolbar.querySelector('#dbg-step-one').addEventListener('click', () => {
            this.debugStep();
            this._showResults(this._debugState?.nodes || {});
        });
        toolbar.querySelector('#dbg-run-bp').addEventListener('click', () => this.debugRunToBreakpoint());
        toolbar.querySelector('#dbg-run-all').addEventListener('click', () => {
            const ds = this._debugState;
            if (!ds) return;
            while (ds.step < ds.order.length) this.debugStep();
            this._showResults(ds.nodes);
        });
    },

    _highlightDebugNode(nodeId) {
        document.querySelectorAll('.node-debug-current').forEach(el => el.classList.remove('node-debug-current'));
        document.getElementById(nodeId)?.classList.add('node-debug-current');
    },

    // ── Visual results ────────────────────────────────────────────────────────
    _showResults(nodes) {
        this._clearVisuals();

        Object.values(nodes).forEach(node => {
            if (node.error) {
                document.getElementById(node.id)?.classList.add('node-error');
            }

            Object.entries(node.resolvedOutputs).forEach(([portId, value]) => {
                const socket = document.querySelector(`[data-portid="${portId}"]`);
                if (!socket) return;

                const badge = document.createElement('div');
                badge.className = 'socket-value-badge';
                const display = value === undefined ? '∅' : JSON.stringify(value);
                badge.textContent = display.length > 20 ? display.slice(0, 18) + '…' : display;
                badge.title = display;

                socket.parentElement.style.position = 'relative';
                socket.parentElement.appendChild(badge);
            });
        });
    },

    _clearVisuals() {
        document.querySelectorAll('.socket-value-badge').forEach(b => b.remove());
        document.querySelectorAll('.node-error').forEach(n => n.classList.remove('node-error'));
        document.querySelectorAll('.node-debug-current').forEach(n => n.classList.remove('node-debug-current'));
    },

    // Legacy exportToJS removed in favor of CodeInspector.js
    exportToJS() {
        if (window.NodesCanvas.CodeInspector) {
            window.NodesCanvas.CodeInspector.open();
        }
    },
};

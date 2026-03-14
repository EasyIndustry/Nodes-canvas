// GraphEngine.js - Execution engine for the node canvas graph
// Run mode: continuous evaluation.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.executionMode = null;

window.NodesCanvas.GraphEngine = {

    // ── State ────────────────────────────────────────────────────────────────
    _runListeners: [],        // panel input listeners bound in run mode
    _runObserver: null,

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

        // --- Regular nodes & Sliders & Viewers ---
        Object.values(window.NodesCanvas._nodeInstances || {}).forEach(node => {
            if (node instanceof window.NodesCanvas.SliderNode) {
                const outPortId = (node.id + '_out');
                nodes[node.id] = {
                    id: node.id,
                    type: 'slider',
                    label: node.label,
                    value: node.value,
                    outPortId,
                    inputs: [],
                    outputs: [outPortId],
                    resolvedOutputs: {},
                    error: null,
                };
            } else if (node instanceof window.NodesCanvas.ViewerNode) {
                nodes[node.id] = {
                    id: node.id,
                    type: 'viewer',
                    label: node.label,
                    inputPorts: [node.id + '_in'],
                    resolvedInputs: {},
                    resolvedOutputs: {},
                    error: null
                };
            } else {
                // Regular function node
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
            }
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
            const u = queue.shift();
            sorted.push(u);
            adj[u].forEach(v => {
                inDegree[v]--;
                if (inDegree[v] === 0) queue.push(v);
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
            if (nodeData.type === 'slider') {
                nodeData.resolvedOutputs[nodeData.outPortId] = nodeData.value;
                return;
            }

            if (nodeData.type === 'viewer') {
                const inputPortId = nodeData.inputPorts[0];
                let val = undefined;
                conns.forEach(conn => {
                    if (conn.targetNodeId === nodeData.id && conn.targetPortId === inputPortId) {
                        const upstream = allNodes[conn.sourceNodeId];
                        if (upstream) val = upstream.resolvedOutputs[conn.sourcePortId];
                    }
                });
                const inst = window.NodesCanvas._viewerInstances[nodeData.id];
                if (inst) inst.setValue(val);
                return;
            }

            if (!nodeData.code || !nodeData.code.trim()) return;

            // Resolve inputs
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

            // Execute
            const fn = new Function(nodeData.code + '\nreturn execute;')();
            const result = fn(inputObj);

            if (result && typeof result === 'object') {
                const resultKeys = Object.keys(result);
                nodeData.outputPorts.forEach((portId, idx) => {
                    const label = nodeData.outputLabels[idx];
                    let resolved;
                    if (result.hasOwnProperty(label)) {
                        resolved = result[label];
                    } else if (idx < resultKeys.length) {
                        resolved = result[resultKeys[idx]];
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
        if (window.NodesCanvas.executionMode !== 'run') return;

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
        window.NodesCanvas.executionMode = 'run';
        this.execute();

        const rerun = () => {
            if (window.NodesCanvas.executionMode === 'run') this.execute();
        };

        // Re-bind listeners
        const bind = (selector) => {
            document.querySelectorAll(selector).forEach(el => {
                if (!this._runListeners.find(l => l.el === el)) {
                    el.addEventListener('input', rerun);
                    this._runListeners.push({ el, fn: rerun });
                }
            });
        };

        bind('.panel-textarea');
        bind('.slider-gh-range');

        this._runObserver = new MutationObserver(() => {
            bind('.panel-textarea');
            bind('.slider-gh-range');
        });
        const layer = document.getElementById('canvas-layer');
        if (layer) this._runObserver.observe(layer, { childList: true, subtree: true });

        console.log('[GraphEngine] Run mode started');
    },

    stopRunMode() {
        window.NodesCanvas.executionMode = null;
        this._runListeners.forEach(({ el, fn }) => el.removeEventListener('input', fn));
        this._runListeners = [];
        if (this._runObserver) { this._runObserver.disconnect(); this._runObserver = null; }

        // Clear all viewer displays when stopping
        Object.values(window.NodesCanvas._viewerInstances || {}).forEach(inst => inst.clear());

        this._clearVisuals();
        console.log('[GraphEngine] Run mode stopped');
    },

    // ── Visual results ────────────────────────────────────────────────────────
    _showResults(nodes) {
        this._clearVisuals();

        // In Run mode, we ONLY show errors on nodes. Actual values go to Viewers or badges.
        Object.values(nodes).forEach(node => {
            if (node.error) {
                document.getElementById(node.id)?.classList.add('node-error');
            }

            // We only show floating badges if NOT in run mode (though execute usually doesn't run then)
            // But if we want to show results after an explicit execute call:
            if (window.NodesCanvas.executionMode === 'run') return;

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
    }
};

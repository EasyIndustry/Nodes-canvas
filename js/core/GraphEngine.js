// GraphEngine.js - Logic for executing the node graph

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.GraphEngine = {
    _executionOrder: [],
    _nodeData: {}, // Runtime cache of calculated values

    /**
     * Build the dependency graph and sort topologically
     */
    _buildGraph() {
        const nodesArr = window.NodesCanvas.NodeRegistry.getAll();
        const connections = window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [];

        // Convert nodes to map for easy lookup
        const nodesMap = {};
        nodesArr.forEach(n => nodesMap[n.id] = n);

        const sorted = this._topoSort(nodesMap, connections);
        this._executionOrder = sorted;

        return { nodes: nodesMap, connections: connections };
    },

    /**
     * Topological sort (Kahn's Algorithm)
     */
    _topoSort(nodesMap, connections) {
        const adj = {};
        const inDegree = {};
        const nodeIds = Object.keys(nodesMap);

        nodeIds.forEach(id => {
            adj[id] = [];
            inDegree[id] = 0;
        });

        connections.forEach(conn => {
            if (adj[conn.fromNodeId] && inDegree[conn.toNodeId] !== undefined) {
                adj[conn.fromNodeId].push(conn);
                inDegree[conn.toNodeId]++;
            }
        });

        const queue = [];
        nodeIds.forEach(id => {
            if (inDegree[id] === 0) queue.push(id);
        });

        const sorted = [];
        while (queue.length > 0) {
            const u = queue.shift();
            sorted.push(u);

            (adj[u] || []).forEach(conn => {
                inDegree[conn.toNodeId]--;
                if (inDegree[conn.toNodeId] === 0) queue.push(conn.toNodeId);
            });
        }
        return sorted;
    },

    /** Helper to convert labels to valid JS variable names */
    _toVar(str) {
        if (!str) return 'var';
        return str.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/^([0-9])/, '_$1');
    },

    /**
     * Execute the entire graph or starting from specific nodes
     */
    async execute() {
        if (window.NodesCanvas.executionMode !== 'run') return;

        console.time('[GraphEngine] Execution');
        this._buildGraph();
        this._nodeData = {}; // Clear previous values

        for (let i = 0; i < this._executionOrder.length; i++) {
            const nodeId = this._executionOrder[i];
            const instance = window.NodesCanvas.NodeRegistry.get(nodeId);
            if (!instance) continue;

            try {
                await this._executeNode(instance);
            } catch (err) {
                console.error(`[GraphEngine] Error executing node ${nodeId}:`, err);
            }
        }

        console.timeEnd('[GraphEngine] Execution');
    },

    /**
     * Run the logic for a single node instance
     */
    async _executeNode(instance) {
        // 1. Gather inputs
        const inputs = {};
        const connections = window.NodesCanvas.ConnectionManager ? window.NodesCanvas.ConnectionManager.getConnections() : [];
        const myConnections = connections.filter(c => c.toNodeId === instance.id);

        myConnections.forEach(conn => {
            const sourceData = this._nodeData[conn.fromNodeId];
            if (sourceData && sourceData.outputs) {
                inputs[conn.toPortId] = sourceData.outputs[conn.fromPortId];
            }
        });

        // 2. Resolve logic based on node type
        let result = { outputs: {} };

        if (instance instanceof window.NodesCanvas.ManualDataNode) {
            // Panel output is simple
            const raw = instance.value;
            result.outputs[`${instance.id}_out`] = instance.arrayMode ?
                raw.split('\n').map(v => this._parseValue(v)) :
                this._parseValue(raw);

        } else if (instance instanceof window.NodesCanvas.CallDataNode) {
            result.outputs[`${instance.id}_out`] = instance.getValue();

        } else if (instance instanceof window.NodesCanvas.SliderNode) {
            result.outputs[`${instance.id}_out`] = instance.value;

        } else if (instance instanceof window.NodesCanvas.ViewerNode) {
            const val = Object.values(inputs)[0];
            instance.setValue(val);

        } else if (instance instanceof window.NodesCanvas.DataHolderNode) {
            const val = Object.values(inputs)[0];
            instance.setValue(val);
            // Always expose the held value (even when frozen) so downstream nodes get it
            result.outputs[`${instance.id}_out`] = instance._heldValue;

        } else if (instance instanceof window.NodesCanvas.ExpressionNode) {
            // Transform expression like "x * 2" into "return { Result: (x * 2) };"
            const wrappedCode = `return { Result: (${instance.code}) };`;
            const fnResult = await this._runFunction(wrappedCode, inputs, instance);
            result.outputs = this._mapOutputs(instance, fnResult);

        } else if (instance instanceof window.NodesCanvas.ValueListNode) {
            // Dropdown node with dynamic input
            const listData = inputs['in_list'];
            instance.setRuntimeData(listData);
            result.outputs[`out_val`] = instance.value;

        } else {
            // Generic Function Node
            const fnResult = await this._runFunction(instance.code, inputs, instance);
            result.outputs = this._mapOutputs(instance, fnResult);
        }

        this._nodeData[instance.id] = result;
    },

    /**
     * Map the raw returned object keys (which could be labels like "Output_A")
     * into internal port IDs (like "out_1") so connections can read them.
     */
    _mapOutputs(instance, rawResult) {
        const raw = rawResult || {};
        const mapped = { ...raw };

        if (instance && instance.outputs) {
            instance.outputs.forEach(out => {
                const labelVar = (out.label || '').replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&') || 'Result';
                if (raw[out.id] !== undefined) {
                    mapped[out.id] = raw[out.id];
                } else if (raw[labelVar] !== undefined) {
                    mapped[out.id] = raw[labelVar];
                }
            });
        }
        return mapped;
    },

    /**
     * Safely run the user-defined Javascript code
     */
    async _runFunction(code, inputs, instance) {
        try {
            // Pre-process arguments dictionary for the `execute` function injection
            const executeArgs = {};
            if (instance && instance.inputs) {
                instance.inputs.forEach(inp => {
                    const labelVar = (inp.label || '').replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&') || 'param';
                    executeArgs[labelVar] = inputs[inp.id];
                    executeArgs[inp.id] = inputs[inp.id]; // fallback
                });
            } else {
                Object.assign(executeArgs, inputs);
            }

            const inputKeys = Object.keys(inputs);
            const inputVals = Object.values(inputs);

            const libContext = window.NodesCanvas.LibrariesManager ?
                window.NodesCanvas.LibrariesManager.getContextObject() : {};

            const contextKeys = Object.keys(libContext);
            const contextVals = Object.values(libContext);

            // Inject __nodeId so widgets can self-mount
            const nodeId = instance ? instance.id : null;

            // Inject ui as constructor object (class references)
            const uiCtx = {
                button: (label) => new window.NodesCanvas.NodeButton({ label, nodeId }),
                toggle: (label, defaultVal = false) => new window.NodesCanvas.NodeToggle({ label, nodeId, default: defaultVal })
            };

            const allKeys = [...inputKeys, ...contextKeys, '__executeArgs', '__nodeId', 'ui'];
            const allVals = [...inputVals, ...contextVals, executeArgs, nodeId, uiCtx];

            let wrappedCode = `${code}\n`;
            
            if (code.includes('function execute')) {
                wrappedCode += `\nif (typeof execute === 'function') return execute(__executeArgs);\n`;
            } else if (!code.trim().startsWith('return') && !code.trim().startsWith('async')) {
                wrappedCode = `return (async () => { ${code} })();`;
            }

            const fn = new Function(...allKeys, wrappedCode);
            let rawResult = fn(...allVals);

            if (rawResult instanceof Promise) {
                rawResult = await rawResult;
            }

            return rawResult;
        } catch (e) {
            console.warn('[GraphEngine] Function Execution Error:', e);
            return null;
        }
    },

    /**
     * Helper to parse string values to JS types
     */
    _parseValue(val) {
        if (typeof val !== 'string') return val;
        const trimmed = val.trim();
        if (trimmed === '') return '';
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        if (!isNaN(trimmed) && trimmed !== '') return parseFloat(trimmed);

        // Try JSON
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try { return JSON.parse(val); } catch (e) { }
        }

        return val;
    },

    /**
     * Start/Stop methods for legacy compatibility or UI lifecycle
     */
    startRunMode() {
        window.NodesCanvas.executionMode = 'run';
        this.execute();
    },

    stopRunMode() {
        window.NodesCanvas.executionMode = null;
    }
};

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
    execute() {
        if (window.NodesCanvas.executionMode !== 'run') return;

        console.time('[GraphEngine] Execution');
        this._buildGraph();
        this._nodeData = {}; // Clear previous values

        this._executionOrder.forEach(nodeId => {
            const instance = window.NodesCanvas.NodeRegistry.get(nodeId);
            if (!instance) return;

            try {
                this._executeNode(instance);
            } catch (err) {
                console.error(`[GraphEngine] Error executing node ${nodeId}:`, err);
            }
        });

        console.timeEnd('[GraphEngine] Execution');
    },

    /**
     * Run the logic for a single node instance
     */
    _executeNode(instance) {
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
            const val = Object.values(inputs)[0]; // Watch port value
            instance.setValue(val);

        } else if (instance instanceof window.NodesCanvas.ExpressionNode) {
            // Transform expression like "x * 2" into "return { Result: (x * 2) };"
            const wrappedCode = `return { Result: (${instance.code}) };`;
            const fnResult = this._runFunction(wrappedCode, inputs);
            result.outputs = fnResult || {};

        } else {
            // Generic Function Node
            const fnResult = this._runFunction(instance.code, inputs);
            result.outputs = fnResult || {};
        }

        this._nodeData[instance.id] = result;
    },

    /**
     * Safely run the user-defined Javascript code
     */
    _runFunction(code, inputs) {
        try {
            // Build the function wrapper
            const inputKeys = Object.keys(inputs);
            const inputVals = Object.values(inputs);

            // Expected return format: { portId: value, ... }
            // If the code doesn't start with "return", and doesn't look like a full function, we might want to wrap it
            // but for now, the registry nodes use "return { ... }" which is safe for new Function(...)
            const fn = new Function(...inputKeys, code);
            const rawResult = fn(...inputVals);
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

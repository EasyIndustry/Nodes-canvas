// NodeFactory.js - Centralized node instantiation logic

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.NodeFactory = {
    /**
     * Backward-compatible create method
     */
    create(template, x = 100, y = 100) {
        // If it's a template (has an 'n_' id or numeric ID), don't pass the ID 
        // so createNode generates a fresh one for the instance
        const config = { ...template };

        // Use string conversion for startsWith safety
        const idStr = String(config.id || '');
        if (idStr.startsWith('n_') || !isNaN(config.id)) {
            delete config.id;
        }
        return this.createNode({ ...config, x, y });
    },

    /** 
     * Create a node instance based on a template or config 
     */
    createNode(config) {
        // Ensure a unique ID
        const id = config.id || ('node_' + Date.now() + Math.floor(Math.random() * 1000));
        const finalConfig = { ...config, id };

        let instance;

        // Route to specific classes based on 'type' or existence of specific fields
        const type = config.type;
        const isType = (t) => type === t || config[`is${t.charAt(0).toUpperCase() + t.slice(1).replace('-', '')}`];

        if (isType('manual-data') || config.id === 'n_manual_data') {
            instance = new window.NodesCanvas.ManualDataNode(finalConfig);
        } else if (isType('call-data') || config.id === 'n_call_data') {
            instance = new window.NodesCanvas.CallDataNode(finalConfig);
        } else if (isType('slider') || config.id === 'n_slider') {
            instance = new window.NodesCanvas.SliderNode(finalConfig);
        } else if (isType('viewer') || config.id === 'n_viewer') {
            instance = new window.NodesCanvas.ViewerNode(finalConfig);
        } else if (isType('data-holder') || config.id === 'n_data_holder') {
            instance = new window.NodesCanvas.DataHolderNode(finalConfig);
        } else if (isType('expression') || config.id === 'n_expression') {
            instance = new window.NodesCanvas.ExpressionNode(finalConfig);
        } else if (isType('http-request') || config.id === 'n_http_request') {
            instance = new window.NodesCanvas.HttpRequestNode(finalConfig);
        } else if (isType('value-list') || config.id === 'n_value_list') {
            instance = new window.NodesCanvas.ValueListNode(finalConfig);
        } else {
            // Generic Functional Node
            instance = new window.NodesCanvas.Node(finalConfig);
        }

        return instance;
    },

    /**
     * Duplicate a node or set of nodes
     */
    duplicate(nodeIdsOrInstances) {
        const inputs = Array.isArray(nodeIdsOrInstances) ? nodeIdsOrInstances : [nodeIdsOrInstances];
        const newNodes = [];

        inputs.forEach(input => {
            let original;
            if (typeof input === 'string') {
                original = window.NodesCanvas.NodeRegistry.get(input);
            } else {
                original = input; // Assume it's the instance
            }

            if (!original) return;

            // Map instance back to type string
            let type = 'function';
            if (original instanceof window.NodesCanvas.ManualDataNode) type = 'manual-data';
            else if (original instanceof window.NodesCanvas.CallDataNode) type = 'call-data';
            else if (original instanceof window.NodesCanvas.SliderNode) type = 'slider';
            else if (original instanceof window.NodesCanvas.ViewerNode) type = 'viewer';
            else if (original instanceof window.NodesCanvas.DataHolderNode) type = 'data-holder';
            else if (original instanceof window.NodesCanvas.ExpressionNode) type = 'expression';
            else if (original instanceof window.NodesCanvas.HttpRequestNode) type = 'http-request';
            else if (original instanceof window.NodesCanvas.ValueListNode) type = 'value-list';

            // Deep clone the config
            const config = {
                type: type,
                title: original.title,
                description: original.description,
                icon: original.icon,
                x: original.x + 30,
                y: original.y + 30,
                inputs: window.NodesCanvas.Utils.clone(original.inputs || []),
                outputs: window.NodesCanvas.Utils.clone(original.outputs || []),
                code: original.code,
                settings: original.config ? window.NodesCanvas.Utils.clone(original.config) : undefined,
                value: original.value,
                arrayMode: original.arrayMode,
                isConstant: original.isConstant
            };

            const copy = this.createNode(config);
            newNodes.push(copy);
        });

        if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        return newNodes[0] || null; // Return first for single dupe compatibility
    }
};

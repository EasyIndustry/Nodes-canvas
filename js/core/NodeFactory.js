// NodeFactory.js - Centralizes node instantiation logic
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.NodeFactory = {
    create(nodeTemplate, x = 100, y = 100) {
        // Clone template to avoid side-effects
        const config = JSON.parse(JSON.stringify(nodeTemplate));

        // Ensure unique instance IDs that don't collide with template IDs
        const instanceId = (config.id || 'node') + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        config.id = instanceId;
        config.x = x;
        config.y = y;

        // Choose class based on metadata or ID
        if (nodeTemplate.id === 'n_manual_data' || nodeTemplate.isSpecial === 'manual-data') {
            return new window.NodesCanvas.ManualDataNode(config);
        } else if (nodeTemplate.id === 'n_viewer') { // Added ViewerNode
            return new window.NodesCanvas.ViewerNode(config);
        } else if (nodeTemplate.id === 'n_call_data' || nodeTemplate.isSpecial === 'call-data') {
            return new window.NodesCanvas.CallDataNode(config);
        } else if (nodeTemplate.id === 'n_slider' || nodeTemplate.isSlider) {
            return new window.NodesCanvas.SliderNode(config);
        } else if (config.isSpecial && config.className && window.NodesCanvas[config.className]) {
            return new window.NodesCanvas[config.className](config);
        } else {
            return new window.NodesCanvas.Node(config);
        }
    },

    /** Duplicate an existing instance */
    duplicate(instance, offsetX = 30, offsetY = 30) {
        // We can use the instance's own data to recreate it
        let config = {};

        if (instance instanceof window.NodesCanvas.ManualDataNode) {
            config = {
                id: 'n_manual_data', // Bridge to factory logic
                label: instance.label,
                value: instance.value,
                arrayMode: instance.arrayMode,
                isConstant: instance.isConstant
            };
        } else if (instance instanceof window.NodesCanvas.CallDataNode) {
            config = {
                id: 'n_call_data',
                label: instance.label,
                sourceId: instance.sourceId
            };
        } else if (instance instanceof window.NodesCanvas.SliderNode) {
            config = {
                id: 'n_slider',
                label: instance.label,
                min: instance.min,
                max: instance.max,
                step: instance.step,
                value: instance.value,
                rounding: instance.rounding,
                precision: instance.precision
            };
        } else if (instance instanceof window.NodesCanvas.ViewerNode) {
            config = {
                id: 'n_viewer',
                label: instance.label
            };
        } else {
            config = {
                title: instance.title,
                description: instance.description,
                icon: instance.icon,
                inputs: JSON.parse(JSON.stringify(instance.inputs)),
                outputs: JSON.parse(JSON.stringify(instance.outputs)),
                code: instance.code
            };
        }

        return this.create(config, instance.x + offsetX, instance.y + offsetY);
    }
};

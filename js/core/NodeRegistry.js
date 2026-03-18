// NodeRegistry.js - Unified registry for all node instances on the canvas
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.NodeRegistry = {
    _instances: {},

    /** Register a node instance */
    register(instance) {
        if (!instance || !instance.id) return;
        this._instances[instance.id] = instance;
        // console.log(`[NodeRegistry] Registered: ${instance.id}`);
    },

    /** Unregister a node instance */
    unregister(nodeId) {
        if (this._instances[nodeId]) {
            delete this._instances[nodeId];
            // console.log(`[NodeRegistry] Unregistered: ${nodeId}`);
        }
    },

    /** Get an instance by ID */
    get(nodeId) {
        return this._instances[nodeId];
    },

    /** Get all registered instances */
    getAll() {
        return Object.values(this._instances);
    },

    /** Find an instance by its DOM element */
    getByElement(el) {
        const nodeEl = el.closest('.node');
        return nodeEl ? this.get(nodeEl.id) : null;
    },

    /** Clear all references */
    clear() {
        this._instances = {};
    }
};

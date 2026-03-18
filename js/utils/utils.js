// utils.js - General utility functions for Nodes Canvas Studio
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Utils = {
    /** Debounce a function call */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /** Sanitize a string for use as a JS variable name */
    toVarName(str) {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-zA-Z0-9_$]/g, '_') // Replace non-alphanumeric
            .replace(/^(\d)/, '_$1')        // Cannot start with digit
            .toLowerCase();
    },

    /** Simple deep clone (JSON-based) */
    clone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('[Utils] Failed to clone object:', e);
            return obj;
        }
    }
};

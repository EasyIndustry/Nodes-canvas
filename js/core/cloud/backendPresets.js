// backendPresets.js - Registry of cloud backend presets.
//
// A preset is a factory that builds an ICloudBackend instance from a config.
// Add your own preset (e.g. Supabase, Firebase, or an internal company API)
// by calling NodesCanvas.Cloud.registerPreset('myKey', (cfg) => new MyBackend(cfg)).
//
// Selecting the active preset:
//   - localStorage key `nc_cloud_preset` (e.g. "xano" | "rest" | "custom-business")
//   - localStorage key `nc_cloud_config`  (JSON with the preset config)
// Falls back to the default "xano" preset to preserve legacy behavior.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Cloud = window.NodesCanvas.Cloud || {};

(function (NS) {
    const registry = new Map();

    NS.registerPreset = function (key, factory) {
        registry.set(key, factory);
    };

    NS.listPresets = function () {
        return Array.from(registry.keys());
    };

    NS.createBackend = function (key, config = {}) {
        const factory = registry.get(key);
        if (!factory) {
            console.warn(`[Cloud] Unknown preset "${key}", falling back to "xano"`);
            return registry.get('xano')(config);
        }
        return factory(config);
    };

    // --- Default presets ---
    NS.registerPreset('xano', (config) => new NS.XanoBackend(config));
    NS.registerPreset('rest', (config) => new NS.RestBackend(config));

    // Example preset ready to host a business-owned API.
    // Fill in baseUrl/endpoints or override via `nc_cloud_config`.
    NS.registerPreset('custom-business', (config) => new NS.RestBackend(Object.assign({
        name: 'custom-business',
        baseUrl: ''
    }, config)));
})(window.NodesCanvas.Cloud);

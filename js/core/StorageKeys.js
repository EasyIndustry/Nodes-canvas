// StorageKeys.js - Central registry of every localStorage key used by the app.
// Adding a new persistent flag? Declare it here so grep can find it in one place
// and so keys never drift across files.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.StorageKeys = {
    // --- Mode & active board ---
    STANDALONE_MODE:    'nc_standalone_mode',    // 'true' | 'false'
    ACTIVE_BOARD_NAME:  'nc_active_board_name',  // string
    BOARD_DATA:         'nc_board_data',         // JSON payload handed from dashboard to editor

    // --- Cloud backend ---
    CLOUD_PRESET:       'nc_cloud_preset',       // 'xano' | 'rest' | 'custom-business' | ...
    CLOUD_CONFIG:       'nc_cloud_config',       // JSON config for the active preset
    AUTH_TOKEN:         'nodes_canvas_token',    // bearer token

    // --- Preferences / libraries ---
    CDN_LIBS:           'nodes_canvas_cdn_libs', // JSON list of active CDN libs
    THEME:              'nodesCanvasTheme',      // 'dark' | 'light'

    // --- Dynamic keys (per-project board state) ---
    boardState(projectId) {
        return `nodes_canvas_${projectId}`;
    }
};

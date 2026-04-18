// CloudManager.js - Central cloud state + router to the active backend.
//
// Owns:
//   - The auth token (persisted in localStorage).
//   - The current user object.
//   - Observer list (onChange listeners).
//
// Delegates all network I/O to a swappable backend that implements ICloudBackend.
// The backend is chosen from `nc_cloud_preset` (default: "xano") and configured
// via `nc_cloud_config`. To change backends at runtime call `setBackend(key, cfg)`.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Cloud = window.NodesCanvas.Cloud || {};

const _SK = window.NodesCanvas.StorageKeys;

window.NodesCanvas.CloudManager = {
    _token: localStorage.getItem(_SK.AUTH_TOKEN),
    _user: null,
    _listeners: [],
    _backend: null,

    init() {
        // Skip cloud init entirely in standalone mode (no network, no token verification)
        if (localStorage.getItem(_SK.STANDALONE_MODE) === 'true') return;
        if (!this._backend) this._loadBackendFromStorage();
        if (this._token) this.fetchMe();
    },

    _loadBackendFromStorage() {
        const presetKey = localStorage.getItem(_SK.CLOUD_PRESET) || 'xano';
        let cfg = {};
        try {
            const raw = localStorage.getItem(_SK.CLOUD_CONFIG);
            if (raw) cfg = JSON.parse(raw);
        } catch (e) {
            console.warn('[Cloud] Invalid cloud config, ignoring:', e);
        }
        this._backend = window.NodesCanvas.Cloud.createBackend(presetKey, cfg);
    },

    setBackend(presetKey, config = {}) {
        this._backend = window.NodesCanvas.Cloud.createBackend(presetKey, config);
        localStorage.setItem(_SK.CLOUD_PRESET, presetKey);
        localStorage.setItem(_SK.CLOUD_CONFIG, JSON.stringify(config));
        this.logout();
    },

    getBackend() {
        if (!this._backend) this._loadBackendFromStorage();
        return this._backend;
    },

    getBackendName() {
        return this.getBackend().name;
    },

    // --- Observers ---
    onChange(callback) {
        this._listeners.push(callback);
    },

    _notify() {
        this._listeners.forEach(cb => cb(this._user));
        if (this._user && window.NodesCanvas.Registry) {
            window.NodesCanvas.Registry.loadFromCloud();
        }
    },

    // --- Auth ---
    async signup(name, email, password) {
        const result = await this.getBackend().signup(name, email, password);
        if (result.success && result.token) {
            this._saveToken(result.token);
            await this.fetchMe();
            return { success: true };
        }
        return { success: false, error: result.error || 'Signup failed' };
    },

    async login(email, password) {
        const result = await this.getBackend().login(email, password);
        if (result.success && result.token) {
            this._saveToken(result.token);
            await this.fetchMe();
            return { success: true };
        }
        return { success: false, error: result.error || 'Login failed' };
    },

    async fetchMe() {
        if (!this._token) return;
        try {
            const user = await this.getBackend().fetchMe(this._token);
            if (user) {
                this._user = user;
                this._notify();
            } else {
                this.logout();
            }
        } catch (e) {
            console.error('[Cloud] Fetch user failed:', e);
        }
    },

    logout() {
        this._token = null;
        this._user = null;
        localStorage.removeItem(_SK.AUTH_TOKEN);
        this._notify();
    },

    _saveToken(token) {
        this._token = token;
        localStorage.setItem(_SK.AUTH_TOKEN, token);
    },

    isLoggedIn() { return !!this._user; },
    getUser()    { return this._user; },
    getToken()   { return this._token; },
    getAuthHeader() { return this._token ? { 'Authorization': `Bearer ${this._token}` } : {}; },

    // --- Boards (routed to backend) ---
    getBoards()                      { return this.getBackend().getBoards(this._user, this._token); },
    getBoardDetails(id)              { return this.getBackend().getBoardDetails(id, this._token); },
    saveBoard(boardData)             { return this.getBackend().saveBoard(boardData, this._user, this._token); },
    deleteBoard(id)                  { return this.getBackend().deleteBoard(id, this._token); },

    // --- Custom features ---
    getCustomFeatures()              { return this.getBackend().getCustomFeatures(this._user, this._token); },
    saveCustomFeature(feature)       { return this.getBackend().saveCustomFeature(feature, this._user, this._token); },
    deleteCustomFeature(id)          { return this.getBackend().deleteCustomFeature(id, this._token); }
};

// Backwards-compat alias: existing code that references AuthManager keeps working.
window.NodesCanvas.AuthManager = window.NodesCanvas.CloudManager;

document.addEventListener('DOMContentLoaded', () => {
    window.NodesCanvas.CloudManager.init();
});

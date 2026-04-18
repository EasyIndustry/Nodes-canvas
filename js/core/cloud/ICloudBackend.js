// ICloudBackend.js - Contract that every cloud backend must implement.
// A backend handles the network I/O for auth, boards and custom features.
// Subclasses must implement every async method.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Cloud = window.NodesCanvas.Cloud || {};

window.NodesCanvas.Cloud.ICloudBackend = class {
    constructor(config = {}) {
        this.config = config;
        this.name = config.name || 'unnamed';
    }

    // Auth
    async signup(_name, _email, _password) { throw new Error('signup() not implemented'); }
    async login(_email, _password)         { throw new Error('login() not implemented'); }
    async fetchMe(_token)                  { throw new Error('fetchMe() not implemented'); }

    // Boards
    async getBoards(_user, _token)                  { throw new Error('getBoards() not implemented'); }
    async getBoardDetails(_boardId, _token)         { throw new Error('getBoardDetails() not implemented'); }
    async saveBoard(_boardData, _user, _token)      { throw new Error('saveBoard() not implemented'); }
    async deleteBoard(_boardId, _token)             { throw new Error('deleteBoard() not implemented'); }

    // Custom features (user-defined nodes/folders)
    async getCustomFeatures(_user, _token)          { throw new Error('getCustomFeatures() not implemented'); }
    async saveCustomFeature(_feature, _user, _token){ throw new Error('saveCustomFeature() not implemented'); }
    async deleteCustomFeature(_id, _token)          { throw new Error('deleteCustomFeature() not implemented'); }

    // --- Shared helpers available to all backends ---
    _authHeaders(token) {
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async _fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        let data = null;
        try { data = await response.json(); } catch (_) { /* empty body */ }
        return { ok: response.ok, status: response.status, data };
    }
};

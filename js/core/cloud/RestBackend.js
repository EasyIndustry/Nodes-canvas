// RestBackend.js - Generic REST backend for user-supplied APIs.
// Endpoints and payload field names are fully configurable so any REST API
// can be plugged in by declaring its routes. See backendPresets.js for shape.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Cloud = window.NodesCanvas.Cloud || {};

window.NodesCanvas.Cloud.RestBackend = class extends window.NodesCanvas.Cloud.ICloudBackend {
    constructor(config = {}) {
        super({
            name: config.name || 'rest',
            baseUrl: (config.baseUrl || '').replace(/\/$/, ''),
            tokenField: config.tokenField || 'authToken',
            endpoints: Object.assign({
                login:    '/auth/login',
                signup:   '/auth/signup',
                me:       '/auth/me',
                boardsList:      '/boards',           // GET
                boardGet:        '/boards/:id',       // GET
                boardCreate:     '/boards',           // POST
                boardUpdate:     '/boards/:id',       // PATCH
                boardDelete:     '/boards/:id',       // DELETE
                featuresList:    '/features',         // GET
                featureCreate:   '/features',         // POST
                featureUpdate:   '/features/:id',     // PATCH
                featureDelete:   '/features/:id'      // DELETE
            }, config.endpoints || {}),
            ...config
        });
    }

    _url(path, params = {}) {
        let resolved = path;
        Object.keys(params).forEach(k => {
            resolved = resolved.replace(':' + k, encodeURIComponent(params[k]));
        });
        return this.config.baseUrl + resolved;
    }

    _readToken(data) {
        return data && data[this.config.tokenField];
    }

    async signup(name, email, password) {
        try {
            const { data } = await this._fetchJson(this._url(this.config.endpoints.signup), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const token = this._readToken(data);
            if (token) return { success: true, token };
            return { success: false, error: (data && data.message) || 'Signup failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async login(email, password) {
        try {
            const { data } = await this._fetchJson(this._url(this.config.endpoints.login), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const token = this._readToken(data);
            if (token) return { success: true, token };
            return { success: false, error: (data && data.message) || 'Login failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async fetchMe(token) {
        if (!token) return null;
        const { ok, data } = await this._fetchJson(this._url(this.config.endpoints.me), {
            headers: this._authHeaders(token)
        });
        return ok ? data : null;
    }

    async getBoards(user, token) {
        if (!user) return [];
        try {
            const { data } = await this._fetchJson(this._url(this.config.endpoints.boardsList), {
                headers: this._authHeaders(token)
            });
            return Array.isArray(data) ? data : (data && data.items) || [];
        } catch (e) {
            console.error('[RestBackend] getBoards failed:', e);
            return [];
        }
    }

    async getBoardDetails(boardId, token) {
        try {
            const { data } = await this._fetchJson(
                this._url(this.config.endpoints.boardGet, { id: boardId }),
                { headers: this._authHeaders(token) }
            );
            return data;
        } catch (e) {
            console.error('[RestBackend] getBoardDetails failed:', e);
            return null;
        }
    }

    async saveBoard(boardData, user, token) {
        if (!user) return { success: false, error: 'User not logged in' };
        try {
            const isUpdate = !!boardData.id;
            const url = isUpdate
                ? this._url(this.config.endpoints.boardUpdate, { id: boardData.id })
                : this._url(this.config.endpoints.boardCreate);

            const payload = {
                title: boardData.title || 'Untitled Board',
                description: boardData.description || '',
                last_updated: Date.now(),
                settings: boardData.settings || {}
            };

            const { ok, data } = await this._fetchJson(url, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...this._authHeaders(token) },
                body: JSON.stringify(payload)
            });
            return { success: ok, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async deleteBoard(boardId, token) {
        try {
            const { ok } = await this._fetchJson(
                this._url(this.config.endpoints.boardDelete, { id: boardId }),
                { method: 'DELETE', headers: this._authHeaders(token) }
            );
            return { success: ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getCustomFeatures(user, token) {
        if (!user) return [];
        try {
            const { data } = await this._fetchJson(this._url(this.config.endpoints.featuresList), {
                headers: this._authHeaders(token)
            });
            return Array.isArray(data) ? data : (data && data.items) || [];
        } catch (e) {
            console.error('[RestBackend] getCustomFeatures failed:', e);
            return [];
        }
    }

    async saveCustomFeature(featureData, user, token) {
        if (!user) return { success: false, error: 'User not logged in' };
        try {
            const hasId = !!featureData.id && typeof featureData.id === 'number';
            const url = hasId
                ? this._url(this.config.endpoints.featureUpdate, { id: featureData.id })
                : this._url(this.config.endpoints.featureCreate);

            const { ok, data } = await this._fetchJson(url, {
                method: hasId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...this._authHeaders(token) },
                body: JSON.stringify(featureData)
            });
            return { success: ok, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async deleteCustomFeature(id, token) {
        try {
            const { ok } = await this._fetchJson(
                this._url(this.config.endpoints.featureDelete, { id }),
                { method: 'DELETE', headers: this._authHeaders(token) }
            );
            return { success: ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};

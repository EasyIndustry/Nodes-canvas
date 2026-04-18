// XanoBackend.js - Xano-specific implementation of ICloudBackend.
// Preserves the exact behavior of the original AuthManager.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Cloud = window.NodesCanvas.Cloud || {};

window.NodesCanvas.Cloud.XanoBackend = class extends window.NodesCanvas.Cloud.ICloudBackend {
    constructor(config = {}) {
        super({
            name: 'xano',
            baseUrl: config.baseUrl || 'https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P',
            ...config
        });
    }

    _url(path) {
        return this.config.baseUrl.replace(/\/$/, '') + path;
    }

    async signup(name, email, password) {
        try {
            const { ok, data } = await this._fetchJson(this._url('/auth/signup'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            if (data && data.authToken) return { success: true, token: data.authToken };
            return { success: false, error: (data && data.message) || 'Signup failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async login(email, password) {
        try {
            const { data } = await this._fetchJson(this._url('/auth/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (data && data.authToken) return { success: true, token: data.authToken };
            return { success: false, error: (data && data.message) || 'Login failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async fetchMe(token) {
        if (!token) return null;
        const { ok, data } = await this._fetchJson(this._url('/auth/me'), {
            headers: this._authHeaders(token)
        });
        return ok ? data : null;
    }

    async getBoards(user, token) {
        if (!user) return [];
        try {
            const { data } = await this._fetchJson(this._url(`/board_canvas_studio_user/${user.id}`), {
                headers: this._authHeaders(token)
            });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('[XanoBackend] getBoards failed:', e);
            return [];
        }
    }

    async getBoardDetails(boardId, token) {
        try {
            const { data } = await this._fetchJson(this._url(`/board_canvas_studio/${boardId}`), {
                headers: this._authHeaders(token)
            });
            return data;
        } catch (e) {
            console.error('[XanoBackend] getBoardDetails failed:', e);
            return null;
        }
    }

    async saveBoard(boardData, user, token) {
        if (!user) return { success: false, error: 'User not logged in' };
        try {
            const isUpdate = !!boardData.id;
            const url = isUpdate
                ? this._url(`/board_canvas_studio/${boardData.id}`)
                : this._url('/board_canvas_studio');

            const payload = {
                user_canvas_studio_id: user.id,
                title: boardData.title || 'Untitled Board',
                description: boardData.description || '',
                last_updated: Date.now(),
                settings: boardData.settings || {}
            };
            if (isUpdate) payload.board_canvas_studio_id = boardData.id;

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
            const { ok } = await this._fetchJson(this._url(`/board_canvas_studio/${boardId}`), {
                method: 'DELETE',
                headers: this._authHeaders(token)
            });
            return { success: ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getCustomFeatures(user, token) {
        if (!user) return [];
        try {
            const { data } = await this._fetchJson(this._url(`/custom_by_user_features/${user.id}`), {
                headers: this._authHeaders(token)
            });
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('[XanoBackend] getCustomFeatures failed:', e);
            return [];
        }
    }

    async saveCustomFeature(featureData, user, token) {
        if (!user) return { success: false, error: 'User not logged in' };
        try {
            const isUpdate = !!featureData.id && (typeof featureData.id === 'number' ||
                (!String(featureData.id).startsWith('f_') && !String(featureData.id).startsWith('n_')));

            const url = isUpdate
                ? this._url(`/custom_user_features/${featureData.id}`)
                : this._url('/custom_user_features');

            const rootFields = ['id', 'user_canvas_studio_id', 'name', 'description', 'type'];

            let type = featureData.type || 'Function';
            if (type.toLowerCase() === 'folder') type = 'Folder';
            else if (type.toLowerCase() === 'function') type = 'Function';
            else if (type.toLowerCase() === 'class') type = 'Class';

            const payload = {
                user_canvas_studio_id: user.id,
                name: featureData.title || featureData.name || 'Untitled',
                description: featureData.description || '',
                type,
                data: {}
            };

            Object.keys(featureData).forEach(key => {
                if ([...rootFields, 'title', 'name', 'editable', 'builtIn', 'user_id', 'folder_id', 'parent_id'].includes(key)) return;
                payload.data[key] = featureData[key];
            });

            const pid = featureData.parent_id || featureData.folder_id;
            if (pid) payload.data.parent_id = pid;

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

    async deleteCustomFeature(id, token) {
        try {
            const { ok } = await this._fetchJson(this._url(`/custom_user_features/${id}`), {
                method: 'DELETE',
                headers: this._authHeaders(token)
            });
            return { success: ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};

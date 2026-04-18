// AuthManager.js - Handles Xano Authentication
// API Base: https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P/

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.AuthManager = {
    _token: localStorage.getItem('nodes_canvas_token'),
    _user: null,
    _baseUrl: 'https://x8ki-letl-twmt.n7.xano.io/api:733Bs-6P',
    _listeners: [],

    init() {
        if (this._token) {
            this.fetchMe();
        }
    },

    onChange(callback) {
        this._listeners.push(callback);
    },

    _notify() {
        this._listeners.forEach(cb => cb(this._user));
        if (this._user && window.NodesCanvas.Registry) {
            window.NodesCanvas.Registry.loadFromXano();
        }
    },

    async signup(name, email, password) {
        try {
            const response = await fetch(`${this._baseUrl}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (data.authToken) {
                this._saveToken(data.authToken);
                await this.fetchMe();
                return { success: true };
            }
            return { success: false, error: data.message || 'Signup failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${this._baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (data.authToken) {
                this._saveToken(data.authToken);
                await this.fetchMe();
                return { success: true };
            }
            return { success: false, error: data.message || 'Login failed' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async fetchMe() {
        if (!this._token) return;
        try {
            const response = await fetch(`${this._baseUrl}/auth/me`, {
                headers: { 'Authorization': `Bearer ${this._token}` }
            });
            if (response.ok) {
                this._user = await response.json();
                this._notify();
            } else {
                this.logout();
            }
        } catch (e) {
            console.error('[Auth] Fetch user failed:', e);
        }
    },

    logout() {
        this._token = null;
        this._user = null;
        localStorage.removeItem('nodes_canvas_token');
        this._notify();
    },

    _saveToken(token) {
        this._token = token;
        localStorage.setItem('nodes_canvas_token', token);
    },

    isLoggedIn() {
        return !!this._user;
    },

    getUser() {
        return this._user;
    },

    getAuthHeader() {
        return this._token ? { 'Authorization': `Bearer ${this._token}` } : {};
    },

    // --- Board Persistence ---
    async getBoards() {
        if (!this._user) return [];
        try {
            const response = await fetch(`${this._baseUrl}/board_canvas_studio_user/${this._user.id}`, {
                headers: this.getAuthHeader()
            });
            return await response.json();
        } catch (e) {
            console.error('[Auth] Get boards failed:', e);
            return [];
        }
    },

    async saveBoard(boardData) {
        if (!this._user) return { success: false, error: 'User not logged in' };

        try {
            const isUpdate = !!boardData.id;
            const url = isUpdate
                ? `${this._baseUrl}/board_canvas_studio/${boardData.id}`
                : `${this._baseUrl}/board_canvas_studio`;

            const payload = {
                user_canvas_studio_id: this._user.id,
                title: boardData.title || 'Untitled Board',
                description: boardData.description || '',
                last_updated: Date.now(),
                settings: boardData.settings || {}
            };

            if (isUpdate) {
                payload.board_canvas_studio_id = boardData.id;
            }

            const response = await fetch(url, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeader()
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            return { success: response.ok, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async getBoardDetails(boardId) {
        try {
            const response = await fetch(`${this._baseUrl}/board_canvas_studio/${boardId}`, {
                headers: this.getAuthHeader()
            });
            return await response.json();
        } catch (e) {
            console.error('[Auth] Get board details failed:', e);
            return null;
        }
    },

    async deleteBoard(boardId) {
        if (!this._user) return { success: false, error: 'User not logged in' };
        try {
            const response = await fetch(`${this._baseUrl}/board_canvas_studio/${boardId}`, {
                method: 'DELETE',
                headers: this.getAuthHeader()
            });
            return { success: response.ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // --- Custom Features (Global User functions) ---
    async getCustomFeatures() {
        if (!this._user) return [];
        try {
            const response = await fetch(`${this._baseUrl}/custom_by_user_features/${this._user.id}`, {
                headers: this.getAuthHeader()
            });
            return await response.json();
        } catch (e) {
            console.error('[Auth] Get custom features failed:', e);
            return [];
        }
    },

    async saveCustomFeature(featureData) {
        if (!this._user) return { success: false, error: 'User not logged in' };
        try {
            const isUpdate = !!featureData.id && (typeof featureData.id === 'number' || (!String(featureData.id).startsWith('f_') && !String(featureData.id).startsWith('n_')));

            const url = isUpdate
                ? `${this._baseUrl}/custom_user_features/${featureData.id}`
                : `${this._baseUrl}/custom_user_features`;

            // Root fields in Xano table (columns)
            const rootFields = ['id', 'user_canvas_studio_id', 'name', 'description', 'type'];

            // Standardize Type to Title Case: Folder, Function, Class
            let type = featureData.type || 'Function';
            if (type.toLowerCase() === 'folder') type = 'Folder';
            else if (type.toLowerCase() === 'function') type = 'Function';
            else if (type.toLowerCase() === 'class') type = 'Class';

            const payload = {
                user_canvas_studio_id: this._user.id,
                name: featureData.title || featureData.name || 'Untitled',
                description: featureData.description || '',
                type: type,
                data: {}
            };

            // Everything else goes into 'data' JSON, including parent_id
            Object.keys(featureData).forEach(key => {
                // Skip root fields we already handled or internal flags
                if ([...rootFields, 'title', 'name', 'editable', 'builtIn', 'user_id', 'folder_id', 'parent_id'].includes(key)) {
                    return;
                }
                payload.data[key] = featureData[key];
            });

            // Specific mapping for parent reference
            const pid = featureData.parent_id || featureData.folder_id;
            if (pid) {
                payload.data.parent_id = pid;
            }

            const response = await fetch(url, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            return { success: response.ok, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async deleteCustomFeature(id) {
        if (!this._user) return { success: false, error: 'User not logged in' };
        try {
            const response = await fetch(`${this._baseUrl}/custom_user_features/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeader()
            });
            return { success: response.ok };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.NodesCanvas.AuthManager.init();
});

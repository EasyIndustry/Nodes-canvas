// WorkspaceManager.js — Local File System workspace for standalone mode
// Uses File System Access API (Chrome/Edge). Falls back to download/upload for others.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.WorkspaceManager = class {

    constructor() {
        this._dirHandle = null;
        this._ready = false;
        this._LS_KEY_RECENT = 'nc_recent_workspaces';
        this._LS_KEY_ACTIVE = 'nc_active_workspace_name';
        this._IDB_NAME = 'NodesCanvasWS';
        this._IDB_STORE = 'handles';
        this._IDB_KEY = 'dir';
    }

    get isReady() { return this._ready; }
    get isSupported() { return 'showDirectoryPicker' in window; }
    get workspaceName() { return this._dirHandle?.name || null; }

    // ─── Open / Create ────────────────────────────────────────────────────────

    async open() {
        if (!this.isSupported) {
            throw new Error('File System Access API not supported. Use Chrome or Edge.');
        }
        try {
            this._dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await this._initFolders();
            this._ready = true;
            this._addToRecent(this._dirHandle.name);
            localStorage.setItem(this._LS_KEY_ACTIVE, this._dirHandle.name);
            await this._persistHandle(this._dirHandle);  // <-- save to IDB
            return this._dirHandle.name;
        } catch (e) {
            if (e.name !== 'AbortError') throw e;
            return null;
        }
    }

    // Try to restore handle from IndexedDB (no picker needed if permission still valid)
    async tryRestore() {
        try {
            const handle = await this._loadHandle();
            if (!handle) return false;
            // Request permission silently (no prompt if still granted in same session)
            const perm = await handle.requestPermission({ mode: 'readwrite' });
            if (perm !== 'granted') return false;
            this._dirHandle = handle;
            await this._initFolders();
            this._ready = true;
            this._addToRecent(this._dirHandle.name);
            localStorage.setItem(this._LS_KEY_ACTIVE, this._dirHandle.name);
            return this._dirHandle.name;
        } catch {
            return false;
        }
    }

    // ─── IndexedDB handle persistence ────────────────────────────────────────

    _openIDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this._IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(this._IDB_STORE);
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => reject(req.error);
        });
    }

    async _persistHandle(handle) {
        try {
            const db = await this._openIDB();
            const tx = db.transaction(this._IDB_STORE, 'readwrite');
            tx.objectStore(this._IDB_STORE).put(handle, this._IDB_KEY);
            return new Promise((res) => { tx.oncomplete = res; });
        } catch { /* IDB not available */ }
    }

    async _loadHandle() {
        try {
            const db = await this._openIDB();
            return new Promise((resolve) => {
                const tx = db.transaction(this._IDB_STORE, 'readonly');
                const req = tx.objectStore(this._IDB_STORE).get(this._IDB_KEY);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            });
        } catch { return null; }
    }

    async clearPersistedHandle() {
        try {
            const db = await this._openIDB();
            const tx = db.transaction(this._IDB_STORE, 'readwrite');
            tx.objectStore(this._IDB_STORE).delete(this._IDB_KEY);
        } catch { }
    }

    async _initFolders() {
        const folders = ['boards', 'nodes', 'libs', 'exports'];
        for (const name of folders) {
            await this._dirHandle.getDirectoryHandle(name, { create: true });
        }
        // Init config if doesn't exist
        const hasConfig = await this._fileExists('config.json');
        if (!hasConfig) {
            await this.saveConfig({ theme: 'dark', version: '1.5', created: new Date().toISOString() });
        }
    }

    async deleteWorkspaceContents() {
        if (!this._dirHandle) return;
        try {
            const dirs = ['boards', 'nodes', 'libs', 'exports'];
            for (const d of dirs) {
                try { await this._dirHandle.removeEntry(d, { recursive: true }); } catch (e) {}
            }
            try { await this._dirHandle.removeEntry('config.json'); } catch (e) {}
            try { await this._dirHandle.removeEntry('registry.json'); } catch (e) {}

            // Remove from recent
            const recent = this.getRecent();
            const filtered = recent.filter(r => r.name !== this.workspaceName);
            localStorage.setItem(this._LS_KEY_RECENT, JSON.stringify(filtered));
            localStorage.removeItem(this._LS_KEY_ACTIVE);
            
            await this.clearPersistedHandle();
            
            this._dirHandle = null;
            this._ready = false;
        } catch (e) {
            console.error('[WorkspaceManager] Error deleting workspace contents:', e);
        }
    }

    // ─── File Helpers ─────────────────────────────────────────────────────────

    async _fileExists(path) {
        try {
            await this._dirHandle.getFileHandle(path);
            return true;
        } catch { return false; }
    }

    async _readFile(path, subDir = null) {
        try {
            const dir = subDir
                ? await this._dirHandle.getDirectoryHandle(subDir)
                : this._dirHandle;
            const fh = await dir.getFileHandle(path);
            const file = await fh.getFile();
            return await file.text();
        } catch (e) {
            return null;
        }
    }

    async _writeFile(path, content, subDir = null) {
        const dir = subDir
            ? await this._dirHandle.getDirectoryHandle(subDir, { create: true })
            : this._dirHandle;
        const fh = await dir.getFileHandle(path, { create: true });
        const writable = await fh.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async _deleteFile(path, subDir = null) {
        try {
            const dir = subDir
                ? await this._dirHandle.getDirectoryHandle(subDir)
                : this._dirHandle;
            await dir.removeEntry(path);
            return true;
        } catch { return false; }
    }

    async _listFiles(subDir, extension = null) {
        try {
            const dir = await this._dirHandle.getDirectoryHandle(subDir);
            const files = [];
            for await (const [name] of dir.entries()) {
                if (!extension || name.endsWith(extension)) {
                    files.push(name);
                }
            }
            return files.sort();
        } catch { return []; }
    }

    // ─── Boards ───────────────────────────────────────────────────────────────

    async listBoards() {
        const files = await this._listFiles('boards', '.ncboard.json');
        return files.map(f => ({
            filename: f,
            name: f.replace('.ncboard.json', '')
        }));
    }

    async loadBoard(name) {
        const raw = await this._readFile(`${name}.ncboard.json`, 'boards');
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch { return null; }
    }

    async saveBoard(name, data) {
        const json = JSON.stringify({ ...data, _savedAt: new Date().toISOString(), _workspace: this.workspaceName }, null, 2);
        await this._writeFile(`${name}.ncboard.json`, json, 'boards');
    }

    async deleteBoard(name) {
        return this._deleteFile(`${name}.ncboard.json`, 'boards');
    }

    async getBoardMeta(name) {
        const data = await this.loadBoard(name);
        if (!data) return null;
        return {
            name,
            nodes: data.nodes?.length || 0,
            savedAt: data._savedAt || null
        };
    }

    // ─── Custom Nodes ─────────────────────────────────────────────────────────

    async listCustomNodes() {
        return this._listFiles('nodes', '.js');
    }

    async loadCustomNode(filename) {
        return this._readFile(filename, 'nodes');
    }

    async saveCustomNode(filename, code) {
        await this._writeFile(filename, code, 'nodes');
    }

    // Load and inject all custom nodes into the page
    async loadAllCustomNodes() {
        const files = await this.listCustomNodes();
        const loaded = [];
        for (const file of files) {
            try {
                const code = await this.loadCustomNode(file);
                if (code) {
                    const fn = new Function(code);
                    fn();
                    loaded.push(file);
                }
            } catch (e) {
                console.warn(`[WorkspaceManager] Failed to load node ${file}:`, e);
            }
        }
        return loaded;
    }

    // ─── Registry (User Functions) ────────────────────────────────────────────

    async loadRegistry() {
        const raw = await this._readFile('registry.json');
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch { return null; }
    }

    async saveRegistry(data) {
        await this._writeFile('registry.json', JSON.stringify(data, null, 2));
    }

    // ─── Local Libraries ──────────────────────────────────────────────────────

    async listLibs() {
        return this._listFiles('libs', '.js');
    }

    async loadLib(filename) {
        return this._readFile(filename, 'libs');
    }

    async saveLib(filename, code) {
        await this._writeFile(filename, code, 'libs');
    }

    async deleteLib(filename) {
        return this._deleteFile(filename, 'libs');
    }

    async injectLib(filename) {
        const code = await this.loadLib(filename);
        if (!code) return false;
        
        const script = document.createElement('script');
        
        // Comprobar heurísticamente si es un módulo (tiene imports/exports al nivel superior)
        const isModule = /(?:^|[\r\n;])\s*(?:import\s+.*?\s+from\s+['"]|export\s+(?:const|let|var|function|class|default|\{))/.test(code);
        
        let finalCode = code;
        if (isModule) {
            script.type = 'module';
            // Reescribir importaciones desnudas (bare modules) a esm.sh para poder ejecutarlos nativamente sin bundler
            // Ej: import { X } from "three" -> from "https://esm.sh/three"
            finalCode = finalCode.replace(/(\bimport\s+[\s\S]*?from\s+['"])([^'".\/\\][^'"]+?)(['"])/g, '$1https://esm.sh/$2$3');
            finalCode = finalCode.replace(/(\bimport\s+['"])([^'".\/\\][^'"]+?)(['"])/g, '$1https://esm.sh/$2$3');
            finalCode = finalCode.replace(/(\bexport\s+[\s\S]*?from\s+['"])([^'".\/\\][^'"]+?)(['"])/g, '$1https://esm.sh/$2$3');
        }
        
        script.textContent = finalCode;
        document.head.appendChild(script);
        
        return true;
    }

    async injectAllLibs() {
        const files = await this.listLibs();
        for (const file of files) {
            await this.injectLib(file);
        }
        return files;
    }

    // ─── Config ───────────────────────────────────────────────────────────────

    async loadConfig() {
        const raw = await this._readFile('config.json');
        if (!raw) return {};
        try { return JSON.parse(raw); }
        catch { return {}; }
    }

    async saveConfig(data) {
        await this._writeFile('config.json', JSON.stringify(data, null, 2));
    }

    // ─── Recent Workspaces ────────────────────────────────────────────────────

    _addToRecent(name) {
        const recent = this.getRecent();
        const filtered = recent.filter(r => r.name !== name);
        filtered.unshift({ name, openedAt: new Date().toISOString() });
        localStorage.setItem(this._LS_KEY_RECENT, JSON.stringify(filtered.slice(0, 5)));
    }

    getRecent() {
        try {
            return JSON.parse(localStorage.getItem(this._LS_KEY_RECENT) || '[]');
        } catch { return []; }
    }

    getLastWorkspaceName() {
        return localStorage.getItem(this._LS_KEY_ACTIVE);
    }

    // ─── Fallback: Download/Upload (Firefox / Safari) ─────────────────────────

    downloadBoard(name, data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.ncboard.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    uploadBoard(onLoaded) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.ncboard.json,.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                const name = file.name.replace('.ncboard.json', '').replace('.json', '');
                onLoaded(name, data);
            } catch (err) {
                console.error('[WorkspaceManager] Invalid board file:', err);
            }
        };
        input.click();
    }

    // ─── Export to ZIP (future) ───────────────────────────────────────────────

    exportWorkspaceInfo() {
        return {
            name: this.workspaceName,
            supported: this.isSupported,
            ready: this._ready
        };
    }
};

// Singleton
window.NodesCanvas.workspaceManager = new window.NodesCanvas.WorkspaceManager();
console.log('[WorkspaceManager] Ready. File System API supported:', window.NodesCanvas.workspaceManager.isSupported);

// Registry.js - Manages the available node templates (functions) organized in folders

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Registry = {
    // Folder tree. Seeded from window.NodesCanvas.DefaultNodes (js/config/defaultNodes.js)
    // on DOMContentLoaded. A folder contains `nodes` and `subfolders`.
    folders: [],

    _listeners: [],

    onChange(callback) {
        this._listeners.push(callback);
    },

    _notify() {
        this._listeners.forEach(cb => cb(this.folders));
        if (window.NodesCanvas._markDirty) window.NodesCanvas._markDirty();
    },

    triggerUpdate() {
        this._notify();
    },

    // Add a new node template to a specific folder
    async addNodeTemplate(folderId, nodeTemplate) {
        const folder = this._findFolder(this.folders, folderId);
        if (folder) {
            if (!folder.nodes) folder.nodes = [];
            // Ensure editable is true for user-created nodes
            nodeTemplate.editable = true;
            nodeTemplate.parent_id = folderId; // Use parent_id for Xano
            nodeTemplate.type = nodeTemplate.type || 'Function'; // Title Case

            // Xano Sync
            const auth = window.NodesCanvas.AuthManager;
            if (auth && auth.isLoggedIn()) {
                const result = await auth.saveCustomFeature(nodeTemplate);
                if (result.success && result.data.id) {
                    nodeTemplate.id = result.data.id;
                }
            } else {
                // Generate temporary ID if not logged in
                if (!nodeTemplate.id) nodeTemplate.id = 'n_' + Date.now();
            }

            folder.nodes.push(nodeTemplate);
            this._notify();
            return nodeTemplate.id;
        }
        return null;
    },

    // Update an existing node template
    async updateNodeTemplate(nodeId, newConfig) {
        const node = this._findNode(this.folders, nodeId);
        if (node) {
            Object.assign(node, newConfig);

            // Ensure title is always in sync (name field used by Xano)
            if (newConfig.title) node.title = newConfig.title;

            // Xano Sync
            const auth = window.NodesCanvas.AuthManager;
            if (auth && auth.isLoggedIn() && (typeof nodeId === 'number' || !nodeId.startsWith('n_'))) {
                await auth.saveCustomFeature(node);
            }

            this._notify();
            return true;
        }
        return false;
    },

    // Recursive search for folder
    _findFolder(folders, id) {
        for (const f of folders) {
            if (f.id == id) return f;
            if (f.subfolders) {
                const found = this._findFolder(f.subfolders, id);
                if (found) return found;
            }
        }
        return null;
    },

    // Recursive search for node template
    _findNode(folders, id) {
        for (const f of folders) {
            if (f.nodes) {
                const found = f.nodes.find(n => n.id == id);
                if (found) return found;
            }
            if (f.subfolders) {
                const found = this._findNode(f.subfolders, id);
                if (found) return found;
            }
        }
        return null;
    },

    // --- Folder/Node Management ---

    async addFolder(name, parentId = null, category = 'Function') {
        const tempId = 'f_' + Date.now();
        const newFolder = { id: tempId, name, nodes: [], subfolders: [], editable: true, type: 'Folder', category };
        if (parentId) newFolder.parent_id = parentId;

        // Xano Sync
        const auth = window.NodesCanvas.AuthManager;
        if (auth && auth.isLoggedIn()) {
            const result = await auth.saveCustomFeature(newFolder);
            if (result.success && result.data.id) {
                newFolder.id = result.data.id;
            }
        }

        if (!parentId) {
            this.folders.push(newFolder);
        } else {
            const parent = this._findFolder(this.folders, parentId);
            if (parent) {
                if (!parent.subfolders) parent.subfolders = [];
                parent.subfolders.push(newFolder);
            }
        }
        this._notify();
        return newFolder.id;
    },

    async renameFolder(id, newName) {
        const folder = this._findFolder(this.folders, id);
        if (folder && folder.editable !== false) {
            folder.name = newName;
            folder.title = newName; // keep title in sync — saveCustomFeature prefers .title

            folder.type = 'Folder';

            // Xano Sync — String() cast guards against numeric IDs from Xano
            const auth = window.NodesCanvas.AuthManager;
            if (auth && auth.isLoggedIn() && (typeof id === 'number' || !String(id).startsWith('f_'))) {
                await auth.saveCustomFeature(folder);
            }

            this._notify();
            return true;
        }
        return false;
    },

    deleteFolder(id) {
        const result = this._deleteFromList(this.folders, id, 'folder');
        if (result) this._notify();
        return result;
    },

    deleteNodeTemplate(id) {
        const result = this._deleteFromList(this.folders, id, 'node');
        if (result) this._notify();
        return result;
    },

    _deleteFromList(list, id, type) {
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.id == id) {
                if (item.editable === false) return false;
                list.splice(i, 1);
                return true;
            }
            if (type === 'folder' && item.subfolders) {
                if (this._deleteFromList(item.subfolders, id, 'folder')) return true;
            }
            if (type === 'node' && item.nodes) {
                const nIdx = item.nodes.findIndex(n => n.id === id);
                if (nIdx > -1) {
                    if (item.nodes[nIdx].editable === false) return false;
                    item.nodes.splice(nIdx, 1);
                    return true;
                }
            }
            if (item.subfolders && this._deleteFromList(item.subfolders, id, 'node')) return true;
        }
        return false;
    },

    async loadFromCloud() {
        const auth = window.NodesCanvas.CloudManager || window.NodesCanvas.AuthManager;
        if (!auth || !auth.isLoggedIn()) return;

        console.log(`[Registry] Loading custom features from cloud (${auth.getBackendName ? auth.getBackendName() : 'default'})...`);
        const features = await auth.getCustomFeatures();
        if (!Array.isArray(features)) return;

        // Seed built-ins first, then drop any editable (user) folders before re-adding them
        this.syncBuiltInFolders();
        this.folders = this.folders.filter(f => f.editable === false);

        // 2. Map Xano features to Registry structure
        const foldersMap = {};
        const orphanNodes = [];

        features.forEach(f => {
            const item = {
                id: f.id,
                name: f.name,
                title: f.name,   // sidebar uses .title to display node names
                editable: true,
                type: f.type, // "Folder", "Function", "Class"
                ...f.data // This contains 'icon', 'code', 'inputs', 'outputs', etc.
            };

            // Map data.parent_id back to item.parent_id if it exists
            if (f.data && f.data.parent_id) {
                item.parent_id = f.data.parent_id;
            }

            if (f.type === 'Folder') {
                item.nodes = [];
                item.subfolders = [];
                foldersMap[f.id] = item;
            } else {
                orphanNodes.push(item);
            }
        });

        // 3. Assemble tree
        Object.values(foldersMap).forEach(folder => {
            if (folder.parent_id && foldersMap[folder.parent_id]) {
                foldersMap[folder.parent_id].subfolders.push(folder);
            } else {
                this.folders.push(folder);
            }
        });

        orphanNodes.forEach(node => {
            if (node.parent_id && foldersMap[node.parent_id]) {
                foldersMap[node.parent_id].nodes.push(node);
            } else {
                // If no folder, put in a default "User Functions" folder or root
                let userFolder = this._findFolder(this.folders, 'f_user');
                if (!userFolder) {
                    userFolder = { id: 'f_user', name: 'User Functions', editable: false, nodes: [], subfolders: [] };
                    this.folders.push(userFolder);
                }
                userFolder.nodes.push(node);
            }
        });

        console.log(`[Registry] Loaded ${features.length} features from Xano`);
        this._notify();
    },

    /** Ensure built-in folders + nodes from DefaultNodes config are present. */
    syncBuiltInFolders() {
        const defaults = window.NodesCanvas.DefaultNodes || [];
        defaults.forEach((defFolder, cfgIdx) => {
            let folder = this._findFolder(this.folders, defFolder.id);
            if (!folder) {
                folder = { id: defFolder.id, name: defFolder.name, editable: false, nodes: [], subfolders: [] };
                // Insert at the config-defined index when possible, else append
                if (cfgIdx < this.folders.length) this.folders.splice(cfgIdx, 0, folder);
                else this.folders.push(folder);
            }
            if (!folder.nodes) folder.nodes = [];
            (defFolder.nodes || []).forEach(nodeTpl => {
                if (!folder.nodes.some(n => n.id === nodeTpl.id)) {
                    folder.nodes.push({ ...nodeTpl, editable: false });
                }
            });
        });
        this._notify();
    },

    // ─── Local File System (Standalone) Storage ───────────────────────────────

    async saveLocal() {
        const wm = window.NodesCanvas.workspaceManager;
        if (!wm) return false;

        const cleanConfig = window.NodesCanvas.Utils.clone(this.folders);
        const clean = (folder) => {
            if (folder.nodes) {
                folder.nodes = folder.nodes.filter(n => n.editable !== false);
            }
            if (folder.subfolders) folder.subfolders.forEach(clean);
        };
        cleanConfig.forEach(clean);
        
        await wm.saveRegistry(cleanConfig);
        return true;
    },

    async loadFromLocal() {
        const wm = window.NodesCanvas.workspaceManager;
        if (!wm) return;

        let retries = 10;
        while (!wm.isReady && retries > 0) {
            await new Promise(r => setTimeout(r, 100));
            retries--;
        }

        const data = await wm.loadRegistry();
        if (data && Array.isArray(data)) {
            this.folders = data;
            console.log(`[Registry] Loaded local registry from workspace`);
        }
        
        this.syncBuiltInFolders();
    }
};





// Seed built-ins synchronously at module load so UI consumers rendering early
// (e.g. Sidebar on DOMContentLoaded) see a populated tree even before any async
// loadFromLocal/loadFromCloud completes.
window.NodesCanvas.Registry.syncBuiltInFolders();

// Auto-load logic depending on mode
document.addEventListener("DOMContentLoaded", () => {
    const SK = window.NodesCanvas.StorageKeys;
    if (localStorage.getItem(SK.STANDALONE_MODE) === 'true') {
        window.NodesCanvas.Registry.loadFromLocal();
    } else {
        const cloud = window.NodesCanvas.CloudManager || window.NodesCanvas.AuthManager;
        if (cloud && cloud.isLoggedIn()) {
            window.NodesCanvas.Registry.loadFromCloud();
        }
        // else: already seeded above
    }
});

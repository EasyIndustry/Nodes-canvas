// Registry.js - Manages the available node templates (functions) organized in folders

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Registry = {
    // A folder can contain 'nodes' and 'subfolders'
    folders: [
        {
            id: 'f_data',
            name: 'Data',
            editable: false,
            nodes: [
                {
                    id: 'n_manual_data',
                    type: 'manual-data',
                    title: 'Manual Data',
                    isSpecial: true,
                    icon: 'database',
                    editable: false
                },
                {
                    id: 'n_call_data',
                    type: 'call-data',
                    title: 'Call Data',
                    isSpecial: true,
                    icon: 'external-link',
                    editable: false
                },
                {
                    id: 'n_slider',
                    type: 'slider',
                    title: 'Number Slider',
                    isSlider: true,
                    icon: 'sliders-horizontal',
                    editable: false
                },
                {
                    id: 'n_viewer',
                    type: 'viewer',
                    title: 'Viewer',
                    icon: 'eye',
                    isSpecial: true,
                    editable: false
                }
            ],
            subfolders: []
        },
        {
            id: 'f_math',
            name: 'Math',
            editable: false,
            nodes: [
                {
                    id: 'n_add',
                    title: 'Add',
                    builtIn: true,
                    icon: 'plus',
                    code: 'return { Result: Number(A) + Number(B) };',
                    inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                    outputs: [{ id: 'Result', label: 'Result' }],
                    editable: false
                },
                {
                    id: 'n_mult',
                    title: 'Multiply',
                    builtIn: true,
                    icon: 'x',
                    code: 'return { Result: Number(A) * Number(B) };',
                    inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                    outputs: [{ id: 'Result', label: 'Result' }],
                    editable: false
                }
            ],
            subfolders: []
        },
        {
            id: 'f_logic',
            name: 'Logic',
            editable: false,
            nodes: [
                {
                    id: 'n_and',
                    title: 'And',
                    builtIn: true,
                    icon: 'check-square',
                    code: 'return { Result: Boolean(A && B) };',
                    inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                    outputs: [{ id: 'Result', label: 'Result' }],
                    editable: false
                }
            ],
            subfolders: []
        },
        {
            id: 'f_utils',
            name: 'Utilities',
            editable: false,
            nodes: [
                {
                    id: 'n_expression',
                    type: 'expression',
                    title: 'Expression',
                    icon: 'variable',
                    code: 'x * 2',
                    inputs: [{ id: 'x', label: 'x' }],
                    outputs: [{ id: 'Result', label: 'Result' }],
                    editable: true
                }
            ],
            subfolders: []
        }
    ],

    _listeners: [],

    onChange(callback) {
        this._listeners.push(callback);
    },

    _notify() {
        this._listeners.forEach(cb => cb(this.folders));
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

    async addFolder(name, parentId = null) {
        const tempId = 'f_' + Date.now();
        const newFolder = { id: tempId, name, nodes: [], subfolders: [], editable: true, type: 'Folder' };
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
            folder.type = 'Folder';

            // Xano Sync
            const auth = window.NodesCanvas.AuthManager;
            if (auth && auth.isLoggedIn() && (typeof id === 'number' || !id.startsWith('f_'))) {
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

    async loadFromXano() {
        const auth = window.NodesCanvas.AuthManager;
        if (!auth || !auth.isLoggedIn()) return;

        console.log('[Registry] Loading custom features from Xano...');
        const features = await auth.getCustomFeatures();
        if (!Array.isArray(features)) return;

        // 1. Filter out built-in folders by keeping only those with f_ prefix (wait, built-ins have f_ prefix)
        // Better: Keep folders where editable is false, remove others that are numeric (Xano)
        this.folders = this.folders.filter(f => f.editable === false);

        // 2. Map Xano features to Registry structure
        const foldersMap = {};
        const orphanNodes = [];

        features.forEach(f => {
            const item = {
                id: f.id,
                name: f.name,
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

    /** Ensure built-in folders contain all required nodes after loading from state */
    syncBuiltInFolders() {
        // 1. Ensure Data Folder
        let dataFolder = this._findFolder(this.folders, 'f_data');
        if (!dataFolder) {
            dataFolder = { id: 'f_data', name: 'Data', editable: false, nodes: [], subfolders: [] };
            this.folders.unshift(dataFolder);
        }

        const ensureNode = (folder, nodeTemplate) => {
            if (!folder.nodes.some(n => n.id === nodeTemplate.id)) {
                folder.nodes.push({ ...nodeTemplate, editable: false });
            }
        };

        ensureNode(dataFolder, { id: 'n_manual_data', title: 'Manual Data', icon: 'database', isSpecial: true });
        ensureNode(dataFolder, { id: 'n_call_data', title: 'Call Data', icon: 'external-link', isSpecial: true });
        ensureNode(dataFolder, { id: 'n_slider', title: 'Number Slider', icon: 'sliders-horizontal', isSlider: true });
        ensureNode(dataFolder, { id: 'n_viewer', title: 'Viewer', icon: 'eye', isSpecial: true });

        // 2. Ensure Math Folder
        let mathFolder = this._findFolder(this.folders, 'f_math');
        if (!mathFolder) {
            mathFolder = { id: 'f_math', name: 'Math', editable: false, nodes: [], subfolders: [] };
            this.folders.splice(this.folders.indexOf(dataFolder) + 1, 0, mathFolder);
        }
        ensureNode(mathFolder, {
            id: 'n_add', title: 'Add', icon: 'plus', builtIn: true, inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }], outputs: [{ id: 'Result', label: 'Result' }],
            code: 'return { Result: Number(A) + Number(B) };'
        });
        ensureNode(mathFolder, {
            id: 'n_mult', title: 'Multiply', icon: 'x', builtIn: true, inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }], outputs: [{ id: 'Result', label: 'Result' }],
            code: 'return { Result: Number(A) * Number(B) };'
        });

        // 3. Ensure Logic Folder
        let logicFolder = this._findFolder(this.folders, 'f_logic');
        if (!logicFolder) {
            logicFolder = { id: 'f_logic', name: 'Logic', editable: false, nodes: [], subfolders: [] };
            this.folders.splice(this.folders.indexOf(mathFolder) + 1, 0, logicFolder);
        }
        ensureNode(logicFolder, {
            id: 'n_and', title: 'And', icon: 'check-square', builtIn: true, inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }], outputs: [{ id: 'Result', label: 'Result' }],
            code: 'return { Result: Boolean(A && B) };'
        });

        // 4. Ensure Utilities Folder
        let utilsFolder = this._findFolder(this.folders, 'f_utils');
        if (!utilsFolder) {
            utilsFolder = { id: 'f_utils', name: 'Utilities', editable: false, nodes: [], subfolders: [] };
            this.folders.push(utilsFolder);
        }
        ensureNode(utilsFolder, {
            id: 'n_expression', title: 'Expression', icon: 'variable', type: 'expression', inputs: [{ id: 'x', label: 'x' }], outputs: [{ id: 'Result', label: 'Result' }],
            code: 'x * 2'
        });

        this._notify();
    }
};

// Auto-load from Xano if already logged in (handles refresh/timing)
if (window.NodesCanvas.AuthManager && window.NodesCanvas.AuthManager.isLoggedIn()) {
    window.NodesCanvas.Registry.loadFromXano();
}

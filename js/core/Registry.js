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
                    title: 'Manual Data',
                    isSpecial: true, // Handled by ManualDataNode class
                    icon: 'database',
                    editable: false
                },
                {
                    id: 'n_call_data',
                    title: 'Call Data',
                    isSpecial: true, // Handled by CallDataNode class
                    icon: 'external-link',
                    editable: false
                },
                {
                    id: 'n_slider',
                    title: 'Number Slider',
                    isSlider: true, // Handled by SliderNode class
                    icon: 'sliders-horizontal',
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
                    code: '/**\n * @param {Object} inputs — { A: any, B: any }\n * @returns {Object} — { Result: any }\n */\nfunction execute({ A, B }) {\n    return { Result: Number(A) + Number(B) };\n}',
                    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
                    outputs: [{ id: 'out', label: 'Result' }],
                    editable: false
                },
                {
                    id: 'n_mult',
                    title: 'Multiply',
                    builtIn: true,
                    icon: 'x',
                    code: '/**\n * @param {Object} inputs — { A: any, B: any }\n * @returns {Object} — { Result: any }\n */\nfunction execute({ A, B }) {\n    return { Result: Number(A) * Number(B) };\n}',
                    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
                    outputs: [{ id: 'out', label: 'Result' }],
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
                    code: '/**\n * @param {Object} inputs — { A: any, B: any }\n * @returns {Object} — { Result: any }\n */\nfunction execute({ A, B }) {\n    return { Result: Boolean(A && B) };\n}',
                    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
                    outputs: [{ id: 'out', label: 'Result' }],
                    editable: false
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
    addNodeTemplate(folderId, nodeTemplate) {
        const folder = this._findFolder(this.folders, folderId);
        if (folder) {
            if (!folder.nodes) folder.nodes = [];
            // Ensure editable is true for user-created nodes
            nodeTemplate.editable = true;
            folder.nodes.push(nodeTemplate);
            this._notify();
            return true;
        }
        return false;
    },

    // Update an existing node template
    updateNodeTemplate(nodeId, newConfig) {
        const node = this._findNode(this.folders, nodeId);
        if (node) {
            Object.assign(node, newConfig);
            this._notify();
            return true;
        }
        return false;
    },

    // Recursive search for folder
    _findFolder(folders, id) {
        for (const f of folders) {
            if (f.id === id) return f;
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
                const found = f.nodes.find(n => n.id === id);
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

    addFolder(name, parentId = null) {
        const id = 'f_' + Date.now();
        const newFolder = { id, name, nodes: [], subfolders: [], editable: true };

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
        return id;
    },

    renameFolder(id, newName) {
        const folder = this._findFolder(this.folders, id);
        if (folder && folder.editable !== false) {
            folder.name = newName;
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
            if (item.id === id) {
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

    /** Ensure built-in folders contain all required nodes after loading from state */
    syncBuiltInFolders() {
        const dataFolder = this._findFolder(this.folders, 'f_data');
        if (dataFolder) {
            const hasSlider = dataFolder.nodes.some(n => n.id === 'n_slider');
            if (!hasSlider) {
                dataFolder.nodes.push({
                    id: 'n_slider',
                    title: 'Number Slider',
                    isSlider: true,
                    icon: 'sliders-horizontal',
                    editable: false
                });
            }
        }
        this._notify();
    }
};

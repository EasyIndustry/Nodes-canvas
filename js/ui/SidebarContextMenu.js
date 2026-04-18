// SidebarContextMenu.js - Right-click menu for Sidebar folders/nodes
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.SidebarContextMenu = class {
    constructor() {
        this.element = null;
        this.target = null; // { type: 'folder'|'node', id, data, isEditable }

        // Hide on click anywhere
        document.addEventListener("click", () => this.hide());
        document.addEventListener("mousedown", (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.hide();
            }
        });
    }

    show(e, target) {
        e.preventDefault();
        this.hide();

        if (!target.isEditable) return;

        this.target = target;
        this.element = document.createElement("div");
        this.element.className = "context-menu";
        this.element.style.left = `${e.clientX}px`;
        this.element.style.top = `${e.clientY}px`;

        const isFolder = target.type === 'folder';

        this.element.innerHTML = `
            <div class="context-menu-item" data-action="delete" style="color: #ff4757; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                Delete ${isFolder ? 'Folder' : 'Function'}
            </div>
        `;

        document.body.appendChild(this.element);
        if (window.lucide) window.lucide.createIcons();

        this.element.querySelector('.context-menu-item').addEventListener('click', () => {
            this.handleDelete();
        });
    }

    hide() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.target = null;
    }

    handleDelete() {
        if (!this.target) return;

        const { type, id, data } = this.target;
        const popup = window.NodesCanvas.popupManager;
        const registry = window.NodesCanvas.Registry;
        const auth = window.NodesCanvas.AuthManager;

        if (type === 'folder') {
            const hasContent = (data.nodes && data.nodes.length > 0) || (data.subfolders && data.subfolders.length > 0);
            const message = hasContent
                ? `Are you sure you want to delete "${data.name}"? All functions and subfolders inside will be PERMANENTLY deleted.`
                : `Are you sure you want to delete the empty folder "${data.name}"?`;

            popup.showConfirm("Delete Folder", message, async () => {
                // For now, folders are local only, but we should also delete nodes inside from Xano if they exist
                // Recursive deletion of nodes from Xano
                const deleteNodesRecursively = async (folder) => {
                    if (folder.nodes) {
                        for (const node of folder.nodes) {
                        if (node.id && !String(node.id).startsWith('n_')) {
                                await auth.deleteCustomFeature(node.id);
                            }
                        }
                    }
                    if (folder.subfolders) {
                        for (const sub of folder.subfolders) {
                            await deleteNodesRecursively(sub);
                        }
                    }
                };

                await deleteNodesRecursively(data);
                // Also delete the folder itself from Xano if it has a real (numeric) ID
                if (id && !String(id).startsWith('f_')) {
                    await auth.deleteCustomFeature(id);
                }
                registry.deleteFolder(id);
            }, "Delete All");

        } else if (type === 'node') {
            const message = `Are you sure you want to delete the function "${data.title}"? This action cannot be undone.`;

            popup.showConfirm("Delete Function", message, async () => {
                // If it's a cloud node (has a real ID from Xano), delete it there
                // Usually custom nodes have IDs that are not 'n_...' or we can check a property
                if (data.id && (typeof data.id === 'number' || !data.id.startsWith('n_'))) {
                    await auth.deleteCustomFeature(data.id);
                }
                registry.deleteNodeTemplate(id);
            }, "Delete");
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.NodesCanvas.sidebarContextMenu = new window.NodesCanvas.SidebarContextMenu();
});

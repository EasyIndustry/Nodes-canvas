// ContextMenu.js - Manages right click context menus

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ContextMenu = class {
    constructor() {
        this.element = null;
        this.targetContext = null; // What did we right click on?

        this.initEvents();
    }

    initEvents() {
        const container = document.getElementById("canvas-container");

        container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.showMenu(e);
        });

        // Hide menu on normal click anywhere
        document.addEventListener("click", (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.hideMenu();
            }
        });

        // Hide menu on pan/drag
        document.addEventListener("mousedown", (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.hideMenu();
            }
        });
    }

    showMenu(e) {
        this.hideMenu();

        // Determine context
        let contextType = 'canvas';
        let contextId = null;

        const nodeEl = e.target.closest('.node');
        const pathEl = e.target.closest('.connection-path');

        if (nodeEl) {
            contextType = 'node';
            contextId = nodeEl.id;
        } else if (pathEl && !pathEl.classList.contains('temp-path')) {
            contextType = 'connection';
            contextId = pathEl.id;
        }

        this.targetContext = { type: contextType, id: contextId, x: e.clientX, y: e.clientY };

        // Build DOM
        this.element = document.createElement("div");
        this.element.className = "context-menu";

        // Position it explicitly via style so it skips canvas transforms
        this.element.style.left = `${e.clientX}px`;
        this.element.style.top = `${e.clientY}px`;

        let itemsHTML = '';

        if (contextType === 'node') {
            // Check if it's a Panel Node — add Array Mode toggle
            const clickedEl = document.getElementById(contextId);
            const isPanel = clickedEl && clickedEl.classList.contains('panel-node');
            const isSlider = clickedEl && clickedEl.classList.contains('slider-node');

            if (isPanel) {
                itemsHTML = `
                    <div class="context-menu-item" data-action="toggleArrayMode">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                            <rect x="3" y="3" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="17" width="18" height="4" rx="1"/>
                        </svg>
                        Toggle Array Mode
                    </div>
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" data-action="deleteNode" style="color:#ff4757;">Delete Panel</div>
                `;
            } else if (isSlider) {
                itemsHTML = `
                    <div class="context-menu-item" data-action="editSlider">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </div>
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" data-action="deleteNode" style="color:#ff4757;">Delete Slider</div>
                `;
            } else {
                itemsHTML = `<div class="context-menu-item" data-action="deleteNode">Delete Node</div>`;
            }
        } else if (contextType === 'connection') {
            itemsHTML = `<div class="context-menu-item" data-action="deleteConnection">Disconnect</div>`;
        }

        this.element.innerHTML = itemsHTML;

        // If clicking on canvas, we drop down the Add Node nested menu
        if (contextType === 'canvas') {
            const addNodeContainer = document.createElement("div");
            addNodeContainer.className = "context-menu-item dropdown-item";
            addNodeContainer.style.display = "flex";
            addNodeContainer.style.justifyContent = "space-between";
            addNodeContainer.style.alignItems = "center";
            addNodeContainer.innerHTML = `
                <span>Add Node</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 12px;"><path d="M9 18l6-6-6-6"/></svg>
            `;

            const submenu = document.createElement('div');
            submenu.className = 'dropdown-submenu';

            // Build the folder tree
            this.buildFolderLevel(window.NodesCanvas.Registry.folders, submenu, e.clientX, e.clientY);

            addNodeContainer.appendChild(submenu);
            this.element.appendChild(addNodeContainer);
        }

        document.body.appendChild(this.element);

        // Events
        const items = this.element.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                this.handleAction(item.dataset.action);
            });
        });
    }

    hideMenu() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.targetContext = null;
    }

    handleAction(action) {
        switch (action) {
            case 'toggleArrayMode': {
                // Find the PanelNode instance by its DOM id
                const nodeEl = document.getElementById(this.targetContext.id);
                if (nodeEl) {
                    // Look through all panel instances (tracked on window)
                    const panelId = this.targetContext.id;
                    const instances = window.NodesCanvas._panelInstances || {};
                    const panel = instances[panelId];
                    if (panel) {
                        panel.arrayMode = !panel.arrayMode;
                        panel.render();
                    }
                }
                break;
            }
            case 'editSlider': {
                const sliderId = this.targetContext.id;
                const inst = window.NodesCanvas._nodeInstances[sliderId];
                if (inst && inst.openSettings) {
                    inst.openSettings();
                }
                break;
            }
            case 'deleteNode':
                this.deleteNode(this.targetContext.id);
                break;
            case 'deleteConnection':
                this.deleteConnection(this.targetContext.id);
                break;
        }
        this.hideMenu();
    }

    buildFolderLevel(folders, parentElement, mouseX, mouseY) {
        folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'dropdown-item';

            folderItem.innerHTML = `
                <span style="display:flex; align-items:center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="margin-right:6px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> 
                    ${folder.name}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            `;

            const submenu = document.createElement('div');
            submenu.className = 'dropdown-submenu';

            const createNodeOption = document.createElement('div');
            createNodeOption.className = 'dropdown-item';
            createNodeOption.innerHTML = `<em>+ Create Function here</em>`;
            createNodeOption.style.color = "var(--accent-color)";
            createNodeOption.addEventListener("click", (e) => {
                e.stopPropagation();
                if (window.NodesCanvas.popupManager) {
                    window.NodesCanvas.popupManager.showNodeForm(null, folder.id, (config, targetFolderId) => {
                        window.NodesCanvas.Registry.addNodeTemplate(targetFolderId, config);
                        this.hideMenu();
                    });
                }
            });
            submenu.appendChild(createNodeOption);

            const divider = document.createElement('div');
            divider.className = 'dropdown-divider';
            submenu.appendChild(divider);

            if (folder.subfolders && folder.subfolders.length > 0) {
                this.buildFolderLevel(folder.subfolders, submenu, mouseX, mouseY);
            }

            if (folder.nodes) {
                folder.nodes.forEach(nodeTemplate => {
                    const nodeOption = document.createElement('div');
                    nodeOption.className = 'dropdown-item';
                    nodeOption.innerText = nodeTemplate.title;

                    nodeOption.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.addNodeAtCursor(nodeTemplate, mouseX, mouseY);
                        this.hideMenu();
                    });

                    submenu.appendChild(nodeOption);
                });
            }

            folderItem.appendChild(submenu);
            parentElement.appendChild(folderItem);
        });
    }

    addNodeAtCursor(nodeTemplate, clientX, clientY) {
        const canvasTransform = window.NodesCanvas.canvas.transform;

        // Inverse transform to place exactly where mouse was
        const x = (clientX - canvasTransform.x) / canvasTransform.scale;
        const y = (clientY - canvasTransform.y) / canvasTransform.scale;

        const config = JSON.parse(JSON.stringify(nodeTemplate));
        config.x = x - 100;
        config.y = y - 50;

        window.NodesCanvas.NodeFactory.create(nodeTemplate, x - 100, y - 50);
    }

    deleteNode(nodeId) {
        // Ensure the node is selected so deleteSelectedNodes picks it up
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            if (!nodeEl.classList.contains('selected')) {
                // If not selected, deselect others and select this one
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
                nodeEl.classList.add('selected');
            }

            if (window.NodesCanvas.deleteSelectedNodes) {
                window.NodesCanvas.deleteSelectedNodes();
            }
        }
    }

    deleteConnection(connId) {
        if (window.NodesCanvas.ConnectionManager) {
            window.NodesCanvas.ConnectionManager.removeConnectionById(connId);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.NodesCanvas.contextMenu = new window.NodesCanvas.ContextMenu();
});

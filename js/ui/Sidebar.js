// Sidebar.js - Manages the Left Sidebar TreeView and Registry interaction

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Sidebar = class {
    constructor() {
        this.element = document.getElementById("left-sidebar");
        this.btnToggle = document.getElementById("btn-toggle-sidebar");
        this.btnAddFolder = document.getElementById("btn-add-folder");
        this.treeContainer = document.getElementById("treeview-container");

        this.initEvents();
        this.renderTree(window.NodesCanvas.Registry.folders);

        // Listen to updates from Registry
        window.NodesCanvas.Registry.onChange((folders) => {
            this.renderTree(folders);
        });
    }

    initEvents() {
        this.btnToggle.addEventListener("click", () => {
            this.element.classList.toggle("closed");
        });

        this.btnAddFolder.addEventListener("click", () => {
            const id = window.NodesCanvas.Registry.addFolder("New Folder");
            // Wait for re-render, then trigger edit mode
            setTimeout(() => {
                const newFolderEl = document.querySelector(`.tree-folder[data-id="${id}"] .edit-folder-btn`);
                if (newFolderEl) newFolderEl.click();
            }, 50);
        });
    }

    renderTree(folders) {
        this.treeContainer.innerHTML = '';
        this.renderFolderLevel(folders, this.treeContainer);
        // Create icons only ONCE after the whole tree is in the DOM
        if (window.lucide) window.lucide.createIcons();
    }


    renderFolderLevel(folders, parentContainer) {
        folders.forEach(folder => {
            const folderEl = document.createElement('div');
            folderEl.className = 'tree-folder';

            folderEl.dataset.id = folder.id;

            // Render Header
            const headerEl = document.createElement('div');
            headerEl.className = 'tree-folder-header';
            headerEl.innerHTML = `
                <span class="folder-icon">
                    <i data-lucide="folder" style="width:16px; height:16px;"></i>
                </span>
                <span class="folder-name-label" style="flex-grow: 1;">${folder.name}</span>
                ${folder.editable !== false ? `
                    <button class="edit-folder-btn" title="Rename Folder" style="background: none; border: none; color: inherit; cursor: pointer; opacity: 0.5;">
                        <i data-lucide="edit-2" style="width:12px; height:12px;"></i>
                    </button>
                    <button class="add-subfolder-btn" title="Add Subfolder" style="background: none; border: none; color: inherit; cursor: pointer; opacity: 0.5;">
                        <i data-lucide="plus" style="width:12px; height:12px;"></i>
                    </button>
                ` : ''}
            `;

            const labelSpan = headerEl.querySelector('.folder-name-label');
            const editBtn = headerEl.querySelector('.edit-folder-btn');
            const addSubBtn = headerEl.querySelector('.add-subfolder-btn');

            // Toggle open/close logic
            headerEl.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.tagName.toLowerCase() === 'input') return;
                folderEl.classList.toggle('open');
            });

            // Edit Folder Name
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentName = folder.name;
                    labelSpan.innerHTML = `<input type="text" class="inline-edit-input" value="${currentName}" style="width:100px; background:transparent; border:none; border-bottom:1px solid var(--accent-color); color:inherit; outline:none; font-family:inherit; font-size:inherit;">`;
                    const input = labelSpan.querySelector('input');
                    input.focus();
                    input.select();

                    const saveEdit = () => {
                        const newName = input.value.trim();
                        if (newName && newName !== currentName) {
                            window.NodesCanvas.Registry.renameFolder(folder.id, newName);
                        } else {
                            labelSpan.innerText = currentName; // revert
                        }
                    };

                    input.addEventListener('blur', saveEdit);
                    input.addEventListener('keydown', (ke) => {
                        if (ke.key === 'Enter') saveEdit();
                        if (ke.key === 'Escape') {
                            labelSpan.innerText = currentName;
                        }
                    });
                });
            }

            // Add Subfolder logic
            if (addSubBtn) {
                addSubBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newId = window.NodesCanvas.Registry.addFolder("New Folder", folder.id);
                    folderEl.classList.add('open');
                    setTimeout(() => {
                        const newFolderEl = document.querySelector(`.tree-folder[data-id="${newId}"] .edit-folder-btn`);
                        if (newFolderEl) newFolderEl.click();
                    }, 50);
                });
            }

            // Render Content (Nodes and Subfolders)
            const contentEl = document.createElement('div');
            contentEl.className = 'tree-folder-content';

            // 1. Recursive Subfolders
            if (folder.subfolders && folder.subfolders.length > 0) {
                this.renderFolderLevel(folder.subfolders, contentEl);
            }

            // 2. Render Nodes
            if (folder.nodes) {
                folder.nodes.forEach(nodeTemplate => {
                    const nodeItemEls = document.createElement('div');
                    nodeItemEls.className = 'tree-node-item';
                    nodeItemEls.innerHTML = `
                        ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg(nodeTemplate.icon || 'box', 12) : ''}
                        <span style="flex-grow: 1;">${nodeTemplate.title}</span>
                        ${nodeTemplate.editable !== false ? `
                            <button class="edit-node-btn" title="Edit Node Template" style="background: none; border: none; color: inherit; cursor: pointer; opacity: 0.5;">
                                <i data-lucide="edit-2" style="width:12px; height:12px;"></i>
                            </button>
                        ` : ''}
                    `;

                    // Add node to the center of canvas on click
                    nodeItemEls.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // If edit button was clicked, open Form editor
                        if (e.target.closest('.edit-node-btn')) {
                            if (window.NodesCanvas.popupManager) {
                                window.NodesCanvas.popupManager.showNodeForm(nodeTemplate, folder.id, (editedConfig) => {
                                    window.NodesCanvas.Registry.updateNodeTemplate(nodeTemplate.id, editedConfig);
                                });
                            }
                            return;
                        }
                        this.addNodeToCanvas(nodeTemplate);
                    });

                    contentEl.appendChild(nodeItemEls);
                });
            }

            // 3. "Create function here" button
            if (folder.editable !== false) {
                const addNodeBtn = document.createElement('div');
                addNodeBtn.className = 'tree-node-item';
                addNodeBtn.style.color = 'var(--accent-color)';
                addNodeBtn.style.fontStyle = 'italic';
                addNodeBtn.innerHTML = `<em>+ Create Function</em>`;
                addNodeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.NodesCanvas.popupManager) {
                        window.NodesCanvas.popupManager.showNodeForm(null, folder.id, (config, targetFolderId) => {
                            window.NodesCanvas.Registry.addNodeTemplate(targetFolderId, config);
                            folderEl.classList.add('open');
                        });
                    }
                });
                contentEl.appendChild(addNodeBtn);
            }

            folderEl.appendChild(headerEl);
            folderEl.appendChild(contentEl);

            parentContainer.appendChild(folderEl);
        });
    }

    addNodeToCanvas(nodeTemplate) {
        const canvasTransform = window.NodesCanvas.canvas.transform;

        // Add to the center of the viewport, adjusted by pan/zoom
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;

        const x = (viewportCenterX - canvasTransform.x) / canvasTransform.scale;
        const y = (viewportCenterY - canvasTransform.y) / canvasTransform.scale;

        window.NodesCanvas.NodeFactory.create(nodeTemplate, x - 100, y - 50);
    }

};

document.addEventListener("DOMContentLoaded", () => {
    window.NodesCanvas.sidebar = new window.NodesCanvas.Sidebar();
});

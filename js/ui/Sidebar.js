// Sidebar.js - Manages the Left Sidebar TreeView and Registry interaction

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Sidebar = class {
    constructor() {
        this.element = document.getElementById("left-sidebar");
        this.btnToggle = document.getElementById("btn-toggle-sidebar");
        this.treeContainer = document.getElementById("treeview-container");
        this.searchInput = document.getElementById("sidebar-search");

        this.initEvents();
        this.renderTree(window.NodesCanvas.Registry.folders);

        // Listen to updates from Registry
        window.NodesCanvas.Registry.onChange((folders) => {
            this.renderTree(folders);
        });

        // Listen to Auth changes for the title
        if (window.NodesCanvas.AuthManager) {
            window.NodesCanvas.AuthManager.onChange((user) => {
                this.setUserName(user ? user.name : null);
                this.renderProfileSection(user);
            });
            this.renderProfileSection(window.NodesCanvas.AuthManager.getUser());
        }
    }

    renderProfileSection(user) {
        // Remove existing if any
        const existing = this.element.querySelector('.sidebar-settings-container');
        if (existing) existing.remove();

        if (!user) return;

        // Settings / Profile Section at bottom
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'sidebar-settings-container';

        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        settingsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="user-avatar-initials">${initials}</div>
                <div class="user-details">
                    <span class="user-name">${user.name}</span>
                    <span class="user-email">${user.email}</span>
                </div>
            </div>
            <button class="sidebar-settings-btn" title="Settings">
                <i data-lucide="settings" style="width:16px; height:16px;"></i>
            </button>
        `;

        settingsContainer.querySelector('.sidebar-settings-btn').addEventListener('click', () => {
            // Open global settings dropdown
            const btn = document.getElementById('btn-settings');
            if (btn) btn.click();
        });

        this.element.appendChild(settingsContainer);
        if (window.lucide) window.lucide.createIcons();
    }

    setUserName(name) {
        const titleEl = document.getElementById("sidebar-library-title");
        if (titleEl) {
            if (name) {
                const firstName = name.split(' ')[0];
                titleEl.textContent = `${firstName}'s Library`;
            } else {
                titleEl.textContent = "Library";
            }
        }
    }

    initEvents() {
        this.btnToggle.addEventListener("click", () => {
            this.element.classList.toggle("closed");
        });

        if (this.searchInput) {
            this.searchInput.addEventListener("input", (e) => {
                this.filterTree(e.target.value.toLowerCase());
            });
        }
    }

    setUserName(name) {
        const titleEl = document.getElementById("sidebar-library-title");
        if (titleEl) {
            if (name) {
                const firstName = name.split(' ')[0];
                titleEl.textContent = `${firstName}'s Library`;
            } else {
                titleEl.textContent = "Library";
            }
        }
    }

    renderTree(folders) {
        this.treeContainer.innerHTML = '';

        // 1. Separate Built-in (Functions) from User folders
        const builtInFolders = folders.filter(f => f.editable === false);
        const userFolders = folders.filter(f => f.editable !== false);

        // 2. Create Sections
        this.renderSection("Default Functions", builtInFolders);
        this.renderSection("User Funct", userFolders, true); // hasAdd = true
        this.renderSection("Classes", [], true); // hasAdd = true

        // Create icons only ONCE after the whole tree is in the DOM
        if (window.lucide) window.lucide.createIcons();

        // If there's a search active, re-apply it
        if (this.searchInput && this.searchInput.value) {
            this.filterTree(this.searchInput.value.toLowerCase());
        }
    }

    renderSection(title, folders, hasAdd = false) {
        const section = document.createElement('div');
        section.className = 'sidebar-section';
        // By default, open if it has content
        if (folders.length === 0 && title !== "Default Functions") {
            section.classList.add('closed');
        }

        const header = document.createElement('div');
        header.className = 'sidebar-section-header';

        header.innerHTML = `
            <span>${title}</span>
            <div>
                ${hasAdd ? `
                    <span class="add-folder-section-btn" title="Add Folder">
                        <i data-lucide="plus-square" style="width:14px; height:14px;"></i>
                    </span>
                ` : ''}
                <span class="sidebar-section-chevron">
                    <i data-lucide="chevron-right" style="width:12px; height:12px;"></i>
                </span>
            </div>
        `;

        header.addEventListener('click', (e) => {
            if (e.target.closest('.add-folder-section-btn')) {
                e.stopPropagation();
                this.handleSectionAddFolder(title);
                return;
            }
            section.classList.toggle('closed');
        });

        const content = document.createElement('div');
        content.className = 'sidebar-section-content';

        if (folders.length > 0) {
            this.renderFolderLevel(folders, content);
        } else {
            const empty = document.createElement('div');
            empty.className = 'empty-section-placeholder';
            empty.style.padding = '8px 12px';
            empty.style.fontSize = '11px';
            empty.style.opacity = '0.4';
            empty.style.fontStyle = 'italic';
            empty.textContent = `No ${title.toLowerCase()} yet`;
            content.appendChild(empty);
        }

        section.appendChild(header);
        section.appendChild(content);
        this.treeContainer.appendChild(section);
    }

    handleSectionAddFolder(sectionTitle) {
        // Logic to add folder to the correct section
        const id = window.NodesCanvas.Registry.addFolder("New Folder");

        // Open the section if it was closed
        const sections = Array.from(this.treeContainer.querySelectorAll('.sidebar-section'));
        const targetSection = sections.find(s => s.querySelector('.sidebar-section-header span').textContent.includes(sectionTitle));
        if (targetSection) targetSection.classList.remove('closed');

        // Wait for re-render (which happens due to Registry event)
        // then trigger edit mode on the new folder
        setTimeout(() => {
            const newFolderEl = document.querySelector(`.tree-folder[data-id="${id}"] .edit-folder-btn`);
            if (newFolderEl) newFolderEl.click();
        }, 50);
    }

    filterTree(term) {
        const sections = this.treeContainer.querySelectorAll('.sidebar-section');

        if (!term) {
            // Reset visibility
            this.treeContainer.querySelectorAll('.tree-folder, .tree-node-item, .sidebar-section, .empty-section-placeholder').forEach(el => {
                el.style.display = '';
            });
            return;
        }

        sections.forEach(section => {
            let sectionVisible = false;
            const nodes = section.querySelectorAll('.tree-node-item');
            const folders = section.querySelectorAll('.tree-folder');
            const placeholder = section.querySelector('.empty-section-placeholder');

            if (placeholder) placeholder.style.display = 'none';

            nodes.forEach(node => {
                const text = node.textContent.toLowerCase();
                const isMatch = text.includes(term);
                node.style.display = isMatch ? 'flex' : 'none';
                if (isMatch) {
                    sectionVisible = true;
                    // Ensure parents are open
                    let parent = node.closest('.tree-folder');
                    while (parent) {
                        parent.style.display = 'block';
                        parent.classList.add('open');
                        parent = parent.parentElement.closest('.tree-folder');
                    }
                }
            });

            folders.forEach(folder => {
                const folderName = folder.querySelector('.folder-name-label').textContent.toLowerCase();
                if (folderName.includes(term)) {
                    folder.style.display = 'block';
                    sectionVisible = true;
                } else {
                    const hasVisibleChild = Array.from(folder.querySelectorAll('.tree-node-item')).some(n => n.style.display !== 'none');
                    folder.style.display = hasVisibleChild ? 'block' : 'none';
                }
            });

            section.style.display = sectionVisible ? 'block' : 'none';
            if (sectionVisible) section.classList.remove('closed');
        });
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

            // Right-click for Context Menu (Only if editable)
            headerEl.addEventListener('contextmenu', (e) => {
                if (folder.editable !== false && window.NodesCanvas.sidebarContextMenu) {
                    window.NodesCanvas.sidebarContextMenu.show(e, {
                        type: 'folder',
                        id: folder.id,
                        data: folder,
                        isEditable: true
                    });
                }
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

                    // Right-click for Context Menu (Only if editable)
                    nodeItemEls.addEventListener('contextmenu', (e) => {
                        if (nodeTemplate.editable !== false && window.NodesCanvas.sidebarContextMenu) {
                            window.NodesCanvas.sidebarContextMenu.show(e, {
                                type: 'node',
                                id: nodeTemplate.id,
                                data: nodeTemplate,
                                isEditable: true
                            });
                        }
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

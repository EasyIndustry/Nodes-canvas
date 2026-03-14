// BottomMenu.js - Manages the actions of the floating toolbar

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.BottomMenu = class {
    constructor() {
        this.element = document.getElementById("bottom-menu");
        this.buttons = document.querySelectorAll(".menu-btn");

        this.initEvents();
        this.nodeCounter = 1;
    }

    initEvents() {
        const btnSelect = document.getElementById("btn-select");
        const btnAddNode = document.getElementById("btn-add-node");

        btnSelect.addEventListener("click", () => {
            this.setActive(btnSelect);
            // logic for select tool
        });

        btnAddNode.addEventListener("click", (e) => {
            e.stopPropagation();
            this.setActive(btnAddNode);
            this.toggleAddNodeDropdown();
        });

        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== btnAddNode) {
                this.dropdown.classList.remove("visible");
                this.setActive(btnSelect); // Revert to select tool
            }
        });



        const btnRun = document.getElementById("btn-run");
        const btnDebug = document.getElementById("btn-debug");

        if (btnRun) {
            btnRun.addEventListener("click", () => {
                const isActive = btnRun.classList.contains("active");
                btnRun.classList.toggle("active", !isActive);
                if (btnDebug) btnDebug.classList.remove("active");
                window.NodesCanvas.executionMode = isActive ? null : 'run';

                if (!isActive) {
                    // Stop debug if active
                    window.NodesCanvas.GraphEngine.stopDebugMode();
                    window.NodesCanvas.GraphEngine.startRunMode();
                } else {
                    window.NodesCanvas.GraphEngine.stopRunMode();
                }
            });
        }

        if (btnDebug) {
            btnDebug.addEventListener("click", () => {
                const isActive = btnDebug.classList.contains("active");
                btnDebug.classList.toggle("active", !isActive);
                if (btnRun) btnRun.classList.remove("active");
                window.NodesCanvas.executionMode = isActive ? null : 'debug';

                if (!isActive) {
                    window.NodesCanvas.GraphEngine.stopRunMode();
                    window.NodesCanvas.GraphEngine.startDebugMode();
                } else {
                    window.NodesCanvas.GraphEngine.stopDebugMode();
                    document.getElementById('debug-toolbar')?.remove();
                }
            });
        }

        // Listen to Registry changes
        if (window.NodesCanvas.Registry) {
            window.NodesCanvas.Registry.onChange((folders) => {
                if (this.dropdown) this.buildDropdown(folders);
            });
        }
    }

    setActive(activeBtn) {
        this.buttons.forEach(btn => btn.classList.remove("active"));
        activeBtn.classList.add("active");
    }

    toggleAddNodeDropdown() {
        if (!this.dropdown) {
            this.createDropdown();
            this.buildDropdown(window.NodesCanvas.Registry.folders);
        }

        if (this.dropdown.classList.contains("visible")) {
            this.dropdown.classList.remove("visible");
            this.setActive(document.getElementById("btn-select"));
        } else {
            this.dropdown.classList.add("visible");
        }
    }

    createDropdown() {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'bottom-dropdown';

        // Append relative to the bottom menu container to pop upwards
        this.element.appendChild(this.dropdown);
    }

    buildDropdown(folders) {
        this.dropdown.innerHTML = '';
        this.buildFolderLevel(folders, this.dropdown);
    }

    buildFolderLevel(folders, parentElement) {
        folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'dropdown-item';

            // Caret to indicate submenu
            folderItem.innerHTML = `
                <span>📁 ${folder.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            `;

            // Submenu
            const submenu = document.createElement('div');
            submenu.className = 'dropdown-submenu';

            // Option to create node in this folder
            const createNodeOption = document.createElement('div');
            createNodeOption.className = 'dropdown-item';
            createNodeOption.innerHTML = `<em>+ Create Function here</em>`;
            createNodeOption.style.color = "var(--accent-color)";
            createNodeOption.addEventListener("click", (e) => {
                e.stopPropagation();
                if (window.NodesCanvas.popupManager) {
                    window.NodesCanvas.popupManager.showNodeForm(null, folder.id, (config, targetFolderId) => {
                        window.NodesCanvas.Registry.addNodeTemplate(targetFolderId, config);
                        this.dropdown.classList.remove('visible');
                        this.setActive(document.getElementById("btn-select"));
                    });
                }
            });

            submenu.appendChild(createNodeOption);

            const divider = document.createElement('div');
            divider.className = 'dropdown-divider';
            submenu.appendChild(divider);

            // 1. Recursive Subfolders
            if (folder.subfolders && folder.subfolders.length > 0) {
                this.buildFolderLevel(folder.subfolders, submenu);
            }

            // 2. List of actual nodes
            if (folder.nodes) {
                folder.nodes.forEach(nodeTemplate => {
                    const nodeOption = document.createElement('div');
                    nodeOption.className = 'dropdown-item';
                    nodeOption.innerText = nodeTemplate.title;

                    nodeOption.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.addNodeToCanvas(nodeTemplate);

                        // Close dropdowns
                        document.querySelectorAll('.bottom-dropdown.visible').forEach(d => d.classList.remove('visible'));
                        this.setActive(document.getElementById("btn-select"));
                    });

                    submenu.appendChild(nodeOption);
                });
            }

            folderItem.appendChild(submenu);
            parentElement.appendChild(folderItem);
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
}

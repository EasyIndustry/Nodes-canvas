// BottomMenu.js - Manages the actions of the floating toolbar

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.BottomMenu = class {
    constructor() {
        this.element = document.getElementById("bottom-menu");
        this.buttons = document.querySelectorAll(".menu-btn");

        // Ensure engine starts OFF and UI matches
        window.NodesCanvas.executionMode = null;
        const btnRun = document.getElementById("btn-run");
        if (btnRun) btnRun.classList.remove("active");

        this.initEvents();
        this.nodeCounter = 1;
    }

    initEvents() {
        const btnSelect = document.getElementById("btn-select");
        const btnAddNode = document.getElementById("btn-add-node");
        const btnRun = document.getElementById("btn-run");

        btnSelect.addEventListener("click", () => {
            this.setActive(btnSelect);
        });

        btnAddNode.addEventListener("click", (e) => {
            e.stopPropagation();
            this.setActive(btnAddNode);
            this.toggleAddNodeDropdown();
        });

        if (btnRun) {
            btnRun.addEventListener("click", () => {
                const isActive = btnRun.classList.contains("active");
                // Toggle state
                const nextState = !isActive;

                btnRun.classList.toggle("active", nextState);
                window.NodesCanvas.executionMode = nextState ? 'run' : null;

                if (nextState) {
                    window.NodesCanvas.GraphEngine.startRunMode();
                } else {
                    window.NodesCanvas.GraphEngine.stopRunMode();
                }

                console.log(`[BottomMenu] Execution mode: ${window.NodesCanvas.executionMode}`);
            });
        }

        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== btnAddNode) {
                this.dropdown.classList.remove("visible");
                this.setActive(btnSelect);
            }
        });

        // Listen to Registry changes for dropdown sync
        if (window.NodesCanvas.Registry) {
            window.NodesCanvas.Registry.onChange((folders) => {
                if (this.dropdown) this.buildDropdown(folders);
            });
        }
    }

    setActive(activeBtn) {
        this.buttons.forEach(btn => {
            // Don't remove 'active' from btn-run, it's a toggle independent of tool selection
            if (btn.id !== 'btn-run') {
                btn.classList.remove("active");
            }
        });
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
            folderItem.innerHTML = `
                <span>📁 ${folder.name}</span>
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
                        this.dropdown.classList.remove('visible');
                        this.setActive(document.getElementById("btn-select"));
                    });
                }
            });
            submenu.appendChild(createNodeOption);

            const divider = document.createElement('div');
            divider.className = 'dropdown-divider';
            submenu.appendChild(divider);

            if (folder.subfolders && folder.subfolders.length > 0) {
                this.buildFolderLevel(folder.subfolders, submenu);
            }

            if (folder.nodes) {
                folder.nodes.forEach(nodeTemplate => {
                    const nodeOption = document.createElement('div');
                    nodeOption.className = 'dropdown-item';
                    nodeOption.innerText = nodeTemplate.title;
                    nodeOption.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.addNodeToCanvas(nodeTemplate);
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
        const x = (window.innerWidth / 2 - canvasTransform.x) / canvasTransform.scale;
        const y = (window.innerHeight / 2 - canvasTransform.y) / canvasTransform.scale;
        window.NodesCanvas.NodeFactory.create(nodeTemplate, x - 100, y - 50);
    }
};

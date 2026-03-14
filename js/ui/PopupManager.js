// PopupManager.js - Handles Search and Form Modals

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.PopupManager = class {
    constructor() {
        this.createOverlay();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'popup-overlay';

        // Close on background click
        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        document.body.appendChild(this.overlay);
    }

    close() {
        this.overlay.classList.remove('active');
        this.overlay.innerHTML = '';
    }

    // --- Search Modal ---
    showSearch(x, y, onSelect) {
        this.overlay.innerHTML = '';
        this.overlay.style.alignItems = 'flex-start';
        this.overlay.style.justifyContent = 'flex-start';

        const popup = document.createElement('div');
        popup.className = 'search-popup glass-modal';

        // Prevent going off-screen
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const left = Math.min(x, viewW - 300 - 20);
        const top = Math.min(y, viewH - 400 - 20);

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        // Input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-input';
        input.placeholder = 'Search functions...';

        // Results Container
        const resultsEl = document.createElement('div');
        resultsEl.className = 'search-results';

        popup.appendChild(input);
        popup.appendChild(resultsEl);
        this.overlay.appendChild(popup);

        this.overlay.classList.add('active');
        input.focus();

        const renderResults = (query) => {
            resultsEl.innerHTML = '';

            // Flatten all nodes from registry with folder paths
            const allNodes = [];
            const traverse = (folders, path) => {
                folders.forEach(f => {
                    const currentPath = path ? `${path} / ${f.name}` : f.name;
                    if (f.nodes) {
                        f.nodes.forEach(n => {
                            if (!query || n.title.toLowerCase().includes(query.toLowerCase()) || currentPath.toLowerCase().includes(query.toLowerCase())) {
                                allNodes.push({ node: n, folderName: currentPath });
                            }
                        });
                    }
                    if (f.subfolders) {
                        traverse(f.subfolders, currentPath);
                    }
                });
            };

            traverse(window.NodesCanvas.Registry.folders, "");

            // Group by folder for nicer display, or just display "Folder | Node"
            if (allNodes.length === 0) {
                resultsEl.innerHTML = `<div style="color: #666; font-size: 13px; text-align: center; margin-top: 10px;">No results</div>`;
                return;
            }

            allNodes.forEach(item => {
                const el = document.createElement('div');
                el.className = 'search-item';
                el.innerHTML = `<span style="opacity: 0.5; margin-right: 8px;">${item.folderName} |</span> ${item.node.title}`;

                el.addEventListener('click', () => {
                    if (onSelect) onSelect(item.node);
                    this.close();
                });

                resultsEl.appendChild(el);
            });
        };

        renderResults(""); // Initial render

        input.addEventListener('input', (e) => renderResults(e.target.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // Stop clicks from bubbling to overlay
        popup.addEventListener('mousedown', e => e.stopPropagation());
    }

    // --- Node Form Modal ---
    showNodeForm(initialConfig = null, targetFolderId = null, onSave) {
        this.overlay.innerHTML = '';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.justifyContent = 'center';

        const isEditing = !!initialConfig;
        let selectedIcon = initialConfig?.icon || 'default';
        const config = initialConfig || {
            title: 'New Function',
            description: '',
            icon: 'default',
            inputs: [{ id: 'in_1', label: 'Input A' }],
            outputs: [{ id: 'out_1', label: 'Output A' }]
        };

        const isEditable = config.editable !== false;

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';

        // Flatten folders for the select dropdown
        const allFolders = [];
        const traverseFolders = (folders, depth = 0) => {
            folders.forEach(f => {
                allFolders.push({ id: f.id, name: "—".repeat(depth) + " " + f.name });
                if (f.subfolders) traverseFolders(f.subfolders, depth + 1);
            });
        };
        traverseFolders(window.NodesCanvas.Registry.folders);

        const folderOptions = allFolders.map(f =>
            `<option value="${f.id}" ${f.id === targetFolderId ? 'selected' : ''}>${f.name}</option>`
        ).join("");

        modal.innerHTML = `
            <div class="node-form-header">
                <span>${isEditing ? 'Edit Function' : 'Create Function'}</span>
                <button class="close-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            
            <div class="node-form-content">
                <!-- Zone: Node -->
                <div class="form-zone" id="zone-node">
                    <div class="zone-header"><span>Nodo (Metadata)</span> <span>▼</span></div>
                    <div class="zone-content">
                        <div class="form-row">
                            <label>Name</label>
                            <input type="text" id="fn-name" value="${config.title}" ${!isEditable ? 'disabled' : ''}>
                        </div>
                        <div class="form-row">
                            <label>Description</label>
                            <textarea id="fn-desc" rows="2" style="resize:vertical;" ${!isEditable ? 'disabled' : ''}>${config.description || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <label>Icon</label>
                            <div class="icon-picker-container">
                                <input type="text" id="icon-search" class="icon-search-input" placeholder="Search icons...">
                                <div id="icon-picker" class="icon-picker-grid">
                                    <!-- Icons will be rendered here dynamically -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone: Parameters -->
                <div class="form-zone" id="zone-params">
                    <div class="zone-header"><span>Parameters</span> <span>▼</span></div>
                    <div class="zone-content">
                        <div class="params-container">
                            <div class="param-col" id="col-inputs">
                                <label style="font-size:12px; color:#aaa; font-weight:bold;">Inputs</label>
                                <div id="inputs-list"></div>
                                <div class="add-param-btn" id="btn-add-input" style="${!isEditable ? 'display:none' : ''}">+ Add Input</div>
                            </div>
                            <div class="param-col" id="col-outputs">
                                <label style="font-size:12px; color:#aaa; font-weight:bold;">Outputs</label>
                                <div id="outputs-list"></div>
                                <div class="add-param-btn" id="btn-add-output" style="${!isEditable ? 'display:none' : ''}">+ Add Output</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone: Function -->
                <div class="form-zone" id="zone-func">
                    <div class="zone-header"><span>Function Logic</span> <span>▼</span></div>
                    <div class="zone-content">
                        <div id="monaco-container" style="height: 240px; border-radius: 6px; overflow: hidden; border: 1px solid var(--glass-border);"></div>
                    </div>
                </div>

                <!-- Zone: Library -->
                <div class="form-zone" id="zone-library" style="${isEditing ? 'display:none;' : ''}">
                    <div class="zone-header"><span>Library Location</span></div>
                    <div class="zone-content">
                        <div class="form-row">
                            <label>Save in Folder</label>
                            <select id="fn-folder">
                                ${folderOptions}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button class="btn-secondary" id="btn-cancel">Cancel</button>
                <button class="btn-primary" id="btn-save">${isEditing ? 'Save Changes' : 'Create'}</button>
            </div>
        `;

        modal.addEventListener('mousedown', e => e.stopPropagation());

        // Collapsible zones logic
        modal.querySelectorAll('.zone-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('collapsed');
            });
        });

        // --- Icon Picker logic ---
        const iconPickerGrid = modal.querySelector('#icon-picker');
        const iconSearchInput = modal.querySelector('#icon-search');

        const renderIconGrid = (query = '') => {
            const allIcons = window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getAllNames() : [];
            const filtered = allIcons.filter(name => name.includes(query.toLowerCase()));

            iconPickerGrid.innerHTML = filtered.map(name => `
                <button type="button" class="icon-pick-btn ${name === selectedIcon ? 'selected' : ''}" data-icon="${name}" title="${name}">
                    ${window.NodesCanvas.NodeIcons.getSvg(name)}
                </button>
            `).join('');

            // Bind click events
            iconPickerGrid.querySelectorAll('.icon-pick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    iconPickerGrid.querySelectorAll('.icon-pick-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedIcon = btn.dataset.icon;
                });
            });

            // Re-render Lucide icons
            if (window.lucide) window.lucide.createIcons({
                attrs: { 'stroke-width': 2 }
            });
        };

        renderIconGrid(); // Initial render

        iconSearchInput.addEventListener('input', (e) => {
            renderIconGrid(e.target.value);
        });

        // Prevent drag on search input
        iconSearchInput.addEventListener('mousedown', e => e.stopPropagation());

        // --- Params Lists ---
        // Helper: build sanitized JS variable name from label
        const toVarName = (label) => label.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&') || 'param';

        // Generates the auto-generated signature comment block for Monaco
        const buildSignatureCode = (inputs, outputs, existingCode = '') => {
            const paramList = inputs.map(i => toVarName(i.label)).join(', ');
            const returnShape = outputs.map(o => `    ${toVarName(o.label)}: undefined`).join(',\n');
            const autoHeader = `/**
 * @param {Object} inputs — { ${inputs.map(i => toVarName(i.label) + ': any').join(', ')} }
 * @returns {Object} — { ${outputs.map(o => toVarName(o.label) + ': any').join(', ')} }
 */
function execute({ ${paramList} }) {
`;
            const autoFooter = `
    return {
${returnShape}
    };
}`;
            // If user already has custom body, preserve lines between header and return
            const bodyMatch = existingCode.match(/function execute\([^)]*\)\s*\{([\s\S]*?)\s*return\s*\{/);
            const userBody = bodyMatch ? bodyMatch[1] : '    // Write your logic here\n';
            return autoHeader + userBody + autoFooter;
        };

        // --- Build Params Lists ---
        const buildList = (containerId, items, prefix) => {
            const container = modal.querySelector('#' + containerId);
            container.innerHTML = '';
            items.forEach((item, idx) => {
                const el = document.createElement('div');
                el.className = 'param-item';
                el.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>
                    <input type="text" value="${item.label}" data-idx="${idx}">
                    <div class="remove-param">x</div>
                `;
                el.querySelector('.remove-param').addEventListener('click', () => {
                    items.splice(idx, 1);
                    buildList(containerId, items, prefix);
                    syncMonaco();
                });
                el.querySelector('input').addEventListener('input', (e) => {
                    items[idx].label = e.target.value;
                    syncMonaco();
                });
                container.appendChild(el);
            });
        };

        let currentInputs = JSON.parse(JSON.stringify(config.inputs || []));
        let currentOutputs = JSON.parse(JSON.stringify(config.outputs || []));

        buildList('inputs-list', currentInputs, 'in_');
        buildList('outputs-list', currentOutputs, 'out_');

        // After each param change, sync Monaco signature
        const syncMonaco = () => {
            if (!window._monacoEditorRef) return;
            const newSig = buildSignatureCode(currentInputs, currentOutputs, window._monacoEditorRef.getValue());
            window._monacoEditorRef.setValue(newSig);
        };

        modal.querySelector('#btn-add-input').addEventListener('click', () => {
            currentInputs.push({ id: 'in_' + Date.now(), label: 'input' + (currentInputs.length + 1) });
            buildList('inputs-list', currentInputs, 'in_');
            syncMonaco();
        });

        modal.querySelector('#btn-add-output').addEventListener('click', () => {
            currentOutputs.push({ id: 'out_' + Date.now(), label: 'output' + (currentOutputs.length + 1) });
            buildList('outputs-list', currentOutputs, 'out_');
            syncMonaco();
        });

        // Note: Save and Close handlers are registered after Monaco is mounted (below)

        this.overlay.appendChild(modal);
        this.overlay.classList.add('active');

        // Mount Monaco Editor async once modal is in the DOM
        let monacoEditorInstance = null;
        window._monacoEditorRef = null;
        const initialCode = config.code && config.code.trim() !== ''
            ? config.code
            : buildSignatureCode(currentInputs, currentOutputs, '');


        if (window.monacoReady) {
            window.monacoReady.then((monaco) => {
                const container = modal.querySelector('#monaco-container');
                if (!container) return;

                // Match theme to the app
                monaco.editor.defineTheme('nodes-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                        'editor.background': '#1a1a2e',
                        'editor.lineHighlightBackground': '#ffffff08',
                    }
                });

                const isDark = !document.body.classList.contains('light-theme');
                monacoEditorInstance = monaco.editor.create(container, {
                    value: initialCode,
                    language: 'javascript',
                    theme: isDark ? 'nodes-dark' : 'vs',
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    tabSize: 2,
                    readOnly: isBuiltIn
                });
                window._monacoEditorRef = monacoEditorInstance;
            });
        } else {
            // Fallback if Monaco is not available (offline)
            const container = modal.querySelector('#monaco-container');
            if (container) {
                container.innerHTML = `<textarea style="width:100%; height:100%; background:#1a1a2e; color:#d4d4d4; border:none; padding:12px; font-family:monospace; font-size:13px; resize:none; outline:none;">${initialCode}</textarea>`;
            }
        }

        // Override save to include editor code
        modal.querySelector('#btn-save').addEventListener('click', () => {
            const code = monacoEditorInstance
                ? monacoEditorInstance.getValue()
                : (modal.querySelector('#monaco-container textarea')?.value || '');

            const finalConfig = {
                title: modal.querySelector('#fn-name').value.trim() || 'Untitled',
                description: modal.querySelector('#fn-desc').value.trim(),
                icon: selectedIcon,
                inputs: currentInputs,
                outputs: currentOutputs,
                code: code
            };

            const selectedFolderId = modal.querySelector('#fn-folder')?.value;

            if (onSave) onSave(finalConfig, selectedFolderId);

            // Properly dispose Monaco instance to free resources
            if (monacoEditorInstance) monacoEditorInstance.dispose();
            this.close();
        });

        // Also dispose Monaco when closing with Cancel or X
        const closeFn = () => {
            if (monacoEditorInstance) monacoEditorInstance.dispose();
            window._monacoEditorRef = null;
            this.close();
        };
        modal.querySelector('.close-btn').removeEventListener('click', () => this.close());
        modal.querySelector('.close-btn').addEventListener('click', closeFn);
        modal.querySelector('#btn-cancel').removeEventListener('click', () => this.close());
        modal.querySelector('#btn-cancel').addEventListener('click', closeFn);
    }
};

// NodeFormPopup.js - Create/edit function node modal (with Monaco editor).

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.NodeFormPopup = class extends window.NodesCanvas.Popups.BasePopup {
    show(initialConfig = null, targetFolderId = null, onSave) {
        this._prepareOverlay('center', 'center');

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
                <span>${isEditing ? `Edit ${config.type || 'Function'}` : `Create ${config.type || 'Function'}`}</span>
                ${this._closeIcon()}
            </div>

            <div class="node-form-content">
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
                                <div id="icon-picker" class="icon-picker-grid"></div>
                            </div>
                        </div>
                    </div>
                </div>

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

                <div class="form-zone" id="zone-func">
                    <div class="zone-header"><span>Function Logic</span> <span>▼</span></div>
                    <div class="zone-content">
                        <div id="monaco-container" style="height: 240px; border-radius: 6px; overflow: hidden; border: 1px solid var(--glass-border);"></div>
                    </div>
                </div>

                <div class="form-zone" id="zone-library" style="${isEditing ? 'display:none;' : ''}">
                    <div class="zone-header"><span>Library Location</span></div>
                    <div class="zone-content">
                        <div class="form-row">
                            <label>Save in Folder</label>
                            <select id="fn-folder">${folderOptions}</select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <button class="btn-secondary" id="btn-cancel">Cancel</button>
                <button class="btn-primary" id="btn-save">${isEditing ? 'Save Changes' : 'Create'}</button>
            </div>
        `;

        modal.querySelectorAll('.zone-header').forEach(header => {
            header.addEventListener('click', () => header.parentElement.classList.toggle('collapsed'));
        });

        // --- Icon Picker ---
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

            iconPickerGrid.querySelectorAll('.icon-pick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    iconPickerGrid.querySelectorAll('.icon-pick-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedIcon = btn.dataset.icon;
                });
            });

            if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 2 } });
        };

        renderIconGrid();
        iconSearchInput.addEventListener('input', (e) => renderIconGrid(e.target.value));
        iconSearchInput.addEventListener('mousedown', e => e.stopPropagation());

        // --- Params ---
        const toVarName = (label) => label.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, '_$&') || 'param';

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
            const bodyMatch = existingCode.match(/function execute\([^)]*\)\s*\{([\s\S]*?)\s*return\s*\{/);
            const userBody = bodyMatch ? bodyMatch[1] : '    // Write your logic here\n';
            return autoHeader + userBody + autoFooter;
        };

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

        this._mount(modal);

        // --- Monaco Editor ---
        let monacoEditorInstance = null;
        window._monacoEditorRef = null;
        const initialCode = config.code && config.code.trim() !== ''
            ? config.code
            : buildSignatureCode(currentInputs, currentOutputs, '');

        if (window.monacoReady) {
            window.monacoReady.then((monaco) => {
                const container = modal.querySelector('#monaco-container');
                if (!container) return;

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
                    readOnly: !isEditable
                });
                window._monacoEditorRef = monacoEditorInstance;
            });
        } else {
            const container = modal.querySelector('#monaco-container');
            if (container) {
                container.innerHTML = `<textarea style="width:100%; height:100%; background:#1a1a2e; color:#d4d4d4; border:none; padding:12px; font-family:monospace; font-size:13px; resize:none; outline:none;">${initialCode}</textarea>`;
            }
        }

        // --- Actions ---
        const closeFn = () => {
            if (monacoEditorInstance) monacoEditorInstance.dispose();
            window._monacoEditorRef = null;
            this.close();
        };

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

            closeFn();
        });

        modal.querySelector('.close-btn').addEventListener('click', closeFn);
        modal.querySelector('#btn-cancel').addEventListener('click', closeFn);
    }
};

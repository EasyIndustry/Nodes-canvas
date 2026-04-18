// BranchNode.js - A node that routes input data to various outputs based on boolean expressions.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.BranchNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        
        // branches array: { id: 'If_1', code: 'x > 5' }
        this.branches = config.branches || [{ id: 'If_1', code: 'x > 5' }];
        
        // Default Inputs based on initial branch expressions
        this.inputs = config.inputs || [{ id: 'x', label: 'x' }];
        
        // Sync outputs right away based on branches
        this._syncOutputsFromBranches();

        this.initElement('node branch-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    _syncOutputsFromBranches() {
        this.outputs = this.branches.map(b => ({ id: b.id, label: b.id.split('_')[0] }));
        this.outputs.push({ id: 'Else', label: 'Else' });
    }

    render() {
        this.element.innerHTML = `
            <div class="node-header">
                <div class="node-header-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 3v12"/><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M15 6 9 6"/><path d="M18 9v12"/>
                    </svg>
                </div>
                <span class="node-title">${this.title || 'Branch / If'}</span>
            </div>
            <div class="node-body">
                <div class="node-ports-in"></div>
                
                <div class="branch-container" style="padding: 0 10px; flex: 1; display:flex; flex-direction: column; gap: 8px;">
                    <div id="branches-list" style="display:flex; flex-direction: column; gap: 6px;"></div>
                    <button class="add-branch-btn" style="background: rgba(255,255,255,0.05); border: 1px dashed var(--glass-border); color: #aaa; padding: 4px; border-radius: 4px; cursor: pointer; font-size: 11px;">+ Add Else If</button>
                </div>

                <div class="node-ports-out"></div>
            </div>
        `;

        this.renderPortsOut();
        this.renderPortsIn();
        this.renderBranches();
        this.bindInternalEvents();
        this.bindDragEvents(this.element.querySelector('.node-header'));

        if (window.lucide) window.lucide.createIcons();
    }

    renderBranches() {
        const list = this.element.querySelector('#branches-list');
        list.innerHTML = '';
        this.branches.forEach((b, index) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '4px';
            
            const isFirst = index === 0;
            const prefix = isFirst ? 'If' : 'Elif';
            
            row.innerHTML = `
                <span style="font-size: 11px; color: #888; width: 22px;">${prefix}</span>
                <textarea class="branch-input" data-id="${b.id}" style="flex: 1; min-height: 22px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: #00dc82; font-family: monospace; font-size: 12px; padding: 2px 4px; border-radius: 4px; outline: none; resize: vertical;" placeholder="x > 5">${b.code}</textarea>
                ${!isFirst ? `<button class="remove-branch-btn" data-id="${b.id}" style="background:none; border:none; color: #ff4757; cursor:pointer; font-size:14px; padding:0 4px;" title="Remove branch">&times;</button>` : '<div style="width:18px"></div>'}
            `;
            list.appendChild(row);
        });

        // Event listeners for branch scripts
        list.querySelectorAll('.branch-input').forEach(textarea => {
            textarea.addEventListener('input', (e) => {
                const bId = e.target.getAttribute('data-id');
                const branch = this.branches.find(br => br.id === bId);
                if (branch) branch.code = e.target.value;
                this.updateInputsFromExpression();
                
                if (window.NodesCanvas.executionMode === 'run') {
                    window.NodesCanvas.GraphEngine.execute();
                }
                if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            });
            textarea.addEventListener('mousedown', e => e.stopPropagation());
        });

        // Event listeners for remove branch buttons
        list.querySelectorAll('.remove-branch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bId = e.currentTarget.getAttribute('data-id');
                this.branches = this.branches.filter(br => br.id !== bId);
                this._syncOutputsFromBranches();
                this.renderBranches();
                this.renderPortsOut();
                this.updateInputsFromExpression();
                if (window.NodesCanvas.ConnectionManager) window.NodesCanvas.ConnectionManager.updateAllConnections();
                if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            });
            btn.addEventListener('mousedown', e => e.stopPropagation());
        });
    }

    bindInternalEvents() {
        const addBtn = this.element.querySelector('.add-branch-btn');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newId = 'If_' + (this.branches.length + 1) + '_' + Date.now().toString(36);
            this.branches.push({ id: newId, code: '' });
            this._syncOutputsFromBranches();
            this.renderBranches();
            this.renderPortsOut();
            if (window.NodesCanvas.ConnectionManager) window.NodesCanvas.ConnectionManager.updateAllConnections();
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });
        addBtn.addEventListener('mousedown', e => e.stopPropagation());
    }

    renderPortsOut() {
        const portsContainer = this.element.querySelector('.node-ports-out');
        portsContainer.innerHTML = '';
        this.outputs.forEach(out => {
            const port = document.createElement("div");
            port.className = "port out";
            port.innerHTML = `
                <span class="port-label">${out.label}</span>
                <div class="socket" data-portid="${out.id}" data-type="out"></div>
            `;
            portsContainer.appendChild(port);
        });
    }

    renderPortsIn() {
        const portsContainer = this.element.querySelector('.node-ports-in');
        portsContainer.innerHTML = '';
        this.inputs.forEach(inp => {
            const port = document.createElement("div");
            port.className = "port in";
            port.innerHTML = `
                <div class="socket" data-portid="${inp.id}" data-type="in"></div>
                <span class="port-label">${inp.label}</span>
            `;
            portsContainer.appendChild(port);
        });
    }

    updateInputsFromExpression() {
        const tokenRegex = /(?<!\.\s*)(?<![.\w])\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\.?\s*\()/g;
        const matches = [];
        
        // Combine all branch codes to parse variables
        const fullCode = this.branches.map(b => b.code).join('   ');
        
        let m;
        while ((m = tokenRegex.exec(fullCode)) !== null) {
            matches.push(m[1]);
        }

        const keywords = new Set(['Math', 'true', 'false', 'null', 'undefined', 'PI', 'E',
            'sin', 'cos', 'tan', 'abs', 'sqrt', 'pow', 'log', 'exp', 'min', 'max', 'random',
            'floor', 'ceil', 'round', 'number', 'string', 'boolean', 'if', 'else', 'return',
            'function', 'var', 'let', 'const', 'for', 'while', 'do', 'break', 'continue',
            'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'class', 'import', 'export',
            'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'JSON', 'Object', 'Array',
            'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'console'
        ]);

        const variables = [...new Set(matches)]
            .filter(v => !keywords.has(v))
            .filter(v => isNaN(Number(v)));

        const newInputs = variables.map(v => ({ id: v, label: v }));

        const currentIds = this.inputs.map(i => i.id).sort().join(',');
        const newIds = newInputs.map(i => i.id).sort().join(',');

        if (currentIds !== newIds) {
            this.inputs = newInputs;
            this.renderPortsIn();

            if (window.NodesCanvas.ConnectionManager) {
                window.NodesCanvas.ConnectionManager.updateAllConnections();
            }
        }
    }
};

// ExpressionNode.js - A node that parses a mathematical/logic expression 
// and automatically creates input ports for each variable detected.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ExpressionNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.code = config.code || 'x * 2';
        this.inputs = config.inputs || [{ id: 'x', label: 'x' }];
        this.outputs = config.outputs || [{ id: 'Result', label: 'Result' }];

        this.initElement('node expression-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    render() {
        this.element.innerHTML = `
            <div class="node-header">
                <div class="node-header-icon">
                    ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('variable', 14) : ''}
                </div>
                <span class="node-title">${this.title || 'Expression'}</span>
            </div>
            <div class="node-body">
                <div class="node-ports-in"></div>
                <div class="expression-container" style="padding: 0 10px; flex: 1;">
                    <textarea class="expression-input" 
                        style="width: 100%; min-height: 40px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: #00dc82; font-family: monospace; font-size: 13px; padding: 4px; border-radius: 4px; outline: none; resize: vertical;"
                        placeholder="e.g. x + y * 2">${this.code}</textarea>
                </div>
                <div class="node-ports-out">
                    <div class="port out">
                        <span class="port-label">Result</span>
                        <div class="socket" data-portid="Result" data-type="out"></div>
                    </div>
                </div>
            </div>
        `;

        this.renderPorts();
        this.bindInternalEvents();
        this.bindDragEvents(this.element.querySelector('.node-header'));

        if (window.lucide) window.lucide.createIcons();
    }

    renderPorts() {
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

    bindInternalEvents() {
        const textarea = this.element.querySelector('.expression-input');

        textarea.addEventListener('input', (e) => {
            this.code = e.target.value;
            this.updateInputsFromExpression();

            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        textarea.addEventListener('mousedown', e => e.stopPropagation());
    }

    updateInputsFromExpression() {
        // Match identifiers NOT preceded by a dot (i.e., root variables, not object properties)
        // Uses a regex that grabs every word, then we filter out those that follow a '.'
        const tokenRegex = /(?<!\.\s*)(?<![.\w])\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?!\s*\.?\s*\()/g;
        const matches = [];
        let m;
        while ((m = tokenRegex.exec(this.code)) !== null) {
            matches.push(m[1]);
        }

        // Exclude JS keywords, Math methods, and common word-like constants
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

        // Create new inputs array
        const newInputs = variables.map(v => ({ id: v, label: v }));

        // Check if anything actually changed
        const currentIds = this.inputs.map(i => i.id).sort().join(',');
        const newIds = newInputs.map(i => i.id).sort().join(',');

        if (currentIds !== newIds) {
            this.inputs = newInputs;
            this.renderPorts();

            // Notify ConnectionManager to update all connection paths
            if (window.NodesCanvas.ConnectionManager) {
                window.NodesCanvas.ConnectionManager.updateAllConnections();
            }
        }
    }
};

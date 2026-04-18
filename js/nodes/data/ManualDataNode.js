// ManualDataNode.js - Grasshopper-style Panel Node inheriting from BaseNode
// Lets you write raw data directly on the canvas UI

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ManualDataNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Panel';
        this.label = config.label || 'data';
        this.value = config.value !== undefined ? config.value : '';
        this.arrayMode = config.arrayMode !== undefined ? config.arrayMode : false;
        this.isConstant = config.isConstant !== undefined ? config.isConstant : false;

        this.initElement('node panel-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    /** Detects type of the raw string value including JSON support */
    detectType(raw) {
        const trimmed = (raw || '').trim();
        if (trimmed === '') return 'text';
        
        // Booleans
        if (trimmed === 'true' || trimmed === 'false') return 'boolean';
        
        // Numbers
        if (!isNaN(trimmed) && !isNaN(parseFloat(trimmed))) return 'number';
        
        // Objects & Arrays via JSON detection
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return 'array';
                if (typeof parsed === 'object' && parsed !== null) return 'object';
            } catch (e) {
                // Fallback to text if JSON is malformed
            }
        }
        
        return 'text';
    }

    getTypeLabel(type) {
        const labels = {
            'text': 'TEXT',
            'object': 'OBJ',
            'array': 'ARRAY',
            'number': 'NUM',
            'boolean': 'BOOL'
        };
        return labels[type] || type.toUpperCase();
    }

    render() {
        const type = this.arrayMode ? 'array' : this.detectType(this.value);
        const labelText = this.getTypeLabel(type);

        this.element.innerHTML = `
            <div class="panel-header ${this.isConstant ? 'constant' : ''}">
                <div class="panel-accent-strip"></div>
                <div class="panel-label-display" title="Double click to rename">${this.escapeHtml(this.label)}</div>
                <div class="panel-header-actions">
                    <button class="panel-array-btn ${this.arrayMode ? 'active' : ''}" title="Toggle Array Mode">
                        ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('layers', 10) : 'A'}
                    </button>
                    <button class="panel-const-toggle ${this.isConstant ? 'active' : ''}" title="Toggle CONST">
                        CONST
                    </button>
                </div>
            </div>
            <div class="panel-body">
                <div class="panel-type-badge panel-type-${type}">${labelText}</div>
                <textarea class="panel-textarea" placeholder="Enter values...">${this.value}</textarea>
            </div>
            <div class="node-ports-out">
                <div class="port out">
                    <div class="socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
        `;

        this.bindInternalEvents();
        this.bindDragEvents(this.element.querySelector('.panel-header'));

        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const textarea = this.element.querySelector('.panel-textarea');
        const labelEl = this.element.querySelector('.panel-label-display');
        const btnArray = this.element.querySelector('.panel-array-btn');
        const btnConst = this.element.querySelector('.panel-const-toggle');

        textarea.addEventListener('input', (e) => {
            this.value = e.target.value;
            const typeBadge = this.element.querySelector('.panel-type-badge');
            const type = this.arrayMode ? 'array' : this.detectType(this.value);
            const labelText = this.getTypeLabel(type);
            
            typeBadge.className = `panel-type-badge panel-type-${type}`;
            typeBadge.textContent = labelText;

            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        textarea.addEventListener('mousedown', e => e.stopPropagation());

        btnArray.addEventListener('click', (e) => {
            e.stopPropagation();
            this.arrayMode = !this.arrayMode;
            this.render();
            if (window.NodesCanvas.executionMode === 'run') window.NodesCanvas.GraphEngine.execute();
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        btnConst.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isConstant = !this.isConstant;
            this.render();
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        labelEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const currentLabel = this.label;
            labelEl.innerHTML = `<input type="text" class="panel-label-input" value="${currentLabel}">`;
            const input = labelEl.querySelector('input');
            input.focus();
            input.select();

            const save = () => {
                this.label = input.value || 'data';
                this.render();
                if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            };

            input.addEventListener('blur', save);
            input.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') save();
                if (ke.key === 'Escape') this.render();
            });

            input.addEventListener('mousedown', e => e.stopPropagation());
        });
    }
};

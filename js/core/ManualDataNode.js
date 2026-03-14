// PanelNode.js - Grasshopper-style Panel Node
// Lets you write raw data directly on the canvas UI
// Supports: text, numbers, booleans, and array mode (newline = separate item)

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ManualDataNode = class {
    constructor(config = {}) {
        this.id = config.id || ('data_' + Date.now() + Math.floor(Math.random() * 1000));
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.label = config.label || 'Manual Data';
        this.value = config.value !== undefined ? config.value : '';
        this.arrayMode = config.arrayMode || false;
        this.isConstant = config.isConstant !== undefined ? config.isConstant : true;

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        this.createElement();
        this.initEvents();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);

        // Register instance
        window.NodesCanvas._panelInstances = window.NodesCanvas._panelInstances || {};
        window.NodesCanvas._panelInstances[this.id] = this;
    }

    /** Detects type of the raw string value */
    detectType(raw) {
        const trimmed = raw.trim();
        if (trimmed === 'true' || trimmed === 'false') return 'boolean';
        if (!isNaN(trimmed) && trimmed !== '') return 'number';
        if (this.arrayMode) return 'array';

        // Detect JSON array/object
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) return 'array';
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) return 'object';

        return 'text';
    }

    /** Returns display label for detected type */
    typeLabel(raw) {
        if (this.arrayMode) {
            const lines = raw.split('\n').filter(l => l.trim() !== '');
            return `array [${lines.length}]`;
        }
        const type = this.detectType(raw);
        if (type === 'array') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return `array [${parsed.length}]`;
            } catch (e) { }
        }
        return type;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'node panel-node manual-data-node';
        this.element.id = this.id;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        this.element.style.minWidth = '200px';

        this.render();
    }

    render() {
        const type = this.typeLabel(this.value);
        const typeClass = `panel-type-${this.arrayMode ? 'array' : this.detectType(this.value)}`;

        this.element.innerHTML = `
            <div class="node-header panel-header">
                <div class="panel-accent-strip" style="background: ${this.isConstant ? '#ffd700' : '#4da6ff'}"></div>
                <span class="panel-label-display">${this.escapeHtml(this.label)}</span>
                <input class="panel-label-input" type="text" value="${this.escapeHtml(this.label)}" spellcheck="false" style="display:none;">
                
                <div class="panel-header-actions">
                    <button class="panel-const-toggle" title="Switch between Constant and Variable">
                        ${this.isConstant ? 'CONST' : 'VAR'}
                    </button>
                    <button class="panel-edit-name-btn" title="Rename (or double-click title)">
                        ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('edit-2', 10) : ''}
                    </button>
                </div>
            </div>
            <div class="panel-body">
                <textarea class="panel-textarea" rows="${this.arrayMode ? 4 : 2}" placeholder="Type any value...">${this.escapeHtml(this.value)}</textarea>
                <div class="panel-type-badge ${typeClass}">${type}${this.arrayMode ? ' <span style="opacity:0.6;">[ arr ]</span>' : ''}</div>
            </div>
            <div class="node-ports-out panel-output">
                <div class="port out">
                    <span class="port-label">value</span>
                    <div class="socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
        `;

        this.bindInternalEvents();

        // Render Lucide icons
        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const textarea = this.element.querySelector('.panel-textarea');
        const badge = this.element.querySelector('.panel-type-badge');
        const labelDisplay = this.element.querySelector('.panel-label-display');
        const labelInput = this.element.querySelector('.panel-label-input');
        const editNameBtn = this.element.querySelector('.panel-edit-name-btn');
        const constToggle = this.element.querySelector('.panel-const-toggle');

        // Toggle Const/Var
        constToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isConstant = !this.isConstant;
            this.render();

            // Trigger Save and Refresh
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                window.NodesCanvas.CodeInspector.refresh();
            }
        });

        // Enter label edit mode
        const enterLabelEdit = () => {
            labelDisplay.style.display = 'none';
            labelInput.style.display = 'block';
            editNameBtn.style.display = 'none';
            constToggle.style.display = 'none';
            labelInput.focus();
            labelInput.select();
        };
        const exitLabelEdit = () => {
            this.label = labelInput.value.trim() || 'Manual Data';
            labelDisplay.textContent = this.label;
            labelInput.style.display = 'none';
            labelDisplay.style.display = 'block';
            editNameBtn.style.display = 'flex';
            constToggle.style.display = 'block';

            // Trigger Save and Refresh
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                window.NodesCanvas.CodeInspector.refresh();
            }
        };

        editNameBtn.addEventListener('click', (e) => { e.stopPropagation(); enterLabelEdit(); });
        labelDisplay.addEventListener('dblclick', (e) => { e.stopPropagation(); enterLabelEdit(); });
        labelInput.addEventListener('blur', exitLabelEdit);
        labelInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') exitLabelEdit();
        });
        labelInput.addEventListener('mousedown', e => e.stopPropagation());

        // Live type detection as they type
        textarea.addEventListener('input', (e) => {
            this.value = e.target.value;
            const detectedBase = this.arrayMode ? 'array' : this.detectType(this.value);
            const type = this.typeLabel(this.value);
            badge.className = `panel-type-badge panel-type-${detectedBase}`;
            badge.innerHTML = type + (this.arrayMode ? ' <span style="opacity:0.6;">[ arr ]</span>' : '');

            // Trigger Save and Refresh
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                // Debounce refresh
                clearTimeout(this._refreshTimer);
                this._refreshTimer = setTimeout(() => window.NodesCanvas.CodeInspector.refresh(), 300);
            }
        });

        textarea.addEventListener('dblclick', e => e.stopPropagation());
        textarea.addEventListener('mousedown', e => e.stopPropagation());
    }

    initEvents() {
        // Drag via the header
        this.element.addEventListener('mousedown', (e) => {
            // Only drag from the panel-header, not from inputs
            const isHeader = e.target.closest('.panel-header');
            if (!isHeader) return;
            if (e.target.closest('button') || e.target.closest('input')) return;

            e.stopPropagation();
            const canvasTransform = window.NodesCanvas.canvas.transform;

            // Handle selection logic
            if (!e.ctrlKey && !this.element.classList.contains('selected')) {
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
            }
            this.element.classList.add('selected');

            // Collect all nodes to drag
            const selectedNodes = document.querySelectorAll('.node.selected');
            selectedNodes.forEach(nodeEl => {
                const instance = window.NodesCanvas._nodeInstances[nodeEl.id] ||
                    window.NodesCanvas._panelInstances?.[nodeEl.id] ||
                    window.NodesCanvas._callInstances?.[nodeEl.id];

                if (instance) {
                    instance.isDragging = true;
                    instance.element.classList.add('dragging');

                    const rect = instance.element.getBoundingClientRect();
                    instance.dragOffsets.x = (e.clientX - rect.left) / canvasTransform.scale;
                    instance.dragOffsets.y = (e.clientY - rect.top) / canvasTransform.scale;
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const canvasTransform = window.NodesCanvas.canvas.transform;
            this.x = (e.clientX - canvasTransform.x) / canvasTransform.scale - this.dragOffsets.x;
            this.y = (e.clientY - canvasTransform.y) / canvasTransform.scale - this.dragOffsets.y;
            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.classList.remove('dragging');
            }
        });
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
};

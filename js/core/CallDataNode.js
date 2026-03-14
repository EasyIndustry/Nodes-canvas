// CallDataNode.js - Reference data from Manual Data nodes without wires
// Provides a dropdown to select a source and outputs its current value

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.CallDataNode = class {
    constructor(config = {}) {
        this.id = config.id || ('call_' + Date.now() + Math.round(Math.random() * 1000));
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.label = config.label || 'Call Data';
        this.sourceId = config.sourceId || null; // The ID of the ManualDataNode being referenced

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        this.createElement();
        this.initEvents();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);

        window.NodesCanvas._callInstances = window.NodesCanvas._callInstances || {};
        window.NodesCanvas._callInstances[this.id] = this;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'node call-data-node';
        this.element.id = this.id;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        this.element.style.minWidth = '180px';

        this.render();
    }

    render() {
        // Find current manual data sources
        const sources = Object.values(window.NodesCanvas._panelInstances || {});
        const constants = sources.filter(s => s.isConstant);
        const variables = sources.filter(s => !s.isConstant);

        let optionsHTML = '<option value="">-- Select Source --</option>';

        if (constants.length) {
            optionsHTML += '<optgroup label="Constants (CONST)">';
            constants.forEach(s => {
                const selected = s.id === this.sourceId ? 'selected' : '';
                optionsHTML += `<option value="${s.id}" ${selected}>${this.escapeHtml(s.label)}</option>`;
            });
            optionsHTML += '</optgroup>';
        }

        if (variables.length) {
            optionsHTML += '<optgroup label="Variables (VAR)">';
            variables.forEach(s => {
                const selected = s.id === this.sourceId ? 'selected' : '';
                optionsHTML += `<option value="${s.id}" ${selected}>${this.escapeHtml(s.label)}</option>`;
            });
            optionsHTML += '</optgroup>';
        }

        this.element.innerHTML = `
            <div class="node-header call-header">
                <div class="call-icon">
                    ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('external-link', 12) : ''}
                </div>
                <span class="call-title">${this.escapeHtml(this.label)}</span>
                <button class="call-refresh-btn" title="Refresh sources" style="margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; opacity:0.6; display:flex; align-items:center;">
                    <i data-lucide="refresh-cw" style="width:12px; height:12px;"></i>
                </button>
            </div>
            <div class="call-body">
                <select class="call-select">
                    ${optionsHTML}
                </select>
            </div>
            <div class="node-ports-out call-output">
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
        const select = this.element.querySelector('.call-select');

        select.addEventListener('change', (e) => {
            this.sourceId = e.target.value;
            // Trigger GraphEngine re-run if in run mode
            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }

            // Trigger Save and Refresh
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                window.NodesCanvas.CodeInspector.refresh();
            }
        });

        // Prevent drag when interacting with select
        select.addEventListener('mousedown', e => e.stopPropagation());

        // Refresh logic
        const refreshBtn = this.element.querySelector('.call-refresh-btn');
        const doRefresh = () => {
            const currentSource = this.sourceId;
            this.render();
            // Restore selection after render
            this.element.querySelector('.call-select').value = currentSource;
        };

        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            doRefresh();
        });

        // Refresh list on focus to catch new panels
        select.addEventListener('focus', doRefresh);
    }

    initEvents() {
        this.element.addEventListener('mousedown', (e) => {
            const isHeader = e.target.closest('.node-header');
            if (!isHeader || e.target.closest('select') || e.target.closest('button')) return;

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


    // This is called by GraphEngine to resolve the "virtual" 
    getValue() {
        if (!this.sourceId) return undefined;
        const sourceNode = window.NodesCanvas._panelInstances?.[this.sourceId];
        if (!sourceNode) return undefined;

        const raw = sourceNode.value;
        if (sourceNode.arrayMode) {
            return raw.split('\n').map(v => window.NodesCanvas.GraphEngine._parseValue(v));
        }
        return window.NodesCanvas.GraphEngine._parseValue(raw);
    }

    escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};

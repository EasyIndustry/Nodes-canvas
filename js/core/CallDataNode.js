// CallDataNode.js - Dynamic Data Collector

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.CallDataNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Call Data';
        this.label = config.label || 'source';
        this.sourceId = config.sourceId !== undefined ? config.sourceId : null;

        this.initElement('node call-data-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    render() {
        // Collect available ManualData sources from NodeRegistry
        const sources = window.NodesCanvas.NodeRegistry.getAll().filter(n => n instanceof window.NodesCanvas.ManualDataNode);

        this.element.innerHTML = `
            <div class="call-header">
                <div class="call-icon">
                    ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('external-link', 14) : ''}
                </div>
                <div class="call-title">${this.escapeHtml(this.title)}</div>
            </div>
            <div class="call-body">
                <select class="call-select">
                    <option value="">-- Select Source --</option>
                    ${sources.map(src => `<option value="${src.id}" ${this.sourceId === src.id ? 'selected' : ''}>${this.escapeHtml(src.label)}</option>`).join('')}
                </select>
            </div>
            <div class="node-ports-out">
                <div class="port out">
                    <div class="socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
        `;

        this.bindInternalEvents();
        this.bindDragEvents(this.element.querySelector('.call-header'));

        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const select = this.element.querySelector('.call-select');
        select.addEventListener('change', (e) => {
            this.sourceId = e.target.value;
            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        select.addEventListener('mousedown', e => e.stopPropagation());
    }

    getValue() {
        if (!this.sourceId) return null;
        const source = window.NodesCanvas.NodeRegistry.get(this.sourceId);
        if (!source) return null;

        const raw = source.value;
        if (source.arrayMode) {
            return raw.split('\n').map(v => this._parseValue(v));
        }
        return this._parseValue(raw);
    }

    _parseValue(val) {
        if (typeof val !== 'string') return val;
        const trimmed = val.trim();
        if (trimmed === '') return '';
        if (trimmed.toLowerCase() === 'true') return true;
        if (trimmed.toLowerCase() === 'false') return false;
        if (!isNaN(trimmed) && trimmed !== '') return parseFloat(trimmed);
        return val;
    }
};

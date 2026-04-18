// ViewerNode.js - Dynamic Data Visualizer inheriting from BaseNode

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ViewerNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Viewer';
        this.displayValue = 'No data';

        this.initElement('node viewer-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    render() {
        this.element.innerHTML = `
            <div class="viewer-header">
                ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('eye', 12) : ''}
                <span>${this.escapeHtml(this.title)}</span>
            </div>
            <div class="viewer-main">
                <div class="viewer-port-side">
                    <div class="socket" data-portid="${this.id}_in" data-type="in"></div>
                </div>
                <div class="viewer-body">
                    <pre class="viewer-display">${this.escapeHtml(this.displayValue)}</pre>
                </div>
            </div>
        `;

        this.bindDragEvents(this.element.querySelector('.viewer-header'));
        if (window.lucide) window.lucide.createIcons();
    }

    setValue(val) {
        if (val === undefined) {
            this.displayValue = 'undefined';
        } else if (val === null) {
            this.displayValue = 'null';
        } else if (typeof val === 'object') {
            try {
                this.displayValue = JSON.stringify(val, null, 2);
            } catch (e) {
                this.displayValue = '[Circular Object]';
            }
        } else {
            this.displayValue = String(val);
        }

        const display = this.element.querySelector('.viewer-display');
        if (display) display.textContent = this.displayValue;
    }

    clear() {
        this.displayValue = 'No data';
        const display = this.element.querySelector('.viewer-display');
        if (display) display.textContent = this.displayValue;
    }
};

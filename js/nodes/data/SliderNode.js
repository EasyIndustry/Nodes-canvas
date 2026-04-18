// SliderNode.js - Grasshopper-style Number Slider (Horizontal Layout)

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.SliderNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Slider';
        this.config = config.settings || {
            min: 0,
            max: 100,
            step: 1,
            value: 50
        };
        this.value = config.value !== undefined ? config.value : this.config.value;

        this.initElement('node slider-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    render() {
        this.element.innerHTML = `
            <div class="slider-gh-container">
                <div class="slider-gh-name-section">
                    <div class="slider-gh-label" title="${this.escapeHtml(this.title)}">${this.escapeHtml(this.title)}</div>
                </div>
                <div class="slider-gh-track-section">
                    <input type="range" class="slider-gh-range" 
                        min="${this.config.min}" 
                        max="${this.config.max}" 
                        step="${this.config.step}" 
                        value="${this.value}">
                    <div class="slider-gh-value-display">${this.value}</div>
                </div>
                <div class="slider-gh-port-section">
                    <div class="socket gh-socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
        `;

        this.bindInternalEvents();

        // Dragging is handle by the name section only to avoid conflicts with range input
        this.bindDragEvents(this.element.querySelector('.slider-gh-name-section'));

        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const range = this.element.querySelector('.slider-gh-range');
        const display = this.element.querySelector('.slider-gh-value-display');
        const nameSection = this.element.querySelector('.slider-gh-name-section');

        range.addEventListener('input', (e) => {
            this.value = parseFloat(e.target.value);
            display.textContent = this.value;
            this.onValueChange();
        });

        range.addEventListener('change', () => {
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        range.addEventListener('mousedown', e => e.stopPropagation());

        // Inline Name Edit or Settings popup on Double Click
        nameSection.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (window.NodesCanvas.popupManager) {
                window.NodesCanvas.popupManager.showSliderForm(this, (newSettings) => {
                    this.title = newSettings.label; // Sincronizamos el título (label)
                    this.config = {
                        ...this.config,
                        min: newSettings.min,
                        max: newSettings.max,
                        step: newSettings.step
                    };
                    this.value = Math.max(newSettings.min, Math.min(newSettings.max, this.value));
                    this.render();
                    this.onValueChange();
                    if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
                });
            }
        });
    }

    onValueChange() {
        if (window.NodesCanvas.executionMode === 'run') {
            window.NodesCanvas.GraphEngine.execute();
        }
    }
};

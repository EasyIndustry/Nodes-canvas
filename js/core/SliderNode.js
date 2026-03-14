// SliderNode.js - Rhino-style Number Slider (Horizontal Layout)
// A responsive slider to control numerical parameters with precision control

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.SliderNode = class {
    constructor(config = {}) {
        this.id = config.id || ('slider_' + Date.now() + Math.floor(Math.random() * 1000));
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.label = config.label || 'Number Slider';

        // Slider Properties
        this.min = config.min !== undefined ? config.min : 0;
        this.max = config.max !== undefined ? config.max : 100;
        this.step = config.step !== undefined ? config.step : 1;
        this.value = config.value !== undefined ? config.value : 50;
        this.rounding = config.rounding || 'R'; // R: Real, N: Integer, E: Even, O: Odd
        this.precision = config.precision !== undefined ? config.precision : 2;

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        this.createElement();
        this.initEvents();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);

        // Register instance in nodeInstances (GraphEngine needs this)
        window.NodesCanvas._nodeInstances = window.NodesCanvas._nodeInstances || {};
        window.NodesCanvas._nodeInstances[this.id] = this;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'node slider-node';
        this.element.id = this.id;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        // Fixed width to ensure UI consistency
        this.element.style.width = '240px';

        this.render();
    }

    /** Helper to format the display value according to precision/rounding */
    formatValue(val) {
        if (this.rounding === 'N') return Math.round(val).toString();
        if (this.rounding === 'E') return (Math.round(val / 2) * 2).toString();
        if (this.rounding === 'O') return (Math.round((val - 1) / 2) * 2 + 1).toString();

        // Default Real (R)
        return Number(val).toFixed(this.precision);
    }

    render() {
        // Rhino Grasshopper layout: Label Section | Track Section | Port
        // The port section is now inside to avoid clipping and allow better z-index control
        this.element.innerHTML = `
            <div class="slider-gh-container">
                <div class="slider-gh-name-section" title="Double-click to edit settings, Right-click for 'Edit'">
                    <span class="slider-gh-label">${this.escapeHtml(this.label)}</span>
                </div>
                
                <div class="slider-gh-track-section">
                    <input type="range" class="slider-gh-range" 
                        min="${this.min}" max="${this.max}" step="${this.step}" value="${this.value}">
                    <div class="slider-gh-value-display" title="Double-click to set value manually">${this.formatValue(this.value)}</div>
                </div>

                <div class="slider-gh-port-section">
                    <div class="socket gh-socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
        `;

        this.bindInternalEvents();
        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const range = this.element.querySelector('.slider-gh-range');
        const display = this.element.querySelector('.slider-gh-value-display');
        const nameSection = this.element.querySelector('.slider-gh-name-section');
        const trackSection = this.element.querySelector('.slider-gh-track-section');

        // Range Slider Interaction
        range.addEventListener('input', (e) => {
            this.value = parseFloat(e.target.value);
            display.textContent = this.formatValue(this.value);
            this.triggerUpdate();
        });

        // Double-click name section -> Open Settings
        nameSection.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.openSettings();
        });

        // Double-click value display -> Manual Edit
        display.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.enterValueEdit();
        });

        // Prevent dblclick propagation for inputs
        this.element.querySelectorAll('input').forEach(el => {
            el.addEventListener('dblclick', e => e.stopPropagation());
        });
    }

    /** Enter manual value editing mode (inline input) */
    enterValueEdit() {
        const track = this.element.querySelector('.slider-gh-track-section');
        const display = this.element.querySelector('.slider-gh-value-display');

        display.style.visibility = 'hidden';

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'slider-gh-value-input';
        input.value = this.value;
        input.step = this.step;

        const exitEdit = () => {
            let newVal = parseFloat(input.value);
            if (!isNaN(newVal)) {
                // Clamp and step
                this.value = Math.max(this.min, Math.min(this.max, newVal));
                this.render();
                this.triggerUpdate();
            } else {
                display.style.visibility = 'visible';
                input.remove();
            }
        };

        input.addEventListener('blur', exitEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') exitEdit();
            if (e.key === 'Escape') {
                display.style.visibility = 'visible';
                input.remove();
            }
        });

        track.appendChild(input);
        input.focus();
        input.select();

        // Prevent click propagation to range slider
        input.addEventListener('mousedown', e => e.stopPropagation());
    }

    openSettings() {
        if (window.NodesCanvas.popupManager) {
            window.NodesCanvas.popupManager.showSliderForm(this, (newConfig) => {
                this.label = newConfig.label;
                this.min = newConfig.min;
                this.max = newConfig.max;
                this.step = newConfig.step;
                this.value = newConfig.value;
                this.rounding = newConfig.rounding;
                this.precision = newConfig.precision;

                this.render(); // Redraw with new values and layout
                this.triggerUpdate();
            });
        }
    }

    triggerUpdate() {
        if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
            window.NodesCanvas.CodeInspector.refresh();
        }

        // Run Engine if in run mode
        if (window.NodesCanvas.executionMode === 'run') {
            if (window.NodesCanvas.GraphEngine) window.NodesCanvas.GraphEngine.execute();
        }
    }

    initEvents() {
        // Drag logic - handled by clicking anywhere in the container that isn't the interactive parts
        this.element.addEventListener('mousedown', (e) => {
            // Only allow dragging from the name-section or empty parts of gh-container
            const isNameSection = e.target.closest('.slider-gh-name-section');
            const isTrack = e.target.closest('.slider-gh-track-section');
            const isSocket = e.target.closest('.socket');

            // If dragging from track, we check if it's the range slider
            if (e.target.classList.contains('slider-gh-range')) return;
            if (isSocket) return;

            e.stopPropagation();
            const canvasTransform = window.NodesCanvas.canvas.transform;

            if (!e.ctrlKey && !this.element.classList.contains('selected')) {
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
            }
            this.element.classList.add('selected');

            const draggingInstances = [];
            const selectedEls = document.querySelectorAll('.node.selected');
            selectedEls.forEach(nodeEl => {
                const instance = window.NodesCanvas._nodeInstances[nodeEl.id] ||
                    window.NodesCanvas._panelInstances?.[nodeEl.id] ||
                    window.NodesCanvas._callInstances?.[nodeEl.id];

                if (instance) {
                    instance.isDragging = true;
                    instance.element.classList.add('dragging');
                    const rect = instance.element.getBoundingClientRect();
                    instance.dragOffsets.x = (e.clientX - rect.left) / canvasTransform.scale;
                    instance.dragOffsets.y = (e.clientY - rect.top) / canvasTransform.scale;
                    draggingInstances.push(instance);
                }
            });

            const moveHandler = (me) => {
                draggingInstances.forEach(inst => {
                    inst.x = (me.clientX - canvasTransform.x) / canvasTransform.scale - inst.dragOffsets.x;
                    inst.y = (me.clientY - canvasTransform.y) / canvasTransform.scale - inst.dragOffsets.y;
                    inst.element.style.transform = `translate(${inst.x}px, ${inst.y}px)`;
                });
            };

            const upHandler = () => {
                draggingInstances.forEach(inst => {
                    inst.isDragging = false;
                    inst.element.classList.remove('dragging');
                });
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
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

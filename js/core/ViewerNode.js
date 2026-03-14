// ViewerNode.js - Visual Monitor Node
// Displays incoming data during run/debug modes.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ViewerNode = class {
    constructor(config = {}) {
        this.id = config.id || ('viewer_' + Date.now() + Math.floor(Math.random() * 1000));
        this.x = config.x || 100;
        this.y = config.y || 100;
        this.label = config.label || 'Viewer';

        // Data to display
        this.lastValue = undefined;

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        this.createElement();
        this.initEvents();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);

        // Register instance properly in central registries
        window.NodesCanvas._viewerInstances = window.NodesCanvas._viewerInstances || {};
        window.NodesCanvas._viewerInstances[this.id] = this;

        // ALSO register in the main nodeInstances so GraphEngine._buildGraph finds it
        window.NodesCanvas._nodeInstances = window.NodesCanvas._nodeInstances || {};
        window.NodesCanvas._nodeInstances[this.id] = this;
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'node viewer-node';
        this.element.id = this.id;
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        this.render();
    }

    setValue(val) {
        this.lastValue = val;
        const display = this.element.querySelector('.viewer-display');
        if (display) {
            const str = (val === undefined) ? 'undefined' :
                (typeof val === 'object') ? JSON.stringify(val, null, 2) :
                    val.toString();
            display.textContent = str;
            display.classList.remove('viewer-placeholder');
        }
    }

    clear() {
        this.lastValue = undefined;
        const display = this.element.querySelector('.viewer-display');
        if (display) {
            display.textContent = 'waiting for data...';
            display.classList.add('viewer-placeholder');
        }
    }

    render() {
        // Correct layout: Header | Main (Port Side | Body)
        this.element.innerHTML = `
            <div class="viewer-header">
                <i data-lucide="eye" style="width:12px; height:12px;"></i>
                <span>${this.escapeHtml(this.label)}</span>
            </div>
            <div class="viewer-main">
                <div class="viewer-port-side">
                    <div class="socket" data-portid="${this.id}_in" data-type="in"></div>
                </div>
                <div class="viewer-body">
                    <div class="viewer-display viewer-placeholder">waiting for data...</div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    }

    initEvents() {
        // Drag logic - handled by header
        this.element.addEventListener('mousedown', (e) => {
            const isHeader = e.target.closest('.viewer-header');
            const isSocket = e.target.closest('.socket');
            if (isSocket) return;
            if (!isHeader) return;

            e.stopPropagation();
            const canvasTransform = window.NodesCanvas.canvas.transform;

            if (!e.ctrlKey && !this.element.classList.contains('selected')) {
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
            }
            this.element.classList.add('selected');

            const draggingInstances = [];
            const selectedEls = document.querySelectorAll('.node.selected');
            selectedEls.forEach(nodeEl => {
                const instance = window.NodesCanvas._nodeInstances?.[nodeEl.id] ||
                    window.NodesCanvas._panelInstances?.[nodeEl.id] ||
                    window.NodesCanvas._callInstances?.[nodeEl.id] ||
                    window.NodesCanvas._viewerInstances?.[nodeEl.id];

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
                if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        });
    }

    escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

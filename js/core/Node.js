// Node.js - Base Class for functional Nodes

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Node = class {
    constructor(config) {
        this.id = config.id || ('node_' + Date.now() + Math.floor(Math.random() * 1000));
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.title = config.title || "Generic Node";
        this.description = config.description || '';
        this.icon = config.icon || 'default';

        this.inputs = config.inputs || [{ id: 'in_1', label: 'Input A' }];
        this.outputs = config.outputs || [{ id: 'out_1', label: 'Output A' }];

        this.code = config.code || '';

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        this.createElement();
        this.initEvents();

        // Append to the layer
        const layer = document.getElementById("canvas-layer");
        if (layer) layer.appendChild(this.element);

        // Track instance for GraphEngine
        window.NodesCanvas._nodeInstances = window.NodesCanvas._nodeInstances || {};
        window.NodesCanvas._nodeInstances[this.id] = this;
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.className = "node";
        this.element.id = this.id;

        this.updatePosition();
        this.renderContent();
    }

    renderContent() {
        this.element.innerHTML = '';

        // Header
        const header = document.createElement("div");
        header.className = "node-header";
        header.innerHTML = `
            <div class="node-header-icon">
                ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg(this.icon) : ''}
            </div>
            <span class="node-title">${this.title}</span>
        `;

        // Body
        const body = document.createElement("div");
        body.className = "node-body";

        // Inputs Column
        const portsIn = document.createElement("div");
        portsIn.className = "node-ports-in";
        this.inputs.forEach(inp => {
            const port = document.createElement("div");
            port.className = "port in";
            port.innerHTML = `
                <div class="socket" data-portid="${inp.id}" data-type="in"></div>
                <span class="port-label">${inp.label}</span>
            `;
            portsIn.appendChild(port);
        });

        // Outputs Column
        const portsOut = document.createElement("div");
        portsOut.className = "node-ports-out";
        this.outputs.forEach(out => {
            const port = document.createElement("div");
            port.className = "port out";
            port.innerHTML = `
                <span class="port-label">${out.label}</span>
                <div class="socket" data-portid="${out.id}" data-type="out"></div>
            `;
            portsOut.appendChild(port);
        });

        body.appendChild(portsIn);
        body.appendChild(portsOut);

        this.element.appendChild(header);
        this.element.appendChild(body);

        // We need to re-bind the header events since it was recreated
        this.initHeaderEvents(header);

        // Render Lucide icons
        if (window.lucide) window.lucide.createIcons();
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    initHeaderEvents(header) {
        header.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Don't trigger canvas pan

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

        header.addEventListener('dblclick', (e) => {
            e.stopPropagation(); // Avoid triggering canvas search

            if (window.NodesCanvas.popupManager) {
                const config = {
                    title: this.title,
                    description: this.description,
                    icon: this.icon,
                    inputs: this.inputs,
                    outputs: this.outputs,
                    code: this.code
                };

                window.NodesCanvas.popupManager.showNodeForm(config, null, (newConfig) => {
                    this.title = newConfig.title;
                    this.description = newConfig.description;
                    this.icon = newConfig.icon || this.icon;
                    this.inputs = newConfig.inputs;
                    this.outputs = newConfig.outputs;
                    this.code = newConfig.code;
                    this.renderContent();

                    // Trigger Save and Refresh
                    if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
                    if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                        window.NodesCanvas.CodeInspector.refresh();
                    }

                    // We also need to redraw connections since sockets might have moved or been removed
                    if (window.NodesCanvas.connectionManager) {
                        window.NodesCanvas.connectionManager.updateVisuals();
                    }
                });
            }
        });
    }

    initEvents() {
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const canvasTransform = window.NodesCanvas.canvas.transform;

            // X and Y considering the canvas current translation and scaling
            this.x = (e.clientX - canvasTransform.x) / canvasTransform.scale - this.dragOffsets.x;
            this.y = (e.clientY - canvasTransform.y) / canvasTransform.scale - this.dragOffsets.y;

            this.updatePosition();

            // TODO: dispatch 'nodeMoved' event so connections can update
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.classList.remove('dragging');
            }
        });
    }
};

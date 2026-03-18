// Node.js - Functional Node class inheriting from BaseNode

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Node = class extends window.NodesCanvas.BaseNode {
    constructor(config) {
        super(config);

        this.inputs = config.inputs || [{ id: 'in_1', label: 'Input A' }];
        this.outputs = config.outputs || [{ id: 'out_1', label: 'Output A' }];
        this.code = config.code || '';

        this.initElement("node");
        this.renderContent();

        // Append to the layer
        const layer = document.getElementById("canvas-layer");
        if (layer) layer.appendChild(this.element);
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

        // Bind events via BaseNode
        this.bindDragEvents(header);
        this.initHeaderEvents(header);

        // Render Lucide icons
        if (window.lucide) window.lucide.createIcons();
    }

    initHeaderEvents(header) {
        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();

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
                    if (window.NodesCanvas.ConnectionManager) {
                        window.NodesCanvas.ConnectionManager.updateAllConnections();
                    }
                });
            }
        });
    }
};

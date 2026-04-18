// ValueListNode.js - Dropdown selector node for lists and objects
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.ValueListNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Value List';
        
        // Settings for manual options: [{label: 'A', value: '1'}, ...]
        this.manualOptions = config.settings?.options || [
            { label: 'Option A', value: '1' },
            { label: 'Option B', value: '2' }
        ];
        
        // Runtime options (extracted from input or manual)
        this.currentOptions = [];
        this.selectedIndex = config.settings?.selectedIndex || 0;
        this.value = config.value; // currently selected value

        this.initElement('node value-list-node');
        this.render();

        // Reactive to connection changes to update "disabled" state & tooltips
        this._onConnChange = () => this.render();
        document.addEventListener('canvas:connections-changed', this._onConnChange);

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    /** 
     * Determines if the node has an active connection on its input 
     */
    hasInputConnection() {
        if (!window.NodesCanvas.ConnectionManager) return false;
        const connections = window.NodesCanvas.ConnectionManager.getConnections();
        return connections.some(c => c.toNodeId === this.id && c.toPortId === 'in_list');
    }

    render() {
        const isConnected = this.hasInputConnection();
        const tooltip = isConnected ? 'Desconecte todos los inputs para editar manualmente' : 'Doble click para editar opciones';
        
        // Build items based on current mode
        const items = this.currentOptions.length > 0 ? this.currentOptions : this.manualOptions;

        this.element.innerHTML = `
            <div class="valuelist-container ${isConnected ? 'mode-input' : 'mode-manual'}">
                <!-- Socket de entrada posicionado a la izquierda -->
                <div class="socket in-socket" data-portid="in_list" data-type="in"></div>

                <div class="valuelist-header" title="${tooltip}">
                    <div class="valuelist-title" title="${this.escapeHtml(this.title)}">${this.escapeHtml(this.title)}</div>
                </div>
                <div class="valuelist-body">
                    <select class="valuelist-select" ${isConnected ? 'title="' + tooltip + '"' : ''}>
                        ${items.map((opt, i) => `
                            <option value="${i}" ${i === this.selectedIndex ? 'selected' : ''}>
                                ${this.escapeHtml(opt.label)}
                            </option>
                        `).join('')}
                        ${items.length === 0 && isConnected ? '<option>Esperando datos...</option>' : (items.length === 0 ? '<option>No options</option>' : '')}
                    </select>
                </div>

                <!-- Socket de salida posicionado a la derecha -->
                <div class="socket out-socket" data-portid="out_val" data-type="out"></div>
            </div>
        `;

        this.bindInternalEvents();
        this.bindDragEvents(this.element.querySelector('.valuelist-header'));

        if (window.lucide) window.lucide.createIcons();
    }

    bindInternalEvents() {
        const select = this.element.querySelector('.valuelist-select');
        const header = this.element.querySelector('.valuelist-header');

        select.addEventListener('change', (e) => {
            this.selectedIndex = parseInt(e.target.value);
            this.updateOutputValue();
            
            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        select.addEventListener('mousedown', e => e.stopPropagation());

        // Header double click for settings (only if not connected)
        header.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (this.hasInputConnection()) {
                // Potential improvement: show a "Toast" or alert
                console.log("Manual config disabled while connected.");
                return;
            }

            if (window.NodesCanvas.popupManager) {
                // We'll need a way to edit manual options
                // For now, let's use a generic prompt or later implement showValueListForm
                this.openSettings();
            }
        });
    }

    openSettings() {
        // Implementation of item editing via popup
        if (window.NodesCanvas.popupManager) {
            const currentRaw = this.manualOptions.map(o => `${o.label} = ${o.value}`).join('\n');
            
            window.NodesCanvas.popupManager.showTextAreaModal({
                title: 'Edit Value List Options',
                description: 'Enter one option per line: Label = Value',
                value: currentRaw,
                onSave: (text) => {
                    const lines = text.split('\n').filter(l => l.trim() !== '');
                    this.manualOptions = lines.map(line => {
                        const parts = line.split('=');
                        if (parts.length >= 2) {
                            return { label: parts[0].trim(), value: parts[1].trim() };
                        } else {
                            return { label: line.trim(), value: line.trim() };
                        }
                    });
                    this.selectedIndex = 0;
                    this.render();
                    this.updateOutputValue();
                    if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
                }
            });
        }
    }

    updateOutputValue() {
        const items = this.currentOptions.length > 0 ? this.currentOptions : this.manualOptions;
        if (items[this.selectedIndex]) {
            this.value = items[this.selectedIndex].value;
        } else {
            this.value = null;
        }
    }

    /** 
     * Called by GraphEngine when it's time to process this node 
     */
    setRuntimeData(inputData) {
        let newOptions = [];
        
        if (inputData && typeof inputData === 'object') {
            if (Array.isArray(inputData)) {
                // Array mode
                newOptions = inputData.map(v => ({ label: String(v), value: v }));
            } else {
                // Object mode
                newOptions = Object.entries(inputData).map(([k, v]) => ({ label: k, value: v }));
            }
        }

        // If options changed, we need to re-render
        const optionsChanged = JSON.stringify(newOptions) !== JSON.stringify(this.currentOptions);
        
        if (optionsChanged) {
            this.currentOptions = newOptions;
            // Clamp selected index to new size
            if (this.selectedIndex >= this.currentOptions.length) {
                this.selectedIndex = 0;
            }
            this.updateOutputValue();
            this.render();
        }
    }

    destroy() {
        document.removeEventListener('canvas:connections-changed', this._onConnChange);
        super.destroy();
    }
};

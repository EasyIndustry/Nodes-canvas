// HttpRequestNode.js - Predefined node for making HTTP requests
window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.HttpRequestNode = class extends window.NodesCanvas.Node {
    constructor(config) {
        // Force fixed configuration for HTTP Request
        const finalConfig = {
            ...config,
            title: config.title || "HTTP Request",
            icon: "globe",
            type: "http-request",
            // Unique IDs to avoid Connection Manager query collisions
            inputs: [
                { id: 'in_method', label: 'Method' },
                { id: 'in_url', label: 'URL' },
                { id: 'in_headers', label: 'Headers' },
                { id: 'in_body', label: 'Body' },
                { id: 'in_timeout', label: 'Timeout' }
            ],
            outputs: [
                { id: 'out_statusCode', label: 'Status Code' },
                { id: 'out_body', label: 'Body' },
                { id: 'out_headers', label: 'Headers' },
                { id: 'out_statusMessage', label: 'Status Message' },
                { id: 'out_latency', label: 'Latency' }
            ],
            // Logic with Cache and Auto/Manual support
            code: `
async function execute(args) {
    const node = window.NodesCanvas.NodeRegistry.get(__nodeId);
    if (!node) return {};

    // 1. Check if we should skip execution
    // Note: GraphEngine maps inputs to args by ID or converted Label.
    // We use ID-based access here.
    const currentInputsStr = JSON.stringify(args);
    const inputsChanged = currentInputsStr !== node._lastInputs;

    if (!node.isAuto && !node._manualTrigger) {
        return node._lastResult || {};
    }

    if (node.isAuto && !inputsChanged && !node._manualTrigger) {
        return node._lastResult || {};
    }

    // 2. Perform Request
    const startTime = Date.now();
    try {
        const url = args.in_url || '';
        if (!url) return { out_statusCode: 0, out_body: 'URL Missing', out_headers: {}, out_statusMessage: 'Pending', out_latency: 0 };

        const method = (args.in_method || 'GET').toUpperCase();
        const headers = (typeof args.in_headers === 'object') ? { ...args.in_headers } : {};
        
        let body = args.in_body;
        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
        }

        const controller = new AbortController();
        const timeout = parseInt(args.in_timeout) || 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method,
            headers,
            body: (method !== 'GET' && method !== 'HEAD') ? body : undefined,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        const resHeaders = {};
        response.headers.forEach((v, k) => resHeaders[k] = v);

        const finalResult = {
            out_statusCode: response.status,
            out_body: responseData,
            out_headers: resHeaders,
            out_statusMessage: response.statusText,
            out_latency: Date.now() - startTime
        };

        // 3. Save Cache
        node._lastInputs = currentInputsStr;
        node._lastResult = finalResult;
        node._manualTrigger = false;

        return finalResult;
    } catch (err) {
        const errorResult = {
            out_statusCode: 0,
            out_body: err.message,
            out_headers: {},
            out_statusMessage: 'Error',
            out_latency: Date.now() - startTime
        };
        node._lastResult = errorResult;
        node._manualTrigger = false;
        return errorResult;
    }
}`
        };

        super(finalConfig);
        
        // Internal Execution State
        this.isAuto = config.settings?.isAuto !== undefined ? config.settings.isAuto : true;
        this._manualTrigger = false;
        this._lastInputs = null;
        this._lastResult = null;
        
        this.element.classList.add('http-request-node');
        this.renderControls();
    }

    renderControls() {
        const header = this.element.querySelector('.node-header');
        if (!header) return;

        let controls = header.querySelector('.node-header-controls');
        if (!controls) {
            controls = document.createElement('div');
            controls.className = 'node-header-controls';
            header.appendChild(controls);
        }

        controls.innerHTML = `
            <div class="http-auto-toggle ${this.isAuto ? 'active' : ''}" title="Auto mode">
                AUTO
            </div>
            <button class="http-manual-run" title="Manual request">
                <i data-lucide="rotate-cw" style="width: 12px; height: 12px;"></i>
            </button>
        `;

        const toggle = controls.querySelector('.http-auto-toggle');
        const runBtn = controls.querySelector('.http-manual-run');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isAuto = !this.isAuto;
            toggle.classList.toggle('active', this.isAuto);
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        runBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._manualTrigger = true;
            if (window.NodesCanvas.GraphEngine) {
                window.NodesCanvas.GraphEngine.execute();
            }
        });

        if (window.lucide) window.lucide.createIcons();
    }

    renderContent() {
        super.renderContent();
        this.renderControls();
    }

    initHeaderEvents(header) {
        this.bindDragEvents(header);
    }
};

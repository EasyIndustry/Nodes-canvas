// NodeWidgets.js - Embeddable UI widgets for custom function nodes
// Widgets are SINGLETONS per (nodeId + label) — state is preserved across graph re-runs.
// Usage inside node code:
//   const btn = ui.button('Run');       // mounts button in node, persists state
//   const tog = ui.toggle('Active');    // tog.value stays between executions

window.NodesCanvas = window.NodesCanvas || {};

// Global registry: key = `${nodeId}::${widgetKey}` → widget instance
window.NodesCanvas._widgetRegistry = window.NodesCanvas._widgetRegistry || new Map();

// ─── NodeButton ───────────────────────────────────────────────────────────────
window.NodesCanvas.NodeButton = class {
    constructor({ label = 'Button', nodeId = null } = {}) {
        const regKey = `${nodeId}::btn-${label}`;
        const existing = window.NodesCanvas._widgetRegistry.get(regKey);
        if (existing) {
            existing._callbacks = []; // reset so re-runs don't stack callbacks
            return existing;
        }

        this.label = label;
        this.nodeId = nodeId;
        this._regKey = regKey;
        this._callbacks = [];
        this._el = null;

        window.NodesCanvas._widgetRegistry.set(regKey, this);
        this._mount();
    }

    _mount() {
        if (!this.nodeId) return;
        const nodeEl = document.getElementById(this.nodeId);
        if (!nodeEl) return;

        let widgetZone = nodeEl.querySelector('.node-widget-zone');
        if (!widgetZone) {
            widgetZone = document.createElement('div');
            widgetZone.className = 'node-widget-zone';
            nodeEl.appendChild(widgetZone);
        }

        if (widgetZone.querySelector(`[data-widget-key="${this._regKey}"]`)) return;

        const btn = document.createElement('button');
        btn.className = 'node-widget-btn';
        btn.textContent = this.label;
        btn.dataset.widgetKey = this._regKey;
        btn.addEventListener('mousedown', e => e.stopPropagation());
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._callbacks.forEach(cb => cb());
        });

        widgetZone.appendChild(btn);
        this._el = btn;
    }

    onClick(callback) {
        this._callbacks.push(callback);
        return this;
    }

    setLabel(label) {
        this.label = label;
        if (this._el) this._el.textContent = label;
        return this;
    }

    destroy() {
        if (this._el) this._el.remove();
        window.NodesCanvas._widgetRegistry.delete(this._regKey);
    }
};

// ─── NodeToggle ───────────────────────────────────────────────────────────────
window.NodesCanvas.NodeToggle = class {
    constructor({ label = 'Toggle', nodeId = null, default: defaultVal = false } = {}) {
        const regKey = `${nodeId}::tog-${label}`;
        const existing = window.NodesCanvas._widgetRegistry.get(regKey);
        if (existing) {
            existing._callbacks = []; // reset onChange listeners on re-registration
            return existing;
        }

        this.label = label;
        this.nodeId = nodeId;
        this._regKey = regKey;
        this.value = defaultVal;
        this._callbacks = [];
        this._el = null;

        window.NodesCanvas._widgetRegistry.set(regKey, this);
        this._mount();
    }

    _mount() {
        if (!this.nodeId) return;
        const nodeEl = document.getElementById(this.nodeId);
        if (!nodeEl) return;

        let widgetZone = nodeEl.querySelector('.node-widget-zone');
        if (!widgetZone) {
            widgetZone = document.createElement('div');
            widgetZone.className = 'node-widget-zone';
            nodeEl.appendChild(widgetZone);
        }

        if (widgetZone.querySelector(`[data-widget-key="${this._regKey}"]`)) return;

        const wrap = document.createElement('div');
        wrap.className = 'node-widget-toggle';
        wrap.dataset.widgetKey = this._regKey;
        wrap.innerHTML = `
            <span class="nw-toggle-label">${this.label}</span>
            <div class="nw-track ${this.value ? 'on' : ''}">
                <div class="nw-knob"></div>
            </div>
        `;

        const track = wrap.querySelector('.nw-track');
        this._el = wrap;

        wrap.addEventListener('mousedown', e => e.stopPropagation());
        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            this.value = !this.value;
            track.classList.toggle('on', this.value);
            this._callbacks.forEach(cb => cb(this.value));
            // NOTE: does NOT auto-trigger GraphEngine.execute() — caller decides when to re-run
        });

        widgetZone.appendChild(wrap);
    }

    onChange(callback) {
        this._callbacks.push(callback);
        return this;
    }

    setValue(val) {
        this.value = Boolean(val);
        if (this._el) {
            const track = this._el.querySelector('.nw-track');
            if (track) track.classList.toggle('on', this.value);
        }
        return this;
    }

    destroy() {
        if (this._el) this._el.remove();
        window.NodesCanvas._widgetRegistry.delete(this._regKey);
    }
};

/**
 * Pre-scan a node's code for ui.button() / ui.toggle() declarations
 * and mount their DOM widgets WITHOUT running execute().
 * Call this from Node.renderContent() so widgets appear before first graph run.
 */
window.NodesCanvas.initNodeWidgets = function(nodeId, code) {
    if (!code || !code.includes('ui.')) return;

    const uiCtx = {
        button: (label) => new window.NodesCanvas.NodeButton({ label, nodeId }),
        toggle: (label, defaultVal = false) => new window.NodesCanvas.NodeToggle({ label, nodeId, default: defaultVal })
    };

    try {
        // Strip out the execute() function body so it never fires in this pre-scan
        const sandboxCode = code.replace(/\bfunction\s+execute\b[\s\S]*/, '// execute stubbed');
        const fn = new Function('ui', '__nodeId', `try { ${sandboxCode} } catch(e) {}`);
        fn(uiCtx, nodeId);
    } catch(e) { /* silent fail */ }
};

console.log('[NodeWidgets] NodeButton & NodeToggle ready.');

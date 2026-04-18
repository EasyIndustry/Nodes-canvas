// DataHolderNode.js - Data viewer with live/freeze toggle and manual update button
// - Toggle ON  → updates on every graph run (live)
// - Toggle OFF → freezes last received value (hold)
// - "↓ Update" button → forces a one-time update even when frozen

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.DataHolderNode = class extends window.NodesCanvas.BaseNode {
    constructor(config = {}) {
        super(config);
        this.title = config.title || 'Data Holder';
        this._heldValue = null;       // last stored value
        this._live = config._live !== undefined ? config._live : true; // live by default
        this._pendingUpdate = false;  // flag for one-shot update

        this.initElement('node data-holder-node');
        this.render();

        const layer = document.getElementById('canvas-layer');
        if (layer) layer.appendChild(this.element);
    }

    render() {
        this.element.innerHTML = `
            <div class="dh-header">
                <div class="dh-header-left">
                    ${window.NodesCanvas.NodeIcons ? window.NodesCanvas.NodeIcons.getSvg('database', 12) : ''}
                    <span class="dh-title">${this.escapeHtml(this.title)}</span>
                </div>
                <div class="dh-controls">
                    <button class="dh-update-btn" title="Force update once">↓ Update</button>
                    <div class="dh-toggle-wrap" title="Live: updates on every run">
                        <span class="dh-toggle-label">Live</span>
                        <div class="dh-track ${this._live ? 'on' : ''}">
                            <div class="dh-knob"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="dh-main">
                <div class="dh-port-side">
                    <div class="socket" data-portid="${this.id}_in" data-type="in"></div>
                </div>
                <div class="dh-body">
                    <pre class="dh-display dh-empty">No data</pre>
                </div>
                <div class="dh-port-out-side">
                    <div class="socket" data-portid="${this.id}_out" data-type="out"></div>
                </div>
            </div>
            <div class="dh-status-bar">
                <span class="dh-status-dot ${this._live ? 'live' : 'frozen'}"></span>
                <span class="dh-status-text">${this._live ? 'Live' : 'Frozen'}</span>
            </div>
        `;

        this.bindDragEvents(this.element.querySelector('.dh-header'));
        this._bindControls();
        if (window.lucide) window.lucide.createIcons();

        // Restore held value display on re-render
        if (this._heldValue !== null) {
            this._updateDisplay(this._heldValue);
        }
    }

    _bindControls() {
        const track = this.element.querySelector('.dh-track');
        const toggleWrap = this.element.querySelector('.dh-toggle-wrap');
        const updateBtn = this.element.querySelector('.dh-update-btn');

        // Toggle live/freeze
        toggleWrap.addEventListener('mousedown', e => e.stopPropagation());
        toggleWrap.addEventListener('click', (e) => {
            e.stopPropagation();
            this._live = !this._live;
            track.classList.toggle('on', this._live);
            this._refreshStatus();
            if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
        });

        // Force one-shot update
        updateBtn.addEventListener('mousedown', e => e.stopPropagation());
        updateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._pendingUpdate = true;
            updateBtn.textContent = '↓ ...';
            updateBtn.disabled = true;
            if (window.NodesCanvas.executionMode === 'run') {
                window.NodesCanvas.GraphEngine.execute();
            }
        });
    }

    _refreshStatus() {
        const dot = this.element.querySelector('.dh-status-dot');
        const text = this.element.querySelector('.dh-status-text');
        const label = this.element.querySelector('.dh-toggle-label');
        if (!dot || !text) return;

        dot.className = `dh-status-dot ${this._live ? 'live' : 'frozen'}`;
        text.textContent = this._live ? 'Live' : 'Frozen';
        if (label) label.textContent = 'Live';
    }

    _updateDisplay(val) {
        const display = this.element.querySelector('.dh-display');
        if (!display) return;

        let text;
        if (val === undefined || val === null) {
            text = val === undefined ? 'undefined' : 'null';
        } else if (typeof val === 'object') {
            try { text = JSON.stringify(val, null, 2); }
            catch(e) { text = '[Circular Object]'; }
        } else {
            text = String(val);
        }

        display.textContent = text;
        display.classList.remove('dh-empty');
        this._heldValue = val;

        // Reset update button
        const btn = this.element.querySelector('.dh-update-btn');
        if (btn) { btn.textContent = '↓ Update'; btn.disabled = false; }
    }

    /** Called by GraphEngine on every run */
    setValue(val) {
        const shouldUpdate = this._live || this._pendingUpdate;
        this._pendingUpdate = false;

        if (shouldUpdate) {
            this._updateDisplay(val);
        }
        // If frozen and no pending update: do nothing — hold last value
    }

    clear() {
        this._heldValue = null;
        const display = this.element.querySelector('.dh-display');
        if (display) { display.textContent = 'No data'; display.classList.add('dh-empty'); }
    }

    /** Serialize extra state */
    toJSON() {
        return { _live: this._live };
    }
};

// CommonPopup.js - Generic modals: textarea editor and confirm dialog.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.CommonPopup = class extends window.NodesCanvas.Popups.BasePopup {
    showTextArea({ title, description, value, onSave }) {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';
        modal.style.width = '420px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>${title || 'Edit Options'}</span>
                ${this._closeIcon()}
            </div>

            <div class="node-form-content">
                <div class="form-row">
                    <div style="font-size: 12px; opacity: 0.6; margin-bottom: 8px;">${description || ''}</div>
                    <textarea id="modal-textarea" class="panel-textarea" rows="10" style="height: 200px; width: 100%; box-sizing: border-box;">${value || ''}</textarea>
                </div>
            </div>

            <div class="form-actions">
                <button class="btn-secondary" id="btn-modal-cancel">Cancel</button>
                <button class="btn-primary" id="btn-modal-save">Apply Changes</button>
            </div>
        `;

        modal.querySelector('#btn-modal-save').addEventListener('click', () => {
            const text = modal.querySelector('#modal-textarea').value;
            if (onSave) onSave(text);
            this.close();
        });

        this._bindClose(modal, ['.close-btn', '#btn-modal-cancel']);
        this._mount(modal);

        setTimeout(() => {
            const ta = modal.querySelector('#modal-textarea');
            if (ta) {
                ta.focus();
                ta.select();
            }
        }, 100);
    }

    showConfirm(title, message, onConfirm, confirmText = "Confirm") {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal confirm-modal';
        modal.style.width = '350px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>${title}</span>
                ${this._closeIcon()}
            </div>
            <div class="node-form-content">
                <p style="font-size: 14px; line-height: 1.5; opacity: 0.9; margin: 0;">${message}</p>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" id="btn-confirm-cancel">Cancel</button>
                <button class="btn-primary" id="btn-confirm-ok" style="background: #ff4757;">${confirmText}</button>
            </div>
        `;

        modal.querySelector('#btn-confirm-ok').addEventListener('click', () => {
            if (onConfirm) onConfirm();
            this.close();
        });

        this._bindClose(modal, ['.close-btn', '#btn-confirm-cancel']);
        this._mount(modal);
    }
};

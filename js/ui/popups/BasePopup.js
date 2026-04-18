// BasePopup.js - Shared base for all popup modals.
// Provides overlay lifecycle, close handling, and DOM helpers.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.BasePopup = class {
    constructor(overlay, closePopupFn) {
        this.overlay = overlay;
        this._closePopup = closePopupFn;
    }

    close() {
        if (this._closePopup) this._closePopup();
    }

    _prepareOverlay(align = 'center', justify = 'center') {
        this.overlay.innerHTML = '';
        this.overlay.style.alignItems = align;
        this.overlay.style.justifyContent = justify;
    }

    _mount(modal) {
        modal.addEventListener('mousedown', e => e.stopPropagation());
        this.overlay.appendChild(modal);
        this.overlay.classList.add('active');
    }

    _bindClose(modal, selectors = ['.close-btn']) {
        selectors.forEach(sel => {
            const btn = modal.querySelector(sel);
            if (btn) btn.addEventListener('click', () => this.close());
        });
    }

    _closeIcon() {
        return `<button class="close-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
    }
};

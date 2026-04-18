// PopupManager.js - Thin facade coordinating popup sub-modules.
// Each popup lives in js/ui/popups/*.js and shares the same overlay.
// Public API is preserved for backward compatibility with all callers.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.PopupManager = class {
    constructor() {
        this._createOverlay();

        const P = window.NodesCanvas.Popups;
        const closeFn = () => this.close();

        this.search = new P.SearchPopup(this.overlay, closeFn);
        this.nodeForm = new P.NodeFormPopup(this.overlay, closeFn);
        this.sliderForm = new P.SliderFormPopup(this.overlay, closeFn);
        this.auth = new P.AuthPopup(this.overlay, closeFn);
        this.boards = new P.BoardsPopup(this.overlay, closeFn);
        this.common = new P.CommonPopup(this.overlay, closeFn);
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'popup-overlay';
        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) this.close();
        });
        document.body.appendChild(this.overlay);
    }

    close() {
        this.overlay.classList.remove('active');
        this.overlay.innerHTML = '';
    }

    // --- Public API (kept stable for callers) ---
    showSearch(x, y, onSelect)                  { this.search.show(x, y, onSelect); }
    showNodeForm(initialConfig, folderId, cb)   { this.nodeForm.show(initialConfig, folderId, cb); }
    showSliderForm(instance, onSave)            { this.sliderForm.show(instance, onSave); }
    showLoginForm(onSuccess)                    { this.auth.showLogin(onSuccess); }
    showSignupForm(onSuccess)                   { this.auth.showSignup(onSuccess); }
    showBoardsList(onSelect)                    { this.boards.showList(onSelect); }
    showBoardSavePrompt(currentTitle, onSave)   { this.boards.showSavePrompt(currentTitle, onSave); }
    showTextAreaModal(opts)                     { this.common.showTextArea(opts); }
    showConfirm(title, msg, onConfirm, btnTxt)  { this.common.showConfirm(title, msg, onConfirm, btnTxt); }
};

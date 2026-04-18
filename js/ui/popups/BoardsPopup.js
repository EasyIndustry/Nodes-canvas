// BoardsPopup.js - Cloud board list and save prompt.
// Backend-agnostic: talks via window.NodesCanvas.CloudManager (fallback AuthManager).

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.BoardsPopup = class extends window.NodesCanvas.Popups.BasePopup {
    _cloud() {
        return window.NodesCanvas.CloudManager || window.NodesCanvas.AuthManager;
    }

    showList(onSelect) {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';
        modal.style.width = '400px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>My Saved Boards</span>
                ${this._closeIcon()}
            </div>
            <div class="node-form-content" style="max-height: 300px; overflow-y: auto;">
                <div id="boards-loading" style="text-align: center; padding: 20px; opacity: 0.6;">Loading boards...</div>
                <div id="boards-list-container" class="boards-grid"></div>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" id="btn-boards-close">Close</button>
            </div>
        `;

        this._mount(modal);

        const container = modal.querySelector('#boards-list-container');
        const loading = modal.querySelector('#boards-loading');

        this._cloud().getBoards().then(boards => {
            loading.style.display = 'none';
            if (!boards || boards.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 20px;">No boards found</div>';
                return;
            }

            boards.forEach(b => {
                const item = document.createElement('div');
                item.className = 'board-list-item glass-panel';

                const ts = b.last_updated || b.created_at;
                const dateStr = ts ? new Date(ts).toLocaleDateString() : '—';

                item.innerHTML = `
                    <div class="board-item-info">
                        <div class="board-item-title">${b.title || 'Untitled'}</div>
                        <div class="board-item-date">${dateStr}</div>
                    </div>
                    <button class="board-delete-btn" title="Delete board">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                    </button>
                `;

                item.addEventListener('click', () => {
                    if (onSelect) onSelect(b.id);
                    this.close();
                });

                const deleteBtn = item.querySelector('.board-delete-btn');
                deleteBtn.addEventListener('mousedown', e => e.stopPropagation());
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = '...';
                    const result = await this._cloud().deleteBoard(b.id);
                    if (result.success) {
                        item.remove();
                        if (!container.querySelector('.board-list-item')) {
                            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;opacity:0.5;padding:20px;">No boards found</div>';
                        }
                    } else {
                        deleteBtn.disabled = false;
                        deleteBtn.innerHTML = '✕';
                    }
                });

                container.appendChild(item);
            });
        });

        this._bindClose(modal, ['.close-btn', '#btn-boards-close']);
    }

    showSavePrompt(currentTitle, onSave) {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';
        modal.style.width = '320px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>Save Board</span>
                ${this._closeIcon()}
            </div>
            <div class="node-form-content">
                <div class="form-row">
                    <label>Board Title</label>
                    <input type="text" id="board-title-input" value="${currentTitle || ''}" placeholder="E.g. My Awesome Project">
                </div>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" id="btn-save-cancel">Cancel</button>
                <button class="btn-primary" id="btn-save-confirm">Save to Cloud</button>
            </div>
        `;

        this._mount(modal);

        const input = modal.querySelector('#board-title-input');
        input.focus();
        input.select();

        modal.querySelector('#btn-save-confirm').addEventListener('click', () => {
            const title = input.value.trim() || 'Untitled Board';
            if (onSave) onSave(title);
            this.close();
        });

        this._bindClose(modal, ['.close-btn', '#btn-save-cancel']);
    }
};

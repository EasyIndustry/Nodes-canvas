// SearchPopup.js - Quick search popup for node functions.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.SearchPopup = class extends window.NodesCanvas.Popups.BasePopup {
    show(x, y, onSelect) {
        this._prepareOverlay('flex-start', 'flex-start');

        const popup = document.createElement('div');
        popup.className = 'search-popup glass-modal';

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const left = Math.min(x, viewW - 300 - 20);
        const top = Math.min(y, viewH - 400 - 20);

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'search-input';
        input.placeholder = 'Search functions...';

        const resultsEl = document.createElement('div');
        resultsEl.className = 'search-results';

        popup.appendChild(input);
        popup.appendChild(resultsEl);

        this._mount(popup);
        input.focus();

        const renderResults = (query) => {
            resultsEl.innerHTML = '';

            const allNodes = [];
            const traverse = (folders, path) => {
                folders.forEach(f => {
                    const currentPath = path ? `${path} / ${f.name}` : f.name;
                    if (f.nodes) {
                        f.nodes.forEach(n => {
                            const q = (query || '').toLowerCase();
                            if (!q || n.title.toLowerCase().includes(q) || currentPath.toLowerCase().includes(q)) {
                                allNodes.push({ node: n, folderName: currentPath });
                            }
                        });
                    }
                    if (f.subfolders) traverse(f.subfolders, currentPath);
                });
            };

            traverse(window.NodesCanvas.Registry.folders, "");

            if (allNodes.length === 0) {
                resultsEl.innerHTML = `<div style="color: #666; font-size: 13px; text-align: center; margin-top: 10px;">No results</div>`;
                return;
            }

            allNodes.forEach(item => {
                const el = document.createElement('div');
                el.className = 'search-item';
                el.innerHTML = `<span style="opacity: 0.5; margin-right: 8px;">${item.folderName} |</span> ${item.node.title}`;
                el.addEventListener('click', () => {
                    if (onSelect) onSelect(item.node);
                    this.close();
                });
                resultsEl.appendChild(el);
            });
        };

        renderResults("");

        input.addEventListener('input', (e) => renderResults(e.target.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }
};

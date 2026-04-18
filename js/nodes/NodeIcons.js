// NodeIcons.js - Integration with Lucide Icons library
// Provides mapping for node icons and helper to render them

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.NodeIcons = {
    // A selection of useful icons for node development
    icons: [
        'box', 'function-square', 'variable', 'database', 'list', 'layout-grid',
        'calculator', 'plus', 'minus', 'divide', 'x', 'percent', 'equal',
        'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'repeat',
        'shuffle', 'filter', 'sort-asc', 'sort-desc', 'search', 'zoom-in', 'zoom-out',
        'code', 'terminal', 'cpu', 'zap', 'settings', 'user', 'users', 'mail',
        'phone', 'file', 'file-text', 'image', 'video', 'music', 'map',
        'clock', 'calendar', 'alert-circle', 'alert-triangle', 'check-circle',
        'star', 'heart', 'flag', 'tag', 'link', 'lock', 'unlock', 'eye', 'eye-off',
        'trash-2', 'edit-2', 'save', 'download', 'upload', 'share-2', 'external-link',
        'layers', 'server', 'hard-drive', 'cloud', 'wifi', 'bluetooth', 'mouse-pointer', 'globe'
    ],

    /**
     * Returns an HTML string for the icon.
     * Uses Lucide's <i> tag convention.
     */
    getSvg(name, size = 14) {
        if (!name || name === 'default') name = 'box';
        // We use a span wrapper to apply consistent sizing and Lucide attributes
        return `<i data-lucide="${name}" style="width: ${size}px; height: ${size}px; display: inline-block;"></i>`;
    },

    /**
     * Returns all available icon names
     */
    getAllNames() {
        return this.icons;
    }
};

// Canvas.js - Manages infinite scrolling, zoom and the background

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Canvas = class {
    constructor(containerElement, layerElement) {
        this.container = containerElement;
        this.layer = layerElement;

        this.transform = { x: 0, y: 0, scale: 1 };

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        // Selection Box State
        this.isSelecting = false;
        this.selectionStart = { x: 0, y: 0 };
        this.selectionBox = null;

        this.initEvents();
    }

    initEvents() {
        // Pan and Select
        this.container.addEventListener('mousedown', (e) => {
            // Only interact if clicking on empty canvas (not a node or a connection)
            if (e.target.closest('.node') || e.target.closest('.connection-path')) return;

            if (e.button === 1) { // Middle Mouse Button for Pan
                e.preventDefault();
                this.isDragging = true;
                this.dragStart.x = e.clientX - this.transform.x;
                this.dragStart.y = e.clientY - this.transform.y;
                this.container.style.cursor = 'grabbing';
            }
            else if (e.button === 0) { // Left Mouse Button for Box Selection
                // Deselect all nodes when clicking empty canvas
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));

                this.isSelecting = true;
                this.selectionStart = { x: e.clientX, y: e.clientY };

                // Create selection box element
                this.selectionBox = document.createElement('div');
                this.selectionBox.className = 'selection-box';
                this.selectionBox.style.left = `${e.clientX}px`;
                this.selectionBox.style.top = `${e.clientY}px`;
                this.selectionBox.style.width = '0px';
                this.selectionBox.style.height = '0px';
                document.body.appendChild(this.selectionBox);
            }
        });

        // Double Click for Search UI
        this.container.addEventListener('dblclick', (e) => {
            if (e.target.closest('.node') || e.target.closest('.connection-path')) return;

            if (window.NodesCanvas.popupManager) {
                window.NodesCanvas.popupManager.showSearch(e.clientX, e.clientY, (selectedNodeTemplate) => {
                    // Create selected node at the mouse position
                    const canvasTransform = this.transform;
                    const x = (e.clientX - canvasTransform.x) / canvasTransform.scale;
                    const y = (e.clientY - canvasTransform.y) / canvasTransform.scale;

                    window.NodesCanvas.NodeFactory.create(selectedNodeTemplate, x - 100, y - 50);
                });
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.transform.x = e.clientX - this.dragStart.x;
                this.transform.y = e.clientY - this.dragStart.y;
                this.updateTransform();
                this.updateBackgroundGrid();
            } else if (this.isSelecting && this.selectionBox) {
                // Update selection box size
                const currentX = e.clientX;
                const currentY = e.clientY;

                const left = Math.min(this.selectionStart.x, currentX);
                const top = Math.min(this.selectionStart.y, currentY);
                const width = Math.abs(currentX - this.selectionStart.x);
                const height = Math.abs(currentY - this.selectionStart.y);

                this.selectionBox.style.left = `${left}px`;
                this.selectionBox.style.top = `${top}px`;
                this.selectionBox.style.width = `${width}px`;
                this.selectionBox.style.height = `${height}px`;

                this.updateNodeSelection({ left, top, right: left + width, bottom: top + height });
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDragging && e.button === 1) {
                this.isDragging = false;
                this.container.style.cursor = '';
            }
            if (this.isSelecting && e.button === 0) {
                this.isSelecting = false;
                if (this.selectionBox) {
                    this.selectionBox.remove();
                    this.selectionBox = null;
                }
            }
        });

        // Zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();

            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;

            const oldScale = this.transform.scale;
            let newScale = oldScale * Math.exp(delta);

            // Limit scale
            newScale = Math.max(0.2, Math.min(newScale, 3));

            // Zoom towards mouse pointer
            const rect = this.container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / oldScale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / oldScale);
            this.transform.scale = newScale;

            this.updateTransform();
            this.updateBackgroundGrid();
        }, { passive: false });
    }

    updateTransform() {
        this.layer.style.transform = `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.scale})`;
    }

    updateBackgroundGrid() {
        // Keeps the grid visually infinite by shifting the background position
        // This is necessary because the layer moves but the container holds the background
        const gridX = this.transform.x;
        const gridY = this.transform.y;

        // Scale the grid pattern with zoom
        const bgSize = 50 * this.transform.scale;

        this.container.style.backgroundPosition = `${gridX}px ${gridY}px`;
        this.container.style.backgroundSize = `${bgSize}px ${bgSize}px`;
    }

    updateNodeSelection(boxRect) {
        // Check which nodes are COMPLETELY inside the box
        const nodes = document.querySelectorAll('.node');

        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();

            // Check if node is fully enclosed
            const fullyInside = (
                rect.left >= boxRect.left &&
                rect.right <= boxRect.right &&
                rect.top >= boxRect.top &&
                rect.bottom <= boxRect.bottom
            );

            if (fullyInside) {
                node.classList.add('selected');
            } else {
                node.classList.remove('selected');
            }
        });
    }
};

// BaseNode.js - Abstract class for all canvas nodes
// Centralizes: Dragging, Selection, Rendering patterns, and Utility methods

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.BaseNode = class {
    constructor(config) {
        this.id = config.id || ('node_' + Date.now() + Math.floor(Math.random() * 1000));
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.title = config.title || "Base Node";
        this.description = config.description || '';
        this.icon = config.icon || 'default';

        this.element = null;
        this.isDragging = false;
        this.dragOffsets = { x: 0, y: 0 };

        // Register in central registry
        if (window.NodesCanvas.NodeRegistry) {
            window.NodesCanvas.NodeRegistry.register(this);
        }
    }

    /** Basic createElement pattern */
    initElement(className) {
        this.element = document.createElement("div");
        this.element.className = className || "node";
        this.element.id = this.id;
        this.updatePosition();
    }

    /** Applies X/Y transform */
    updatePosition() {
        if (this.element) {
            this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        }
    }

    /** Centralized Drag and Selection Logic */
    bindDragEvents(handle) {
        if (!handle) return;

        handle.addEventListener('mousedown', (e) => {
            // Avoid dragging when clicking standard controls
            if (e.target.closest('input, select, textarea, button, .socket')) return;

            e.stopPropagation();
            const canvas = window.NodesCanvas.canvas;
            if (!canvas) return;

            const scale = canvas.transform.scale;

            // Multi-selection logic (Ctrl behavior)
            if (!e.ctrlKey && !this.element.classList.contains('selected')) {
                document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
            }
            this.element.classList.add('selected');

            // Find all selected instances
            const draggingInstances = [];
            document.querySelectorAll('.node.selected').forEach(el => {
                const inst = window.NodesCanvas.NodeRegistry.get(el.id);
                if (inst) {
                    inst.isDragging = true;
                    inst.element.classList.add('dragging');

                    const rect = inst.element.getBoundingClientRect();
                    inst.dragOffsets.x = (e.clientX - rect.left) / scale;
                    inst.dragOffsets.y = (e.clientY - rect.top) / scale;
                    draggingInstances.push(inst);
                }
            });

            // Local move handler to avoid global scaling drift
            const moveHandler = (me) => {
                draggingInstances.forEach(inst => {
                    inst.x = (me.clientX - canvas.transform.x) / scale - inst.dragOffsets.x;
                    inst.y = (me.clientY - canvas.transform.y) / scale - inst.dragOffsets.y;
                    inst.updatePosition();
                });
            };

            const upHandler = () => {
                draggingInstances.forEach(inst => {
                    inst.isDragging = false;
                    inst.element.classList.remove('dragging');
                });
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);

                if (window.NodesCanvas.CanvasState) {
                    window.NodesCanvas.CanvasState.scheduleSave();
                }
            };

            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        });
    }

    /** Shared Utility: Escape HTML */
    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /** Shared Utility: Get Current Transform Scale */
    getScale() {
        return window.NodesCanvas.canvas ? window.NodesCanvas.canvas.transform.scale : 1;
    }

    /** Clean up */
    destroy() {
        if (this.element) this.element.remove();
        if (window.NodesCanvas.NodeRegistry) {
            window.NodesCanvas.NodeRegistry.unregister(this.id);
        }
    }
};

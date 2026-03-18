// Connection.js - Manages drawing Bezier curves between nodes

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Connection = class {
    constructor(sourceNodeId, sourcePortId, targetNodeId, targetPortId) {
        this.id = 'conn_' + Date.now() + Math.floor(Math.random() * 1000);
        this.sourceNodeId = sourceNodeId;
        this.sourcePortId = sourcePortId;
        this.targetNodeId = targetNodeId;
        this.targetPortId = targetPortId;

        this.svgElement = null;

        this.createElement();
    }

    createElement() {
        // Create an SVG Path element
        this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.svgElement.setAttribute('class', 'connection-path');
        this.svgElement.setAttribute('id', this.id);
        this.svgElement.dataset.fromNode = this.sourceNodeId;
        this.svgElement.dataset.fromPort = this.sourcePortId;
        this.svgElement.dataset.toNode = this.targetNodeId;
        this.svgElement.dataset.toPort = this.targetPortId;

        const layer = document.getElementById("connections-layer");
        if (layer) layer.appendChild(this.svgElement);

        this.updatePath();
    }

    // Calculates the bezier curve based on the absolute positions of the sockets on the canvas
    updatePath() {
        // Find DOM elements
        const srcNode = document.getElementById(this.sourceNodeId);
        const tgtNode = document.getElementById(this.targetNodeId);

        if (!srcNode || !tgtNode) return;

        // Find sockets within those nodes
        const srcSocket = srcNode.querySelector(`[data-portid="${this.sourcePortId}"]`);
        const tgtSocket = tgtNode.querySelector(`[data-portid="${this.targetPortId}"]`);

        if (!srcSocket || !tgtSocket) return;

        // Calculate relative position to the canvas layer
        const canvasLayer = document.getElementById("canvas-layer");
        const layerRect = canvasLayer.getBoundingClientRect();
        const scale = window.NodesCanvas.canvas.transform.scale;

        const srcRect = srcSocket.getBoundingClientRect();
        const tgtRect = tgtSocket.getBoundingClientRect();

        // Get center of sockets relative to the scalable layer
        const pt1 = {
            x: (srcRect.left - layerRect.left + srcRect.width / 2) / scale,
            y: (srcRect.top - layerRect.top + srcRect.height / 2) / scale
        };

        const pt2 = {
            x: (tgtRect.left - layerRect.left + tgtRect.width / 2) / scale,
            y: (tgtRect.top - layerRect.top + tgtRect.height / 2) / scale
        };

        // Create a bezier curve string
        // The control points are placed horizontally based on the distance between nodes
        const dx = Math.abs(pt2.x - pt1.x);
        const dy = Math.abs(pt2.y - pt1.y);

        // Multiplier that increases curve based on horizontal distance
        // but also accounts for vertical distance to avoid "flat" lines when far but vertical
        const curveTightness = Math.min(200, Math.max(50, dx * 0.5 + dy * 0.1));

        const cp1 = { x: pt1.x + curveTightness, y: pt1.y };
        const cp2 = { x: pt2.x - curveTightness, y: pt2.y };

        const pathData = `M ${pt1.x} ${pt1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${pt2.x} ${pt2.y}`;
        this.svgElement.setAttribute('d', pathData);
    }

    destroy() {
        if (this.svgElement && this.svgElement.parentNode) {
            this.svgElement.parentNode.removeChild(this.svgElement);
        }
    }
};

// Global Connection Manager to handle the active dragging connection
window.NodesCanvas.ConnectionManager = {
    connections: [],
    isDrawing: false,
    tempPath: null,
    startPort: null, // { nodeId, portId, element }

    init() {
        const svgLayer = document.getElementById("connections-layer");
        if (!svgLayer) {
            console.warn("[ConnectionManager] connections-layer not found, retrying in 500ms...");
            setTimeout(() => this.init(), 500);
            return;
        }

        console.log("[ConnectionManager] Initialized on layer:", svgLayer.id);

        // Temp path for drawing - ensure it doesn't catch mouse events
        this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempPath.setAttribute('class', 'connection-path temp-path');
        this.tempPath.style.strokeDasharray = "5,5";
        this.tempPath.style.pointerEvents = "none"; // CRITICAL: don't block mouseup
        this.tempPath.style.display = 'none';
        svgLayer.appendChild(this.tempPath);

        // Listeners for socket dragging
        document.addEventListener('mousedown', (e) => {
            const socket = e.target.closest('.socket');
            if (!socket) return;

            console.log("[CM] Socket mousedown:", socket.dataset.portid, "Type:", socket.dataset.type);

            e.preventDefault();
            e.stopPropagation();

            const node = socket.closest('.node');
            if (!node) return;

            this.isDrawing = true;

            // If Ctrl is held, disconnect instead of drawing
            if (e.ctrlKey) {
                const socketType = socket.dataset.type;
                const socketId = socket.dataset.portid;
                const nodeId = node.id;

                this.connections = this.connections.filter(conn => {
                    const isMatch = (socketType === 'out' && conn.sourceNodeId === nodeId && conn.sourcePortId === socketId) ||
                        (socketType === 'in' && conn.targetNodeId === nodeId && conn.targetPortId === socketId);
                    if (isMatch) conn.destroy();
                    return !isMatch;
                });

                this.isDrawing = false;
                if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
                if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                    window.NodesCanvas.CodeInspector.refresh();
                }
                return;
            }

            this.startPort = {
                nodeId: node.id,
                portId: socket.dataset.portid,
                type: socket.dataset.type,
                element: socket
            };

            // Show temp path
            this.tempPath.style.display = 'block';
            this.updateTempPath(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                this.updateTempPath(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!this.isDrawing) return;

            console.log("[CM] Socket mouseup. Target:", e.target);
            this.isDrawing = false;
            this.tempPath.style.display = 'none';

            const endSocket = e.target.closest('.socket');
            if (endSocket) {
                const endNode = endSocket.closest('.node');

                // Validate connection (in to out, different nodes, etc)
                if (endNode && this.startPort.nodeId !== endNode.id && this.startPort.type !== endSocket.dataset.type) {

                    // Enforce order: source is ALWAYS out, target is ALWAYS in
                    const isStartOut = this.startPort.type === 'out';
                    const sourceNodeId = isStartOut ? this.startPort.nodeId : endNode.id;
                    const sourcePortId = isStartOut ? this.startPort.portId : endSocket.dataset.portid;
                    const targetNodeId = isStartOut ? endNode.id : this.startPort.nodeId;
                    const targetPortId = isStartOut ? endSocket.dataset.portid : this.startPort.portId;

                    console.log("[CM] Creating connection:", sourceNodeId + ":" + sourcePortId, "->", targetNodeId + ":" + targetPortId);

                    const newConn = new window.NodesCanvas.Connection(sourceNodeId, sourcePortId, targetNodeId, targetPortId);
                    this.connections.push(newConn);

                    // Trigger refresh
                    if (window.NodesCanvas.CanvasState) window.NodesCanvas.CanvasState.scheduleSave();
                    if (window.NodesCanvas.CodeInspector && window.NodesCanvas.CodeInspector._isOpen) {
                        window.NodesCanvas.CodeInspector.refresh();
                    }
                    if (window.NodesCanvas.executionMode === 'run' && window.NodesCanvas.GraphEngine) {
                        window.NodesCanvas.GraphEngine.execute();
                    }
                }
            }
            this.startPort = null;
        });

        // Listen for node movements to update connections
        setInterval(() => this.updateAllConnections(), 16);
    },

    updateTempPath(mouseX, mouseY) {
        if (!this.startPort || !window.NodesCanvas.canvas) return;

        const canvasLayer = document.getElementById("canvas-layer");
        if (!canvasLayer) return;

        const layerRect = canvasLayer.getBoundingClientRect();
        const scale = window.NodesCanvas.canvas.transform.scale;

        const srcRect = this.startPort.element.getBoundingClientRect();

        const pt1 = {
            x: (srcRect.left - layerRect.left + srcRect.width / 2) / scale,
            y: (srcRect.top - layerRect.top + srcRect.height / 2) / scale
        };

        const pt2 = {
            x: (mouseX - layerRect.left) / scale,
            y: (mouseY - layerRect.top) / scale
        };

        const dx = Math.abs(pt2.x - pt1.x);
        const dy = Math.abs(pt2.y - pt1.y);
        const curveTightness = Math.min(200, Math.max(50, dx * 0.5 + dy * 0.1));

        // Adjust control points based on whether starting port is IN or OUT
        const isOut = this.startPort.type === 'out';
        const cp1 = { x: pt1.x + (isOut ? curveTightness : -curveTightness), y: pt1.y };
        const cp2 = { x: pt2.x + (isOut ? -curveTightness : curveTightness), y: pt2.y };

        const pathData = `M ${pt1.x} ${pt1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${pt2.x} ${pt2.y}`;
        this.tempPath.setAttribute('d', pathData);
    },

    updateAllConnections() {
        this.connections.forEach(conn => conn.updatePath());
    },

    removeConnectionsByNodeId(nodeId) {
        this.connections = this.connections.filter(conn => {
            if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
                conn.destroy();
                return false;
            }
            return true;
        });
    },

    removeConnectionById(connId) {
        const connIndex = this.connections.findIndex(c => c.id === connId);
        if (connIndex > -1) {
            this.connections[connIndex].destroy();
            this.connections.splice(connIndex, 1);
        }
    },

    createConnection(fromSocket, toSocket) {
        const fromNode = fromSocket.closest('.node');
        const toNode = toSocket.closest('.node');
        if (!fromNode || !toNode) return;

        const sourceNodeId = fromNode.id;
        const sourcePortId = fromSocket.dataset.portid;
        const targetNodeId = toNode.id;
        const targetPortId = toSocket.dataset.portid;

        const newConn = new window.NodesCanvas.Connection(sourceNodeId, sourcePortId, targetNodeId, targetPortId);
        this.connections.push(newConn);
        return newConn;
    },

    /**
     * Get serialized connection data for GraphEngine or CanvasState
     * @returns {Array} List of connection objects
     */
    getConnections() {
        return this.connections.map(c => ({
            fromNodeId: c.sourceNodeId,
            fromPortId: c.sourcePortId,
            toNodeId: c.targetNodeId,
            toPortId: c.targetPortId
        }));
    },

    /**
     * Restore connections from serialized data
     * @param {Array} connectionsData 
     */
    restoreConnections(connectionsData) {
        if (!connectionsData || !Array.isArray(connectionsData)) return;

        // Clear existing connections first
        this.connections.forEach(c => c.destroy());
        this.connections = [];

        connectionsData.forEach(data => {
            const newConn = new window.NodesCanvas.Connection(
                data.fromNodeId,
                data.fromPortId,
                data.toNodeId,
                data.toPortId
            );
            this.connections.push(newConn);
        });
    }
};

// Initialize manager on load
document.addEventListener("DOMContentLoaded", () => {
    // Delay slightly to ensure canvas is ready
    setTimeout(() => window.NodesCanvas.ConnectionManager.init(), 100);
});

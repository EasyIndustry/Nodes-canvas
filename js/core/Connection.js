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
        const distance = Math.abs(pt2.x - pt1.x);
        const curveTightness = Math.max(100, distance / 2); // Avoid too tight curves when nodes are close

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

        // Temp path for drawing
        this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempPath.setAttribute('class', 'connection-path temp-path');
        this.tempPath.style.strokeDasharray = "5,5";
        svgLayer.appendChild(this.tempPath);

        // Listeners for socket dragging
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('socket')) {
                e.preventDefault(); e.stopPropagation();

                const socket = e.target;
                const node = socket.closest('.node');

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
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                this.updateTempPath(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.tempPath.style.display = 'none';

                if (e.target.classList.contains('socket')) {
                    const endSocket = e.target;
                    const endNode = endSocket.closest('.node');

                    // Validate connection (in to out, different nodes, etc)
                    if (this.startPort.nodeId !== endNode.id && this.startPort.type !== endSocket.dataset.type) {

                        // Enforce order: source is ALWAYS out, target is ALWAYS in
                        const isStartOut = this.startPort.type === 'out';
                        const sourceNodeId = isStartOut ? this.startPort.nodeId : endNode.id;
                        const sourcePortId = isStartOut ? this.startPort.portId : endSocket.dataset.portid;
                        const targetNodeId = isStartOut ? endNode.id : this.startPort.nodeId;
                        const targetPortId = isStartOut ? endSocket.dataset.portid : this.startPort.portId;

                        const newConn = new window.NodesCanvas.Connection(sourceNodeId, sourcePortId, targetNodeId, targetPortId);
                        this.connections.push(newConn);
                    }
                }
            }
        });

        // Listen for node movements to update connections
        // We poll for now or hook into node drag loop
        setInterval(() => this.updateAllConnections(), 16); // ~60fps
    },

    updateTempPath(mouseX, mouseY) {
        if (!this.startPort) return;

        const canvasLayer = document.getElementById("canvas-layer");
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

        const distance = Math.abs(pt2.x - pt1.x);
        const curveTightness = Math.max(100, distance / 2);

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
    }
};

// Initialize manager on load
document.addEventListener("DOMContentLoaded", () => {
    // Delay slightly to ensure canvas is ready
    setTimeout(() => window.NodesCanvas.ConnectionManager.init(), 100);
});

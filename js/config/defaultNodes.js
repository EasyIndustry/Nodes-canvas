// defaultNodes.js - Built-in folder tree and node templates shipped with the app.
// Declarative config only; no behavior. Loaded as a plain script so it works under
// file:// without a bundler or fetch.
//
// Shape:
//   [{ id, name, editable, nodes: [nodeTpl, ...], subfolders: [...] }, ...]
//
// All entries here are marked `editable: false` at the folder level when required;
// the Registry injects `editable: false` per-node on clone so user-created nodes
// stay separable.

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.DefaultNodes = [
    {
        id: 'f_data',
        name: 'Data',
        editable: false,
        nodes: [
            { id: 'n_manual_data', type: 'manual-data', title: 'Manual Data', isSpecial: true, icon: 'database' },
            { id: 'n_call_data',   type: 'call-data',   title: 'Call Data',   isSpecial: true, icon: 'external-link' },
            { id: 'n_slider',      type: 'slider',      title: 'Number Slider', isSlider: true, icon: 'sliders-horizontal' },
            { id: 'n_viewer',      type: 'viewer',      title: 'Viewer',      isSpecial: true, icon: 'eye' },
            { id: 'n_data_holder', type: 'data-holder', title: 'Data Holder', isSpecial: true, icon: 'archive' },
            { id: 'n_value_list',  type: 'value-list',  title: 'Value List',  isSpecial: true, icon: 'list' }
        ],
        subfolders: []
    },
    {
        id: 'f_web',
        name: 'Web',
        editable: false,
        nodes: [
            { id: 'n_http_request', type: 'http-request', title: 'HTTP Request', icon: 'globe' }
        ],
        subfolders: []
    },
    {
        id: 'f_math',
        name: 'Math',
        editable: false,
        nodes: [
            {
                id: 'n_add', title: 'Add', builtIn: true, icon: 'plus',
                code: 'return { Result: Number(A) + Number(B) };',
                inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                outputs: [{ id: 'Result', label: 'Result' }]
            },
            {
                id: 'n_mult', title: 'Multiply', builtIn: true, icon: 'x',
                code: 'return { Result: Number(A) * Number(B) };',
                inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                outputs: [{ id: 'Result', label: 'Result' }]
            }
        ],
        subfolders: []
    },
    {
        id: 'f_logic',
        name: 'Logic',
        editable: false,
        nodes: [
            {
                id: 'n_and', title: 'And', builtIn: true, icon: 'check-square',
                code: 'return { Result: Boolean(A && B) };',
                inputs: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
                outputs: [{ id: 'Result', label: 'Result' }]
            }
        ],
        subfolders: []
    },
    {
        id: 'f_utils',
        name: 'Utilities',
        editable: false,
        nodes: [
            {
                id: 'n_expression', type: 'expression', title: 'Expression', icon: 'variable',
                code: 'x * 2',
                inputs: [{ id: 'x', label: 'x' }],
                outputs: [{ id: 'Result', label: 'Result' }]
            },
            {
                id: 'n_branch', type: 'branch', title: 'Branch / If', icon: 'git-branch',
                branches: [{ id: 'If_1', code: 'x > 5' }],
                inputs: [{ id: 'x', label: 'x' }],
                outputs: [{ id: 'If_1', label: 'If_1' }, { id: 'Else', label: 'Else' }]
            }
        ],
        subfolders: []
    }
];

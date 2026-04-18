// LibrariesManager.js - Manage internal and external libraries for custom nodes

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.LibrariesManager = {
    _internalLibs: {
        http: {
            name: 'HTTP Client',
            description: 'Requests HTTP y manejo de datos remotos',
            functions: {
                'http.get': {
                    signature: '(url, options?)',
                    example: 'http.get("https://api.example.com/data")',
                    fn: async (url, options = {}) => {
                        const res = await fetch(url, { ...options, method: 'GET' });
                        return res.json().catch(() => res.text());
                    }
                },
                'http.post': {
                    signature: '(url, data, options?)',
                    example: 'http.post("https://api.example.com/data", { name: "test" })',
                    fn: async (url, data, options = {}) => {
                        const res = await fetch(url, {
                            ...options,
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...options.headers },
                            body: JSON.stringify(data)
                        });
                        return res.json().catch(() => res.text());
                    }
                },
                'http.put': {
                    signature: '(url, data, options?)',
                    example: 'http.put("https://api.example.com/data/1", { name: "updated" })',
                    fn: async (url, data, options = {}) => {
                        const res = await fetch(url, {
                            ...options,
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', ...options.headers },
                            body: JSON.stringify(data)
                        });
                        return res.json().catch(() => res.text());
                    }
                },
                'http.delete': {
                    signature: '(url, options?)',
                    example: 'http.delete("https://api.example.com/data/1")',
                    fn: async (url, options = {}) => {
                        const res = await fetch(url, { ...options, method: 'DELETE' });
                        return res.json().catch(() => res.text());
                    }
                }
            }
        },
        date: {
            name: 'Date & Time',
            description: 'Manipulación de fechas y tiempos',
            functions: {
                'date.now': {
                    signature: '()',
                    example: 'date.now()',
                    fn: () => Date.now()
                },
                'date.today': {
                    signature: '()',
                    example: 'date.today()',
                    fn: () => new Date().toISOString().split('T')[0]
                },
                'date.format': {
                    signature: '(date, format)',
                    example: 'date.format(new Date(), "YYYY-MM-DD")',
                    fn: (d, format = 'YYYY-MM-DD') => {
                        const dt = d instanceof Date ? d : new Date(d);
                        const result = format
                            .replace('YYYY', dt.getFullYear())
                            .replace('MM', String(dt.getMonth() + 1).padStart(2, '0'))
                            .replace('DD', String(dt.getDate()).padStart(2, '0'))
                            .replace('HH', String(dt.getHours()).padStart(2, '0'))
                            .replace('mm', String(dt.getMinutes()).padStart(2, '0'))
                            .replace('ss', String(dt.getSeconds()).padStart(2, '0'));
                        return result;
                    }
                },
                'date.addDays': {
                    signature: '(date, days)',
                    example: 'date.addDays(new Date(), 7)',
                    fn: (date, days) => {
                        const d = date instanceof Date ? new Date(date) : new Date(date);
                        d.setDate(d.getDate() + days);
                        return d;
                    }
                },
                'date.diff': {
                    signature: '(date1, date2, unit?)',
                    example: 'date.diff(date1, date2, "days")',
                    fn: (d1, d2, unit = 'ms') => {
                        const a = d1 instanceof Date ? d1.getTime() : new Date(d1).getTime();
                        const b = d2 instanceof Date ? d2.getTime() : new Date(d2).getTime();
                        const diff = Math.abs(a - b);
                        const units = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
                        return diff / (units[unit] || 1);
                    }
                }
            }
        },
        string: {
            name: 'String Utils',
            description: 'Manipulación de texto',
            functions: {
                'str.upper': {
                    signature: '(text)',
                    example: 'str.upper("hello")',
                    fn: (text) => String(text).toUpperCase()
                },
                'str.lower': {
                    signature: '(text)',
                    example: 'str.lower("HELLO")',
                    fn: (text) => String(text).toLowerCase()
                },
                'str.trim': {
                    signature: '(text)',
                    example: 'str.trim("  hello  ")',
                    fn: (text) => String(text).trim()
                },
                'str.replace': {
                    signature: '(text, search, replace)',
                    example: 'str.replace("hello world", "world", "there")',
                    fn: (text, search, replace) => String(text).replace(search, replace)
                },
                'str.split': {
                    signature: '(text, delimiter)',
                    example: 'str.split("a,b,c", ",")',
                    fn: (text, delimiter) => String(text).split(delimiter)
                },
                'str.join': {
                    signature: '(array, separator)',
                    example: 'str.join(["a","b","c"], "-")',
                    fn: (arr, sep) => Array.isArray(arr) ? arr.join(sep) : String(arr)
                },
                'str.template': {
                    signature: '(template, values)',
                    example: 'str.template("Hello {{name}}", { name: "World" })',
                    fn: (tmpl, values) => {
                        return String(tmpl).replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? '');
                    }
                },
                'str.slugify': {
                    signature: '(text)',
                    example: 'str.slugify("Hello World!")',
                    fn: (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                }
            }
        },
        array: {
            name: 'Array Utils',
            description: 'Manipulación de arrays',
            functions: {
                'arr.sum': {
                    signature: '(array)',
                    example: 'arr.sum([1,2,3,4])',
                    fn: (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + (parseFloat(b) || 0), 0) : 0
                },
                'arr.avg': {
                    signature: '(array)',
                    example: 'arr.avg([1,2,3,4])',
                    fn: (arr) => Array.isArray(arr) && arr.length ? arr.reduce((a, b) => a + (parseFloat(b) || 0), 0) / arr.length : 0
                },
                'arr.min': {
                    signature: '(array)',
                    example: 'arr.min([3,1,4,1,5])',
                    fn: (arr) => Array.isArray(arr) ? Math.min(...arr.map(v => parseFloat(v) || 0)) : 0
                },
                'arr.max': {
                    signature: '(array)',
                    example: 'arr.max([3,1,4,1,5])',
                    fn: (arr) => Array.isArray(arr) ? Math.max(...arr.map(v => parseFloat(v) || 0)) : 0
                },
                'arr.filter': {
                    signature: '(array, predicate)',
                    example: 'arr.filter([1,2,3,4], x => x > 2)',
                    fn: (arr, predicate) => Array.isArray(arr) ? arr.filter(predicate) : []
                },
                'arr.map': {
                    signature: '(array, transform)',
                    example: 'arr.map([1,2,3], x => x * 2)',
                    fn: (arr, transform) => Array.isArray(arr) ? arr.map(transform) : []
                },
                'arr.find': {
                    signature: '(array, predicate)',
                    example: 'arr.find([1,2,3], x => x > 1)',
                    fn: (arr, predicate) => Array.isArray(arr) ? arr.find(predicate) : undefined
                },
                'arr.unique': {
                    signature: '(array)',
                    example: 'arr.unique([1,2,2,3])',
                    fn: (arr) => Array.isArray(arr) ? [...new Set(arr)] : []
                },
                'arr.flatten': {
                    signature: '(array)',
                    example: 'arr.flatten([[1,2],[3,4]])',
                    fn: (arr) => Array.isArray(arr) ? arr.flat() : []
                },
                'arr.sort': {
                    signature: '(array, ascending?)',
                    example: 'arr.sort([3,1,2], true)',
                    fn: (arr, asc = true) => Array.isArray(arr) ? [...arr].sort((a, b) => asc ? a - b : b - a) : []
                }
            }
        },
        object: {
            name: 'Object Utils',
            description: 'Manipulación de objetos',
            functions: {
                'obj.keys': {
                    signature: '(obj)',
                    example: 'obj.keys({ a: 1, b: 2 })',
                    fn: (obj) => obj && typeof obj === 'object' ? Object.keys(obj) : []
                },
                'obj.values': {
                    signature: '(obj)',
                    example: 'obj.values({ a: 1, b: 2 })',
                    fn: (obj) => obj && typeof obj === 'object' ? Object.values(obj) : []
                },
                'obj.entries': {
                    signature: '(obj)',
                    example: 'obj.entries({ a: 1 })',
                    fn: (obj) => obj && typeof obj === 'object' ? Object.entries(obj) : []
                },
                'obj.merge': {
                    signature: '(obj1, obj2)',
                    example: 'obj.merge({ a: 1 }, { b: 2 })',
                    fn: (a, b) => ({ ...a, ...b })
                },
                'obj.pick': {
                    signature: '(obj, keys)',
                    example: 'obj.pick({ a: 1, b: 2 }, ["a"])',
                    fn: (obj, keys) => {
                        if (!obj || typeof obj !== 'object') return {};
                        const k = Array.isArray(keys) ? keys : [keys];
                        return k.reduce((acc, key) => {
                            if (key in obj) acc[key] = obj[key];
                            return acc;
                        }, {});
                    }
                },
                'obj.omit': {
                    signature: '(obj, keys)',
                    example: 'obj.omit({ a: 1, b: 2 }, ["b"])',
                    fn: (obj, keys) => {
                        if (!obj || typeof obj !== 'object') return {};
                        const k = Array.isArray(keys) ? keys : [keys];
                        return Object.fromEntries(Object.entries(obj).filter(([key]) => !k.includes(key)));
                    }
                }
            }
        },
        utils: {
            name: 'General Utils',
            description: 'Utilidades varias',
            functions: {
                'utils.clamp': {
                    signature: '(value, min, max)',
                    example: 'utils.clamp(15, 0, 10)',
                    fn: (val, min, max) => Math.max(min, Math.min(max, val))
                },
                'utils.round': {
                    signature: '(value, decimals?)',
                    example: 'utils.round(3.14159, 2)',
                    fn: (val, dec = 0) => Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec)
                },
                'utils.random': {
                    signature: '(min, max)',
                    example: 'utils.random(1, 100)',
                    fn: (min = 0, max = 1) => min + Math.random() * (max - min)
                },
                'utils.randomInt': {
                    signature: '(min, max)',
                    example: 'utils.randomInt(1, 10)',
                    fn: (min, max) => Math.floor(min + Math.random() * (max - min + 1))
                },
                'utils.sleep': {
                    signature: '(ms)',
                    example: 'utils.sleep(1000)',
                    fn: (ms) => new Promise(resolve => setTimeout(resolve, ms))
                },
                'utils.type': {
                    signature: '(value)',
                    example: 'utils.type("hello")',
                    fn: (val) => Array.isArray(val) ? 'array' : typeof val
                },
                'utils.isEmpty': {
                    signature: '(value)',
                    example: 'utils.isEmpty("")',
                    fn: (val) => val === '' || val === null || val === undefined || (Array.isArray(val) && val.length === 0)
                },
                'utils.clone': {
                    signature: '(value)',
                    example: 'utils.clone({ a: 1 })',
                    fn: (val) => JSON.parse(JSON.stringify(val))
                }
            }
        },
        ui: {
            name: 'Node UI',
            description: 'Widgets embebidos: botones y toggles en el nodo',
            functions: {
                'ui.button': {
                    signature: '(label, nodeId)',
                    example: 'const btn = new ui.button("Run", __nodeId); btn.onClick(() => console.log("!"))',
                    fn: (label, nodeId) => new window.NodesCanvas.NodeButton({ label, nodeId })
                },
                'ui.toggle': {
                    signature: '(label, nodeId, defaultVal?)',
                    example: 'const tog = new ui.toggle("Active", __nodeId); if (tog.value) { ... }',
                    fn: (label, nodeId, defaultVal = false) => new window.NodesCanvas.NodeToggle({ label, nodeId, default: defaultVal })
                }
            }
        }
    },

    _cdnLibs: {
        lodash: {
            name: 'Lodash',
            description: 'Utilidades de programación funcional',
            url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js',
            loaded: false,
            instance: null
        },
        moment: {
            name: 'Moment.js',
            description: 'Manipulación de fechas',
            url: 'https://cdn.jsdelivr.net/npm/moment@2.30.1/min/moment.min.js',
            loaded: false,
            instance: null
        },
        axios: {
            name: 'Axios',
            description: 'Cliente HTTP avanzado',
            url: 'https://cdn.jsdelivr.net/npm/axios@1.6.7/dist/axios.min.js',
            loaded: false,
            instance: null
        },
        uuid: {
            name: 'UUID',
            description: 'Generador de IDs únicos',
            url: 'https://cdn.jsdelivr.net/npm/uuid@9.0.1/dist/umd/uuidv4.min.js',
            loaded: false,
            instance: null
        }
    },

    _activeCDNLibs: [],

    getInternalLibs() {
        return Object.keys(this._internalLibs).map(key => ({
            id: key,
            ...this._internalLibs[key]
        }));
    },

    getCDNLibs() {
        return Object.keys(this._cdnLibs).map(key => ({
            id: key,
            ...this._cdnLibs[key]
        }));
    },

    getAllFunctions() {
        const funcs = {};
        Object.entries(this._internalLibs).forEach(([libKey, lib]) => {
            Object.keys(lib.functions).forEach(fnKey => {
                funcs[fnKey] = lib.functions[fnKey];
            });
        });
        return funcs;
    },

    getActiveCDNs() {
        return this._activeCDNLibs;
    },

    toggleCDN(libId) {
        const lib = this._cdnLibs[libId];
        if (!lib) return;

        if (this._activeCDNLibs.includes(libId)) {
            this._activeCDNLibs = this._activeCDNLibs.filter(id => id !== libId);
        } else {
            this._activeCDNLibs.push(libId);
        }

        this.loadActiveCDNs();
        return this._activeCDNLibs.includes(libId);
    },

    async loadActiveCDNs() {
        const loadPromises = this._activeCDNLibs.map(async (libId) => {
            const lib = this._cdnLibs[libId];
            if (!lib || lib.loaded) return;

            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[data-lib="${libId}"]`)) {
                    lib.loaded = true;
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = lib.url;
                script.dataset.lib = libId;
                script.async = true;
                script.onload = () => {
                    lib.loaded = true;
                    console.log(`[LibrariesManager] Loaded CDN: ${lib.name}`);
                    resolve();
                };
                script.onerror = (err) => {
                    console.error(`[LibrariesManager] Failed to load ${lib.name}:`, err);
                    reject(err);
                };
                document.head.appendChild(script);
            });
        });

        await Promise.allSettled(loadPromises);
    },

    async loadCDN(libId) {
        if (!this._activeCDNLibs.includes(libId)) {
            this._activeCDNLibs.push(libId);
        }
        await this.loadActiveCDNs();
    },

    getContextObject() {
        const context = {};
        const cdnLibs = {};

        Object.entries(this._internalLibs).forEach(([key, lib]) => {
            cdnLibs[key] = {};
            Object.entries(lib.functions).forEach(([fnKey, fn]) => {
                cdnLibs[key][fnKey.split('.')[1]] = fn.fn;
            });
        });

        this._activeCDNLibs.forEach(libId => {
            const lib = this._cdnLibs[libId];
            if (lib && lib.loaded) {
                cdnLibs[libId] = window[libId] || window._ || window;
            }
        });

        return cdnLibs;
    },

    getAvailableCodeSnippet() {
        const lines = ['// Available Libraries:', ''];

        Object.entries(this._internalLibs).forEach(([libKey, lib]) => {
            lines.push(`// ${lib.name} (${lib.description})`);
            Object.entries(lib.functions).forEach(([fnKey, fn]) => {
                lines.push(`// ${fnKey}${fn.signature}`);
            });
            lines.push('');
        });

        if (this._activeCDNLibs.length > 0) {
            lines.push('// CDN Libraries:');
            this._activeCDNLibs.forEach(libId => {
                const lib = this._cdnLibs[libId];
                if (lib) lines.push(`// ${lib.name}: ${libId}`);
            });
            lines.push('');
        }

        lines.push('// Usage example:');
        lines.push('// http.get("https://api.example.com").then(data => {');
        lines.push('//     return { result: data };');
        lines.push('// });');

        return lines.join('\n');
    },

    savePreferences() {
        const SK = window.NodesCanvas.StorageKeys;
        localStorage.setItem(SK.CDN_LIBS, JSON.stringify(this._activeCDNLibs));
    },

    loadPreferences() {
        try {
            const SK = window.NodesCanvas.StorageKeys;
            const saved = localStorage.getItem(SK.CDN_LIBS);
            if (saved) {
                this._activeCDNLibs = JSON.parse(saved);
                this.loadActiveCDNs();
            }
        } catch (e) {
            console.warn('[LibrariesManager] Failed to load preferences:', e);
        }
    },

    init() {
        this.loadPreferences();
        console.log('[LibrariesManager] Initialized');
    }
};

window.NodesCanvas.LibrariesManager.init();
